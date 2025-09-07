/**
 * Main Application Controller
 * Coordinates all modules and manages the application state
 */

class CordovaAppGeneratorApp {
    constructor() {
        this.templatesManager = null;
        this.generator = null;
        this.github = null;
        this.cordovaBuilder = null;
        this.ui = null;
        this.isGenerating = false;
        this.generationResults = null;
        this.init();
    }

    async init() {
        try {
            // Initialize configuration manager first
            this.configManager = new ConfigurationManager();
            window.configManager = this.configManager;

            // Initialize authentication manager
            this.authManager = new AuthenticationManager(this.configManager);
            window.authManager = this.authManager;

            // Initialize core modules
            this.templatesManager = new AppTemplatesManager();
            this.templateManager = new TemplateManager();
            this.generator = new CordovaAppGenerator();
            this.github = new GitHubIntegration();
            this.codemagic = new CodemagicIntegration();
            this.cordovaBuilder = new CordovaBuildPreparation();
            this.buildStatusManager = new BuildStatusManager();

            // Connect build status manager with Codemagic integration
            this.buildStatusManager.setCodemagicIntegration(this.codemagic);

            // Make core modules globally available
            window.templatesManager = this.templatesManager;
            window.templateManager = this.templateManager;
            window.generator = this.generator;
            window.github = this.github;
            window.codemagic = this.codemagic;
            window.cordovaBuilder = this.cordovaBuilder;
            window.buildStatusManager = this.buildStatusManager;
            window.app = this;

            // Wait for DOM to be ready before initializing UI
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Initialize enhanced UI manager
            this.uiManager = new EnhancedUIManager(this.configManager, this.authManager);
            window.uiManager = this.uiManager;

            // Initialize template actions manager
            this.templateActions = new TemplateActionManager(this.configManager, this.authManager);
            window.templateActions = this.templateActions;

            // Initialize App Manager with all integrations
            if (window.AppManager) {
                this.appManager = new window.AppManager();
                this.appManager.setConfigManager(this.configManager);
                this.appManager.setAuthManager(this.authManager);
                this.appManager.setTemplateActions(this.templateActions);
                this.appManager.setGitHubIntegration(this.github);
                this.appManager.setCodemagicIntegration(this.codemagic);
                window.appManager = this.appManager;
                console.log('✅ App Manager initialized with all integrations');
            }

            // Initialize legacy UI manager for backward compatibility
            this.ui = new UIManager();
            window.ui = this.ui;

            // Setup event listeners
            this.setupEventListeners();

            // Initialize UI with templates
            await this.initializeUI();

            // Start polling for active builds after initialization
            setTimeout(() => {
                this.buildStatusManager.startPollingActiveBuilds();
            }, 2000);

            console.log('✅ Cordova App Generator initialized successfully with file-based configuration');
        } catch (error) {
            console.error('❌ Failed to initialize application:', error);
            if (this.uiManager) {
                this.uiManager.showToast('Failed to initialize application', 'error');
            } else {
                alert('Failed to initialize application: ' + error.message);
            }
        }
    }

