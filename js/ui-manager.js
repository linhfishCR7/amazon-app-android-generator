/**
 * Enhanced UI Manager
 * Handles all UI interactions, configuration file operations, and user feedback
 */

class EnhancedUIManager {
    constructor(configManager, authManager) {
        this.configManager = configManager;
        this.authManager = authManager;
        this.toastQueue = [];
        this.isProcessingToasts = false;
        this.recentFilesMenu = null;
        this.dragDropHandler = null;
        
        this.init();
    }

    // Initialize UI manager
    init() {
        this.setupConfigurationUI();
        this.setupAuthenticationUI();
        this.setupToastSystem();
        this.setupKeyboardShortcuts();
        this.setupDragDrop();
        this.setupRecentFilesMenu();
        
        console.log('✅ Enhanced UI Manager initialized');
    }

    // Setup configuration UI
    setupConfigurationUI() {
        // Load Configuration button
        const loadConfigBtn = document.getElementById('loadConfigBtn');
        if (loadConfigBtn) {
            loadConfigBtn.addEventListener('click', () => this.showLoadConfigDialog());
        }

        // Save Configuration button
        const saveConfigBtn = document.getElementById('saveConfigBtn');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => this.showSaveConfigDialog());
        }

        // Auto-save toggle
        const autoSaveToggle = document.getElementById('autoSaveToggle');
        if (autoSaveToggle) {
            autoSaveToggle.addEventListener('change', (e) => {
                this.configManager.autoSaveEnabled = e.target.checked;
                this.showToast(`Auto-save ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
            });
        }

        // Configuration templates dropdown
        this.setupConfigTemplatesDropdown();

        // Listen for configuration events
        this.configManager.on('config:loaded', (data) => {
            this.onConfigLoaded(data);
        });

        this.configManager.on('config:saved', (data) => {
            // Don't show toast for auto-save, only for explicit saves
            if (!data.isAutoSave) {
                this.showToast('Configuration updated', 'success');
            }
        });

        this.configManager.on('config:downloaded', (data) => {
            this.showToast('Configuration file downloaded successfully', 'success');
        });

        this.configManager.on('config:error', (data) => {
            this.showToast(`Configuration error: ${data.error.message}`, 'error');
        });
    }

    // Setup authentication UI
    setupAuthenticationUI() {
        // GitHub test connection button
        const testGitHubBtn = document.getElementById('testGitHubBtn');
        if (testGitHubBtn) {
            testGitHubBtn.addEventListener('click', async () => {
                console.log('🔍 Manual GitHub connection test initiated...');

                // Get the actual token value
                const githubTokenInput = document.getElementById('githubToken');
                let token = '';

                if (githubTokenInput && githubTokenInput._getActualValue) {
                    token = githubTokenInput._getActualValue();
                } else if (githubTokenInput) {
                    token = githubTokenInput.value;
                } else {
                    // Fallback to config
                    const config = this.configManager.getConfig();
                    token = config?.authentication?.github?.token || '';
                }

                if (!token.trim()) {
                    this.showToast('Please enter a GitHub token first', 'warning');
                    return;
                }

                try {
                    const result = await this.authManager.validateGitHubToken(token.trim());
                    if (result) {
                        this.showToast('GitHub connection test successful!', 'success');
                    } else {
                        this.showToast('GitHub connection test failed. Check the status indicator for details.', 'error');
                    }
                } catch (error) {
                    console.error('GitHub test connection error:', error);
                    this.showToast(`GitHub connection test failed: ${error.message}`, 'error');
                }
            });
        }

        // Codemagic test connection button
        const testCodemagicBtn = document.getElementById('testCodemagicBtn');
        if (testCodemagicBtn) {
            testCodemagicBtn.addEventListener('click', async () => {
                console.log('🔍 Manual Codemagic connection test initiated...');

                // Get the actual token value
                const codemagicTokenInput = document.getElementById('codemagicApiToken');
                let token = '';

                if (codemagicTokenInput && codemagicTokenInput._getActualValue) {
                    token = codemagicTokenInput._getActualValue();
                } else if (codemagicTokenInput) {
                    token = codemagicTokenInput.value;
                } else {
                    // Fallback to config
                    const config = this.configManager.getConfig();
                    token = config?.authentication?.codemagic?.token || '';
                }

                if (!token.trim()) {
                    this.showToast('Please enter a Codemagic API token first', 'warning');
                    return;
                }

                try {
                    const result = await this.authManager.validateCodemagicToken(token.trim());
                    if (result) {
                        this.showToast('Codemagic connection test successful!', 'success');
                    } else {
                        this.showToast('Codemagic connection test failed. Check the status indicator for details.', 'error');
                    }
                } catch (error) {
                    console.error('Codemagic test connection error:', error);
                    this.showToast(`Codemagic connection test failed: ${error.message}`, 'error');
                }
            });
        }

        // Listen for authentication events
        this.authManager.on('github:status', (data) => {
            this.updateAuthStatus('github', data);
        });

        this.authManager.on('codemagic:status', (data) => {
            this.updateAuthStatus('codemagic', data);
        });

        // Setup token input handlers
        this.setupTokenInputs();
    }

    // Setup token input handlers
    setupTokenInputs() {
        const githubTokenInput = document.getElementById('githubToken');
        const codemagicTokenInput = document.getElementById('codemagicApiToken');

        if (githubTokenInput) {
            // Store the actual token value separately
            let actualGithubToken = '';

            githubTokenInput.addEventListener('input', (e) => {
                actualGithubToken = e.target.value;
                this.configManager.updateConfig('authentication.github.token', actualGithubToken);

                // Clear previous validation state when token changes
                this.authManager.updateAuthState('github', 'disconnected', 'Token updated - validation pending');
            });

            githubTokenInput.addEventListener('blur', () => {
                if (actualGithubToken.trim()) {
                    console.log('🔑 Validating GitHub token on blur...');
                    this.authManager.validateGitHubToken(actualGithubToken.trim());
                }
            });

            githubTokenInput.addEventListener('focus', () => {
                // Show full token when focused for editing
                if (actualGithubToken) {
                    githubTokenInput.value = actualGithubToken;
                }
            });

            // Store reference to actual token for later use
            githubTokenInput._getActualValue = () => actualGithubToken;
            githubTokenInput._setActualValue = (value) => {
                actualGithubToken = value;
                githubTokenInput.value = value;
            };
        }

        if (codemagicTokenInput) {
            // Store the actual token value separately
            let actualCodemagicToken = '';

            codemagicTokenInput.addEventListener('input', (e) => {
                actualCodemagicToken = e.target.value;
                this.configManager.updateConfig('authentication.codemagic.token', actualCodemagicToken);

                // Clear previous validation state when token changes
                this.authManager.updateAuthState('codemagic', 'disconnected', 'Token updated - validation pending');
            });

            codemagicTokenInput.addEventListener('blur', () => {
                if (actualCodemagicToken.trim()) {
                    console.log('🔑 Validating Codemagic token on blur...');
                    this.authManager.validateCodemagicToken(actualCodemagicToken.trim());
                }
            });

            codemagicTokenInput.addEventListener('focus', () => {
                // Show full token when focused for editing
                if (actualCodemagicToken) {
                    codemagicTokenInput.value = actualCodemagicToken;
                }
            });

            // Store reference to actual token for later use
            codemagicTokenInput._getActualValue = () => actualCodemagicToken;
            codemagicTokenInput._setActualValue = (value) => {
                actualCodemagicToken = value;
                codemagicTokenInput.value = value;
            };
        }
    }

    // Setup toast notification system
    setupToastSystem() {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(toastContainer);
        }
    }

    // Show toast notification
    showToast(message, type = 'info', duration = 5000) {
        const toast = {
            id: Date.now() + Math.random(),
            message,
            type,
            duration,
            timestamp: new Date()
        };

        this.toastQueue.push(toast);
        
        if (!this.isProcessingToasts) {
            this.processToastQueue();
        }
    }

    // Process toast queue
    async processToastQueue() {
        this.isProcessingToasts = true;
        
        while (this.toastQueue.length > 0) {
            const toast = this.toastQueue.shift();
            await this.displayToast(toast);
        }
        
        this.isProcessingToasts = false;
    }

    // Display individual toast
    displayToast(toast) {
        return new Promise((resolve) => {
            const container = document.getElementById('toast-container');
            if (!container) {
                console.log(`[${toast.type.toUpperCase()}] ${toast.message}`);
                resolve();
                return;
            }

            const toastElement = document.createElement('div');
            toastElement.className = `toast toast-${toast.type}`;
            toastElement.innerHTML = `
                <div class="toast-content">
                    <div class="toast-icon">
                        ${this.getToastIcon(toast.type)}
                    </div>
                    <div class="toast-message">${toast.message}</div>
                    <button class="toast-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
            `;

            toastElement.style.cssText = `
                background: ${this.getToastColor(toast.type)};
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                margin-bottom: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                pointer-events: auto;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.4;
            `;

            container.appendChild(toastElement);

            // Animate in
            setTimeout(() => {
                toastElement.style.opacity = '1';
                toastElement.style.transform = 'translateX(0)';
            }, 100);

            // Auto-remove after duration
            setTimeout(() => {
                toastElement.style.opacity = '0';
                toastElement.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (toastElement.parentNode) {
                        toastElement.parentNode.removeChild(toastElement);
                    }
                    resolve();
                }, 300);
            }, toast.duration);
        });
    }

    // Get toast icon
    getToastIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || 'ℹ';
    }

    // Get toast color
    getToastColor(type) {
        const colors = {
            success: 'linear-gradient(135deg, #4caf50, #388e3c)',
            error: 'linear-gradient(135deg, #f44336, #d32f2f)',
            warning: 'linear-gradient(135deg, #ff9800, #f57c00)',
            info: 'linear-gradient(135deg, #2196f3, #1976d2)'
        };
        return colors[type] || colors.info;
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S - Save configuration
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.showSaveConfigDialog();
            }
            
            // Ctrl+O - Open configuration
            if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                this.showLoadConfigDialog();
            }
            
            // Ctrl+N - New configuration
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.createNewConfiguration();
            }
        });
    }

    // Setup drag and drop for configuration files
    setupDragDrop() {
        const dropZone = document.body;
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            this.showDropZoneOverlay();
        });

        dropZone.addEventListener('dragleave', (e) => {
            if (!dropZone.contains(e.relatedTarget)) {
                this.hideDropZoneOverlay();
            }
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.hideDropZoneOverlay();
            
            const files = Array.from(e.dataTransfer.files);
            const configFile = files.find(file => 
                file.name.endsWith('.json') && 
                file.name.includes('cordova-app-generator-config')
            );
            
            if (configFile) {
                this.loadConfigurationFile(configFile);
            } else {
                this.showToast('Please drop a valid configuration file (.json)', 'warning');
            }
        });
    }

    // Show drop zone overlay
    showDropZoneOverlay() {
        let overlay = document.getElementById('drop-zone-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'drop-zone-overlay';
            overlay.innerHTML = `
                <div class="drop-zone-content">
                    <div class="drop-zone-icon">📁</div>
                    <h3>Drop Configuration File</h3>
                    <p>Drop your cordova-app-generator-config.json file here</p>
                </div>
            `;
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                text-align: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    }

    // Hide drop zone overlay
    hideDropZoneOverlay() {
        const overlay = document.getElementById('drop-zone-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Show load configuration dialog
    showLoadConfigDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadConfigurationFile(file);
            }
        };
        input.click();
    }

    // Load configuration file
    async loadConfigurationFile(file) {
        try {
            this.showToast('Loading configuration...', 'info');
            await this.configManager.loadConfigurationFromFile(file);
            this.showToast(`Configuration loaded: ${file.name}`, 'success');
        } catch (error) {
            console.error('Failed to load configuration:', error);
            this.showToast(`Failed to load configuration: ${error.message}`, 'error');
        }
    }

    // Show save configuration dialog
    showSaveConfigDialog() {
        const modal = this.createModal('Save Configuration', `
            <div class="form-group">
                <label>
                    <input type="checkbox" id="includeSensitive" checked>
                    Include sensitive data (tokens)
                </label>
                <small>Uncheck to save configuration without API tokens</small>
            </div>
            <div class="form-group">
                <label for="configDescription">Description (optional):</label>
                <input type="text" id="configDescription" placeholder="e.g., Production setup for Team Project">
            </div>
        `, [
            {
                text: 'Cancel',
                class: 'btn-secondary',
                onclick: () => this.closeModal()
            },
            {
                text: 'Save Configuration',
                class: 'btn-primary',
                onclick: () => this.saveConfiguration()
            }
        ]);
    }

    // Save configuration (explicit user action - triggers download)
    async saveConfiguration() {
        try {
            const includeSensitive = document.getElementById('includeSensitive')?.checked !== false;
            const description = document.getElementById('configDescription')?.value || '';

            // Update description in config if provided
            if (description) {
                this.configManager.updateConfig('metadata.description', description);
            }

            // Use downloadConfiguration for explicit user saves
            await this.configManager.downloadConfiguration(null, { includeSensitive });
            this.closeModal();
            this.showToast('Configuration file downloaded successfully', 'success');
        } catch (error) {
            console.error('Failed to save configuration:', error);
            this.showToast(`Failed to save configuration: ${error.message}`, 'error');
        }
    }

    // Setup configuration templates dropdown
    setupConfigTemplatesDropdown() {
        const templatesBtn = document.getElementById('configTemplatesBtn');
        if (templatesBtn) {
            templatesBtn.addEventListener('click', () => {
                this.showConfigTemplatesMenu();
            });
        }
    }

    // Show configuration templates menu
    showConfigTemplatesMenu() {
        const templates = this.configManager.getConfigurationTemplates();
        const menuItems = templates.map(template => `
            <div class="template-item" onclick="uiManager.loadConfigTemplate('${template.id}')">
                <h4>${template.name}</h4>
                <p>${template.description}</p>
            </div>
        `).join('');

        this.createModal('Configuration Templates', `
            <div class="config-templates">
                ${menuItems}
            </div>
        `, [
            {
                text: 'Cancel',
                class: 'btn-secondary',
                onclick: () => this.closeModal()
            }
        ]);
    }

    // Load configuration template
    async loadConfigTemplate(templateId) {
        try {
            await this.configManager.loadTemplate(templateId);
            this.closeModal();
            this.showToast('Configuration template loaded', 'success');
        } catch (error) {
            console.error('Failed to load template:', error);
            this.showToast(`Failed to load template: ${error.message}`, 'error');
        }
    }

    // Setup recent files menu
    setupRecentFilesMenu() {
        const recentBtn = document.getElementById('recentFilesBtn');
        if (recentBtn) {
            recentBtn.addEventListener('click', () => {
                this.showRecentFilesMenu();
            });
        }

        // Listen for recent files updates
        this.configManager.on('recent-files:updated', (files) => {
            this.updateRecentFilesMenu(files);
        });
    }

    // Show recent files menu
    showRecentFilesMenu() {
        const recentFiles = this.configManager.getRecentFiles();
        
        if (recentFiles.length === 0) {
            this.showToast('No recent configuration files', 'info');
            return;
        }

        const menuItems = recentFiles.map(file => `
            <div class="recent-file-item" onclick="uiManager.loadRecentFile('${file.path}')">
                <div class="file-name">${file.name}</div>
                <div class="file-date">${new Date(file.timestamp).toLocaleDateString()}</div>
            </div>
        `).join('');

        this.createModal('Recent Configuration Files', `
            <div class="recent-files">
                ${menuItems}
            </div>
        `, [
            {
                text: 'Close',
                class: 'btn-secondary',
                onclick: () => this.closeModal()
            }
        ]);
    }

    // Load recent file
    async loadRecentFile(filePath) {
        try {
            await this.configManager.loadConfigurationFromPath(filePath);
            this.closeModal();
        } catch (error) {
            console.error('Failed to load recent file:', error);
            this.showToast(`Failed to load file: ${error.message}`, 'error');
        }
    }

    // Update recent files menu
    updateRecentFilesMenu(files) {
        const recentBtn = document.getElementById('recentFilesBtn');
        if (recentBtn && files.length > 0) {
            recentBtn.textContent = `Recent (${files.length})`;
        }
    }

    // Create new configuration
    createNewConfiguration() {
        if (this.configManager.isDirty) {
            const confirmed = confirm('You have unsaved changes. Create new configuration anyway?');
            if (!confirmed) return;
        }

        this.configManager.createDefaultConfiguration();
        this.showToast('New configuration created', 'success');
    }

    // Handle configuration loaded
    onConfigLoaded(data) {
        // Update form fields with loaded configuration
        this.populateFormFields(data.config);
        
        // Update UI state
        const fileName = data.filePath ? data.filePath.split('/').pop() : 'New Configuration';
        this.showToast(`Configuration loaded: ${fileName}`, 'success');
        
        // Update page title
        document.title = `Cordova App Generator - ${fileName}`;
    }

    // Populate form fields with configuration data
    populateFormFields(config) {
        if (!config) return;

        // Authentication fields with special token handling
        const githubTokenInput = document.getElementById('githubToken');
        const codemagicTokenInput = document.getElementById('codemagicApiToken');

        if (githubTokenInput && config.authentication?.github?.token) {
            const token = config.authentication.github.token;
            if (githubTokenInput._setActualValue) {
                githubTokenInput._setActualValue(token);
            } else {
                githubTokenInput.value = token;
            }
        }

        if (codemagicTokenInput && config.authentication?.codemagic?.token) {
            const token = config.authentication.codemagic.token;
            if (codemagicTokenInput._setActualValue) {
                codemagicTokenInput._setActualValue(token);
            } else {
                codemagicTokenInput.value = token;
            }
        }

        this.setFieldValue('githubUsername', config.authentication?.github?.username);
        this.setFieldValue('codemagicTeamId', config.authentication?.codemagic?.teamId);

        // Settings fields
        this.setFieldValue('packagePrefix', config.settings?.packagePrefix);
        this.setFieldValue('authorName', config.settings?.authorName);
        this.setFieldValue('authorEmail', config.settings?.authorEmail);
        this.setFieldValue('outputDirectory', config.settings?.outputDirectory);
        this.setFieldValue('androidMinSdk', config.settings?.androidMinSdk);
        this.setFieldValue('codemagicWorkflowId', config.settings?.codemagicWorkflowId);
        this.setFieldValue('codemagicBranch', config.settings?.codemagicBranch);
        this.setFieldValue('codemagicConfig', config.settings?.codemagicConfig);

        // Checkbox fields
        this.setCheckboxValue('enableBuildPreparation', config.settings?.enableBuildPreparation);
        this.setCheckboxValue('enableGitInit', config.settings?.enableGitInit);
        this.setCheckboxValue('enableCodemagicIntegration', config.settings?.enableCodemagicIntegration);
        this.setCheckboxValue('autoSaveToggle', config.ui?.preferences?.autoSave);
    }

    // Set field value helper
    setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field && value !== undefined && value !== null) {
            field.value = value;
        }
    }

    // Set checkbox value helper
    setCheckboxValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field && typeof value === 'boolean') {
            field.checked = value;
        }
    }

    // Update authentication status display
    updateAuthStatus(service, data) {
        console.log(`🔄 Updating ${service} auth status:`, data.status, data.message);

        const statusElement = document.getElementById(`${service}Status`);
        if (!statusElement) {
            console.warn(`❌ Status element not found: ${service}Status`);
            return;
        }

        const indicator = statusElement.querySelector('.status-indicator');
        if (!indicator) {
            console.warn(`❌ Status indicator not found in ${service}Status`);
            return;
        }

        // Update status class
        indicator.className = `status-indicator status-${data.status}`;

        // Update icon and text
        const icons = {
            connected: 'fas fa-check-circle',
            disconnected: 'fas fa-times-circle',
            testing: 'fas fa-spinner fa-spin',
            error: 'fas fa-exclamation-triangle',
            'rate-limited': 'fas fa-clock'
        };

        const texts = {
            connected: 'Connected',
            disconnected: 'Not Connected',
            testing: 'Testing...',
            error: 'Error',
            'rate-limited': 'Rate Limited'
        };

        const icon = icons[data.status] || icons.disconnected;
        const text = texts[data.status] || 'Unknown';

        indicator.innerHTML = `<i class="${icon}"></i> ${text}`;

        // Update tooltip
        if (data.message) {
            indicator.title = data.message;
        }

        // Show last validated time for connected status
        if (data.status === 'connected' && data.state?.lastValidated) {
            const lastValidated = new Date(data.state.lastValidated).toLocaleString();
            indicator.title = `${data.message || 'Connected'} (Last validated: ${lastValidated})`;
        }

        console.log(`✅ ${service} status updated to: ${data.status}`);
    }

    // Create modal dialog
    createModal(title, content, buttons = []) {
        // Remove existing modal
        this.closeModal();

        const modal = document.createElement('div');
        modal.id = 'ui-modal';
        modal.className = 'ui-modal';
        
        const buttonsHtml = buttons.map(btn => 
            `<button class="btn ${btn.class}" onclick="${btn.onclick ? 'this.clickHandler()' : 'uiManager.closeModal()'}">${btn.text}</button>`
        ).join('');

        modal.innerHTML = `
            <div class="modal-backdrop" onclick="uiManager.closeModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-btn" onclick="uiManager.closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    ${buttonsHtml}
                </div>
            </div>
        `;

        // Add click handlers to buttons
        buttons.forEach((btn, index) => {
            if (btn.onclick) {
                const button = modal.querySelectorAll('.modal-footer .btn')[index];
                if (button) {
                    button.clickHandler = btn.onclick;
                }
            }
        });

        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        document.body.appendChild(modal);
        return modal;
    }

    // Close modal dialog
    closeModal() {
        const modal = document.getElementById('ui-modal');
        if (modal) {
            modal.remove();
        }
    }

    // Cleanup
    destroy() {
        this.toastQueue = [];
        this.isProcessingToasts = false;
        
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) {
            toastContainer.remove();
        }
        
        const modal = document.getElementById('ui-modal');
        if (modal) {
            modal.remove();
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.EnhancedUIManager = EnhancedUIManager;
}
