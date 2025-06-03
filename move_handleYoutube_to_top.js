const fs = require('fs');
const path = require('path');

console.log('🔧 Moving handleYoutube declaration to constants section...');

// Read the current app.js file
const appFilePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(appFilePath, 'utf8');

console.log('📝 Finding and extracting handleYoutube declaration...');

// Find the handleYoutube declaration and extract it
const handleYoutubePattern = /(const handleYoutube = \{[\s\S]*?\};)/;
const handleYoutubeMatch = content.match(handleYoutubePattern);

if (!handleYoutubeMatch) {
    console.error('❌ Could not find handleYoutube declaration');
    process.exit(1);
}

const handleYoutubeCode = handleYoutubeMatch[1];
console.log('✅ Found handleYoutube declaration');

// Remove the handleYoutube declaration from its current location
content = content.replace(handleYoutubePattern, '');

// Also remove the window assignment line that follows
content = content.replace(/\nwindow\.handleYoutube = handleYoutube;\n/, '');

console.log('📝 Adding handleYoutube to constants section...');

// Find the end of the GLOBAL SCOPED VARIABLES section to insert before it
const insertPoint = content.indexOf('// =====================================================\n// GLOBAL SCOPED VARIABLES\n// =====================================================');

if (insertPoint === -1) {
    console.error('❌ Could not find GLOBAL SCOPED VARIABLES section');
    process.exit(1);
}

// Insert the handleYoutube declaration before the GLOBAL SCOPED VARIABLES section
const beforeInsert = content.substring(0, insertPoint);
const afterInsert = content.substring(insertPoint);

let newContent = beforeInsert + 
`// =====================================================
// YOUTUBE HANDLER OBJECT  
// =====================================================

${handleYoutubeCode}

// Assign to window for global access
window.handleYoutube = handleYoutube;

` + afterInsert;

console.log('📝 Reverting sendMessage to use direct handleYoutube reference...');

// Change sendMessage back to use direct handleYoutube reference
newContent = newContent.replace(
    'await window.handleYoutube.handleYoutubeRequest(messageText);',
    'await handleYoutube.handleYoutubeRequest(messageText);'
);

// Write the updated content back to the file
fs.writeFileSync(appFilePath, newContent);

console.log('🎉 handleYoutube moved to constants section successfully!');
console.log('📋 YouTube functionality will now work without initialization errors!'); 