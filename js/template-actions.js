/**
 * Template Action Manager
 * Handles all template card button actions with comprehensive error handling
 */

class TemplateActionManager {
    constructor(configManager, authManager) {
        this.configManager = configManager;
        this.authManager = authManager;
        this.eventListeners = new Map();
        this.activeOperations = new Map();
        
        this.init();
    }

    // Initialize template action manager
    init() {
        console.log('✅ Template Action Manager initialized');
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
                    console.error('Template action event callback error:', error);
                }
            });
        }
    }

    // Make repository private
    async makeRepositoryPrivate(templateId) {
        const operationId = `make-private-${templateId}`;
        
        try {
            // Check if operation is already in progress
            if (this.activeOperations.has(operationId)) {
                this.showToast('Operation already in progress', 'warning');
                return;
            }

            // Get template data
            const template = this.getTemplate(templateId);
            if (!template || !template.hasGitHubRepo) {
                throw new Error('Template or repository not found');
            }

            // Check GitHub authentication
            const githubAuth = this.authManager.getAuthStatus('github');
            if (!githubAuth.isAuthenticated) {
                throw new Error('GitHub authentication required. Please authenticate first.');
            }

            // Show confirmation dialog
            const confirmed = await this.showConfirmDialog(
                'Make Repository Private',
                `Are you sure you want to make "${template.name}" repository private? This action cannot be undone.`,
                'Make Private',
                'warning'
            );

            if (!confirmed) return;

            // Start operation
            this.activeOperations.set(operationId, true);
            this.emit('operation:start', { type: 'make-private', templateId });
            this.showToast(`Making ${template.name} repository private...`, 'info');

            // Get GitHub token
            const config = this.configManager.getConfig();
            const githubToken = config.authentication.github.token;
            const githubUsername = config.authentication.github.username;

            // Make API call to update repository
            const response = await fetch(`https://api.github.com/repos/${githubUsername}/${template.githubRepo.name}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    private: true
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `GitHub API error: ${response.status} ${response.statusText}`);
            }

            await response.json(); // Repository updated successfully

            // Update template data
            template.repoStatus.isPrivate = true;
            template.githubRepo.private = true;

            this.emit('template:updated', { templateId, template });
            this.emit('operation:success', { type: 'make-private', templateId });
            this.showToast(`Repository ${template.name} is now private`, 'success');

        } catch (error) {
            console.error('Failed to make repository private:', error);
            this.emit('operation:error', { type: 'make-private', templateId, error: error.message });
            this.showToast(`Failed to make repository private: ${error.message}`, 'error');
        } finally {
            this.activeOperations.delete(operationId);
        }
    }

    // Publish app using Codemagic
    async publishApp(templateId) {
        const operationId = `publish-${templateId}`;
        
        try {
            // Check if operation is already in progress
            if (this.activeOperations.has(operationId)) {
                this.showToast('Build already in progress', 'warning');
                return;
            }

            // Get template data
            const template = this.getTemplate(templateId);
            if (!template) {
                throw new Error('Template not found');
            }

            if (!template.hasGitHubRepo) {
                throw new Error('Repository required for publishing. Create a repository first.');
            }

            // Check Codemagic authentication
            const codemagicAuth = this.authManager.getAuthStatus('codemagic');
            if (!codemagicAuth.isAuthenticated) {
                throw new Error('Codemagic authentication required. Please authenticate first.');
            }

            // Start operation
            this.activeOperations.set(operationId, true);
            this.emit('operation:start', { type: 'publish', templateId });
            
            // Show build progress modal
            this.showBuildProgressModal(templateId);

            // Get configuration
            const config = this.configManager.getConfig();
            const codemagicToken = config.authentication.codemagic.token;
            const workflowId = config.settings.codemagicWorkflowId || 'cordova_android_build';
            const branch = config.settings.codemagicBranch || 'main';

            // First, create or get Codemagic application
            const app = await this.getOrCreateCodemagicApp(template, codemagicToken);
            
            // Trigger build
            const buildResponse = await fetch(`https://api.codemagic.io/builds`, {
                method: 'POST',
                headers: {
                    'x-auth-token': codemagicToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    appId: app.id,
                    workflowId: workflowId,
                    branch: branch,
                    environment: {
                        variables: {
                            APP_NAME: template.displayName || template.name,
                            PACKAGE_NAME: `${config.settings.packagePrefix}.${template.name.toLowerCase().replace(/\s+/g, '')}`
                        }
                    }
                })
            });

            if (!buildResponse.ok) {
                const errorData = await buildResponse.json().catch(() => ({}));
                throw new Error(errorData.message || `Codemagic API error: ${buildResponse.status} ${buildResponse.statusText}`);
            }

            const buildData = await buildResponse.json();

            this.emit('operation:success', { type: 'publish', templateId, buildData });
            this.showToast(`Build triggered for ${template.name}! Build ID: ${buildData.build.id}`, 'success');

            // Update build progress modal with build URL
            this.updateBuildProgressModal(templateId, buildData);

        } catch (error) {
            console.error('Failed to publish app:', error);
            this.emit('operation:error', { type: 'publish', templateId, error: error.message });
            this.showToast(`Failed to publish app: ${error.message}`, 'error');
            this.closeBuildProgressModal(templateId);
        } finally {
            this.activeOperations.delete(operationId);
        }
    }

    // Get or create Codemagic application
    async getOrCreateCodemagicApp(template, codemagicToken) {
        // First, try to find existing app
        const appsResponse = await fetch('https://api.codemagic.io/apps', {
            headers: {
                'x-auth-token': codemagicToken,
                'Content-Type': 'application/json'
            }
        });

        if (!appsResponse.ok) {
            throw new Error(`Failed to fetch Codemagic apps: ${appsResponse.status}`);
        }

        const appsData = await appsResponse.json();
        const existingApp = appsData.applications.find(app => 
            app.repository && app.repository.includes(template.githubRepo.name)
        );

        if (existingApp) {
            return existingApp;
        }

        // Create new app
        const createResponse = await fetch('https://api.codemagic.io/apps', {
            method: 'POST',
            headers: {
                'x-auth-token': codemagicToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                repository: template.repoStatus.cloneUrl,
                appName: template.displayName || template.name
            })
        });

        if (!createResponse.ok) {
            const errorData = await createResponse.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to create Codemagic app: ${createResponse.status}`);
        }

        return await createResponse.json();
    }

    // View repository on GitHub
    viewRepository(templateId) {
        try {
            const template = this.getTemplate(templateId);
            if (!template || !template.hasGitHubRepo) {
                throw new Error('Repository not found');
            }

            const url = template.repoStatus.url;
            if (!url) {
                throw new Error('Repository URL not available');
            }

            // Open in new tab
            const newWindow = window.open(url, '_blank');
            if (!newWindow) {
                throw new Error('Failed to open repository. Please check your popup blocker settings.');
            }

            this.emit('operation:success', { type: 'view-repo', templateId });
            this.showToast(`Opened repository for ${template.name}`, 'success');

        } catch (error) {
            console.error('Failed to view repository:', error);
            this.emit('operation:error', { type: 'view-repo', templateId, error: error.message });
            this.showToast(`Failed to view repository: ${error.message}`, 'error');
        }
    }

    // Create GitHub repository for template
    async createRepository(templateId) {
        const operationId = `create-repo-${templateId}`;
        
        try {
            // Check if operation is already in progress
            if (this.activeOperations.has(operationId)) {
                this.showToast('Repository creation already in progress', 'warning');
                return;
            }

            // Get template data
            const template = this.getTemplate(templateId);
            if (!template) {
                throw new Error('Template not found');
            }

            if (template.hasGitHubRepo) {
                throw new Error('Repository already exists for this template');
            }

            // Check GitHub authentication
            const githubAuth = this.authManager.getAuthStatus('github');
            if (!githubAuth.isAuthenticated) {
                throw new Error('GitHub authentication required. Please authenticate first.');
            }

            // Start operation
            this.activeOperations.set(operationId, true);
            this.emit('operation:start', { type: 'create-repo', templateId });
            this.showToast(`Creating repository for ${template.name}...`, 'info');

            // Get configuration
            const config = this.configManager.getConfig();
            const githubToken = config.authentication.github.token;

            // Generate repository name using intelligent naming
            const repoName = this.generateRepositoryName(template.name);

            // Create repository
            const response = await fetch('https://api.github.com/user/repos', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: repoName,
                    description: template.description || `Cordova app: ${template.displayName || template.name}`,
                    private: false,
                    auto_init: true,
                    gitignore_template: 'Node'
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `GitHub API error: ${response.status} ${response.statusText}`);
            }

            const repoData = await response.json();

            // Update template data
            template.hasGitHubRepo = true;
            template.githubRepo = repoData;
            template.repoStatus = {
                isPrivate: repoData.private,
                url: repoData.html_url,
                cloneUrl: repoData.clone_url,
                updatedAt: repoData.updated_at,
                stars: repoData.stargazers_count,
                forks: repoData.forks_count
            };

            this.emit('template:updated', { templateId, template });
            this.emit('operation:success', { type: 'create-repo', templateId, repoData });
            this.showToast(`Repository created successfully: ${repoData.name}`, 'success');

            // Optionally generate and push app files
            if (window.generator && typeof window.generator.generateSingleApp === 'function') {
                this.showToast('Generating app files and pushing to repository...', 'info');
                try {
                    await this.generateAndPushAppFiles(template, repoData);
                    this.showToast('App files generated and pushed successfully', 'success');
                } catch (error) {
                    console.warn('Failed to generate/push app files:', error);
                    this.showToast('Repository created, but failed to push app files', 'warning');
                }
            }

        } catch (error) {
            console.error('Failed to create repository:', error);
            this.emit('operation:error', { type: 'create-repo', templateId, error: error.message });
            this.showToast(`Failed to create repository: ${error.message}`, 'error');
        } finally {
            this.activeOperations.delete(operationId);
        }
    }

    // Generate repository name from template name
    generateRepositoryName(templateName) {
        // Remove special characters and convert to PascalCase
        return templateName
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
    }

    // Generate and push app files to repository
    async generateAndPushAppFiles(template, repoData) {
        // This would integrate with the app generator to create files
        // For now, we'll just log the intention
        console.log('Would generate and push app files for:', template.name, 'to:', repoData.clone_url);
        
        // In a real implementation, this would:
        // 1. Generate the Cordova app files using the template
        // 2. Create a temporary local repository
        // 3. Add the generated files
        // 4. Commit and push to the GitHub repository
    }

    // Edit template
    editTemplate(templateId) {
        try {
            const template = this.getTemplate(templateId);
            if (!template) {
                throw new Error('Template not found');
            }

            this.emit('template:edit', { templateId, template });
            
            // Show template editor modal
            if (window.ui && window.ui.showTemplateEditor) {
                window.ui.showTemplateEditor(templateId);
            } else {
                this.showToast('Template editor not available', 'warning');
            }

        } catch (error) {
            console.error('Failed to edit template:', error);
            this.showToast(`Failed to edit template: ${error.message}`, 'error');
        }
    }

    // Select template for generation
    selectTemplate(templateId) {
        try {
            const template = this.getTemplate(templateId);
            if (!template) {
                throw new Error('Template not found');
            }

            // Add to selected templates in configuration
            const config = this.configManager.getConfig();
            const selectedTemplates = config.ui.selectedTemplates || [];

            if (selectedTemplates.includes(templateId)) {
                // Template already selected - remove it (toggle behavior)
                const index = selectedTemplates.indexOf(templateId);
                selectedTemplates.splice(index, 1);
                this.configManager.updateConfig('ui.selectedTemplates', selectedTemplates);

                this.emit('template:deselected', { templateId, template });
                this.showToast(`Removed ${template.name} from generation queue`, 'info');

                // Update button visual state
                this.updateSelectButtonState(templateId, false);
            } else {
                // Add template to selection
                selectedTemplates.push(templateId);
                this.configManager.updateConfig('ui.selectedTemplates', selectedTemplates);

                this.emit('template:selected', { templateId, template });
                this.showToast(`Added ${template.name} to generation queue`, 'success');

                // Update button visual state
                this.updateSelectButtonState(templateId, true);
            }

            // Update UI counters
            this.updateSelectedTemplatesUI(selectedTemplates);

            // Update preview section
            this.updatePreviewSection(selectedTemplates);

            console.log(`📋 Selected templates: ${selectedTemplates.length}`, selectedTemplates);

        } catch (error) {
            console.error('Failed to select template:', error);
            this.showToast(`Failed to select template: ${error.message}`, 'error');
        }
    }

    // Update select button visual state
    updateSelectButtonState(templateId, isSelected) {
        const templateCard = document.querySelector(`[data-template-id="${templateId}"]`);
        if (!templateCard) return;

        const selectButton = templateCard.querySelector('button[onclick*="selectTemplate"]');
        if (!selectButton) return;

        if (isSelected) {
            selectButton.classList.remove('btn-outline');
            selectButton.classList.add('btn-success');
            selectButton.innerHTML = '<i class="fas fa-check"></i> Selected';
            selectButton.title = 'Remove from generation queue';
            templateCard.classList.add('template-selected');
        } else {
            selectButton.classList.remove('btn-success');
            selectButton.classList.add('btn-outline');
            selectButton.innerHTML = '<i class="fas fa-plus"></i> Select';
            selectButton.title = 'Add to generation queue';
            templateCard.classList.remove('template-selected');
        }
    }

    // Update selected templates UI
    updateSelectedTemplatesUI(selectedTemplates) {
        // Update header counter if it exists
        const counterElement = document.getElementById('selectedTemplatesCount');
        if (counterElement) {
            counterElement.textContent = selectedTemplates.length;
            counterElement.style.display = selectedTemplates.length > 0 ? 'inline' : 'none';
        }

        // Update generate all button state
        const generateAllBtn = document.getElementById('generateAllBtn');
        if (generateAllBtn) {
            if (selectedTemplates.length > 0) {
                generateAllBtn.disabled = false;
                generateAllBtn.innerHTML = `<i class="fas fa-rocket"></i> Generate ${selectedTemplates.length} Apps`;
                generateAllBtn.title = `Generate ${selectedTemplates.length} selected templates`;
            } else {
                generateAllBtn.disabled = true;
                generateAllBtn.innerHTML = '<i class="fas fa-rocket"></i> Generate All Apps';
                generateAllBtn.title = 'Select templates to generate';
            }
        }

        // Update all template cards to reflect current selection state
        selectedTemplates.forEach(templateId => {
            this.updateSelectButtonState(templateId, true);
        });
    }

    // Update preview section with selected templates
    updatePreviewSection(selectedTemplates) {
        const selectedCount = selectedTemplates.length;
        const estimatedTime = this.calculateEstimatedTime(selectedTemplates);

        // Update stats
        const selectedCountElement = document.getElementById('selectedCount');
        const estimatedTimeElement = document.getElementById('estimatedTime');

        if (selectedCountElement) {
            selectedCountElement.textContent = selectedCount;
        }

        if (estimatedTimeElement) {
            estimatedTimeElement.textContent = `${estimatedTime} min`;
        }

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
            const templates = selectedTemplates.map(templateId =>
                this.getTemplate(templateId)
            ).filter(Boolean);

            previewList.innerHTML = templates.map(template => {
                return `
                <div class="preview-item" data-template-id="${template.id}">
                    <div class="preview-icon" style="background-color: ${template.color || '#4A90E2'}">
                        ${template.icon || '📱'}
                    </div>
                    <div class="preview-info">
                        <h4>${template.displayName || template.name}</h4>
                        <p>${template.description || 'No description available'}</p>
                        <div class="preview-meta">
                            <span class="meta-item">
                                <i class="fas fa-tag"></i>
                                ${template.category || 'General'}
                            </span>
                            ${template.hasGitHubRepo ? `
                                <span class="meta-item">
                                    <i class="fab fa-github"></i>
                                    ${template.repoStatus?.statusText || 'Repository'}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="preview-actions">
                        <button class="btn btn-sm btn-info" onclick="templateActions.showTemplateDetailsModal('${template.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="templateActions.removeFromPreview('${template.id}')" title="Remove from selection">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                `;
            }).join('');
        }

        console.log(`📋 Preview updated: ${selectedCount} templates selected`);
    }

    // Calculate estimated time for selected templates
    calculateEstimatedTime(selectedTemplates) {
        const templates = selectedTemplates.map(templateId =>
            this.getTemplate(templateId)
        ).filter(Boolean);

        return templates.reduce((total, template) => {
            // Base time per template + plugin time
            const baseTime = 3; // 3 minutes base
            const pluginTime = (template.plugins?.length || 0) * 0.5; // 30 seconds per plugin
            return total + baseTime + pluginTime;
        }, 0);
    }

    // Remove template from preview (called from preview section)
    removeFromPreview(templateId) {
        const config = this.configManager?.getConfig();
        const selectedTemplates = config?.ui?.selectedTemplates || [];

        const index = selectedTemplates.indexOf(templateId);
        if (index > -1) {
            selectedTemplates.splice(index, 1);
            this.configManager.updateConfig('ui.selectedTemplates', selectedTemplates);

            // Update button state
            this.updateSelectButtonState(templateId, false);

            // Update UI
            this.updateSelectedTemplatesUI(selectedTemplates);
            this.updatePreviewSection(selectedTemplates);

            const template = this.getTemplate(templateId);
            this.showToast(`Removed ${template?.name || 'template'} from generation queue`, 'info');
        }
    }

    // Get template by ID
    getTemplate(templateId) {
        if (window.appManager && window.appManager.templates) {
            return window.appManager.templates.find(t => t.id === templateId);
        } else if (window.templatesManager) {
            return window.templatesManager.getTemplate(templateId);
        }
        return null;
    }

    // Show confirmation dialog
    async showConfirmDialog(title, message, confirmText = 'Confirm', type = 'info') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'confirmation-modal';
            modal.innerHTML = `
                <div class="modal-backdrop"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
                        <button class="btn btn-${type === 'warning' ? 'warning' : 'primary'}" id="confirmBtn">${confirmText}</button>
                    </div>
                </div>
            `;

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

            const confirmBtn = modal.querySelector('#confirmBtn');
            const cancelBtn = modal.querySelector('#cancelBtn');

            confirmBtn.onclick = () => {
                document.body.removeChild(modal);
                resolve(true);
            };

            cancelBtn.onclick = () => {
                document.body.removeChild(modal);
                resolve(false);
            };

            // Close on backdrop click
            modal.querySelector('.modal-backdrop').onclick = () => {
                document.body.removeChild(modal);
                resolve(false);
            };
        });
    }

    // Show build progress modal
    showBuildProgressModal(templateId) {
        const template = this.getTemplate(templateId);
        const modal = document.createElement('div');
        modal.id = `build-progress-${templateId}`;
        modal.className = 'build-progress-modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Building ${template.name}</h3>
                    <button class="close-btn" onclick="this.closest('.build-progress-modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="build-status">
                        <div class="spinner"></div>
                        <p>Triggering build...</p>
                    </div>
                    <div class="build-details" style="display: none;">
                        <p><strong>Build ID:</strong> <span class="build-id">-</span></p>
                        <p><strong>Status:</strong> <span class="build-status-text">Starting</span></p>
                        <div class="build-actions" style="margin-top: 1rem;">
                            <button class="btn btn-primary" onclick="window.open(this.dataset.url, '_blank')" style="display: none;">View Build</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

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
    }

    // Update build progress modal
    updateBuildProgressModal(templateId, buildData) {
        const modal = document.getElementById(`build-progress-${templateId}`);
        if (!modal) return;

        const buildId = modal.querySelector('.build-id');
        const statusText = modal.querySelector('.build-status-text');
        const buildDetails = modal.querySelector('.build-details');
        const buildActions = modal.querySelector('.build-actions button');
        const spinner = modal.querySelector('.spinner');

        if (buildId) buildId.textContent = buildData.build.id;
        if (statusText) statusText.textContent = buildData.build.status || 'Started';
        if (buildDetails) buildDetails.style.display = 'block';
        if (spinner) spinner.style.display = 'none';

        if (buildActions && buildData.build.url) {
            buildActions.dataset.url = buildData.build.url;
            buildActions.style.display = 'inline-block';
        }
    }

    // Close build progress modal
    closeBuildProgressModal(templateId) {
        const modal = document.getElementById(`build-progress-${templateId}`);
        if (modal) {
            modal.remove();
        }
    }

    // Toast notification helper
    showToast(message, type = 'info', duration = 5000) {
        if (window.app && window.app.showToast) {
            window.app.showToast(message, type, duration);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // Show detailed template information modal
    showTemplateDetailsModal(templateId) {
        try {
            const template = this.getTemplate(templateId);
            if (!template) {
                throw new Error('Template not found');
            }

            console.log('📋 Showing template details modal for:', template.name);

            // Create modal content
            const modalContent = this.createTemplateDetailsContent(template);

            // Show modal using UI manager
            if (window.uiManager) {
                const modal = window.uiManager.createModal(
                    `${template.displayName || template.name} - Details`,
                    modalContent,
                    [
                        {
                            text: 'Close',
                            class: 'btn-secondary',
                            onclick: () => window.uiManager.closeModal()
                        }
                    ]
                );

                // Add custom styling for template details modal
                modal.classList.add('template-details-modal');

                // Initialize image generation after modal is shown
                setTimeout(() => {
                    this.initializeImageGeneration(template);
                }, 100);

            } else {
                // Fallback if UI manager not available
                this.showFallbackTemplateDetails(template);
            }

        } catch (error) {
            console.error('Failed to show template details:', error);
            this.showToast(`Failed to show template details: ${error.message}`, 'error');
        }
    }

    // Create template details modal content
    createTemplateDetailsContent(template) {
        const repoInfo = this.createRepositoryInfoSection(template);
        const imageSection = this.createImageGenerationSection(template);

        return `
            <div class="template-details-container">
                <!-- App Information Section -->
                <div class="app-info-section">
                    <div class="app-header">
                        <div class="app-icon">
                            ${template.icon ? `<img src="${template.icon}" alt="${template.name}" />` :
                              `<div class="default-icon">${(template.name.charAt(0) || 'A').toUpperCase()}</div>`}
                        </div>
                        <div class="app-title-info">
                            <h2 class="app-title">${template.displayName || template.name}</h2>
                            <p class="app-subtitle">${template.category || 'Mobile Application'}</p>
                            <div class="app-tags">
                                ${this.createTagsHtml(template)}
                            </div>
                        </div>
                    </div>

                    <div class="app-description">
                        <h3>Description</h3>
                        <p>${template.description || 'No description available for this template.'}</p>
                    </div>

                    <div class="app-metadata">
                        <div class="metadata-grid">
                            <div class="metadata-item">
                                <label>Template ID:</label>
                                <span>${template.id}</span>
                            </div>
                            <div class="metadata-item">
                                <label>Category:</label>
                                <span>${template.category || 'General'}</span>
                            </div>
                            <div class="metadata-item">
                                <label>Author:</label>
                                <span>${template.author || 'LinhFish Development Team'}</span>
                            </div>
                            <div class="metadata-item">
                                <label>Last Updated:</label>
                                <span>${this.formatDate(template.lastUpdated || template.repoStatus?.updatedAt)}</span>
                            </div>
                        </div>
                    </div>

                    ${repoInfo}
                </div>

                <!-- Visual Assets Section -->
                <div class="visual-assets-section">
                    <h3>Visual Assets & Screenshots</h3>
                    <p class="assets-description">Generate app store ready images from your template screenshot</p>
                    ${imageSection}
                </div>
            </div>
        `;
    }

    // Create repository information section
    createRepositoryInfoSection(template) {
        if (!template.hasGitHubRepo || !template.repoStatus) {
            return `
                <div class="repo-info-section">
                    <h3>Repository Information</h3>
                    <div class="no-repo-info">
                        <i class="fas fa-info-circle"></i>
                        <span>No GitHub repository associated with this template</span>
                        <button class="btn btn-sm btn-primary" onclick="templateActions.createRepository('${template.id}')">
                            <i class="fab fa-github"></i> Create Repository
                        </button>
                    </div>
                </div>
            `;
        }

        const repoStatus = template.repoStatus;
        return `
            <div class="repo-info-section">
                <h3>Repository Information</h3>
                <div class="repo-details">
                    <div class="repo-status">
                        <span class="status-badge ${repoStatus.statusClass}">
                            ${repoStatus.statusIcon} ${repoStatus.statusText}
                        </span>
                    </div>
                    <div class="repo-stats-grid">
                        <div class="repo-stat">
                            <i class="fas fa-star"></i>
                            <span>${repoStatus.stars || 0} Stars</span>
                        </div>
                        <div class="repo-stat">
                            <i class="fas fa-code-branch"></i>
                            <span>${repoStatus.forks || 0} Forks</span>
                        </div>
                        <div class="repo-stat">
                            <i class="fas fa-code"></i>
                            <span>${repoStatus.language || 'JavaScript'}</span>
                        </div>
                        <div class="repo-stat">
                            <i class="fas fa-database"></i>
                            <span>${this.formatFileSize(repoStatus.size)}</span>
                        </div>
                    </div>
                    <div class="repo-actions">
                        <a href="${repoStatus.url}" target="_blank" class="btn btn-sm btn-outline">
                            <i class="fab fa-github"></i> View on GitHub
                        </a>
                        <button class="btn btn-sm btn-info" onclick="navigator.clipboard.writeText('${repoStatus.cloneUrl}')">
                            <i class="fas fa-copy"></i> Copy Clone URL
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Create image generation section
    createImageGenerationSection(template) {
        return `
            <div class="image-generation-container">
                <div class="screenshot-upload">
                    <div class="upload-area" id="screenshotUpload-${template.id}">
                        <div class="upload-placeholder">
                            <i class="fas fa-magic"></i>
                            <h4>Automatic Screenshot Generation</h4>
                            <p>We'll automatically generate app screenshots for you</p>
                            <p class="upload-hint">Or drop your own image here to override</p>
                            <input type="file" id="screenshotInput-${template.id}" accept="image/*" style="display: none;">
                            <button class="btn btn-outline" onclick="document.getElementById('screenshotInput-${template.id}').click()">
                                <i class="fas fa-upload"></i> Upload Custom Image
                            </button>
                        </div>
                    </div>
                </div>

                <div class="generated-images" id="generatedImages-${template.id}" style="display: none;">
                    <h4>Generated Images</h4>
                    <div class="images-grid">
                        <div class="image-item">
                            <div class="image-preview" id="preview-512-${template.id}"></div>
                            <div class="image-info">
                                <span class="image-label">App Store Icon</span>
                                <span class="image-size">512x512</span>
                                <button class="btn btn-sm btn-outline download-btn" data-size="512" data-template="${template.id}">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                        </div>
                        <div class="image-item">
                            <div class="image-preview" id="preview-114-${template.id}"></div>
                            <div class="image-info">
                                <span class="image-label">Small App Icon</span>
                                <span class="image-size">114x114</span>
                                <button class="btn btn-sm btn-outline download-btn" data-size="114" data-template="${template.id}">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                        </div>
                        <div class="image-item feature-graphic">
                            <div class="image-preview" id="preview-1280-1-${template.id}"></div>
                            <div class="image-info">
                                <span class="image-label">Feature Graphic 1</span>
                                <span class="image-size">1280x800</span>
                                <button class="btn btn-sm btn-outline download-btn" data-size="1280-1" data-template="${template.id}">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                        </div>
                        <div class="image-item feature-graphic">
                            <div class="image-preview" id="preview-1280-2-${template.id}"></div>
                            <div class="image-info">
                                <span class="image-label">Feature Graphic 2</span>
                                <span class="image-size">1280x800</span>
                                <button class="btn btn-sm btn-outline download-btn" data-size="1280-2" data-template="${template.id}">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                        </div>
                        <div class="image-item feature-graphic">
                            <div class="image-preview" id="preview-1280-3-${template.id}"></div>
                            <div class="image-info">
                                <span class="image-label">Feature Graphic 3</span>
                                <span class="image-size">1280x800</span>
                                <button class="btn btn-sm btn-outline download-btn" data-size="1280-3" data-template="${template.id}">
                                    <i class="fas fa-download"></i> Download
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="batch-download">
                        <button class="btn btn-success" id="downloadAll-${template.id}">
                            <i class="fas fa-download"></i> Download All Images
                        </button>
                    </div>
                </div>

                <div class="generation-progress" id="generationProgress-${template.id}" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill-${template.id}"></div>
                    </div>
                    <p class="progress-text" id="progressText-${template.id}">Generating images...</p>
                </div>
            </div>
        `;
    }

    // Create tags HTML
    createTagsHtml(template) {
        const tags = [];

        if (template.category) tags.push(template.category);
        if (template.hasGitHubRepo) tags.push('GitHub');
        if (template.repoStatus?.status === 'public') tags.push('Public');
        if (template.repoStatus?.status === 'private') tags.push('Private');
        if (template.plugins && template.plugins.length > 0) {
            tags.push(`${template.plugins.length} Plugins`);
        }

        return tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    }

    // Format file size
    formatFileSize(sizeInKB) {
        if (!sizeInKB) return 'Unknown';

        if (sizeInKB < 1024) {
            return `${sizeInKB} KB`;
        } else if (sizeInKB < 1024 * 1024) {
            return `${(sizeInKB / 1024).toFixed(1)} MB`;
        } else {
            return `${(sizeInKB / (1024 * 1024)).toFixed(1)} GB`;
        }
    }

    // Format date
    formatDate(dateString) {
        if (!dateString) return 'Unknown';

        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Invalid date';
        }
    }

    // Initialize image generation functionality
    initializeImageGeneration(template) {
        const fileInput = document.getElementById(`screenshotInput-${template.id}`);
        const uploadArea = document.getElementById(`screenshotUpload-${template.id}`);

        if (!fileInput || !uploadArea) return;

        // Try to automatically generate screenshot first
        this.generateAutomaticScreenshot(template);

        // File input change handler
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.processScreenshot(template.id, file);
            }
        });

        // Drag and drop handlers
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                this.processScreenshot(template.id, files[0]);
            }
        });

        // Download button handlers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('download-btn')) {
                const size = e.target.dataset.size;
                const templateId = e.target.dataset.template;
                this.downloadGeneratedImage(templateId, size);
            }
        });

        // Download all button handler
        const downloadAllBtn = document.getElementById(`downloadAll-${template.id}`);
        if (downloadAllBtn) {
            downloadAllBtn.addEventListener('click', () => {
                this.downloadAllImages(template.id);
            });
        }
    }

    // Process uploaded screenshot
    async processScreenshot(templateId, file) {
        try {
            console.log('🖼️ Processing screenshot for template:', templateId);

            // Show progress
            this.showGenerationProgress(templateId, 0, 'Loading image...');

            // Create image element
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = async () => {
                try {
                    // Store original image data
                    this.originalImages = this.originalImages || {};
                    this.originalImages[templateId] = { img, canvas, ctx };

                    // Generate all required sizes
                    await this.generateAllImageSizes(templateId, img, canvas, ctx);

                } catch (error) {
                    console.error('Failed to process image:', error);
                    this.showToast('Failed to process image', 'error');
                    this.hideGenerationProgress(templateId);
                }
            };

            img.onerror = () => {
                this.showToast('Failed to load image', 'error');
                this.hideGenerationProgress(templateId);
            };

            // Load image
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);

        } catch (error) {
            console.error('Failed to process screenshot:', error);
            this.showToast('Failed to process screenshot', 'error');
            this.hideGenerationProgress(templateId);
        }
    }

    // Cleanup
    destroy() {
        this.eventListeners.clear();
        this.activeOperations.clear();

        // Cleanup image data
        if (this.originalImages) {
            Object.keys(this.originalImages).forEach(templateId => {
                const data = this.originalImages[templateId];
                if (data.canvas) {
                    data.canvas.remove();
                }
            });
            this.originalImages = {};
        }
    }

    // Generate all required image sizes
    async generateAllImageSizes(templateId, img, canvas, ctx) {
        const sizes = [
            { id: '512', width: 512, height: 512, label: 'App Store Icon' },
            { id: '114', width: 114, height: 114, label: 'Small App Icon' },
            { id: '1280-1', width: 1280, height: 800, label: 'Feature Graphic 1' },
            { id: '1280-2', width: 1280, height: 800, label: 'Feature Graphic 2' },
            { id: '1280-3', width: 1280, height: 800, label: 'Feature Graphic 3' }
        ];

        this.generatedImages = this.generatedImages || {};
        this.generatedImages[templateId] = {};

        for (let i = 0; i < sizes.length; i++) {
            const size = sizes[i];
            const progress = ((i + 1) / sizes.length) * 100;

            this.showGenerationProgress(templateId, progress, `Generating ${size.label}...`);

            // Generate image
            const imageData = await this.generateImageSize(img, canvas, ctx, size);
            this.generatedImages[templateId][size.id] = imageData;

            // Update preview
            this.updateImagePreview(templateId, size.id, imageData);

            // Small delay for smooth progress
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Show generated images section
        this.showGeneratedImages(templateId);
        this.hideGenerationProgress(templateId);

        this.showToast('All images generated successfully!', 'success');
    }

    // Generate specific image size
    async generateImageSize(img, canvas, ctx, size) {
        return new Promise((resolve) => {
            canvas.width = size.width;
            canvas.height = size.height;

            // Clear canvas
            ctx.clearRect(0, 0, size.width, size.height);

            if (size.width === size.height) {
                // Square images (icons) - crop to center square
                const minDimension = Math.min(img.width, img.height);
                const sx = (img.width - minDimension) / 2;
                const sy = (img.height - minDimension) / 2;

                ctx.drawImage(img, sx, sy, minDimension, minDimension, 0, 0, size.width, size.height);
            } else {
                // Rectangular images - fit with aspect ratio
                const imgAspect = img.width / img.height;
                const targetAspect = size.width / size.height;

                let drawWidth, drawHeight, drawX, drawY;

                if (imgAspect > targetAspect) {
                    // Image is wider - fit height
                    drawHeight = size.height;
                    drawWidth = drawHeight * imgAspect;
                    drawX = (size.width - drawWidth) / 2;
                    drawY = 0;
                } else {
                    // Image is taller - fit width
                    drawWidth = size.width;
                    drawHeight = drawWidth / imgAspect;
                    drawX = 0;
                    drawY = (size.height - drawHeight) / 2;
                }

                // Fill background with white for feature graphics
                if (size.id.startsWith('1280')) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, size.width, size.height);
                }

                ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
            }

            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/png', 0.9);
            resolve(dataUrl);
        });
    }

    // Update image preview
    updateImagePreview(templateId, sizeId, imageData) {
        const preview = document.getElementById(`preview-${sizeId}-${templateId}`);
        if (preview) {
            preview.innerHTML = `<img src="${imageData}" alt="Generated ${sizeId}" />`;
        }
    }

    // Show/hide generation progress
    showGenerationProgress(templateId, progress, text) {
        const progressContainer = document.getElementById(`generationProgress-${templateId}`);
        const progressFill = document.getElementById(`progressFill-${templateId}`);
        const progressText = document.getElementById(`progressText-${templateId}`);

        if (progressContainer) progressContainer.style.display = 'block';
        if (progressFill) progressFill.style.width = `${progress}%`;
        if (progressText) progressText.textContent = text;
    }

    hideGenerationProgress(templateId) {
        const progressContainer = document.getElementById(`generationProgress-${templateId}`);
        if (progressContainer) progressContainer.style.display = 'none';
    }

    // Show generated images section
    showGeneratedImages(templateId) {
        const generatedSection = document.getElementById(`generatedImages-${templateId}`);
        const uploadSection = document.getElementById(`screenshotUpload-${templateId}`);

        if (generatedSection) generatedSection.style.display = 'block';
        if (uploadSection) uploadSection.style.display = 'none';
    }

    // Download generated image
    downloadGeneratedImage(templateId, sizeId) {
        if (!this.generatedImages || !this.generatedImages[templateId] || !this.generatedImages[templateId][sizeId]) {
            this.showToast('Image not found', 'error');
            return;
        }

        const imageData = this.generatedImages[templateId][sizeId];
        const template = this.getTemplate(templateId);
        const templateName = template ? template.name.replace(/[^a-zA-Z0-9]/g, '_') : 'template';

        // Create download link
        const link = document.createElement('a');
        link.href = imageData;
        link.download = `${templateName}_${sizeId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showToast(`Downloaded ${sizeId} image`, 'success');
    }

    // Download all images
    async downloadAllImages(templateId) {
        if (!this.generatedImages || !this.generatedImages[templateId]) {
            this.showToast('No images to download', 'error');
            return;
        }

        const template = this.getTemplate(templateId);
        const templateName = template ? template.name.replace(/[^a-zA-Z0-9]/g, '_') : 'template';
        const images = this.generatedImages[templateId];

        let downloadCount = 0;

        for (const [sizeId, imageData] of Object.entries(images)) {
            const link = document.createElement('a');
            link.href = imageData;
            link.download = `${templateName}_${sizeId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            downloadCount++;

            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.showToast(`Downloaded ${downloadCount} images`, 'success');
    }

    // Generate automatic screenshot for template
    async generateAutomaticScreenshot(template) {
        try {
            console.log('📸 Generating automatic screenshot for template:', template.name);

            // Show loading state
            this.showGenerationProgress(template.id, 10, 'Generating automatic screenshot...');

            // Try different methods to get a screenshot
            let screenshotData = null;

            // Method 1: Check if template has existing screenshot
            if (template.screenshot) {
                screenshotData = await this.loadExistingScreenshot(template.screenshot);
            }

            // Method 2: Generate from template preview
            if (!screenshotData) {
                screenshotData = await this.generateTemplatePreview(template);
            }

            // Method 3: Use default template mockup
            if (!screenshotData) {
                screenshotData = await this.generateDefaultMockup(template);
            }

            if (screenshotData) {
                // Process the generated screenshot
                await this.processAutomaticScreenshot(template.id, screenshotData);
                this.showToast('Automatic screenshot generated successfully!', 'success');
            } else {
                // Hide progress and show upload area
                this.hideGenerationProgress(template.id);
                console.log('ℹ️ No automatic screenshot available, showing upload area');
            }

        } catch (error) {
            console.error('Failed to generate automatic screenshot:', error);
            this.hideGenerationProgress(template.id);
            // Don't show error toast, just fall back to manual upload
        }
    }

    // Load existing screenshot from template data
    async loadExistingScreenshot(screenshotPath) {
        try {
            // If it's already a data URL, return it
            if (screenshotPath.startsWith('data:')) {
                return screenshotPath;
            }

            // Try to load as image URL
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.onerror = () => reject(new Error('Failed to load screenshot'));
                img.src = screenshotPath;
            });
        } catch (error) {
            console.warn('Failed to load existing screenshot:', error);
            return null;
        }
    }

    // Generate template preview screenshot
    async generateTemplatePreview(template) {
        try {
            console.log('🎨 Generating template preview for:', template.name);

            // Create a virtual preview of the template
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set canvas size for mobile app preview
            canvas.width = 375; // iPhone width
            canvas.height = 667; // iPhone height

            // Create gradient background based on template category
            const gradient = this.createCategoryGradient(ctx, template.category);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Add template-specific content
            await this.drawTemplateContent(ctx, template, canvas.width, canvas.height);

            return canvas.toDataURL('image/png');

        } catch (error) {
            console.warn('Failed to generate template preview:', error);
            return null;
        }
    }

    // Generate default mockup based on template category
    async generateDefaultMockup(template) {
        try {
            console.log('🖼️ Generating default mockup for:', template.name);

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set canvas size
            canvas.width = 375;
            canvas.height = 667;

            // Create category-based mockup
            const mockupData = this.getCategoryMockupData(template.category);
            await this.drawMockupContent(ctx, template, mockupData, canvas.width, canvas.height);

            return canvas.toDataURL('image/png');

        } catch (error) {
            console.warn('Failed to generate default mockup:', error);
            return null;
        }
    }

    // Create gradient based on template category
    createCategoryGradient(ctx, category) {
        const gradients = {
            'productivity': ['#667eea', '#764ba2'],
            'entertainment': ['#f093fb', '#f5576c'],
            'education': ['#4facfe', '#00f2fe'],
            'business': ['#43e97b', '#38f9d7'],
            'health': ['#fa709a', '#fee140'],
            'social': ['#a8edea', '#fed6e3'],
            'utility': ['#d299c2', '#fef9d7'],
            'finance': ['#89f7fe', '#66a6ff'],
            'travel': ['#fdbb2d', '#22c1c3'],
            'food': ['#ff9a9e', '#fecfef'],
            'default': ['#667eea', '#764ba2']
        };

        const colors = gradients[category?.toLowerCase()] || gradients.default;
        const gradient = ctx.createLinearGradient(0, 0, 0, 667);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);

        return gradient;
    }

    // Draw template-specific content
    async drawTemplateContent(ctx, template, width, height) {
        // Set text properties
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';

        // Draw app title
        ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(template.displayName || template.name, width / 2, 100);

        // Draw category
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(template.category || 'Mobile App', width / 2, 130);

        // Draw description
        if (template.description) {
            ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.wrapText(ctx, template.description, width / 2, 180, width - 60, 20);
        }

        // Draw mockup phone frame
        this.drawPhoneFrame(ctx, width, height);

        // Draw app icon placeholder
        this.drawAppIcon(ctx, template, width / 2 - 30, height / 2 - 30, 60);
    }

    // Draw mockup content for default templates
    async drawMockupContent(ctx, template, mockupData, width, height) {
        // Fill background
        ctx.fillStyle = mockupData.backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // Draw header
        ctx.fillStyle = mockupData.headerColor;
        ctx.fillRect(0, 0, width, 80);

        // Draw title
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(template.displayName || template.name, width / 2, 50);

        // Draw content areas
        mockupData.contentAreas.forEach(area => {
            ctx.fillStyle = area.color;
            ctx.fillRect(area.x, area.y, area.width, area.height);
        });

        // Draw bottom navigation
        if (mockupData.hasBottomNav) {
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, height - 60, width, 60);

            // Draw nav items
            const navItems = ['Home', 'Search', 'Profile'];
            navItems.forEach((item, index) => {
                const x = (width / navItems.length) * (index + 0.5);
                ctx.fillStyle = '#6c757d';
                ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                ctx.fillText(item, x, height - 25);
            });
        }
    }

    // Get mockup data based on category
    getCategoryMockupData(category) {
        const mockups = {
            'productivity': {
                backgroundColor: '#f8f9fa',
                headerColor: '#007bff',
                hasBottomNav: true,
                contentAreas: [
                    { x: 20, y: 100, width: 335, height: 80, color: '#e9ecef' },
                    { x: 20, y: 200, width: 335, height: 120, color: '#dee2e6' },
                    { x: 20, y: 340, width: 160, height: 100, color: '#ced4da' },
                    { x: 195, y: 340, width: 160, height: 100, color: '#adb5bd' }
                ]
            },
            'entertainment': {
                backgroundColor: '#000',
                headerColor: '#dc3545',
                hasBottomNav: true,
                contentAreas: [
                    { x: 20, y: 100, width: 335, height: 200, color: '#343a40' },
                    { x: 20, y: 320, width: 100, height: 100, color: '#495057' },
                    { x: 137, y: 320, width: 100, height: 100, color: '#6c757d' },
                    { x: 255, y: 320, width: 100, height: 100, color: '#868e96' }
                ]
            },
            'default': {
                backgroundColor: '#ffffff',
                headerColor: '#6c757d',
                hasBottomNav: false,
                contentAreas: [
                    { x: 20, y: 100, width: 335, height: 150, color: '#f8f9fa' },
                    { x: 20, y: 270, width: 335, height: 100, color: '#e9ecef' },
                    { x: 20, y: 390, width: 335, height: 80, color: '#dee2e6' }
                ]
            }
        };

        return mockups[category?.toLowerCase()] || mockups.default;
    }

    // Process automatic screenshot
    async processAutomaticScreenshot(templateId, screenshotData) {
        // Create a blob from the data URL
        const response = await fetch(screenshotData);
        const blob = await response.blob();

        // Create a file object
        const file = new File([blob], 'auto-screenshot.png', { type: 'image/png' });

        // Process it like a regular screenshot
        await this.processScreenshot(templateId, file);
    }

    // Helper method to wrap text
    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    }

    // Draw phone frame
    drawPhoneFrame(ctx, width, height) {
        // Draw subtle frame
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.roundRect = function(x, y, w, h, r) {
            this.beginPath();
            this.moveTo(x + r, y);
            this.lineTo(x + w - r, y);
            this.quadraticCurveTo(x + w, y, x + w, y + r);
            this.lineTo(x + w, y + h - r);
            this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            this.lineTo(x + r, y + h);
            this.quadraticCurveTo(x, y + h, x, y + h - r);
            this.lineTo(x, y + r);
            this.quadraticCurveTo(x, y, x + r, y);
            this.closePath();
        };

        ctx.roundRect(10, 10, width - 20, height - 20, 20);
        ctx.stroke();
    }

    // Draw app icon
    drawAppIcon(ctx, template, x, y, size) {
        // Draw icon background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 12);
        ctx.fill();

        // Draw icon content (first letter of app name)
        ctx.fillStyle = '#007bff';
        ctx.font = `bold ${size * 0.4}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(
            (template.displayName || template.name).charAt(0).toUpperCase(),
            x + size / 2,
            y + size / 2 + size * 0.15
        );
    }

    // Fallback template details display
    showFallbackTemplateDetails(template) {
        const details = `
            Template: ${template.displayName || template.name}
            Category: ${template.category || 'General'}
            Description: ${template.description || 'No description available'}
            Repository: ${template.hasGitHubRepo ? 'Yes' : 'No'}
            Status: ${template.repoStatus?.statusText || 'Local only'}
        `;

        alert(details);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TemplateActionManager = TemplateActionManager;
}
