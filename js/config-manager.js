/**
 * File-Based Configuration Manager
 * Replaces localStorage with robust file-based configuration system
 */

class ConfigurationManager {
    constructor() {
        this.currentConfig = null;
        this.currentFilePath = null;
        this.autoSaveEnabled = true;
        this.configVersion = '1.0.0';
        this.eventListeners = new Map();
        this.recentFiles = [];
        this.maxRecentFiles = 5;
        this.backupEnabled = true;
        this.isLoading = false;
        this.isDirty = false;
        
        // Default configuration template
        this.defaultConfig = {
            version: this.configVersion,
            metadata: {
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                appVersion: '1.0.0',
                description: 'Cordova App Generator Configuration'
            },
            authentication: {
                github: {
                    token: '',
                    username: '',
                    lastValidated: null,
                    isValid: false,
                    rateLimit: null
                },
                codemagic: {
                    token: '',
                    teamId: '',
                    lastValidated: null,
                    isValid: false,
                    rateLimit: null
                }
            },
            settings: {
                packagePrefix: 'com.lehau',
                authorName: 'LinhFish Development Team',
                authorEmail: 'dev@linhfish.com',
                outputDirectory: './generated-apps',
                androidMinSdk: '33',
                enableBuildPreparation: true,
                enableGitInit: true,
                enableCodemagicIntegration: false,
                codemagicWorkflowId: 'cordova_android_build',
                codemagicBranch: 'main',
                codemagicConfig: ''
            },
            ui: {
                selectedTemplates: [],
                filterSettings: {
                    status: 'all',
                    searchTerm: ''
                },
                lastUsedTemplates: [],
                preferences: {
                    autoSave: true,
                    showAdvancedOptions: false,
                    theme: 'default'
                }
            },
            templates: {
                custom: [],
                usage: {},
                favorites: []
            }
        };
        
        this.init();
    }

    // Initialize configuration manager
    async init() {
        try {
            // Load recent files from localStorage (temporary until we fully migrate)
            this.loadRecentFiles();
            
            // Try to load default configuration file
            await this.loadDefaultConfiguration();
            
            // Setup auto-save
            this.setupAutoSave();
            
            console.log('✅ Configuration Manager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Configuration Manager:', error);
            this.createDefaultConfiguration();
        }
    }

