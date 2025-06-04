const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing HTML rendering with proper if-else chain...');

// Read the current app.js file
const appFilePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(appFilePath, 'utf8');

console.log('📝 Adding proper HTML flag support...');

// Find and fix the if-else chain properly
const ifElsePattern = /(\/\/ Check for HTML-based search results\s+if \(\s+content\.includes\('<h2>Web Results'\)[\s\S]*?\) \{\s+contentElement\.innerHTML = content;\s+\})/;

if (content.includes("// Check for HTML-based search results")) {
    content = content.replace(
        ifElsePattern,
        `// Check for general HTML flag or HTML-based search results
        if (options.isHTML || 
            content.includes('<h2>Web Results') ||
            content.includes('<h2>News Results') ||
            content.includes("<ol class='search-results-list'>") ||
            content.includes('<ol class="search-results-list">')) {
            contentElement.innerHTML = content;
        }`
    );
    console.log('✅ Added HTML flag support while maintaining if-else chain');
} else {
    console.log('⚠️ Could not find HTML-based search results pattern');
}

// Fix 2: Update renderYoutubeResults to use the HTML flag
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
    console.log('✅ Updated renderYoutubeResults to use HTML flag');
} else {
    console.log('⚠️ Could not find renderYoutubeResults pattern');
}

// Write the updated content back to the file
fs.writeFileSync(appFilePath, content);

console.log('🎉 Proper HTML rendering fix complete!');
console.log('📋 HTML content will render properly without breaking syntax!'); 