# Cordova App Generator - Icons & Assets

This directory contains icons and visual assets for the Cordova App Generator.

## 📁 Directory Structure

```
img/
├── icon-generator.html     # Interactive icon creation tool
├── icons/                  # Generated app icons (create this folder)
│   ├── app-icon-512.png   # 512x512 App Store icon
│   ├── app-icon-114.png   # 114x114 iOS app icon
│   ├── banner-main.png    # 1280x800 Main promotional banner
│   ├── banner-features.png # 1280x800 Features banner
│   └── banner-workflow.png # 1280x800 Workflow banner
└── README.md              # This file
```

## 🎨 Creating Icons

### Method 1: Using the Icon Generator
1. Open `icon-generator.html` in your browser
2. Take screenshots of each icon design
3. Save them with the specified names in the `icons/` folder

### Method 2: Using Design Tools
Use tools like Figma, Canva, or Photoshop with these specifications:

#### App Store Icon (512x512px)
- **Format:** PNG with transparency
- **Background:** Linear gradient from #667eea to #764ba2
- **Border Radius:** 80px (15.6%)
- **Content:** 📱 symbol + "CORDOVA" text + "APP GENERATOR" subtitle
- **Typography:** Bold, white text with drop shadow

#### iOS App Icon (114x114px)
- **Format:** PNG with transparency
- **Background:** Same gradient as above
- **Border Radius:** 18px (15.8%)
- **Content:** Simplified design with "CAG" text or 📱 symbol only
- **Typography:** Bold, white text

#### Promotional Banners (1280x800px)
- **Format:** PNG or JPG
- **Background:** Same gradient with subtle dot pattern overlay
- **Layout:** Text content on left, visual element on right
- **Content Variations:**
  - Main: App name + tagline + key features
  - Features: Feature highlights + benefits
  - Workflow: Step-by-step process + call-to-action

## 🎨 Design Guidelines

### Color Palette
- **Primary:** #667eea (Bright Blue)
- **Secondary:** #764ba2 (Deep Purple)
- **Text:** #ffffff (White)
- **Pattern:** rgba(255,255,255,0.1) (Semi-transparent white)

### Typography
- **Font Family:** 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
- **Weights:** 400 (normal), 700 (bold)
- **Hierarchy:**
  - Main Title: 72px bold
  - Subtitle: 28px normal
  - Features: 18px normal
  - Icon Text: 48px bold (512px), 12px bold (114px)

### Visual Elements
- **Main Symbol:** 📱 (Mobile phone emoji)
- **Alternative Symbols:** ⚡ (Lightning), 🔄 (Cycle), 🏗️ (Construction)
- **Background Pattern:** Subtle radial dots for texture
- **Shadows:** Soft drop shadows for depth

## 📱 Usage in Application

Once created, these icons can be used for:

- **App Store Listings:** 512x512 icon for app store submissions
- **iOS App Icon:** 114x114 for iOS app bundle
- **Marketing Materials:** 1280x800 banners for websites, presentations
- **Social Media:** Resized versions for social media profiles
- **Documentation:** Visual elements in README files and docs

## 🔧 Technical Notes

### File Formats
- **PNG:** Recommended for icons with transparency
- **JPG:** Acceptable for banners without transparency needs
- **SVG:** Consider creating vector versions for scalability

### Optimization
- Compress images for web use while maintaining quality
- Consider creating @2x and @3x versions for high-DPI displays
- Use appropriate color profiles (sRGB for web)

### Accessibility
- Ensure sufficient contrast ratios
- Provide alternative text descriptions
- Consider colorblind-friendly color combinations

## 🚀 Quick Start

1. **Create the icons folder:**
   ```bash
   mkdir app-generator/img/icons
   ```

2. **Open the icon generator:**
   ```bash
   open app-generator/img/icon-generator.html
   ```

3. **Take screenshots or export designs**

4. **Save with proper naming:**
   - `app-icon-512.png`
   - `app-icon-114.png`
   - `banner-main.png`
   - `banner-features.png`
   - `banner-workflow.png`

5. **Verify file sizes and quality**

## 📄 License

These design assets are part of the Cordova App Generator project and follow the same license terms as the main project.

---

**Need Help?** 
- Check the icon-generator.html file for visual references
- Use online tools like Canva or Figma for easy icon creation
- Consider hiring a designer for professional-quality assets