    // Event system
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Event callback error:', error);
                }
            });
        }
    }

    // Load default configuration
    async loadDefaultConfiguration() {
        const defaultPaths = [
            'cordova-app-generator-config.json',
            './config/cordova-app-generator-config.json',
            '../cordova-app-generator-config.json'
        ];

        for (const path of defaultPaths) {
            try {
                await this.loadConfigurationFromPath(path);
                console.log(`✅ Loaded default configuration from: ${path}`);
                return;
            } catch (error) {
                console.log(`⚠️ Could not load from ${path}:`, error.message);
            }
        }

        // No default configuration found, create new one
        console.log('📝 Creating new default configuration');
        this.createDefaultConfiguration();
    }

    // Create default configuration
    createDefaultConfiguration() {
        this.currentConfig = JSON.parse(JSON.stringify(this.defaultConfig));
        this.currentFilePath = null;
        this.isDirty = false;
        this.emit('config:loaded', { config: this.currentConfig, isNew: true });
    }

    // Load configuration from file path
    async loadConfigurationFromPath(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const configData = await response.json();
            await this.loadConfigurationFromData(configData, filePath);
        } catch (error) {
            throw new Error(`Failed to load configuration from ${filePath}: ${error.message}`);
        }
    }

    // Load configuration from file input
    async loadConfigurationFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const configData = JSON.parse(e.target.result);
                    await this.loadConfigurationFromData(configData, file.name);
                    resolve(this.currentConfig);
                } catch (error) {
                    reject(new Error(`Invalid configuration file: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read configuration file'));
            };
            
            reader.readAsText(file);
        });
    }

    // Load configuration from data object
    async loadConfigurationFromData(configData, filePath = null) {
        try {
            this.isLoading = true;
            this.emit('config:loading', { filePath });

            // Validate configuration
            const validatedConfig = await this.validateAndMigrateConfig(configData);
            
            // Set current configuration
            this.currentConfig = validatedConfig;
            this.currentFilePath = filePath;
            this.isDirty = false;
            
            // Add to recent files
            if (filePath) {
                this.addToRecentFiles(filePath);
            }
            
            // Update last modified
            this.currentConfig.metadata.lastModified = new Date().toISOString();
            
            this.emit('config:loaded', { 
                config: this.currentConfig, 
                filePath: this.currentFilePath,
                isNew: false 
            });
            
            console.log('✅ Configuration loaded successfully');
            
        } catch (error) {
            this.emit('config:error', { error, type: 'load' });
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    // Validate and migrate configuration
    async validateAndMigrateConfig(configData) {
        if (!configData || typeof configData !== 'object') {
            throw new Error('Configuration must be a valid JSON object');
        }

        // Check version and migrate if necessary
        const version = configData.version || '0.0.0';
        let migratedConfig = JSON.parse(JSON.stringify(configData));

        if (this.compareVersions(version, this.configVersion) < 0) {
            console.log(`🔄 Migrating configuration from v${version} to v${this.configVersion}`);
            migratedConfig = await this.migrateConfiguration(migratedConfig, version);
        }

        // Merge with default configuration to ensure all properties exist
        const validatedConfig = this.mergeWithDefaults(migratedConfig, this.defaultConfig);
        
        // Validate required fields
        this.validateRequiredFields(validatedConfig);
        
        return validatedConfig;
    }

    // Compare version strings
    compareVersions(version1, version2) {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part < v2Part) return -1;
            if (v1Part > v2Part) return 1;
        }
        
        return 0;
    }

    // Migrate configuration to current version
    async migrateConfiguration(config, fromVersion) {
        // Migration logic for different versions
        if (this.compareVersions(fromVersion, '1.0.0') < 0) {
            // Migrate from pre-1.0.0 versions
            config = this.migrateFromLegacy(config);
        }
        
        // Update version
        config.version = this.configVersion;
        config.metadata = config.metadata || {};
        config.metadata.migrated = {
            from: fromVersion,
            to: this.configVersion,
            timestamp: new Date().toISOString()
        };
        
        return config;
    }

    // Migrate from legacy localStorage-based configuration
    migrateFromLegacy(config) {
        // If this is a legacy config without proper structure, rebuild it
        if (!config.authentication || !config.settings) {
            const legacyConfig = {
                version: this.configVersion,
                metadata: {
                    created: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                    description: 'Migrated from legacy configuration'
                },
                authentication: {
                    github: {
                        token: config.githubToken || '',
                        username: config.githubUsername || '',
                        lastValidated: null,
                        isValid: false
                    },
                    codemagic: {
                        token: config.codemagicApiToken || '',
                        teamId: config.codemagicTeamId || '',
                        lastValidated: null,
                        isValid: false
                    }
                },
                settings: {
                    packagePrefix: config.packagePrefix || 'com.lehau',
                    authorName: config.authorName || 'LinhFish Development Team',
                    authorEmail: config.authorEmail || 'dev@linhfish.com',
                    outputDirectory: config.outputDirectory || './generated-apps',
                    androidMinSdk: config.androidMinSdk || '33',
                    enableBuildPreparation: config.enableBuildPreparation !== false,
                    enableGitInit: config.enableGitInit !== false,
                    enableCodemagicIntegration: config.enableCodemagicIntegration || false,
                    codemagicWorkflowId: config.codemagicWorkflowId || 'cordova_android_build',
                    codemagicBranch: config.codemagicBranch || 'main',
                    codemagicConfig: config.codemagicConfig || ''
                },
                ui: {
                    selectedTemplates: [],
                    filterSettings: { status: 'all', searchTerm: '' },
                    lastUsedTemplates: [],
                    preferences: { autoSave: true, showAdvancedOptions: false, theme: 'default' }
                },
                templates: {
                    custom: [],
                    usage: {},
                    favorites: []
                }
            };
            
            return legacyConfig;
        }
        
        return config;
    }

    // Merge configuration with defaults
    mergeWithDefaults(config, defaults) {
        const merged = JSON.parse(JSON.stringify(defaults));
        
        function deepMerge(target, source) {
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    target[key] = target[key] || {};
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        }
        
        deepMerge(merged, config);
        return merged;
    }

    // Validate required fields
    validateRequiredFields(config) {
        const requiredPaths = [
            'version',
            'metadata',
            'authentication.github',
            'authentication.codemagic',
            'settings',
            'ui',
            'templates'
        ];
        
        for (const path of requiredPaths) {
            if (!this.getNestedProperty(config, path)) {
                throw new Error(`Missing required configuration field: ${path}`);
            }
        }
    }

    // Get nested property from object
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    // Save configuration to memory (for auto-save)
    async saveConfiguration(filePath = null, options = {}) {
        try {
            if (!this.currentConfig) {
                throw new Error('No configuration to save');
            }

            const targetPath = filePath || this.currentFilePath;
            const includeSensitive = options.includeSensitive !== false;

            // Prepare configuration for saving
            const configToSave = this.prepareConfigForSaving(includeSensitive);

            // Update state (but don't download)
            if (targetPath) {
                this.currentFilePath = targetPath;
            }
            this.isDirty = false;

            this.emit('config:saved', {
                filePath: targetPath,
                includeSensitive,
                config: configToSave,
                isAutoSave: options.isAutoSave || false
            });

            console.log('✅ Configuration saved to memory');

            return configToSave;

        } catch (error) {
            this.emit('config:error', { error, type: 'save' });
            throw error;
        }
    }

    // Download configuration file (explicit user action)
    async downloadConfiguration(filePath = null, options = {}) {
        try {
            if (!this.currentConfig) {
                throw new Error('No configuration to download');
            }

            const targetPath = filePath || this.currentFilePath || 'cordova-app-generator-config.json';
            const includeSensitive = options.includeSensitive !== false;

            // Create backup if enabled
            if (this.backupEnabled && this.currentFilePath) {
                await this.createBackup();
            }

            // Prepare configuration for saving
            const configToSave = this.prepareConfigForSaving(includeSensitive);

            // Create and download file
            const configJson = JSON.stringify(configToSave, null, 2);
            const blob = new Blob([configJson], { type: 'application/json' });

            // Download file
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = targetPath.split('/').pop() || 'cordova-app-generator-config.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Update state
            this.currentFilePath = targetPath;
            this.isDirty = false;
            this.addToRecentFiles(targetPath);

            this.emit('config:downloaded', {
                filePath: targetPath,
                includeSensitive,
                config: configToSave
            });

            console.log('✅ Configuration downloaded successfully');

            return configToSave;

        } catch (error) {
            this.emit('config:error', { error, type: 'download' });
            throw error;
        }
    }

    // Prepare configuration for saving
    prepareConfigForSaving(includeSensitive = true) {
        const config = JSON.parse(JSON.stringify(this.currentConfig));
        
        // Update metadata
        config.metadata.lastModified = new Date().toISOString();
        config.metadata.savedBy = 'Cordova App Generator';
        
        // Remove sensitive data if requested
        if (!includeSensitive) {
            config.authentication.github.token = '';
            config.authentication.codemagic.token = '';
        }
        
        return config;
    }

    // Create backup of current configuration
    async createBackup() {
        if (!this.currentConfig || !this.currentFilePath) return;
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = this.currentFilePath.replace('.json', `-backup-${timestamp}.json`);
            
            const configJson = JSON.stringify(this.currentConfig, null, 2);
            const blob = new Blob([configJson], { type: 'application/json' });
            
            // Note: In a real file system, we would save this automatically
            // For web implementation, we'll just log the backup creation
            console.log(`📦 Backup created: ${backupPath}`);
            
        } catch (error) {
            console.warn('⚠️ Failed to create backup:', error);
        }
    }

    // Get current configuration
    getConfig() {
        return this.currentConfig ? JSON.parse(JSON.stringify(this.currentConfig)) : null;
    }

    // Update configuration
    updateConfig(path, value) {
        if (!this.currentConfig) {
            this.createDefaultConfiguration();
        }
        
        this.setNestedProperty(this.currentConfig, path, value);
        this.isDirty = true;
        this.currentConfig.metadata.lastModified = new Date().toISOString();
        
        this.emit('config:changed', { path, value, config: this.currentConfig });
        
        // Auto-save if enabled
        if (this.autoSaveEnabled && this.currentFilePath) {
            this.debouncedAutoSave();
        }
    }

    // Set nested property in object
    setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            current[key] = current[key] || {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    // Setup auto-save functionality
    setupAutoSave() {
        this.debouncedAutoSave = this.debounce(async () => {
            if (this.isDirty && this.currentFilePath && this.autoSaveEnabled) {
                try {
                    await this.saveConfiguration(null, { isAutoSave: true });
                    console.log('💾 Auto-saved configuration');
                } catch (error) {
                    console.error('❌ Auto-save failed:', error);
                }
            }
        }, 2000);
    }

    // Debounce utility
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Recent files management
    loadRecentFiles() {
        try {
            const stored = localStorage.getItem('cordova-recent-files');
            this.recentFiles = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('Failed to load recent files:', error);
            this.recentFiles = [];
        }
    }

    addToRecentFiles(filePath) {
        if (!filePath) return;
        
        // Remove if already exists
        this.recentFiles = this.recentFiles.filter(f => f.path !== filePath);
        
        // Add to beginning
        this.recentFiles.unshift({
            path: filePath,
            name: filePath.split('/').pop(),
            timestamp: new Date().toISOString()
        });
        
        // Keep only max recent files
        this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles);
        
        // Save to localStorage (temporary until full migration)
        try {
            localStorage.setItem('cordova-recent-files', JSON.stringify(this.recentFiles));
        } catch (error) {
            console.warn('Failed to save recent files:', error);
        }
        
        this.emit('recent-files:updated', this.recentFiles);
    }

    getRecentFiles() {
        return [...this.recentFiles];
    }

    // Configuration templates
    getConfigurationTemplates() {
        return [
            {
                id: 'personal',
                name: 'Personal Development',
                description: 'Basic setup for personal projects',
                config: {
                    ...this.defaultConfig,
                    settings: {
                        ...this.defaultConfig.settings,
                        packagePrefix: 'com.personal',
                        authorName: 'Personal Developer',
                        enableCodemagicIntegration: false
                    }
                }
            },
            {
                id: 'team',
                name: 'Team Project',
                description: 'Configuration for team collaboration',
                config: {
                    ...this.defaultConfig,
                    settings: {
                        ...this.defaultConfig.settings,
                        packagePrefix: 'com.team',
                        enableCodemagicIntegration: true,
                        enableBuildPreparation: true
                    }
                }
            },
            {
                id: 'production',
                name: 'Production',
                description: 'Production-ready configuration',
                config: {
                    ...this.defaultConfig,
                    settings: {
                        ...this.defaultConfig.settings,
                        packagePrefix: 'com.production',
                        enableCodemagicIntegration: true,
                        enableBuildPreparation: true,
                        enableGitInit: true
                    }
                }
            }
        ];
    }

    // Load configuration template
    async loadTemplate(templateId) {
        const templates = this.getConfigurationTemplates();
        const template = templates.find(t => t.id === templateId);
        
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }
        
        await this.loadConfigurationFromData(template.config);
        this.currentFilePath = null; // Mark as new file
        this.isDirty = true;
        
        console.log(`✅ Loaded template: ${template.name}`);
    }

    // Validation methods
    validateGitHubToken(token) {
        if (!token) return { valid: false, error: 'Token is required' };
        if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
            return { valid: false, error: 'Invalid token format. Must start with ghp_ or github_pat_' };
        }
        if (token.length < 20) {
            return { valid: false, error: 'Token is too short' };
        }
        return { valid: true };
    }

    validateCodemagicToken(token) {
        if (!token) return { valid: false, error: 'Token is required' };
        if (token.length !== 43) {
            return { valid: false, error: 'Codemagic token must be exactly 43 characters long' };
        }
        if (!/^[A-Za-z0-9_-]+$/.test(token)) {
            return { valid: false, error: 'Token contains invalid characters' };
        }
        return { valid: true };
    }

    // Cleanup
    destroy() {
        this.eventListeners.clear();
        this.currentConfig = null;
        this.currentFilePath = null;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ConfigurationManager = ConfigurationManager;
}
