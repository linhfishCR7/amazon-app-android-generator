/**
 * Security utilities for input validation and sanitization
 * Cordova App Generator - Security Module
 */

class SecurityUtils {
    /**
     * Sanitize HTML content to prevent XSS attacks
     * @param {string} input - Raw HTML input
     * @returns {string} Sanitized HTML
     */
    static sanitizeHtml(input) {
        if (typeof input !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    /**
     * Validate package name format
     * @param {string} packageName - Package name to validate
     * @returns {boolean} True if valid
     */
    static validatePackageName(packageName) {
        if (!packageName || typeof packageName !== 'string') return false;
        
        const config = window.CONFIG?.validation?.packageName || {
            pattern: /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/,
            minLength: 3,
            maxLength: 100
        };
        
        return packageName.length >= config.minLength &&
               packageName.length <= config.maxLength &&
               config.pattern.test(packageName);
    }

    /**
     * Validate app name
     * @param {string} appName - App name to validate
     * @returns {boolean} True if valid
     */
    static validateAppName(appName) {
        if (!appName || typeof appName !== 'string') return false;
        
        const config = window.CONFIG?.validation?.appName || {
            pattern: /^[a-zA-Z0-9\s\-_]+$/,
            minLength: 1,
            maxLength: 50
        };
        
        return appName.length >= config.minLength &&
               appName.length <= config.maxLength &&
               config.pattern.test(appName);
    }

    /**
     * Validate email address
     * @param {string} email - Email to validate
     * @returns {boolean} True if valid
     */
    static validateEmail(email) {
        if (!email || typeof email !== 'string') return false;
        
        const config = window.CONFIG?.validation?.email || {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        };
        
        return config.pattern.test(email);
    }

    /**
     * Validate GitHub username
     * @param {string} username - GitHub username to validate
     * @returns {boolean} True if valid
     */
    static validateGitHubUsername(username) {
        if (!username || typeof username !== 'string') return false;
        
        const config = window.CONFIG?.validation?.githubUsername || {
            pattern: /^[a-zA-Z0-9]([a-zA-Z0-9\-])*[a-zA-Z0-9]$/,
            minLength: 1,
            maxLength: 39
        };
        
        return username.length >= config.minLength &&
               username.length <= config.maxLength &&
               config.pattern.test(username);
    }

    /**
     * Validate GitHub token format
     * @param {string} token - GitHub token to validate
     * @returns {boolean} True if format is valid
     */
    static validateGitHubToken(token) {
        if (!token || typeof token !== 'string') return false;
        
        // GitHub personal access tokens start with 'ghp_' and are 40 characters total
        // GitHub app tokens start with 'ghs_' and are 40 characters total
        // Classic tokens are 40 characters of hex
        const tokenPatterns = [
            /^ghp_[a-zA-Z0-9]{36}$/, // Personal access token
            /^ghs_[a-zA-Z0-9]{36}$/, // App token
            /^[a-f0-9]{40}$/         // Classic token
        ];
        
        return tokenPatterns.some(pattern => pattern.test(token));
    }

    /**
     * Sanitize file path to prevent directory traversal
     * @param {string} path - File path to sanitize
     * @returns {string} Sanitized path
     */
    static sanitizeFilePath(path) {
        if (!path || typeof path !== 'string') return '';
        
        // Remove dangerous patterns
        return path
            .replace(/\.\./g, '') // Remove parent directory references
            .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
            .replace(/^\/+/, '') // Remove leading slashes
            .replace(/\/+/g, '/') // Normalize multiple slashes
            .trim();
    }

    /**
     * Validate file size
     * @param {number} size - File size in bytes
     * @returns {boolean} True if within limits
     */
    static validateFileSize(size) {
        const maxSize = window.CONFIG?.maxFileSize || 10 * 1024 * 1024; // 10MB default
        return typeof size === 'number' && size > 0 && size <= maxSize;
    }

    /**
     * Rate limiting check (simple client-side implementation)
     * @param {string} action - Action identifier
     * @param {number} limit - Max actions per minute
     * @returns {boolean} True if action is allowed
     */
    static checkRateLimit(action, limit = 10) {
        const now = Date.now();
        const key = `rateLimit_${action}`;
        const stored = localStorage.getItem(key);
        
        let attempts = [];
        if (stored) {
            try {
                attempts = JSON.parse(stored);
            } catch (e) {
                attempts = [];
            }
        }
        
        // Remove attempts older than 1 minute
        attempts = attempts.filter(timestamp => now - timestamp < 60000);
        
        if (attempts.length >= limit) {
            return false;
        }
        
        attempts.push(now);
        localStorage.setItem(key, JSON.stringify(attempts));
        return true;
    }

    /**
     * Validate URL format
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid
     */
    static validateUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol);
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if domain is allowed
     * @param {string} url - URL to check
     * @returns {boolean} True if domain is allowed
     */
    static isAllowedDomain(url) {
        if (!this.validateUrl(url)) return false;
        
        const allowedDomains = window.CONFIG?.security?.allowedDomains || [
            'api.github.com',
            'fonts.googleapis.com',
            'fonts.gstatic.com',
            'cdnjs.cloudflare.com'
        ];
        
        try {
            const urlObj = new URL(url);
            return allowedDomains.includes(urlObj.hostname);
        } catch (e) {
            return false;
        }
    }

    /**
     * Generate secure random string
     * @param {number} length - Length of random string
     * @returns {string} Random string
     */
    static generateRandomString(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        if (window.crypto && window.crypto.getRandomValues) {
            const array = new Uint8Array(length);
            window.crypto.getRandomValues(array);
            for (let i = 0; i < length; i++) {
                result += chars[array[i] % chars.length];
            }
        } else {
            // Fallback for older browsers
            for (let i = 0; i < length; i++) {
                result += chars[Math.floor(Math.random() * chars.length)];
            }
        }
        
        return result;
    }

    /**
     * Validate template configuration
     * @param {object} template - Template object to validate
     * @returns {object} Validation result with isValid and errors
     */
    static validateTemplate(template) {
        const errors = [];
        
        if (!template || typeof template !== 'object') {
            return { isValid: false, errors: ['Template must be an object'] };
        }
        
        // Required fields
        const requiredFields = ['id', 'name', 'displayName', 'description', 'category'];
        for (const field of requiredFields) {
            if (!template[field] || typeof template[field] !== 'string') {
                errors.push(`${field} is required and must be a string`);
            }
        }
        
        // Validate ID format
        if (template.id && !/^[a-z0-9\-_]+$/.test(template.id)) {
            errors.push('Template ID must contain only lowercase letters, numbers, hyphens, and underscores');
        }
        
        // Validate name length
        if (template.name && template.name.length > 50) {
            errors.push('Template name must be 50 characters or less');
        }
        
        // Validate description length
        if (template.description && template.description.length > 500) {
            errors.push('Template description must be 500 characters or less');
        }
        
        // Validate plugins array
        if (template.plugins && !Array.isArray(template.plugins)) {
            errors.push('Plugins must be an array');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Clean up sensitive data from localStorage
     */
    static cleanupSensitiveData() {
        const sensitiveKeys = [
            'githubToken',
            'codemagicApiToken',
            'personalAccessToken'
        ];
        
        sensitiveKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
    }

    /**
     * Initialize security measures
     */
    static initialize() {
        // Set up CSP violation reporting (if supported)
        if (typeof document !== 'undefined') {
            document.addEventListener('securitypolicyviolation', (e) => {
                if (window.CONFIG?.development?.showDebugInfo) {
                    console.warn('CSP Violation:', e.violatedDirective, e.blockedURI);
                }
            });
        }
        
        // Clean up sensitive data on page unload
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.cleanupSensitiveData();
            });
        }
    }
}

// Initialize security measures when script loads
if (typeof window !== 'undefined') {
    SecurityUtils.initialize();
    window.SecurityUtils = SecurityUtils;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityUtils;
}
