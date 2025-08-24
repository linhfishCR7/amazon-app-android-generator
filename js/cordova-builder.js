/**
 * Cordova Build Preparation Module
 * Handles the creation of proper Cordova project structures ready for building
 */

class CordovaBuildPreparation {
    constructor() {
        this.eventListeners = new Map();
        this.isBuilding = false;
        this.currentBuild = null;
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

    // Prepare Cordova project structure for multiple apps
    async prepareCordovaProjects(generatedApps, config) {
        if (this.isBuilding) {
            throw new Error('Build preparation already in progress');
        }

        this.isBuilding = true;
        this.currentBuild = {
            apps: generatedApps,
            config,
            startTime: Date.now(),
            progress: 0,
            results: []
        };

        try {
            this.emit('build:start', {
                totalApps: generatedApps.length,
                config
            });

            for (let i = 0; i < generatedApps.length; i++) {
                const app = generatedApps[i];
                const progress = Math.round((i / generatedApps.length) * 100);
                
                this.currentBuild.progress = progress;
                
                this.emit('build:progress', {
                    progress,
                    currentApp: app.config.appName,
                    appIndex: i + 1,
                    totalApps: generatedApps.length
                });

                try {
                    const buildResult = await this.prepareSingleCordovaProject(app, config);
                    this.currentBuild.results.push(buildResult);
                    
                    this.emit('build:app-complete', {
                        app: app.config,
                        result: buildResult,
                        appIndex: i + 1,
                        totalApps: generatedApps.length
                    });
                } catch (error) {
                    const errorResult = {
                        app: app.config,
                        success: false,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    };
                    
                    this.currentBuild.results.push(errorResult);
                    
                    this.emit('build:app-error', {
                        app: app.config,
                        error,
                        appIndex: i + 1,
                        totalApps: generatedApps.length
                    });
                }
            }

            const finalResults = {
                success: true,
                totalApps: generatedApps.length,
                successfulBuilds: this.currentBuild.results.filter(r => r.success).length,
                failedBuilds: this.currentBuild.results.filter(r => !r.success).length,
                results: this.currentBuild.results,
                duration: Date.now() - this.currentBuild.startTime
            };

            this.emit('build:complete', finalResults);
            return finalResults;

        } catch (error) {
            this.emit('build:error', { error });
            throw error;
        } finally {
            this.isBuilding = false;
            this.currentBuild = null;
        }
    }

    // Prepare a single Cordova project
    async prepareSingleCordovaProject(generatedApp, config) {
        const appConfig = generatedApp.config;
        const appName = appConfig.appName;
        
        this.emit('build:step', { 
            appName, 
            step: 'Creating Cordova project structure' 
        });

        try {
            // Create proper Cordova project structure
            const cordovaProject = this.createCordovaProjectStructure(generatedApp, config);
            
            // Generate Codemagic configuration
            const codemagicConfig = this.generateCodemagicConfig(appConfig, config);
            
            // Create build-ready files
            const buildFiles = {
                ...cordovaProject.files,
                'codemagic.yaml': codemagicConfig
            };

            // Generate build scripts
            const buildScripts = this.generateBuildScripts(appConfig);

            const buildResult = {
                app: appConfig,
                cordovaStructure: cordovaProject.structure,
                files: buildFiles,
                buildScripts,
                packageName: `com.lehau.${appName}`,
                buildReady: true,
                success: true,
                timestamp: new Date().toISOString()
            };

            return buildResult;

        } catch (error) {
            throw new Error(`Failed to prepare Cordova project for ${appName}: ${error.message}`);
        }
    }

    // Create proper Cordova project structure
    createCordovaProjectStructure(generatedApp, config) {
        const appConfig = generatedApp.config;
        const appName = appConfig.appName;
        const packageName = `com.lehau.${appName}`;

        // Create the proper Cordova config.xml
        const cordovaConfigXml = this.generateCordovaConfigXml(appConfig, packageName);
        
        // Create the proper package.json for Cordova
        const cordovaPackageJson = this.generateCordovaPackageJson(appConfig, packageName);

        // Organize web assets for www directory
        const webAssets = this.organizeWebAssets(generatedApp.files);

        // Create the complete file structure
        const files = {
            'config.xml': cordovaConfigXml,
            'package.json': cordovaPackageJson,
            ...webAssets,
            '.gitignore': this.generateCordovaGitignore(),
            'README.md': this.generateCordovaReadme(appConfig, packageName),
            'www/manifest.json': this.generateManifestJson(appConfig, packageName),
            'www/js/index.js': this.generateCordovaIndexJs(appConfig)
        };

        const structure = {
            projectName: appName,
            packageName: packageName,
            directories: [
                'www',
                'www/css',
                'www/js',
                'www/img',
                'platforms',
                'plugins',
                'hooks'
            ],
            files: Object.keys(files)
        };

        return { structure, files };
    }

    // Generate proper Cordova config.xml (matching RetroGames structure exactly)
    generateCordovaConfigXml(appConfig, packageName) {
        return `<?xml version='1.0' encoding='utf-8'?>
<widget id="${packageName}" version="${appConfig.version || '1.0.0'}" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
    <name>${appConfig.displayName}</name>
    <description>${appConfig.description || 'Sample Apache Cordova App'}</description>
    <author email="${appConfig.authorEmail || 'dev@cordova.apache.org'}" href="https://cordova.apache.org">
        ${appConfig.authorName || 'Apache Cordova Team'}
    </author>
    <content src="index.html" />
    <allow-intent href="http://*/*" />
    <allow-intent href="https://*/*" />
</widget>`;
    }

    // Generate proper Cordova package.json (matching RetroGames structure exactly)
    generateCordovaPackageJson(appConfig, packageName) {
        return JSON.stringify({
            name: packageName.toLowerCase(),
            displayName: appConfig.displayName,
            version: appConfig.version || '1.0.0',
            description: appConfig.description || 'A sample Apache Cordova application that responds to the deviceready event.',
            main: 'index.js',
            scripts: {
                test: 'echo "Error: no test specified" && exit 1'
            },
            keywords: [
                'ecosystem:cordova'
            ],
            author: appConfig.authorName || 'Apache Cordova Team',
            license: 'Apache-2.0',
            devDependencies: {
                'cordova-android': '^14.0.1'
            },
            cordova: {
                platforms: [
                    'android'
                ]
            }
        }, null, 2);
    }

    // Organize web assets for www directory
    organizeWebAssets(originalFiles) {
        const webAssets = {};
        
        // Map original files to www directory structure
        Object.entries(originalFiles).forEach(([filePath, content]) => {
            if (filePath.startsWith('www/')) {
                // Already in www structure
                webAssets[filePath] = content;
            } else {
                // Map to www directory
                switch (filePath) {
                    case 'index.html':
                        webAssets['www/index.html'] = content;
                        break;
                    case 'css/index.css':
                        webAssets['www/css/index.css'] = content;
                        break;
                    case 'js/index.js':
                        webAssets['www/js/index.js'] = content;
                        break;
                    default:
                        // Place other files in www root
                        webAssets[`www/${filePath}`] = content;
                        break;
                }
            }
        });

        // Add default Cordova files if not present
        if (!webAssets['www/js/cordova.js']) {
            webAssets['www/js/cordova.js'] = '// Cordova.js will be injected by the platform';
        }

        // Add default logo if not present
        if (!webAssets['www/img/logo.png']) {
            webAssets['www/img/logo.png'] = this.generateDefaultLogo();
        }

        return webAssets;
    }

    // Generate PWA manifest.json
    generateManifestJson(appConfig, packageName) {
        return JSON.stringify({
            name: appConfig.displayName,
            short_name: appConfig.appName,
            description: appConfig.description,
            start_url: "./index.html",
            display: "standalone",
            background_color: "#ffffff",
            theme_color: appConfig.themeColor || "#4A90E2",
            icons: [
                {
                    src: "img/logo.png",
                    sizes: "192x192",
                    type: "image/png"
                },
                {
                    src: "img/logo.png",
                    sizes: "512x512",
                    type: "image/png"
                }
            ],
            orientation: "portrait",
            categories: [appConfig.category || "utility"],
            lang: "en"
        }, null, 2);
    }

    // Generate proper Cordova index.js (based on RetroGames structure)
    generateCordovaIndexJs(appConfig) {
        return `/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Wait for the deviceready event before using any of Cordova's device APIs.
// See https://cordova.apache.org/docs/en/latest/cordova/events/events.html#deviceready
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    // Cordova is now initialized. Have fun!
    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);

    // Initialize \${appConfig.displayName}
    initializeApp();
}

function initializeApp() {
    console.log('\${appConfig.displayName} initialized successfully!');

    // Hide splash screen
    if (navigator.splashscreen) {
        navigator.splashscreen.hide();
    }

    // Set status bar style
    if (window.StatusBar) {
        StatusBar.styleDefault();
    }

    // App-specific initialization
    setupEventListeners();
    loadAppContent();
}

function setupEventListeners() {
    // Add your event listeners here
    const getStartedBtn = document.getElementById('getStartedBtn');
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', function() {
            showToast('Welcome to \${appConfig.displayName}!');
        });
    }

    // Handle back button (Android)
    document.addEventListener('backbutton', onBackKeyDown, false);
}

function onBackKeyDown() {
    // Handle back button press
    if (confirm('Exit \${appConfig.displayName}?')) {
        navigator.app.exitApp();
    }
}

function loadAppContent() {
    // Load app-specific content
    console.log('Loading \${appConfig.displayName} content...');

    // Update app info in the UI
    updateAppInfo();
}

function updateAppInfo() {
    const appTitle = document.querySelector('.app-title');
    const appSubtitle = document.querySelector('.app-subtitle');

    if (appTitle) {
        appTitle.textContent = '\${appConfig.displayName}';
    }

    if (appSubtitle) {
        appSubtitle.textContent = '\${appConfig.description}';
    }
}

function showToast(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = \`
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        z-index: 1000;
        font-size: 14px;
        opacity: 0;
        transition: opacity 0.3s ease;
    \`;

    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 100);

    // Hide and remove toast
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Utility functions
function getDeviceInfo() {
    if (window.device) {
        return {
            platform: device.platform,
            version: device.version,
            model: device.model,
            manufacturer: device.manufacturer
        };
    }
    return null;
}

function isOnline() {
    return navigator.connection && navigator.connection.type !== Connection.NONE;
}

// Export functions for global access
window.appFunctions = {
    showToast,
    getDeviceInfo,
    isOnline,
    updateAppInfo
};`;
    }

    // Generate Codemagic CI/CD configuration
    generateCodemagicConfig(appConfig, config) {
        const customConfig = config.codemagicConfig;
        
        if (customConfig && customConfig.trim()) {
            return customConfig;
        }

        // Default Codemagic configuration matching RetroGames repository structure
        return `workflows:
  cordova_android_build:
    name: Build Cordova Android App
    max_build_duration: 60
    environment: {}  # <-- bỏ trống hoặc xóa luôn cũng được
    scripts:
      - name: Install Node.js & Cordova
        script: |
          curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
          apt-get install -y nodejs
          npm install -g cordova
      - name: Install project dependencies
        script: |
          npm install
      - name: Add Android platform & build release
        script: |
          cordova platform add android
          cordova build android --release
    artifacts:
      - platforms/android/app/build/outputs/bundle/release/app-release.aab
      - platforms/android/app/build/outputs/apk/release/app-release.apk`;
    }

    // Generate Cordova-specific .gitignore matching RetroGames repository structure
    generateCordovaGitignore() {
        return `#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#  KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

.DS_Store

# Generated by package manager
node_modules/

# Generated by Cordova
/plugins/
/platforms/`;
    }

    // Generate Cordova-specific README
    generateCordovaReadme(appConfig, packageName) {
        return `# ${appConfig.displayName}

${appConfig.description}

## 📱 App Information

- **Package Name:** \`${packageName}\`
- **Category:** ${appConfig.category || 'Mobile App'}
- **Platform:** Android (Apache Cordova)
- **Version:** ${appConfig.version || '1.0.0'}

## 🚀 Features

${(appConfig.features || []).map(feature => `- ${feature}`).join('\n')}

## 🛠️ Build Instructions

### Prerequisites

- Node.js (v16 or higher)
- Apache Cordova CLI: \`npm install -g cordova\`
- Android SDK and Android Studio

### Local Development

1. **Clone and setup:**
   \`\`\`bash
   git clone <repository-url>
   cd ${appConfig.appName}
   npm install
   \`\`\`

2. **Add Android platform:**
   \`\`\`bash
   cordova platform add android
   \`\`\`

3. **Build for development:**
   \`\`\`bash
   cordova build android
   \`\`\`

4. **Run on device/emulator:**
   \`\`\`bash
   cordova run android
   \`\`\`

5. **Build for production:**
   \`\`\`bash
   cordova build android --release
   \`\`\`

### CI/CD with Codemagic

This project includes a \`codemagic.yaml\` configuration for automated builds:

1. Connect your repository to [Codemagic](https://codemagic.io)
2. The build will automatically:
   - Install dependencies
   - Add Android platform
   - Build release APK/AAB
   - Generate artifacts

## 📦 Plugins Used

${(appConfig.plugins || []).map(plugin => `- \`${plugin}\``).join('\n')}

## 🏗️ Project Structure

\`\`\`
${appConfig.appName}/
├── www/                 # Web assets
│   ├── css/            # Stylesheets
│   ├── js/             # JavaScript files
│   ├── img/            # Images and icons
│   └── index.html      # Main HTML file
├── platforms/          # Platform-specific code (auto-generated)
├── plugins/            # Cordova plugins (auto-generated)
├── config.xml          # Cordova configuration
├── package.json        # Node.js dependencies
├── codemagic.yaml      # CI/CD configuration
└── README.md           # This file
\`\`\`

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**${appConfig.authorName}**
- Email: ${appConfig.authorEmail}

---

Built with ❤️ using Apache Cordova and the Cordova App Generator`;
    }

    // Generate build scripts for local development
    generateBuildScripts(appConfig) {
        const appName = appConfig.appName;
        
        return {
            'build.sh': `#!/bin/bash
# Build script for ${appConfig.displayName}

set -e

echo "🚀 Building ${appConfig.displayName}..."

# Check if Cordova is installed
if ! command -v cordova &> /dev/null; then
    echo "❌ Cordova CLI not found. Installing..."
    npm install -g cordova
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Add Android platform if not present
if [ ! -d "platforms/android" ]; then
    echo "🤖 Adding Android platform..."
    cordova platform add android
fi

# Build the app
echo "🔨 Building Android app..."
cordova build android

echo "✅ Build completed successfully!"
echo "📱 APK location: platforms/android/app/build/outputs/apk/debug/app-debug.apk"`,

            'build-release.sh': `#!/bin/bash
# Release build script for ${appConfig.displayName}

set -e

echo "🚀 Building ${appConfig.displayName} for release..."

# Check if Cordova is installed
if ! command -v cordova &> /dev/null; then
    echo "❌ Cordova CLI not found. Installing..."
    npm install -g cordova
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Add Android platform if not present
if [ ! -d "platforms/android" ]; then
    echo "🤖 Adding Android platform..."
    cordova platform add android
fi

# Build the release app
echo "🔨 Building Android app for release..."
cordova build android --release

echo "✅ Release build completed successfully!"
echo "📱 AAB location: platforms/android/app/build/outputs/bundle/release/app-release.aab"
echo "📱 APK location: platforms/android/app/build/outputs/apk/release/app-release.apk"`,

            'run.sh': `#!/bin/bash
# Run script for ${appConfig.displayName}

set -e

echo "🚀 Running ${appConfig.displayName} on Android device/emulator..."

# Check if Cordova is installed
if ! command -v cordova &> /dev/null; then
    echo "❌ Cordova CLI not found. Installing..."
    npm install -g cordova
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Add Android platform if not present
if [ ! -d "platforms/android" ]; then
    echo "🤖 Adding Android platform..."
    cordova platform add android
fi

# Run on device/emulator
echo "📱 Running on Android..."
cordova run android

echo "✅ App launched successfully!"`
        };
    }

    // Cancel current build preparation
    cancelBuildPreparation() {
        if (this.isBuilding) {
            this.isBuilding = false;
            this.emit('build:cancelled');
        }
    }

    // Get build preparation status
    getBuildStatus() {
        return {
            isBuilding: this.isBuilding,
            currentBuild: this.currentBuild
        };
    }

    // Generate default logo as base64-encoded PNG
    generateDefaultLogo() {
        // Create a canvas element
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 192; // Standard app icon size

        canvas.width = size;
        canvas.height = size;

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(0.5, '#764ba2');
        gradient.addColorStop(1, '#f093fb');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Add rounded corners effect
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        this.roundRect(ctx, 0, 0, size, size, size * 0.15);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // Draw main icon shape - a modern app symbol
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = size * 0.02;
        ctx.shadowOffsetY = size * 0.01;

        // Draw a stylized "A" for "App"
        ctx.font = `bold ${size * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('A', size / 2, size / 2);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Add decorative elements - small dots around the letter
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size * 0.3;

        for (let i = 0; i < 8; i++) {
            const angle = (i * 2 * Math.PI) / 8;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            ctx.beginPath();
            ctx.arc(x, y, size * 0.015, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Convert canvas to base64 PNG
        return canvas.toDataURL('image/png');
    }

    // Helper method for rounded rectangles (polyfill for older browsers)
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}

// Export for use in other modules
window.CordovaBuildPreparation = CordovaBuildPreparation;
