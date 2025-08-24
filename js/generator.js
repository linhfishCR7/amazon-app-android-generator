/**
 * Cordova App Generation Engine
 * Core logic for generating Cordova projects with customized configurations
 */

class CordovaAppGenerator {
    constructor() {
        this.isGenerating = false;
        this.currentGeneration = null;
        this.generationQueue = [];
        this.generatedApps = [];
        this.eventListeners = new Map();
    }

    // Event system for progress tracking
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

    // Generate multiple apps
    async generateApps(templates, config) {
        if (this.isGenerating) {
            throw new Error('Generation already in progress');
        }

        this.isGenerating = true;
        this.currentGeneration = {
            templates,
            config,
            startTime: Date.now(),
            progress: 0,
            currentApp: null,
            results: []
        };

        try {
            this.emit('generation:start', {
                totalApps: templates.length,
                config
            });

            for (let i = 0; i < templates.length; i++) {
                const template = templates[i];
                const progress = Math.round((i / templates.length) * 100);
                
                this.currentGeneration.progress = progress;
                this.currentGeneration.currentApp = template;
                
                this.emit('generation:progress', {
                    progress,
                    currentApp: template,
                    appIndex: i + 1,
                    totalApps: templates.length
                });

                try {
                    const result = await this.generateSingleApp(template, config);
                    this.currentGeneration.results.push(result);
                    
                    this.emit('generation:app-complete', {
                        template,
                        result,
                        appIndex: i + 1,
                        totalApps: templates.length
                    });
                } catch (error) {
                    const errorResult = {
                        template,
                        success: false,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    };
                    
                    this.currentGeneration.results.push(errorResult);
                    
                    this.emit('generation:app-error', {
                        template,
                        error,
                        appIndex: i + 1,
                        totalApps: templates.length
                    });
                }
            }

            const finalResults = {
                success: true,
                totalApps: templates.length,
                successfulApps: this.currentGeneration.results.filter(r => r.success).length,
                failedApps: this.currentGeneration.results.filter(r => !r.success).length,
                results: this.currentGeneration.results,
                duration: Date.now() - this.currentGeneration.startTime
            };

            this.emit('generation:complete', finalResults);
            return finalResults;

        } catch (error) {
            this.emit('generation:error', { error });
            throw error;
        } finally {
            this.isGenerating = false;
            this.currentGeneration = null;
        }
    }

    // Generate a single app
    async generateSingleApp(template, config) {
        const appConfig = this.createAppConfig(template, config);
        
        this.emit('generation:app-start', { template, config: appConfig });

        try {
            // Simulate generation steps with realistic timing
            await this.simulateStep('Creating project structure', 1000);
            const projectStructure = this.generateProjectStructure(appConfig);

            await this.simulateStep('Generating configuration files', 800);
            const configFiles = this.generateConfigFiles(appConfig);

            await this.simulateStep('Creating HTML interface', 1200);
            const htmlFiles = this.generateHTMLFiles(appConfig);

            await this.simulateStep('Generating CSS styles', 1000);
            const cssFiles = this.generateCSSFiles(appConfig);

            await this.simulateStep('Creating JavaScript logic', 1500);
            const jsFiles = this.generateJSFiles(appConfig);

            await this.simulateStep('Setting up plugins', 600);
            const pluginConfig = this.generatePluginConfig(appConfig);

            await this.simulateStep('Creating documentation', 800);
            const documentation = this.generateDocumentation(appConfig);

            await this.simulateStep('Finalizing project', 500);

            const generatedApp = {
                template,
                config: appConfig,
                files: {
                    ...projectStructure,
                    ...configFiles,
                    ...htmlFiles,
                    ...cssFiles,
                    ...jsFiles,
                    ...documentation
                },
                plugins: pluginConfig,
                success: true,
                timestamp: new Date().toISOString(),
                packageName: `${config.packagePrefix}.${template.name}`,
                repositoryUrl: `https://github.com/${config.githubUsername}/${template.name}`
            };

            this.generatedApps.push(generatedApp);
            return generatedApp;

        } catch (error) {
            throw new Error(`Failed to generate ${template.name}: ${error.message}`);
        }
    }

