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
        this.updateLiveDemoButton();
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
        document.getElementById('liveDemoBtn')?.addEventListener('click', this.openLiveDemo.bind(this));

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
    renderTemplatesGrid(templates = null) {
        const grid = document.getElementById('templatesGrid');
        if (!grid) {
            this.showToast('Templates grid not found', 'error');
            return;
        }

        // Get templates from both sources if not provided
        if (!templates) {
            const builtInTemplates = window.templatesManager?.getAllTemplates() || [];
            const customTemplates = window.templateManager?.getAllTemplates() || [];

            // Merge templates, avoiding duplicates
            const templateMap = new Map();

            // Add built-in templates first
            builtInTemplates.forEach(template => {
                templateMap.set(template.id, { ...template, isBuiltIn: true });
            });

            // Add custom templates, they can override built-in ones
            customTemplates.forEach(template => {
                if (!template.isBuiltIn) {
                    templateMap.set(template.id, template);
                }
            });

            templates = Array.from(templateMap.values());
        }

        if (!templates || !Array.isArray(templates)) {
            this.showToast('Invalid templates data', 'error');
            return;
        }

        grid.innerHTML = '';

        templates.forEach(template => {
            try {
                const card = this.createTemplateCard(template);
                grid.appendChild(card);
            } catch (error) {
                this.showToast(`Error creating template card: ${template.name || 'Unknown'}`, 'error');
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

        // Get usage statistics if template manager is available
        const usage = window.templateManager ?
            window.templateManager.getTemplateUsageStats(template.id) :
            { usageCount: 0, successCount: 0, failureCount: 0, lastUsed: null };

        // Calculate success rate
        const successRate = usage.usageCount > 0 ?
            Math.round((usage.successCount / usage.usageCount) * 100) : 0;

        // Determine if template has been used
        const hasBeenUsed = usage.usageCount > 0;
        const isCustom = template.isCustom || !template.isBuiltIn;

        card.innerHTML = `
            <div class="template-header">
                <div class="template-icon" style="background-color: ${template.color}">
                    ${template.icon}
                </div>
                <div class="template-info">
                    <h3>${template.displayName}</h3>
                    <div class="template-meta">
                        <span class="template-category">${template.category || 'utilities'}</span>
                        ${isCustom ? '<span class="custom-template-badge">Custom</span>' : ''}
                        ${hasBeenUsed ? '<span class="used-template-badge">Used</span>' : ''}
                    </div>
                </div>
                ${hasBeenUsed ? `
                    <div class="template-usage-indicator">
                        <div class="usage-count" title="${usage.usageCount} total uses">
                            <i class="fas fa-rocket"></i>
                            ${usage.usageCount}
                        </div>
                        <div class="success-rate ${successRate >= 80 ? 'high' : successRate >= 50 ? 'medium' : 'low'}"
                             title="${successRate}% success rate">
                            <i class="fas fa-chart-line"></i>
                            ${successRate}%
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="template-description">
                ${template.description}
            </div>
            ${template.features && template.features.length > 0 ? `
                <div class="template-features">
                    ${template.features.map(feature =>
                        `<span class="feature-tag">${feature}</span>`
                    ).join('')}
                </div>
            ` : ''}
            ${template.tags && template.tags.length > 0 ? `
                <div class="template-tags">
                    ${template.tags.slice(0, 3).map(tag =>
                        `<span class="tag-chip">${tag}</span>`
                    ).join('')}
                    ${template.tags.length > 3 ? `<span class="tag-more">+${template.tags.length - 3}</span>` : ''}
                </div>
            ` : ''}
            <div class="template-footer">
                <div class="template-stats">
                    <div class="plugin-count">
                        <i class="fas fa-plug"></i>
                        ${(template.plugins || []).length} plugins
                    </div>
                    ${hasBeenUsed ? `
                        <div class="last-used" title="Last used: ${usage.lastUsed ? new Date(usage.lastUsed).toLocaleDateString() : 'Never'}">
                            <i class="fas fa-clock"></i>
                            ${usage.lastUsed ? window.buildStatusManager?.formatTimestamp(usage.lastUsed) || 'Recently' : 'Never'}
                        </div>
                    ` : ''}
                </div>
                <div class="template-actions-mini">
                    ${isCustom ? `
                        <button class="template-action-btn edit-btn" onclick="event.stopPropagation(); ui.editTemplate('${template.id}')" title="Edit Template">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                    <button class="template-action-btn preview-btn" onclick="event.stopPropagation(); ui.previewTemplate('${template.id}')" title="Preview Template">
                        <i class="fas fa-eye"></i>
                    </button>
                    <div class="template-checkbox">
                        <i class="fas fa-check"></i>
                    </div>
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
            
            previewList.innerHTML = templates.map(template => {
                const buildStatus = this.getBuildStatusForTemplate(template);
                return `
                <div class="preview-item" data-template-id="${template.id}">
                    <div class="preview-icon" style="background-color: ${template.color}">
                        ${template.icon}
                    </div>
                    <div class="preview-info">
                        <h4>${template.displayName}</h4>
                        <p>${template.description}</p>
                        ${buildStatus ? this.renderBuildStatus(buildStatus) : ''}
                    </div>
                    <div class="preview-actions">
                        ${buildStatus ? this.renderBuildActions(buildStatus) : ''}
                        <button class="btn btn-sm btn-secondary" onclick="ui.removeFromPreview('${template.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                `;
            }).join('');
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

    // Get build status for a template
    getBuildStatusForTemplate(template) {
        if (!window.buildStatusManager) return null;

        const builds = window.buildStatusManager.getBuildsByApp(template.name);
        if (builds.length === 0) return null;

        // Return the most recent build
        return builds[0];
    }

    // Render build status information
    renderBuildStatus(buildStatus) {
        if (!buildStatus) return '';

        const badge = window.buildStatusManager.getStatusBadge(buildStatus.status);
        const timestamp = window.buildStatusManager.formatTimestamp(buildStatus.lastUpdated);

        return `
            <div class="build-status-info">
                <div class="build-status-badge ${badge.class}" style="background-color: ${badge.color}">
                    ${badge.icon} ${badge.text}
                </div>
                <div class="build-timestamp">
                    <i class="fas fa-clock"></i> ${timestamp}
                    ${buildStatus.duration ? `(${buildStatus.duration})` : ''}
                </div>
            </div>
        `;
    }

    // Render build actions
    renderBuildActions(buildStatus) {
        if (!buildStatus) return '';

        let actions = '';

        // View build logs
        if (buildStatus.buildUrl) {
            actions += `
                <a href="${buildStatus.buildUrl}" target="_blank" class="btn btn-sm btn-info" title="View Build Logs">
                    <i class="fas fa-external-link-alt"></i>
                </a>
            `;
        }

        // View Codemagic project
        if (buildStatus.projectUrl) {
            actions += `
                <a href="${buildStatus.projectUrl}" target="_blank" class="btn btn-sm btn-warning" title="View Codemagic Project">
                    <i class="fas fa-rocket"></i>
                </a>
            `;
        }

        // Download artifacts
        if (buildStatus.status === window.buildStatusManager?.STATUS.SUCCESS && buildStatus.artifacts?.length > 0) {
            actions += `
                <button class="btn btn-sm btn-success" onclick="ui.showArtifacts('${buildStatus.buildId}')" title="Download Artifacts">
                    <i class="fas fa-download"></i>
                </button>
            `;
        }

        return actions;
    }

    // Show artifacts modal
    showArtifacts(buildId) {
        if (!window.buildStatusManager) return;

        const build = window.buildStatusManager.getBuild(buildId);
        if (!build || !build.artifacts || build.artifacts.length === 0) {
            alert('No artifacts available for this build.');
            return;
        }

        const artifactsList = build.artifacts.map(artifact => `
            <div class="artifact-item">
                <div class="artifact-info">
                    <h4>${artifact.name}</h4>
                    <p>Type: ${artifact.type} | Size: ${(artifact.size / 1024 / 1024).toFixed(2)} MB</p>
                    ${artifact.versionName ? `<p>Version: ${artifact.versionName}</p>` : ''}
                </div>
                <div class="artifact-actions">
                    <a href="${artifact.url}" target="_blank" class="btn btn-primary" download>
                        <i class="fas fa-download"></i> Download
                    </a>
                </div>
            </div>
        `).join('');

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-download"></i> Build Artifacts</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="artifacts-list">
                        ${artifactsList}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // Update selected apps preview (called from app.js)
    updateSelectedAppsPreview() {
        this.updatePreview();
    }

    // Show build history modal
    showBuildHistory() {
        if (!window.buildStatusManager) {
            alert('Build status manager not available.');
            return;
        }

        const builds = window.buildStatusManager.loadBuildHistory();
        const stats = window.buildStatusManager.getBuildStats();

        if (builds.length === 0) {
            alert('No build history available.');
            return;
        }

        const buildsList = builds.map((build, index) => {
            const badge = window.buildStatusManager.getStatusBadge(build.status);
            const timestamp = window.buildStatusManager.formatTimestamp(build.timestamp);
            const duration = build.duration ? `(${build.duration})` : '';

            return `
                <div class="build-history-item" data-build-id="${build.buildId}" data-build-index="${index}">
                    <div class="build-info">
                        <div class="build-header">
                            <h4>${build.appName}</h4>
                            <div class="build-status-badge ${badge.class}" style="background-color: ${badge.color}">
                                ${badge.icon} ${badge.text}
                            </div>
                        </div>
                        <div class="build-details">
                            <p><strong>Build ID:</strong> ${build.buildId}</p>
                            <p><strong>Workflow:</strong> ${build.workflowId} (${build.branch})</p>
                            <p><strong>Started:</strong> ${timestamp} ${duration}</p>
                            ${build.artifacts && build.artifacts.length > 0 ?
                                `<p><strong>Artifacts:</strong> ${build.artifacts.length} files</p>` : ''}
                            ${build.githubPages ? `
                                <p><strong>GitHub Pages:</strong>
                                    <span class="pages-status-${build.githubPages.status || 'unknown'}">
                                        ${this.formatPagesStatus(build.githubPages.status || 'unknown')}
                                    </span>
                                </p>
                            ` : ''}
                        </div>
                    </div>
                    <div class="build-actions">
                        ${this.createBuildHistoryLiveDemoButton(build, index)}
                        ${build.buildUrl ? `
                            <a href="${build.buildUrl}" target="_blank" class="btn btn-sm btn-info" title="View Build Logs">
                                <i class="fas fa-external-link-alt"></i>
                            </a>
                        ` : ''}
                        ${build.projectUrl ? `
                            <a href="${build.projectUrl}" target="_blank" class="btn btn-sm btn-warning" title="View Codemagic Project">
                                <i class="fas fa-rocket"></i>
                            </a>
                        ` : ''}
                        ${build.status === window.buildStatusManager.STATUS.SUCCESS && build.artifacts?.length > 0 ? `
                            <button class="btn btn-sm btn-success" onclick="uiManager.showArtifacts('${build.buildId}')" title="Download Artifacts">
                                <i class="fas fa-download"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-danger" onclick="uiManager.deleteBuild('${build.buildId}')" title="Delete Build">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        const modal = document.createElement('div');
        modal.className = 'modal-overlay build-history-modal';
        modal.innerHTML = `
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-history"></i> Build History</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="build-stats">
                        <div class="stat-item">
                            <span class="stat-value">${stats.total}</span>
                            <span class="stat-label">Total Builds</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.success}</span>
                            <span class="stat-label">Successful</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.failed}</span>
                            <span class="stat-label">Failed</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.building}</span>
                            <span class="stat-label">Building</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.successRate}%</span>
                            <span class="stat-label">Success Rate</span>
                        </div>
                    </div>
                    <div class="build-history-list">
                        ${buildsList}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-warning" onclick="ui.exportBuildHistory()">
                        <i class="fas fa-download"></i> Export History
                    </button>
                    <button class="btn btn-danger" onclick="ui.clearBuildHistory()">
                        <i class="fas fa-trash"></i> Clear History
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // Delete a specific build
    deleteBuild(buildId) {
        if (!confirm('Are you sure you want to delete this build from history?')) {
            return;
        }

        if (!window.buildStatusManager) return;

        const builds = window.buildStatusManager.loadBuildHistory();
        const filteredBuilds = builds.filter(b => b.buildId !== buildId);

        localStorage.setItem(window.buildStatusManager.storageKey, JSON.stringify(filteredBuilds));

        // Remove from UI
        const buildElement = document.querySelector(`[data-build-id="${buildId}"]`);
        if (buildElement) {
            buildElement.remove();
        }

        // Update preview if needed
        this.updateSelectedAppsPreview();
    }

    // Clear all build history
    clearBuildHistory() {
        if (!confirm('Are you sure you want to clear all build history? This action cannot be undone.')) {
            return;
        }

        if (!window.buildStatusManager) return;

        window.buildStatusManager.clearBuildHistory();

        // Close modal and update UI
        const modal = document.querySelector('.build-history-modal');
        if (modal) {
            modal.remove();
        }

        this.updateSelectedAppsPreview();
        alert('Build history cleared successfully.');
    }

    // Export build history
    exportBuildHistory() {
        if (!window.buildStatusManager) return;

        const exportData = window.buildStatusManager.exportBuildHistory();
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `cordova-build-history-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Import build history
    importBuildHistory() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const success = window.buildStatusManager.importBuildHistory(e.target.result);
                    if (success) {
                        alert('Build history imported successfully.');
                        this.updateSelectedAppsPreview();
                    } else {
                        alert('Failed to import build history. Invalid file format.');
                    }
                } catch (error) {
                    alert('Failed to import build history: ' + error.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
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
            // Templates manager not ready yet, will be populated later
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
            this.showToast('Error loading plugins', 'error');
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
            
            // Set default values (user should customize these)
            document.getElementById('githubUsername').value = '';
            document.getElementById('githubToken').value = '';
            document.getElementById('packagePrefix').value = 'com.yourcompany';
            document.getElementById('authorName').value = 'Your Name';
            document.getElementById('authorEmail').value = 'your.email@example.com';
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
        window.open('https://github.com/your-username/cordova-app-generator', '_blank');
    }

    // Open Live Demo
    openLiveDemo() {
        // Get the most recently generated app or show a default demo
        const demoUrl = this.getLiveDemoUrl();

        if (demoUrl) {
            // Show loading toast
            this.showToast('Opening live demo...', 'info');

            // Open demo in new tab
            window.open(demoUrl, '_blank');

            // Track demo view (if analytics enabled)
            if (window.CONFIG?.features?.analytics) {
                this.trackEvent('demo_viewed', { url: demoUrl });
            }
        } else {
            // Show modal to generate an app first
            this.showLiveDemoModal();
        }
    }

    // Get live demo URL
    getLiveDemoUrl() {
        // Check if we have a recently generated app
        const recentApps = this.getRecentlyGeneratedApps();

        if (recentApps.length > 0) {
            const latestApp = recentApps[0];
            const githubUsername = document.getElementById('githubUsername')?.value;

            if (githubUsername && latestApp.repositoryName) {
                return `https://${githubUsername}.github.io/${latestApp.repositoryName}/www/`;
            }
        }

        // Fallback to example demo
        return this.getExampleDemoUrl();
    }

    // Get example demo URL (fallback)
    getExampleDemoUrl() {
        // Return a demo URL for a sample app
        const githubUsername = document.getElementById('githubUsername')?.value || 'your-username';
        return `https://${githubUsername}.github.io/WeatherApp-Demo/www/`;
    }

    // Get recently generated apps from localStorage
    getRecentlyGeneratedApps() {
        try {
            const stored = localStorage.getItem('recentlyGeneratedApps');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            return [];
        }
    }

    // Store recently generated app
    storeRecentlyGeneratedApp(appData) {
        try {
            const recentApps = this.getRecentlyGeneratedApps();

            // Add new app to the beginning
            recentApps.unshift({
                repositoryName: appData.repositoryName,
                appName: appData.appName,
                githubUrl: appData.githubUrl,
                demoUrl: appData.demoUrl,
                timestamp: new Date().toISOString(),
                status: appData.status || 'deployed'
            });

            // Keep only the last 10 apps
            const limitedApps = recentApps.slice(0, 10);

            localStorage.setItem('recentlyGeneratedApps', JSON.stringify(limitedApps));

            // Update live demo button state
            this.updateLiveDemoButton();

        } catch (error) {
            console.error('Error storing recently generated app:', error);
        }
    }

    // Update live demo button state
    updateLiveDemoButton() {
        const liveDemoBtn = document.getElementById('liveDemoBtn');
        const recentApps = this.getRecentlyGeneratedApps();

        if (liveDemoBtn) {
            if (recentApps.length > 0) {
                liveDemoBtn.innerHTML = `
                    <i class="fas fa-external-link-alt"></i>
                    Live Demo (${recentApps.length})
                `;
                liveDemoBtn.title = `View live demo - ${recentApps.length} app(s) available`;
            } else {
                liveDemoBtn.innerHTML = `
                    <i class="fas fa-external-link-alt"></i>
                    Live Demo
                `;
                liveDemoBtn.title = 'View live demo of a generated app';
            }
        }
    }

    // Show live demo modal when no apps are available
    showLiveDemoModal() {
        const modal = this.createModal('liveDemoModal', 'Live Demo', `
            <div class="modal-content">
                <div class="demo-info">
                    <div class="demo-icon">🚀</div>
                    <h3>No Apps Generated Yet</h3>
                    <p>To view a live demo, you need to generate and deploy an app first.</p>

                    <div class="demo-steps">
                        <h4>Quick Steps:</h4>
                        <ol>
                            <li><strong>Configure GitHub:</strong> Enter your GitHub username and token</li>
                            <li><strong>Select Templates:</strong> Choose one or more app templates</li>
                            <li><strong>Generate Apps:</strong> Click "Generate All Apps"</li>
                            <li><strong>Enable GitHub Pages:</strong> Go to repository settings and enable Pages</li>
                            <li><strong>View Demo:</strong> Return here to view your live demo</li>
                        </ol>
                    </div>

                    <div class="demo-example">
                        <h4>Example Demo:</h4>
                        <p>Want to see what a generated app looks like? Check out this example:</p>
                        <button class="btn btn-demo" onclick="window.open('${this.getExampleDemoUrl()}', '_blank')">
                            <i class="fas fa-external-link-alt"></i>
                            View Example Demo
                        </button>
                    </div>
                </div>
            </div>
        `);

        this.showModal(modal);
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

    // Display generation results
    displayResults(results) {
        const resultsSection = document.getElementById('resultsSection');
        const resultsGrid = document.getElementById('resultsGrid');

        if (!resultsSection || !resultsGrid) return;

        // Clear previous results
        resultsGrid.innerHTML = '';

        // Show results section
        resultsSection.style.display = 'block';

        // Create and show demo links first
        this.createDemoLinks(results);

        // Create result cards
        results.forEach((result, index) => {
            const resultCard = this.createResultCard(result, index);
            resultsGrid.appendChild(resultCard);
        });

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });

        // Store results for later use
        this.lastGenerationResults = results;
    }

    // Create demo links section
    createDemoLinks(results) {
        const demoLinksSection = document.getElementById('demoLinksSection');
        const demoLinksGrid = document.getElementById('demoLinksGrid');

        if (!demoLinksSection || !demoLinksGrid) return;

        // Filter successful results
        const successfulResults = results.filter(result => result.success && result.repository);

        if (successfulResults.length === 0) {
            demoLinksSection.style.display = 'none';
            return;
        }

        // Clear previous demo links
        demoLinksGrid.innerHTML = '';

        // Create demo link cards
        successfulResults.forEach((result, index) => {
            const demoCard = this.createDemoLinkCard(result, index);
            demoLinksGrid.appendChild(demoCard);
        });

        // Show demo links section
        demoLinksSection.style.display = 'block';

        // Start monitoring GitHub Pages status
        this.startDemoLinksMonitoring(successfulResults);
    }

    // Create individual demo link card
    createDemoLinkCard(result, index) {
        const githubUsername = document.getElementById('githubUsername')?.value;
        const appName = result.repository?.name || result.appName;
        const demoUrl = `https://${githubUsername}.github.io/${appName}/www/`;
        const repoUrl = result.repository?.htmlUrl;

        const card = document.createElement('div');
        card.className = 'demo-link-card';
        card.setAttribute('data-demo-app', appName);

        // Determine initial status
        const pagesStatus = result.githubPages?.status || 'building';
        const statusInfo = this.getDemoStatusInfo(pagesStatus);

        card.innerHTML = `
            <div class="demo-app-icon">
                ${this.getAppIcon(result.category || 'default')}
            </div>
            <div class="demo-app-name">${this.escapeHtml(result.appName)}</div>
            <div class="demo-app-url">${demoUrl}</div>
            <div class="demo-status ${statusInfo.class}" id="demoStatus-${appName}">
                <i class="${statusInfo.icon}"></i>
                <span>${statusInfo.text}</span>
            </div>
            <div class="demo-actions">
                ${this.createDemoActionButtons(demoUrl, repoUrl, pagesStatus, appName)}
            </div>
        `;

        return card;
    }

    // Get demo status information
    getDemoStatusInfo(status) {
        switch (status) {
            case 'built':
                return {
                    class: 'ready',
                    icon: 'fas fa-check-circle',
                    text: 'Live & Ready'
                };
            case 'building':
                return {
                    class: 'building',
                    icon: 'fas fa-spinner fa-spin',
                    text: 'Deploying...'
                };
            case 'errored':
                return {
                    class: 'error',
                    icon: 'fas fa-exclamation-triangle',
                    text: 'Setup Failed'
                };
            default:
                return {
                    class: 'building',
                    icon: 'fas fa-clock',
                    text: 'Setting up...'
                };
        }
    }

    // Create demo action buttons
    createDemoActionButtons(demoUrl, repoUrl, status, appName) {
        let buttons = '';

        if (status === 'built') {
            buttons += `
                <a href="${demoUrl}" target="_blank" class="demo-btn" onclick="uiManager.trackDemoClick('${appName}', '${demoUrl}')">
                    <i class="fas fa-external-link-alt"></i>
                    Open Demo
                </a>
            `;
        } else if (status === 'building') {
            buttons += `
                <button class="demo-btn" disabled>
                    <i class="fas fa-spinner fa-spin"></i>
                    Deploying...
                </button>
            `;
        } else {
            buttons += `
                <button class="demo-btn" onclick="uiManager.enableDemoPages('${appName}')">
                    <i class="fas fa-rocket"></i>
                    Enable Demo
                </button>
            `;
        }

        // Always include repository link
        if (repoUrl) {
            buttons += `
                <a href="${repoUrl}" target="_blank" class="demo-btn secondary">
                    <i class="fab fa-github"></i>
                    Repository
                </a>
            `;
        }

        return buttons;
    }

    // Get app icon based on category
    getAppIcon(category) {
        const icons = {
            weather: '🌤️',
            productivity: '📋',
            utilities: '🔧',
            education: '🎓',
            health: '💪',
            finance: '💰',
            entertainment: '🎮',
            lifestyle: '🏠',
            default: '📱'
        };

        return icons[category] || icons.default;
    }

    // Start monitoring demo links
    startDemoLinksMonitoring(results) {
        results.forEach((result, index) => {
            const appName = result.repository?.name || result.appName;

            if (result.githubPages?.status !== 'built') {
                // Start monitoring this app
                setTimeout(() => {
                    this.checkDemoStatus(appName, result);
                }, 10000); // Check after 10 seconds
            }
        });
    }

    // Check demo status
    async checkDemoStatus(appName, result) {
        if (!window.githubIntegration?.isAuthenticated) return;

        try {
            const status = await window.githubIntegration.getGitHubPagesStatus(appName);

            if (status.success) {
                this.updateDemoLinkStatus(appName, status.status);

                if (status.status === 'built') {
                    this.showToast(`${appName} is now live!`, 'success');
                } else if (status.status !== 'built') {
                    // Continue monitoring
                    setTimeout(() => {
                        this.checkDemoStatus(appName, result);
                    }, 30000); // Check again in 30 seconds
                }
            }
        } catch (error) {
            console.error('Error checking demo status:', error);
        }
    }

    // Update demo link status
    updateDemoLinkStatus(appName, status) {
        const statusElement = document.getElementById(`demoStatus-${appName}`);
        const card = document.querySelector(`[data-demo-app="${appName}"]`);

        if (!statusElement || !card) return;

        const statusInfo = this.getDemoStatusInfo(status);

        // Update status display
        statusElement.className = `demo-status ${statusInfo.class}`;
        statusElement.innerHTML = `
            <i class="${statusInfo.icon}"></i>
            <span>${statusInfo.text}</span>
        `;

        // Update action buttons
        const actionsContainer = card.querySelector('.demo-actions');
        if (actionsContainer) {
            const githubUsername = document.getElementById('githubUsername')?.value;
            const demoUrl = `https://${githubUsername}.github.io/${appName}/www/`;
            const repoUrl = `https://github.com/${githubUsername}/${appName}`;

            actionsContainer.innerHTML = this.createDemoActionButtons(demoUrl, repoUrl, status, appName);
        }
    }

    // Enable demo pages
    async enableDemoPages(appName) {
        if (!window.githubIntegration?.isAuthenticated) {
            this.showToast('Please authenticate with GitHub first', 'error');
            return;
        }

        try {
            this.updateDemoLinkStatus(appName, 'building');

            const result = await window.githubIntegration.enableGitHubPages(appName);

            if (result.success) {
                this.showToast('GitHub Pages enabled! Deploying...', 'success');

                // Start monitoring
                setTimeout(() => {
                    this.checkDemoStatus(appName, { repository: { name: appName } });
                }, 10000);
            } else {
                this.updateDemoLinkStatus(appName, 'errored');
                this.showToast(`Failed to enable Pages: ${result.error}`, 'error');
            }
        } catch (error) {
            this.updateDemoLinkStatus(appName, 'errored');
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }

    // Track demo click
    trackDemoClick(appName, demoUrl) {
        if (window.CONFIG?.features?.analytics) {
            console.log('Demo clicked:', { appName, demoUrl });
        }

        // Show feedback
        this.showToast(`Opening ${appName} demo...`, 'info');
    }

    // Create individual result card
    createResultCard(result, index) {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.setAttribute('data-app-index', index);

        const statusClass = result.success ? 'success' : 'error';
        const statusIcon = result.success ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';

        card.innerHTML = `
            <div class="result-header">
                <div class="result-info">
                    <h3 class="result-title">${this.escapeHtml(result.appName)}</h3>
                    <div class="result-status ${statusClass}">
                        <i class="${statusIcon}"></i>
                        ${result.success ? 'Generated Successfully' : 'Generation Failed'}
                    </div>
                </div>
                <div class="result-actions">
                    ${this.createResultActions(result, index)}
                </div>
            </div>

            <div class="result-details">
                <div class="result-meta">
                    <span class="meta-item">
                        <i class="fas fa-box"></i>
                        ${this.escapeHtml(result.packageId || 'N/A')}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-clock"></i>
                        ${new Date(result.timestamp || Date.now()).toLocaleString()}
                    </span>
                </div>

                ${result.success ? this.createSuccessDetails(result) : this.createErrorDetails(result)}
            </div>
        `;

        return card;
    }

    // Create action buttons for each result
    createResultActions(result, index) {
        let actions = '';

        if (result.success && result.repository) {
            // Live Demo Button
            const demoButtonHtml = this.createLiveDemoButton(result, index);
            actions += demoButtonHtml;

            // GitHub Repository Button
            actions += `
                <button class="btn btn-sm btn-outline" onclick="window.open('${result.repository.htmlUrl}', '_blank')" title="View repository on GitHub">
                    <i class="fab fa-github"></i>
                    Repository
                </button>
            `;

            // Download Button
            actions += `
                <button class="btn btn-sm btn-secondary" onclick="uiManager.downloadApp(${index})" title="Download app files">
                    <i class="fas fa-download"></i>
                    Download
                </button>
            `;
        }

        return actions;
    }

    // Create live demo button with different states
    createLiveDemoButton(result, index) {
        const githubUsername = document.getElementById('githubUsername')?.value;
        const appName = result.repository?.name || result.appName;
        const demoUrl = `https://${githubUsername}.github.io/${appName}/www/`;

        // Check GitHub Pages status
        const pagesStatus = result.githubPages?.status || 'unknown';

        switch (pagesStatus) {
            case 'built':
                return `
                    <button class="btn btn-sm btn-demo" onclick="uiManager.openAppDemo('${demoUrl}', ${index})" title="Open live demo in new tab">
                        <i class="fas fa-external-link-alt"></i>
                        Live Demo
                    </button>
                `;

            case 'building':
                return `
                    <button class="btn btn-sm btn-warning" disabled title="GitHub Pages is building... Please wait">
                        <i class="fas fa-spinner fa-spin"></i>
                        Setting up...
                    </button>
                `;

            case 'errored':
                return `
                    <button class="btn btn-sm btn-error" onclick="uiManager.showPagesSetupHelp('${result.repository?.htmlUrl}')" title="GitHub Pages setup failed - click for help">
                        <i class="fas fa-exclamation-triangle"></i>
                        Setup Failed
                    </button>
                `;

            default:
                return `
                    <button class="btn btn-sm btn-outline" onclick="uiManager.enableGitHubPages('${result.repository?.name}', ${index})" title="Enable GitHub Pages for this app">
                        <i class="fas fa-globe"></i>
                        Enable Pages
                    </button>
                `;
        }
    }

    // Download all apps (placeholder)
    downloadAllApps() {
        if (this.lastGenerationResults) {
            this.lastGenerationResults.forEach((result, index) => {
                if (result.success) {
                    this.downloadApp(index);
                }
            });
        } else {
            window.app?.downloadAllApps();
        }
    }

    // View on GitHub (placeholder)
    viewOnGitHub() {
        if (this.lastGenerationResults && this.lastGenerationResults.length > 0) {
            const githubUsername = document.getElementById('githubUsername')?.value;
            if (githubUsername) {
                window.open(`https://github.com/${githubUsername}?tab=repositories`, '_blank');
            }
        } else {
            window.app?.viewOnGitHub();
        }
    }

    // Create success details section
    createSuccessDetails(result) {
        return `
            <div class="success-details">
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Repository:</span>
                        <span class="detail-value">${result.repository?.name || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Files:</span>
                        <span class="detail-value">${result.filesCount || 'N/A'} files</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Size:</span>
                        <span class="detail-value">${this.formatFileSize(result.totalSize || 0)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">GitHub Pages:</span>
                        <span class="detail-value pages-status-${result.githubPages?.status || 'unknown'}">
                            ${this.formatPagesStatus(result.githubPages?.status || 'unknown')}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }

    // Create error details section
    createErrorDetails(result) {
        return `
            <div class="error-details">
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${this.escapeHtml(result.error || 'Unknown error occurred')}
                </div>
                ${result.details ? `<div class="error-details-text">${this.escapeHtml(result.details)}</div>` : ''}
            </div>
        `;
    }

    // Open app demo in new tab
    openAppDemo(demoUrl, index) {
        // Show loading toast
        this.showToast('Opening live demo...', 'info');

        // Open demo URL
        window.open(demoUrl, '_blank');

        // Track demo view
        if (this.lastGenerationResults && this.lastGenerationResults[index]) {
            const result = this.lastGenerationResults[index];
            this.trackDemoView(result.appName, demoUrl);
        }
    }

    // Enable GitHub Pages for specific app
    async enableGitHubPages(repoName, index) {
        if (!window.githubIntegration?.isAuthenticated) {
            this.showToast('Please authenticate with GitHub first', 'error');
            return;
        }

        try {
            // Show loading state
            this.updateDemoButtonState(index, 'enabling');

            // Enable GitHub Pages
            const result = await window.githubIntegration.enableGitHubPages(repoName);

            if (result.success) {
                // Update result data
                if (this.lastGenerationResults && this.lastGenerationResults[index]) {
                    this.lastGenerationResults[index].githubPages = {
                        status: 'building',
                        url: result.url
                    };
                }

                // Update button state
                this.updateDemoButtonState(index, 'building');

                // Show success message
                this.showToast('GitHub Pages enabled! Building site...', 'success');

                // Check status after delay
                setTimeout(() => {
                    this.checkPagesStatus(repoName, index);
                }, 30000); // Check after 30 seconds

            } else {
                this.updateDemoButtonState(index, 'error');
                this.showToast(`Failed to enable GitHub Pages: ${result.error}`, 'error');
            }

        } catch (error) {
            this.updateDemoButtonState(index, 'error');
            this.showToast(`Error enabling GitHub Pages: ${error.message}`, 'error');
        }
    }

    // Check GitHub Pages status
    async checkPagesStatus(repoName, index) {
        if (!window.githubIntegration?.isAuthenticated) return;

        try {
            const status = await window.githubIntegration.getGitHubPagesStatus(repoName);

            if (this.lastGenerationResults && this.lastGenerationResults[index]) {
                this.lastGenerationResults[index].githubPages = status;
            }

            // Update button based on status
            if (status.success) {
                this.updateDemoButtonState(index, status.status);

                if (status.status === 'built') {
                    this.showToast(`${repoName} is now live!`, 'success');
                }
            }

        } catch (error) {
            console.error('Error checking Pages status:', error);
        }
    }

    // Update demo button state
    updateDemoButtonState(index, status) {
        const card = document.querySelector(`[data-app-index="${index}"]`);
        if (!card) return;

        const actionsContainer = card.querySelector('.result-actions');
        if (!actionsContainer) return;

        // Find and update the demo button
        const result = this.lastGenerationResults?.[index];
        if (!result) return;

        const newButtonHtml = this.createLiveDemoButton({
            ...result,
            githubPages: { status }
        }, index);

        // Replace the demo button
        const existingButton = actionsContainer.querySelector('.btn-demo, .btn-warning, .btn-error, .btn-outline');
        if (existingButton) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newButtonHtml;
            const newButton = tempDiv.firstElementChild;

            if (newButton) {
                existingButton.replaceWith(newButton);
            }
        }
    }

    // Show GitHub Pages setup help
    showPagesSetupHelp(repoUrl) {
        const modal = this.createModal('pagesSetupHelp', 'GitHub Pages Setup Help', `
            <div class="modal-content">
                <div class="help-content">
                    <div class="help-icon">⚙️</div>
                    <h3>Manual GitHub Pages Setup</h3>
                    <p>Automatic setup failed. Please enable GitHub Pages manually:</p>

                    <div class="setup-steps">
                        <ol>
                            <li><strong>Go to Repository Settings:</strong><br>
                                <a href="${repoUrl}/settings/pages" target="_blank" class="btn btn-sm btn-primary">
                                    <i class="fas fa-external-link-alt"></i>
                                    Open Repository Settings
                                </a>
                            </li>
                            <li><strong>Enable GitHub Pages:</strong><br>
                                Set source to "Deploy from a branch"
                            </li>
                            <li><strong>Select Branch:</strong><br>
                                Choose "main" branch and "/ (root)" folder
                            </li>
                            <li><strong>Save Settings:</strong><br>
                                Click "Save" and wait for deployment
                            </li>
                            <li><strong>Access Your App:</strong><br>
                                Your app will be available at the provided URL + "/www/"
                            </li>
                        </ol>
                    </div>

                    <div class="help-note">
                        <i class="fas fa-info-circle"></i>
                        <strong>Note:</strong> It may take a few minutes for your site to become available after enabling Pages.
                    </div>
                </div>
            </div>
        `);

        this.showModal(modal);
    }

    // Download individual app
    downloadApp(index) {
        if (!this.lastGenerationResults || !this.lastGenerationResults[index]) {
            this.showToast('App data not available', 'error');
            return;
        }

        const result = this.lastGenerationResults[index];

        // This would typically trigger a download of the app files
        // For now, we'll show a message
        this.showToast(`Downloading ${result.appName}...`, 'info');

        // In a real implementation, this would:
        // 1. Fetch the app files from GitHub
        // 2. Create a ZIP archive
        // 3. Trigger download

        // Placeholder implementation
        window.app?.downloadApp?.(result);
    }

    // Track demo view for analytics
    trackDemoView(appName, demoUrl) {
        if (window.CONFIG?.features?.analytics) {
            // Track demo view event
            console.log('Demo viewed:', { appName, demoUrl });
        }
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // Format GitHub Pages status
    formatPagesStatus(status) {
        const statusMap = {
            'built': '✅ Live',
            'building': '🔄 Building',
            'errored': '❌ Failed',
            'unknown': '⚪ Not Set'
        };
        return statusMap[status] || '⚪ Unknown';
    }

    // Create live demo button for build history items
    createBuildHistoryLiveDemoButton(build, index) {
        // Only show for successful builds
        if (build.status !== window.buildStatusManager?.STATUS?.SUCCESS) {
            return '';
        }

        const githubUsername = document.getElementById('githubUsername')?.value;
        if (!githubUsername) {
            return '';
        }

        const appName = build.repositoryName || build.appName;
        const demoUrl = `https://${githubUsername}.github.io/${appName}/www/`;

        // Check GitHub Pages status from build data
        const pagesStatus = build.githubPages?.status || 'unknown';

        switch (pagesStatus) {
            case 'built':
                return `
                    <button class="btn btn-sm btn-demo" onclick="uiManager.openBuildDemo('${demoUrl}', '${build.buildId}', '${build.appName}')" title="Open live demo in new tab">
                        <i class="fas fa-external-link-alt"></i>
                        Live Demo
                    </button>
                `;

            case 'building':
                return `
                    <button class="btn btn-sm btn-warning" disabled title="GitHub Pages is building... Please wait">
                        <i class="fas fa-spinner fa-spin"></i>
                        Setting up...
                    </button>
                `;

            case 'errored':
                return `
                    <button class="btn btn-sm btn-error" onclick="uiManager.showPagesSetupHelp('https://github.com/${githubUsername}/${appName}')" title="GitHub Pages setup failed - click for help">
                        <i class="fas fa-exclamation-triangle"></i>
                        Setup Failed
                    </button>
                `;

            default:
                return `
                    <button class="btn btn-sm btn-outline" onclick="uiManager.enableBuildGitHubPages('${appName}', '${build.buildId}', ${index})" title="Enable GitHub Pages for this app">
                        <i class="fas fa-globe"></i>
                        Enable Pages
                    </button>
                `;
        }
    }

    // Open build demo in new tab
    openBuildDemo(demoUrl, buildId, appName) {
        // Show loading toast
        this.showToast(`Opening ${appName} demo...`, 'info');

        // Open demo URL
        window.open(demoUrl, '_blank');

        // Track demo view
        this.trackBuildDemoView(buildId, appName, demoUrl);
    }

    // Enable GitHub Pages for build history item
    async enableBuildGitHubPages(repoName, buildId, index) {
        if (!window.githubIntegration?.isAuthenticated) {
            this.showToast('Please authenticate with GitHub first', 'error');
            return;
        }

        try {
            // Show loading state
            this.updateBuildDemoButtonState(buildId, 'enabling');

            // Enable GitHub Pages
            const result = await window.githubIntegration.enableGitHubPages(repoName);

            if (result.success) {
                // Update build data
                this.updateBuildPagesStatus(buildId, {
                    status: 'building',
                    url: result.url
                });

                // Update button state
                this.updateBuildDemoButtonState(buildId, 'building');

                // Show success message
                this.showToast('GitHub Pages enabled! Building site...', 'success');

                // Check status after delay
                setTimeout(() => {
                    this.checkBuildPagesStatus(repoName, buildId);
                }, 30000); // Check after 30 seconds

            } else {
                this.updateBuildDemoButtonState(buildId, 'error');
                this.showToast(`Failed to enable GitHub Pages: ${result.error}`, 'error');
            }

        } catch (error) {
            this.updateBuildDemoButtonState(buildId, 'error');
            this.showToast(`Error enabling GitHub Pages: ${error.message}`, 'error');
        }
    }

    // Check GitHub Pages status for build history item
    async checkBuildPagesStatus(repoName, buildId) {
        if (!window.githubIntegration?.isAuthenticated) return;

        try {
            const status = await window.githubIntegration.getGitHubPagesStatus(repoName);

            // Update build data
            this.updateBuildPagesStatus(buildId, status);

            // Update button based on status
            if (status.success) {
                this.updateBuildDemoButtonState(buildId, status.status);

                if (status.status === 'built') {
                    this.showToast(`${repoName} is now live!`, 'success');
                }
            }

        } catch (error) {
            console.error('Error checking build Pages status:', error);
        }
    }

    // Update build demo button state
    updateBuildDemoButtonState(buildId, status) {
        const buildItem = document.querySelector(`[data-build-id="${buildId}"]`);
        if (!buildItem) return;

        const actionsContainer = buildItem.querySelector('.build-actions');
        if (!actionsContainer) return;

        // Find the build data
        const builds = window.buildStatusManager?.loadBuildHistory() || [];
        const build = builds.find(b => b.buildId === buildId);
        if (!build) return;

        // Create new button HTML
        const newButtonHtml = this.createBuildHistoryLiveDemoButton({
            ...build,
            githubPages: { status }
        }, 0);

        // Replace the demo button
        const existingButton = actionsContainer.querySelector('.btn-demo, .btn-warning, .btn-error, .btn-outline');
        if (existingButton && newButtonHtml) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newButtonHtml;
            const newButton = tempDiv.firstElementChild;

            if (newButton) {
                existingButton.replaceWith(newButton);
            }
        }
    }

    // Update build Pages status in storage
    updateBuildPagesStatus(buildId, pagesStatus) {
        if (!window.buildStatusManager) return;

        const builds = window.buildStatusManager.loadBuildHistory();
        const buildIndex = builds.findIndex(b => b.buildId === buildId);

        if (buildIndex !== -1) {
            builds[buildIndex].githubPages = pagesStatus;
            window.buildStatusManager.saveBuildHistory(builds);
        }
    }

    // Track build demo view for analytics
    trackBuildDemoView(buildId, appName, demoUrl) {
        if (window.CONFIG?.features?.analytics) {
            console.log('Build demo viewed:', { buildId, appName, demoUrl });
        }
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Test function to simulate generation results (for development/demo)
    showTestResults() {
        const githubUsername = document.getElementById('githubUsername')?.value || 'demo-user';

        const testResults = [
            {
                success: true,
                appName: 'WeatherApp',
                packageId: 'com.example.weather',
                timestamp: new Date().toISOString(),
                repository: {
                    name: 'WeatherApp',
                    htmlUrl: `https://github.com/${githubUsername}/WeatherApp`,
                    fullName: `${githubUsername}/WeatherApp`
                },
                githubPages: {
                    status: 'built',
                    url: `https://${githubUsername}.github.io/WeatherApp/`
                },
                category: 'weather',
                filesCount: 15,
                totalSize: 245760
            },
            {
                success: true,
                appName: 'TaskManager',
                packageId: 'com.example.tasks',
                timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
                repository: {
                    name: 'TaskManager',
                    htmlUrl: `https://github.com/${githubUsername}/TaskManager`,
                    fullName: `${githubUsername}/TaskManager`
                },
                githubPages: {
                    status: 'building'
                },
                category: 'productivity',
                filesCount: 22,
                totalSize: 387200
            },
            {
                success: true,
                appName: 'Calculator',
                packageId: 'com.example.calculator',
                timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
                repository: {
                    name: 'Calculator',
                    htmlUrl: `https://github.com/${githubUsername}/Calculator`,
                    fullName: `${githubUsername}/Calculator`
                },
                githubPages: {
                    status: 'unknown'
                },
                category: 'utilities',
                filesCount: 12,
                totalSize: 156800
            },
            {
                success: false,
                appName: 'FailedApp',
                packageId: 'com.example.failed',
                timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
                error: 'GitHub API rate limit exceeded',
                details: 'Please wait before generating more apps or check your GitHub token permissions.',
                category: 'default'
            }
        ];

        this.displayResults(testResults);

        // Store test apps as recently generated
        testResults.forEach(result => {
            if (result.success) {
                this.storeRecentlyGeneratedApp({
                    repositoryName: result.repository.name,
                    appName: result.appName,
                    githubUrl: result.repository.htmlUrl,
                    demoUrl: `https://${githubUsername}.github.io/${result.repository.name}/www/`,
                    status: 'deployed'
                });
            }
        });
    }

    // Create test build history data (for development/demo)
    createTestBuildHistory() {
        if (!window.buildStatusManager) {
            console.warn('Build status manager not available');
            return;
        }

        const githubUsername = document.getElementById('githubUsername')?.value || 'demo-user';

        const testBuilds = [
            {
                buildId: 'build-001',
                appName: 'WeatherApp',
                repositoryName: 'WeatherApp',
                workflowId: 'android-workflow',
                branch: 'main',
                status: window.buildStatusManager.STATUS.SUCCESS,
                timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                duration: '3m 45s',
                buildUrl: `https://codemagic.io/apps/app-id/builds/build-001`,
                projectUrl: `https://codemagic.io/apps/app-id`,
                artifacts: ['app-release.apk', 'app-debug.apk'],
                githubPages: {
                    status: 'built',
                    url: `https://${githubUsername}.github.io/WeatherApp/`
                }
            },
            {
                buildId: 'build-002',
                appName: 'TaskManager',
                repositoryName: 'TaskManager',
                workflowId: 'android-workflow',
                branch: 'main',
                status: window.buildStatusManager.STATUS.SUCCESS,
                timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
                duration: '4m 12s',
                buildUrl: `https://codemagic.io/apps/app-id/builds/build-002`,
                projectUrl: `https://codemagic.io/apps/app-id`,
                artifacts: ['app-release.apk'],
                githubPages: {
                    status: 'building'
                }
            },
            {
                buildId: 'build-003',
                appName: 'Calculator',
                repositoryName: 'Calculator',
                workflowId: 'android-workflow',
                branch: 'main',
                status: window.buildStatusManager.STATUS.SUCCESS,
                timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
                duration: '2m 58s',
                buildUrl: `https://codemagic.io/apps/app-id/builds/build-003`,
                projectUrl: `https://codemagic.io/apps/app-id`,
                artifacts: ['app-release.apk'],
                githubPages: {
                    status: 'unknown'
                }
            },
            {
                buildId: 'build-004',
                appName: 'NotesApp',
                repositoryName: 'NotesApp',
                workflowId: 'android-workflow',
                branch: 'main',
                status: window.buildStatusManager.STATUS.SUCCESS,
                timestamp: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
                duration: '5m 23s',
                buildUrl: `https://codemagic.io/apps/app-id/builds/build-004`,
                projectUrl: `https://codemagic.io/apps/app-id`,
                artifacts: ['app-release.apk', 'app-debug.apk'],
                githubPages: {
                    status: 'errored'
                }
            },
            {
                buildId: 'build-005',
                appName: 'FailedBuild',
                repositoryName: 'FailedBuild',
                workflowId: 'android-workflow',
                branch: 'main',
                status: window.buildStatusManager.STATUS.FAILED,
                timestamp: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
                duration: '1m 15s',
                buildUrl: `https://codemagic.io/apps/app-id/builds/build-005`,
                projectUrl: `https://codemagic.io/apps/app-id`,
                artifacts: []
                // No GitHub Pages for failed builds
            }
        ];

        // Save test builds to storage
        window.buildStatusManager.saveBuildHistory(testBuilds);

        this.showToast('Test build history created!', 'success');
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

    // Show create template modal
    showCreateTemplate(templateData = null) {
        const isEdit = !!templateData;
        const title = isEdit ? 'Edit Template' : 'Create Custom Template';

        const modal = document.createElement('div');
        modal.className = 'modal-overlay create-template-modal';
        modal.innerHTML = `
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-plus"></i> ${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="templateForm" class="template-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="templateName">Template Name *</label>
                                <input type="text" id="templateName" required placeholder="e.g., weather-tracker"
                                       value="${templateData?.name || ''}" ${isEdit ? 'readonly' : ''}>
                                <small>Internal identifier (lowercase, no spaces)</small>
                            </div>
                            <div class="form-group">
                                <label for="templateDisplayName">Display Name *</label>
                                <input type="text" id="templateDisplayName" required placeholder="e.g., Weather Tracker"
                                       value="${templateData?.displayName || ''}">
                                <small>User-friendly name shown in UI</small>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="templateDescription">Description *</label>
                                <textarea id="templateDescription" required placeholder="Describe what this app template does..."
                                          rows="3">${templateData?.description || ''}</textarea>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="templateIcon">Icon *</label>
                                <input type="text" id="templateIcon" required placeholder="🌤️" maxlength="2"
                                       value="${templateData?.icon || ''}">
                                <small>Emoji or single character</small>
                            </div>
                            <div class="form-group">
                                <label for="templateColor">Color *</label>
                                <input type="color" id="templateColor" required
                                       value="${templateData?.color || '#667eea'}">
                                <small>Background color for template card</small>
                            </div>
                            <div class="form-group">
                                <label for="templateCategory">Category</label>
                                <select id="templateCategory">
                                    ${window.templateManager?.categories.map(cat =>
                                        `<option value="${cat}" ${templateData?.category === cat ? 'selected' : ''}>${cat}</option>`
                                    ).join('') || ''}
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="templateTags">Tags</label>
                                <input type="text" id="templateTags" placeholder="weather, outdoor, monitoring"
                                       value="${templateData?.tags?.join(', ') || ''}">
                                <small>Comma-separated tags for organization</small>
                            </div>
                            <div class="form-group">
                                <label for="templateAuthor">Author</label>
                                <input type="text" id="templateAuthor" placeholder="Your name"
                                       value="${templateData?.author || ''}">
                            </div>
                        </div>
                        <div class="form-section">
                            <h4><i class="fas fa-plug"></i> Cordova Plugins</h4>
                            <div class="plugins-container">
                                <div class="available-plugins">
                                    <h5>Available Plugins</h5>
                                    <div class="plugins-list" id="availablePlugins">
                                        ${this.renderAvailablePlugins(templateData?.plugins || [])}
                                    </div>
                                </div>
                                <div class="selected-plugins">
                                    <h5>Selected Plugins</h5>
                                    <div class="plugins-list" id="selectedPlugins">
                                        ${this.renderSelectedPlugins(templateData?.plugins || [])}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="ui.saveTemplate(${isEdit ? `'${templateData?.id}'` : 'null'})">
                        <i class="fas fa-save"></i> ${isEdit ? 'Update' : 'Create'} Template
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);

        // Setup plugin selection
        this.setupPluginSelection();
    }

    // Render available plugins
    renderAvailablePlugins(selectedPlugins = []) {
        const commonPlugins = [
            { id: 'cordova-plugin-device', name: 'Device Information' },
            { id: 'cordova-plugin-geolocation', name: 'Geolocation' },
            { id: 'cordova-plugin-camera', name: 'Camera' },
            { id: 'cordova-plugin-file', name: 'File System' },
            { id: 'cordova-plugin-network-information', name: 'Network Information' },
            { id: 'cordova-plugin-statusbar', name: 'Status Bar' },
            { id: 'cordova-plugin-splashscreen', name: 'Splash Screen' },
            { id: 'cordova-plugin-vibration', name: 'Vibration' },
            { id: 'cordova-plugin-dialogs', name: 'Notification Dialogs' },
            { id: 'cordova-plugin-inappbrowser', name: 'In-App Browser' }
        ];

        return commonPlugins.map(plugin => `
            <div class="plugin-item ${selectedPlugins.includes(plugin.id) ? 'selected' : ''}"
                 data-plugin-id="${plugin.id}" onclick="ui.togglePlugin('${plugin.id}')">
                <span class="plugin-name">${plugin.name}</span>
                <span class="plugin-id">${plugin.id}</span>
            </div>
        `).join('');
    }

    // Render selected plugins
    renderSelectedPlugins(selectedPlugins = []) {
        if (selectedPlugins.length === 0) {
            return '<div class="empty-plugins">No plugins selected</div>';
        }

        return selectedPlugins.map(pluginId => `
            <div class="plugin-item selected" data-plugin-id="${pluginId}">
                <span class="plugin-name">${pluginId}</span>
                <button class="remove-plugin" onclick="ui.removePlugin('${pluginId}')" title="Remove Plugin">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    // Setup plugin selection functionality
    setupPluginSelection() {
        // Plugin selection is handled by onclick events in the HTML
    }

    // Toggle plugin selection
    togglePlugin(pluginId) {
        const availableContainer = document.getElementById('availablePlugins');
        const selectedContainer = document.getElementById('selectedPlugins');
        const pluginItem = availableContainer.querySelector(`[data-plugin-id="${pluginId}"]`);

        if (pluginItem.classList.contains('selected')) {
            // Remove from selection
            pluginItem.classList.remove('selected');
            this.removePluginFromSelected(pluginId);
        } else {
            // Add to selection
            pluginItem.classList.add('selected');
            this.addPluginToSelected(pluginId);
        }
    }

    // Add plugin to selected list
    addPluginToSelected(pluginId) {
        const selectedContainer = document.getElementById('selectedPlugins');
        const emptyState = selectedContainer.querySelector('.empty-plugins');

        if (emptyState) {
            emptyState.remove();
        }

        const pluginItem = document.createElement('div');
        pluginItem.className = 'plugin-item selected';
        pluginItem.setAttribute('data-plugin-id', pluginId);
        pluginItem.innerHTML = `
            <span class="plugin-name">${pluginId}</span>
            <button class="remove-plugin" onclick="ui.removePlugin('${pluginId}')" title="Remove Plugin">
                <i class="fas fa-times"></i>
            </button>
        `;

        selectedContainer.appendChild(pluginItem);
    }

    // Remove plugin from selected list
    removePluginFromSelected(pluginId) {
        const selectedContainer = document.getElementById('selectedPlugins');
        const pluginItem = selectedContainer.querySelector(`[data-plugin-id="${pluginId}"]`);

        if (pluginItem) {
            pluginItem.remove();
        }

        // Show empty state if no plugins selected
        if (selectedContainer.children.length === 0) {
            selectedContainer.innerHTML = '<div class="empty-plugins">No plugins selected</div>';
        }
    }

    // Remove plugin (called from selected list)
    removePlugin(pluginId) {
        // Remove from selected list
        this.removePluginFromSelected(pluginId);

        // Update available list
        const availableContainer = document.getElementById('availablePlugins');
        const pluginItem = availableContainer.querySelector(`[data-plugin-id="${pluginId}"]`);
        if (pluginItem) {
            pluginItem.classList.remove('selected');
        }
    }

    // Save template (create or update)
    saveTemplate(templateId = null) {
        try {
            // Get form data
            const formData = {
                name: document.getElementById('templateName').value.trim(),
                displayName: document.getElementById('templateDisplayName').value.trim(),
                description: document.getElementById('templateDescription').value.trim(),
                icon: document.getElementById('templateIcon').value.trim(),
                color: document.getElementById('templateColor').value,
                category: document.getElementById('templateCategory').value,
                tags: document.getElementById('templateTags').value.split(',').map(tag => tag.trim()).filter(Boolean),
                author: document.getElementById('templateAuthor').value.trim() || 'User',
                plugins: this.getSelectedPlugins()
            };

            // Validate required fields
            if (!formData.name || !formData.displayName || !formData.description || !formData.icon) {
                alert('Please fill in all required fields.');
                return;
            }

            // Create or update template
            let result;
            if (templateId) {
                result = window.templateManager.updateTemplate(templateId, formData);
                this.showToast('Template updated successfully!', 'success');
            } else {
                result = window.templateManager.createTemplate(formData);
                this.showToast('Template created successfully!', 'success');
            }

            // Close modal and refresh templates
            document.querySelector('.create-template-modal').remove();
            this.renderTemplatesGrid();

        } catch (error) {
            console.error('Failed to save template:', error);
            alert('Failed to save template: ' + error.message);
        }
    }

    // Get selected plugins from the form
    getSelectedPlugins() {
        const selectedContainer = document.getElementById('selectedPlugins');
        const pluginItems = selectedContainer.querySelectorAll('.plugin-item[data-plugin-id]');
        return Array.from(pluginItems).map(item => item.getAttribute('data-plugin-id'));
    }

    // Show template manager modal
    showTemplateManager() {
        if (!window.templateManager) {
            alert('Template manager not available.');
            return;
        }

        const templates = window.templateManager.getAllTemplates();
        const stats = window.templateManager.getTemplateStatistics();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay template-manager-modal';
        modal.innerHTML = `
            <div class="modal-content extra-large-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-cog"></i> Template Manager</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="template-manager-stats">
                        <div class="stat-item">
                            <span class="stat-value">${stats.total}</span>
                            <span class="stat-label">Total Templates</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.builtIn}</span>
                            <span class="stat-label">Built-in</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.custom}</span>
                            <span class="stat-label">Custom</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.totalUsage}</span>
                            <span class="stat-label">Total Usage</span>
                        </div>
                    </div>
                    <div class="template-manager-controls">
                        <div class="search-controls">
                            <input type="text" id="templateSearch" placeholder="Search templates..."
                                   onkeyup="ui.filterTemplates(this.value)">
                            <select id="categoryFilter" onchange="ui.filterTemplatesByCategory(this.value)">
                                <option value="">All Categories</option>
                                ${window.templateManager.categories.map(cat =>
                                    `<option value="${cat}">${cat}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="action-controls">
                            <button class="btn btn-success" onclick="ui.showCreateTemplate()">
                                <i class="fas fa-plus"></i> Create New
                            </button>
                            <button class="btn btn-info" onclick="ui.importTemplates()">
                                <i class="fas fa-upload"></i> Import
                            </button>
                            <button class="btn btn-warning" onclick="ui.exportTemplates()">
                                <i class="fas fa-download"></i> Export
                            </button>
                        </div>
                    </div>
                    <div class="templates-manager-list" id="templatesManagerList">
                        ${this.renderTemplateManagerList(templates)}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // Render template manager list
    renderTemplateManagerList(templates) {
        if (templates.length === 0) {
            return '<div class="empty-state">No templates found</div>';
        }

        return templates.map(template => {
            const usage = window.templateManager.getTemplateUsageStats(template.id);
            const successRate = usage.usageCount > 0 ? Math.round((usage.successCount / usage.usageCount) * 100) : 0;

            return `
                <div class="template-manager-item" data-template-id="${template.id}">
                    <div class="template-info">
                        <div class="template-header">
                            <div class="template-icon" style="background-color: ${template.color}">
                                ${template.icon}
                            </div>
                            <div class="template-details">
                                <h4>${template.displayName}</h4>
                                <p>${template.description}</p>
                                <div class="template-meta">
                                    <span class="template-category">${template.category}</span>
                                    ${template.isBuiltIn ? '<span class="built-in-badge">Built-in</span>' : '<span class="custom-badge">Custom</span>'}
                                    ${template.tags && template.tags.length > 0 ?
                                        `<span class="template-tags">${template.tags.join(', ')}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="template-usage">
                            <div class="usage-stat">
                                <span class="usage-value">${usage.usageCount}</span>
                                <span class="usage-label">Uses</span>
                            </div>
                            <div class="usage-stat">
                                <span class="usage-value">${successRate}%</span>
                                <span class="usage-label">Success</span>
                            </div>
                            <div class="usage-stat">
                                <span class="usage-value">${usage.lastUsed ? window.buildStatusManager?.formatTimestamp(usage.lastUsed) || 'Never' : 'Never'}</span>
                                <span class="usage-label">Last Used</span>
                            </div>
                        </div>
                    </div>
                    <div class="template-actions">
                        ${!template.isBuiltIn ? `
                            <button class="btn btn-sm btn-primary" onclick="ui.editTemplate('${template.id}')" title="Edit Template">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-info" onclick="ui.duplicateTemplate('${template.id}')" title="Duplicate Template">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn btn-sm btn-success" onclick="ui.previewTemplate('${template.id}')" title="Preview Template">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${!template.isBuiltIn ? `
                            <button class="btn btn-sm btn-danger" onclick="ui.deleteTemplate('${template.id}')" title="Delete Template">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Edit template
    editTemplate(templateId) {
        const template = window.templateManager.getTemplateById(templateId);
        if (!template) {
            alert('Template not found.');
            return;
        }

        // Close template manager modal
        document.querySelector('.template-manager-modal').remove();

        // Show edit template modal
        this.showCreateTemplate(template);
    }

    // Duplicate template
    duplicateTemplate(templateId) {
        try {
            const newName = prompt('Enter name for the duplicated template:');
            if (!newName) return;

            const duplicatedTemplate = window.templateManager.duplicateTemplate(templateId, newName);
            this.showToast('Template duplicated successfully!', 'success');

            // Refresh template manager if open
            const managerModal = document.querySelector('.template-manager-modal');
            if (managerModal) {
                const listContainer = document.getElementById('templatesManagerList');
                if (listContainer) {
                    listContainer.innerHTML = this.renderTemplateManagerList(window.templateManager.getAllTemplates());
                }
            }

            // Refresh main templates grid
            this.renderTemplatesGrid();

        } catch (error) {
            console.error('Failed to duplicate template:', error);
            alert('Failed to duplicate template: ' + error.message);
        }
    }

    // Delete template
    deleteTemplate(templateId) {
        const template = window.templateManager.getTemplateById(templateId);
        if (!template) {
            alert('Template not found.');
            return;
        }

        if (!confirm(`Are you sure you want to delete the template "${template.displayName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            window.templateManager.deleteTemplate(templateId);
            this.showToast('Template deleted successfully!', 'success');

            // Refresh template manager if open
            const managerModal = document.querySelector('.template-manager-modal');
            if (managerModal) {
                const listContainer = document.getElementById('templatesManagerList');
                if (listContainer) {
                    listContainer.innerHTML = this.renderTemplateManagerList(window.templateManager.getAllTemplates());
                }
            }

            // Refresh main templates grid
            this.renderTemplatesGrid();

        } catch (error) {
            console.error('Failed to delete template:', error);
            alert('Failed to delete template: ' + error.message);
        }
    }

    // Preview template
    previewTemplate(templateId) {
        const template = window.templateManager.getTemplateById(templateId);
        if (!template) {
            alert('Template not found.');
            return;
        }

        const usage = window.templateManager.getTemplateUsageStats(templateId);

        const modal = document.createElement('div');
        modal.className = 'modal-overlay template-preview-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-eye"></i> Template Preview</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="template-preview">
                        <div class="template-preview-header">
                            <div class="template-icon" style="background-color: ${template.color}">
                                ${template.icon}
                            </div>
                            <div class="template-info">
                                <h2>${template.displayName}</h2>
                                <p>${template.description}</p>
                            </div>
                        </div>
                        <div class="template-preview-details">
                            <div class="detail-section">
                                <h4>Basic Information</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <label>ID:</label>
                                        <span>${template.id}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Category:</label>
                                        <span>${template.category}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Author:</label>
                                        <span>${template.author}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Version:</label>
                                        <span>${template.version}</span>
                                    </div>
                                </div>
                            </div>
                            ${template.tags && template.tags.length > 0 ? `
                                <div class="detail-section">
                                    <h4>Tags</h4>
                                    <div class="tags-list">
                                        ${template.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            ${template.plugins && template.plugins.length > 0 ? `
                                <div class="detail-section">
                                    <h4>Cordova Plugins</h4>
                                    <div class="plugins-preview">
                                        ${template.plugins.map(plugin => `<div class="plugin-preview">${plugin}</div>`).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            <div class="detail-section">
                                <h4>Usage Statistics</h4>
                                <div class="usage-stats">
                                    <div class="usage-stat">
                                        <span class="stat-value">${usage.usageCount}</span>
                                        <span class="stat-label">Total Uses</span>
                                    </div>
                                    <div class="usage-stat">
                                        <span class="stat-value">${usage.successCount}</span>
                                        <span class="stat-label">Successful Builds</span>
                                    </div>
                                    <div class="usage-stat">
                                        <span class="stat-value">${usage.failureCount}</span>
                                        <span class="stat-label">Failed Builds</span>
                                    </div>
                                    <div class="usage-stat">
                                        <span class="stat-value">${usage.lastUsed ? window.buildStatusManager?.formatTimestamp(usage.lastUsed) || 'Never' : 'Never'}</span>
                                        <span class="stat-label">Last Used</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                    ${!template.isBuiltIn ? `
                        <button class="btn btn-primary" onclick="ui.editTemplate('${template.id}'); this.closest('.modal-overlay').remove();">
                            <i class="fas fa-edit"></i> Edit Template
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // Filter templates in manager
    filterTemplates(searchTerm) {
        const templates = searchTerm ?
            window.templateManager.searchTemplates(searchTerm) :
            window.templateManager.getAllTemplates();

        const listContainer = document.getElementById('templatesManagerList');
        if (listContainer) {
            listContainer.innerHTML = this.renderTemplateManagerList(templates);
        }
    }

    // Filter templates by category
    filterTemplatesByCategory(category) {
        const templates = category ?
            window.templateManager.getTemplatesByCategory(category) :
            window.templateManager.getAllTemplates();

        const listContainer = document.getElementById('templatesManagerList');
        if (listContainer) {
            listContainer.innerHTML = this.renderTemplateManagerList(templates);
        }
    }

    // Export templates
    exportTemplates() {
        try {
            const exportData = window.templateManager.exportTemplates(false, true);
            const blob = new Blob([exportData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `cordova-templates-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showToast('Templates exported successfully!', 'success');
        } catch (error) {
            console.error('Failed to export templates:', error);
            alert('Failed to export templates: ' + error.message);
        }
    }

    // Import templates
    importTemplates() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const options = {
                        includeBuiltIn: false,
                        overwriteExisting: confirm('Overwrite existing templates with same names?'),
                        createCopies: true,
                        includeUsageStats: true
                    };

                    const results = window.templateManager.importTemplates(e.target.result, options);

                    let message = `Import completed!\n`;
                    message += `Imported: ${results.imported} templates\n`;
                    message += `Skipped: ${results.skipped} templates\n`;
                    if (results.errors.length > 0) {
                        message += `Errors: ${results.errors.length}\n`;
                        message += results.errors.slice(0, 3).join('\n');
                    }

                    alert(message);

                    // Refresh template manager if open
                    const managerModal = document.querySelector('.template-manager-modal');
                    if (managerModal) {
                        const listContainer = document.getElementById('templatesManagerList');
                        if (listContainer) {
                            listContainer.innerHTML = this.renderTemplateManagerList(window.templateManager.getAllTemplates());
                        }
                    }

                    // Refresh main templates grid
                    this.renderTemplatesGrid();

                } catch (error) {
                    console.error('Failed to import templates:', error);
                    alert('Failed to import templates: ' + error.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // Show random app generator modal
    showRandomGenerator() {
        if (!window.templateManager) {
            alert('Template manager not available.');
            return;
        }

        const categories = window.templateManager.categories;
        const templates = window.templateManager.getAllTemplates();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay random-generator-modal';
        modal.innerHTML = `
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-random"></i> Random App Generator</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="random-generator-form">
                        <div class="form-section">
                            <h4><i class="fas fa-sliders-h"></i> Generation Settings</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="randomCount">Number of Apps</label>
                                    <input type="number" id="randomCount" min="1" max="50" value="5">
                                    <small>How many random apps to generate (1-50)</small>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="ensureUnique" checked>
                                        Ensure Unique Templates
                                    </label>
                                    <small>Each app uses a different template</small>
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <h4><i class="fas fa-filter"></i> Template Selection</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="includeBuiltIn" checked>
                                        Include Built-in Templates
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" id="includeCustom" checked>
                                        Include Custom Templates
                                    </label>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="selectedCategories">Categories (optional)</label>
                                <div class="categories-selection">
                                    ${categories.map(category => `
                                        <label class="category-checkbox">
                                            <input type="checkbox" name="categories" value="${category}">
                                            ${category}
                                        </label>
                                    `).join('')}
                                </div>
                                <small>Leave empty to include all categories</small>
                            </div>

                            <div class="form-group">
                                <label for="excludeTemplates">Exclude Templates (optional)</label>
                                <select id="excludeTemplates" multiple size="6">
                                    ${templates.map(template => `
                                        <option value="${template.id}">${template.displayName}</option>
                                    `).join('')}
                                </select>
                                <small>Hold Ctrl/Cmd to select multiple templates to exclude</small>
                            </div>
                        </div>
                    </div>

                    <div class="random-preview-section" id="randomPreviewSection" style="display: none;">
                        <h4><i class="fas fa-eye"></i> Generated Apps Preview</h4>
                        <div class="random-apps-preview" id="randomAppsPreview">
                            <!-- Generated apps will appear here -->
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button type="button" class="btn btn-warning" onclick="ui.generateRandomApps()">
                        <i class="fas fa-dice"></i> Generate Preview
                    </button>
                    <button type="button" class="btn btn-success" id="createRandomAppsBtn" style="display: none;" onclick="ui.createRandomApps()">
                        <i class="fas fa-plus"></i> Create All Apps
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // Generate random apps preview
    generateRandomApps() {
        try {
            // Get form data
            const count = parseInt(document.getElementById('randomCount').value);
            const ensureUnique = document.getElementById('ensureUnique').checked;
            const includeBuiltIn = document.getElementById('includeBuiltIn').checked;
            const includeCustom = document.getElementById('includeCustom').checked;

            // Get selected categories
            const categoryCheckboxes = document.querySelectorAll('input[name="categories"]:checked');
            const selectedCategories = Array.from(categoryCheckboxes).map(cb => cb.value);

            // Get excluded templates
            const excludeSelect = document.getElementById('excludeTemplates');
            const excludeTemplates = Array.from(excludeSelect.selectedOptions).map(option => option.value);

            // Validate settings
            if (!includeBuiltIn && !includeCustom) {
                alert('Please select at least one template type (Built-in or Custom).');
                return;
            }

            if (count < 1 || count > 50) {
                alert('Number of apps must be between 1 and 50.');
                return;
            }

            // Generate random apps
            const options = {
                count,
                categories: selectedCategories.length > 0 ? selectedCategories : null,
                excludeTemplates,
                includeBuiltIn,
                includeCustom,
                ensureUnique
            };

            const randomApps = window.templateManager.generateRandomApps(options);

            if (randomApps.length === 0) {
                alert('No apps could be generated with the current settings. Try adjusting your criteria.');
                return;
            }

            // Show preview
            this.showRandomAppsPreview(randomApps);

        } catch (error) {
            console.error('Failed to generate random apps:', error);
            alert('Failed to generate random apps: ' + error.message);
        }
    }

    // Show random apps preview
    showRandomAppsPreview(randomApps) {
        const previewSection = document.getElementById('randomPreviewSection');
        const previewContainer = document.getElementById('randomAppsPreview');
        const createButton = document.getElementById('createRandomAppsBtn');

        // Store generated apps for later creation
        this.generatedRandomApps = randomApps;

        previewContainer.innerHTML = randomApps.map((app, index) => `
            <div class="random-app-preview">
                <div class="app-preview-header">
                    <div class="app-icon" style="background-color: ${app.template.color}">
                        ${app.template.icon}
                    </div>
                    <div class="app-info">
                        <h5>${app.generatedName}</h5>
                        <p class="app-package">${app.packageName}</p>
                        <p class="app-description">${app.description}</p>
                    </div>
                </div>
                <div class="app-preview-details">
                    <div class="detail-item">
                        <label>Template:</label>
                        <span>${app.template.displayName}</span>
                    </div>
                    <div class="detail-item">
                        <label>Category:</label>
                        <span>${app.template.category}</span>
                    </div>
                    ${app.template.plugins && app.template.plugins.length > 0 ? `
                        <div class="detail-item">
                            <label>Plugins:</label>
                            <span>${app.template.plugins.length} plugins</span>
                        </div>
                    ` : ''}
                </div>
                <div class="app-preview-actions">
                    <button class="btn btn-sm btn-secondary" onclick="ui.regenerateRandomApp(${index})">
                        <i class="fas fa-redo"></i> Regenerate
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="ui.removeRandomApp(${index})">
                        <i class="fas fa-times"></i> Remove
                    </button>
                </div>
            </div>
        `).join('');

        previewSection.style.display = 'block';
        createButton.style.display = 'inline-block';
    }

    // Regenerate a specific random app
    regenerateRandomApp(index) {
        if (!this.generatedRandomApps || !this.generatedRandomApps[index]) return;

        const currentApp = this.generatedRandomApps[index];
        const newApp = window.templateManager.generateRandomAppData(currentApp.template, index + 1);

        this.generatedRandomApps[index] = newApp;
        this.showRandomAppsPreview(this.generatedRandomApps);
    }

    // Remove a random app from preview
    removeRandomApp(index) {
        if (!this.generatedRandomApps) return;

        this.generatedRandomApps.splice(index, 1);

        if (this.generatedRandomApps.length === 0) {
            document.getElementById('randomPreviewSection').style.display = 'none';
            document.getElementById('createRandomAppsBtn').style.display = 'none';
        } else {
            this.showRandomAppsPreview(this.generatedRandomApps);
        }
    }

    // Create all random apps
    createRandomApps() {
        if (!this.generatedRandomApps || this.generatedRandomApps.length === 0) {
            alert('No apps to create. Please generate a preview first.');
            return;
        }

        if (!confirm(`Are you sure you want to create ${this.generatedRandomApps.length} random apps? This will start the generation process.`)) {
            return;
        }

        try {
            // Close the random generator modal
            document.querySelector('.random-generator-modal').remove();

            // Select the templates in the main UI
            this.selectedTemplates.clear();
            this.generatedRandomApps.forEach(app => {
                this.selectedTemplates.add(app.template.id);
            });

            // Update the preview with the selected templates
            this.updatePreview();

            // Show success message
            this.showToast(`${this.generatedRandomApps.length} random apps selected for generation!`, 'success');

            // Clear stored random apps
            this.generatedRandomApps = null;

        } catch (error) {
            console.error('Failed to create random apps:', error);
            alert('Failed to create random apps: ' + error.message);
        }
    }
}

// Export for use in other modules
window.UIManager = UIManager;
