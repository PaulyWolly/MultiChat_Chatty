// Debug script with timeout to identify fetch hanging issue
console.log('🔬 [TIMEOUT DEBUG] Starting TTS fetch timeout test...');

const testUrl = 'http://localhost:5300/api/tts';
const testData = {
    text: "Hello world test",
    voice: 'en-US-AndrewNeural',
    rate: 0.9,
    pitch: 1.0,
    volume: 1.0
};

async function testFetchWithTimeout() {
    console.log('🔬 [TIMEOUT] Starting fetch with 5-second timeout...');
    
    try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log('🔬 [TIMEOUT] ⏰ TIMEOUT! Aborting fetch after 5 seconds');
            controller.abort();
        }, 5000);

        console.log('🔬 [TIMEOUT] About to call fetch...');
        
        const response = await fetch(testUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('🔬 [TIMEOUT] ✅ Fetch successful! Response:', response.status);
        
        if (response.ok) {
            const blob = await response.blob();
            console.log('🔬 [TIMEOUT] ✅ Blob size:', blob.size);
        }
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('🔬 [TIMEOUT] ❌ FETCH TIMED OUT after 5 seconds');
        } else {
            console.error('🔬 [TIMEOUT] ❌ Fetch error:', error.name, error.message);
        }
    }
}

// Test with basic connectivity first
async function testBasicConnectivity() {
    console.log('🔬 [CONNECTIVITY] Testing basic server connectivity...');
    try {
        const response = await fetch('http://localhost:5300/api/health');
        console.log('🔬 [CONNECTIVITY] Health check:', response.status);
    } catch (error) {
        console.error('🔬 [CONNECTIVITY] Health check failed:', error);
    }
}

// Run tests
console.log('🔬 Running connectivity test first...');
await testBasicConnectivity();
console.log('🔬 Now testing TTS fetch...');
testFetchWithTimeout(); 