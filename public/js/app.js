/*
  APP.JS
  Version: 23.0.0
  AppName: Multi-Chat [v23.0.0]
  Updated: 5/16/2025 @1:00AM
  Created by Paul Welby
*/

// Import all modules
import {
    PERSISTENT_SESSION,
    MESSAGES,
    MIC_INITIALIZATION_DELAY
} from '/js/config.js';

import { elements, updateStatus, addMessageToChat, updateMetadata, showProcessing, hideProcessing, displayImageResults } from '/js/dom.js';

import {
    resetAudioState,
    stopAudioPlayback,
    queueAudioChunk,
    populateVoiceList,
    getAudioState
} from './modules/audio/audioManager.js';

import {
    initializeSpeechRecognition,
    startListening,
    stopListening,
    toggleSpeechRecognition,
    checkMicrophonePermission,
    getSpeechState
} from './modules/speech/speechRecognition.js';

import { handleYoutubeRequest } from './modules/youtube/youtubeManager.js';
import { handleJokeRequest } from './modules/jokes/jokeManager.js';
import { printRecipe } from './modules/recipe/recipeManager.js';
import { stripMarkdown } from './modules/utils/helpers.js';

// Expose printRecipe to the window
window.printRecipe = printRecipe;

// Application state
const state = {
    isProcessing: false,
    isAISpeaking: false,
    isConversationMode: false,
    conversationHistory: [],
    isSending: false,
    messageCounter: 0,
    selectedModel: 'gpt-4o-mini',
    selectedImage: null,
    inactivityTimer: null,
    lastAudioInput: Date.now(),
    userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    eventSource: null,  // Track EventSource connection
    sseRetryCount: 0,
    sseMaxRetries: 5,
    sseRetryDelay: 1000,
    pendingNameChange: null,
    lastRequestTime: Date.now()
};

// Create structured sessionId
const sessionId = `${PERSISTENT_SESSION.type}-${PERSISTENT_SESSION.id}-${PERSISTENT_SESSION.version}`;

// Make session info globally available
window.sessionId = sessionId;
window.sessionInfo = PERSISTENT_SESSION;

// =====================================================
// App initialization
// =====================================================

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        console.log('[INIT] Starting app initialization...');
        updateStatus('Initializing app...');

        // Initialize components
        console.log('[INIT] Setting up event listeners...');
        setupEventListeners();

        console.log('[INIT] Populating voice list...');
        updateStatus('Loading voices...');
        await populateVoiceList();
        console.log('[INIT] Voice list loaded.');

        console.log('[INIT] Checking microphone permission...');
        updateStatus('Checking microphone permission...');
        await checkMicrophonePermission();
        console.log('[INIT] Microphone permission checked.');

        console.log('[INIT] Loading personal info...');
        updateStatus('Loading personal info...');
        await loadPersonalInfo();
        console.log('[INIT] Personal info loaded.');

        // Set up SSE connection
        console.log('[INIT] Setting up SSE connection...');
        setupSSEConnection();
        console.log('[INIT] SSE connection set up.');

        // Add delay before enabling conversation mode
        setTimeout(() => {
            console.log('[INIT] Enabling conversation mode checkbox and showing default status.');
            elements.conversationModeToggle.disabled = false;
            updateStatus(MESSAGES.STATUS.DEFAULT); // Show instructions, not 'Ready'
        }, MIC_INITIALIZATION_DELAY);

        // Initialize speech recognition with callbacks
        console.log('[INIT] Initializing speech recognition...');
        initializeSpeechRecognition({
            onSpeechResult: handleSpeechResult,
            onListeningStart: () => {
                console.log('Speech recognition started');
                updateStatus(MESSAGES.STATUS.LISTENING);
            },
            onListeningEnd: () => {
                console.log('Speech recognition ended');
                // Do NOT show 'Ready' in the UI
            },
            onError: (error) => {
                console.error('Speech recognition error:', error);
                updateStatus('Speech recognition error. Please try again.');
            }
        });
        console.log('[INIT] Speech recognition initialized.');

        console.log('[INIT] App initialization completed successfully');
    } catch (error) {
        console.error('[INIT] Error during app initialization:', error);
        updateStatus('Initialization error: ' + (error && error.message ? error.message : error));
    }
}

// =====================================================
// Event Listeners
// =====================================================

function setupEventListeners() {
    elements.micButton.addEventListener('click', toggleSpeechRecognition);
    elements.sendButton.addEventListener('click', () => sendMessage());
    elements.userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    elements.imageUploadBtn.addEventListener('click', () => elements.imageInput.click());
    elements.imageInput.addEventListener('change', handleImageUpload);
    elements.modelSelect.addEventListener('change', () => state.selectedModel = this.value);
    elements.conversationModeToggle.addEventListener('change', handleConversationModeToggle);
    elements.stopAudioButton.addEventListener('click', stopAudioPlayback);
    elements.voiceSelect.addEventListener('change', () => localStorage.setItem('selectedVoice', this.value));
    window.addEventListener('beforeunload', cleanup);
}