    // Simulate generation step with progress
    async simulateStep(stepName, duration) {
        this.emit('generation:step', { stepName, duration });
        return new Promise(resolve => setTimeout(resolve, duration));
    }

    // Create app-specific configuration
    createAppConfig(template, globalConfig) {
        return {
            ...globalConfig,
            appName: template.name,
            displayName: template.displayName,
            description: template.description,
            packageName: `${globalConfig.packagePrefix}.${template.name}`,
            version: '1.0.0',
            template,
            plugins: template.plugins || [],
            features: template.features || [],
            icon: template.icon,
            color: template.color,
            category: template.category
        };
    }

    // Generate project structure
    generateProjectStructure(config) {
        return {
            'package.json': this.generatePackageJson(config),
            '.gitignore': this.generateGitignore(),
            'hooks/README.md': '# Cordova Hooks\n\nThis directory contains custom hooks for the Cordova build process.',
            'www/.gitkeep': '',
            'platforms/.gitkeep': '',
            'plugins/.gitkeep': ''
        };
    }

    // Generate package.json
    generatePackageJson(config) {
        return JSON.stringify({
            name: config.appName.toLowerCase(),
            displayName: config.displayName,
            version: config.version,
            description: config.description,
            main: 'index.js',
            scripts: {
                build: 'cordova build',
                'build:android': 'cordova build android',
                'build:android:release': 'cordova build android --release',
                'run:android': 'cordova run android',
                clean: 'cordova clean',
                prepare: 'cordova prepare',
                serve: 'cordova serve'
            },
            keywords: [
                'cordova',
                'phonegap',
                'mobile',
                'app',
                config.category,
                config.appName.toLowerCase()
            ],
            author: `${config.authorName} <${config.authorEmail}>`,
            license: 'MIT',
            devDependencies: {
                cordova: '^14.0.0'
            },
            cordova: {
                platforms: ['android'],
                plugins: {}
            }
        }, null, 2);
    }

    // Generate .gitignore
    generateGitignore() {
        return `# Cordova
platforms/
plugins/
node_modules/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Build
www/cordova.js
www/cordova_plugins.js
www/plugins/

# Temporary
.tmp/
.temp/`;
    }

    // Generate configuration files
    generateConfigFiles(config) {
        return {
            'config.xml': this.generateConfigXml(config)
        };
    }

