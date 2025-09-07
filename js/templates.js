/**
 * App Templates System
 * Manages different app templates and their configurations
 */

class AppTemplatesManager {
    constructor() {
        this.templates = new Map();
        this.categories = new Set();
        this.availablePlugins = new Map();
        this.init();
    }

    init() {
        this.loadAvailablePlugins();
        this.loadDefaultTemplates();
    }

    // Load available Cordova plugins
    loadAvailablePlugins() {
        const plugins = [
            {
                id: 'cordova-plugin-geolocation',
                name: 'Geolocation',
                description: 'Access device location services',
                category: 'device'
            },
            {
                id: 'cordova-plugin-camera',
                name: 'Camera',
                description: 'Take photos and access photo library',
                category: 'media'
            },
            {
                id: 'cordova-plugin-file',
                name: 'File System',
                description: 'Read and write files on device',
                category: 'storage'
            },
            {
                id: 'cordova-plugin-local-notification',
                name: 'Local Notifications',
                description: 'Schedule local notifications',
                category: 'notifications'
            },
            {
                id: 'cordova-plugin-network-information',
                name: 'Network Information',
                description: 'Monitor network connectivity',
                category: 'device'
            },
            {
                id: 'cordova-plugin-device',
                name: 'Device Information',
                description: 'Access device information',
                category: 'device'
            },
            {
                id: 'cordova-plugin-vibration',
                name: 'Vibration',
                description: 'Control device vibration',
                category: 'device'
            },
            {
                id: 'cordova-plugin-media',
                name: 'Media Playback',
                description: 'Play audio and video files',
                category: 'media'
            },
            {
                id: 'cordova-plugin-calendar',
                name: 'Calendar Access',
                description: 'Access device calendar',
                category: 'productivity'
            },
            {
                id: 'cordova-plugin-contacts',
                name: 'Contacts',
                description: 'Access device contacts',
                category: 'productivity'
            },
            {
                id: 'cordova-plugin-flashlight',
                name: 'Flashlight',
                description: 'Control device flashlight',
                category: 'utilities'
            },
            {
                id: 'phonegap-plugin-barcodescanner',
                name: 'Barcode Scanner',
                description: 'Scan QR codes and barcodes',
                category: 'utilities'
            },
            {
                id: 'cordova-plugin-secure-storage',
                name: 'Secure Storage',
                description: 'Encrypted data storage',
                category: 'security'
            },
            {
                id: 'cordova-plugin-fingerprint-aio',
                name: 'Fingerprint Authentication',
                description: 'Biometric authentication',
                category: 'security'
            },
            {
                id: 'cordova-plugin-health',
                name: 'Health Data',
                description: 'Access health and fitness data',
                category: 'health'
            },
            {
                id: 'cordova-plugin-pedometer',
                name: 'Pedometer',
                description: 'Step counting functionality',
                category: 'health'
            },
            {
                id: 'cordova-plugin-social-sharing',
                name: 'Social Sharing',
                description: 'Share content to social platforms',
                category: 'social'
            },
            {
                id: 'cordova-plugin-tts',
                name: 'Text-to-Speech',
                description: 'Convert text to speech',
                category: 'accessibility'
            },
            {
                id: 'cordova-plugin-speech-recognition',
                name: 'Speech Recognition',
                description: 'Convert speech to text',
                category: 'accessibility'
            },
            {
                id: 'cordova-plugin-background-mode',
                name: 'Background Mode',
                description: 'Keep app running in background',
                category: 'system'
            },
            {
                id: 'cordova-plugin-music-controls',
                name: 'Music Controls',
                description: 'Media playback controls',
                category: 'media'
            },
            {
                id: 'cordova-plugin-statusbar',
                name: 'Status Bar',
                description: 'Control status bar appearance',
                category: 'ui'
            },
            {
                id: 'cordova-plugin-splashscreen',
                name: 'Splash Screen',
                description: 'Control splash screen behavior',
                category: 'ui'
            },
            {
                id: 'cordova-plugin-whitelist',
                name: 'Whitelist',
                description: 'Security whitelist for network requests',
                category: 'security'
            }
        ];

        plugins.forEach(plugin => {
            this.availablePlugins.set(plugin.id, plugin);
        });
    }

