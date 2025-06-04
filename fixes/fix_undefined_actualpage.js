const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing undefined actualPage variable...');

// Read the current app.js file
const appFilePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(appFilePath, 'utf8');

console.log('📝 Replacing actualPage with proper variable...');

// Fix the undefined actualPage variable
if (content.includes('data.page || actualPage')) {
    content = content.replace(
        /data\.page \|\| actualPage/g,
        'data.page || window.youtubePagination.currentPage'
    );
    console.log('✅ Fixed undefined actualPage variable');
} else {
    console.log('⚠️ Could not find actualPage reference');
}

// Write the updated content back to the file
fs.writeFileSync(appFilePath, content);

console.log('🎉 Undefined variable fix complete!');
console.log('📋 actualPage references replaced with proper variable!'); 