// Debug script to test TTS fetch isolation
console.log('🔬 [DEBUG] Starting TTS fetch isolation test...');

// Test basic fetch functionality
const testUrl = 'http://localhost:5300/api/tts';
const testData = {
    text: "Hello world test",
    voice: 'en-US-AndrewNeural',
    rate: 0.9,
    pitch: 1.0,
    volume: 1.0
};

console.log('🔬 [DEBUG] Test URL:', testUrl);
console.log('🔬 [DEBUG] Test data:', testData);

async function testFetch() {
    try {
        console.log('🔬 [DEBUG] About to make fetch call...');
        
        const response = await fetch(testUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });
        
        console.log('🔬 [DEBUG] Fetch successful! Response:', response);
        console.log('🔬 [DEBUG] Response status:', response.status);
        console.log('🔬 [DEBUG] Response OK:', response.ok);
        
        if (response.ok) {
            const blob = await response.blob();
            console.log('🔬 [DEBUG] Blob size:', blob.size);
        }
        
    } catch (error) {
        console.error('🔬 [DEBUG] Fetch error:', error);
    }
}

// Run the test
testFetch(); testFetch();