    // Load default app templates
    loadDefaultTemplates() {
        const defaultTemplates = [
            // PRODUCTIVITY CATEGORY (10 templates)
            {
                id: 'task-master-pro',
                name: 'TaskMasterPro',
                displayName: 'Task Master Pro',
                description: 'Advanced productivity and task management application with project tracking and team collaboration',
                category: 'productivity',
                icon: '✅',
                color: '#50C878',
                features: ['Task organization', 'Project management', 'Time tracking', 'Team collaboration'],
                plugins: ['cordova-plugin-local-notification', 'cordova-plugin-calendar', 'cordova-plugin-file'],
                estimatedTime: 4
            },
            {
                id: 'study-timer',
                name: 'StudyTimer',
                displayName: 'Study Timer',
                description: 'Pomodoro timer and study session management with focus tracking and break reminders',
                category: 'productivity',
                icon: '⏰',
                color: '#3742FA',
                features: ['Pomodoro technique', 'Study sessions', 'Break reminders', 'Progress tracking'],
                plugins: ['cordova-plugin-local-notification', 'cordova-plugin-vibration', 'cordova-plugin-background-mode'],
                estimatedTime: 3
            },
            {
                id: 'note-keeper-pro',
                name: 'NoteKeeperPro',
                displayName: 'Note Keeper Pro',
                description: 'Advanced note-taking app with rich text editing, voice memos, and cloud synchronization',
                category: 'productivity',
                icon: '�',
                color: '#2ECC71',
                features: ['Rich text editing', 'Voice memos', 'Cloud sync', 'Search functionality'],
                plugins: ['cordova-plugin-media', 'cordova-plugin-file', 'cordova-plugin-speech-recognition'],
                estimatedTime: 4
            },
            {
                id: 'habit-tracker',
                name: 'HabitTracker',
                displayName: 'Habit Tracker',
                description: 'Daily habit tracking with streak counters, reminders, and progress visualization',
                category: 'productivity',
                icon: '🎯',
                color: '#E74C3C',
                features: ['Habit tracking', 'Streak counters', 'Progress charts', 'Daily reminders'],
                plugins: ['cordova-plugin-local-notification', 'cordova-plugin-calendar'],
                estimatedTime: 3
            },
            {
                id: 'time-tracker-pro',
                name: 'TimeTrackerPro',
                displayName: 'Time Tracker Pro',
                description: 'Professional time tracking with project categorization, reporting, and billing features',
                category: 'productivity',
                icon: '⏱️',
                color: '#9B59B6',
                features: ['Time tracking', 'Project categorization', 'Detailed reports', 'Billing integration'],
                plugins: ['cordova-plugin-background-mode', 'cordova-plugin-local-notification', 'cordova-plugin-file'],
                estimatedTime: 5
            },
            {
                id: 'document-scanner',
                name: 'DocumentScanner',
                displayName: 'Document Scanner',
                description: 'Professional document scanning with OCR, PDF generation, and cloud storage integration',
                category: 'productivity',
                icon: '📄',
                color: '#34495E',
                features: ['Document scanning', 'OCR text recognition', 'PDF generation', 'Cloud storage'],
                plugins: ['cordova-plugin-camera', 'cordova-plugin-file', 'cordova-plugin-document-viewer'],
                estimatedTime: 4
            },
            {
                id: 'meeting-assistant',
                name: 'MeetingAssistant',
                displayName: 'Meeting Assistant',
                description: 'Meeting scheduler and assistant with agenda management, recording, and follow-up reminders',
                category: 'productivity',
                icon: '🤝',
                color: '#3498DB',
                features: ['Meeting scheduling', 'Agenda management', 'Voice recording', 'Follow-up reminders'],
                plugins: ['cordova-plugin-calendar', 'cordova-plugin-media', 'cordova-plugin-contacts'],
                estimatedTime: 5
            },
            {
                id: 'password-manager',
                name: 'PasswordManager',
                displayName: 'Password Manager',
                description: 'Secure password manager with biometric authentication, auto-fill, and breach monitoring',
                category: 'productivity',
                icon: '🔐',
                color: '#2F3542',
                features: ['Password storage', 'Biometric unlock', 'Auto-fill', 'Breach monitoring'],
                plugins: ['cordova-plugin-secure-storage', 'cordova-plugin-fingerprint-aio', 'cordova-plugin-keychain'],
                estimatedTime: 6
            },
            {
                id: 'email-organizer',
                name: 'EmailOrganizer',
                displayName: 'Email Organizer',
                description: 'Smart email management with automatic categorization, templates, and scheduling',
                category: 'productivity',
                icon: '📧',
                color: '#E67E22',
                features: ['Email categorization', 'Templates', 'Scheduled sending', 'Smart filters'],
                plugins: ['cordova-plugin-email-composer', 'cordova-plugin-local-notification'],
                estimatedTime: 4
            },
            {
                id: 'project-planner',
                name: 'ProjectPlanner',
                displayName: 'Project Planner',
                description: 'Comprehensive project planning with Gantt charts, resource management, and team collaboration',
                category: 'productivity',
                icon: '📊',
                color: '#16A085',
                features: ['Gantt charts', 'Resource management', 'Team collaboration', 'Progress tracking'],
                plugins: ['cordova-plugin-file', 'cordova-plugin-social-sharing', 'cordova-plugin-calendar'],
                estimatedTime: 6
            },

            // ENTERTAINMENT CATEGORY (5 templates)
            {
                id: 'music-player-pro',
                name: 'MusicPlayerPro',
                displayName: 'Music Player Pro',
                description: 'Advanced music player with playlist management, audio effects, and library organization',
                category: 'entertainment',
                icon: '🎵',
                color: '#8E44AD',
                features: ['Music playback', 'Playlist creation', 'Audio effects', 'Library management'],
                plugins: ['cordova-plugin-media', 'cordova-plugin-file', 'cordova-plugin-music-controls'],
                estimatedTime: 5
            },
            {
                id: 'podcast-player',
                name: 'PodcastPlayer',
                displayName: 'Podcast Player',
                description: 'Feature-rich podcast player with subscriptions, offline downloads, and playback speed control',
                category: 'entertainment',
                icon: '🎙️',
                color: '#E74C3C',
                features: ['Podcast subscriptions', 'Offline downloads', 'Playback speed', 'Episode bookmarks'],
                plugins: ['cordova-plugin-media', 'cordova-plugin-file-transfer', 'cordova-plugin-background-mode'],
                estimatedTime: 5
            },
            {
                id: 'movie-tracker',
                name: 'MovieTracker',
                displayName: 'Movie Tracker',
                description: 'Movie and TV show tracking with watchlists, ratings, and recommendation engine',
                category: 'entertainment',
                icon: '🎬',
                color: '#F39C12',
                features: ['Movie database', 'Watchlists', 'Personal ratings', 'Recommendations'],
                plugins: ['cordova-plugin-network-information', 'cordova-plugin-file', 'cordova-plugin-social-sharing'],
                estimatedTime: 4
            },
            {
                id: 'trivia-master',
                name: 'TriviaMaster',
                displayName: 'Trivia Master',
                description: 'Interactive trivia game with multiple categories, multiplayer mode, and leaderboards',
                category: 'entertainment',
                icon: '🧠',
                color: '#9B59B6',
                features: ['Multiple categories', 'Multiplayer mode', 'Leaderboards', 'Custom questions'],
                plugins: ['cordova-plugin-vibration', 'cordova-plugin-social-sharing'],
                estimatedTime: 4
            },
            {
                id: 'photo-editor-pro',
                name: 'PhotoEditorPro',
                displayName: 'Photo Editor Pro',
                description: 'Professional photo editing with filters, effects, collages, and social sharing',
                category: 'entertainment',
                icon: '📸',
                color: '#E91E63',
                features: ['Photo filters', 'Advanced editing', 'Collage maker', 'Social sharing'],
                plugins: ['cordova-plugin-camera', 'cordova-plugin-file', 'cordova-plugin-social-sharing'],
                estimatedTime: 5
            },

            // UTILITIES CATEGORY (5 templates)
            {
                id: 'qr-scanner-plus',
                name: 'QRScannerPlus',
                displayName: 'QR Scanner Plus',
                description: 'QR code and barcode scanner with advanced features, history tracking, and batch scanning',
                category: 'utilities',
                icon: '�',
                color: '#FF6B6B',
                features: ['QR code scanning', 'Barcode recognition', 'History tracking', 'Batch scanning'],
                plugins: ['phonegap-plugin-barcodescanner', 'cordova-plugin-camera', 'cordova-plugin-flashlight'],
                estimatedTime: 3
            },
            {
                id: 'weather-station',
                name: 'WeatherStation',
                displayName: 'Weather Station',
                description: 'Comprehensive weather app with forecasts, radar maps, and severe weather alerts',
                category: 'utilities',
                icon: '🌤️',
                color: '#4A90E2',
                features: ['Weather forecasts', 'Radar maps', 'Severe alerts', 'Multiple locations'],
                plugins: ['cordova-plugin-geolocation', 'cordova-plugin-network-information', 'cordova-plugin-local-notification'],
                estimatedTime: 4
            },
            {
                id: 'unit-converter-pro',
                name: 'UnitConverterPro',
                displayName: 'Unit Converter Pro',
                description: 'Comprehensive unit converter with currency exchange, scientific calculations, and history',
                category: 'utilities',
                icon: '🔢',
                color: '#27AE60',
                features: ['Unit conversions', 'Currency exchange', 'Scientific calculator', 'Conversion history'],
                plugins: ['cordova-plugin-network-information'],
                estimatedTime: 3
            },
            {
                id: 'wifi-analyzer',
                name: 'WiFiAnalyzer',
                displayName: 'WiFi Analyzer',
                description: 'Network analysis tool with WiFi scanning, signal strength monitoring, and security assessment',
                category: 'utilities',
                icon: '📶',
                color: '#3498DB',
                features: ['WiFi scanning', 'Signal analysis', 'Security assessment', 'Network diagnostics'],
                plugins: ['cordova-plugin-network-information', 'cordova-plugin-geolocation'],
                estimatedTime: 4
            },
            {
                id: 'file-manager-pro',
                name: 'FileManagerPro',
                displayName: 'File Manager Pro',
                description: 'Advanced file management with cloud integration, compression, and secure file sharing',
                category: 'utilities',
                icon: '📁',
                color: '#95A5A6',
                features: ['File management', 'Cloud integration', 'File compression', 'Secure sharing'],
                plugins: ['cordova-plugin-file', 'cordova-plugin-file-transfer', 'cordova-plugin-zip'],
                estimatedTime: 5
            },

            // EDUCATION CATEGORY (5 templates)
            {
                id: 'language-buddy',
                name: 'LanguageBuddy',
                displayName: 'Language Buddy',
                description: 'Interactive language learning with flashcards, quizzes, and speech recognition',
                category: 'education',
                icon: '🗣️',
                color: '#00D2D3',
                features: ['Language lessons', 'Flashcard system', 'Speech recognition', 'Progress tracking'],
                plugins: ['cordova-plugin-media', 'cordova-plugin-tts', 'cordova-plugin-speech-recognition'],
                estimatedTime: 4
            },
            {
                id: 'math-tutor',
                name: 'MathTutor',
                displayName: 'Math Tutor',
                description: 'Interactive math learning app with step-by-step solutions, practice problems, and progress tracking',
                category: 'education',
                icon: '🧮',
                color: '#FF6B35',
                features: ['Step-by-step solutions', 'Practice problems', 'Multiple difficulty levels', 'Progress analytics'],
                plugins: ['cordova-plugin-vibration', 'cordova-plugin-local-notification'],
                estimatedTime: 4
            },
            {
                id: 'quiz-master',
                name: 'QuizMaster',
                displayName: 'Quiz Master',
                description: 'Educational quiz platform with custom quizzes, timed tests, and performance analytics',
                category: 'education',
                icon: '📚',
                color: '#4ECDC4',
                features: ['Custom quizzes', 'Timed tests', 'Performance analytics', 'Subject categories'],
                plugins: ['cordova-plugin-vibration', 'cordova-plugin-local-notification'],
                estimatedTime: 3
            },
            {
                id: 'science-lab',
                name: 'ScienceLab',
                displayName: 'Science Lab',
                description: 'Virtual science laboratory with experiments, simulations, and educational content',
                category: 'education',
                icon: '🔬',
                color: '#45B7D1',
                features: ['Virtual experiments', 'Interactive simulations', 'Educational content', 'Lab reports'],
                plugins: ['cordova-plugin-device-motion', 'cordova-plugin-camera'],
                estimatedTime: 5
            },
            {
                id: 'coding-academy',
                name: 'CodingAcademy',
                displayName: 'Coding Academy',
                description: 'Learn programming with interactive lessons, code challenges, and project-based learning',
                category: 'education',
                icon: '💻',
                color: '#2ECC71',
                features: ['Interactive lessons', 'Code challenges', 'Project tutorials', 'Progress tracking'],
                plugins: ['cordova-plugin-file', 'cordova-plugin-social-sharing'],
                estimatedTime: 5
            },

            // HEALTH CATEGORY (5 templates)
            {
                id: 'fitness-companion',
                name: 'FitnessCompanion',
                displayName: 'Fitness Companion',
                description: 'Health and fitness tracking with workout plans, progress analytics, and goal setting',
                category: 'health',
                icon: '💪',
                color: '#FF4757',
                features: ['Workout tracking', 'Health monitoring', 'Progress analytics', 'Goal setting'],
                plugins: ['cordova-plugin-health', 'cordova-plugin-pedometer', 'cordova-plugin-geolocation'],
                estimatedTime: 5
            },
            {
                id: 'meditation-guide',
                name: 'MeditationGuide',
                displayName: 'Meditation Guide',
                description: 'Mindfulness and meditation app with guided sessions, breathing exercises, and mood tracking',
                category: 'health',
                icon: '🧘',
                color: '#6C5CE7',
                features: ['Guided meditations', 'Breathing exercises', 'Mood tracking', 'Sleep sounds'],
                plugins: ['cordova-plugin-media', 'cordova-plugin-vibration', 'cordova-plugin-local-notification'],
                estimatedTime: 4
            },
            {
                id: 'calorie-counter',
                name: 'CalorieCounter',
                displayName: 'Calorie Counter',
                description: 'Nutrition tracking with food database, barcode scanning, and meal planning',
                category: 'health',
                icon: '🍎',
                color: '#00B894',
                features: ['Food database', 'Barcode scanning', 'Meal planning', 'Nutrition analysis'],
                plugins: ['phonegap-plugin-barcodescanner', 'cordova-plugin-camera', 'cordova-plugin-file'],
                estimatedTime: 5
            },
            {
                id: 'sleep-tracker',
                name: 'SleepTracker',
                displayName: 'Sleep Tracker',
                description: 'Sleep monitoring with smart alarms, sleep cycle analysis, and bedtime reminders',
                category: 'health',
                icon: '😴',
                color: '#5F27CD',
                features: ['Sleep monitoring', 'Smart alarms', 'Sleep cycle analysis', 'Bedtime reminders'],
                plugins: ['cordova-plugin-device-motion', 'cordova-plugin-local-notification', 'cordova-plugin-background-mode'],
                estimatedTime: 4
            },
            {
                id: 'water-reminder',
                name: 'WaterReminder',
                displayName: 'Water Reminder',
                description: 'Hydration tracking with customizable reminders, intake goals, and progress visualization',
                category: 'health',
                icon: '💧',
                color: '#00CEC9',
                features: ['Hydration tracking', 'Custom reminders', 'Intake goals', 'Progress charts'],
                plugins: ['cordova-plugin-local-notification', 'cordova-plugin-vibration'],
                estimatedTime: 3
            },

            // FINANCE CATEGORY (5 templates)
            {
                id: 'expense-tracker',
                name: 'ExpenseTracker',
                displayName: 'Expense Tracker',
                description: 'Personal finance and expense tracking application with receipt scanning and budget management',
                category: 'finance',
                icon: '💰',
                color: '#FFD93D',
                features: ['Expense tracking', 'Budget management', 'Receipt scanning', 'Financial reports'],
                plugins: ['cordova-plugin-camera', 'cordova-plugin-file', 'cordova-plugin-local-notification'],
                estimatedTime: 4
            },
            {
                id: 'investment-tracker',
                name: 'InvestmentTracker',
                displayName: 'Investment Tracker',
                description: 'Portfolio management with real-time stock prices, performance analytics, and market news',
                category: 'finance',
                icon: '📈',
                color: '#2ECC71',
                features: ['Portfolio tracking', 'Real-time prices', 'Performance analytics', 'Market news'],
                plugins: ['cordova-plugin-network-information', 'cordova-plugin-local-notification'],
                estimatedTime: 5
            },
            {
                id: 'budget-planner',
                name: 'BudgetPlanner',
                displayName: 'Budget Planner',
                description: 'Comprehensive budget planning with spending categories, savings goals, and financial insights',
                category: 'finance',
                icon: '📊',
                color: '#3498DB',
                features: ['Budget planning', 'Spending categories', 'Savings goals', 'Financial insights'],
                plugins: ['cordova-plugin-local-notification', 'cordova-plugin-file'],
                estimatedTime: 4
            },
            {
                id: 'crypto-wallet',
                name: 'CryptoWallet',
                displayName: 'Crypto Wallet',
                description: 'Cryptocurrency portfolio tracker with price alerts, market analysis, and secure storage',
                category: 'finance',
                icon: '₿',
                color: '#F7931A',
                features: ['Portfolio tracking', 'Price alerts', 'Market analysis', 'Secure storage'],
                plugins: ['cordova-plugin-secure-storage', 'cordova-plugin-network-information', 'cordova-plugin-local-notification'],
                estimatedTime: 6
            },
            {
                id: 'bill-reminder',
                name: 'BillReminder',
                displayName: 'Bill Reminder',
                description: 'Bill tracking and payment reminders with recurring schedules and payment history',
                category: 'finance',
                icon: '🧾',
                color: '#E74C3C',
                features: ['Bill tracking', 'Payment reminders', 'Recurring schedules', 'Payment history'],
                plugins: ['cordova-plugin-local-notification', 'cordova-plugin-calendar'],
                estimatedTime: 3
            },

            // SOCIAL CATEGORY (5 templates)
            {
                id: 'social-messenger',
                name: 'SocialMessenger',
                displayName: 'Social Messenger',
                description: 'Secure messaging app with group chats, media sharing, and end-to-end encryption',
                category: 'social',
                icon: '💬',
                color: '#0084FF',
                features: ['Secure messaging', 'Group chats', 'Media sharing', 'End-to-end encryption'],
                plugins: ['cordova-plugin-camera', 'cordova-plugin-file', 'cordova-plugin-contacts', 'cordova-plugin-media'],
                estimatedTime: 6
            },
            {
                id: 'event-planner',
                name: 'EventPlanner',
                displayName: 'Event Planner',
                description: 'Event organization with invitations, RSVP tracking, and location sharing',
                category: 'social',
                icon: '🎉',
                color: '#FF6B6B',
                features: ['Event creation', 'Invitation management', 'RSVP tracking', 'Location sharing'],
                plugins: ['cordova-plugin-calendar', 'cordova-plugin-contacts', 'cordova-plugin-geolocation', 'cordova-plugin-social-sharing'],
                estimatedTime: 5
            },
            {
                id: 'community-forum',
                name: 'CommunityForum',
                displayName: 'Community Forum',
                description: 'Discussion platform with topics, voting, user profiles, and moderation tools',
                category: 'social',
                icon: '👥',
                color: '#9B59B6',
                features: ['Discussion topics', 'Voting system', 'User profiles', 'Moderation tools'],
                plugins: ['cordova-plugin-camera', 'cordova-plugin-file', 'cordova-plugin-social-sharing'],
                estimatedTime: 5
            },
            {
                id: 'photo-sharing',
                name: 'PhotoSharing',
                displayName: 'Photo Sharing',
                description: 'Social photo sharing with filters, stories, and community features',
                category: 'social',
                icon: '📷',
                color: '#E91E63',
                features: ['Photo sharing', 'Image filters', 'Stories feature', 'Community interaction'],
                plugins: ['cordova-plugin-camera', 'cordova-plugin-file', 'cordova-plugin-social-sharing', 'cordova-plugin-geolocation'],
                estimatedTime: 6
            },
            {
                id: 'dating-app',
                name: 'DatingApp',
                displayName: 'Dating App',
                description: 'Modern dating platform with profile matching, chat features, and location-based discovery',
                category: 'social',
                icon: '💕',
                color: '#FF69B4',
                features: ['Profile matching', 'Chat system', 'Location discovery', 'Safety features'],
                plugins: ['cordova-plugin-geolocation', 'cordova-plugin-camera', 'cordova-plugin-file', 'cordova-plugin-contacts'],
                estimatedTime: 7
            },

            // BUSINESS CATEGORY (5 templates)
            {
                id: 'crm-mobile',
                name: 'CRMMobile',
                displayName: 'CRM Mobile',
                description: 'Customer relationship management with contact tracking, sales pipeline, and reporting',
                category: 'business',
                icon: '🤝',
                color: '#2C3E50',
                features: ['Contact management', 'Sales pipeline', 'Lead tracking', 'Business reports'],
                plugins: ['cordova-plugin-contacts', 'cordova-plugin-calendar', 'cordova-plugin-file', 'cordova-plugin-email-composer'],
                estimatedTime: 6
            },
            {
                id: 'inventory-manager',
                name: 'InventoryManager',
                displayName: 'Inventory Manager',
                description: 'Business inventory tracking with barcode scanning, stock alerts, and supplier management',
                category: 'business',
                icon: '📦',
                color: '#34495E',
                features: ['Inventory tracking', 'Barcode scanning', 'Stock alerts', 'Supplier management'],
                plugins: ['phonegap-plugin-barcodescanner', 'cordova-plugin-camera', 'cordova-plugin-file', 'cordova-plugin-local-notification'],
                estimatedTime: 5
            },
            {
                id: 'pos-system',
                name: 'POSSystem',
                displayName: 'POS System',
                description: 'Point of sale system with payment processing, receipt generation, and sales analytics',
                category: 'business',
                icon: '💳',
                color: '#27AE60',
                features: ['Payment processing', 'Receipt generation', 'Sales analytics', 'Inventory integration'],
                plugins: ['cordova-plugin-printer', 'cordova-plugin-file', 'phonegap-plugin-barcodescanner'],
                estimatedTime: 7
            },
            {
                id: 'employee-tracker',
                name: 'EmployeeTracker',
                displayName: 'Employee Tracker',
                description: 'Employee management with time tracking, attendance monitoring, and performance analytics',
                category: 'business',
                icon: '👔',
                color: '#3498DB',
                features: ['Time tracking', 'Attendance monitoring', 'Performance analytics', 'Schedule management'],
                plugins: ['cordova-plugin-geolocation', 'cordova-plugin-camera', 'cordova-plugin-local-notification'],
                estimatedTime: 6
            },
            {
                id: 'business-card-scanner',
                name: 'BusinessCardScanner',
                displayName: 'Business Card Scanner',
                description: 'Business card scanning with OCR, contact management, and CRM integration',
                category: 'business',
                icon: '📇',
                color: '#E67E22',
                features: ['Card scanning', 'OCR recognition', 'Contact management', 'CRM integration'],
                plugins: ['cordova-plugin-camera', 'cordova-plugin-contacts', 'cordova-plugin-file'],
                estimatedTime: 4
            },

            // GAMES CATEGORY (5 templates)
            {
                id: 'puzzle-master',
                name: 'PuzzleMaster',
                displayName: 'Puzzle Master',
                description: 'Collection of brain puzzles with multiple difficulty levels and progress tracking',
                category: 'games',
                icon: '🧩',
                color: '#9B59B6',
                features: ['Multiple puzzle types', 'Difficulty levels', 'Progress tracking', 'Achievements'],
                plugins: ['cordova-plugin-vibration', 'cordova-plugin-local-notification'],
                estimatedTime: 4
            },
            {
                id: 'word-game-pro',
                name: 'WordGamePro',
                displayName: 'Word Game Pro',
                description: 'Word puzzle game with daily challenges, multiplayer mode, and vocabulary building',
                category: 'games',
                icon: '🔤',
                color: '#E74C3C',
                features: ['Word puzzles', 'Daily challenges', 'Multiplayer mode', 'Vocabulary building'],
                plugins: ['cordova-plugin-vibration', 'cordova-plugin-social-sharing'],
                estimatedTime: 5
            },
            {
                id: 'memory-trainer',
                name: 'MemoryTrainer',
                displayName: 'Memory Trainer',
                description: 'Memory training games with cognitive exercises and brain fitness tracking',
                category: 'games',
                icon: '🧠',
                color: '#3498DB',
                features: ['Memory games', 'Cognitive exercises', 'Brain fitness tracking', 'Performance analytics'],
                plugins: ['cordova-plugin-vibration', 'cordova-plugin-local-notification'],
                estimatedTime: 4
            },
            {
                id: 'arcade-collection',
                name: 'ArcadeCollection',
                displayName: 'Arcade Collection',
                description: 'Classic arcade games collection with high scores, achievements, and retro graphics',
                category: 'games',
                icon: '🕹️',
                color: '#F39C12',
                features: ['Classic games', 'High scores', 'Achievements', 'Retro graphics'],
                plugins: ['cordova-plugin-vibration', 'cordova-plugin-device-motion'],
                estimatedTime: 6
            },
            {
                id: 'card-game-suite',
                name: 'CardGameSuite',
                displayName: 'Card Game Suite',
                description: 'Collection of card games with AI opponents, statistics, and online multiplayer',
                category: 'games',
                icon: '🃏',
                color: '#8E44AD',
                features: ['Multiple card games', 'AI opponents', 'Game statistics', 'Online multiplayer'],
                plugins: ['cordova-plugin-vibration', 'cordova-plugin-social-sharing'],
                estimatedTime: 7
            },

            // LIFESTYLE CATEGORY (5 templates)
            {
                id: 'recipe-vault',
                name: 'RecipeVault',
                displayName: 'Recipe Vault',
                description: 'Recipe management and cooking assistant with meal planning and shopping lists',
                category: 'lifestyle',
                icon: '👨‍🍳',
                color: '#FF9F43',
                features: ['Recipe storage', 'Cooking timers', 'Shopping lists', 'Meal planning'],
                plugins: ['cordova-plugin-camera', 'cordova-plugin-file', 'cordova-plugin-social-sharing'],
                estimatedTime: 4
            },
            {
                id: 'home-automation',
                name: 'HomeAutomation',
                displayName: 'Home Automation',
                description: 'Smart home control with device management, scheduling, and energy monitoring',
                category: 'lifestyle',
                icon: '🏠',
                color: '#2ECC71',
                features: ['Device control', 'Automation scheduling', 'Energy monitoring', 'Security integration'],
                plugins: ['cordova-plugin-network-information', 'cordova-plugin-geolocation', 'cordova-plugin-local-notification'],
                estimatedTime: 6
            },
            {
                id: 'travel-planner',
                name: 'TravelPlanner',
                displayName: 'Travel Planner',
                description: 'Comprehensive travel planning with itineraries, bookings, and offline maps',
                category: 'lifestyle',
                icon: '✈️',
                color: '#3498DB',
                features: ['Itinerary planning', 'Booking management', 'Offline maps', 'Travel documents'],
                plugins: ['cordova-plugin-geolocation', 'cordova-plugin-camera', 'cordova-plugin-file', 'cordova-plugin-calendar'],
                estimatedTime: 6
            },
            {
                id: 'plant-care',
                name: 'PlantCare',
                displayName: 'Plant Care',
                description: 'Plant care assistant with watering schedules, plant identification, and care tips',
                category: 'lifestyle',
                icon: '🌱',
                color: '#27AE60',
                features: ['Watering schedules', 'Plant identification', 'Care tips', 'Growth tracking'],
                plugins: ['cordova-plugin-camera', 'cordova-plugin-local-notification', 'cordova-plugin-file'],
                estimatedTime: 4
            },
            {
                id: 'fashion-closet',
                name: 'FashionCloset',
                displayName: 'Fashion Closet',
                description: 'Digital wardrobe organizer with outfit planning, style suggestions, and shopping lists',
                category: 'lifestyle',
                icon: '👗',
                color: '#E91E63',
                features: ['Wardrobe organization', 'Outfit planning', 'Style suggestions', 'Shopping integration'],
                plugins: ['cordova-plugin-camera', 'cordova-plugin-file', 'cordova-plugin-social-sharing'],
                estimatedTime: 5
            }
        ];

        defaultTemplates.forEach(template => {
            this.addTemplate(template);
        });
    }

