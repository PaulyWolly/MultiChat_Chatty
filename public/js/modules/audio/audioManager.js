/*
  AUDIO_MANAGER.js
  Version: 23.0.0
  AppName: Multi-Chat [v23.0.0]
  Updated: 5/16/2025 @1:00AM
  Created by Paul Welby
*/

import { AUDIO_CONFIG } from '/js/config.js';
import { fetchWithRetry, fadeAudio, cleanup, chunkText } from '../utils/helpers.js';
import { updateStatus } from '/js/dom.js';

// Audio state
const audioState = {
    currentAudio: null,
    isPlaying: false,
    isAISpeaking: false,
    audioQueue: [],
    stopRequested: false
};

/**
 * Reset audio state to defaults
 */
export function resetAudioState() {
    console.log('Resetting audio state. Current state:', {
        stopRequested: audioState.stopRequested,
        isPlaying: audioState.isPlaying,
        isAISpeaking: audioState.isAISpeaking,
        audioQueueLength: audioState.audioQueue.length
    });

    // Stop any current audio with fade out
    if (audioState.currentAudio) {
        fadeAudio(audioState.currentAudio, AUDIO_CONFIG.volume, 0, 200).then(() => {
            audioState.currentAudio.pause();
            audioState.currentAudio = null;
        });
    }

    audioState.stopRequested = false;
    audioState.isPlaying = false;
    audioState.isAISpeaking = false;
    audioState.audioQueue = [];

    console.log('Audio state reset. New state:', {
        stopRequested: audioState.stopRequested,
        isPlaying: audioState.isPlaying,
        isAISpeaking: audioState.isAISpeaking,
        audioQueueLength: audioState.audioQueue.length
    });
}

/**
 * Stop audio playback
 */
export function stopAudioPlayback() {
    console.log('[AUDIO] stopAudioPlayback called. State before:', {
        stopRequested: audioState.stopRequested,
        isPlaying: audioState.isPlaying,
        isAISpeaking: audioState.isAISpeaking,
        audioQueue: [...audioState.audioQueue],
        currentAudio: audioState.currentAudio
    });
    
    audioState.stopRequested = true;
    audioState.audioQueue = [];
    
    if (audioState.currentAudio) {
        // Fade out before stopping
        fadeAudio(audioState.currentAudio, AUDIO_CONFIG.volume, 0, 200).then(() => {
            audioState.currentAudio.pause();
            audioState.currentAudio.currentTime = 0;
            audioState.currentAudio = null;
            console.log('[AUDIO] Audio faded out and stopped.');
        });
    }

    audioState.isPlaying = false;
    audioState.isAISpeaking = false;
    if (window.isJokeListAudioPlaying) window.isJokeListAudioPlaying = false;
    const stopAudioButton = document.getElementById('stop-audio-button');
    if (stopAudioButton) stopAudioButton.style.display = 'none';
    // Import updateStatus and startListening dynamically to avoid circular deps
    import('/js/dom.js').then(({ updateStatus }) => {
        updateStatus('Listening...');
    });
    import('../speech/speechRecognition.js').then(({ startListening, stopListening }) => {
        // Only start listening if conversation mode is enabled and no audio is playing or queued
        const conversationModeToggle = document.getElementById('conversation-mode');
        const isConversationMode = conversationModeToggle && conversationModeToggle.checked;
        const isAudioActive = audioState.isPlaying || audioState.isAISpeaking || (audioState.audioQueue && audioState.audioQueue.length > 0);
        if (isConversationMode && !isAudioActive) {
            stopListening(); // Always stop first to reset state
            setTimeout(() => {
                startListening();
            }, 100); // Small delay to allow reset
        }
    });

    console.log('[AUDIO] stopAudioPlayback complete. State after:', {
        stopRequested: audioState.stopRequested,
        isPlaying: audioState.isPlaying,
        isAISpeaking: audioState.isAISpeaking,
        audioQueue: [...audioState.audioQueue],
        currentAudio: audioState.currentAudio
    });
    
    return new Promise(resolve => {
        setTimeout(() => {
            audioState.stopRequested = false;
            resolve();
        }, 100);
    });
}

/**
 * Queue audio chunk for playback
 */
