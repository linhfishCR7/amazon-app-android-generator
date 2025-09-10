#!/usr/bin/env node

/**
 * Amazon Appstore Deployment Script
 * Automated APK upload and app management for Amazon Appstore
 * 
 * Usage:
 *   node amazon-appstore-deploy.js --apk path/to/app.apk --config config.json
 *   node amazon-appstore-deploy.js --help
 */

const fs = require('fs');
const path = require('path');
const { program } = require('commander');

// Import Amazon Appstore integration (if running in Node.js environment)
const AmazonAppstoreIntegration = require('../js/amazon-appstore.js');

class AmazonAppstoreDeployer {
    constructor() {
        this.amazonAppstore = new AmazonAppstoreIntegration();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Authentication events
        this.amazonAppstore.addEventListener('auth:start', (event) => {
            console.log('🔐 Authenticating with Amazon Developer Console...');
        });

        this.amazonAppstore.addEventListener('auth:success', (event) => {
            console.log('✅ Successfully authenticated with Amazon Developer Console');
        });

        this.amazonAppstore.addEventListener('auth:error', (event) => {
            console.error('❌ Authentication failed:', event.detail.error.message);
        });

        // App creation events
        this.amazonAppstore.addEventListener('app:create:start', (event) => {
            console.log(`📱 Creating app: ${event.detail.appName}...`);
        });

        this.amazonAppstore.addEventListener('app:create:success', (event) => {
            console.log(`✅ App created successfully: ${event.detail.appId}`);
        });

        this.amazonAppstore.addEventListener('app:create:error', (event) => {
            console.error(`❌ App creation failed: ${event.detail.error.message}`);
        });

        // APK upload events
        this.amazonAppstore.addEventListener('apk:upload:start', (event) => {
            console.log(`📦 Uploading APK: ${event.detail.fileName}...`);
        });

        this.amazonAppstore.addEventListener('apk:upload:success', (event) => {
            console.log(`✅ APK uploaded successfully: ${event.detail.fileName}`);
            console.log(`   Edit ID: ${event.detail.editId}`);
            console.log(`   Status: ${event.detail.status}`);
        });

        this.amazonAppstore.addEventListener('apk:upload:error', (event) => {
            console.error(`❌ APK upload failed: ${event.detail.error.message}`);
        });

        // Submission events
        this.amazonAppstore.addEventListener('submit:start', (event) => {
            console.log(`🚀 Submitting app for review: ${event.detail.appId}...`);
        });

        this.amazonAppstore.addEventListener('submit:success', (event) => {
            console.log(`✅ App submitted for review: ${event.detail.submissionId}`);
        });

        this.amazonAppstore.addEventListener('submit:error', (event) => {
            console.error(`❌ Submission failed: ${event.detail.error.message}`);
        });
    }

