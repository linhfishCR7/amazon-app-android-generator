/**
 * App Templates System
 * Manages different app templates and their configurations
 */

class AppTemplatesManager {
    constructor() {
        this.templates = new Map();
        this.categories = new Set();
        this.availablePlugins = new Map();
        this.init();
    }

    init() {
        this.loadAvailablePlugins();
        this.loadDefaultTemplates();
    }

    // Load available Cordova plugins
    loadAvailablePlugins() {
        const plugins = [
            {
                id: 'cordova-plugin-geolocation',
                name: 'Geolocation',
                description: 'Access device location services',
                category: 'device'
            },
            {
                id: 'cordova-plugin-camera',
                name: 'Camera',
                description: 'Take photos and access photo library',
                category: 'media'
            },
            {
                id: 'cordova-plugin-file',
                name: 'File System',
                description: 'Read and write files on device',
                category: 'storage'
            },
            {
                id: 'cordova-plugin-local-notification',
                name: 'Local Notifications',
                description: 'Schedule local notifications',
                category: 'notifications'
            },
            {
                id: 'cordova-plugin-network-information',
                name: 'Network Information',
                description: 'Monitor network connectivity',
                category: 'device'
            },
            {
                id: 'cordova-plugin-device',
                name: 'Device Information',
                description: 'Access device information',
                category: 'device'
            },
            {
                id: 'cordova-plugin-vibration',
                name: 'Vibration',
                description: 'Control device vibration',
                category: 'device'
            },
            {
                id: 'cordova-plugin-media',
                name: 'Media Playback',
                description: 'Play audio and video files',
                category: 'media'
            },
            {
                id: 'cordova-plugin-calendar',
                name: 'Calendar Access',
                description: 'Access device calendar',
                category: 'productivity'
            },
            {
                id: 'cordova-plugin-contacts',
                name: 'Contacts',
                description: 'Access device contacts',
                category: 'productivity'
            },
            {
                id: 'cordova-plugin-flashlight',
                name: 'Flashlight',
                description: 'Control device flashlight',
                category: 'utilities'
            },
            {
                id: 'phonegap-plugin-barcodescanner',
                name: 'Barcode Scanner',
                description: 'Scan QR codes and barcodes',
                category: 'utilities'
            },
            {
                id: 'cordova-plugin-secure-storage',
                name: 'Secure Storage',
                description: 'Encrypted data storage',
                category: 'security'
            },
            {
                id: 'cordova-plugin-fingerprint-aio',
                name: 'Fingerprint Authentication',
                description: 'Biometric authentication',
                category: 'security'
            },
            {
                id: 'cordova-plugin-health',
                name: 'Health Data',
                description: 'Access health and fitness data',
                category: 'health'
            },
            {
                id: 'cordova-plugin-pedometer',
                name: 'Pedometer',
                description: 'Step counting functionality',
                category: 'health'
            },
            {
                id: 'cordova-plugin-social-sharing',
                name: 'Social Sharing',
                description: 'Share content to social platforms',
                category: 'social'
            },
            {
                id: 'cordova-plugin-tts',
                name: 'Text-to-Speech',
                description: 'Convert text to speech',
                category: 'accessibility'
            },
            {
                id: 'cordova-plugin-speech-recognition',
                name: 'Speech Recognition',
                description: 'Convert speech to text',
                category: 'accessibility'
            },
            {
                id: 'cordova-plugin-background-mode',
                name: 'Background Mode',
                description: 'Keep app running in background',
                category: 'system'
            },
            {
                id: 'cordova-plugin-music-controls',
                name: 'Music Controls',
                description: 'Media playback controls',
                category: 'media'
            },
            {
                id: 'cordova-plugin-statusbar',
                name: 'Status Bar',
                description: 'Control status bar appearance',
                category: 'ui'
            },
            {
                id: 'cordova-plugin-splashscreen',
                name: 'Splash Screen',
                description: 'Control splash screen behavior',
                category: 'ui'
            },
            {
                id: 'cordova-plugin-whitelist',
                name: 'Whitelist',
                description: 'Security whitelist for network requests',
                category: 'security'
            }
        ];

        plugins.forEach(plugin => {
            this.availablePlugins.set(plugin.id, plugin);
        });
    }