    // Generate config.xml
    generateConfigXml(config) {
        // Define specific plugin versions to avoid "latest" lookup failures
        const pluginVersions = {
            'cordova-plugin-whitelist': '1.3.5',
            'cordova-plugin-splashscreen': '6.0.2',
            'cordova-plugin-statusbar': '4.0.0',
            'cordova-plugin-device': '2.1.0',
            'cordova-plugin-geolocation': '5.0.0',
            'cordova-plugin-camera': '7.0.0',
            'cordova-plugin-file': '8.0.1',
            'cordova-plugin-network-information': '3.0.0',
            'cordova-plugin-vibration': '4.0.0',
            'cordova-plugin-local-notification': '0.9.0-beta.2',
            'cordova-plugin-calendar': '5.1.5',
            'cordova-plugin-contacts': '4.0.0',
            'cordova-plugin-media': '7.0.0',
            'cordova-plugin-media-capture': '5.0.0',
            'cordova-plugin-barcodescanner': '0.7.4',
            'cordova-plugin-inappbrowser': '6.0.0'
        };

        const plugins = config.plugins.map(plugin => {
            const version = pluginVersions[plugin] || '1.0.0';
            // Safety check: never allow "latest" versions
            if (version === 'latest') {
                console.warn(`Plugin ${plugin} attempted to use "latest" version, using 1.0.0 instead`);
                return `    <plugin name="${plugin}" spec="1.0.0" />`;
            }
            return `    <plugin name="${plugin}" spec="${version}" />`;
        }).join('\n');

        return `<?xml version='1.0' encoding='utf-8'?>
<widget id="${config.packageName}" version="${config.version}" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
    <name>${config.displayName}</name>
    <description>${config.description}</description>
    <author email="${config.authorEmail}" href="https://github.com/${config.githubUsername}">
        ${config.authorName}
    </author>
    <content src="index.html" />
    <access origin="*" />
    <allow-intent href="http://*/*" />
    <allow-intent href="https://*/*" />
    <allow-intent href="tel:*" />
    <allow-intent href="sms:*" />
    <allow-intent href="mailto:*" />
    <allow-intent href="geo:*" />
    
    <platform name="android">
        <allow-intent href="market:*" />
        <!-- Use our generated logo for all icon densities -->
        <icon density="ldpi" src="www/img/logo.png" />
        <icon density="mdpi" src="www/img/logo.png" />
        <icon density="hdpi" src="www/img/logo.png" />
        <icon density="xhdpi" src="www/img/logo.png" />
        <icon density="xxhdpi" src="www/img/logo.png" />
        <icon density="xxxhdpi" src="www/img/logo.png" />
    </platform>

    <preference name="DisallowOverscroll" value="true" />
    <preference name="android-minSdkVersion" value="${config.androidMinSdk || 24}" />
    <preference name="android-targetSdkVersion" value="35" />
    <preference name="android-compileSdkVersion" value="35" />
    <preference name="BackupWebStorage" value="none" />
    <preference name="Orientation" value="portrait" />

    <!-- Default plugins with specific versions -->
    <plugin name="cordova-plugin-whitelist" spec="1.3.5" />
    <plugin name="cordova-plugin-statusbar" spec="4.0.0" />
    
    <!-- App-specific plugins -->
${plugins}
</widget>`;
    }

    // Generate HTML files
    generateHTMLFiles(config) {
        return {
            'www/index.html': this.generateIndexHtml(config)
        };
    }

    // Generate main HTML file
    generateIndexHtml(config) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' data: gap: https://ssl.gstatic.com 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; media-src *; img-src 'self' data: content: https:;">
    <title>${config.displayName}</title>
    <link rel="stylesheet" href="css/index.css">
</head>
<body>
    <div class="app">
        <header class="header">
            <div class="header-content">
                <div class="app-icon">${config.icon}</div>
                <div class="app-info">
                    <h1 class="app-title">${config.displayName}</h1>
                    <p class="app-subtitle">${config.description}</p>
                </div>
            </div>
        </header>
        
        <main class="main-content">
            <div class="welcome-section">
                <div class="welcome-icon">${config.icon}</div>
                <h2>Welcome to ${config.displayName}</h2>
                <p class="welcome-description">${config.description}</p>
                
                <div class="features-list">
                    ${config.features.map(feature => 
                        `<div class="feature-item">
                            <span class="feature-icon">✨</span>
                            <span class="feature-text">${feature}</span>
                        </div>`
                    ).join('')}
                </div>
                
                <button class="get-started-btn" id="getStartedBtn">Get Started</button>
            </div>
            
            <div class="app-content" id="appContent" style="display: none;">
                <div class="content-section">
                    <h3>${config.displayName} is Ready!</h3>
                    <p>This is where your app's main functionality will be implemented.</p>
                    
                    <div class="action-buttons">
                        <button class="btn btn-primary" id="primaryAction">Primary Action</button>
                        <button class="btn btn-secondary" id="secondaryAction">Secondary Action</button>
                    </div>
                </div>
            </div>
        </main>
        
        <footer class="footer">
            <p>&copy; 2024 ${config.displayName}. Built with Apache Cordova.</p>
        </footer>
    </div>
    
