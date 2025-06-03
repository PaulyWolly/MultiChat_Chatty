const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing HTML content rendering (general approach)...');

// Read the current app.js file
const appFilePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(appFilePath, 'utf8');

console.log('📝 Adding general HTML content flag support...');

// Fix 1: Add support for a general 'isHTML' flag in addMessageToChat
const addMessageToChatPattern = /(\} else if \(typeof content === 'string'\) \{[\s\S]*?)(\/\/ Check for HTML-based search results)/;

if (content.includes("} else if (typeof content === 'string') {")) {
    content = content.replace(
        addMessageToChatPattern,
        `$1// Check for general HTML flag first
        if (options.isHTML) {
            contentElement.innerHTML = content;
        }
        // $2`
    );
    console.log('✅ Added general HTML flag support to addMessageToChat');
} else {
    console.log('⚠️ Could not find addMessageToChat string handling pattern');
}

// Fix 2: Update renderYoutubeResults to use the HTML flag instead of relying on content detection
if (content.includes("addMessageToChat('assistant', youtubeMultiBubble.outerHTML,")) {
    content = content.replace(
        /addMessageToChat\('assistant', youtubeMultiBubble\.outerHTML, \{[\s\S]*?mock: false,[\s\S]*?\}\);/,
        `addMessageToChat('assistant', youtubeMultiBubble.outerHTML, { 
        isHTML: true,
        mock: false, 
        isYoutubePagination: true,
        subject: subject
    });`
    );
    console.log('✅ Updated renderYoutubeResults to use general HTML flag');
} else {
    console.log('⚠️ Could not find renderYoutubeResults addMessageToChat pattern');
}

// Write the updated content back to the file
fs.writeFileSync(appFilePath, content);

console.log('🎉 General HTML rendering fix complete!');
console.log('📋 Any content with isHTML flag will now render as HTML');
console.log('🎥 YouTube results should display properly without specific conditions!'); 