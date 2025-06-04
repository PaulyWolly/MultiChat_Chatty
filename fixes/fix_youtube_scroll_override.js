const fs = require('fs');

console.log('🔧 [YOUTUBE SCROLL OVERRIDE] Starting...');

const appFile = 'public/app.js';
let content = fs.readFileSync(appFile, 'utf8');

// Fix: Add scrollToYouTubeResults() call after YouTube results are rendered
const oldPattern = `// Add the assistant response 
    addMessageToChat('assistant', youtubeMultiBubble.outerHTML, { 
        mock: false, 
        isYoutubePagination: true,
        subject: subject
    });`;

const newPattern = `// Add the assistant response 
    addMessageToChat('assistant', youtubeMultiBubble.outerHTML, { 
        mock: false, 
        isYoutubePagination: true,
        subject: subject
    });
    
    // ALWAYS scroll to TOP of YouTube results (override normal bottom scrolling)
    scrollToYouTubeResults();`;

if (content.includes(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    console.log('✅ Added scrollToYouTubeResults() call after YouTube rendering');
} else {
    console.log('⚠️ Could not find exact pattern - trying alternative...');
    
    // Alternative: Look for any addMessageToChat with isYoutubePagination: true
    const altPattern = /addMessageToChat\('assistant', youtubeMultiBubble\.outerHTML, \{\s*mock: false,\s*isYoutubePagination: true,\s*subject: subject\s*\}\);/;
    
    if (altPattern.test(content)) {
        content = content.replace(altPattern, 
            `addMessageToChat('assistant', youtubeMultiBubble.outerHTML, { 
        mock: false, 
        isYoutubePagination: true,
        subject: subject
    });
    
    // ALWAYS scroll to TOP of YouTube results (override normal bottom scrolling)
    scrollToYouTubeResults();`);
        console.log('✅ Added scrollToYouTubeResults() call using alternative pattern');
    } else {
        console.log('❌ Could not find YouTube rendering pattern');
    }
}

// Write the updated content
fs.writeFileSync(appFile, content, 'utf8');
console.log('🎯 [YOUTUBE SCROLL OVERRIDE] Complete! YouTube searches will now scroll to TOP.'); 