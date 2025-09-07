#!/usr/bin/env node

/**
 * Deployment Validation Script
 * Checks if the Cordova App Generator is ready for public deployment
 */

const fs = require('fs');
const path = require('path');

class DeploymentValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.passed = [];
        this.rootDir = process.cwd();
    }

    log(message, type = 'info') {
        const colors = {
            error: '\x1b[31m',
            warning: '\x1b[33m',
            success: '\x1b[32m',
            info: '\x1b[36m',
            reset: '\x1b[0m'
        };
        
        console.log(`${colors[type]}${message}${colors.reset}`);
    }

    checkFileExists(filePath, required = true) {
        const fullPath = path.join(this.rootDir, filePath);
        const exists = fs.existsSync(fullPath);
        
        if (exists) {
            this.passed.push(`✓ ${filePath} exists`);
            return true;
        } else {
            const message = `✗ ${filePath} is missing`;
            if (required) {
                this.errors.push(message);
            } else {
                this.warnings.push(message);
            }
            return false;
        }
    }

    checkFileContent(filePath, patterns, description) {
        const fullPath = path.join(this.rootDir, filePath);
        
        if (!fs.existsSync(fullPath)) {
            this.errors.push(`✗ Cannot check ${description}: ${filePath} not found`);
            return false;
        }

        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            let allPassed = true;

            for (const [pattern, desc] of patterns) {
                if (typeof pattern === 'string') {
                    if (content.includes(pattern)) {
                        this.passed.push(`✓ ${desc} found in ${filePath}`);
                    } else {
                        this.errors.push(`✗ ${desc} not found in ${filePath}`);
                        allPassed = false;
                    }
                } else if (pattern instanceof RegExp) {
                    if (pattern.test(content)) {
                        this.passed.push(`✓ ${desc} found in ${filePath}`);
                    } else {
                        this.errors.push(`✗ ${desc} not found in ${filePath}`);
                        allPassed = false;
                    }
                }
            }

            return allPassed;
        } catch (error) {
            this.errors.push(`✗ Error reading ${filePath}: ${error.message}`);
            return false;
        }
    }

    checkNoSensitiveData() {
        const sensitivePatterns = [
            /linhfishCR7/gi,
            /dev@linhfish\.com/gi,
            /com\.lehau/gi,
            /LinhFish Development Team/gi,
            /ghp_[a-zA-Z0-9]{36}/g, // GitHub tokens
            /ghs_[a-zA-Z0-9]{36}/g,
            /[a-f0-9]{40}/g // Potential tokens
        ];

        const filesToCheck = [
            'index.html',
            'js/ui.js',
            'js/github.js',
            'js/templates.js',
            'examples/sample-config.json',
            'test-github-integration.html'
        ];

        let foundSensitive = false;

        for (const file of filesToCheck) {
            const fullPath = path.join(this.rootDir, file);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                
                for (const pattern of sensitivePatterns) {
                    const matches = content.match(pattern);
                    if (matches) {
                        this.errors.push(`✗ Sensitive data found in ${file}: ${matches[0]}`);
                        foundSensitive = true;
                    }
                }
            }
        }

        if (!foundSensitive) {
            this.passed.push('✓ No sensitive data found in source files');
        }

        return !foundSensitive;
    }

    checkConsoleStatements() {
        const jsFiles = [
            'js/ui.js',
            'js/github.js',
            'js/templates.js',
            'js/config.js',
            'js/security.js'
        ];

        let foundConsole = false;

        for (const file of jsFiles) {
            const fullPath = path.join(this.rootDir, file);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const consoleMatches = content.match(/console\.(log|error|warn|debug)/g);
                
                if (consoleMatches) {
                    this.warnings.push(`⚠ Console statements found in ${file}: ${consoleMatches.length} occurrences`);
                    foundConsole = true;
                }
            }
        }

        if (!foundConsole) {
            this.passed.push('✓ No console statements found in production files');
        }

        return !foundConsole;
    }

    validateRequiredFiles() {
        this.log('\n📁 Checking required files...', 'info');

        const requiredFiles = [
            'index.html',
            'css/style.css',
            'js/config.js',
            'js/security.js',
            'js/templates.js',
            'js/ui.js',
            'js/github.js',
            'README.md',
            'LICENSE',
            'PRIVACY.md',
            'SECURITY.md',
            'CONTRIBUTING.md',
            'DEPLOYMENT.md'
        ];

        requiredFiles.forEach(file => this.checkFileExists(file, true));
    }

    validateDocumentation() {
        this.log('\n📚 Checking documentation...', 'info');

        // Check README content
        this.checkFileContent('README.md', [
            ['## Quick Start', 'Quick Start section'],
            ['## Features', 'Features section'],
            ['## License', 'License section'],
            ['MIT License', 'MIT License reference']
        ], 'README documentation');

        // Check LICENSE content
        this.checkFileContent('LICENSE', [
            ['MIT License', 'MIT License header'],
            ['Permission is hereby granted', 'MIT License text']
        ], 'LICENSE file');

        // Check PRIVACY content
        this.checkFileContent('PRIVACY.md', [
            ['We do NOT collect', 'Privacy policy statement'],
            ['Client-Side Only', 'Client-side processing explanation']
        ], 'Privacy policy');
    }

    validateSecurity() {
        this.log('\n🔒 Checking security measures...', 'info');

        // Check CSP header
        this.checkFileContent('index.html', [
            ['Content-Security-Policy', 'Content Security Policy header'],
            ['https://api.github.com', 'GitHub API in CSP']
        ], 'Security headers');

        // Check for sensitive data
        this.checkNoSensitiveData();

        // Check security.js exists and has key functions
        this.checkFileContent('js/security.js', [
            ['validatePackageName', 'Package name validation'],
            ['sanitizeHtml', 'HTML sanitization'],
            ['validateGitHubToken', 'GitHub token validation']
        ], 'Security utilities');
    }

    validateConfiguration() {
        this.log('\n⚙️ Checking configuration...', 'info');

        // Check config.js
        this.checkFileContent('js/config.js', [
            ['const CONFIG', 'Configuration object'],
            ['production:', 'Production flag'],
            ['security:', 'Security settings'],
            ['validation:', 'Validation rules']
        ], 'Configuration file');

        // Check default values are generic
        this.checkFileContent('js/config.js', [
            ['com.yourcompany', 'Generic package prefix'],
            ['Your Name', 'Generic author name'],
            ['your.email@example.com', 'Generic email']
        ], 'Generic default values');
    }

    validateCodeQuality() {
        this.log('\n🧹 Checking code quality...', 'info');

        // Check for console statements
        this.checkConsoleStatements();

        // Check for TODO comments
        const jsFiles = ['js/ui.js', 'js/github.js', 'js/templates.js'];
        let foundTodos = false;

        for (const file of jsFiles) {
            const fullPath = path.join(this.rootDir, file);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const todoMatches = content.match(/TODO|FIXME|HACK/gi);
                
                if (todoMatches) {
                    this.warnings.push(`⚠ TODO/FIXME comments found in ${file}`);
                    foundTodos = true;
                }
            }
        }

        if (!foundTodos) {
            this.passed.push('✓ No TODO/FIXME comments found');
        }
    }

    validateAppStoreAssets() {
        this.log('\n🎨 Checking app store assets...', 'info');

        const assetFiles = [
            'app-store-assets/enhanced-converter.html',
            'app-store-assets/app-icon-512x512.svg',
            'app-store-assets/app-icon-114x114.svg',
            'app-store-assets/feature-graphic-1280x800.svg',
            'app-store-assets/app-store-description.md'
        ];

        assetFiles.forEach(file => this.checkFileExists(file, false));
    }

    generateReport() {
        this.log('\n📊 DEPLOYMENT VALIDATION REPORT', 'info');
        this.log('='.repeat(50), 'info');

        if (this.passed.length > 0) {
            this.log('\n✅ PASSED CHECKS:', 'success');
            this.passed.forEach(item => this.log(`  ${item}`, 'success'));
        }

        if (this.warnings.length > 0) {
            this.log('\n⚠️  WARNINGS:', 'warning');
            this.warnings.forEach(item => this.log(`  ${item}`, 'warning'));
        }

        if (this.errors.length > 0) {
            this.log('\n❌ ERRORS (MUST FIX):', 'error');
            this.errors.forEach(item => this.log(`  ${item}`, 'error'));
        }

        this.log('\n📈 SUMMARY:', 'info');
        this.log(`  Passed: ${this.passed.length}`, 'success');
        this.log(`  Warnings: ${this.warnings.length}`, 'warning');
        this.log(`  Errors: ${this.errors.length}`, 'error');

        const isReady = this.errors.length === 0;
        
        if (isReady) {
            this.log('\n🎉 DEPLOYMENT READY!', 'success');
            this.log('Your Cordova App Generator is ready for public deployment.', 'success');
        } else {
            this.log('\n🚫 NOT READY FOR DEPLOYMENT', 'error');
            this.log('Please fix the errors above before deploying.', 'error');
        }

        return isReady;
    }

    validate() {
        this.log('🔍 Starting deployment validation...', 'info');
        
        this.validateRequiredFiles();
        this.validateDocumentation();
        this.validateSecurity();
        this.validateConfiguration();
        this.validateCodeQuality();
        this.validateAppStoreAssets();
        
        return this.generateReport();
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new DeploymentValidator();
    const isReady = validator.validate();
    process.exit(isReady ? 0 : 1);
}

module.exports = DeploymentValidator;