export async function queueAudioChunk(text) {
    console.log('[AUDIO] queueAudioChunk called with:', text);
    if (!text) return;
    
    // Don't reset the queue, just update state flags
    audioState.stopRequested = false;
    audioState.isAISpeaking = true;
    // For 'list my jokes', only show button/status ONCE at the start
    if (window.isJokeListAudioPlaying === "list-my-jokes" && audioState.audioQueue.length === 0) {
        import('/js/dom.js').then(({ updateStatus }) => {
            updateStatus('AI is speaking...');
            const stopAudioButton = document.getElementById('stop-audio-button');
            if (stopAudioButton) stopAudioButton.style.display = 'inline-block';
        });
    } else if (window.isJokeListAudioPlaying !== "list-my-jokes") {
        import('/js/dom.js').then(({ updateStatus }) => {
            updateStatus('AI is speaking...');
            const stopAudioButton = document.getElementById('stop-audio-button');
            if (stopAudioButton) stopAudioButton.style.display = 'inline-block';
        });
    }
    import('../speech/speechRecognition.js').then(({ stopListening }) => {
        stopListening();
    });

    // For greetings, don't split into sentences
    if (text.toLowerCase().includes('good morning') || 
        text.toLowerCase().includes('good afternoon') || 
        text.toLowerCase().includes('good evening') ||
        text.toLowerCase().includes('good night')) {
        audioState.audioQueue = audioState.audioQueue.concat([text]);
        console.log('[AUDIO] Queued greeting:', text);
    } else {
        // First split into major sections (for recipes, lists, etc.)
        const sections = text.split(/(?=Ingredients:|Instructions:)/);
        let chunks = [];

        sections.forEach(section => {
            // Split each section into sentences
            const sentences = section
                .replace(/([.!?])\s+/g, '$1|')  // Mark sentence boundaries
                .split('|')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            // Add sentences to chunks array
            chunks = chunks.concat(sentences);
        });

        // Append new chunks to existing queue
        audioState.audioQueue = audioState.audioQueue.concat(chunks);
        console.log('[AUDIO] Queued chunks:', audioState.audioQueue);
    }
    
    console.log('[AUDIO] queueAudioChunk exit. Queue state:', audioState.audioQueue);
    
    if (!audioState.isPlaying && !audioState.stopRequested) {
        await playNextInQueue();
    }
}

/**
 * Play the next chunk in the audio queue
 */
export async function playNextInQueue() {
    console.log('[AUDIO] playNextInQueue called. Queue:', audioState.audioQueue, 
                'isPlaying:', audioState.isPlaying, 
                'stopRequested:', audioState.stopRequested);
                
    if (!audioState.audioQueue.length || audioState.isPlaying || audioState.stopRequested) {
        if (!audioState.audioQueue.length || audioState.stopRequested) {
            console.log('[AUDIO] Ready');
            audioState.isAISpeaking = false;
        }
        console.log('[AUDIO] playNextInQueue exit early.');
        return;
    }

    try {
        audioState.isPlaying = true;
        audioState.isAISpeaking = true;
        // For 'list my jokes', do NOT toggle the button/status between chunks
        if (window.isJokeListAudioPlaying !== "list-my-jokes") {
            import('/js/dom.js').then(({ updateStatus }) => {
                updateStatus('AI is speaking...');
                const stopAudioButton = document.getElementById('stop-audio-button');
                if (stopAudioButton) stopAudioButton.style.display = 'inline-block';
            });
        }

        const text = audioState.audioQueue[0];
        console.log('[AUDIO] Playing chunk:', text);

        const response = await fetchWithRetry(AUDIO_CONFIG.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                voice: AUDIO_CONFIG.defaultVoice,
                rate: AUDIO_CONFIG.rate,
                pitch: AUDIO_CONFIG.pitch,
                volume: AUDIO_CONFIG.volume
            })
        });

        if (!response.ok) throw new Error(`TTS API error: ${response.status}`);
        
        const audioBlob = await response.blob();
        if (audioBlob.size === 0) throw new Error('Empty audio response');

        if (audioState.currentAudio) {
            audioState.currentAudio.pause();
            audioState.currentAudio = null;
        }
        
        const audioUrl = URL.createObjectURL(audioBlob);
        audioState.currentAudio = new Audio(audioUrl);
        audioState.currentAudio.volume = AUDIO_CONFIG.volume;

        // Wait for current chunk to finish before moving to next
        await new Promise((resolve, reject) => {
            audioState.currentAudio.addEventListener('canplaythrough', () => {
                console.log('AUDIO: canplaythrough');
                setTimeout(() => {
                    audioState.currentAudio.play().then(() => {
                        console.log('AUDIO: play started');
                        audioState.currentAudio.onended = () => {
                            console.log('AUDIO: ended');
                            resolve();
                        };
                    }).catch(reject);
                }, 600); // was 200 changed to 400ms delay before playing
            }, { once: true });
            audioState.currentAudio.onerror = reject;
        });

        URL.revokeObjectURL(audioUrl);
        audioState.audioQueue.shift();  // Remove played chunk
        audioState.isPlaying = false;
        console.log('[AUDIO] Finished playing chunk. Queue now:', audioState.audioQueue);

        // Process next chunk if available
        if (audioState.audioQueue.length > 0 && !audioState.stopRequested) {
            // For 'list my jokes', do NOT toggle the button/status here
            setTimeout(() => playNextInQueue(), AUDIO_CONFIG.pauseDuration);
        } else {
            audioState.isAISpeaking = false;
            console.log('[AUDIO] Ready');
            // Only now, when all audio is done, switch to 'Listening...' mode
            if (window.isJokeListAudioPlaying === "list-my-jokes") {
                window.isJokeListAudioPlaying = false;
                const stopAudioButton = document.getElementById('stop-audio-button');
                if (stopAudioButton) stopAudioButton.style.display = 'none';
                import('/js/dom.js').then(({ updateStatus }) => {
                    updateStatus('Listening...');
                });
            } else {
                const stopAudioButton = document.getElementById('stop-audio-button');
                if (stopAudioButton) stopAudioButton.style.display = 'none';
                import('/js/dom.js').then(({ updateStatus }) => {
                    updateStatus('Listening...');
                });
            }
            // ALWAYS: After any audio, if Conversation Mode is enabled, restart mic
            import('../speech/speechRecognition.js').then(({ startListening, stopListening }) => {
                const conversationModeToggle = document.getElementById('conversation-mode');
                const isConversationMode = conversationModeToggle && conversationModeToggle.checked;
                if (isConversationMode) {
                    stopListening(); // Always stop first to reset state
                    setTimeout(() => {
                        startListening();
                    }, 100); // Small delay to allow reset
                }
            });
        }

    } catch (error) {
        console.error('[AUDIO] Audio playback error:', error);
        audioState.isPlaying = false;
        audioState.isAISpeaking = false;
        console.log('[AUDIO] Ready');
        
        if (audioState.audioQueue.length > 0) {
            setTimeout(() => playNextInQueue(), AUDIO_CONFIG.retryDelay);
        }
    }
    console.log('[AUDIO] playNextInQueue exit.');
}

