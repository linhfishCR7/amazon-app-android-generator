/**
 * GitHub Integration Module
 * Handles GitHub repository creation and code pushing functionality
 */

class GitHubIntegration {
    constructor() {
        this.isAuthenticated = false;
        this.username = null;
        this.token = null;
        this.apiBase = 'https://api.github.com';
        this.eventListeners = new Map();
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

    // Validate GitHub token permissions
    async validateTokenPermissions() {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated');
        }

        try {
            // Check token scopes
            const response = await fetch(`${this.apiBase}/user`, {
                method: 'HEAD',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Cordova-App-Generator/1.0.0'
                }
            });

            if (!response.ok) {
                throw new Error(`Token validation failed: ${response.status}`);
            }

            const scopes = response.headers.get('X-OAuth-Scopes') || '';
            const requiredScopes = ['repo', 'public_repo'];
            const hasRequiredScopes = requiredScopes.some(scope => scopes.includes(scope));

            if (!hasRequiredScopes) {
                throw new Error(`Token missing required scopes. Required: ${requiredScopes.join(' or ')}. Current: ${scopes}`);
            }

            return {
                valid: true,
                scopes: scopes.split(', ').filter(s => s),
                hasRepoAccess: scopes.includes('repo') || scopes.includes('public_repo')
            };

        } catch (error) {
            throw new Error(`Token validation failed: ${error.message}`);
        }
    }

    // Authenticate with GitHub using personal access token
    async authenticate(username, token = null) {
        try {
            this.emit('auth:start', { username });

            if (!username || !username.trim()) {
                throw new Error('Username is required');
            }

            if (!token || !token.trim()) {
                throw new Error('GitHub personal access token is required');
            }

            // Validate token by making a test API call
            const response = await fetch(`${this.apiBase}/user`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Cordova-App-Generator/1.0.0'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Invalid GitHub token. Please check your personal access token.');
                } else if (response.status === 403) {
                    throw new Error('GitHub API rate limit exceeded or insufficient permissions.');
                } else {
                    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
                }
            }

            const userData = await response.json();

            // Verify the username matches
            if (userData.login.toLowerCase() !== username.toLowerCase()) {
                // Use the actual username from the token for consistency
                username = userData.login;
                // Notify user of the correction if needed
                if (window.showStatus) {
                    window.showStatus(`Using GitHub username: ${username}`, 'info');
                }
            }

            this.isAuthenticated = true;
            this.username = username;
            this.token = token;
            this.userData = userData;

            this.emit('auth:success', { username, userData });
            return true;

        } catch (error) {
            this.isAuthenticated = false;
            this.username = null;
            this.token = null;
            this.emit('auth:error', { error });
            throw error;
        }
    }

    // Create GitHub repository
    async createRepository(appConfig) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated with GitHub');
        }

        try {
            this.emit('repo:create:start', { appName: appConfig.appName });

            // Check if repository already exists
            const existsResponse = await fetch(`${this.apiBase}/repos/${this.username}/${appConfig.appName}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Cordova-App-Generator/1.0.0'
                }
            });

            if (existsResponse.ok) {
                // Repository already exists, return existing repo info
                const existingRepo = await existsResponse.json();
                const repository = {
                    name: existingRepo.name,
                    fullName: existingRepo.full_name,
                    description: existingRepo.description,
                    private: existingRepo.private,
                    htmlUrl: existingRepo.html_url,
                    cloneUrl: existingRepo.clone_url,
                    sshUrl: existingRepo.ssh_url,
                    created: false, // Not created, already existed
                    timestamp: new Date().toISOString(),
                    existing: true
                };

                this.emit('repo:create:success', { repository, appConfig });
                return repository;
            }

            // Create new repository
            const createResponse = await fetch(`${this.apiBase}/user/repos`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Cordova-App-Generator/1.0.0'
                },
                body: JSON.stringify({
                    name: appConfig.appName,
                    description: appConfig.description,
                    private: false,
                    auto_init: false, // We'll push our own initial commit
                    gitignore_template: null,
                    license_template: null,
                    allow_squash_merge: true,
                    allow_merge_commit: true,
                    allow_rebase_merge: true,
                    has_issues: true,
                    has_projects: true,
                    has_wiki: true
                })
            });

            if (!createResponse.ok) {
                const errorData = await createResponse.json().catch(() => ({}));
                if (createResponse.status === 422 && errorData.errors) {
                    const nameError = errorData.errors.find(e => e.field === 'name');
                    if (nameError) {
                        throw new Error(`Repository name "${appConfig.appName}" ${nameError.message}`);
                    }
                }
                throw new Error(`Failed to create repository: ${createResponse.status} ${errorData.message || createResponse.statusText}`);
            }

            const repoData = await createResponse.json();
            const repository = {
                name: repoData.name,
                fullName: repoData.full_name,
                description: repoData.description,
                private: repoData.private,
                htmlUrl: repoData.html_url,
                cloneUrl: repoData.clone_url,
                sshUrl: repoData.ssh_url,
                created: true,
                timestamp: new Date().toISOString(),
                existing: false
            };

            this.emit('repo:create:success', { repository, appConfig });

            // Auto-enable GitHub Pages for immediate demo access
            setTimeout(() => {
                this.autoEnablePages(repository.name);
            }, 2000);

            return repository;

        } catch (error) {
            this.emit('repo:create:error', { error, appConfig });
            throw new Error(`Failed to create repository: ${error.message}`);
        }
    }

    // Enable GitHub Pages for repository
    async enableGitHubPages(repoName, branch = 'main', path = '/') {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated with GitHub');
        }

        try {
            const response = await fetch(`${this.apiUrl}/repos/${this.username}/${repoName}/pages`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source: {
                        branch: branch,
                        path: path
                    }
                })
            });

            if (response.status === 201) {
                const pagesInfo = await response.json();
                return {
                    success: true,
                    url: pagesInfo.html_url,
                    status: pagesInfo.status
                };
            } else if (response.status === 409) {
                // Pages already enabled, get current status
                return await this.getGitHubPagesStatus(repoName);
            } else {
                const error = await response.json();
                throw new Error(error.message || 'Failed to enable GitHub Pages');
            }
        } catch (error) {
            console.error('Error enabling GitHub Pages:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get GitHub Pages status
    async getGitHubPagesStatus(repoName) {
        try {
            const response = await fetch(`${this.apiUrl}/repos/${this.username}/${repoName}/pages`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                const pagesInfo = await response.json();
                return {
                    success: true,
                    url: pagesInfo.html_url,
                    status: pagesInfo.status,
                    source: pagesInfo.source
                };
            } else {
                return {
                    success: false,
                    error: 'GitHub Pages not enabled'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Check if GitHub Pages URL is accessible
    async checkPagesAccessibility(pagesUrl) {
        try {
            // Use a simple fetch with no-cors mode to check if the page exists
            // This is limited but works for basic availability checking
            const response = await fetch(pagesUrl, {
                method: 'HEAD',
                mode: 'no-cors'
            });

            // In no-cors mode, we can't read the response status
            // But if it doesn't throw, the URL is likely accessible
            return { accessible: true };

        } catch (error) {
            return {
                accessible: false,
                error: error.message
            };
        }
    }

    // Auto-enable GitHub Pages after successful repository creation
    async autoEnablePages(repoName) {
        try {
            // Wait a moment for repository to be fully created
            await new Promise(resolve => setTimeout(resolve, 2000));

            const result = await this.enableGitHubPages(repoName);

            if (result.success) {
                // Start checking status periodically
                this.startPagesStatusMonitoring(repoName);
            }

            return result;

        } catch (error) {
            console.error('Auto-enable Pages failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Monitor GitHub Pages status
    startPagesStatusMonitoring(repoName, maxAttempts = 10) {
        let attempts = 0;

        const checkStatus = async () => {
            attempts++;

            try {
                const status = await this.getGitHubPagesStatus(repoName);

                if (status.success && status.status === 'built') {
                    // Pages is ready
                    this.emit('pages:ready', { repoName, status });
                    return;
                }

                if (attempts < maxAttempts) {
                    // Check again in 30 seconds
                    setTimeout(checkStatus, 30000);
                } else {
                    // Max attempts reached
                    this.emit('pages:timeout', { repoName, attempts });
                }

            } catch (error) {
                console.error('Error monitoring Pages status:', error);
            }
        };

        // Start monitoring
        setTimeout(checkStatus, 10000); // First check after 10 seconds
    }

    // Push code to repository using GitHub Contents API
    async pushCode(repository, generatedApp) {
        try {
            this.emit('repo:push:start', { repository, appName: generatedApp.config.appName });

            // Use build-ready files if available, otherwise use original files
            const files = generatedApp.buildReady ? generatedApp.buildReady.files : generatedApp.files;
            const filesCount = Object.keys(files).length;
            let uploadedFiles = 0;

            this.emit('step:start', { stepName: `Uploading ${filesCount} files to repository`, duration: 0 });

            // Upload each file using GitHub Contents API
            for (const [filePath, content] of Object.entries(files)) {
                try {
                    await this.uploadFile(repository, filePath, content, generatedApp.config);
                    uploadedFiles++;

                    // Emit progress
                    const progress = Math.round((uploadedFiles / filesCount) * 100);
                    this.emit('step:progress', {
                        stepName: `Uploaded ${uploadedFiles}/${filesCount} files (${progress}%)`,
                        progress
                    });

                } catch (error) {
                    // Log upload failure but continue with other files
                    if (window.showStatus) {
                        window.showStatus(`Failed to upload ${filePath}: ${error.message}`, 'warning');
                    }
                    // Continue with other files
                }
            }

            // Create a commit summary
            const isBuildReady = generatedApp.buildReady && generatedApp.buildReady.success;
            const packageName = isBuildReady ? generatedApp.buildReady.packageName : generatedApp.config.packageName;

            const commitMessage = `Initial commit: ${generatedApp.config.displayName}

${generatedApp.config.description}

Generated by Cordova App Generator
- ${filesCount} files created
- Package: ${packageName}
- Plugins: ${generatedApp.config.plugins.length} configured
- Category: ${generatedApp.config.category}
${isBuildReady ? '- Cordova build structure: ✅ Ready' : '- Cordova build structure: ❌ Not prepared'}
${isBuildReady ? '- Codemagic CI/CD: ✅ Configured' : ''}

${isBuildReady ? 'Ready for immediate Cordova builds!' : 'Ready for Cordova build process.'}`;

            const pushResult = {
                repository,
                commit: {
                    message: commitMessage,
                    author: generatedApp.config.authorName,
                    timestamp: new Date().toISOString(),
                    url: `${repository.htmlUrl}/commits/main`
                },
                filesCount: uploadedFiles,
                totalFiles: filesCount,
                success: uploadedFiles > 0
            };

            this.emit('repo:push:success', { pushResult, repository });
            return pushResult;

        } catch (error) {
            this.emit('repo:push:error', { error, repository });
            throw new Error(`Failed to push code: ${error.message}`);
        }
    }

    // Upload a single file to GitHub repository using Contents API
    async uploadFile(repository, filePath, content, appConfig) {
        try {
            // Encode content to base64 (modern way without deprecated unescape)
            const encodedContent = btoa(new TextEncoder().encode(content).reduce((data, byte) => data + String.fromCharCode(byte), ''));

            const response = await fetch(`${this.apiBase}/repos/${repository.fullName}/contents/${filePath}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Cordova-App-Generator/1.0.0'
                },
                body: JSON.stringify({
                    message: `Add ${filePath}`,
                    content: encodedContent,
                    committer: {
                        name: appConfig.authorName,
                        email: appConfig.authorEmail
                    },
                    author: {
                        name: appConfig.authorName,
                        email: appConfig.authorEmail
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Failed to upload ${filePath}: ${response.status} ${errorData.message || response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            throw new Error(`Failed to upload ${filePath}: ${error.message}`);
        }
    }

    // Create and push multiple repositories
    async createAndPushApps(generatedApps) {
        const results = [];
        
        for (let i = 0; i < generatedApps.length; i++) {
            const app = generatedApps[i];
            
            try {
                this.emit('batch:progress', {
                    current: i + 1,
                    total: generatedApps.length,
                    appName: app.config.appName
                });

                // Create repository
                const repository = await this.createRepository(app.config);
                
                // Push code
                const pushResult = await this.pushCode(repository, app);
                
                results.push({
                    app: app.config,
                    repository,
                    pushResult,
                    success: true
                });

            } catch (error) {
                results.push({
                    app: app.config,
                    error: error.message,
                    success: false
                });
            }
        }

        return results;
    }

    // Generate build instructions for third-party services
    generateBuildInstructions(repositories) {
        const instructions = {
            phonegapBuild: {
                name: 'PhoneGap Build',
                url: 'https://build.phonegap.com',
                steps: [
                    'Sign in to PhoneGap Build with your GitHub account',
                    'Click "New App" and select "Open-source app"',
                    'Enter the repository URL or select from your GitHub repositories',
                    'Click "Ready to build" to start the build process',
                    'Download the generated APK file once build is complete'
                ],
                repositories: repositories.map(repo => ({
                    name: repo.name,
                    url: repo.htmlUrl,
                    buildUrl: `https://build.phonegap.com/apps`
                }))
            },
            monaca: {
                name: 'Monaca',
                url: 'https://monaca.io',
                steps: [
                    'Sign in to Monaca Cloud IDE',
                    'Click "Import Project" and select "Import from GitHub"',
                    'Enter the repository URL and import the project',
                    'Configure build settings in the project dashboard',
                    'Click "Build" and select "Build for Android"',
                    'Download the APK file after build completion'
                ],
                repositories: repositories.map(repo => ({
                    name: repo.name,
                    url: repo.htmlUrl,
                    buildUrl: 'https://monaca.io/dashboard'
                }))
            },
            ionicAppflow: {
                name: 'Ionic Appflow',
                url: 'https://ionicframework.com/appflow',
                steps: [
                    'Sign in to Ionic Appflow',
                    'Connect your GitHub account',
                    'Create a new app and link it to your repository',
                    'Set up build configuration for Android',
                    'Trigger a build from the dashboard',
                    'Download the generated APK from the builds section'
                ],
                repositories: repositories.map(repo => ({
                    name: repo.name,
                    url: repo.htmlUrl,
                    buildUrl: 'https://dashboard.ionicframework.com'
                }))
            }
        };

        return instructions;
    }

    // Generate deployment script
    generateDeploymentScript(repositories, config) {
        const script = `#!/bin/bash

# Automated Cordova App Deployment Script
# Generated by Cordova App Generator

set -e

echo "🚀 Starting deployment of ${repositories.length} Cordova applications..."

# Configuration
GITHUB_USERNAME="${config.githubUsername}"
PACKAGE_PREFIX="${config.packagePrefix}"
AUTHOR_NAME="${config.authorName}"
AUTHOR_EMAIL="${config.authorEmail}"

# Create deployment directory
DEPLOY_DIR="./deployed-apps"
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

${repositories.map(repo => `
# Deploy ${repo.name}
echo "📱 Deploying ${repo.name}..."
if [ ! -d "${repo.name}" ]; then
    git clone ${repo.cloneUrl}
fi
cd "${repo.name}"
git pull origin main

# Install dependencies and build
if command -v cordova &> /dev/null; then
    echo "🔧 Building ${repo.name}..."
    cordova platform add android
    cordova build android
    echo "✅ ${repo.name} built successfully"
else
    echo "⚠️  Cordova CLI not found. Skipping build for ${repo.name}"
fi

cd ..
`).join('')}

echo "🎉 Deployment completed!"
echo ""
echo "📋 Summary:"
echo "- Total apps: ${repositories.length}"
echo "- GitHub repositories created: ${repositories.length}"
echo "- Build-ready projects: ${repositories.length}"
echo ""
echo "🔗 Repository URLs:"
${repositories.map(repo => `echo "- ${repo.name}: ${repo.htmlUrl}"`).join('\n')}
echo ""
echo "📖 Next steps:"
echo "1. Use third-party build services (PhoneGap Build, Monaca, Ionic Appflow)"
echo "2. Or build locally using 'cordova build android --release'"
echo "3. Test on devices and deploy to app stores"
`;

        return script;
    }

    // Utility method for delays (if needed)
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Check repository exists
    async checkRepositoryExists(repoName) {
        if (!this.isAuthenticated) {
            return false;
        }

        try {
            const response = await fetch(`${this.apiBase}/repos/${this.username}/${repoName}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Cordova-App-Generator/1.0.0'
                }
            });

            return response.ok;
        } catch (error) {
            // Repository check failed, assume it doesn't exist
            return false;
        }
    }

    // Get user repositories
    async getUserRepositories(page = 1, perPage = 30) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch(`${this.apiBase}/user/repos?page=${page}&per_page=${perPage}&sort=updated&direction=desc`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Cordova-App-Generator/1.0.0'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch repositories: ${response.status} ${response.statusText}`);
            }

            const repositories = await response.json();

            return repositories.map(repo => ({
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description,
                private: repo.private,
                htmlUrl: repo.html_url,
                cloneUrl: repo.clone_url,
                sshUrl: repo.ssh_url,
                updatedAt: repo.updated_at,
                createdAt: repo.created_at,
                language: repo.language,
                stargazersCount: repo.stargazers_count,
                forksCount: repo.forks_count
            }));

        } catch (error) {
            throw new Error(`Failed to fetch repositories: ${error.message}`);
        }
    }

    // Delete repository
    async deleteRepository(repoName) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated');
        }

        try {
            this.emit('repo:delete:start', { repoName });

            const response = await fetch(`${this.apiBase}/repos/${this.username}/${repoName}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Cordova-App-Generator/1.0.0'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Repository ${repoName} not found`);
                } else if (response.status === 403) {
                    throw new Error(`Insufficient permissions to delete repository ${repoName}`);
                } else {
                    throw new Error(`Failed to delete repository: ${response.status} ${response.statusText}`);
                }
            }

            this.emit('repo:delete:success', { repoName });
            return true;
        } catch (error) {
            this.emit('repo:delete:error', { error, repoName });
            throw error;
        }
    }

    // Get authentication status
    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            username: this.username,
            hasToken: !!this.token
        };
    }

    // Sign out
    signOut() {
        this.isAuthenticated = false;
        this.username = null;
        this.token = null;
        this.emit('auth:signout');
    }

    // Generate GitHub Actions workflow
    generateGitHubActionsWorkflow(appConfig) {
        return `name: Build ${appConfig.displayName}

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm install
    
    - name: Install Cordova
      run: npm install -g cordova
    
    - name: Add Android platform
      run: cordova platform add android
    
    - name: Build Android app
      run: cordova build android
    
    - name: Upload APK
      uses: actions/upload-artifact@v3
      with:
        name: ${appConfig.appName}-debug.apk
        path: platforms/android/app/build/outputs/apk/debug/app-debug.apk
`;
    }

    // Export configuration for external tools
    exportConfiguration(repositories, config) {
        return {
            generator: {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                totalApps: repositories.length
            },
            config: {
                githubUsername: config.githubUsername,
                packagePrefix: config.packagePrefix,
                authorName: config.authorName,
                authorEmail: config.authorEmail
            },
            repositories: repositories.map(repo => ({
                name: repo.name,
                url: repo.htmlUrl,
                cloneUrl: repo.cloneUrl,
                description: repo.description
            })),
            buildServices: this.generateBuildInstructions(repositories),
            deploymentScript: this.generateDeploymentScript(repositories, config)
        };
    }
}

// Export for use in other modules
window.GitHubIntegration = GitHubIntegration;