    async deployApp(options) {
        try {
            console.log('🚀 Starting Amazon Appstore deployment...\n');

            // Load configuration
            const config = this.loadConfig(options.config);
            
            // Validate APK file
            if (!fs.existsSync(options.apk)) {
                throw new Error(`APK file not found: ${options.apk}`);
            }

            const apkBuffer = fs.readFileSync(options.apk);
            const apkFileName = path.basename(options.apk);

            console.log(`📦 APK File: ${apkFileName} (${(apkBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

            // Authenticate with Amazon Developer Console
            await this.amazonAppstore.authenticate(
                config.amazon.clientId,
                config.amazon.clientSecret,
                config.amazon.developerId
            );

            let appId = config.app.appId;

            // Create app if it doesn't exist
            if (!appId) {
                console.log('\n📱 Creating new app in Amazon Appstore...');
                const appResult = await this.amazonAppstore.createApp({
                    appName: config.app.name,
                    displayName: config.app.displayName,
                    packageName: config.app.packageName,
                    description: config.app.description,
                    shortDescription: config.app.shortDescription,
                    category: config.app.category,
                    keywords: config.app.keywords,
                    authorName: config.app.authorName,
                    authorEmail: config.app.authorEmail,
                    privacyPolicyUrl: config.app.privacyPolicyUrl,
                    contentRating: config.app.contentRating
                });

                appId = appResult.appId;
                console.log(`✅ App created with ID: ${appId}`);

                // Update config file with app ID
                config.app.appId = appId;
                this.saveConfig(options.config, config);
            }

            // Upload APK
            console.log('\n📦 Uploading APK to Amazon Appstore...');
            const uploadResult = await this.amazonAppstore.uploadApk(appId, apkBuffer, apkFileName);

            // Submit for review if requested
            if (options.submit) {
                console.log('\n🚀 Submitting app for review...');
                const submitResult = await this.amazonAppstore.submitForReview(
                    appId, 
                    config.app.releaseNotes || 'Automated deployment via Cordova App Generator'
                );
                console.log(`✅ Submission ID: ${submitResult.submissionId}`);
            }

            // Get final app status
            console.log('\n📊 Getting app status...');
            const status = await this.amazonAppstore.getAppStatus(appId);
            
            console.log('\n🎉 Deployment completed successfully!');
            console.log('📊 Final Status:');
            console.log(`   App ID: ${status.appId}`);
            console.log(`   Status: ${status.status}`);
            console.log(`   Package: ${status.packageName}`);
            console.log(`   Version: ${status.version}`);
            console.log(`   Last Updated: ${status.lastUpdated}`);

            return {
                success: true,
                appId: status.appId,
                status: status.status,
                uploadResult,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('\n❌ Deployment failed:', error.message);
            
            if (error.stack && options.verbose) {
                console.error('\nStack trace:');
                console.error(error.stack);
            }

            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    loadConfig(configPath) {
        if (!fs.existsSync(configPath)) {
            throw new Error(`Configuration file not found: ${configPath}`);
        }

        try {
            const configContent = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configContent);

            // Validate required configuration
            this.validateConfig(config);
            
            return config;
        } catch (error) {
            throw new Error(`Failed to load configuration: ${error.message}`);
        }
    }

    validateConfig(config) {
        const required = [
            'amazon.clientId',
            'amazon.clientSecret', 
            'amazon.developerId',
            'app.name',
            'app.packageName'
        ];

        for (const field of required) {
            const keys = field.split('.');
            let value = config;
            
            for (const key of keys) {
                value = value?.[key];
            }
            
            if (!value) {
                throw new Error(`Missing required configuration: ${field}`);
            }
        }
    }

    saveConfig(configPath, config) {
        try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        } catch (error) {
            console.warn(`⚠️ Failed to save updated configuration: ${error.message}`);
        }
    }

    generateSampleConfig() {
        return {
            amazon: {
                clientId: "your-amazon-client-id",
                clientSecret: "your-amazon-client-secret",
                developerId: "your-amazon-developer-id"
            },
            app: {
                name: "MyApp",
                displayName: "My Awesome App",
                packageName: "com.example.myapp",
                description: "A great mobile application built with Cordova",
                shortDescription: "Great mobile app",
                category: "ENTERTAINMENT",
                keywords: ["mobile", "app", "cordova"],
                authorName: "Your Name",
                authorEmail: "your.email@example.com",
                privacyPolicyUrl: "https://example.com/privacy",
                contentRating: "Everyone",
                releaseNotes: "Initial release"
            }
        };
    }
}

// CLI Configuration
program
    .name('amazon-appstore-deploy')
    .description('Deploy Cordova apps to Amazon Appstore')
    .version('1.0.0');

program
    .command('deploy')
    .description('Deploy APK to Amazon Appstore')
    .requiredOption('-a, --apk <path>', 'Path to APK file')
    .requiredOption('-c, --config <path>', 'Path to configuration file')
    .option('-s, --submit', 'Submit app for review after upload')
    .option('-v, --verbose', 'Verbose output')
    .action(async (options) => {
        const deployer = new AmazonAppstoreDeployer();
        const result = await deployer.deployApp(options);
        process.exit(result.success ? 0 : 1);
    });

program
    .command('init')
    .description('Generate sample configuration file')
    .option('-o, --output <path>', 'Output path for config file', 'amazon-appstore-config.json')
    .action((options) => {
        const deployer = new AmazonAppstoreDeployer();
        const sampleConfig = deployer.generateSampleConfig();
        
        fs.writeFileSync(options.output, JSON.stringify(sampleConfig, null, 2));
        console.log(`✅ Sample configuration created: ${options.output}`);
        console.log('📝 Please edit the configuration file with your Amazon Developer credentials');
    });

program
    .command('status')
    .description('Check app status in Amazon Appstore')
    .requiredOption('-c, --config <path>', 'Path to configuration file')
    .action(async (options) => {
        try {
            const deployer = new AmazonAppstoreDeployer();
            const config = deployer.loadConfig(options.config);
            
            await deployer.amazonAppstore.authenticate(
                config.amazon.clientId,
                config.amazon.clientSecret,
                config.amazon.developerId
            );

            if (!config.app.appId) {
                console.log('❌ No app ID found in configuration');
                process.exit(1);
            }

            const status = await deployer.amazonAppstore.getAppStatus(config.app.appId);
            
            console.log('📊 App Status:');
            console.log(`   App ID: ${status.appId}`);
            console.log(`   Title: ${status.title}`);
            console.log(`   Status: ${status.status}`);
            console.log(`   Package: ${status.packageName}`);
            console.log(`   Version: ${status.version}`);
            console.log(`   Last Updated: ${status.lastUpdated}`);
            
        } catch (error) {
            console.error('❌ Failed to get app status:', error.message);
            process.exit(1);
        }
    });

// Parse command line arguments
if (require.main === module) {
    program.parse();
}

module.exports = AmazonAppstoreDeployer;