/**
 * Prepare audio without playing it
 */
export async function prepareAudio(text) {
    const sanitizedText = text
        .replace(/[^\w\s.,!?;:'"()-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!sanitizedText) return null;

    // Use the correct API URL
    const response = await fetchWithRetry(AUDIO_CONFIG.apiUrl, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'audio/wav'
        },
        body: JSON.stringify({
            text: sanitizedText,
            voice: AUDIO_CONFIG.defaultVoice,
            rate: AUDIO_CONFIG.rate,
            pitch: AUDIO_CONFIG.pitch,
            volume: AUDIO_CONFIG.volume
        })
    });

    if (!response.ok) {
        console.error(`TTS API error: ${response.status}`);
        throw new Error(`TTS API error: ${response.status}`);
    }
    
    const audioBlob = await response.blob();
    if (audioBlob.size === 0) throw new Error('Empty audio response');

    const audio = new Audio(URL.createObjectURL(audioBlob));
    await new Promise(resolve => audio.addEventListener('canplaythrough', resolve, { once: true }));
    
    return audio;
}

/**
 * Populate the voice selection dropdown
 */
export async function populateVoiceList() {
    try {
        const response = await fetchWithRetry(`${AUDIO_CONFIG.apiUrl.replace('/tts', '/voices')}`, {});
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const voices = await response.json();

        if (!Array.isArray(voices) || voices.length === 0) {
            throw new Error('No voices received or invalid data format');
        }

        const voiceSelect = document.getElementById('voice-select');
        voiceSelect.innerHTML = '<option value="">Default Voice</option>';
        let defaultVoice = null;

        const filteredVoices = voices.filter(voice => voice.Locale.startsWith('en-'));

        if (filteredVoices.length === 0) {
            throw new Error('No English voices found');
        }

        filteredVoices
            .sort((a, b) => a.LocaleName.localeCompare(b.LocaleName))
            .forEach((voice) => {
                const option = document.createElement('option');
                option.value = voice.ShortName;
                option.textContent = `${voice.LocaleName} - ${voice.DisplayName} (${voice.Gender}, ${voice.VoiceType})`;
                voiceSelect.appendChild(option);

                if (voice.DisplayName === 'Andrew' &&
                    voice.Locale.startsWith('en-US') &&
                    voice.VoiceType === 'Neural') {
                    defaultVoice = voice.ShortName;
                }
            });

        if (defaultVoice) {
            voiceSelect.value = defaultVoice;
            localStorage.setItem('selectedVoice', defaultVoice);
        }
    } catch (error) {
        console.error('Error fetching voices:', error);
        updateStatus('Failed to load voice options: ' + error.message);
        document.getElementById('voice-select').innerHTML = '<option value="">Error loading voices</option>';
    }
}

/**
 * Get the current state of the audio system
 */
export function getAudioState() {
    return {
        ...audioState
    };
}

/**
 * Set the audio state
 */
export function setAudioState(newState) {
    Object.assign(audioState, newState);
} 