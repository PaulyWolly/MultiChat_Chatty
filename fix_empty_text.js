// Fix for empty text in TTS requests
// This should replace the section after "const text = state.audioQueue[0];"

console.log('🔊 [AUDIO] About to fetch TTS for:', text);
console.log('🔊 [DEBUG] Raw text value:', JSON.stringify(text));
console.log('🔊 [DEBUG] Text type:', typeof text);
console.log('🔊 [DEBUG] Text length:', text ? text.length : 'NO LENGTH');

// Add safety check for empty text
if (!text || text.trim() === '') {
    console.error('🔊 [ERROR] Empty text detected! Queue:', state.audioQueue);
    console.error('🔊 [ERROR] Skipping empty audio chunk');
    state.audioQueue.shift(); // Remove empty chunk
    state.isPlaying = false;
    if (state.audioQueue.length > 0) {
        setTimeout(() => playNextInQueue(), 100); // Try next chunk
    }
    return;
}

console.log('🔊 [AUDIO] TTS API URL:', AUDIO_CONFIG.apiUrl);
console.log('🔊 [AUDIO] About to call fetch...');

const payload = {
    text: text.trim(),
    voice: AUDIO_CONFIG.defaultVoice,
    rate: AUDIO_CONFIG.rate,
    pitch: AUDIO_CONFIG.pitch,
    volume: AUDIO_CONFIG.volume
};

console.log('🔊 [DEBUG] Sending payload:', JSON.stringify(payload)); 