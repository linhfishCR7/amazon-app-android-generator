/**
 * Enhanced Authentication Manager
 * Handles GitHub and Codemagic authentication with comprehensive error handling
 */

class AuthenticationManager {
    constructor(configManager) {
        this.configManager = configManager;
        this.eventListeners = new Map();
        this.authStates = {
            github: {
                status: 'disconnected', // disconnected, testing, connected, rate-limited, error
                lastValidated: null,
                lastError: null,
                rateLimit: null,
                retryCount: 0,
                nextRetry: null
            },
            codemagic: {
                status: 'disconnected',
                lastValidated: null,
                lastError: null,
                rateLimit: null,
                retryCount: 0,
                nextRetry: null
            }
        };
        
        this.maxRetries = 3;
        this.retryDelays = [1000, 3000, 5000]; // Exponential backoff
        this.healthCheckInterval = 5 * 60 * 1000; // 5 minutes
        this.healthCheckTimer = null;
        
        this.init();
    }

    // Initialize authentication manager
    init() {
        // Listen for configuration changes
        this.configManager.on('config:loaded', (data) => {
            this.onConfigLoaded(data);
        });
        
        this.configManager.on('config:changed', (data) => {
            this.onConfigChanged(data);
        });
        
        // Start health monitoring
        this.startHealthMonitoring();
        
        console.log('✅ Authentication Manager initialized');
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
                    console.error('Auth event callback error:', error);
                }
            });
        }
    }

    // Handle configuration loaded
    async onConfigLoaded(data) {
        if (data.config && data.config.authentication) {
            // Auto-validate tokens if they exist
            const githubToken = data.config.authentication.github.token;
            const codemagicToken = data.config.authentication.codemagic.token;
            
            if (githubToken) {
                setTimeout(() => this.validateGitHubToken(githubToken), 1000);
            }
            
            if (codemagicToken) {
                setTimeout(() => this.validateCodemagicToken(codemagicToken), 1500);
            }
        }
    }

    // Handle configuration changes
    onConfigChanged(data) {
        if (data.path.startsWith('authentication.github.token')) {
            const token = data.value;
            if (token && token !== this.getStoredGitHubToken()) {
                this.validateGitHubToken(token);
            }
        } else if (data.path.startsWith('authentication.codemagic.token')) {
            const token = data.value;
            if (token && token !== this.getStoredCodemagicToken()) {
                this.validateCodemagicToken(token);
            }
        }
    }

    // Get stored tokens
    getStoredGitHubToken() {
        const config = this.configManager.getConfig();
        return config?.authentication?.github?.token || '';
    }

    getStoredCodemagicToken() {
        const config = this.configManager.getConfig();
        return config?.authentication?.codemagic?.token || '';
    }

    // Validate GitHub token
    async validateGitHubToken(token = null) {
        const targetToken = token || this.getStoredGitHubToken();
        
        if (!targetToken) {
            this.updateAuthState('github', 'disconnected', 'No token provided');
            return false;
        }

        // Validate token format
        const validation = this.configManager.validateGitHubToken(targetToken);
        if (!validation.valid) {
            this.updateAuthState('github', 'error', validation.error);
            return false;
        }

        return await this.performGitHubAuthentication(targetToken);
    }

    // Perform GitHub authentication
    async performGitHubAuthentication(token, retryCount = 0) {
        try {
            this.updateAuthState('github', 'testing', 'Validating GitHub token...');
            console.log('🔍 Testing GitHub API connection...');

            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Cordova-App-Generator/1.0'
                }
            });

            console.log(`📡 GitHub API Response: ${response.status} ${response.statusText}`);

            // Update rate limit info
            this.updateRateLimit('github', response);

            if (response.status === 401) {
                throw new Error('Invalid GitHub token. Please check your personal access token and ensure it has the required permissions.');
            } else if (response.status === 403) {
                const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
                if (rateLimitRemaining === '0') {
                    const resetTime = new Date(parseInt(response.headers.get('X-RateLimit-Reset')) * 1000);
                    this.updateAuthState('github', 'rate-limited', `Rate limit exceeded. Resets at ${resetTime.toLocaleTimeString()}`);
                    throw new Error(`GitHub API rate limit exceeded. Resets at ${resetTime.toLocaleTimeString()}`);
                } else {
                    throw new Error('GitHub API access forbidden. Check token permissions (needs "repo" or "public_repo" scope).');
                }
            } else if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const userData = await response.json();
            console.log(`✅ GitHub authentication successful for user: ${userData.login}`);

            // Update configuration with validation results
            this.configManager.updateConfig('authentication.github.lastValidated', new Date().toISOString());
            this.configManager.updateConfig('authentication.github.isValid', true);
            this.configManager.updateConfig('authentication.github.username', userData.login);

            this.updateAuthState('github', 'connected', `Connected as ${userData.login} (${userData.public_repos} public repos)`);

            this.emit('github:authenticated', {
                user: userData,
                token: this.maskToken(token)
            });

            return true;

        } catch (error) {
            console.error('❌ GitHub authentication error:', error);

            // Handle retry logic for network errors only
            if (retryCount < this.maxRetries && this.shouldRetry(error)) {
                const delay = this.retryDelays[retryCount] || 5000;
                console.log(`🔄 Retrying GitHub authentication in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);

                setTimeout(() => {
                    this.performGitHubAuthentication(token, retryCount + 1);
                }, delay);

                this.updateAuthState('github', 'testing', `Retrying... (${retryCount + 1}/${this.maxRetries})`);
                return false;
            }

            // Update configuration with failure
            this.configManager.updateConfig('authentication.github.isValid', false);
            this.configManager.updateConfig('authentication.github.lastValidated', new Date().toISOString());

            this.updateAuthState('github', 'error', this.getErrorMessage(error));

            this.emit('github:error', {
                error: error.message,
                token: this.maskToken(token)
            });

            return false;
        }
    }

    // Validate Codemagic token
    async validateCodemagicToken(token = null) {
        const targetToken = token || this.getStoredCodemagicToken();
        
        if (!targetToken) {
            this.updateAuthState('codemagic', 'disconnected', 'No token provided');
            return false;
        }

        // Validate token format
        const validation = this.configManager.validateCodemagicToken(targetToken);
        if (!validation.valid) {
            this.updateAuthState('codemagic', 'error', validation.error);
            return false;
        }

        return await this.performCodemagicAuthentication(targetToken);
    }

    // Perform Codemagic authentication
    async performCodemagicAuthentication(token, retryCount = 0) {
        try {
            this.updateAuthState('codemagic', 'testing', 'Validating Codemagic token...');
            
            const response = await fetch('https://api.codemagic.io/apps', {
                method: 'GET',
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            // Update rate limit info if available
            this.updateRateLimit('codemagic', response);

            if (response.status === 401) {
                throw new Error('Invalid Codemagic API token. Please check your token from Codemagic dashboard.');
            } else if (response.status === 403) {
                throw new Error('Codemagic API access forbidden. Check token permissions.');
            } else if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After') || '60';
                throw new Error(`Codemagic API rate limit exceeded. Try again in ${retryAfter} seconds.`);
            } else if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Codemagic API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const appsData = await response.json();
            const appCount = appsData.applications ? appsData.applications.length : 0;
            
            // Update configuration with validation results
            this.configManager.updateConfig('authentication.codemagic.lastValidated', new Date().toISOString());
            this.configManager.updateConfig('authentication.codemagic.isValid', true);
            
            this.updateAuthState('codemagic', 'connected', `Connected - ${appCount} apps found`);
            
            this.emit('codemagic:authenticated', {
                appCount,
                token: this.maskToken(token)
            });
            
            return true;

        } catch (error) {
            console.error('Codemagic authentication error:', error);
            
            // Handle retry logic
            if (retryCount < this.maxRetries && this.shouldRetry(error)) {
                const delay = this.retryDelays[retryCount] || 5000;
                console.log(`Retrying Codemagic authentication in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
                
                setTimeout(() => {
                    this.performCodemagicAuthentication(token, retryCount + 1);
                }, delay);
                
                this.updateAuthState('codemagic', 'testing', `Retrying... (${retryCount + 1}/${this.maxRetries})`);
                return false;
            }
            
            // Update configuration with failure
            this.configManager.updateConfig('authentication.codemagic.isValid', false);
            this.configManager.updateConfig('authentication.codemagic.lastValidated', new Date().toISOString());
            
            this.updateAuthState('codemagic', 'error', this.getErrorMessage(error));
            
            this.emit('codemagic:error', {
                error: error.message,
                token: this.maskToken(token)
            });
            
            return false;
        }
    }

    // Update authentication state
    updateAuthState(service, status, message = null) {
        const state = this.authStates[service];
        state.status = status;
        state.lastError = status === 'error' ? message : null;
        
        if (status === 'connected') {
            state.retryCount = 0;
            state.nextRetry = null;
        }
        
        this.emit(`${service}:status`, {
            service,
            status,
            message,
            state: { ...state }
        });
        
        console.log(`🔐 ${service} auth status: ${status}${message ? ` - ${message}` : ''}`);
    }

    // Update rate limit information
    updateRateLimit(service, response) {
        const rateLimit = {};
        
        if (service === 'github') {
            rateLimit.limit = parseInt(response.headers.get('X-RateLimit-Limit')) || null;
            rateLimit.remaining = parseInt(response.headers.get('X-RateLimit-Remaining')) || null;
            rateLimit.reset = response.headers.get('X-RateLimit-Reset') ? 
                new Date(parseInt(response.headers.get('X-RateLimit-Reset')) * 1000) : null;
        } else if (service === 'codemagic') {
            // Codemagic may not provide rate limit headers, but we can track requests
            rateLimit.lastRequest = new Date();
        }
        
        this.authStates[service].rateLimit = rateLimit;
        
        // Update configuration
        this.configManager.updateConfig(`authentication.${service}.rateLimit`, rateLimit);
    }

    // Check if error should trigger retry
    shouldRetry(error) {
        const message = error.message.toLowerCase();
        
        // Don't retry authentication errors
        if (message.includes('invalid') || message.includes('unauthorized') || message.includes('forbidden')) {
            return false;
        }
        
        // Retry network errors and server errors
        return message.includes('network') || 
               message.includes('timeout') || 
               message.includes('500') || 
               message.includes('502') || 
               message.includes('503');
    }

    // Get user-friendly error message
    getErrorMessage(error) {
        const message = error.message;
        
        // Network errors
        if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
            return 'Network connection failed. Please check your internet connection.';
        }
        
        // Timeout errors
        if (message.includes('timeout')) {
            return 'Request timed out. Please try again.';
        }
        
        // Return original message for other errors
        return message;
    }

    // Mask token for display
    maskToken(token) {
        if (!token || token.length < 12) return '***';
        return token.substring(0, 8) + '...' + token.substring(token.length - 4);
    }

    // Get authentication status
    getAuthStatus(service) {
        return {
            ...this.authStates[service],
            isAuthenticated: this.authStates[service].status === 'connected'
        };
    }

    // Get all authentication statuses
    getAllAuthStatuses() {
        return {
            github: this.getAuthStatus('github'),
            codemagic: this.getAuthStatus('codemagic')
        };
    }

    // Manual connection test
    async testConnection(service) {
        if (service === 'github') {
            return await this.validateGitHubToken();
        } else if (service === 'codemagic') {
            return await this.validateCodemagicToken();
        } else {
            throw new Error(`Unknown service: ${service}`);
        }
    }

    // Start health monitoring
    startHealthMonitoring() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
        }
        
        this.healthCheckTimer = setInterval(() => {
            this.performHealthCheck();
        }, this.healthCheckInterval);
    }

    // Perform health check
    async performHealthCheck() {
        const config = this.configManager.getConfig();
        if (!config) return;
        
        const githubToken = config.authentication.github.token;
        const codemagicToken = config.authentication.codemagic.token;
        
        // Only check if tokens exist and were previously valid
        if (githubToken && config.authentication.github.isValid) {
            await this.validateGitHubToken(githubToken);
        }
        
        if (codemagicToken && config.authentication.codemagic.isValid) {
            await this.validateCodemagicToken(codemagicToken);
        }
    }

    // Stop health monitoring
    stopHealthMonitoring() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }

    // Cleanup
    destroy() {
        this.stopHealthMonitoring();
        this.eventListeners.clear();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AuthenticationManager = AuthenticationManager;
}
