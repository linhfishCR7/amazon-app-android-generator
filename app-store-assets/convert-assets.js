#!/usr/bin/env node

/**
 * SVG to PNG Converter for App Store Assets
 * Alternative command-line conversion tool
 * 
 * Usage: node convert-assets.js
 * 
 * Requirements: npm install canvas (for server-side canvas support)
 * Note: This is an alternative to the web-based converter
 */

const fs = require('fs');
const path = require('path');

// Check if canvas is available (optional dependency)
let Canvas;
try {
    Canvas = require('canvas');
    console.log('✅ Canvas module available - SVG conversion enabled');
} catch (error) {
    console.log('⚠️  Canvas module not available - only fallback generation enabled');
    console.log('   Install with: npm install canvas');
}

// App color scheme
const colors = {
    primary: '#667eea',
    secondary: '#764ba2', 
    accent: '#f093fb',
    blue: '#4A90E2',
    white: '#ffffff'
};

// Asset configurations
const assets = [
    { name: 'app-icon-512x512', width: 512, height: 512, type: 'icon' },
    { name: 'app-icon-114x114', width: 114, height: 114, type: 'icon' },
    { name: 'feature-graphic-1280x800', width: 1280, height: 800, type: 'banner' }
];

function generateFallbackImage(width, height, type) {
    if (!Canvas) {
        throw new Error('Canvas module required for image generation');
    }

    const canvas = Canvas.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, colors.primary);
    gradient.addColorStop(0.5, colors.secondary);
    gradient.addColorStop(1, colors.accent);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle dot pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let x = 0; x < width; x += Math.max(20, width/32)) {
        for (let y = 0; y < height; y += Math.max(20, height/20)) {
            ctx.beginPath();
            ctx.arc(x + 10, y + 10, Math.max(1, width/256), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    if (type === 'icon') {
        generateIconContent(ctx, width, height);
    } else if (type === 'banner') {
        generateBannerContent(ctx, width, height);
    }

    return canvas;
}

function generateIconContent(ctx, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const phoneWidth = width * 0.25;
    const phoneHeight = height * 0.45;

    // Phone shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = width * 0.02;
    ctx.shadowOffsetY = width * 0.01;

    // Phone body
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(centerX - phoneWidth/2, centerY - phoneHeight/2, phoneWidth, phoneHeight);
    
    // Screen
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = colors.blue;
    const margin = phoneWidth * 0.12;
    ctx.fillRect(
        centerX - phoneWidth/2 + margin, 
        centerY - phoneHeight/2 + margin, 
        phoneWidth - margin * 2, 
        phoneHeight - margin * 2.5
    );

    // App grid
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const gridSize = phoneWidth * 0.06;
    const spacing = phoneWidth * 0.09;
    
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            ctx.globalAlpha = 0.5 + Math.random() * 0.5;
            ctx.fillRect(
                centerX - spacing + col * spacing, 
                centerY - spacing * 0.8 + row * spacing, 
                gridSize, 
                gridSize
            );
        }
    }
    ctx.globalAlpha = 1;

    // Home button
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(centerX, centerY + phoneHeight/2 - margin, phoneWidth * 0.04, 0, Math.PI * 2);
    ctx.fill();

    // Text
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = width * 0.01;
    ctx.fillStyle = colors.white;
    ctx.font = `bold ${width * 0.08}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('CAG', centerX, centerY + phoneHeight/2 + width * 0.12);
}

function generateBannerContent(ctx, width, height) {
    // Main title with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = height * 0.01;
    ctx.fillStyle = colors.white;
    ctx.font = `bold ${height * 0.09}px Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('CORDOVA', width * 0.06, height * 0.25);
    ctx.fillText('APP GENERATOR', width * 0.06, height * 0.38);
    
    // Subtitle
    ctx.font = `600 ${height * 0.04}px Arial, sans-serif`;
    ctx.fillText('Create Multiple Mobile Apps Instantly', width * 0.06, height * 0.48);

    // Feature list
    ctx.font = `500 ${height * 0.025}px Arial, sans-serif`;
    const features = [
        '🚀 Generate up to 10 apps simultaneously',
        '🎨 Professional templates & themes', 
        '🌐 Automatic GitHub integration',
        '📱 Production-ready Cordova projects'
    ];
    
    features.forEach((feature, index) => {
        ctx.fillText(feature, width * 0.06, height * 0.55 + index * height * 0.05);
    });

    // Phone illustrations
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = height * 0.02;
    
    const phoneX = width * 0.75;
    const phoneY = height * 0.5;
    const phoneW = width * 0.06;
    const phoneH = height * 0.25;

    // Main phone
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(phoneX - phoneW/2, phoneY - phoneH/2, phoneW, phoneH);
    
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = colors.blue;
    ctx.fillRect(
        phoneX - phoneW/2 + phoneW * 0.1, 
        phoneY - phoneH/2 + phoneH * 0.1, 
        phoneW * 0.8, 
        phoneH * 0.7
    );

    // Side phones
    ctx.save();
    ctx.translate(phoneX - width * 0.08, phoneY - height * 0.12);
    ctx.rotate(-0.15);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(-phoneW/3, -phoneH/3, phoneW * 0.6, phoneH * 0.6);
    ctx.restore();

    ctx.save();
    ctx.translate(phoneX + width * 0.08, phoneY + height * 0.08);
    ctx.rotate(0.1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(-phoneW/3, -phoneH/3, phoneW * 0.6, phoneH * 0.6);
    ctx.restore();

    // Bottom tagline
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = `600 ${height * 0.025}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Professional Mobile App Development Made Simple', width/2, height * 0.85);
}

async function generateAllAssets() {
    console.log('🎨 Generating app store assets...\n');
    
    // Create output directory
    const outputDir = path.join(__dirname, 'generated-png');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    for (const asset of assets) {
        try {
            console.log(`📱 Generating ${asset.name}...`);
            
            const canvas = generateFallbackImage(asset.width, asset.height, asset.type);
            const buffer = canvas.toBuffer('image/png');
            
            const outputPath = path.join(outputDir, `${asset.name}.png`);
            fs.writeFileSync(outputPath, buffer);
            
            console.log(`✅ ${asset.name}.png created (${(buffer.length/1024).toFixed(1)}KB)`);
        } catch (error) {
            console.error(`❌ Failed to generate ${asset.name}:`, error.message);
        }
    }
    
    console.log(`\n🎉 Assets generated in: ${outputDir}`);
}

// Run if called directly
if (require.main === module) {
    if (!Canvas) {
        console.log('❌ Canvas module not available. Install with: npm install canvas');
        console.log('💡 Use the web-based converter instead: enhanced-converter.html');
        process.exit(1);
    }
    
    generateAllAssets().catch(console.error);
}

module.exports = { generateFallbackImage, generateAllAssets };