    <script type="text/javascript" src="cordova.js"></script>
    <script type="text/javascript" src="js/index.js"></script>
</body>
</html>`;
    }

    // Generate CSS files
    generateCSSFiles(config) {
        return {
            'www/css/index.css': this.generateIndexCSS(config)
        };
    }

    // Generate main CSS file
    generateIndexCSS(config) {
        return `/* ${config.displayName} - Mobile App Styles */

:root {
    --primary-color: ${config.color};
    --primary-hover: ${this.darkenColor(config.color, 10)};
    --primary-light: ${this.lightenColor(config.color, 20)};
    --bg-primary: #ffffff;
    --bg-secondary: #f8fafc;
    --text-primary: #1a202c;
    --text-secondary: #4a5568;
    --text-muted: #718096;
    --border-color: #e2e8f0;
    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --radius: 0.5rem;
    --spacing: 1rem;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
    color: var(--text-primary);
    min-height: 100vh;
    overflow-x: hidden;
}

.app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.header {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: var(--spacing);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.header-content {
    display: flex;
    align-items: center;
    gap: var(--spacing);
    max-width: 400px;
    margin: 0 auto;
}

.app-icon {
    font-size: 2.5rem;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.2);
    border-radius: var(--radius);
}

.app-title {
    color: white;
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
}

.app-subtitle {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.875rem;
}

.main-content {
    flex: 1;
    padding: var(--spacing);
    display: flex;
    align-items: center;
    justify-content: center;
}

.welcome-section {
    background: rgba(255, 255, 255, 0.95);
    border-radius: calc(var(--radius) * 2);
    padding: calc(var(--spacing) * 2);
    text-align: center;
    box-shadow: var(--shadow);
    max-width: 400px;
    width: 100%;
}

.welcome-icon {
    font-size: 4rem;
    margin-bottom: var(--spacing);
}

.welcome-section h2 {
    color: var(--text-primary);
    font-size: 1.75rem;
    margin-bottom: var(--spacing);
    font-weight: 700;
}

.welcome-description {
    color: var(--text-secondary);
    margin-bottom: calc(var(--spacing) * 1.5);
    line-height: 1.6;
}

.features-list {
    margin-bottom: calc(var(--spacing) * 1.5);
}

.feature-item {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: calc(var(--spacing) * 0.5) 0;
    border-bottom: 1px solid var(--border-color);
}

.feature-item:last-child {
    border-bottom: none;
}

.feature-icon {
    margin-right: var(--spacing);
    width: 30px;
}

.feature-text {
    color: var(--text-primary);
    font-weight: 500;
}

.get-started-btn {
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
    color: white;
    border: none;
    padding: calc(var(--spacing) * 0.75) calc(var(--spacing) * 2);
    border-radius: calc(var(--radius) * 2);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease;
    box-shadow: var(--shadow);
}

.get-started-btn:hover {
    transform: translateY(-2px);
}

.app-content {
    background: rgba(255, 255, 255, 0.95);
    border-radius: calc(var(--radius) * 2);
    padding: calc(var(--spacing) * 2);
    text-align: center;
    box-shadow: var(--shadow);
    max-width: 400px;
    width: 100%;
}

.content-section h3 {
    color: var(--text-primary);
    font-size: 1.5rem;
    margin-bottom: var(--spacing);
}

.content-section p {
    color: var(--text-secondary);
    margin-bottom: calc(var(--spacing) * 1.5);
    line-height: 1.6;
}

.action-buttons {
    display: flex;
    gap: var(--spacing);
    justify-content: center;
    flex-wrap: wrap;
}

.btn {
    padding: calc(var(--spacing) * 0.75) calc(var(--spacing) * 1.5);
    border: none;
    border-radius: var(--radius);
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-primary {
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-hover) 100%);
    color: white;
    box-shadow: var(--shadow);
}

.btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 2px solid var(--border-color);
}

.btn:hover {
    transform: translateY(-2px);
}

