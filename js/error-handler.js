/**
 * Global Error Handler
 * Handles various types of errors including GitHub API failures, CORS issues, and runtime errors
 */

class GlobalErrorHandler {
    constructor() {
        this.errorCounts = new Map();
        this.suppressedErrors = new Set();
        this.maxErrorCount = 5; // Max same error before suppressing
        this.errorReportingEnabled = false;
        
        this.init();
    }

    init() {
        // Handle uncaught errors
        window.addEventListener('error', this.handleGlobalError.bind(this));
        
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
        
        // Handle Chrome extension errors
        this.setupChromeExtensionErrorHandling();
        
        // Suppress common non-critical errors
        this.setupErrorSuppression();
    }

    // Handle global JavaScript errors
    handleGlobalError(event) {
        const error = {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error,
            type: 'javascript'
        };

        this.processError(error);
    }

    // Handle unhandled promise rejections
    handleUnhandledRejection(event) {
        const error = {
            message: event.reason?.message || String(event.reason),
            stack: event.reason?.stack,
            type: 'promise_rejection'
        };

        this.processError(error);
        
        // Prevent the error from being logged to console if it's a known issue
        if (this.isKnownNonCriticalError(error.message)) {
            event.preventDefault();
        }
    }

    // Setup Chrome extension error handling
    setupChromeExtensionErrorHandling() {
        // Check for Chrome runtime errors periodically
        const checkChromeErrors = () => {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) {
                const error = {
                    message: chrome.runtime.lastError.message,
                    type: 'chrome_extension'
                };
                
                if (!this.isKnownNonCriticalError(error.message)) {
                    this.processError(error);
                }
            }
        };

        // Check for Chrome errors periodically (but not too frequently)
        setInterval(checkChromeErrors, 5000);
    }

    // Setup error suppression for known non-critical errors
    setupErrorSuppression() {
        const nonCriticalPatterns = [
            'Could not establish connection. Receiving end does not exist',
            'Extension context invalidated',
            'The message port closed before a response was received',
            'Failed to fetch', // CORS errors
            'NetworkError when attempting to fetch resource',
            'Load failed', // Resource loading failures
            'Non-Error promise rejection captured',
            'ResizeObserver loop limit exceeded'
        ];

        nonCriticalPatterns.forEach(pattern => {
            this.suppressedErrors.add(pattern);
        });
    }

    // Check if error is known to be non-critical
    isKnownNonCriticalError(message) {
        if (!message) return false;
        
        return Array.from(this.suppressedErrors).some(pattern => 
            message.includes(pattern)
        );
    }

    // Process and handle errors
    processError(error) {
        const errorKey = `${error.type}:${error.message}`;
        
        // Count error occurrences
        const count = this.errorCounts.get(errorKey) || 0;
        this.errorCounts.set(errorKey, count + 1);

        // Suppress if too many of the same error
        if (count >= this.maxErrorCount) {
            return;
        }

        // Skip known non-critical errors
        if (this.isKnownNonCriticalError(error.message)) {
            if (count === 0) {
                console.warn(`🔕 Suppressing non-critical error: ${error.message}`);
            }
            return;
        }

        // Log error based on type
        this.logError(error);

        // Show user notification for critical errors
        if (this.isCriticalError(error)) {
            this.showUserNotification(error);
        }
    }

    // Check if error is critical and needs user attention
    isCriticalError(error) {
        const criticalPatterns = [
            'Failed to initialize',
            'Authentication failed',
            'Permission denied',
            'Invalid configuration',
            'Database error',
            'Network timeout'
        ];

        return criticalPatterns.some(pattern => 
            error.message && error.message.includes(pattern)
        );
    }

    // Log error with appropriate level
    logError(error) {
        const timestamp = new Date().toISOString();
        const errorInfo = {
            timestamp,
            type: error.type,
            message: error.message,
            filename: error.filename,
            line: error.lineno,
            column: error.colno,
            stack: error.stack
        };

        if (error.type === 'chrome_extension') {
            console.warn('🔌 Chrome Extension Error:', errorInfo);
        } else if (error.type === 'promise_rejection') {
            console.warn('🚫 Unhandled Promise Rejection:', errorInfo);
        } else {
            console.error('❌ JavaScript Error:', errorInfo);
        }
    }

    // Show user notification for critical errors
    showUserNotification(error) {
        if (window.uiManager && window.uiManager.showToast) {
            const message = this.getUserFriendlyMessage(error);
            window.uiManager.showToast(message, 'error', 8000);
        }
    }

    // Convert technical error to user-friendly message
    getUserFriendlyMessage(error) {
        const message = error.message || 'Unknown error';

        if (message.includes('Failed to fetch') || message.includes('CORS')) {
            return 'Connection issue detected. Some features may not work when running from localhost.';
        }
        
        if (message.includes('Authentication failed')) {
            return 'Authentication failed. Please check your API tokens and try again.';
        }
        
        if (message.includes('Permission denied')) {
            return 'Permission denied. Please check your account permissions.';
        }
        
        if (message.includes('Rate limit')) {
            return 'Rate limit exceeded. Please wait a moment before trying again.';
        }

        return 'An error occurred. Please check the console for details.';
    }

    // Handle API errors specifically
    handleApiError(error, context = {}) {
        const apiError = {
            message: error.message,
            status: error.status,
            context: context,
            type: 'api_error'
        };

        // Add specific handling for common API errors
        if (error.status === 422) {
            apiError.userMessage = 'Invalid data provided. Please check your input and try again.';
        } else if (error.status === 401) {
            apiError.userMessage = 'Authentication failed. Please check your credentials.';
        } else if (error.status === 403) {
            apiError.userMessage = 'Permission denied. You may not have access to this resource.';
        } else if (error.status === 429) {
            apiError.userMessage = 'Too many requests. Please wait before trying again.';
        } else if (error.status >= 500) {
            apiError.userMessage = 'Server error. Please try again later.';
        }

        this.processError(apiError);
        return apiError;
    }

    // Handle CORS errors specifically
    handleCorsError(operation = 'API request') {
        const corsError = {
            message: `CORS error during ${operation}`,
            type: 'cors_error',
            userMessage: `Cannot perform ${operation} due to browser security restrictions. This is expected when running from localhost.`
        };

        console.warn('🚫 CORS Error:', corsError);
        
        if (window.uiManager && window.uiManager.showToast) {
            window.uiManager.showToast(corsError.userMessage, 'warning', 6000);
        }

        return corsError;
    }

    // Get error statistics
    getErrorStats() {
        const stats = {
            totalErrors: 0,
            errorsByType: {},
            topErrors: []
        };

        this.errorCounts.forEach((count, errorKey) => {
            stats.totalErrors += count;
            const [type] = errorKey.split(':');
            stats.errorsByType[type] = (stats.errorsByType[type] || 0) + count;
        });

        // Get top 5 errors
        stats.topErrors = Array.from(this.errorCounts.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([errorKey, count]) => ({ errorKey, count }));

        return stats;
    }

    // Clear error statistics
    clearErrorStats() {
        this.errorCounts.clear();
        console.log('🧹 Error statistics cleared');
    }

    // Enable/disable error reporting
    setErrorReporting(enabled) {
        this.errorReportingEnabled = enabled;
        console.log(`📊 Error reporting ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Create global instance
window.globalErrorHandler = new GlobalErrorHandler();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalErrorHandler;
}