    // Add a new template
    addTemplate(template) {
        // Validate template
        if (!this.validateTemplate(template)) {
            throw new Error('Invalid template configuration');
        }

        // Add to templates map
        this.templates.set(template.id, template);
        
        // Add category to categories set
        this.categories.add(template.category);

        return template;
    }

    // Validate template structure
    validateTemplate(template) {
        const required = ['id', 'name', 'displayName', 'description', 'category', 'icon', 'color'];
        return required.every(field => template.hasOwnProperty(field) && template[field]);
    }

    // Get all templates
    getAllTemplates() {
        return Array.from(this.templates.values());
    }

    // Get templates by category
    getTemplatesByCategory(category) {
        return this.getAllTemplates().filter(template => template.category === category);
    }

    // Get template by ID
    getTemplate(id) {
        return this.templates.get(id);
    }

    // Get all categories
    getCategories() {
        return Array.from(this.categories).sort();
    }

    // Get available plugins
    getAvailablePlugins() {
        return Array.from(this.availablePlugins.values());
    }

    // Get plugins by category
    getPluginsByCategory(category) {
        return this.getAvailablePlugins().filter(plugin => plugin.category === category);
    }

    // Create custom template from form data
    createCustomTemplate(formData) {
        const template = {
            id: this.generateId(formData.name),
            name: this.sanitizeName(formData.name),
            displayName: formData.name,
            description: formData.description,
            category: formData.category,
            icon: formData.icon || '📱',
            color: formData.color || '#4A90E2',
            features: this.generateFeatures(formData.category),
            plugins: formData.plugins || [],
            estimatedTime: this.calculateEstimatedTime(formData.plugins || []),
            custom: true
        };

        return this.addTemplate(template);
    }