.footer {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    padding: var(--spacing);
    text-align: center;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.footer p {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.75rem;
}

/* Responsive Design */
@media (max-width: 480px) {
    .main-content {
        padding: calc(var(--spacing) * 0.5);
    }
    
    .welcome-section,
    .app-content {
        padding: var(--spacing);
    }
    
    .action-buttons {
        flex-direction: column;
    }
    
    .btn {
        width: 100%;
    }
}

/* Animation */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.welcome-section,
.app-content {
    animation: fadeIn 0.6s ease-out;
}`;
    }

    // Generate JavaScript files
    generateJSFiles(config) {
        return {
            'www/js/index.js': this.generateIndexJS(config)
        };
    }

    // Generate main JavaScript file
    generateIndexJS(config) {
        return `/*
 * ${config.displayName} - Mobile Application
 * Built with Apache Cordova
 */

class ${config.appName}App {
    constructor() {
        this.isDeviceReady = false;
        this.init();
    }
    
    init() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
        document.addEventListener('DOMContentLoaded', this.onDOMReady.bind(this), false);
    }
    
    onDeviceReady() {
        console.log('Device is ready');
        this.isDeviceReady = true;
        this.setupEventListeners();
        this.initializeApp();
    }
    
    onDOMReady() {
        console.log('DOM is ready');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const getStartedBtn = document.getElementById('getStartedBtn');
        const primaryAction = document.getElementById('primaryAction');
        const secondaryAction = document.getElementById('secondaryAction');
        
        if (getStartedBtn) {
            getStartedBtn.addEventListener('click', this.showAppContent.bind(this));
        }
        
        if (primaryAction) {
            primaryAction.addEventListener('click', this.handlePrimaryAction.bind(this));
        }
        
        if (secondaryAction) {
            secondaryAction.addEventListener('click', this.handleSecondaryAction.bind(this));
        }
        
        // Handle back button (Android)
        document.addEventListener('backbutton', this.onBackButton.bind(this), false);
        
        // Handle pause/resume
        document.addEventListener('pause', this.onPause.bind(this), false);
        document.addEventListener('resume', this.onResume.bind(this), false);
    }
    
    initializeApp() {
        console.log('Initializing ${config.displayName}...');
        
        // Check device information
        if (window.device) {
            console.log('Device Info:', {
                platform: device.platform,
                version: device.version,
                model: device.model
            });
        }
        
        // Initialize app-specific features
        this.loadAppData();
        this.setupNotifications();
    }
    
    showAppContent() {
        const welcomeSection = document.querySelector('.welcome-section');
        const appContent = document.getElementById('appContent');
        
        if (welcomeSection && appContent) {
            welcomeSection.style.display = 'none';
            appContent.style.display = 'block';
        }
    }
    
    handlePrimaryAction() {
        console.log('Primary action triggered');
        this.showMessage('Primary action executed!', 'success');
        
        // Add your primary functionality here
    }
    
    handleSecondaryAction() {
        console.log('Secondary action triggered');
        this.showMessage('Secondary action executed!', 'info');
        
        // Add your secondary functionality here
    }
    
    loadAppData() {
        // Load app-specific data from local storage
        const savedData = localStorage.getItem('${config.appName}_data');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                console.log('Loaded app data:', data);
            } catch (error) {
                console.error('Error loading app data:', error);
            }
        }
    }
    
    saveAppData(data) {
        try {
            localStorage.setItem('${config.appName}_data', JSON.stringify(data));
            console.log('App data saved successfully');
        } catch (error) {
            console.error('Error saving app data:', error);
        }
    }
    
    setupNotifications() {
        // Setup local notifications if plugin is available
        if (window.cordova && window.cordova.plugins && window.cordova.plugins.notification) {
            console.log('Local notifications available');
        }
    }
    
    showMessage(message, type = 'info') {
        // Create and show a temporary message
        const messageDiv = document.createElement('div');
        messageDiv.className = \`message message-\${type}\`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = \`
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: \${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 12px 24px;
            border-radius: 20px;
            z-index: 1000;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        \`;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
    }
    
    onBackButton() {
        // Handle Android back button
        const appContent = document.getElementById('appContent');
        const welcomeSection = document.querySelector('.welcome-section');
        
        if (appContent && appContent.style.display !== 'none') {
            appContent.style.display = 'none';
            welcomeSection.style.display = 'block';
        } else {
            navigator.app.exitApp();
        }
    }
    
    onPause() {
        console.log('App paused');
        this.saveAppData({
            lastPaused: new Date().toISOString()
        });
    }
    
    onResume() {
        console.log('App resumed');
        this.loadAppData();
    }
}

// Initialize the app
const app = new ${config.appName}App();`;
    }

    // Generate plugin configuration
    generatePluginConfig(config) {
        // Define specific plugin versions to avoid "latest" lookup failures
        const pluginVersions = {
            'cordova-plugin-whitelist': '1.3.5',
            'cordova-plugin-splashscreen': '6.0.2',
            'cordova-plugin-statusbar': '4.0.0',
            'cordova-plugin-device': '2.1.0',
            'cordova-plugin-geolocation': '5.0.0',
            'cordova-plugin-camera': '7.0.0',
            'cordova-plugin-file': '8.0.1',
            'cordova-plugin-network-information': '3.0.0',
            'cordova-plugin-vibration': '4.0.0',
            'cordova-plugin-local-notification': '0.9.0-beta.2',
            'cordova-plugin-calendar': '5.1.5',
            'cordova-plugin-contacts': '4.0.0',
            'cordova-plugin-media': '7.0.0',
            'cordova-plugin-media-capture': '5.0.0',
            'cordova-plugin-barcodescanner': '0.7.4',
            'cordova-plugin-inappbrowser': '6.0.0'
        };

        return config.plugins.map(pluginId => {
            const version = pluginVersions[pluginId] || '1.0.0';
            // Safety check: never allow "latest" versions
            if (version === 'latest') {
                console.warn(`Plugin ${pluginId} attempted to use "latest" version, using 1.0.0 instead`);
                return {
                    id: pluginId,
                    version: '1.0.0',
                    variables: {}
                };
            }
            return {
                id: pluginId,
                version: version,
                variables: {}
            };
        });
    }

    // Generate documentation
    generateDocumentation(config) {
        return {
            'README.md': this.generateReadme(config),
            'LICENSE': this.generateLicense(config)
        };
    }

    // Generate README.md
    generateReadme(config) {
        return `# ${config.displayName}

${config.description}

## 📱 App Information

- **Package Name:** \`${config.packageName}\`
- **Category:** ${config.category}
- **Platform:** Android (Cordova/PhoneGap)
- **Version:** ${config.version}

## 🚀 Features

${config.features.map(feature => `- ${feature}`).join('\n')}

## 🛠️ Build Instructions

### Prerequisites

- Node.js (v14 or higher)
- Apache Cordova CLI
- Android SDK (for Android builds)

### Setup

1. Clone this repository:
   \`\`\`bash
   git clone https://github.com/${config.githubUsername}/${config.appName}.git
   cd ${config.appName}
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Add platforms:
   \`\`\`bash
   cordova platform add android
   \`\`\`

4. Build the app:
   \`\`\`bash
   cordova build android
   \`\`\`

### Development

- **Run on device/emulator:**
  \`\`\`bash
  cordova run android
  \`\`\`

- **Build for production:**
  \`\`\`bash
  cordova build android --release
  \`\`\`

## 📦 Plugins Used

${config.plugins.map(plugin => `- \`${plugin}\``).join('\n')}

## 🚀 Deployment

This repository is configured to work with third-party build services like:

- **PhoneGap Build**
- **Monaca**
- **Ionic Appflow**

Simply push this repository to your preferred build service to generate APK files.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**${config.authorName}**
- GitHub: [@${config.githubUsername}](https://github.com/${config.githubUsername})
- Email: ${config.authorEmail}

---

Built with ❤️ using Apache Cordova`;
    }

    // Generate LICENSE
    generateLicense(config) {
        const year = new Date().getFullYear();
        return `MIT License

Copyright (c) ${year} ${config.authorName}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
    }

    // Utility functions for color manipulation
    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    // Cancel current generation
    cancelGeneration() {
        if (this.isGenerating) {
            this.isGenerating = false;
            this.emit('generation:cancelled');
        }
    }

    // Get generation status
    getGenerationStatus() {
        return {
            isGenerating: this.isGenerating,
            currentGeneration: this.currentGeneration,
            generatedApps: this.generatedApps.length
        };
    }
}

// Export for use in other modules
window.CordovaAppGenerator = CordovaAppGenerator;
