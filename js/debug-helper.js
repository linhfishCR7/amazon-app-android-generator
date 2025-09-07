/**
 * Debug Helper for Cordova App Generator
 * Provides debugging utilities and diagnostics
 */

class DebugHelper {
    constructor() {
        this.debugMode = localStorage.getItem('cordova-debug-mode') === 'true';
        this.logs = [];
        this.maxLogs = 1000;
        
        if (this.debugMode) {
            this.enableDebugMode();
        }
    }

    // Enable debug mode
    enableDebugMode() {
        this.debugMode = true;
        localStorage.setItem('cordova-debug-mode', 'true');
        console.log('🐛 Debug mode enabled');
        
        // Override console methods to capture logs
        this.interceptConsole();
        
        // Add debug panel to page
        this.createDebugPanel();
    }

    // Disable debug mode
    disableDebugMode() {
        this.debugMode = false;
        localStorage.setItem('cordova-debug-mode', 'false');
        console.log('🐛 Debug mode disabled');
        
        // Remove debug panel
        const panel = document.getElementById('debug-panel');
        if (panel) {
            panel.remove();
        }
    }

    // Intercept console methods
    interceptConsole() {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        console.log = (...args) => {
            this.addLog('log', args);
            originalLog.apply(console, args);
        };

        console.error = (...args) => {
            this.addLog('error', args);
            originalError.apply(console, args);
        };

        console.warn = (...args) => {
            this.addLog('warn', args);
            originalWarn.apply(console, args);
        };
    }

    // Add log entry
    addLog(type, args) {
        const timestamp = new Date().toISOString();
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');

        this.logs.push({
            timestamp,
            type,
            message
        });

        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Update debug panel if visible
        this.updateDebugPanel();
    }

