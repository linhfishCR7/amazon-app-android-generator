/**
 * Configuration settings for Cordova App Generator
 * Modify these settings for your deployment environment
 */

// Detect environment
const isProduction = window.location.protocol === 'https:' && 
                    !window.location.hostname.includes('localhost') && 
                    !window.location.hostname.includes('127.0.0.1');

const CONFIG = {
    // Environment settings
    production: isProduction,
    debug: !isProduction,
    version: '1.0.0',
    
    // Application limits
    maxAppsPerSession: 10,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxTemplateNameLength: 50,
    maxDescriptionLength: 500,
    
    // GitHub API configuration
    github: {
        apiUrl: 'https://api.github.com',
        timeout: 30000, // 30 seconds
        retries: 3,
        retryDelay: 1000, // 1 second
        maxRepoNameLength: 100,
        allowedScopes: ['public_repo', 'repo']
    },
    
    // UI configuration
    ui: {
        toastDuration: 5000, // 5 seconds
        animationDuration: 300, // 300ms
        debounceDelay: 500, // 500ms for search/input
        maxRecentTemplates: 10,
        defaultTheme: 'light'
    },
    
    // Security settings
    security: {
        allowedDomains: [
            'api.github.com',
            'fonts.googleapis.com',
            'fonts.gstatic.com',
            'cdnjs.cloudflare.com'
        ],
        maxTokenLength: 200,
        sanitizeInputs: true,
        validatePackageNames: true
    },
    
    // Feature flags
    features: {
        githubIntegration: true,
        customTemplates: true,
        templateImportExport: true,
        randomAppGeneration: true,
        batchGeneration: true,
        analytics: false, // Disabled by default for privacy
        errorReporting: false // Disabled by default for privacy
    },
    
    // Default values for new users
    defaults: {
        packagePrefix: 'com.yourcompany',
        authorName: 'Your Name',
        authorEmail: 'your.email@example.com',
        androidSdkVersion: '33',
        cordovaVersion: '12.0.0'
    },
    
    // Validation rules
    validation: {
        packageName: {
            pattern: /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/,
            minLength: 3,
            maxLength: 100
        },
        appName: {
            pattern: /^[a-zA-Z0-9\s\-_]+$/,
            minLength: 1,
            maxLength: 50
        },
        email: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        githubUsername: {
            pattern: /^[a-zA-Z0-9]([a-zA-Z0-9\-])*[a-zA-Z0-9]$/,
            minLength: 1,
            maxLength: 39
        }
    },
    
    // Error messages
    messages: {
        errors: {
            networkError: 'Network error. Please check your connection and try again.',
            githubTokenInvalid: 'Invalid GitHub token. Please check your token and try again.',
            githubRateLimit: 'GitHub API rate limit exceeded. Please try again later.',
            validationFailed: 'Please check your input and try again.',
            templateGenerationFailed: 'Failed to generate template. Please try again.',
            fileUploadFailed: 'Failed to upload files to GitHub. Please try again.'
        },
        success: {
            templateGenerated: 'Template generated successfully!',
            repositoryCreated: 'Repository created successfully!',
            configurationSaved: 'Configuration saved successfully!',
            templateSaved: 'Custom template saved successfully!'
        },
        warnings: {
            unsavedChanges: 'You have unsaved changes. Are you sure you want to leave?',
            deleteTemplate: 'Are you sure you want to delete this template?',
            resetConfiguration: 'Are you sure you want to reset all configuration?'
        }
    },
    
    // Storage keys for localStorage
    storage: {
        userConfig: 'cordova_app_generator_config',
        customTemplates: 'cordova_app_generator_custom_templates',
        recentTemplates: 'cordova_app_generator_recent_templates',
        uiPreferences: 'cordova_app_generator_ui_preferences'
    },
    
    // Analytics configuration (if enabled)
    analytics: {
        enabled: false, // Disabled by default for privacy
        trackingId: '', // Set your tracking ID if analytics are enabled
        events: {
            templateGenerated: 'template_generated',
            repositoryCreated: 'repository_created',
            customTemplateCreated: 'custom_template_created',
            errorOccurred: 'error_occurred'
        }
    },
    
    // Development settings (only active in development)
    development: {
        mockGithubApi: false,
        showDebugInfo: !isProduction,
        enableConsoleLogging: !isProduction,
        skipValidation: false
    }
};

// Freeze configuration to prevent accidental modifications
Object.freeze(CONFIG);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}

// Utility functions for configuration
const ConfigUtils = {
    /**
     * Get a configuration value by path
     * @param {string} path - Dot-separated path (e.g., 'github.apiUrl')
     * @param {*} defaultValue - Default value if path not found
     * @returns {*} Configuration value
     */
    get(path, defaultValue = null) {
        return path.split('.').reduce((obj, key) => 
            obj && obj[key] !== undefined ? obj[key] : defaultValue, CONFIG);
    },
    
    /**
     * Check if a feature is enabled
     * @param {string} feature - Feature name
     * @returns {boolean} True if feature is enabled
     */
    isFeatureEnabled(feature) {
        return CONFIG.features[feature] === true;
    },
    
    /**
     * Get validation rule for a field
     * @param {string} field - Field name
     * @returns {object} Validation rule object
     */
    getValidationRule(field) {
        return CONFIG.validation[field] || {};
    },
    
    /**
     * Get error message
     * @param {string} type - Error type (errors, success, warnings)
     * @param {string} key - Message key
     * @returns {string} Error message
     */
    getMessage(type, key) {
        return CONFIG.messages[type] && CONFIG.messages[type][key] || 
               `Unknown ${type}: ${key}`;
    },
    
    /**
     * Check if running in production
     * @returns {boolean} True if in production
     */
    isProduction() {
        return CONFIG.production;
    },
    
    /**
     * Check if debug mode is enabled
     * @returns {boolean} True if debug mode is enabled
     */
    isDebugEnabled() {
        return CONFIG.debug;
    }
};

// Export utilities
if (typeof module !== 'undefined' && module.exports) {
    module.exports.ConfigUtils = ConfigUtils;
} else {
    window.ConfigUtils = ConfigUtils;
}

// Initialize configuration logging (development only)
if (CONFIG.development.showDebugInfo) {
    console.log('Cordova App Generator Configuration:', {
        version: CONFIG.version,
        production: CONFIG.production,
        features: CONFIG.features,
        environment: isProduction ? 'production' : 'development'
    });
}
