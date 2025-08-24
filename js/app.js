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
            // Initialize core modules first (without UI dependencies)
            this.templatesManager = new AppTemplatesManager();
            this.generator = new CordovaAppGenerator();
            this.github = new GitHubIntegration();
            this.cordovaBuilder = new CordovaBuildPreparation();

            // Make core modules globally available before UI initialization
            window.templatesManager = this.templatesManager;
            window.generator = this.generator;
            window.github = this.github;
            window.cordovaBuilder = this.cordovaBuilder;
            window.app = this;

            // Wait for DOM to be ready before initializing UI
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Initialize UI after core modules and DOM are ready
            this.ui = new UIManager();
            window.ui = this.ui;

            // Setup event listeners
            this.setupEventListeners();

            // Initialize UI with templates
            await this.initializeUI();

            console.log('Cordova App Generator initialized successfully');
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

            // Store results
            this.generationResults = {
                ...results,
                githubResults,
                buildResults
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

        const { results, githubResults } = this.generationResults;
        
        resultsGrid.innerHTML = results.map((result, index) => {
            const githubResult = githubResults[index];
            const buildResult = result.buildReady;
            const isSuccess = result.success && githubResult?.success;
            const isBuildReady = buildResult && buildResult.success;

            return `
                <div class="result-card ${isSuccess ? 'success' : 'error'}">
                    <div class="result-header">
                        <div class="result-status ${isSuccess ? 'success' : 'error'}"></div>
                        <div class="result-info">
                            <h4>${result.template.displayName}</h4>
                            <p>${isSuccess ? 'Generated and pushed successfully' : 'Generation failed'}</p>
                            ${isBuildReady ? '<span class="build-ready-badge">🏗️ Build Ready</span>' : ''}
                        </div>
                    </div>
                    ${isSuccess ? `
                        <div class="result-details">
                            <p><strong>Repository:</strong> <a href="${githubResult.repository.htmlUrl}" target="_blank">${githubResult.repository.fullName}</a></p>
                            <p><strong>Package:</strong> ${isBuildReady ? buildResult.packageName : result.config.packageName}</p>
                            <p><strong>Plugins:</strong> ${result.template.plugins.length}</p>
                            ${isBuildReady ? '<p><strong>Cordova Structure:</strong> ✅ Ready for building</p>' : ''}
                            ${isBuildReady ? '<p><strong>Codemagic CI/CD:</strong> ✅ Configured</p>' : ''}
                        </div>
                        <div class="result-actions">
                            <a href="${githubResult.repository.htmlUrl}" target="_blank" class="btn btn-sm btn-primary">
                                <i class="fab fa-github"></i> View on GitHub
                            </a>
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

        const instructions = `
# 🏗️ Build Instructions for ${appName}

## Quick Start Commands

### Clone and Build:
\`\`\`bash
git clone ${result.repositoryUrl || 'YOUR_REPOSITORY_URL'}
cd ${result.template.name}
npm install
cordova platform add android
cordova build android
\`\`\`

### Run on Device:
\`\`\`bash
cordova run android
\`\`\`

### Build for Release:
\`\`\`bash
cordova build android --release
\`\`\`

## Project Details
- **Package Name:** ${packageName}
- **Cordova Structure:** ✅ Ready
- **Codemagic CI/CD:** ✅ Configured
- **Plugins:** ${result.template.plugins.length} configured

## CI/CD with Codemagic
1. Connect repository to Codemagic.io
2. Build will run automatically using codemagic.yaml
3. Download APK/AAB from artifacts

## Build Outputs
- **Debug APK:** platforms/android/app/build/outputs/apk/debug/app-debug.apk
- **Release APK:** platforms/android/app/build/outputs/apk/release/app-release.apk
- **Release AAB:** platforms/android/app/build/outputs/bundle/release/app-release.aab
        `;

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
                    <div class="modal-body">
                        <pre id="instructionsContent" style="background: #2d3748; color: #e2e8f0; padding: 20px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; font-size: 14px;">${content}</pre>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.copyInstructions()">Copy Instructions</button>
                        <button class="btn btn-primary" onclick="this.closeInstructionsModal()">Close</button>
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