    // Create debug panel
    createDebugPanel() {
        if (document.getElementById('debug-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.innerHTML = `
            <div class="debug-header">
                <h3>🐛 Debug Console</h3>
                <div class="debug-controls">
                    <button onclick="debugHelper.clearLogs()">Clear</button>
                    <button onclick="debugHelper.exportLogs()">Export</button>
                    <button onclick="debugHelper.runDiagnostics()">Diagnostics</button>
                    <button onclick="debugHelper.disableDebugMode()">Close</button>
                </div>
            </div>
            <div class="debug-content">
                <div id="debug-logs"></div>
            </div>
        `;

        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 500px;
            height: 300px;
            background: #1e1e1e;
            color: #ffffff;
            border: 1px solid #333;
            border-radius: 8px;
            z-index: 10000;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
        `;

        const header = panel.querySelector('.debug-header');
        header.style.cssText = `
            padding: 10px;
            background: #333;
            border-bottom: 1px solid #555;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const content = panel.querySelector('.debug-content');
        content.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        `;

        document.body.appendChild(panel);
        this.updateDebugPanel();
    }

    // Update debug panel content
    updateDebugPanel() {
        const logsContainer = document.getElementById('debug-logs');
        if (!logsContainer) return;

        const recentLogs = this.logs.slice(-50); // Show last 50 logs
        logsContainer.innerHTML = recentLogs.map(log => {
            const color = {
                log: '#ffffff',
                error: '#ff6b6b',
                warn: '#ffa500'
            }[log.type] || '#ffffff';

            return `
                <div style="margin-bottom: 5px; color: ${color};">
                    <span style="color: #888;">[${log.timestamp.split('T')[1].split('.')[0]}]</span>
                    <span style="color: #4a9eff;">[${log.type.toUpperCase()}]</span>
                    ${log.message}
                </div>
            `;
        }).join('');

        // Auto-scroll to bottom
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    // Clear logs
    clearLogs() {
        this.logs = [];
        this.updateDebugPanel();
    }

    // Export logs
    exportLogs() {
        const logData = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            logs: this.logs
        };

        const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `cordova-debug-logs-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    // Run diagnostics
    runDiagnostics() {
        console.log('🔍 Running diagnostics...');
        
        const diagnostics = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            modules: this.checkModules(),
            dom: this.checkDOM(),
            localStorage: this.checkLocalStorage(),
            apis: this.checkAPIs()
        };

        console.log('📊 Diagnostics Results:', diagnostics);
        return diagnostics;
    }

    // Check if modules are loaded
    checkModules() {
        const modules = [
            'AppManager',
            'CordovaAppGeneratorApp',
            'GitHubIntegration',
            'CodemagicIntegration',
            'UIManager',
            'AppTemplatesManager',
            'TemplateManager'
        ];

        return modules.reduce((result, module) => {
            result[module] = {
                loaded: typeof window[module] !== 'undefined',
                instance: typeof window[module.toLowerCase()] !== 'undefined'
            };
            return result;
        }, {});
    }

    // Check DOM elements
    checkDOM() {
        const elements = [
            'templatesGrid',
            'templateFilter',
            'templateSearch',
            'codemagicStatus',
            'codemagicApiToken',
            'testCodemagicBtn'
        ];

        return elements.reduce((result, id) => {
            const element = document.getElementById(id);
            result[id] = {
                exists: !!element,
                visible: element ? element.offsetParent !== null : false,
                value: element && element.value ? element.value.substring(0, 10) + '...' : null
            };
            return result;
        }, {});
    }

    // Check localStorage
    checkLocalStorage() {
        try {
            const keys = [
                'cordova-generator-config',
                'codemagic_token',
                'codemagic_team_id'
            ];

            return keys.reduce((result, key) => {
                const value = localStorage.getItem(key);
                result[key] = {
                    exists: value !== null,
                    length: value ? value.length : 0
                };
                return result;
            }, {});
        } catch (error) {
            return { error: error.message };
        }
    }

    // Check API connectivity
    async checkAPIs() {
        const results = {};

        // Check GitHub API
        try {
            const response = await fetch('https://api.github.com/rate_limit');
            results.github = {
                accessible: response.ok,
                status: response.status,
                rateLimit: response.ok ? await response.json() : null
            };
        } catch (error) {
            results.github = { accessible: false, error: error.message };
        }

        // Check Codemagic API
        try {
            const response = await fetch('https://api.codemagic.io/apps', {
                method: 'HEAD' // Just check if endpoint is reachable
            });
            results.codemagic = {
                accessible: true,
                status: response.status
            };
        } catch (error) {
            results.codemagic = { accessible: false, error: error.message };
        }

        return results;
    }

    // Test GitHub authentication
    async testGitHubAuth() {
        const tokenInput = document.getElementById('githubToken');
        let token = '';

        if (tokenInput && tokenInput._getActualValue) {
            token = tokenInput._getActualValue();
        } else if (tokenInput) {
            token = tokenInput.value;
        }

        if (!token) {
            console.error('❌ No GitHub token found');
            return false;
        }

        token = token.trim();
        console.log('🔑 Testing GitHub token:', token.substring(0, 8) + '...');

        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Cordova-App-Generator/1.0'
                }
            });

            console.log('📡 GitHub API Response:', response.status, response.statusText);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ GitHub authentication successful:', data);
                return true;
            } else {
                console.error('❌ GitHub authentication failed:', response.status, response.statusText);
                const errorText = await response.text().catch(() => 'No error details');
                console.error('Error details:', errorText);
                return false;
            }
        } catch (error) {
            console.error('❌ GitHub API error:', error);
            return false;
        }
    }

    // Test Codemagic authentication
    async testCodemagicAuth() {
        const tokenInput = document.getElementById('codemagicApiToken');
        let token = '';

        if (tokenInput && tokenInput._getActualValue) {
            token = tokenInput._getActualValue();
        } else if (tokenInput) {
            token = tokenInput.value;
        }

        if (!token) {
            console.error('❌ No Codemagic token found');
            return false;
        }

        token = token.trim();
        console.log('🔑 Testing Codemagic token:', token.substring(0, 8) + '...');

        try {
            const response = await fetch('https://api.codemagic.io/apps', {
                headers: {
                    'x-auth-token': token,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Codemagic API Response:', response.status, response.statusText);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Codemagic authentication successful:', data);
                return true;
            } else {
                console.error('❌ Codemagic authentication failed:', response.status, response.statusText);
                const errorText = await response.text().catch(() => 'No error details');
                console.error('Error details:', errorText);
                return false;
            }
        } catch (error) {
            console.error('❌ Codemagic API error:', error);
            return false;
        }
    }
}

// Initialize debug helper
if (typeof window !== 'undefined') {
    window.DebugHelper = DebugHelper;
    window.debugHelper = new DebugHelper();

    // Add keyboard shortcut to toggle debug mode (Ctrl+Shift+D)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            if (window.debugHelper.debugMode) {
                window.debugHelper.disableDebugMode();
            } else {
                window.debugHelper.enableDebugMode();
            }
        }
    });

    // Test template-to-repository name matching
    window.debugHelper.testTemplateMatching = function() {
        console.log('🧪 Testing template-to-repository name matching...');

        if (!window.appManager) {
            console.error('❌ App Manager not available');
            return;
        }

        const templates = window.appManager.templates || [];
        const repositories = window.appManager.githubRepositories || [];

        console.log(`📊 Found ${templates.length} templates and ${repositories.length} repositories`);

        templates.forEach(template => {
            console.log(`\n🔍 Testing template: "${template.name}"`);

            // Generate name variations
            const variations = window.appManager.generateNameVariations(template.name);
            console.log(`   Name variations:`, variations);

            // Check current matching status
            if (template.hasGitHubRepo && template.matchedRepoName) {
                console.log(`   ✅ Matched with repository: "${template.matchedRepoName}"`);
                console.log(`   📊 Status: ${template.repoStatus?.statusText} (${template.repoStatus?.status})`);
            } else {
                console.log(`   ❌ No repository match found`);

                // Show potential matches
                const potentialMatches = repositories.filter(repo => {
                    const repoVariations = window.appManager.generateNameVariations(repo.name);
                    return variations.some(templateVar =>
                        repoVariations.some(repoVar =>
                            templateVar.toLowerCase().includes(repoVar.toLowerCase()) ||
                            repoVar.toLowerCase().includes(templateVar.toLowerCase())
                        )
                    );
                });

                if (potentialMatches.length > 0) {
                    console.log(`   💡 Potential matches:`, potentialMatches.map(r => r.name));
                }
            }
        });

        console.log('\n📈 Matching Summary:');
        const matched = templates.filter(t => t.hasGitHubRepo).length;
        const total = templates.length;
        console.log(`   Matched: ${matched}/${total} (${Math.round(matched/total*100)}%)`);

        const statusCounts = {
            public: templates.filter(t => t.repoStatus?.status === 'public').length,
            private: templates.filter(t => t.repoStatus?.status === 'private').length,
            archived: templates.filter(t => t.repoStatus?.status === 'archived').length,
            disabled: templates.filter(t => t.repoStatus?.status === 'disabled').length,
            not_found: templates.filter(t => t.repoStatus?.status === 'not_found').length
        };

        console.log('   Status breakdown:', statusCounts);
    };

    console.log('🐛 Debug Helper loaded. Press Ctrl+Shift+D to toggle debug mode.');
    console.log('🧪 Use debugHelper.testTemplateMatching() to test repository matching.');
}
