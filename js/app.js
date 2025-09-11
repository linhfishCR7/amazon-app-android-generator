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
        this.eventListeners = new Map(); // Add event system
        this.init();
    }

    // Event system implementation
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        try {
            if (this.eventListeners.has(event)) {
                this.eventListeners.get(event).forEach(callback => {
                    try {
                        callback(data);
                    } catch (callbackError) {
                        console.error(`Error in event callback for '${event}':`, callbackError);
                        // Don't let callback errors break the event system
                    }
                });
            }
        } catch (error) {
            console.error(`Error emitting event '${event}':`, error);
        }
    }

    // Remove event listener
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    async init() {
        try {
            // Initialize core modules first (without UI dependencies)
            this.templatesManager = new AppTemplatesManager();
            this.templateManager = new TemplateManager();
            this.generator = new CordovaAppGenerator();
            this.github = new GitHubIntegration();
            this.codemagic = new CodemagicIntegration();
            this.cordovaBuilder = new CordovaBuildPreparation();
            this.buildStatusManager = new BuildStatusManager();

            // Connect build status manager with Codemagic integration
            this.buildStatusManager.setCodemagicIntegration(this.codemagic);

            // Make core modules globally available before UI initialization
            window.templatesManager = this.templatesManager;
            window.templateManager = this.templateManager;
            window.generator = this.generator;
            window.github = this.github;
            window.githubIntegration = this.github; // Add alias for consistency
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

            // Initialize UI after core modules and DOM are ready
            this.ui = new UIManager();

            // Make UI manager globally available
            window.uiManager = this.ui;
            window.ui = this.ui; // Keep both for compatibility
            window.ui = this.ui;

            // Setup event listeners
            this.setupEventListeners();

            // Initialize UI with templates
            await this.initializeUI();

            // Start polling for active builds after initialization
            setTimeout(() => {
                this.buildStatusManager.startPollingActiveBuilds();
            }, 2000);

            // Application initialized successfully
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.ui?.showToast('Failed to initialize application', 'error');
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
        if (this.isGenerating) {
            this.ui.showToast('Generation already in progress', 'warning');
            return;
        }

        const selectedTemplateIds = this.ui.getSelectedTemplates();
        if (selectedTemplateIds.length === 0) {
            this.ui.showToast('Please select at least one app template', 'warning');
            return;
        }

        const formData = this.ui.getFormData();
        
        // Validate form data
        if (!this.validateFormData(formData)) {
            return;
        }

        try {
            this.isGenerating = true;
            
            // Get selected templates
            const selectedTemplates = selectedTemplateIds.map(id => 
                this.templatesManager.getTemplate(id)
            ).filter(Boolean);

            // Show progress section
            this.showProgressSection();

            // Authenticate with GitHub
            await this.authenticateGitHub(formData.githubUsername, formData.githubToken);

            // Generate apps
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

            // Create GitHub repositories and push code
            const githubResults = await this.github.createAndPushApps(results.results);

            // Codemagic integration if enabled
            let codemagicResults = null;
            if (formData.enableCodemagicIntegration) {
                codemagicResults = await this.integrateWithCodemagic(githubResults, formData);
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
        const required = ['githubUsername', 'githubToken', 'packagePrefix', 'authorName', 'authorEmail'];

        for (const field of required) {
            if (!formData[field] || !formData[field].trim()) {
                this.ui.showToast(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`, 'error');
                return false;
            }
        }

        // Validate GitHub token format
        if (!formData.githubToken.startsWith('ghp_') && !formData.githubToken.startsWith('github_pat_')) {
            this.ui.showToast('Please enter a valid GitHub personal access token (starts with ghp_ or github_pat_)', 'error');
            return false;
        }

        // Validate email
        if (!this.ui.isValidEmail(formData.authorEmail)) {
            this.ui.showToast('Please enter a valid email address', 'error');
            return false;
        }

        // Validate package prefix
        if (!this.ui.isValidPackageName(formData.packagePrefix)) {
            this.ui.showToast('Please enter a valid package prefix (e.g., com.yourname)', 'error');
            return false;
        }

        return true;
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
                            <a href="https://linhfishcr7.github.io/${githubResult.repository.name}/www" target="_blank" class="btn btn-sm btn-primary">
                                <i class="fab fa-github"></i> View GitHub Page
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

    // Codemagic integration workflow with improved error handling
    async integrateWithCodemagic(githubResults, formData) {
        try {
            this.addLogEntry('🚀 Starting Codemagic.io integration...', 'info');

            // Authenticate with Codemagic with CORS error handling
            let authSuccess = false;
            try {
                await this.authenticateCodemagic(formData.codemagicApiToken, formData.codemagicTeamId);
                authSuccess = true;
            } catch (authError) {
                if (authError.isCorsError || authError.message.includes('CORS')) {
                    this.addLogEntry('⚠️ Codemagic API not accessible from localhost due to CORS restrictions', 'warning');
                    this.addLogEntry('📋 Your GitHub repositories have been created successfully!', 'success');
                    this.addLogEntry('🚀 To enable Codemagic integration, choose one of these options:', 'info');
                    this.addLogEntry('   • Deploy this app to a web server (GitHub Pages, Netlify, Vercel)', 'info');
                    this.addLogEntry('   • Use Codemagic dashboard directly to connect your repositories', 'info');
                    this.addLogEntry('   • Set up a local proxy server to bypass CORS', 'info');
                    this.addLogEntry('💡 Your apps are ready for manual Codemagic setup!', 'info');

                    // Return partial results indicating CORS limitation
                    return githubResults.map(result => ({
                        success: false,
                        error: 'CORS_LIMITATION',
                        message: 'Codemagic integration not available from localhost',
                        appName: result.appName || 'Unknown',
                        corsLimited: true,
                        githubSuccess: result.success,
                        repository: result.repository,
                        alternativeInstructions: [
                            'Your GitHub repository is ready for Codemagic integration',
                            'Visit https://codemagic.io/apps to manually add your repository',
                            'Use the repository URL: ' + (result.repository?.cloneUrl || 'N/A')
                        ]
                    }));
                }
                throw authError;
            }

            const codemagicResults = [];

            for (const githubResult of githubResults) {
                // Determine app name with proper fallback hierarchy
                let appName = 'Cordova App'; // Default fallback
                if (githubResult.app?.displayName) {
                    appName = githubResult.app.displayName;
                } else if (githubResult.app?.appName) {
                    appName = githubResult.app.appName;
                } else if (githubResult.repository?.originalAppName) {
                    appName = githubResult.repository.originalAppName;
                } else if (githubResult.repository?.name) {
                    // Convert repository name back to readable format
                    appName = githubResult.repository.name
                        .replace(/-/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase());
                }

                if (!githubResult.success) {
                    codemagicResults.push({
                        success: false,
                        error: 'GitHub repository creation failed',
                        appName: appName
                    });
                    continue;
                }

                try {
                    this.addLogEntry(`🔗 Creating Codemagic application for ${appName}...`, 'info');

                    // Create Codemagic application
                    const application = await this.codemagic.createApplication(
                        githubResult.repository.cloneUrl,
                        {
                            appName: appName,
                            repositoryName: githubResult.repository.name,
                            originalAppName: githubResult.repository.originalAppName
                        }
                    );

                    // Trigger initial build
                    this.addLogEntry(`🚀 Triggering initial build for ${appName}...`, 'info');
                    const build = await this.codemagic.triggerBuild(
                        application.id,
                        formData.codemagicWorkflowId || 'cordova_android_build',
                        formData.codemagicBranch || 'main'
                    );

                    codemagicResults.push({
                        success: true,
                        appName: appName,
                        application,
                        build,
                        repository: githubResult.repository,
                        timestamp: new Date().toISOString()
                    });

                    this.addLogEntry(`✅ Codemagic integration complete for ${appName}`, 'success');

                } catch (error) {
                    let errorMessage = error.message;
                    let errorType = 'integration_error';

                    // Handle specific error types
                    if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                        errorMessage = 'API not accessible from localhost (CORS restriction)';
                        errorType = 'cors_error';
                    } else if (error.message.includes('422')) {
                        errorMessage = 'Repository validation failed - check repository URL and permissions';
                        errorType = 'validation_error';
                    } else if (error.message.includes('401')) {
                        errorMessage = 'Authentication failed - check API token';
                        errorType = 'auth_error';
                    }

                    this.addLogEntry(`❌ Codemagic integration failed for ${appName}: ${errorMessage}`, 'error');

                    codemagicResults.push({
                        success: false,
                        error: errorMessage,
                        errorType: errorType,
                        appName: appName,
                        repository: githubResult.repository,
                        originalError: error.message
                    });
                }
            }

            // Log summary
            const successCount = codemagicResults.filter(r => r.success).length;
            const totalCount = codemagicResults.length;

            if (successCount === totalCount) {
                this.addLogEntry(`🎉 Codemagic integration completed successfully for all ${totalCount} apps`, 'success');
            } else if (successCount > 0) {
                this.addLogEntry(`⚠️ Codemagic integration partially successful: ${successCount}/${totalCount} apps`, 'warning');
            } else {
                this.addLogEntry(`❌ Codemagic integration failed for all apps`, 'error');
            }

            return codemagicResults;

        } catch (error) {
            // Handle global integration errors
            let errorMessage = error.message;
            if (error.isCorsError || error.message.includes('CORS')) {
                errorMessage = 'Codemagic API not accessible from localhost due to browser security restrictions';
            }

            this.addLogEntry(`❌ Codemagic integration failed: ${errorMessage}`, 'error');
            throw error;
        }
    }

    // Authenticate with Codemagic
    async authenticateCodemagic(apiToken, teamId) {
        if (!apiToken || !apiToken.trim()) {
            throw new Error('Codemagic API token is required');
        }

        this.addLogEntry('Authenticating with Codemagic.io...', 'info');
        await this.codemagic.authenticate(apiToken.trim(), teamId?.trim() || null);
        this.addLogEntry('✓ Codemagic authentication successful', 'success');
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
        // Determine app name with proper fallback hierarchy
        let appName = 'Cordova App'; // Default fallback
        if (data.appName && data.appName.trim()) {
            appName = data.appName.trim();
        } else if (data.app && data.app.displayName) {
            appName = data.app.displayName;
        } else if (data.app && data.app.appName) {
            appName = data.app.appName;
        } else if (data.repository && data.repository.originalAppName) {
            appName = data.repository.originalAppName;
        } else if (data.repository && data.repository.name) {
            // Convert repository name back to readable format
            appName = data.repository.name
                .replace(/-/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
        }

        console.log(`📝 Build app name: "${data.appName}" → "${appName}"`);

        const buildInfo = {
            buildId: data.build.buildId,
            appName: appName,
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
        try {
            // Validate buildData
            if (!buildData || !buildData.buildId) {
                console.warn('Invalid build data received in onBuildStatusUpdated:', buildData);
                return;
            }

            const buildId = buildData.buildId || 'unknown';
            const status = buildData.status || 'unknown';

            this.addLogEntry(`🔄 Build ${buildId} status: ${status}`, 'info');

            // Update UI if available
            if (this.ui && typeof this.ui.updateSelectedAppsPreview === 'function') {
                try {
                    this.ui.updateSelectedAppsPreview();
                } catch (uiError) {
                    console.error('Error updating UI in onBuildStatusUpdated:', uiError);
                }
            }

            // Emit event with error handling
            this.emit('build:status:changed', buildData);

        } catch (error) {
            console.error('Error in onBuildStatusUpdated:', error);
            // Try to log the error if possible
            if (this.addLogEntry) {
                this.addLogEntry(`❌ Error processing build status update: ${error.message}`, 'error');
            }
        }
    }

    onBuildCompleted(buildData) {
        try {
            // Validate buildData
            if (!buildData || !buildData.buildId) {
                console.warn('Invalid build data received in onBuildCompleted:', buildData);
                return;
            }

            const buildId = buildData.buildId || 'unknown';
            const status = buildData.status || 'unknown';
            const isSuccess = this.buildStatusManager &&
                             this.buildStatusManager.STATUS &&
                             status === this.buildStatusManager.STATUS.SUCCESS;

            const statusIcon = isSuccess ? '✅' : '❌';
            const logLevel = isSuccess ? 'success' : 'error';

            this.addLogEntry(`${statusIcon} Build ${buildId} completed: ${status}`, logLevel);

            // Update UI if available
            if (this.ui && typeof this.ui.updateSelectedAppsPreview === 'function') {
                try {
                    this.ui.updateSelectedAppsPreview();
                } catch (uiError) {
                    console.error('Error updating UI in onBuildCompleted:', uiError);
                }

        this.emit('build:completed', buildData);
            }

            // Update template usage statistics based on build result
            if (buildData.templateId && this.templateManager &&
                typeof this.templateManager.recordTemplateUsage === 'function') {
                try {
                    const usageStatus = isSuccess ? 'success' : 'failed';
                    this.templateManager.recordTemplateUsage(buildData.templateId, buildId, usageStatus);
                } catch (templateError) {
                    console.error('Error recording template usage:', templateError);
                }
            }

            // Emit completion event
            this.emit('build:completed', buildData);

        } catch (error) {
            console.error('Error in onBuildCompleted:', error);
            if (this.addLogEntry) {
                this.addLogEntry(`❌ Error processing build completion: ${error.message}`, 'error');
            }
        }
    }

    onBuildPollingStarted(data) {
        try {
            const buildId = data?.buildId || 'unknown';
            this.addLogEntry(`🔄 Started monitoring build ${buildId}`, 'info');

            if (typeof this.updateBuildStatusIndicator === 'function') {
                this.updateBuildStatusIndicator();
            }

            this.emit('build:polling:started', data);

        } catch (error) {
            console.error('Error in onBuildPollingStarted:', error);
            if (this.addLogEntry) {
                this.addLogEntry(`❌ Error starting build monitoring: ${error.message}`, 'error');
            }
        }
    }

    onBuildPollingStopped(data) {
        try {
            const buildId = data?.buildId || 'unknown';
            this.addLogEntry(`⏹️ Stopped monitoring build ${buildId}`, 'info');

            if (typeof this.updateBuildStatusIndicator === 'function') {
                this.updateBuildStatusIndicator();
            }

            this.emit('build:polling:stopped', data);

        } catch (error) {
            console.error('Error in onBuildPollingStopped:', error);
            if (this.addLogEntry) {
                this.addLogEntry(`❌ Error stopping build monitoring: ${error.message}`, 'error');
            }
        }
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
