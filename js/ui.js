/**
 * UI Management Module
 * Handles user interface interactions and updates
 */

class UIManager {
    constructor() {
        this.selectedTemplates = new Set();
        this.modals = new Map();
        this.toasts = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeModals();
        this.setupToastContainer();
    }

    // Initialize UI components that depend on other modules
    initializeDependentComponents() {
        // This will be called after all modules are available
        this.populatePluginsGrid();
    }

    // Setup event listeners
    setupEventListeners() {
        // Global configuration
        document.getElementById('resetConfigBtn')?.addEventListener('click', this.resetConfiguration.bind(this));
        document.getElementById('loadConfigBtn')?.addEventListener('click', this.showLoadConfigModal.bind(this));
        document.getElementById('saveConfigBtn')?.addEventListener('click', this.saveConfiguration.bind(this));

        // Template actions
        document.getElementById('selectAllBtn')?.addEventListener('click', this.selectAllTemplates.bind(this));
        document.getElementById('deselectAllBtn')?.addEventListener('click', this.deselectAllTemplates.bind(this));
        document.getElementById('addCustomTemplateBtn')?.addEventListener('click', this.showCustomTemplateModal.bind(this));

        // Generation
        document.getElementById('generateAllBtn')?.addEventListener('click', this.startGeneration.bind(this));
        document.getElementById('cancelGenerationBtn')?.addEventListener('click', this.cancelGeneration.bind(this));

        // Results actions
        document.getElementById('downloadAllBtn')?.addEventListener('click', this.downloadAllApps.bind(this));
        document.getElementById('viewOnGithubBtn')?.addEventListener('click', this.viewOnGitHub.bind(this));

        // Footer links
        document.getElementById('aboutBtn')?.addEventListener('click', this.showAbout.bind(this));
        document.getElementById('helpBtn')?.addEventListener('click', this.showHelp.bind(this));
        document.getElementById('githubBtn')?.addEventListener('click', this.openGitHub.bind(this));

        // Form validation
        this.setupFormValidation();

        // Codemagic integration toggle
        this.setupCodemagicIntegration();
    }

