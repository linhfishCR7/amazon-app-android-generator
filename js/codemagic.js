/**
 * Codemagic Integration Module
 * Handles Codemagic.io application creation and build triggering functionality
 */

class CodemagicIntegration {
    constructor() {
        this.isAuthenticated = false;
        this.apiToken = null;
        this.teamId = null;
        this.apiBase = 'https://api.codemagic.io';
        this.eventListeners = new Map();
        this.rateLimitRemaining = 5000;
        this.rateLimitReset = null;

        // Try to restore authentication from localStorage
        this.restoreAuthentication();
    }

    // Restore authentication from localStorage
    async restoreAuthentication() {
        if (typeof localStorage === 'undefined') return;

        const storedToken = localStorage.getItem('codemagic_token');
        const storedTeamId = localStorage.getItem('codemagic_team_id');

        if (storedToken) {
            try {
                await this.authenticate(storedToken, storedTeamId);
                console.log('Codemagic authentication restored from localStorage');
            } catch (error) {
                console.warn('Failed to restore Codemagic authentication:', error.message);
                // Clear invalid stored credentials
                localStorage.removeItem('codemagic_token');
                localStorage.removeItem('codemagic_team_id');
            }
        }
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

    // Authenticate with Codemagic API
    async authenticate(apiToken, teamId = null) {
        try {
            this.emit('auth:start', { apiToken: apiToken.substring(0, 8) + '...' });

            // Validate API token format first
            if (!apiToken || typeof apiToken !== 'string' || apiToken.length < 20) {
                throw new Error('Invalid API token format. Please provide a valid Codemagic API token.');
            }

            // Clean the token (remove any whitespace)
            const cleanToken = apiToken.trim();

            // Test authentication with a simple API call
            const response = await fetch(`${this.apiBase}/apps`, {
                method: 'GET',
                headers: {
                    'x-auth-token': cleanToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            // Handle different response statuses
            if (!response.ok) {
                let errorMessage = 'Authentication failed';

                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // If JSON parsing fails, use status text
                    errorMessage = response.statusText || errorMessage;
                }

                if (response.status === 401) {
                    throw new Error(`Invalid API token: ${errorMessage}. Please check your Codemagic API token in your account settings.`);
                } else if (response.status === 403) {
                    throw new Error(`Access forbidden: ${errorMessage}. Please check your API token permissions.`);
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                } else if (response.status >= 500) {
                    throw new Error(`Codemagic server error (${response.status}): ${errorMessage}. Please try again later.`);
                }

                throw new Error(`Authentication failed (${response.status}): ${errorMessage}`);
            }

            // Update rate limit info
            this.updateRateLimit(response);

            // Parse response data
            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error('Invalid response from Codemagic API. Please try again.');
            }

            // Set authentication state
            this.isAuthenticated = true;
            this.apiToken = cleanToken;
            this.teamId = teamId;

            // Store token in localStorage for persistence (optional)
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('codemagic_token', cleanToken);
                if (teamId) {
                    localStorage.setItem('codemagic_team_id', teamId);
                }
            }

            this.emit('auth:success', {
                apiToken: cleanToken.substring(0, 8) + '...',
                teamId,
                appsCount: data.applications ? data.applications.length : 0,
                rateLimit: this.getRateLimitStatus()
            });

            return {
                success: true,
                appsCount: data.applications ? data.applications.length : 0,
                rateLimit: this.getRateLimitStatus()
            };

        } catch (error) {
            this.isAuthenticated = false;
            this.apiToken = null;
            this.teamId = null;

            // Clear stored credentials on error
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('codemagic_token');
                localStorage.removeItem('codemagic_team_id');
            }

            this.emit('auth:error', { error });
            throw error;
        }
    }

    // Update rate limit information from response headers
    updateRateLimit(response) {
        const remaining = response.headers.get('X-RateLimit-Remaining');
        const reset = response.headers.get('X-RateLimit-Reset');
        
        if (remaining) this.rateLimitRemaining = parseInt(remaining);
        if (reset) this.rateLimitReset = new Date(parseInt(reset) * 1000);
    }

