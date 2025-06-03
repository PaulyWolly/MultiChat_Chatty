// Fix Smart Interrupt Issues Script
// Fixes: 1) Stop button visibility, 2) Recovery loops, 3) Multiple enable calls

const fs = require('fs');

console.log('🔧 [FIX] Starting smart interrupt fixes...');

// Read the current app.js file
let appJs = fs.readFileSync('public/app.js', 'utf8');

// Fix #1: Change stop button to show during interrupt mode (not hide)
console.log('🔧 [FIX] Fixing stop button visibility...');
appJs = appJs.replace(
    /\/\/ 3\. Hide stop audio button\s*\n\s*elements\.stopAudioButton\.style\.display = 'none';/,
    `// 3. Show stop audio button during interrupt mode
    elements.stopAudioButton.style.display = 'inline-block';`
);

// Fix #2: Fix the recovery mechanism to prevent loops
console.log('🔧 [FIX] Fixing recovery mechanism...');
appJs = appJs.replace(
    /\/\/ 4\. Restart normal listening if in conversation mode[\s\S]*?}\s*}/,
    `// 4. Start listening for interrupts only if not already listening
    if (state.isConversationMode && !state.isListening && !state.isProcessing) {
        console.log('🔇 [SMART-FILTER] Starting interrupt listening...');
        setTimeout(() => {
            updateStatus(MESSAGES.STATUS.INTERRUPT);
            startListening();
        }, 200);
    }`
);

// Fix #3: Improve disableSmartInterruptMode to properly recover
console.log('🔧 [FIX] Improving disable function...');
appJs = appJs.replace(
    /\/\/ No automatic restart - let the existing flow handle it/,
    `// Properly restart normal listening after interrupt mode
    if (state.isConversationMode && !state.isListening && !state.isProcessing) {
        console.log('🔇 [SMART-FILTER] Restarting normal listening after interrupt mode...');
        setTimeout(() => {
            if (!state.isListening && !state.isAISpeaking) {
                updateStatus(MESSAGES.STATUS.LISTENING);
                startListening();
            }
        }, 1000);
    }`
);

// Fix #4: Improve the interrupt detection logic
console.log('🔧 [FIX] Improving interrupt detection...');
appJs = appJs.replace(
    /if \(INTERRUPT_KEYWORDS\.some\(keyword => transcript\.includes\(keyword\)\)\) \{[\s\S]*?return;\s*}/,
    `if (INTERRUPT_KEYWORDS.some(keyword => transcript.includes(keyword))) {
                    console.log('🔇 [SMART-FILTER] Smart interrupt detected! Stopping audio...');
                    stopAllAudio();
                    
                    // Ensure proper cleanup and recovery
                    updateStatus('Interrupted!');
                    
                    // Properly disable interrupt mode and recover
                    setTimeout(() => {
                        disableSmartInterruptMode();
                        if (state.isConversationMode) {
                            updateStatus(MESSAGES.STATUS.LISTENING);
                            if (!state.isListening) {
                                startListening();
                            }
                        }
                    }, 1500);
                    return;
                }`
);

// Write the fixed file
fs.writeFileSync('public/app.js', appJs);
console.log('✅ [FIX] Smart interrupt fixes applied successfully!');

// Summary
console.log(`
📋 [SUMMARY] Fixes Applied:
1. ✅ Stop button now SHOWS during interrupt mode (was hidden)
2. ✅ Recovery mechanism improved to prevent loops  
3. ✅ Disable function now properly restarts listening
4. ✅ Interrupt detection cleanup improved
`); 