    // Generate unique ID from name
    generateId(name) {
        const base = name.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        
        let id = base;
        let counter = 1;
        
        while (this.templates.has(id)) {
            id = `${base}-${counter}`;
            counter++;
        }
        
        return id;
    }

    // Sanitize name for use as class/variable name
    sanitizeName(name) {
        return name.replace(/[^a-zA-Z0-9]/g, '');
    }

    // Generate default features based on category
    generateFeatures(category) {
        const categoryFeatures = {
            productivity: ['Task management', 'Organization tools', 'Productivity tracking', 'Goal setting'],
            utilities: ['Utility functions', 'Tool integration', 'Quick access', 'Efficiency features'],
            entertainment: ['Media playback', 'Interactive content', 'User engagement', 'Entertainment features'],
            education: ['Learning tools', 'Progress tracking', 'Educational content', 'Study aids'],
            health: ['Health monitoring', 'Fitness tracking', 'Wellness features', 'Progress analytics'],
            finance: ['Financial tracking', 'Budget management', 'Expense monitoring', 'Financial reports'],
            weather: ['Weather data', 'Forecasting', 'Climate information', 'Location-based updates'],
            social: ['Social features', 'Sharing capabilities', 'Community interaction', 'Communication tools'],
            business: ['Business tools', 'Professional features', 'Workflow management', 'Business analytics'],
            lifestyle: ['Lifestyle features', 'Personal tools', 'Daily assistance', 'Life management']
        };

        return categoryFeatures[category] || ['Custom features', 'User-friendly interface', 'Mobile optimized', 'Cross-platform'];
    }

