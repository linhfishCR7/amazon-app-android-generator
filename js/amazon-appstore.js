/**
 * Amazon Appstore Integration Module
 * Provides automated APK upload and app management for Amazon Appstore
 * 
 * Features:
 * - Automated APK/AAB upload
 * - App metadata management
 * - Release automation
 * - Status tracking
 * - Error handling and retry logic
 */

class AmazonAppstoreIntegration extends EventTarget {
    constructor() {
        super();
        this.apiBase = 'https://developer.amazon.com/api/appstore/v1';
        this.isAuthenticated = false;
        this.clientId = null;
        this.clientSecret = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.developerId = null;
    }

    // Authenticate with Amazon Developer Console
    async authenticate(clientId, clientSecret, developerId) {
        try {
            this.emit('auth:start', { clientId, developerId });

            // Store credentials
            this.clientId = clientId;
            this.clientSecret = clientSecret;
            this.developerId = developerId;

            // Get access token using client credentials flow
            const tokenResponse = await fetch(`${this.apiBase}/auth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
                },
                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    scope: 'appstore:app_management'
                })
            });

            if (!tokenResponse.ok) {
                const error = await tokenResponse.json();
                throw new Error(`Authentication failed: ${error.error_description || error.error}`);
            }

            const tokenData = await tokenResponse.json();
            this.accessToken = tokenData.access_token;
            this.refreshToken = tokenData.refresh_token;
            this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
            this.isAuthenticated = true;

            this.emit('auth:success', { developerId });
            return { success: true, developerId };

        } catch (error) {
            this.emit('auth:error', { error });
            throw error;
        }
    }

    // Refresh access token
    async refreshAccessToken() {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const response = await fetch(`${this.apiBase}/auth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken,
                    client_id: this.clientId,
                    client_secret: this.clientSecret
                })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const tokenData = await response.json();
            this.accessToken = tokenData.access_token;
            this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

            return true;
        } catch (error) {
            this.isAuthenticated = false;
            throw error;
        }
    }

    // Ensure valid access token
    async ensureValidToken() {
        if (!this.accessToken || Date.now() >= this.tokenExpiry - 60000) {
            await this.refreshAccessToken();
        }
    }

    // Create new app in Amazon Appstore
    async createApp(appConfig) {
        await this.ensureValidToken();

        try {
            this.emit('app:create:start', { appName: appConfig.appName });

            const response = await fetch(`${this.apiBase}/applications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: appConfig.displayName,
                    packageName: appConfig.packageName,
                    category: appConfig.category || 'ENTERTAINMENT',
                    description: appConfig.description,
                    shortDescription: appConfig.shortDescription || appConfig.description?.substring(0, 80),
                    keywords: appConfig.keywords || [],
                    developerName: appConfig.authorName,
                    supportEmail: appConfig.authorEmail,
                    privacyPolicyUrl: appConfig.privacyPolicyUrl,
                    contentRating: appConfig.contentRating || 'Everyone'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`App creation failed: ${error.message || 'Unknown error'}`);
            }

            const appData = await response.json();
            this.emit('app:create:success', { appId: appData.id, appName: appConfig.appName });

            return {
                success: true,
                appId: appData.id,
                appName: appConfig.appName,
                packageName: appConfig.packageName,
                status: appData.status
            };

        } catch (error) {
            this.emit('app:create:error', { error, appName: appConfig.appName });
            throw error;
        }
    }

    // Upload APK to Amazon Appstore
    async uploadApk(appId, apkBuffer, apkFileName) {
        await this.ensureValidToken();

        try {
            this.emit('apk:upload:start', { appId, fileName: apkFileName });

            // Step 1: Request upload URL
            const uploadUrlResponse = await fetch(`${this.apiBase}/applications/${appId}/edits`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fileName: apkFileName,
                    fileSize: apkBuffer.length,
                    contentType: 'application/vnd.android.package-archive'
                })
            });

            if (!uploadUrlResponse.ok) {
                const error = await uploadUrlResponse.json();
                throw new Error(`Upload URL request failed: ${error.message}`);
            }

            const uploadData = await uploadUrlResponse.json();
            const { editId, uploadUrl } = uploadData;

            // Step 2: Upload APK to the provided URL
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/vnd.android.package-archive',
                    'Content-Length': apkBuffer.length.toString()
                },
                body: apkBuffer
            });

            if (!uploadResponse.ok) {
                throw new Error(`APK upload failed: ${uploadResponse.statusText}`);
            }

            // Step 3: Commit the edit
            const commitResponse = await fetch(`${this.apiBase}/applications/${appId}/edits/${editId}/commit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    releaseNotes: 'Automated upload via Cordova App Generator'
                })
            });

            if (!commitResponse.ok) {
                const error = await commitResponse.json();
                throw new Error(`Edit commit failed: ${error.message}`);
            }

            const commitData = await commitResponse.json();

            this.emit('apk:upload:success', { 
                appId, 
                editId, 
                fileName: apkFileName,
                status: commitData.status 
            });

            return {
                success: true,
                appId,
                editId,
                fileName: apkFileName,
                uploadUrl,
                status: commitData.status,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.emit('apk:upload:error', { error, appId, fileName: apkFileName });
            throw error;
        }
    }

    // Get app status
    async getAppStatus(appId) {
        await this.ensureValidToken();

        try {
            const response = await fetch(`${this.apiBase}/applications/${appId}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get app status: ${response.statusText}`);
            }

            const appData = await response.json();
            return {
                appId,
                status: appData.status,
                title: appData.title,
                packageName: appData.packageName,
                lastUpdated: appData.lastUpdated,
                version: appData.currentVersion
            };

        } catch (error) {
            this.emit('status:error', { error, appId });
            throw error;
        }
    }

    // Submit app for review
    async submitForReview(appId, releaseNotes = '') {
        await this.ensureValidToken();

        try {
            this.emit('submit:start', { appId });

            const response = await fetch(`${this.apiBase}/applications/${appId}/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    releaseNotes: releaseNotes || 'Automated submission via Cordova App Generator'
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Submission failed: ${error.message}`);
            }

            const submitData = await response.json();
            this.emit('submit:success', { appId, submissionId: submitData.id });

            return {
                success: true,
                appId,
                submissionId: submitData.id,
                status: submitData.status,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.emit('submit:error', { error, appId });
            throw error;
        }
    }

    // Get authentication status
    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            developerId: this.developerId,
            hasToken: !!this.accessToken,
            tokenExpiry: this.tokenExpiry
        };
    }

    // Sign out
    signOut() {
        this.isAuthenticated = false;
        this.clientId = null;
        this.clientSecret = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        this.developerId = null;
        this.emit('auth:signout');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AmazonAppstoreIntegration;
} else if (typeof window !== 'undefined') {
    window.AmazonAppstoreIntegration = AmazonAppstoreIntegration;
}