    // Initialize modals
    initializeModals() {
        const modalElements = document.querySelectorAll('.modal-overlay');
        modalElements.forEach(modal => {
            const modalId = modal.id;
            this.modals.set(modalId, modal);

            // Close button
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.hideModal(modalId));
            }

            // Overlay click to close
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modalId);
                }
            });

            // Escape key to close
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.classList.contains('show')) {
                    this.hideModal(modalId);
                }
            });
        });

        // Custom template modal
        this.setupCustomTemplateModal();
        
        // Config modal
        this.setupConfigModal();
    }

    // Setup custom template modal
    setupCustomTemplateModal() {
        const form = document.getElementById('customTemplateForm');
        if (form) {
            form.addEventListener('submit', this.handleCustomTemplateSubmit.bind(this));
        }

        document.getElementById('cancelCustomTemplate')?.addEventListener('click', () => {
            this.hideModal('customTemplateModal');
        });

        // Note: populatePluginsGrid will be called later when templatesManager is available
    }

    // Setup config modal
    setupConfigModal() {
        const uploadArea = document.getElementById('configUploadArea');
        const fileInput = document.getElementById('configFileInput');

        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());
            uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
            uploadArea.addEventListener('drop', this.handleConfigDrop.bind(this));
            fileInput.addEventListener('change', this.handleConfigFileSelect.bind(this));
        }

        document.getElementById('cancelConfigLoad')?.addEventListener('click', () => {
            this.hideModal('configModal');
        });

        document.getElementById('loadConfigConfirm')?.addEventListener('click', this.loadConfigurationFromFile.bind(this));
    }

    // Setup toast container
    setupToastContainer() {
        if (!document.getElementById('toastContainer')) {
            const container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    }

    // Render templates grid
    renderTemplatesGrid(templates) {
        const grid = document.getElementById('templatesGrid');
        if (!grid) {
            console.warn('Templates grid element not found');
            return;
        }

        if (!templates || !Array.isArray(templates)) {
            console.warn('Invalid templates data provided to renderTemplatesGrid');
            return;
        }

        grid.innerHTML = '';

        templates.forEach(template => {
            try {
                const card = this.createTemplateCard(template);
                grid.appendChild(card);
            } catch (error) {
                console.error('Error creating template card:', error, template);
            }
        });

        this.updatePreview();
    }

    // Create template card
    createTemplateCard(template) {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.dataset.templateId = template.id;

        if (this.selectedTemplates.has(template.id)) {
            card.classList.add('selected');
        }

        card.innerHTML = `
            <div class="template-header">
                <div class="template-icon" style="background-color: ${template.color}">
                    ${template.icon}
                </div>
                <div class="template-info">
                    <h3>${template.displayName}</h3>
                    <div class="template-category">${template.category}</div>
                </div>
            </div>
            <div class="template-description">
                ${template.description}
            </div>
            <div class="template-features">
                ${template.features.map(feature => 
                    `<span class="feature-tag">${feature}</span>`
                ).join('')}
            </div>
            <div class="template-footer">
                <div class="plugin-count">
                    <i class="fas fa-plug"></i>
                    ${template.plugins.length} plugins
                </div>
                <div class="template-checkbox">
                    <i class="fas fa-check"></i>
                </div>
            </div>
        `;

        card.addEventListener('click', () => this.toggleTemplate(template.id));

        return card;
    }

    // Toggle template selection
    toggleTemplate(templateId) {
        const card = document.querySelector(`[data-template-id="${templateId}"]`);
        if (!card) return;

        if (this.selectedTemplates.has(templateId)) {
            this.selectedTemplates.delete(templateId);
            card.classList.remove('selected');
        } else {
            this.selectedTemplates.add(templateId);
            card.classList.add('selected');
        }

        this.updatePreview();
    }

    // Select all templates
    selectAllTemplates() {
        const cards = document.querySelectorAll('.template-card');
        cards.forEach(card => {
            const templateId = card.dataset.templateId;
            this.selectedTemplates.add(templateId);
            card.classList.add('selected');
        });
        this.updatePreview();
    }

    // Deselect all templates
    deselectAllTemplates() {
        const cards = document.querySelectorAll('.template-card');
        cards.forEach(card => {
            const templateId = card.dataset.templateId;
            this.selectedTemplates.delete(templateId);
            card.classList.remove('selected');
        });
        this.updatePreview();
    }

    // Update preview section
    updatePreview() {
        const selectedCount = this.selectedTemplates.size;
        const estimatedTime = this.calculateEstimatedTime();

        // Update stats
        document.getElementById('selectedCount').textContent = selectedCount;
        document.getElementById('estimatedTime').textContent = `${estimatedTime} min`;

        // Update preview list
        const previewList = document.getElementById('previewList');
        if (!previewList) return;

        if (selectedCount === 0) {
            previewList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-mobile-alt"></i>
                    <h3>No Apps Selected</h3>
                    <p>Select app templates above to see preview here</p>
                </div>
            `;
        } else {
            const selectedTemplateIds = Array.from(this.selectedTemplates);
            const templates = selectedTemplateIds.map(id => window.templatesManager.getTemplate(id)).filter(Boolean);
            
            previewList.innerHTML = templates.map(template => `
                <div class="preview-item">
                    <div class="preview-icon" style="background-color: ${template.color}">
                        ${template.icon}
                    </div>
                    <div class="preview-info">
                        <h4>${template.displayName}</h4>
                        <p>${template.description}</p>
                    </div>
                    <div class="preview-actions">
                        <button class="btn btn-sm btn-secondary" onclick="ui.removeFromPreview('${template.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        // Update generate button state
        const generateBtn = document.getElementById('generateAllBtn');
        if (generateBtn) {
            generateBtn.disabled = selectedCount === 0;
        }
    }

    // Remove template from preview
    removeFromPreview(templateId) {
        this.selectedTemplates.delete(templateId);
        const card = document.querySelector(`[data-template-id="${templateId}"]`);
        if (card) {
            card.classList.remove('selected');
        }
        this.updatePreview();
    }

    // Calculate estimated time
    calculateEstimatedTime() {
        const selectedTemplateIds = Array.from(this.selectedTemplates);
        const templates = selectedTemplateIds.map(id => window.templatesManager.getTemplate(id)).filter(Boolean);
        return templates.reduce((total, template) => total + (template.estimatedTime || 3), 0);
    }

    // Show modal
    showModal(modalId) {
        const modal = this.modals.get(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    // Hide modal
    hideModal(modalId) {
        const modal = this.modals.get(modalId);
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    // Show custom template modal
    showCustomTemplateModal() {
        // Ensure plugins grid is populated when modal is shown
        this.populatePluginsGrid();
        this.showModal('customTemplateModal');
    }

    // Show load config modal
    showLoadConfigModal() {
        this.showModal('configModal');
    }

    // Handle custom template form submit
    handleCustomTemplateSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const templateData = {
            name: formData.get('customAppName'),
            description: formData.get('customAppDescription'),
            category: formData.get('customAppCategory'),
            icon: formData.get('customAppIcon') || '📱',
            color: formData.get('customAppColor'),
            plugins: Array.from(document.querySelectorAll('#customPluginsGrid input:checked')).map(cb => cb.value)
        };

        try {
            window.templatesManager.createCustomTemplate(templateData);
            this.showToast('Custom template created successfully!', 'success');
            this.hideModal('customTemplateModal');

            // Re-render templates grid
            const allTemplates = window.templatesManager.getAllTemplates();
            this.renderTemplatesGrid(allTemplates);

            // Reset form
            e.target.reset();
        } catch (error) {
            this.showToast(`Failed to create template: ${error.message}`, 'error');
        }
    }

    // Populate plugins grid
    populatePluginsGrid() {
        const grid = document.getElementById('customPluginsGrid');
        if (!grid) return;

        // Check if templatesManager is available
        if (!window.templatesManager || typeof window.templatesManager.getAvailablePlugins !== 'function') {
            console.warn('templatesManager not available yet, skipping plugin grid population');
            return;
        }

        try {
            const plugins = window.templatesManager.getAvailablePlugins();
            grid.innerHTML = plugins.map(plugin => `
                <div class="checkbox-item">
                    <input type="checkbox" id="plugin-${plugin.id}" value="${plugin.id}">
                    <label for="plugin-${plugin.id}">${plugin.name}</label>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error populating plugins grid:', error);
        }
    }

    // Handle drag over
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
    }

    // Handle config file drop
    handleConfigDrop(e) {
        e.preventDefault();
        e.currentTarget.style.backgroundColor = '';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processConfigFile(files[0]);
        }
    }

    // Handle config file select
    handleConfigFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processConfigFile(files[0]);
        }
    }

    // Process config file
    processConfigFile(file) {
        if (file.type !== 'application/json') {
            this.showToast('Please select a JSON file', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                this.previewConfiguration(config);
            } catch (error) {
                this.showToast('Invalid JSON file', 'error');
            }
        };
        reader.readAsText(file);
    }

    // Preview configuration
    previewConfiguration(config) {
        const preview = document.getElementById('configPreview');
        const previewContent = document.getElementById('configPreviewContent');
        const confirmBtn = document.getElementById('loadConfigConfirm');

        if (preview && previewContent && confirmBtn) {
            preview.style.display = 'block';
            previewContent.textContent = JSON.stringify(config, null, 2);
            confirmBtn.disabled = false;
            confirmBtn.dataset.config = JSON.stringify(config);
        }
    }

    // Load configuration from file
    loadConfigurationFromFile() {
        const confirmBtn = document.getElementById('loadConfigConfirm');
        if (!confirmBtn || !confirmBtn.dataset.config) return;

        try {
            const config = JSON.parse(confirmBtn.dataset.config);
            this.applyConfiguration(config);
            this.hideModal('configModal');
            this.showToast('Configuration loaded successfully!', 'success');
        } catch (error) {
            this.showToast('Failed to load configuration', 'error');
        }
    }

    // Apply configuration
    applyConfiguration(config) {
        // Apply global settings
        if (config.global) {
            Object.keys(config.global).forEach(key => {
                const input = document.getElementById(key);
                if (input) {
                    input.value = config.global[key];
                }
            });
        }

        // Apply template selections
        if (config.selectedTemplates) {
            this.selectedTemplates.clear();
            config.selectedTemplates.forEach(templateId => {
                this.selectedTemplates.add(templateId);
            });
            this.updateTemplateSelections();
        }
    }

    // Update template selections in UI
    updateTemplateSelections() {
        const cards = document.querySelectorAll('.template-card');
        cards.forEach(card => {
            const templateId = card.dataset.templateId;
            if (this.selectedTemplates.has(templateId)) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
        this.updatePreview();
    }

    // Reset configuration
    resetConfiguration() {
        // Reset form fields
        const form = document.querySelector('.config-form');
        if (form) {
            form.reset();
            
            // Set default values
            document.getElementById('githubUsername').value = 'linhfishCR7';
            document.getElementById('githubToken').value = '';
            document.getElementById('packagePrefix').value = 'com.lehau';
            document.getElementById('authorName').value = 'LinhFish Development Team';
            document.getElementById('authorEmail').value = 'dev@linhfish.com';
            document.getElementById('outputDirectory').value = './generated-apps';
            document.getElementById('androidMinSdk').value = '33';
            document.getElementById('enableBuildPreparation').checked = true;
            document.getElementById('enableGitInit').checked = true;
        }

        // Clear template selections
        this.deselectAllTemplates();
        
        this.showToast('Configuration reset to defaults', 'info');
    }

    // Save configuration
    saveConfiguration() {
        const config = this.getCurrentConfiguration();
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cordova-app-generator-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Configuration saved successfully!', 'success');
    }

    // Get current configuration
    getCurrentConfiguration() {
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            global: {
                githubUsername: document.getElementById('githubUsername').value,
                githubToken: document.getElementById('githubToken').value, // Note: Be careful with token storage
                packagePrefix: document.getElementById('packagePrefix').value,
                authorName: document.getElementById('authorName').value,
                authorEmail: document.getElementById('authorEmail').value,
                outputDirectory: document.getElementById('outputDirectory').value,
                androidMinSdk: document.getElementById('androidMinSdk').value
            },
            selectedTemplates: Array.from(this.selectedTemplates)
        };
    }

    // Setup form validation
    setupFormValidation() {
        const inputs = document.querySelectorAll('input[required], select[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', this.validateField.bind(this));
            input.addEventListener('input', (e) => this.clearFieldError(e.target));
        });
    }

    // Setup Codemagic integration toggle
    setupCodemagicIntegration() {
        const checkbox = document.getElementById('enableCodemagicIntegration');
        const fieldsContainer = document.getElementById('codemagicFields');

        if (checkbox && fieldsContainer) {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    fieldsContainer.style.display = 'block';
                    // Make Codemagic fields required when enabled
                    document.getElementById('codemagicApiToken').setAttribute('required', 'required');
                } else {
                    fieldsContainer.style.display = 'none';
                    // Remove required attribute when disabled
                    document.getElementById('codemagicApiToken').removeAttribute('required');
                }
            });
        }
    }

    // Validate field
    validateField(e) {
        const field = e.target;
        const value = field.value.trim();
        
        if (!value) {
            this.showFieldError(field, 'This field is required');
            return false;
        }

        // Specific validations
        if (field.type === 'email' && !this.isValidEmail(value)) {
            this.showFieldError(field, 'Please enter a valid email address');
            return false;
        }

        if (field.id === 'packagePrefix' && !this.isValidPackageName(value)) {
            this.showFieldError(field, 'Please enter a valid package name (e.g., com.yourname)');
            return false;
        }

        this.clearFieldError(field);
        return true;
    }

    // Show field error
    showFieldError(field, message) {
        field.classList.add('error');
        
        let errorElement = field.parentNode.querySelector('.field-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            field.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }

    // Clear field error
    clearFieldError(field) {
        if (!field || !field.classList) {
            console.warn('Invalid field element passed to clearFieldError');
            return;
        }

        field.classList.remove('error');

        if (field.parentNode) {
            const errorElement = field.parentNode.querySelector('.field-error');
            if (errorElement && errorElement.remove) {
                errorElement.remove();
            }
        }
    }

    // Validate email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate package name
    isValidPackageName(packageName) {
        const packageRegex = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/;
        return packageRegex.test(packageName);
    }

    // Show toast notification
    showToast(message, type = 'info', duration = 5000) {
        let container = document.getElementById('toastContainer');
        if (!container) {
            // Create container if it doesn't exist
            this.setupToastContainer();
            container = document.getElementById('toastContainer');
            if (!container) {
                console.warn('Could not create toast container');
                return;
            }
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${icons[type] || icons.info}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.removeToast(toast));

        container.appendChild(toast);
        this.toasts.push(toast);

        // Auto remove after duration
        setTimeout(() => this.removeToast(toast), duration);
    }

    // Remove toast
    removeToast(toast) {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                const index = this.toasts.indexOf(toast);
                if (index > -1) {
                    this.toasts.splice(index, 1);
                }
            }, 300);
        }
    }

    // Show about dialog
    showAbout() {
        this.showToast('Cordova App Generator v1.0.0 - Create multiple mobile apps instantly!', 'info', 8000);
    }

    // Show help
    showHelp() {
        window.open('https://github.com/linhfishCR7/cordova-app-generator#readme', '_blank');
    }

    // Open GitHub
    openGitHub() {
        window.open('https://github.com/linhfishCR7/cordova-app-generator', '_blank');
    }

    // Start generation (placeholder)
    startGeneration() {
        if (this.selectedTemplates.size === 0) {
            this.showToast('Please select at least one app template', 'warning');
            return;
        }

        // This will be implemented in the main app.js
        window.app?.startGeneration();
    }

    // Cancel generation (placeholder)
    cancelGeneration() {
        window.app?.cancelGeneration();
    }

    // Download all apps (placeholder)
    downloadAllApps() {
        window.app?.downloadAllApps();
    }

    // View on GitHub (placeholder)
    viewOnGitHub() {
        window.app?.viewOnGitHub();
    }

    // Get selected templates
    getSelectedTemplates() {
        return Array.from(this.selectedTemplates);
    }

    // Get form data
    getFormData() {
        return {
            githubUsername: document.getElementById('githubUsername').value,
            githubToken: document.getElementById('githubToken').value,
            packagePrefix: document.getElementById('packagePrefix').value,
            authorName: document.getElementById('authorName').value,
            authorEmail: document.getElementById('authorEmail').value,
            outputDirectory: document.getElementById('outputDirectory').value,
            androidMinSdk: document.getElementById('androidMinSdk').value,
            codemagicConfig: document.getElementById('codemagicConfig').value,
            enableBuildPreparation: document.getElementById('enableBuildPreparation').checked,
            enableGitInit: document.getElementById('enableGitInit').checked,
            // Codemagic integration fields
            enableCodemagicIntegration: document.getElementById('enableCodemagicIntegration').checked,
            codemagicApiToken: document.getElementById('codemagicApiToken').value,
            codemagicTeamId: document.getElementById('codemagicTeamId').value,
            codemagicWorkflowId: document.getElementById('codemagicWorkflowId').value,
            codemagicBranch: document.getElementById('codemagicBranch').value
        };
    }
}

// Export for use in other modules
window.UIManager = UIManager;