    // Create Codemagic application from repository
    async createApplication(repositoryUrl, appConfig) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated with Codemagic');
        }

        try {
            this.emit('app:create:start', { appName: appConfig.appName, repositoryUrl });

            // Check if application already exists
            const existingApp = await this.findApplicationByName(appConfig.appName);
            if (existingApp) {
                this.emit('app:create:success', { 
                    application: existingApp, 
                    appConfig,
                    created: false,
                    existing: true
                });
                return existingApp;
            }

            // Create new application
            const requestBody = {
                repositoryUrl: repositoryUrl
            };

            // Add team ID if specified
            if (this.teamId) {
                requestBody.teamId = this.teamId;
            }

            const response = await fetch(`${this.apiBase}/apps`, {
                method: 'POST',
                headers: {
                    'x-auth-token': this.apiToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            this.updateRateLimit(response);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 422) {
                    throw new Error(`Repository validation failed: ${errorData.message || 'Invalid repository URL'}`);
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                }
                throw new Error(`Failed to create application: ${response.status} ${errorData.message || response.statusText}`);
            }

            const data = await response.json();
            const application = {
                id: data._id,
                appName: data.appName,
                repositoryUrl: repositoryUrl,
                created: true,
                timestamp: new Date().toISOString()
            };

            this.emit('app:create:success', { application, appConfig, created: true });
            return application;

        } catch (error) {
            this.emit('app:create:error', { error, appConfig });
            throw error;
        }
    }

    // Find application by name
    async findApplicationByName(appName) {
        try {
            const response = await fetch(`${this.apiBase}/apps`, {
                method: 'GET',
                headers: {
                    'x-auth-token': this.apiToken,
                    'Content-Type': 'application/json'
                }
            });

            this.updateRateLimit(response);

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            const app = data.applications?.find(app => app.appName === appName);
            
            if (app) {
                return {
                    id: app._id,
                    appName: app.appName,
                    workflowIds: app.workflowIds || [],
                    workflows: app.workflows || {},
                    branches: app.branches || []
                };
            }

            return null;

        } catch (error) {
            console.warn('Failed to search for existing application:', error);
            return null;
        }
    }

    // Trigger build for application
    async triggerBuild(applicationId, workflowId = 'cordova_android_build', branch = 'main') {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated with Codemagic');
        }

        try {
            this.emit('build:trigger:start', { applicationId, workflowId, branch });

            const response = await fetch(`${this.apiBase}/builds`, {
                method: 'POST',
                headers: {
                    'x-auth-token': this.apiToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    appId: applicationId,
                    workflowId: workflowId,
                    branch: branch
                })
            });

            this.updateRateLimit(response);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 404) {
                    throw new Error(`Application or workflow not found. Make sure the repository has a codemagic.yaml file with workflow "${workflowId}".`);
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                }
                throw new Error(`Failed to trigger build: ${response.status} ${errorData.message || response.statusText}`);
            }

            const data = await response.json();
            const build = {
                buildId: data.buildId,
                applicationId: applicationId,
                workflowId: workflowId,
                branch: branch,
                status: 'queued',
                startedAt: new Date().toISOString(),
                buildUrl: `https://codemagic.io/app/${applicationId}/build/${data.buildId}`
            };

            this.emit('build:trigger:success', { build });
            return build;

        } catch (error) {
            this.emit('build:trigger:error', { error, applicationId, workflowId, branch });
            throw error;
        }
    }

    // Get build status
    async getBuildStatus(buildId) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated with Codemagic');
        }

        try {
            const response = await fetch(`${this.apiBase}/builds/${buildId}`, {
                method: 'GET',
                headers: {
                    'x-auth-token': this.apiToken,
                    'Content-Type': 'application/json'
                }
            });

            this.updateRateLimit(response);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Build not found');
                }
                throw new Error(`Failed to get build status: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return {
                buildId: data.build._id,
                status: data.build.status,
                startedAt: data.build.startedAt,
                finishedAt: data.build.finishedAt,
                workflowId: data.build.workflowId,
                applicationName: data.application.appName,
                buildUrl: `https://codemagic.io/app/${data.application._id}/build/${data.build._id}`
            };

        } catch (error) {
            this.emit('build:status:error', { error, buildId });
            throw error;
        }
    }

    // Get build artifacts
    async getBuildArtifacts(buildId) {
        try {
            const response = await fetch(`${this.apiBase}/builds?buildId=${buildId}`, {
                method: 'GET',
                headers: {
                    'x-auth-token': this.apiToken,
                    'Content-Type': 'application/json'
                }
            });

            this.updateRateLimit(response);

            if (!response.ok) {
                throw new Error(`Failed to get build artifacts: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const build = data.builds?.[0];
            
            if (!build || !build.artefacts) {
                return [];
            }

            return build.artefacts.map(artifact => ({
                name: artifact.name,
                type: artifact.type,
                size: artifact.size,
                url: artifact.url,
                md5: artifact.md5,
                packageName: artifact.packageName,
                versionName: artifact.versionName
            }));

        } catch (error) {
            console.warn('Failed to get build artifacts:', error);
            return [];
        }
    }

    // Get rate limit status
    getRateLimitStatus() {
        return {
            remaining: this.rateLimitRemaining,
            resetTime: this.rateLimitReset,
            resetIn: this.rateLimitReset ? Math.max(0, this.rateLimitReset.getTime() - Date.now()) : null
        };
    }

    // Test connection to Codemagic API
    async testConnection() {
        if (!this.apiToken) {
            throw new Error('No API token available. Please authenticate first.');
        }

        try {
            const response = await fetch(`${this.apiBase}/apps`, {
                method: 'GET',
                headers: {
                    'x-auth-token': this.apiToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            this.updateRateLimit(response);

            if (!response.ok) {
                if (response.status === 401) {
                    this.isAuthenticated = false;
                    throw new Error('Authentication expired. Please re-authenticate.');
                }
                throw new Error(`Connection test failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return {
                success: true,
                appsCount: data.applications ? data.applications.length : 0,
                rateLimit: this.getRateLimitStatus()
            };

        } catch (error) {
            if (error.message.includes('Authentication expired')) {
                this.logout();
            }
            throw error;
        }
    }

    // Check authentication status with connection test
    async isAuthenticatedStatus(testConnection = false) {
        const basicStatus = {
            authenticated: this.isAuthenticated,
            hasToken: !!this.apiToken,
            teamId: this.teamId,
            rateLimit: this.getRateLimitStatus()
        };

        if (testConnection && this.isAuthenticated) {
            try {
                const connectionTest = await this.testConnection();
                return {
                    ...basicStatus,
                    connectionTest: connectionTest
                };
            } catch (error) {
                return {
                    ...basicStatus,
                    authenticated: false,
                    connectionError: error.message
                };
            }
        }

        return basicStatus;
    }

    // Logout
    logout() {
        this.isAuthenticated = false;
        this.apiToken = null;
        this.teamId = null;
        this.rateLimitRemaining = 5000;
        this.rateLimitReset = null;

        // Clear stored credentials
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('codemagic_token');
            localStorage.removeItem('codemagic_team_id');
        }

        this.emit('auth:logout', {});
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.CodemagicIntegration = CodemagicIntegration;
}
