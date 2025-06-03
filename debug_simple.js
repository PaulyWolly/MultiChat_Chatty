// Simple debug script without top-level await
console.log('🔬 [SIMPLE DEBUG] Starting simple TTS test...');

// Test basic connectivity first
function testConnectivity() {
    console.log('🔬 [SIMPLE] Testing /api/health...');
    fetch('http://localhost:5300/api/health')
        .then(response => {
            console.log('🔬 [SIMPLE] Health check response:', response.status);
            return testTTS();
        })
        .catch(error => {
            console.error('🔬 [SIMPLE] Health check failed:', error);
        });
}

// Test TTS endpoint
function testTTS() {
    console.log('🔬 [SIMPLE] Testing TTS endpoint...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.log('🔬 [SIMPLE] ⏰ TTS TIMEOUT after 3 seconds!');
        controller.abort();
    }, 3000);

    fetch('http://localhost:5300/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: "Test audio",
            voice: 'en-US-AndrewNeural',
            rate: 0.9,
            pitch: 1.0,
            volume: 1.0
        }),
        signal: controller.signal
    })
    .then(response => {
        clearTimeout(timeoutId);
        console.log('🔬 [SIMPLE] ✅ TTS Success! Status:', response.status);
        return response.blob();
    })
    .then(blob => {
        console.log('🔬 [SIMPLE] ✅ Blob size:', blob.size);
    })
    .catch(error => {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error('🔬 [SIMPLE] ❌ TTS TIMED OUT');
        } else {
            console.error('🔬 [SIMPLE] ❌ TTS Error:', error.name, error.message);
        }
    });
}

// Start the test
console.log('🔬 [SIMPLE] Ready to start tests...');
testConnectivity(); 