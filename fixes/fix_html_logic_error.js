const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing HTML logic error in if-else chain...');

// Read the current app.js file
const appFilePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(appFilePath, 'utf8');

console.log('📝 Fixing the if-else chain structure...');

// Fix the broken if-else chain structure
const brokenPattern = /(\s+\/\/ Check for general HTML flag first\s+if \(options\.isHTML\) \{\s+contentElement\.innerHTML = content;\s+\}\s+)\/\/ \/\/ Check for HTML-based search results\s+if \(/;

if (content.includes("// Check for general HTML flag first")) {
    content = content.replace(
        brokenPattern,
        `$1// Check for HTML-based search results
        else if (`
    );
    console.log('✅ Fixed if-else chain structure');
} else {
    console.log('⚠️ Could not find broken if-else pattern');
}

// Write the updated content back to the file
fs.writeFileSync(appFilePath, content);

console.log('🎉 HTML logic error fix complete!');
console.log('📋 The if-else chain now flows properly!'); 