// =====================================================
// Handlers
// =====================================================

// Handle conversation mode toggle
async function handleConversationModeToggle() {
    state.isConversationMode = this.checked;
    if (state.isConversationMode) {
        const userName = await checkUserName();
        
        state.isProcessing = false;
        state.isSending = false;
        state.isAISpeaking = false;

        resetAudioState();
        startInactivityTimer();
        console.log('Inactivity timer started');
        updateStatus(MESSAGES.STATUS.LISTENING);

        // Update conversation status with the enable message
        if (elements.conversationStatus) {
            elements.conversationStatus.innerHTML = `<span class="conversation-enable-message">${MESSAGES.CONVERSATION.ENABLE}</span>`;
        }

        startListening();
    } else {
        clearInactivityTimer();
        console.log('Inactivity timer cleared');
        updateStatus(MESSAGES.STATUS.DEFAULT);
        stopListening();
        // Clear the conversation status
        if (elements.conversationStatus) {
            elements.conversationStatus.innerHTML = '';
        }
    }
}

// Handle speech recognition results
function handleSpeechResult(event) {
    if (!event.results || !event.results.length) return;

    const result = event.results[event.results.length - 1];
    if (!result.isFinal) return;

    const transcript = result[0].transcript.trim();
    console.log('Speech recognition result:', transcript);

    // Check for exit command first
    if (transcript.toLowerCase() === 'exit') {
        exitConversation();
        return;
    }

    sendMessage(transcript);
}

// Handle image upload
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Clear any existing selected image state
            state.selectedImage = null;

            // Set the new image
            state.selectedImage = e.target.result;

            // Create a new user message with the image
            const messageElement = addMessageToChat('user', '');
            const imageElement = document.createElement('img');
            imageElement.src = state.selectedImage;
            imageElement.classList.add('uploaded-image');
            imageElement.style.cssText = 'max-width: 300px; border-radius: 8px; margin-top: 10px; cursor: pointer;';

            // Add click handler to open image in popup window with proper styling
            imageElement.onclick = function() {
                // Calculate center position
                const width = 700;
                const height = 700;
                const left = (window.screen.width - width) / 2;
                const top = (window.screen.height - height) / 2;

                // Add position parameters to window.open
                const popup = window.open('', 'Image Preview',
                    `width=${width},height=${height},top=${top},left=${left}`);
                popup.document.write(`
                    <html>
                        <head>
                            <title>Image Preview</title>
                            <style>
                                body {
                                    margin: 0;
                                    padding: 20px;
                                    background: #000;
                                    display: flex;
                                    flex-direction: column;
                                    align-items: center;
                                }
                                .close-btn {
                                    position: absolute;
                                    top: 10px;
                                    right: 10px;
                                    color: white;
                                    background: rgba(0,0,0,0.5);
                                    border: none;
                                    padding: 5px 10px;
                                    cursor: pointer;
                                    font-size: 18px;
                                    border-radius: 5px;
                                }
                                .close-btn:hover {
                                    background: rgba(0,0,0,0.8);
                                }
                                img {
                                    max-width: 650px;
                                    max-height: 700px;
                                    object-fit: contain;
                                    margin-top: 20px;
                                    background-repeat: no-repeat;
                                    background-position: center;
                                    display: block;
                                }
                            </style>
                        </head>
                        <body>
                            <button class="close-btn" onclick="window.close()">✕</button>
                            <img src="${this.src}" alt="Preview">
                        </body>
                    </html>
                `);
            };

            messageElement.querySelector('.message-content').appendChild(imageElement);

            // Focus input for description
            elements.userInput.focus();
            elements.userInput.placeholder = "Add a description or ask about the image...";
        };
        reader.readAsDataURL(file);
    }
}

// =====================================================
// Message Handling
// =====================================================

