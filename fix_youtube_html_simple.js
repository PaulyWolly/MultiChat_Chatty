const fs = require('fs');
const path = require('path');

console.log('🔧 Adding YouTube HTML detection to existing HTML rendering...');

// Read the current app.js file
const appFilePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(appFilePath, 'utf8');

console.log('📝 Adding YouTube content detection to HTML rendering...');

// Find and update the existing HTML detection logic
const originalPattern = `if (
            content.includes('<h2>Web Results') ||
            content.includes('<h2>News Results') ||
            content.includes("<ol class='search-results-list'>") ||
            content.includes('<ol class="search-results-list">')
        ) {
            contentElement.innerHTML = content;
        }`;

const updatedPattern = `if (
            content.includes('<h2>Web Results') ||
            content.includes('<h2>News Results') ||
            content.includes("<ol class='search-results-list'>") ||
            content.includes('<ol class="search-results-list">') ||
            content.includes('youtube-multi-bubble') ||
            content.includes('youtube-action-btn') ||
            content.includes('<div class="video-item">') ||
            content.includes('<button class=')
        ) {
            contentElement.innerHTML = content;
        }`;

if (content.includes(`content.includes('<h2>Web Results')`)) {
    content = content.replace(originalPattern, updatedPattern);
    console.log('✅ Added YouTube HTML detection to addMessageToChat');
} else {
    console.log('⚠️ Could not find HTML detection pattern in addMessageToChat');
}

// Also update the updateMessageContent function with the same logic
const updateOriginalPattern = `if (
            content.includes('<h2>Web Results') ||
            content.includes('<h2>News Results') ||
            content.includes("<ol class='search-results-list'>") ||
            content.includes('<ol class="search-results-list">')
        ) {
            contentElement.innerHTML = content;
        }`;

const updateUpdatedPattern = `if (
            content.includes('<h2>Web Results') ||
            content.includes('<h2>News Results') ||
            content.includes("<ol class='search-results-list'>") ||
            content.includes('<ol class="search-results-list">') ||
            content.includes('youtube-multi-bubble') ||
            content.includes('youtube-action-btn') ||
            content.includes('<div class="video-item">') ||
            content.includes('<button class=')
        ) {
            contentElement.innerHTML = content;
        }`;

// Apply the same fix to updateMessageContent function
if (content.includes(updateOriginalPattern)) {
    content = content.replace(updateOriginalPattern, updateUpdatedPattern);
    console.log('✅ Added YouTube HTML detection to updateMessageContent');
} else {
    console.log('📝 updateMessageContent pattern not found (may already be updated)');
}

// Write the updated content back to the file
fs.writeFileSync(appFilePath, content);

console.log('🎉 YouTube HTML rendering fix complete!');
console.log('📋 YouTube search results will now render as proper HTML!'); 