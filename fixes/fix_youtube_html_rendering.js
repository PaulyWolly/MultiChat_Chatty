const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing YouTube HTML rendering issue...');

// Read the current app.js file
const appFilePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(appFilePath, 'utf8');

console.log('📝 Adding YouTube HTML content detection...');

// Find the HTML content detection section and add YouTube support
const htmlDetectionPattern = /(content\.includes\('<h2>Web Results'\)[\s\S]*?content\.includes\('<ol class="search-results-list">'\)[\s\S]*?\) \{[\s\S]*?contentElement\.innerHTML = content;[\s\S]*?})/;

if (content.includes("content.includes('<h2>Web Results')")) {
    // Add YouTube HTML detection to the existing HTML content conditions
    content = content.replace(
        /content\.includes\('<ol class="search-results-list">'\)/,
        `content.includes('<ol class="search-results-list">') ||
            content.includes('youtube-multi-bubble') ||
            content.includes('youtube-header-section') ||
            content.includes('video-list')`
    );
    console.log('✅ Added YouTube HTML content detection');
} else {
    console.log('⚠️ Could not find HTML content detection pattern');
}

// Write the updated content back to the file
fs.writeFileSync(appFilePath, content);

console.log('🎉 YouTube HTML rendering fix complete!');
console.log('📋 YouTube content will now render as HTML instead of escaped text');
console.log('🎥 YouTube search results should display properly now!'); 