// Send message function
async function sendMessage(message, isGreeting = false) {
    try {
        if (state.isSending || state.isProcessing) return;
        state.isSending = true;
        state.isProcessing = true;
        showProcessing();

        const messageText = message || elements.userInput.value.trim();
        const startTime = Date.now(); // Track when the request started

        // Handle YouTube requests
        if (messageText.toLowerCase().includes('youtube')) {
            await handleYoutubeRequest(messageText);
            state.isSending = false;
            state.isProcessing = false;
            elements.userInput.value = '';
            hideProcessing();
            return;
        }

        // Handle joke requests
        if (await handleJokeRequest(messageText)) {
            state.isSending = false;
            state.isProcessing = false;
            elements.userInput.value = '';
            hideProcessing();
            return;
        }

        // Add user message to chat
        addMessageToChat('user', messageText);
        elements.userInput.value = '';

        // Determine message type for the initial assistant bubble
        let initialType = null;
        if (messageText.trim().toLowerCase() === 'exit') {
            initialType = 'exit';
        } else if (messageText.trim().toLowerCase() === 'hello' || messageText.trim().toLowerCase().includes('good morning') || messageText.trim().toLowerCase().includes('good afternoon') || messageText.trim().toLowerCase().includes('good evening')) {
            initialType = 'greeting';
        } else {
            initialType = 'general';
        }
        // Only pass type for greeting or exit, not for general
        let aiMessageElement;
        if (initialType === 'greeting') {
            aiMessageElement = addMessageToChat('assistant', '', { type: 'greeting' });
        } else if (initialType === 'exit') {
            aiMessageElement = addMessageToChat('assistant', '', { type: 'exit' });
        } else {
            aiMessageElement = addMessageToChat('assistant', '');
        }
        let responseText = '';
        let isFirstChunk = true;
        let audioQueue = [];

        // Close any previous EventSource
        if (state.eventSource) {
            state.eventSource.close();
        }
        state.eventSource = new EventSource(`/api/chat?sessionId=${window.sessionId}&message=${encodeURIComponent(messageText)}&model=${encodeURIComponent(state.selectedModel)}`);

        state.eventSource.onmessage = async function(event) {
            try {
                const data = JSON.parse(event.data);

                // Handle completion signal
                if (data.done || data.complete) {
                    state.isProcessing = false;
                    state.isSending = false;
                    state.eventSource.close();
                    state.eventSource = null;
                    hideProcessing();
                    // Play any remaining audio in the queue
                    for (const chunk of audioQueue) {
                        await queueAudioChunk(chunk);
                    }
                    audioQueue = [];
                    // Ensure mic is re-activated if conversation mode is still enabled
                    if (state.isConversationMode && !state.isAISpeaking) {
                        startListening();
                    }
                    // --- IMAGE TRIGGER LOGIC (USER MESSAGE, ONLY ONCE) ---
                    if (/\b(more|info|detail|image|images|picture|pictures|photo|photos)\b/i.test(messageText)) {
                        let searchQuery = messageText
                          .replace(/\b(more|info|detail|image|images|picture|pictures|photo|photos)\b/gi, '')
                          .replace(/\band provide images\b/gi, '')
                          .replace(/\b(show|give|find|display|with|of|about|tell me|please|can you|could you|would you|show me|provide|and)\b/gi, '')
                          .replace(/[?.!]/g, '')
                          .trim();
                        // Capitalize each word for the heading
                        const headingQuery = searchQuery.replace(/\b\w/g, c => c.toUpperCase());
                        if (searchQuery.length > 0) {
                            try {
                                const imageResponse = await fetch(`/api/google-image-search?q=${encodeURIComponent(searchQuery)}`);
                                if (imageResponse.ok) {
                                    const imageData = await imageResponse.json();
                                    if (imageData.images && imageData.images.length > 0) {
                                        displayImageResults(imageData.images, aiMessageElement, headingQuery);
                                    }
                                }
                            } catch (error) {
                                console.error('Error fetching images (user message trigger):', error);
                            }
                        }
                    }
                    return;
                }

                if (data.response) {
                    responseText += data.response;
                    const cleanText = stripMarkdown(responseText);
                    // Update the message content incrementally
                    const contentDiv = aiMessageElement.querySelector('.message-content');
                    if (contentDiv) {
                        contentDiv.innerHTML = cleanText.replace(/\n/g, '<br>');
                        // Scroll chat to bottom
                        const chatContainer = document.getElementById('chat-container');
                        if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
                    }
                    // Only update metadata if not greeting or exit
                    const type = data.messageType || null;
                    if (type !== 'greeting' && type !== 'exit' && aiMessageElement) {
                        updateMetadata(aiMessageElement, {
                            model: data.model || state.selectedModel,
                            startTime,
                            tokenCount: data.tokenCount
                        });
                    }
                    if (isFirstChunk) {
                        hideProcessing();
                        isFirstChunk = false;
                    }
                    // Queue and play audio for each chunk as it arrives
                    audioQueue.push(stripMarkdown(data.response));
                    if (!state.isAISpeaking) {
                        state.isAISpeaking = true;
                        while (audioQueue.length > 0) {
                            const chunk = audioQueue.shift();
                            await queueAudioChunk(chunk);
                        }
                        state.isAISpeaking = false;
                    }
                }
            } catch (err) {
                // Ignore parse errors for incomplete chunks
            }
        };

        state.eventSource.onerror = function(error) {
            console.error('SSE Connection error:', error);
            if (state.eventSource) {
                state.eventSource.close();
                state.eventSource = null;
            }
            state.isProcessing = false;
            state.isSending = false;
            hideProcessing();
            updateStatus('Connection error. Please try again.');
        };

    } catch (error) {
        console.error('Error sending message:', error);
    } finally {
        // Do not reset isSending/isProcessing here; handled in SSE completion
        if (state.isConversationMode && !state.isAISpeaking) {
            startListening();
        }
    }
}

