const fs = require('fs');
const path = require('path');

console.log('🔧 Adding null check for window.handleYoutube...');

// Read the current app.js file
const appFilePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(appFilePath, 'utf8');

console.log('📝 Adding safety check for window.handleYoutube...');

// Add null check before calling window.handleYoutube.handleYoutubeRequest
const youtubePattern = /(\/\/ Check for YouTube request\s+if \(patterns\.youtube\.searchVideos\.test\(messageText\) \|\| patterns\.youtube\.playVideo\.test\(messageText\)\) \{\s+await window\.handleYoutube\.handleYoutubeRequest\(messageText\);\s+return;\s+\})/;

if (content.match(youtubePattern)) {
    content = content.replace(
        youtubePattern,
        `// Check for YouTube request
        if (patterns.youtube.searchVideos.test(messageText) || patterns.youtube.playVideo.test(messageText)) {
            if (window.handleYoutube && typeof window.handleYoutube.handleYoutubeRequest === 'function') {
                await window.handleYoutube.handleYoutubeRequest(messageText);
            } else {
                console.warn('YouTube handler not yet initialized, ignoring request');
            }
            return;
        }`
    );
    console.log('✅ Added null check for window.handleYoutube');
} else {
    console.log('⚠️ YouTube handler pattern not found');
}

// Write the updated content back to the file
fs.writeFileSync(appFilePath, content);

console.log('🎉 YouTube null check fix complete!');
console.log('📋 YouTube requests will now be safely handled!'); 