/**
 * Template Management System
 * Handles custom template creation, management, and integration with build history
 */

class TemplateManager {
    constructor() {
        this.storageKey = 'cordova-generator-custom-templates';
        this.usageStatsKey = 'cordova-generator-template-usage';
        this.eventListeners = new Map();
        this.builtInTemplates = [];
        this.customTemplates = [];
        this.templateUsageStats = new Map();
        
        // Template categories
        this.categories = [
            'productivity', 'entertainment', 'utilities', 'education', 
            'health', 'finance', 'social', 'business', 'games', 'lifestyle'
        ];
        
        // Template validation schema
        this.templateSchema = {
            required: ['id', 'name', 'displayName', 'description', 'icon', 'color'],
            optional: ['plugins', 'category', 'tags', 'customConfig', 'baseTemplate', 'version', 'author']
        };
        
        this.init();
    }

    // Initialize the template manager
    init() {
        this.loadCustomTemplates();
        this.loadUsageStats();
        this.loadBuiltInTemplates();
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
            this.eventListeners.get(event).forEach(callback => callback(data));
        }
    }

    // Load built-in templates from existing templates manager
    loadBuiltInTemplates() {
        if (window.templatesManager && window.templatesManager.templates) {
            this.builtInTemplates = window.templatesManager.templates.map(template => ({
                ...template,
                isBuiltIn: true,
                category: template.category || 'utilities',
                tags: template.tags || [],
                version: '1.0.0',
                author: 'Cordova App Generator',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));
        }
    }

    // Create a new custom template
    createTemplate(templateData) {
        try {
            // Validate template data
            const validation = this.validateTemplate(templateData);
            if (!validation.isValid) {
                throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
            }

            // Generate unique ID if not provided
            if (!templateData.id) {
                templateData.id = this.generateTemplateId(templateData.name);
            }

            // Check for duplicate IDs
            if (this.getTemplateById(templateData.id)) {
                throw new Error(`Template with ID '${templateData.id}' already exists`);
            }

            // Create template object
            const template = {
                id: templateData.id,
                name: templateData.name,
                displayName: templateData.displayName,
                description: templateData.description,
                icon: templateData.icon,
                color: templateData.color,
                plugins: templateData.plugins || [],
                category: templateData.category || 'utilities',
                tags: templateData.tags || [],
                customConfig: templateData.customConfig || {},
                baseTemplate: templateData.baseTemplate || null,
                version: templateData.version || '1.0.0',
                author: templateData.author || 'User',
                isBuiltIn: false,
                isCustom: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Add to custom templates
            this.customTemplates.push(template);
            this.saveCustomTemplates();

            this.emit('template:created', template);
            return template;

        } catch (error) {
            this.emit('template:create:error', { error, templateData });
            throw error;
        }
    }

    // Update an existing template
    updateTemplate(templateId, updateData) {
        try {
            const templateIndex = this.customTemplates.findIndex(t => t.id === templateId);
            if (templateIndex === -1) {
                throw new Error(`Template with ID '${templateId}' not found`);
            }

            // Merge update data with existing template
            const updatedTemplate = {
                ...this.customTemplates[templateIndex],
                ...updateData,
                id: templateId, // Prevent ID changes
                updatedAt: new Date().toISOString()
            };

            // Validate updated template
            const validation = this.validateTemplate(updatedTemplate);
            if (!validation.isValid) {
                throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
            }

            // Update template
            this.customTemplates[templateIndex] = updatedTemplate;
            this.saveCustomTemplates();

            this.emit('template:updated', updatedTemplate);
            return updatedTemplate;

        } catch (error) {
            this.emit('template:update:error', { error, templateId, updateData });
            throw error;
        }
    }

    // Delete a custom template
    deleteTemplate(templateId) {
        try {
            const templateIndex = this.customTemplates.findIndex(t => t.id === templateId);
            if (templateIndex === -1) {
                throw new Error(`Template with ID '${templateId}' not found`);
            }

            const deletedTemplate = this.customTemplates[templateIndex];
            this.customTemplates.splice(templateIndex, 1);
            this.saveCustomTemplates();

            // Remove usage stats
            this.templateUsageStats.delete(templateId);
            this.saveUsageStats();

            this.emit('template:deleted', deletedTemplate);
            return deletedTemplate;

        } catch (error) {
            this.emit('template:delete:error', { error, templateId });
            throw error;
        }
    }

    // Duplicate a template
    duplicateTemplate(templateId, newName = null) {
        try {
            const originalTemplate = this.getTemplateById(templateId);
            if (!originalTemplate) {
                throw new Error(`Template with ID '${templateId}' not found`);
            }

            // Create duplicate data
            const duplicateData = {
                ...originalTemplate,
                id: null, // Will be generated
                name: newName || `${originalTemplate.name}_copy`,
                displayName: newName || `${originalTemplate.displayName} (Copy)`,
                baseTemplate: originalTemplate.id,
                version: '1.0.0',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Remove built-in specific properties
            delete duplicateData.isBuiltIn;
            delete duplicateData.isCustom;

            return this.createTemplate(duplicateData);

        } catch (error) {
            this.emit('template:duplicate:error', { error, templateId });
            throw error;
        }
    }

    // Get all templates (built-in + custom)
    getAllTemplates() {
        return [...this.builtInTemplates, ...this.customTemplates];
    }

    // Get templates by category
    getTemplatesByCategory(category) {
        return this.getAllTemplates().filter(template => template.category === category);
    }

    // Get templates by tags
    getTemplatesByTags(tags) {
        if (!Array.isArray(tags)) tags = [tags];
        return this.getAllTemplates().filter(template => 
            template.tags && template.tags.some(tag => tags.includes(tag))
        );
    }

    // Get template by ID
    getTemplateById(templateId) {
        return this.getAllTemplates().find(template => template.id === templateId);
    }

    // Search templates
    searchTemplates(query) {
        const searchTerm = query.toLowerCase();
        return this.getAllTemplates().filter(template => 
            template.name.toLowerCase().includes(searchTerm) ||
            template.displayName.toLowerCase().includes(searchTerm) ||
            template.description.toLowerCase().includes(searchTerm) ||
            (template.tags && template.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
    }

    // Validate template data
    validateTemplate(templateData) {
        const errors = [];
        
        // Check required fields
        this.templateSchema.required.forEach(field => {
            if (!templateData[field] || templateData[field].toString().trim() === '') {
                errors.push(`Required field '${field}' is missing or empty`);
            }
        });

        // Validate specific fields
        if (templateData.plugins && !Array.isArray(templateData.plugins)) {
            errors.push('Plugins must be an array');
        }

        if (templateData.tags && !Array.isArray(templateData.tags)) {
            errors.push('Tags must be an array');
        }

        if (templateData.category && !this.categories.includes(templateData.category)) {
            errors.push(`Invalid category '${templateData.category}'. Must be one of: ${this.categories.join(', ')}`);
        }

        // Validate color format (hex color)
        if (templateData.color && !/^#[0-9A-F]{6}$/i.test(templateData.color)) {
            errors.push('Color must be a valid hex color (e.g., #FF5733)');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Generate unique template ID
    generateTemplateId(name) {
        const baseName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        let id = baseName;
        let counter = 1;

        while (this.getTemplateById(id)) {
            id = `${baseName}_${counter}`;
            counter++;
        }

        return id;
    }

    // Record template usage
    recordTemplateUsage(templateId, buildId = null, status = 'used') {
        const stats = this.templateUsageStats.get(templateId) || {
            templateId,
            usageCount: 0,
            lastUsed: null,
            builds: [],
            successCount: 0,
            failureCount: 0,
            createdAt: new Date().toISOString()
        };

        stats.usageCount++;
        stats.lastUsed = new Date().toISOString();

        if (buildId) {
            stats.builds.push({
                buildId,
                status,
                timestamp: new Date().toISOString()
            });

            if (status === 'success') {
                stats.successCount++;
            } else if (status === 'failed') {
                stats.failureCount++;
            }
        }

        this.templateUsageStats.set(templateId, stats);
        this.saveUsageStats();

        this.emit('template:usage:recorded', { templateId, stats });
        return stats;
    }

    // Get template usage statistics
    getTemplateUsageStats(templateId) {
        return this.templateUsageStats.get(templateId) || {
            templateId,
            usageCount: 0,
            lastUsed: null,
            builds: [],
            successCount: 0,
            failureCount: 0,
            createdAt: new Date().toISOString()
        };
    }

    // Get all usage statistics
    getAllUsageStats() {
        const stats = {};
        this.templateUsageStats.forEach((value, key) => {
            stats[key] = value;
        });
        return stats;
    }

    // Save custom templates to localStorage
    saveCustomTemplates() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.customTemplates));
            this.emit('templates:saved', { count: this.customTemplates.length });
        } catch (error) {
            console.error('Failed to save custom templates:', error);
            this.emit('templates:save:error', { error });
        }
    }

    // Load custom templates from localStorage
    loadCustomTemplates() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.customTemplates = JSON.parse(stored);
                this.emit('templates:loaded', { count: this.customTemplates.length });
            }
        } catch (error) {
            console.error('Failed to load custom templates:', error);
            this.customTemplates = [];
            this.emit('templates:load:error', { error });
        }
    }

    // Save usage statistics
    saveUsageStats() {
        try {
            const statsObject = {};
            this.templateUsageStats.forEach((value, key) => {
                statsObject[key] = value;
            });
            localStorage.setItem(this.usageStatsKey, JSON.stringify(statsObject));
        } catch (error) {
            console.error('Failed to save usage statistics:', error);
        }
    }

    // Load usage statistics
    loadUsageStats() {
        try {
            const stored = localStorage.getItem(this.usageStatsKey);
            if (stored) {
                const statsObject = JSON.parse(stored);
                this.templateUsageStats = new Map(Object.entries(statsObject));
            }
        } catch (error) {
            console.error('Failed to load usage statistics:', error);
            this.templateUsageStats = new Map();
        }
    }

    // Export templates to JSON
    exportTemplates(includeBuiltIn = false, includeUsageStats = true) {
        const exportData = {
            exportDate: new Date().toISOString(),
            version: '1.0.0',
            generator: 'Cordova App Generator',
            templates: includeBuiltIn ? this.getAllTemplates() : this.customTemplates,
            usageStats: includeUsageStats ? this.getAllUsageStats() : {},
            categories: this.categories
        };

        return JSON.stringify(exportData, null, 2);
    }

    // Import templates from JSON
    importTemplates(jsonData, options = {}) {
        try {
            const importData = JSON.parse(jsonData);

            if (!importData.templates || !Array.isArray(importData.templates)) {
                throw new Error('Invalid template data format');
            }

            const results = {
                imported: 0,
                skipped: 0,
                errors: []
            };

            importData.templates.forEach(templateData => {
                try {
                    // Skip built-in templates unless explicitly allowed
                    if (templateData.isBuiltIn && !options.includeBuiltIn) {
                        results.skipped++;
                        return;
                    }

                    // Handle duplicate IDs
                    if (this.getTemplateById(templateData.id)) {
                        if (options.overwriteExisting) {
                            this.updateTemplate(templateData.id, templateData);
                        } else if (options.createCopies) {
                            templateData.id = null; // Will generate new ID
                            templateData.name = `${templateData.name}_imported`;
                            this.createTemplate(templateData);
                        } else {
                            results.skipped++;
                            return;
                        }
                    } else {
                        this.createTemplate(templateData);
                    }

                    results.imported++;

                } catch (error) {
                    results.errors.push(`Template '${templateData.name}': ${error.message}`);
                }
            });

            // Import usage statistics if available
            if (importData.usageStats && options.includeUsageStats) {
                Object.entries(importData.usageStats).forEach(([templateId, stats]) => {
                    this.templateUsageStats.set(templateId, stats);
                });
                this.saveUsageStats();
            }

            this.emit('templates:imported', results);
            return results;

        } catch (error) {
            this.emit('templates:import:error', { error });
            throw error;
        }
    }

    // Generate random apps
    generateRandomApps(options = {}) {
        const {
            count = 5,
            categories = null,
            excludeTemplates = [],
            includeBuiltIn = true,
            includeCustom = true,
            ensureUnique = true
        } = options;

        try {
            // Get available templates
            let availableTemplates = [];

            if (includeBuiltIn) {
                availableTemplates.push(...this.builtInTemplates);
            }

            if (includeCustom) {
                availableTemplates.push(...this.customTemplates);
            }

            // Filter by categories
            if (categories && categories.length > 0) {
                availableTemplates = availableTemplates.filter(template =>
                    categories.includes(template.category)
                );
            }

            // Exclude specific templates
            if (excludeTemplates.length > 0) {
                availableTemplates = availableTemplates.filter(template =>
                    !excludeTemplates.includes(template.id)
                );
            }

            if (availableTemplates.length === 0) {
                throw new Error('No templates available for random generation');
            }

            const randomApps = [];
            const usedTemplates = new Set();

            for (let i = 0; i < count; i++) {
                let template;
                let attempts = 0;
                const maxAttempts = availableTemplates.length * 2;

                // Select random template
                do {
                    template = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
                    attempts++;
                } while (ensureUnique && usedTemplates.has(template.id) && attempts < maxAttempts);

                if (ensureUnique && usedTemplates.has(template.id)) {
                    // If we can't find unique templates, break
                    break;
                }

                // Generate random app data
                const randomApp = this.generateRandomAppData(template, i + 1);
                randomApps.push(randomApp);

                if (ensureUnique) {
                    usedTemplates.add(template.id);
                }
            }

            this.emit('random:apps:generated', { apps: randomApps, options });
            return randomApps;

        } catch (error) {
            this.emit('random:apps:error', { error, options });
            throw error;
        }
    }

    // Generate random app data based on template
    generateRandomAppData(template, index) {
        const randomSuffixes = ['Pro', 'Plus', 'Lite', 'Express', 'Ultimate', 'Premium', 'Advanced', 'Simple'];
        const randomPrefixes = ['Smart', 'Quick', 'Easy', 'Super', 'Mega', 'Ultra', 'Power', 'Instant'];

        // Generate random variations
        const usePrefix = Math.random() > 0.7;
        const useSuffix = Math.random() > 0.6;
        const useNumber = Math.random() > 0.8;

        let appName = template.displayName;

        if (usePrefix) {
            const prefix = randomPrefixes[Math.floor(Math.random() * randomPrefixes.length)];
            appName = `${prefix} ${appName}`;
        }

        if (useSuffix) {
            const suffix = randomSuffixes[Math.floor(Math.random() * randomSuffixes.length)];
            appName = `${appName} ${suffix}`;
        }

        if (useNumber) {
            const number = Math.floor(Math.random() * 99) + 1;
            appName = `${appName} ${number}`;
        }

        // Generate unique package name
        const packageName = this.generateRandomPackageName(appName);

        return {
            template: template,
            generatedName: appName,
            packageName: packageName,
            description: this.generateRandomDescription(template, appName),
            randomSeed: Math.random(),
            generatedAt: new Date().toISOString(),
            index: index
        };
    }

    // Generate random package name
    generateRandomPackageName(appName) {
        const cleanName = appName.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '')
            .substring(0, 20);

        const randomId = Math.random().toString(36).substring(2, 8);
        return `com.generated.${cleanName}${randomId}`;
    }

    // Generate random description
    generateRandomDescription(template, appName) {
        const descriptions = [
            `Experience the power of ${appName} - your ultimate ${template.category} companion.`,
            `${appName} brings innovative ${template.category} features to your fingertips.`,
            `Discover ${appName}, the next-generation ${template.category} application.`,
            `Transform your ${template.category} experience with ${appName}.`,
            `${appName} - where ${template.category} meets innovation.`
        ];

        return descriptions[Math.floor(Math.random() * descriptions.length)];
    }

    // Clear all custom templates
    clearCustomTemplates() {
        try {
            this.customTemplates = [];
            localStorage.removeItem(this.storageKey);
            this.emit('templates:cleared', {});
            return true;
        } catch (error) {
            this.emit('templates:clear:error', { error });
            return false;
        }
    }

    // Get template statistics
    getTemplateStatistics() {
        const stats = {
            total: this.getAllTemplates().length,
            builtIn: this.builtInTemplates.length,
            custom: this.customTemplates.length,
            categories: {},
            mostUsed: null,
            totalUsage: 0
        };

        // Count by categories
        this.getAllTemplates().forEach(template => {
            const category = template.category || 'uncategorized';
            stats.categories[category] = (stats.categories[category] || 0) + 1;
        });

        // Usage statistics
        let maxUsage = 0;
        this.templateUsageStats.forEach((usage, templateId) => {
            stats.totalUsage += usage.usageCount;
            if (usage.usageCount > maxUsage) {
                maxUsage = usage.usageCount;
                stats.mostUsed = {
                    templateId,
                    template: this.getTemplateById(templateId),
                    usageCount: usage.usageCount
                };
            }
        });

        return stats;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TemplateManager = TemplateManager;
}