// Exit conversation function
async function exitConversation(isTimeout = false) {
    try {
        // Stop listening first
        stopListening();

        // Add user's exit message
        addMessageToChat('user', 'exit');

        // Create exit message with special styling
        const exitMessage = MESSAGES.CLOSINGS.EXIT;
        addMessageToChat('assistant', exitMessage, { type: 'exit' });

        // Queue the exit message audio
        await queueAudioChunk(exitMessage);

        // Reset conversation mode and update UI
        state.isConversationMode = false;
        elements.conversationModeToggle.checked = false;
        elements.conversationStatus.innerHTML = '';
        updateStatus(MESSAGES.STATUS.DEFAULT);

        // Clear any pending timers
        if (state.inactivityTimer) {
            clearTimeout(state.inactivityTimer);
            state.inactivityTimer = null;
        }

    } catch (error) {
        console.error('Error in exitConversation:', error);
        addMessageToChat('system', MESSAGES.ERRORS.EXIT);
    } finally {
        state.isAISpeaking = false;
        elements.stopAudioButton.style.display = 'none';
    }
}

// =====================================================
// Timer Functions
// =====================================================

// Inactivity timer function
function startInactivityTimer() {
    console.log('Starting inactivity timer for 10 minutes');

    // Clear any existing timer
    if (state.inactivityTimer) {
        clearTimeout(state.inactivityTimer);
    }

    // Set new timer
    state.inactivityTimer = setTimeout(async () => {
        console.log('Inactivity timeout reached');

        // Stop listening
        stopListening();

        // Create timeout message
        const timeoutMessage = MESSAGES.CLOSINGS.TIMEOUT(10);
        addMessageToChat('assistant', timeoutMessage, { type: 'exit' });

        // Use sendMessage for audio playback of timeout/exit
        await queueAudioChunk(timeoutMessage);

        // Reset conversation mode
        state.isConversationMode = false;
        elements.conversationModeToggle.checked = false;
        elements.conversationStatus.innerHTML = '';
        updateStatus(MESSAGES.STATUS.DEFAULT);

        // Clear the timer reference
        state.inactivityTimer = null;

    }, 10 * 60 * 1000); // 10 minutes
}

// Clear inactivity timer function
function clearInactivityTimer() {
    console.log('Clearing inactivity timer');
    if (state.inactivityTimer) {
        clearTimeout(state.inactivityTimer);
        state.inactivityTimer = null;
    }
}

// =====================================================
// SSE Connection
// =====================================================

// Setup SSE connection
function setupSSEConnection() {
    // No-op or use a different endpoint if you need persistent SSE for heartbeats
    // If you need heartbeats, create a new /api/heartbeat endpoint on the backend
    // and connect to it here instead.
    // For now, do nothing to avoid 400 errors from /api/chat
}

// =====================================================
// User Info Handling
// =====================================================

// Load personal info function
async function loadPersonalInfo() {
    try {
        const response = await fetch(`/api/personal-info/all?sessionId=${window.sessionId}`);
        if (!response.ok) throw new Error('Failed to load personal info');

        const data = await response.json();
        if (data.personalInfo) {
            // Store each piece of info in localStorage
            Object.entries(data.personalInfo).forEach(([key, value]) => {
                if (value) {
                    localStorage.setItem(`user_${key}`, value);
                    console.log(`Loaded ${key} from MongoDB to localStorage`);
                }
            });
        }
    } catch (error) {
        console.error('Error loading personal info:', error);
    }
}

// Check user name function
async function checkUserName() {
    try {
        // Try localStorage first
        const cachedName = localStorage.getItem('userName');
        if (cachedName) {
            return cachedName;
        }

        // If not in localStorage, try MongoDB
        const response = await fetch(`/api/personal-info/name?sessionId=${window.sessionId}`);
        if (!response.ok) throw new Error('Failed to fetch name');
        
        const data = await response.json();
        if (data.value) {
            localStorage.setItem('userName', data.value);
            return data.value;
        }

        return null;
    } catch (error) {
        console.error('Error checking user name:', error);
        return null;
    }
}

// =====================================================
// Cleanup Function
// =====================================================

// Cleanup function for page unload
function cleanup() {
    stopListening();
    if (state.eventSource) {
        state.eventSource.close();
        state.eventSource = null;
    }
} 