    // Load default app templates
    loadDefaultTemplates() {
        const defaultTemplates = [
            {
                id: 'climate-monitor',
                name: 'ClimateMonitor',
                displayName: 'Climate Monitor',
                description: 'Weather and climate monitoring with real-time data, forecasts, and environmental insights',
                category: 'weather',
                icon: '🌤️',
                color: '#4A90E2',
                features: ['Real-time weather data', '7-day forecasts', 'Climate insights', 'Location-based alerts'],
                plugins: ['cordova-plugin-geolocation', 'cordova-plugin-network-information', 'cordova-plugin-device'],
                estimatedTime: 3
            },
            {
                id: 'task-master-pro',
                name: 'TaskMasterPro',
                displayName: 'Task Master Pro',
                description: 'Advanced productivity and task management application with project tracking and team collaboration',
                category: 'productivity',
                icon: '✅',
                color: '#50C878',
                features: ['Task organization', 'Project management', 'Time tracking', 'Team collaboration'],
                plugins: ['cordova-plugin-local-notification', 'cordova-plugin-calendar', 'cordova-plugin-file'],
                estimatedTime: 4
            },
            {
                id: 'qr-scanner-plus',
                name: 'QRScannerPlus',
                displayName: 'QR Scanner Plus',
                description: 'QR code and barcode scanner with advanced features, history tracking, and batch scanning',
                category: 'utilities',
                icon: '📱',
                color: '#FF6B6B',
                features: ['QR code scanning', 'Barcode recognition', 'History tracking', 'Batch scanning'],
                plugins: ['phonegap-plugin-barcodescanner', 'cordova-plugin-camera', 'cordova-plugin-flashlight'],
                estimatedTime: 3
            },
            {
                id: 'expense-tracker',
                name: 'ExpenseTracker',
                displayName: 'Expense Tracker',
                description: 'Personal finance and expense tracking application with receipt scanning and budget management',
                category: 'finance',
                icon: '💰',
                color: '#FFD93D',
                features: ['Expense tracking', 'Budget management', 'Receipt scanning', 'Financial reports'],
                plugins: ['cordova-plugin-camera', 'cordova-plugin-file', 'cordova-plugin-local-notification'],
                estimatedTime: 4
            },
            {
                id: 'fitness-companion',
                name: 'FitnessCompanion',
                displayName: 'Fitness Companion',
                description: 'Health and fitness tracking with workout plans, progress analytics, and goal setting',
                category: 'health',
                icon: '💪',
                color: '#FF4757',
                features: ['Workout tracking', 'Health monitoring', 'Progress analytics', 'Goal setting'],
                plugins: ['cordova-plugin-health', 'cordova-plugin-pedometer', 'cordova-plugin-geolocation'],
                estimatedTime: 5
            },
            {
                id: 'study-timer',
                name: 'StudyTimer',
                displayName: 'Study Timer',
                description: 'Pomodoro timer and study session management with focus tracking and break reminders',
                category: 'education',
                icon: '⏰',
                color: '#3742FA',
                features: ['Pomodoro technique', 'Study sessions', 'Break reminders', 'Progress tracking'],
                plugins: ['cordova-plugin-local-notification', 'cordova-plugin-vibration', 'cordova-plugin-background-mode'],
                estimatedTime: 3
            },
            {
                id: 'recipe-vault',
                name: 'RecipeVault',
                displayName: 'Recipe Vault',
                description: 'Recipe management and cooking assistant with meal planning and shopping lists',
                category: 'food',
                icon: '👨‍🍳',
                color: '#FF9F43',
                features: ['Recipe storage', 'Cooking timers', 'Shopping lists', 'Meal planning'],
                plugins: ['cordova-plugin-camera', 'cordova-plugin-file', 'cordova-plugin-social-sharing'],
                estimatedTime: 4
            },
            {
                id: 'password-guardian',
                name: 'PasswordGuardian',
                displayName: 'Password Guardian',
                description: 'Secure password manager and generator with biometric authentication and encrypted storage',
                category: 'security',
                icon: '🔐',
                color: '#2F3542',
                features: ['Password storage', 'Secure encryption', 'Biometric unlock', 'Password generation'],
                plugins: ['cordova-plugin-secure-storage', 'cordova-plugin-fingerprint-aio'],
                estimatedTime: 5
            },
            {
                id: 'music-player-pro',
                name: 'MusicPlayerPro',
                displayName: 'Music Player Pro',
                description: 'Advanced music player with playlist management, audio effects, and library organization',
                category: 'entertainment',
                icon: '🎵',
                color: '#8E44AD',
                features: ['Music playback', 'Playlist creation', 'Audio effects', 'Library management'],
                plugins: ['cordova-plugin-media', 'cordova-plugin-file', 'cordova-plugin-music-controls'],
                estimatedTime: 5
            },
            {
                id: 'language-buddy',
                name: 'LanguageBuddy',
                displayName: 'Language Buddy',
                description: 'Interactive language learning with flashcards, quizzes, and speech recognition',
                category: 'education',
                icon: '🗣️',
                color: '#00D2D3',
                features: ['Language lessons', 'Flashcard system', 'Speech recognition', 'Progress tracking'],
                plugins: ['cordova-plugin-media', 'cordova-plugin-tts', 'cordova-plugin-speech-recognition'],
                estimatedTime: 4
            }
        ];

        defaultTemplates.forEach(template => {
            this.addTemplate(template);
        });
    }

