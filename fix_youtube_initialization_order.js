const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing handleYoutube initialization order issue...');

// Read the current app.js file
const appFilePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(appFilePath, 'utf8');

console.log('📝 Changing handleYoutube call to use window reference...');

// Fix the initialization order issue by using window.handleYoutube
if (content.includes('await handleYoutube.handleYoutubeRequest(messageText);')) {
    content = content.replace(
        'await handleYoutube.handleYoutubeRequest(messageText);',
        'await window.handleYoutube.handleYoutubeRequest(messageText);'
    );
    console.log('✅ Fixed handleYoutube initialization order issue');
} else {
    console.log('⚠️ handleYoutube call pattern not found');
}

// Write the updated content back to the file
fs.writeFileSync(appFilePath, content);

console.log('🎉 YouTube initialization order fix complete!');
console.log('📋 handleYoutube will now use window.handleYoutube reference!'); 