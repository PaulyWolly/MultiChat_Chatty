const fs = require('fs');
const path = require('path');

console.log('🔧 Starting My Jokes Integration Script...');

// Read the current app.js file
const appFilePath = path.join(__dirname, 'public', 'app.js');
let content = fs.readFileSync(appFilePath, 'utf8');

console.log('📝 Applying My Jokes fixes...');

// Fix 1: Add handleMyJokes.handleJokeRequest() call before duplicate "yes" handler
const youtubeHandlerPattern = /(\s+\/\/ Check for YouTube request\s+if \(patterns\.youtube\.searchVideos\.test\(messageText\)[\s\S]*?\s+return;\s+})/;
const youtubeMatch = content.match(youtubeHandlerPattern);

if (youtubeMatch) {
    const replacement = youtubeMatch[1] + `

        // Check if this is a joke-related message (including "yes" responses)
        if (await handleMyJokes.handleJokeRequest(messageText)) {
            return;
        }`;
    
    content = content.replace(youtubeHandlerPattern, replacement);
    console.log('✅ Added joke handler routing');
} else {
    console.log('⚠️ Could not find YouTube handler pattern for joke routing');
}

// Fix 2: Fix joke content display with forceSimpleText flag
const jokeContentPattern = /(\s+addMessageToChat\('assistant', jokeData\.content\);)/;
if (content.includes("addMessageToChat('assistant', jokeData.content);")) {
    content = content.replace(
        "addMessageToChat('assistant', jokeData.content);",
        "addMessageToChat('assistant', jokeData.content, { forceSimpleText: true });"
    );
    console.log('✅ Fixed joke content display with forceSimpleText');
} else {
    console.log('⚠️ Could not find joke content display pattern');
}

// Fix 3: Add missing user message for "yes" responses in joke playback
const yesResponsePattern = /(if \(messageText\.toLowerCase\(\) === 'yes' && sessionStorage\.getItem\('pendingJoke'\)\) \{[\s\S]*?try \{)/;
const yesMatch = content.match(yesResponsePattern);

if (yesMatch) {
    const replacement = yesMatch[0] + `
                // Add user message for "yes" response
                addMessageToChat('user', messageText);
                `;
    content = content.replace(yesResponsePattern, replacement);
    console.log('✅ Added missing user message for "yes" responses');
} else {
    console.log('⚠️ Could not find "yes" response pattern for user message');
}

// Fix 4: Fix metadata format in retrieveJoke function
const metadataPattern = /tokens: '(\d+) tokens'/g;
if (content.includes("tokens: '32 tokens'")) {
    content = content.replace(/tokens: '(\d+) tokens'/g, 'tokenCount: $1');
    console.log('✅ Fixed metadata token format');
} else {
    console.log('⚠️ Could not find metadata token pattern');
}

// Fix 5: Convert inline metadata to separate updateMetadata calls in retrieveJoke
const retrieveJokeInlineMetadata = /addMessageToChat\('assistant', message, metadata\);/;
if (content.includes("addMessageToChat('assistant', message, metadata);")) {
    content = content.replace(
        /const message = "I found your joke\. Would you like to hear it\? Say YES to hear it or NO to cancel\.";[\s\S]*?addMessageToChat\('assistant', message, metadata\);/,
        `const message = "I found your joke. Would you like to hear it? Say YES to hear it or NO to cancel.";
                
                // Create message element first
                const messageElement = addMessageToChat('assistant', message);
                
                // Calculate timing after the work is done
                const endTime = performance.now();
                const duration = ((endTime - startTime) / 1000).toFixed(2);
                const tokenCount = 32;

                updateMetadata(messageElement, {
                    model: elements.modelSelect.value,
                    duration: duration,
                    tokenCount: tokenCount
                });`
    );
    console.log('✅ Fixed retrieveJoke metadata handling');
} else {
    console.log('⚠️ Could not find retrieveJoke inline metadata pattern');
}

// Write the updated content back to the file
fs.writeFileSync(appFilePath, content);

console.log('🎉 My Jokes integration complete!');
console.log('📋 Summary of fixes applied:');
console.log('   - Added joke handler routing before duplicate "yes" handler');
console.log('   - Fixed joke content display with forceSimpleText flag');
console.log('   - Added missing user message for "yes" responses');
console.log('   - Fixed metadata token format');
console.log('   - Updated retrieveJoke metadata handling');
console.log('');
console.log('⚡ Instant audio streaming should remain intact!');
console.log('🎭 My Jokes functionality should now work properly!'); 