    // Add a new template
    addTemplate(template) {
        // Validate template
        if (!this.validateTemplate(template)) {
            throw new Error('Invalid template configuration');
        }

        // Add to templates map
        this.templates.set(template.id, template);
        
        // Add category to categories set
        this.categories.add(template.category);

        return template;
    }

    // Validate template structure
    validateTemplate(template) {
        const required = ['id', 'name', 'displayName', 'description', 'category', 'icon', 'color'];
        return required.every(field => template.hasOwnProperty(field) && template[field]);
    }

    // Get all templates
    getAllTemplates() {
        return Array.from(this.templates.values());
    }

    // Get templates by category
    getTemplatesByCategory(category) {
        return this.getAllTemplates().filter(template => template.category === category);
    }

    // Get template by ID
    getTemplate(id) {
        return this.templates.get(id);
    }

    // Get all categories
    getCategories() {
        return Array.from(this.categories).sort();
    }

    // Get available plugins
    getAvailablePlugins() {
        return Array.from(this.availablePlugins.values());
    }

    // Get plugins by category
    getPluginsByCategory(category) {
        return this.getAvailablePlugins().filter(plugin => plugin.category === category);
    }

    // Create custom template from form data
    createCustomTemplate(formData) {
        const template = {
            id: this.generateId(formData.name),
            name: this.sanitizeName(formData.name),
            displayName: formData.name,
            description: formData.description,
            category: formData.category,
            icon: formData.icon || '📱',
            color: formData.color || '#4A90E2',
            features: this.generateFeatures(formData.category),
            plugins: formData.plugins || [],
            estimatedTime: this.calculateEstimatedTime(formData.plugins || []),
            custom: true
        };

        return this.addTemplate(template);
    }

    // Generate unique ID from name
    generateId(name) {
        const base = name.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        
        let id = base;
        let counter = 1;
        
        while (this.templates.has(id)) {
            id = `${base}-${counter}`;
            counter++;
        }
        
        return id;
    }

    // Sanitize name for use as class/variable name
    sanitizeName(name) {
        return name.replace(/[^a-zA-Z0-9]/g, '');
    }

    // Generate default features based on category
    generateFeatures(category) {
        const categoryFeatures = {
            productivity: ['Task management', 'Organization tools', 'Productivity tracking', 'Goal setting'],
            utilities: ['Utility functions', 'Tool integration', 'Quick access', 'Efficiency features'],
            entertainment: ['Media playback', 'Interactive content', 'User engagement', 'Entertainment features'],
            education: ['Learning tools', 'Progress tracking', 'Educational content', 'Study aids'],
            health: ['Health monitoring', 'Fitness tracking', 'Wellness features', 'Progress analytics'],
            finance: ['Financial tracking', 'Budget management', 'Expense monitoring', 'Financial reports'],
            weather: ['Weather data', 'Forecasting', 'Climate information', 'Location-based updates'],
            social: ['Social features', 'Sharing capabilities', 'Community interaction', 'Communication tools'],
            business: ['Business tools', 'Professional features', 'Workflow management', 'Business analytics'],
            lifestyle: ['Lifestyle features', 'Personal tools', 'Daily assistance', 'Life management']
        };

        return categoryFeatures[category] || ['Custom features', 'User-friendly interface', 'Mobile optimized', 'Cross-platform'];
    }

    // Calculate estimated generation time
    calculateEstimatedTime(plugins) {
        const baseTime = 2; // Base time in minutes
        const pluginTime = plugins.length * 0.5; // 30 seconds per plugin
        return Math.ceil(baseTime + pluginTime);
    }

    // Remove template
    removeTemplate(id) {
        const template = this.templates.get(id);
        if (template && template.custom) {
            this.templates.delete(id);
            return true;
        }
        return false;
    }

    // Export templates configuration
    exportTemplates() {
        const customTemplates = this.getAllTemplates().filter(t => t.custom);
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            templates: customTemplates
        };
    }

    // Import templates configuration
    importTemplates(config) {
        if (!config.templates || !Array.isArray(config.templates)) {
            throw new Error('Invalid templates configuration');
        }

        const imported = [];
        config.templates.forEach(template => {
            try {
                const importedTemplate = this.addTemplate(template);
                imported.push(importedTemplate);
            } catch (error) {
                console.warn('Failed to import template:', template.name, error);
            }
        });

        return imported;
    }

    // Get template statistics
    getStatistics() {
        const templates = this.getAllTemplates();
        const categories = {};
        
        templates.forEach(template => {
            categories[template.category] = (categories[template.category] || 0) + 1;
        });

        return {
            totalTemplates: templates.length,
            customTemplates: templates.filter(t => t.custom).length,
            categories: categories,
            totalPlugins: this.availablePlugins.size
        };
    }
}

// Export for use in other modules
window.AppTemplatesManager = AppTemplatesManager;