    // Calculate estimated generation time
    calculateEstimatedTime(plugins) {
        const baseTime = 2; // Base time in minutes
        const pluginTime = plugins.length * 0.5; // 30 seconds per plugin
        return Math.ceil(baseTime + pluginTime);
    }

    // Remove template
    removeTemplate(id) {
        const template = this.templates.get(id);
        if (template && template.custom) {
            this.templates.delete(id);
            return true;
        }
        return false;
    }

    // Export templates configuration
    exportTemplates() {
        const customTemplates = this.getAllTemplates().filter(t => t.custom);
        return {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            templates: customTemplates
        };
    }

    // Import templates configuration
    importTemplates(config) {
        if (!config.templates || !Array.isArray(config.templates)) {
            throw new Error('Invalid templates configuration');
        }

        const imported = [];
        config.templates.forEach(template => {
            try {
                const importedTemplate = this.addTemplate(template);
                imported.push(importedTemplate);
            } catch (error) {
                console.warn('Failed to import template:', template.name, error);
            }
        });

        return imported;
    }

    // Get template statistics
    getStatistics() {
        const templates = this.getAllTemplates();
        const categories = {};
        
        templates.forEach(template => {
            categories[template.category] = (categories[template.category] || 0) + 1;
        });

        return {
            totalTemplates: templates.length,
            customTemplates: templates.filter(t => t.custom).length,
            categories: categories,
            totalPlugins: this.availablePlugins.size
        };
    }
}

// Export for use in other modules
window.AppTemplatesManager = AppTemplatesManager;
