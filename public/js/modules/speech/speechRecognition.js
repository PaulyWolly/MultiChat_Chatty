/*
  SPEECH_RECOGNITION.js
  Version: 22.0.2
  AppName: Multi-Chat [v22.0.2]
  Updated: May 13, 2025 @4:45PM
  Created by Paul Welby
*/

import { SPEECH_CONFIG, MESSAGES } from '/js/config.js';
import { elements, updateStatus } from '/js/dom.js';

// Speech recognition state
const state = {
    recognition: null,
    isListening: false,
    onSpeechResultCallback: null,
    onListeningStartCallback: null,
    onListeningEndCallback: null,
    onErrorCallback: null
};

/**
 * Initialize speech recognition
 */
export function initializeSpeechRecognition(callbacks = {}) {
    if (!('webkitSpeechRecognition' in window)) {
        console.error('Speech recognition not supported');
        return false;
    }

    try {
        if (state.recognition) {
            // Clean up existing recognition instance
            try {
                state.recognition.stop();
            } catch (e) {
                console.log('Error stopping existing recognition instance:', e);
            }
        }

        state.recognition = new webkitSpeechRecognition();
        state.recognition.continuous = SPEECH_CONFIG.continuous;
        state.recognition.interimResults = SPEECH_CONFIG.interimResults;
        state.recognition.lang = SPEECH_CONFIG.language;

        // Set callbacks
        state.onSpeechResultCallback = callbacks.onSpeechResult || null;
        state.onListeningStartCallback = callbacks.onListeningStart || null;
        state.onListeningEndCallback = callbacks.onListeningEnd || null;
        state.onErrorCallback = callbacks.onError || null;

        // Set internal handlers
        state.recognition.onstart = () => {
            state.isListening = true;
            if (elements.micButton) {
                elements.micButton.textContent = '🔴';
            }
            updateStatus(MESSAGES.STATUS.LISTENING);
            
            if (state.onListeningStartCallback) {
                state.onListeningStartCallback();
            }
        };

        state.recognition.onend = () => {
            state.isListening = false;
            if (elements.micButton) {
                elements.micButton.textContent = '🎤';
            }
            
            if (state.onListeningEndCallback) {
                state.onListeningEndCallback();
            }
        };

        state.recognition.onerror = (event) => {
            console.error('Recognition error:', event.error);

            // Only treat real errors as errors
            if (event.error === 'no-speech' || event.error === 'no-input') {
                // Just restart listening if conversation mode is enabled
                state.isListening = false;
                if (elements.micButton) {
                    elements.micButton.textContent = '🎤';
                }
                setTimeout(() => {
                    const conversationModeToggle = document.getElementById('conversation-mode');
                    const isConversationMode = conversationModeToggle && conversationModeToggle.checked;
                    if (isConversationMode) {
                        startListening();
                    }
                }, 300);
                return;
            }

            // For all other errors, handle as before
            state.isListening = false;
            if (elements.micButton) {
                elements.micButton.textContent = '🎤';
            }
            if (state.onErrorCallback) {
                state.onErrorCallback(event);
            }
        };

        state.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Heard:', transcript);
            
            if (state.onSpeechResultCallback) {
                state.onSpeechResultCallback(event);
            } else {
                handleSpeechResult(event);
            }
        };

        return true;
    } catch (error) {
        console.error('Error initializing speech recognition:', error);
        return false;
    }
}

/**
 * Handle speech recognition result
 */
export function handleSpeechResult(event) {
    if (!event.results || !event.results.length) return;

    const result = event.results[event.results.length - 1];
    if (!result.isFinal) return;

    const transcript = result[0].transcript.trim();
    const confidence = result[0].confidence;
    console.log('Speech recognition result:', {
        transcript,
        confidence,
        timestamp: new Date().toISOString()
    });

    // Return the transcript for further processing
    return transcript;
}

/**
 * Start speech recognition
 */
export function startListening() {
    console.log('Starting listening. Current state:', {
        isListening: state.isListening
    });

    // Ensure recognition is initialized
    if (!state.recognition) {
        if (!initializeSpeechRecognition()) {
            updateStatus('Speech recognition not available');
            return false;
        }
    }

    if (state.isListening) {
        console.log('Already listening, skipping start');
        return true;
    }

    try {
        console.log('Attempting to start recognition');
        state.recognition.start();
        return true;
    } catch (error) {
        console.error('Failed to start recognition:', error);
        state.isListening = false;
        if (elements.micButton) {
            elements.micButton.textContent = '🎤';
        }
        updateStatus('Error starting speech recognition');
        return false;
    }
}

/**
 * Stop speech recognition
 */
export function stopListening() {
    console.log('Stopping listening');

    if (!state.recognition) {
        console.log('No recognition instance to stop');
        return;
    }

    if (!state.isListening) {
        console.log('Not listening, nothing to stop');
        return;
    }

    try {
        state.recognition.stop();
        state.isListening = false;
        if (elements.micButton) {
            elements.micButton.textContent = '🎤';
        }
    } catch (error) {
        console.error('Error stopping recognition:', error);
    }
}

/**
 * Toggle speech recognition on/off
 */
export function toggleSpeechRecognition() {
    console.log('toggleSpeechRecognition called, isListening:', state.isListening);
    if (state.isListening) {
        stopListening();
        return false;
    } else {
        return startListening();
    }
}

/**
 * Check microphone permission
 */
export async function checkMicrophonePermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (err) {
        console.error('Microphone permission denied:', err);
        updateStatus(MESSAGES.ERRORS.MIC_PERMISSION);
        return false;
    }
}

/**
 * Request microphone permission explicitly
 */
export async function requestMicrophonePermission() {
    try {
        const result = await navigator.permissions.query({ name: 'microphone' });
        
        if (result.state === 'denied') {
            updateStatus(MESSAGES.ERRORS.MIC_PERMISSION);
            throw new Error('Microphone permission denied');
        }

        if (result.state === 'prompt' || result.state === 'granted') {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true,
                video: false
            });
            stream.getTracks().forEach(track => track.stop());
        }

        return true;
    } catch (error) {
        console.error('Microphone permission error:', error);
        updateStatus(MESSAGES.ERRORS.MIC_PERMISSION);
        return false;
    }
}

/**
 * Get current speech recognition state
 */
export function getSpeechState() {
    return {
        isListening: state.isListening,
        hasRecognition: !!state.recognition
    };
}

/**
 * Set speech recognition callback functions
 */
export function setSpeechCallbacks(callbacks) {
    if (callbacks.onSpeechResult) {
        state.onSpeechResultCallback = callbacks.onSpeechResult;
    }
    if (callbacks.onListeningStart) {
        state.onListeningStartCallback = callbacks.onListeningStart;
    }
    if (callbacks.onListeningEnd) {
        state.onListeningEndCallback = callbacks.onListeningEnd;
    }
    if (callbacks.onError) {
        state.onErrorCallback = callbacks.onError;
    }
} 