    // Setup event listeners between modules
    setupEventListeners() {
        // Generator events
        this.generator.on('generation:start', this.onGenerationStart.bind(this));
        this.generator.on('generation:progress', this.onGenerationProgress.bind(this));
        this.generator.on('generation:app-complete', this.onAppComplete.bind(this));
        this.generator.on('generation:app-error', this.onAppError.bind(this));
        this.generator.on('generation:complete', this.onGenerationComplete.bind(this));
        this.generator.on('generation:error', this.onGenerationError.bind(this));
        this.generator.on('generation:step', this.onGenerationStep.bind(this));

        // GitHub events
        this.github.on('auth:success', this.onGitHubAuthSuccess.bind(this));
        this.github.on('auth:error', this.onGitHubAuthError.bind(this));
        this.github.on('repo:create:success', this.onRepoCreateSuccess.bind(this));
        this.github.on('repo:create:error', this.onRepoCreateError.bind(this));
        this.github.on('repo:push:success', this.onRepoPushSuccess.bind(this));
        this.github.on('repo:push:error', this.onRepoPushError.bind(this));

        // Codemagic events
        this.codemagic.on('auth:success', this.onCodemagicAuthSuccess.bind(this));
        this.codemagic.on('auth:error', this.onCodemagicAuthError.bind(this));
        this.codemagic.on('app:create:success', this.onCodemagicAppCreateSuccess.bind(this));
        this.codemagic.on('app:create:error', this.onCodemagicAppCreateError.bind(this));
        this.codemagic.on('build:trigger:success', this.onCodemagicBuildTriggerSuccess.bind(this));
        this.codemagic.on('build:trigger:error', this.onCodemagicBuildTriggerError.bind(this));

        // Build Status Manager events
        this.buildStatusManager.on('build:status:updated', this.onBuildStatusUpdated.bind(this));
        this.buildStatusManager.on('build:completed', this.onBuildCompleted.bind(this));
        this.buildStatusManager.on('build:polling:started', this.onBuildPollingStarted.bind(this));
        this.buildStatusManager.on('build:polling:stopped', this.onBuildPollingStopped.bind(this));

        // Cordova Builder events
        this.cordovaBuilder.on('build:start', this.onBuildStart.bind(this));
        this.cordovaBuilder.on('build:progress', this.onBuildProgress.bind(this));
        this.cordovaBuilder.on('build:app-complete', this.onBuildAppComplete.bind(this));
        this.cordovaBuilder.on('build:app-error', this.onBuildAppError.bind(this));
        this.cordovaBuilder.on('build:complete', this.onBuildComplete.bind(this));
        this.cordovaBuilder.on('build:error', this.onBuildError.bind(this));
        this.cordovaBuilder.on('build:step', this.onBuildStep.bind(this));

        // Setup DOM event listeners after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupDOMEventListeners();
            });
        } else {
            this.setupDOMEventListeners();
        }
    }

    // Setup DOM-based event listeners
    setupDOMEventListeners() {
        // Generate All Apps button
        const generateAllBtn = document.getElementById('generateAllBtn');
        if (generateAllBtn) {
            generateAllBtn.addEventListener('click', () => {
                console.log('🚀 Generate All Apps button clicked');
                this.startGeneration();
            });
            console.log('✅ Generate All Apps button event listener attached');
        } else {
            console.warn('⚠️ Generate All Apps button not found');
        }

        // Listen for template selection changes to update generate button
        document.addEventListener('template:selected', () => {
            this.updateGenerateButtonState();
        });

        document.addEventListener('template:deselected', () => {
            this.updateGenerateButtonState();
        });

        console.log('✅ DOM event listeners setup complete');
    }

    // Update generate button state based on selected templates
    updateGenerateButtonState() {
        const generateAllBtn = document.getElementById('generateAllBtn');
        const selectedTemplatesCount = document.getElementById('selectedTemplatesCount');

        if (!generateAllBtn || !selectedTemplatesCount) return;

        const config = this.configManager?.getConfig();
        const selectedTemplates = config?.ui?.selectedTemplates || [];
        const count = selectedTemplates.length;

        if (count > 0) {
            generateAllBtn.disabled = false;
            generateAllBtn.innerHTML = `<i class="fas fa-rocket"></i> Generate ${count} Apps <span id="selectedTemplatesCount">${count}</span>`;
            generateAllBtn.title = `Generate ${count} selected templates`;
        } else {
            generateAllBtn.disabled = true;
            generateAllBtn.innerHTML = '<i class="fas fa-rocket"></i> Generate All Apps <span id="selectedTemplatesCount" style="display: none;">0</span>';
            generateAllBtn.title = 'Select templates to generate';
        }
    }

    // Get form data from UI elements
    getFormDataFromUI() {
        const config = this.configManager.getConfig();

        return {
            // Basic app information
            packagePrefix: document.getElementById('packagePrefix')?.value || config.generation?.packagePrefix || 'com.lehau',
            authorName: document.getElementById('authorName')?.value || config.generation?.authorName || 'LinhFish Development Team',
            authorEmail: document.getElementById('authorEmail')?.value || config.generation?.authorEmail || 'contact@linhfish.com',

            // GitHub settings
            githubUsername: document.getElementById('githubUsername')?.value || config.github?.username || '',
            githubToken: document.getElementById('githubToken')?.value || config.github?.token || '',

            // Build settings
            enableBuildPreparation: document.getElementById('enableBuildPreparation')?.checked || config.generation?.enableBuildPreparation || false,
            outputDirectory: document.getElementById('outputDirectory')?.value || config.generation?.outputDirectory || './generated-apps',
            androidMinSdk: document.getElementById('androidMinSdk')?.value || config.generation?.androidMinSdk || '22',
            androidTargetSdk: document.getElementById('androidTargetSdk')?.value || config.generation?.androidTargetSdk || '34',

            // Codemagic settings
            enableCodemagicIntegration: document.getElementById('enableCodemagicIntegration')?.checked || config.codemagic?.enabled || false,
            codemagicApiToken: document.getElementById('codemagicApiToken')?.value || config.codemagic?.apiToken || '',
            codemagicTeamId: document.getElementById('codemagicTeamId')?.value || config.codemagic?.teamId || '',

            // Additional settings
            createGitHubRepos: document.getElementById('createGitHubRepos')?.checked || config.generation?.createGitHubRepos || false,
            pushToGitHub: document.getElementById('pushToGitHub')?.checked || config.generation?.pushToGitHub || false
        };
    }

    // Show toast message
    showToast(message, type = 'info', duration = 5000) {
        if (this.uiManager) {
            this.uiManager.showToast(message, type, duration);
        } else if (this.ui) {
            this.ui.showToast(message, type, duration);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Setup Codemagic authentication UI
    setupCodemagicAuthUI() {
        const testBtn = document.getElementById('testCodemagicBtn');
        const authBtn = document.getElementById('authenticateCodemagicBtn');
        const statusElement = document.getElementById('codemagicStatus');
        const tokenInput = document.getElementById('codemagicApiToken');
        const teamIdInput = document.getElementById('codemagicTeamId');
        const enableToggle = document.getElementById('enableCodemagicIntegration');
        const codemagicFields = document.getElementById('codemagicFields');

        // Setup toggle visibility
        if (enableToggle && codemagicFields) {
            enableToggle.addEventListener('change', () => {
                codemagicFields.style.display = enableToggle.checked ? 'block' : 'none';
            });
            // Initialize visibility
            codemagicFields.style.display = enableToggle.checked ? 'block' : 'none';
        }

        // Test connection button
        if (testBtn) {
            testBtn.addEventListener('click', async () => {
                await this.testCodemagicConnection();
            });
        }

        // Authenticate button
        if (authBtn) {
            authBtn.addEventListener('click', async () => {
                await this.authenticateCodemagic();
            });
        }

        // Auto-test connection when token changes
        if (tokenInput) {
            tokenInput.addEventListener('blur', async () => {
                const token = tokenInput.value.trim();
                if (token && token.length > 20) {
                    await this.authenticateCodemagic();
                }
            });
        }

        // Listen to Codemagic events for UI updates
        this.codemagic.on('auth:success', (data) => {
            this.updateCodemagicStatus('connected', `Authenticated successfully! Found ${data.appsCount} apps.`);
            this.ui?.showToast('Codemagic authentication successful!', 'success');
        });

        this.codemagic.on('auth:error', (data) => {
            this.updateCodemagicStatus('disconnected', `Authentication failed: ${data.error.message}`);
            this.ui?.showToast(`Codemagic authentication failed: ${data.error.message}`, 'error');
        });

        this.codemagic.on('auth:start', () => {
            this.updateCodemagicStatus('testing', 'Testing connection...');
        });

        // Check initial authentication status
        setTimeout(() => {
            const status = this.codemagic.isAuthenticatedStatus();
            if (status.authenticated) {
                this.updateCodemagicStatus('connected', 'Already authenticated');
            } else {
                this.updateCodemagicStatus('disconnected', 'Not authenticated');
            }
        }, 1000);
    }

    // Test Codemagic connection
    async testCodemagicConnection() {
        try {
            this.updateCodemagicStatus('testing', 'Testing connection...');

            const status = await this.codemagic.isAuthenticatedStatus(true);

            if (status.authenticated && !status.connectionError) {
                this.updateCodemagicStatus('connected', `Connection successful! Rate limit: ${status.rateLimit.remaining} requests remaining.`);
                this.ui?.showToast('Codemagic connection test successful!', 'success');
            } else if (status.connectionError) {
                this.updateCodemagicStatus('disconnected', `Connection failed: ${status.connectionError}`);
                this.ui?.showToast(`Connection test failed: ${status.connectionError}`, 'error');
            } else {
                this.updateCodemagicStatus('disconnected', 'Not authenticated. Please enter your API token.');
                this.ui?.showToast('Not authenticated. Please enter your API token.', 'warning');
            }

        } catch (error) {
            this.updateCodemagicStatus('disconnected', `Test failed: ${error.message}`);
            this.ui?.showToast(`Connection test failed: ${error.message}`, 'error');
        }
    }

    // Authenticate with Codemagic using form inputs
    async authenticateCodemagic() {
        const tokenInput = document.getElementById('codemagicApiToken');
        const teamIdInput = document.getElementById('codemagicTeamId');

        if (!tokenInput) {
            console.error('Codemagic API token input not found');
            this.showToast('Codemagic API token input not found', 'error');
            return;
        }

        const token = tokenInput.value ? tokenInput.value.trim() : '';
        const teamId = teamIdInput && teamIdInput.value ? teamIdInput.value.trim() : null;

        console.log('Token validation:', { hasToken: !!token, tokenLength: token.length });

        if (!token || token.length < 10) {
            this.showToast('Please enter a valid Codemagic API token', 'warning');
            this.updateCodemagicStatus('disconnected', 'Please enter your API token');
            return;
        }

        try {
            this.updateCodemagicStatus('testing', 'Authenticating...');
            this.showToast('Authenticating with Codemagic...', 'info');

            const result = await this.codemagic.authenticate(token, teamId);

            if (result && result.success) {
                this.updateCodemagicStatus('connected', `Authenticated successfully! Found ${result.appsCount} apps.`);
                this.showToast('Codemagic authentication successful!', 'success');
            } else {
                this.updateCodemagicStatus('disconnected', 'Authentication failed');
                this.showToast('Codemagic authentication failed', 'error');
            }

        } catch (error) {
            console.error('Codemagic authentication error:', error);
            this.updateCodemagicStatus('disconnected', `Authentication failed: ${error.message}`);
            this.showToast(`Codemagic authentication failed: ${error.message}`, 'error');
        }
    }

    // Update Codemagic status display
    updateCodemagicStatus(status, message) {
        const statusElement = document.getElementById('codemagicStatus');
        if (!statusElement) return;

        const indicator = statusElement.querySelector('.status-indicator');
        if (!indicator) return;

        // Update status class
        indicator.className = `status-indicator status-${status}`;

        // Update icon and text
        let icon = 'fas fa-times-circle';
        let text = 'Not Authenticated';

        switch (status) {
            case 'connected':
                icon = 'fas fa-check-circle';
                text = 'Connected';
                break;
            case 'testing':
                icon = 'fas fa-spinner fa-spin';
                text = 'Testing...';
                break;
            case 'disconnected':
                icon = 'fas fa-times-circle';
                text = 'Not Authenticated';
                break;
            case 'warning':
                icon = 'fas fa-exclamation-triangle';
                text = 'Warning';
                break;
        }

        indicator.innerHTML = `<i class="${icon}"></i> ${text}`;

        // Update tooltip or additional message
        if (message) {
            indicator.title = message;
        }
    }

    // Toast notification helper method
    showToast(message, type = 'info', duration = 5000) {
        if (this.ui && this.ui.showToast) {
            this.ui.showToast(message, type, duration);
        } else {
            // Fallback to console if UI is not available
            console.log(`[${type.toUpperCase()}] ${message}`);

            // Create a simple toast if UI is not available
            this.createSimpleToast(message, type, duration);
        }
    }

    // Simple toast implementation as fallback
    createSimpleToast(message, type, duration) {
        const toast = document.createElement('div');
        toast.className = `simple-toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : '#2196f3'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 400px;
            word-wrap: break-word;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        }, duration);
    }

    // Initialize UI with templates
    async initializeUI() {
        const templates = this.templatesManager.getAllTemplates();
        this.ui.renderTemplatesGrid(templates);

        // Initialize UI components that depend on other modules
        this.ui.initializeDependentComponents();

        // Show welcome message
        this.ui.showToast('Welcome to Cordova App Generator! Select templates to get started.', 'info', 3000);
    }

    // Start generation process
    async startGeneration() {
        console.log('🚀 Starting app generation process...');

        if (this.isGenerating) {
            this.showToast('Generation already in progress', 'warning');
            return;
        }

        // Get selected templates from configuration
        const config = this.configManager?.getConfig();
        const selectedTemplateIds = config?.ui?.selectedTemplates || [];

        if (selectedTemplateIds.length === 0) {
            this.showToast('Please select at least one app template', 'warning');
            return;
        }

        console.log(`📋 Selected ${selectedTemplateIds.length} templates:`, selectedTemplateIds);

        // Get form data from UI
        const formData = this.getFormDataFromUI();

        // Validate form data
        if (!this.validateFormData(formData)) {
            return;
        }

        try {
            this.isGenerating = true;

            // Get selected templates from app manager
            const selectedTemplates = [];
            for (const templateId of selectedTemplateIds) {
                const template = window.appManager?.templates?.find(t => t.id === templateId);
                if (template) {
                    selectedTemplates.push(template);
                } else {
                    console.warn(`⚠️ Template not found: ${templateId}`);
                }
            }

            if (selectedTemplates.length === 0) {
                throw new Error('No valid templates found for generation');
            }

            console.log(`✅ Found ${selectedTemplates.length} valid templates for generation`);

            // Show progress section
            this.showProgressSection();

            // Generate apps
            console.log('🔄 Starting app generation...');
            const results = await this.generator.generateApps(selectedTemplates, formData);

            // Prepare Cordova build structure if enabled
            let buildResults = null;
            if (formData.enableBuildPreparation) {
                this.addLogEntry('Preparing Cordova build structures...', 'info');
                buildResults = await this.cordovaBuilder.prepareCordovaProjects(results.results, formData);

                // Update the generated apps with build-ready structure
                results.results = results.results.map((result, index) => ({
                    ...result,
                    buildReady: buildResults.results[index]
                }));
            }

            // Create GitHub repositories and push code (only if enabled and authenticated)
            let githubResults = null;
            if (formData.createGitHubRepos && this.github.isAuthenticated) {
                console.log('🔄 Creating GitHub repositories...');
                this.addLogEntry('Creating GitHub repositories...', 'info');
                githubResults = await this.github.createAndPushApps(results.results);
            } else if (formData.createGitHubRepos && !this.github.isAuthenticated) {
                console.warn('⚠️ GitHub repository creation requested but not authenticated');
                this.addLogEntry('Skipping GitHub repository creation - not authenticated', 'warning');
                githubResults = { skipped: true, reason: 'Not authenticated with GitHub' };
            } else {
                console.log('ℹ️ GitHub repository creation disabled');
                githubResults = { skipped: true, reason: 'GitHub repository creation disabled' };
            }

            // Codemagic integration if enabled
            let codemagicResults = null;
            if (formData.enableCodemagicIntegration) {
                if (githubResults && !githubResults.skipped) {
                    codemagicResults = await this.integrateWithCodemagic(githubResults, formData);
                } else {
                    console.warn('⚠️ Codemagic integration skipped - no GitHub repositories created');
                    this.addLogEntry('Skipping Codemagic integration - no GitHub repositories', 'warning');
                    codemagicResults = { skipped: true, reason: 'No GitHub repositories available' };
                }
            }

            // Store results
            this.generationResults = {
                ...results,
                githubResults,
                buildResults,
                codemagicResults
            };

            // Show results
            this.showResults();

        } catch (error) {
            console.error('Generation failed:', error);
            this.ui.showToast(`Generation failed: ${error.message}`, 'error');
            this.hideProgressSection();
        } finally {
            this.isGenerating = false;
        }
    }

    // Validate form data
    validateFormData(formData) {
        // Always required fields
        const alwaysRequired = ['packagePrefix', 'authorName', 'authorEmail'];

        for (const field of alwaysRequired) {
            if (!formData[field] || !formData[field].trim()) {
                this.showToast(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`, 'error');
                return false;
            }
        }

        // Validate GitHub credentials only if GitHub features are enabled
        const needsGitHub = formData.createGitHubRepos || formData.pushToGitHub || formData.enableCodemagicIntegration;

        if (needsGitHub) {
            if (!formData.githubUsername || !formData.githubUsername.trim()) {
                this.showToast('GitHub username is required for GitHub integration features', 'error');
                return false;
            }

            if (!formData.githubToken || !formData.githubToken.trim()) {
                this.showToast('GitHub personal access token is required for GitHub integration features', 'error');
                return false;
            }

            // Validate GitHub token format
            if (!formData.githubToken.startsWith('ghp_') && !formData.githubToken.startsWith('github_pat_')) {
                this.showToast('Please enter a valid GitHub personal access token (starts with ghp_ or github_pat_)', 'error');
                return false;
            }
        }

        // Validate email
        if (!this.isValidEmail(formData.authorEmail)) {
            this.showToast('Please enter a valid email address', 'error');
            return false;
        }

        // Validate package prefix
        if (!this.isValidPackageName(formData.packagePrefix)) {
            this.showToast('Please enter a valid package prefix (e.g., com.yourname)', 'error');
            return false;
        }

        return true;
    }

    // Validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate package name format
    isValidPackageName(packageName) {
        const packageRegex = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
        return packageRegex.test(packageName);
    }

    // Authenticate with GitHub
    async authenticateGitHub(username, token) {
        try {
            await this.github.authenticate(username, token);

            // Validate token permissions
            const permissions = await this.github.validateTokenPermissions();

            this.ui.showToast(`GitHub authentication successful! Scopes: ${permissions.scopes.join(', ')}`, 'success');
        } catch (error) {
            throw new Error(`GitHub authentication failed: ${error.message}`);
        }
    }

    // Show progress section
    showProgressSection() {
        const progressSection = document.getElementById('progressSection');
        const resultsSection = document.getElementById('resultsSection');
        
        if (progressSection) {
            progressSection.style.display = 'block';
            progressSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }

        // Reset progress
        this.updateProgress(0, 'Initializing...');
    }

    // Hide progress section
    hideProgressSection() {
        const progressSection = document.getElementById('progressSection');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }

    // Show results section
    showResults() {
        const progressSection = document.getElementById('progressSection');
        const resultsSection = document.getElementById('resultsSection');
        
        if (progressSection) {
            progressSection.style.display = 'none';
        }
        
        if (resultsSection) {
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }

        this.renderResults();
    }

    // Render results
    renderResults() {
        const resultsGrid = document.getElementById('resultsGrid');
        if (!resultsGrid || !this.generationResults) return;

        const { results, githubResults, codemagicResults } = this.generationResults;
        
        resultsGrid.innerHTML = results.map((result, index) => {
            const githubResult = githubResults[index];
            const codemagicResult = codemagicResults?.[index];
            const buildResult = result.buildReady;
            const isSuccess = result.success && githubResult?.success;
            const isBuildReady = buildResult && buildResult.success;
            const isCodemagicReady = codemagicResult && codemagicResult.success;

            return `
                <div class="result-card ${isSuccess ? 'success' : 'error'}">
                    <div class="result-header">
                        <div class="result-status ${isSuccess ? 'success' : 'error'}"></div>
                        <div class="result-info">
                            <h4>${result.template.displayName}</h4>
                            <p>${isSuccess ? 'Generated and pushed successfully' : 'Generation failed'}</p>
                            ${isBuildReady ? '<span class="build-ready-badge">🏗️ Build Ready</span>' : ''}
                            ${isCodemagicReady ? '<span class="codemagic-ready-badge">🚀 Codemagic Ready</span>' : ''}
                        </div>
                    </div>
                    ${isSuccess ? `
                        <div class="result-details">
                            <p><strong>Repository:</strong> <a href="${githubResult.repository.htmlUrl}" target="_blank">${githubResult.repository.fullName}</a></p>
                            <p><strong>Package:</strong> ${isBuildReady ? buildResult.packageName : result.config.packageName}</p>
                            <p><strong>Plugins:</strong> ${result.template.plugins.length}</p>
                            ${isBuildReady ? '<p><strong>Cordova Structure:</strong> ✅ Ready for building</p>' : ''}
                            ${isBuildReady ? '<p><strong>Codemagic CI/CD:</strong> ✅ Configured</p>' : ''}
                            ${isCodemagicReady && codemagicResult.application ? `<p><strong>Codemagic App:</strong> ✅ <a href="https://codemagic.io/app/${codemagicResult.application.id}" target="_blank">View Project</a></p>` : ''}
                            ${isCodemagicReady && codemagicResult.build ? `<p><strong>Build Status:</strong> 🔄 <a href="${codemagicResult.build.buildUrl}" target="_blank">View Build</a></p>` : ''}
                        </div>
                        <div class="result-actions">
                            <a href="${githubResult.repository.htmlUrl}" target="_blank" class="btn btn-sm btn-primary">
                                <i class="fab fa-github"></i> View on GitHub
                            </a>
                            ${isCodemagicReady && codemagicResult.application ? `
                                <a href="https://codemagic.io/app/${codemagicResult.application.id}" target="_blank" class="btn btn-sm btn-warning">
                                    <i class="fas fa-rocket"></i> Codemagic
                                </a>
                            ` : ''}
                            ${isBuildReady ? `
                                <button class="btn btn-sm btn-success" onclick="app.showBuildInstructions('${result.template.id}')">
                                    <i class="fas fa-hammer"></i> Build Instructions
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-secondary" onclick="app.downloadApp('${result.template.id}')">
                                <i class="fas fa-download"></i> Download
                            </button>
                        </div>
                    ` : `
                        <div class="result-error">
                            <p><strong>Error:</strong> ${result.error || githubResult?.error || 'Unknown error'}</p>
                        </div>
                        <div class="result-actions">
                            <button class="btn btn-sm btn-secondary" onclick="app.retryApp('${result.template.id}')">
                                <i class="fas fa-redo"></i> Retry
                            </button>
                        </div>
                    `}
                </div>
            `;
        }).join('');

        // Update summary
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        
        this.ui.showToast(
            `Generation complete! ${successCount}/${totalCount} apps created successfully.`,
            successCount === totalCount ? 'success' : 'warning',
            8000
        );
    }

    // Update progress
    updateProgress(percentage, taskName) {
        const progressFill = document.getElementById('overallProgress');
        const progressPercentage = document.getElementById('overallPercentage');
        const currentTaskName = document.getElementById('currentTaskName');

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(percentage)}%`;
        }
        
        if (currentTaskName) {
            currentTaskName.textContent = taskName;
        }
    }

    // Add log entry
    addLogEntry(message, type = 'info') {
        const logContainer = document.getElementById('generationLog');
        if (!logContainer) return;

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    // Event handlers
    onGenerationStart(data) {
        this.addLogEntry(`Starting generation of ${data.totalApps} apps...`, 'info');
        this.updateProgress(0, 'Starting generation...');
    }

    onGenerationProgress(data) {
        this.updateProgress(data.progress, `Generating ${data.currentApp.displayName}...`);
        this.addLogEntry(`Progress: ${data.appIndex}/${data.totalApps} - ${data.currentApp.displayName}`, 'info');
    }

    onAppComplete(data) {
        this.addLogEntry(`✓ ${data.template.displayName} generated successfully`, 'success');
    }

    onAppError(data) {
        this.addLogEntry(`✗ ${data.template.displayName} failed: ${data.error.message}`, 'error');
    }

    onGenerationComplete(data) {
        this.addLogEntry(`Generation complete! ${data.successfulApps}/${data.totalApps} apps successful`, 'success');
        this.updateProgress(100, 'Generation complete!');
    }

    onGenerationError(data) {
        this.addLogEntry(`Generation failed: ${data.error.message}`, 'error');
    }

    onGenerationStep(data) {
        this.updateProgress(null, data.stepName);
    }

    onGitHubAuthSuccess(data) {
        this.addLogEntry(`GitHub authentication successful for ${data.username}`, 'success');
    }

    onGitHubAuthError(data) {
        this.addLogEntry(`GitHub authentication failed: ${data.error.message}`, 'error');
    }

    onRepoCreateSuccess(data) {
        this.addLogEntry(`✓ Repository created: ${data.repository.fullName}`, 'success');
    }

    onRepoCreateError(data) {
        this.addLogEntry(`✗ Failed to create repository: ${data.error.message}`, 'error');
    }

    onRepoPushSuccess(data) {
        this.addLogEntry(`✓ Code pushed to ${data.repository.fullName}`, 'success');
    }

    onRepoPushError(data) {
        this.addLogEntry(`✗ Failed to push code: ${data.error.message}`, 'error');
    }

    // Codemagic integration workflow
    async integrateWithCodemagic(githubResults, formData) {
        try {
            this.addLogEntry('🚀 Starting Codemagic.io integration...', 'info');

            // Authenticate with Codemagic
            await this.authenticateCodemagicWithParams(formData.codemagicApiToken, formData.codemagicTeamId);

            const codemagicResults = [];

            for (const githubResult of githubResults) {
                if (!githubResult.success) {
                    codemagicResults.push({
                        success: false,
                        error: 'GitHub repository creation failed',
                        appName: githubResult.appName
                    });
                    continue;
                }

                try {
                    // Create Codemagic application
                    const application = await this.codemagic.createApplication(
                        githubResult.repository.cloneUrl,
                        { appName: githubResult.appName }
                    );

                    // Trigger initial build
                    const build = await this.codemagic.triggerBuild(
                        application.id,
                        formData.codemagicWorkflowId || 'cordova_android_build',
                        formData.codemagicBranch || 'main'
                    );

                    codemagicResults.push({
                        success: true,
                        appName: githubResult.appName,
                        application,
                        build,
                        timestamp: new Date().toISOString()
                    });

                } catch (error) {
                    codemagicResults.push({
                        success: false,
                        error: error.message,
                        appName: githubResult.appName,
                        timestamp: new Date().toISOString()
                    });
                }
            }

            this.addLogEntry(`✓ Codemagic integration completed for ${codemagicResults.filter(r => r.success).length}/${codemagicResults.length} apps`, 'success');
            return codemagicResults;

        } catch (error) {
            this.addLogEntry(`✗ Codemagic integration failed: ${error.message}`, 'error');
            throw error;
        }
    }

    // Authenticate with Codemagic (for internal use with parameters)
    async authenticateCodemagicWithParams(apiToken, teamId) {
        if (!apiToken || !apiToken.trim() || apiToken.trim().length < 10) {
            throw new Error('Valid Codemagic API token is required');
        }

        this.addLogEntry('Authenticating with Codemagic.io...', 'info');
        const result = await this.codemagic.authenticate(apiToken.trim(), teamId?.trim() || null);
        this.addLogEntry('✓ Codemagic authentication successful', 'success');
        return result;
    }

    // Codemagic event handlers
    onCodemagicAuthSuccess(data) {
        this.addLogEntry(`✓ Codemagic authenticated (${data.appsCount} existing apps)`, 'success');
    }

    onCodemagicAuthError(data) {
        this.addLogEntry(`✗ Codemagic authentication failed: ${data.error.message}`, 'error');
    }

    onCodemagicAppCreateSuccess(data) {
        const status = data.created ? 'created' : 'found existing';
        this.addLogEntry(`✓ Codemagic app ${status}: ${data.application.appName}`, 'success');
    }

    onCodemagicAppCreateError(data) {
        this.addLogEntry(`✗ Failed to create Codemagic app ${data.appConfig.appName}: ${data.error.message}`, 'error');
    }

    onCodemagicBuildTriggerSuccess(data) {
        this.addLogEntry(`✓ Build triggered for workflow ${data.build.workflowId} (Build ID: ${data.build.buildId})`, 'success');

        // Save build to status manager and start polling
        const buildInfo = {
            buildId: data.build.buildId,
            appName: data.appName || 'Unknown App',
            applicationId: data.build.applicationId,
            status: this.buildStatusManager.STATUS.QUEUED,
            workflowId: data.build.workflowId,
            branch: data.build.branch,
            buildUrl: data.build.buildUrl,
            projectUrl: `https://codemagic.io/app/${data.build.applicationId}`,
            timestamp: new Date().toISOString(),
            startedAt: data.build.startedAt
        };

        this.buildStatusManager.saveBuild(buildInfo);
        this.buildStatusManager.startPolling(data.build.buildId);

        // Record template usage if template ID is available
        if (data.templateId) {
            this.templateManager.recordTemplateUsage(data.templateId, data.build.buildId, 'building');
        }
    }

    onCodemagicBuildTriggerError(data) {
        this.addLogEntry(`✗ Failed to trigger build: ${data.error.message}`, 'error');
    }

    // Build Status Manager event handlers
    onBuildStatusUpdated(buildData) {
        this.addLogEntry(`🔄 Build ${buildData.buildId} status: ${buildData.status}`, 'info');
        if (this.ui) {
            this.ui.updateSelectedAppsPreview();
        }
        this.emit('build:status:changed', buildData);
    }

    onBuildCompleted(buildData) {
        const statusIcon = buildData.status === this.buildStatusManager.STATUS.SUCCESS ? '✅' : '❌';
        this.addLogEntry(`${statusIcon} Build ${buildData.buildId} completed: ${buildData.status}`,
                         buildData.status === this.buildStatusManager.STATUS.SUCCESS ? 'success' : 'error');
        if (this.ui) {
            this.ui.updateSelectedAppsPreview();
        }

        // Update template usage statistics based on build result
        if (buildData.templateId) {
            const status = buildData.status === this.buildStatusManager.STATUS.SUCCESS ? 'success' : 'failed';
            this.templateManager.recordTemplateUsage(buildData.templateId, buildData.buildId, status);
        }

        this.emit('build:completed', buildData);
    }

    onBuildPollingStarted(data) {
        this.addLogEntry(`🔄 Started monitoring build ${data.buildId}`, 'info');
        this.updateBuildStatusIndicator();
    }

    onBuildPollingStopped(data) {
        this.addLogEntry(`⏹️ Stopped monitoring build ${data.buildId}`, 'info');
        this.updateBuildStatusIndicator();
    }

    // Update build status indicator
    updateBuildStatusIndicator() {
        const indicator = document.getElementById('buildStatusIndicator');
        const statusText = document.getElementById('buildStatusText');

        if (!indicator || !statusText) return;

        const activeBuilds = this.buildStatusManager.activePolling.size;

        if (activeBuilds > 0) {
            indicator.style.display = 'flex';
            statusText.textContent = `Monitoring ${activeBuilds} build${activeBuilds > 1 ? 's' : ''}...`;
        } else {
            indicator.style.display = 'none';
        }
    }

    // Cordova Builder event handlers
    onBuildStart(data) {
        this.addLogEntry(`🏗️ Starting Cordova build preparation for ${data.totalApps} apps...`, 'info');
    }

    onBuildProgress(data) {
        this.addLogEntry(`🔨 Preparing Cordova structure: ${data.currentApp} (${data.appIndex}/${data.totalApps})`, 'info');
    }

    onBuildAppComplete(data) {
        this.addLogEntry(`✅ Cordova structure ready: ${data.app.displayName}`, 'success');
    }

    onBuildAppError(data) {
        this.addLogEntry(`❌ Cordova preparation failed: ${data.app.displayName} - ${data.error.message}`, 'error');
    }

    onBuildComplete(data) {
        this.addLogEntry(`🎉 Cordova build preparation complete! ${data.successfulBuilds}/${data.totalApps} apps ready`, 'success');
    }

    onBuildError(data) {
        this.addLogEntry(`❌ Cordova build preparation failed: ${data.error.message}`, 'error');
    }

    onBuildStep(data) {
        this.addLogEntry(`🔧 ${data.appName}: ${data.step}`, 'info');
    }

    // Show build instructions for a specific app
    showBuildInstructions(templateId) {
        if (!this.generationResults) return;

        const result = this.generationResults.results.find(r => r.template.id === templateId);
        if (!result || !result.buildReady) return;

        const buildResult = result.buildReady;
        const appName = result.template.displayName;
        const packageName = buildResult.packageName;

        // Get repository URL from GitHub results
        const githubResults = this.generationResults.githubResults || [];
        const githubResult = githubResults.find(gr => gr.appName === result.template.name);
        const repositoryUrl = githubResult?.repository?.cloneUrl || 'YOUR_REPOSITORY_URL';

        const instructions = `# 🏗️ Build Instructions for ${appName}

## 📋 Project Information
- **Package Name:** ${packageName}
- **Cordova Structure:** ✅ Ready for building
- **Codemagic CI/CD:** ✅ Configured
- **Plugins:** ${result.template.plugins.length} configured
- **Repository:** ${repositoryUrl}

## 🚀 Quick Start Commands

### 1. Clone and Setup:
\`\`\`bash
# Clone the repository
git clone ${repositoryUrl}
cd ${result.template.name}

# Install dependencies
npm install

# Add Android platform
cordova platform add android
\`\`\`

### 2. Development Build:
\`\`\`bash
# Build for development
cordova build android

# Run on connected device/emulator
cordova run android

# Run with live reload
cordova run android --livereload
\`\`\`

### 3. Production Build:
\`\`\`bash
# Build for release (unsigned)
cordova build android --release

# Build with specific configuration
cordova build android --release --buildConfig=build.json
\`\`\`

## 🔧 Advanced Commands

### Platform Management:
\`\`\`bash
# List installed platforms
cordova platform list

# Remove and re-add platform (clean build)
cordova platform remove android
cordova platform add android

# Update platform
cordova platform update android
\`\`\`

### Plugin Management:
\`\`\`bash
# List installed plugins
cordova plugin list

# Add a plugin
cordova plugin add cordova-plugin-camera

# Remove a plugin
cordova plugin remove cordova-plugin-camera
\`\`\`

### Debugging:
\`\`\`bash
# Enable verbose logging
cordova build android --verbose

# Clean build
cordova clean android

# Check requirements
cordova requirements android
\`\`\`

## 🏗️ CI/CD with Codemagic

This project is configured for automatic builds with Codemagic.io:

1. **Automatic Builds:** Push to main branch triggers builds
2. **Build Configuration:** Uses codemagic.yaml in repository root
3. **Artifacts:** APK/AAB files available after successful builds
4. **Notifications:** Build status sent via email/Slack

### Manual Trigger:
Visit your Codemagic dashboard to manually trigger builds or modify settings.

## 📱 Build Outputs

After successful build, find your files at:

### Debug Build:
- **APK:** \`platforms/android/app/build/outputs/apk/debug/app-debug.apk\`
- **Size:** ~5-15 MB (includes debug symbols)
- **Use:** Testing and development

### Release Build:
- **APK:** \`platforms/android/app/build/outputs/apk/release/app-release.apk\`
- **AAB:** \`platforms/android/app/build/outputs/bundle/release/app-release.aab\`
- **Size:** ~3-10 MB (optimized)
- **Use:** Production deployment

## 🔐 Code Signing (Production)

For production releases, you'll need to sign your APK:

1. **Generate Keystore:**
\`\`\`bash
keytool -genkey -v -keystore my-release-key.keystore -alias alias_name -keyalg RSA -keysize 2048 -validity 10000
\`\`\`

2. **Create build.json:**
\`\`\`json
{
  "android": {
    "release": {
      "keystore": "my-release-key.keystore",
      "storePassword": "password",
      "alias": "alias_name",
      "password": "password"
    }
  }
}
\`\`\`

3. **Build Signed APK:**
\`\`\`bash
cordova build android --release --buildConfig=build.json
\`\`\`

## 🐛 Troubleshooting

### Common Issues:

**Build Fails:**
- Run \`cordova clean android\`
- Check \`cordova requirements android\`
- Update Android SDK/Build Tools

**Plugin Errors:**
- Remove and re-add problematic plugins
- Check plugin compatibility with Cordova version

**Gradle Issues:**
- Update Android platform: \`cordova platform update android\`
- Clear Gradle cache: \`./gradlew clean\` in platforms/android/

**Device Not Detected:**
- Enable USB Debugging on device
- Install device drivers
- Check \`adb devices\`

### Getting Help:
- Check Cordova documentation: https://cordova.apache.org/docs/
- Visit Codemagic docs: https://docs.codemagic.io/
- Community support: https://github.com/apache/cordova

---
Generated by Cordova App Generator - Happy Building! 🎉`;

        // Create and show modal with instructions
        this.showInstructionsModal(appName, instructions);
    }

    // Show instructions in a modal
    showInstructionsModal(title, content) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('buildInstructionsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'buildInstructionsModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 id="instructionsTitle">${title}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                        <pre id="instructionsContent" style="background: #2d3748; color: #e2e8f0; padding: 20px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; font-size: 13px; line-height: 1.5; font-family: 'Consolas', 'Monaco', 'Courier New', monospace;">${content}</pre>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="app.copyInstructions()">Copy Instructions</button>
                        <button class="btn btn-primary" onclick="app.closeInstructionsModal()">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Add event listeners
            modal.querySelector('.modal-close').addEventListener('click', () => {
                modal.classList.remove('show');
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        } else {
            // Update existing modal
            modal.querySelector('#instructionsTitle').textContent = title;
            modal.querySelector('#instructionsContent').textContent = content;
        }

        // Show modal
        modal.classList.add('show');
    }

    // Copy instructions to clipboard
    copyInstructions() {
        const content = document.getElementById('instructionsContent').textContent;
        navigator.clipboard.writeText(content).then(() => {
            this.ui.showToast('Build instructions copied to clipboard!', 'success');
        }).catch(() => {
            this.ui.showToast('Failed to copy instructions', 'error');
        });
    }

    // Close instructions modal
    closeInstructionsModal() {
        const modal = document.getElementById('buildInstructionsModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    // Cancel generation
    cancelGeneration() {
        if (this.isGenerating) {
            this.generator.cancelGeneration();
            this.isGenerating = false;
            this.hideProgressSection();
            this.ui.showToast('Generation cancelled', 'info');
            this.addLogEntry('Generation cancelled by user', 'warning');
        }
    }

    // Download all apps
    downloadAllApps() {
        if (!this.generationResults) {
            this.ui.showToast('No apps to download', 'warning');
            return;
        }

        // Generate deployment script
        const repositories = this.generationResults.githubResults
            .filter(r => r.success)
            .map(r => r.repository);
            
        const config = this.ui.getFormData();
        const deploymentScript = this.github.generateDeploymentScript(repositories, config);
        
        // Download deployment script
        const blob = new Blob([deploymentScript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'deploy-cordova-apps.sh';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.ui.showToast('Deployment script downloaded!', 'success');
    }

    // View on GitHub
    viewOnGitHub() {
        if (!this.generationResults) {
            this.ui.showToast('No repositories to view', 'warning');
            return;
        }

        const repositories = this.generationResults.githubResults
            .filter(r => r.success)
            .map(r => r.repository);

        if (repositories.length === 0) {
            this.ui.showToast('No successful repositories to view', 'warning');
            return;
        }

        // Open first repository or user profile
        const url = repositories.length === 1 
            ? repositories[0].htmlUrl 
            : `https://github.com/${this.ui.getFormData().githubUsername}`;
            
        window.open(url, '_blank');
    }

    // Download individual app
    downloadApp(templateId) {
        if (!this.generationResults) return;

        const result = this.generationResults.results.find(r => r.template.id === templateId);
        if (!result) return;

        // Create ZIP-like structure (simulated)
        const files = result.files;
        const zipContent = Object.entries(files).map(([path, content]) => 
            `// File: ${path}\n${content}\n\n`
        ).join('');

        const blob = new Blob([zipContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.template.name}-source.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.ui.showToast(`${result.template.displayName} source downloaded!`, 'success');
    }

    // Retry individual app
    async retryApp(templateId) {
        const template = this.templatesManager.getTemplate(templateId);
        if (!template) return;

        try {
            const formData = this.ui.getFormData();
            this.ui.showToast(`Retrying ${template.displayName}...`, 'info');
            
            // Generate single app
            const result = await this.generator.generateSingleApp(template, formData);
            
            // Create repository and push
            const repository = await this.github.createRepository(result.config);
            await this.github.pushCode(repository, result);

            this.ui.showToast(`${template.displayName} generated successfully!`, 'success');
            
            // Update results if needed
            // This would require more complex state management in a real app
            
        } catch (error) {
            this.ui.showToast(`Failed to retry ${template.displayName}: ${error.message}`, 'error');
        }
    }

    // Get application statistics
    getStatistics() {
        const templateStats = this.templatesManager.getStatistics();
        const generationStats = this.generationResults ? {
            totalGenerated: this.generationResults.results.length,
            successful: this.generationResults.results.filter(r => r.success).length,
            failed: this.generationResults.results.filter(r => !r.success).length,
            githubRepos: this.generationResults.githubResults.filter(r => r.success).length
        } : null;

        return {
            templates: templateStats,
            generation: generationStats,
            ui: {
                selectedTemplates: this.ui.getSelectedTemplates().length
            }
        };
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.cordovaAppGenerator = new CordovaAppGeneratorApp();
    } catch (error) {
        console.error('Failed to initialize Cordova App Generator:', error);

        // Show error message to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #f44336;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        errorDiv.textContent = 'Failed to initialize application. Please refresh the page.';
        document.body.appendChild(errorDiv);

        // Auto-remove error after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 10000);
    }
});

// Handle page unload
window.addEventListener('beforeunload', (e) => {
    if (window.cordovaAppGenerator?.isGenerating) {
        e.preventDefault();
        // Modern browsers use the return value, older ones use returnValue
        const message = 'Generation is in progress. Are you sure you want to leave?';
        e.returnValue = message; // For older browsers
        return message; // For modern browsers
    }
});
