/*
  CONFIG.js
  Version: 23.0.0
  AppName: Multi-Chat [v23.0.0]
  Updated: 5/16/2025 @1:00AM
  Created by Paul Welby
*/

// =====================================================
// CONSTANTS AND CONFIGURATION
// =====================================================

// SERVER URL
export const SERVER_URL = 'http://localhost:5210';

// Time constants
export const INTERVAL = 10;  // Set timeout duration in minutes
export const CONVERSATION_INACTIVITY_TIMEOUT = INTERVAL * 60 * 1000;  // Convert minutes to milliseconds

// Memory categories
export const MEMORY_CATEGORIES = {
    event: /(?:tomorrow|next|on|at)\s+(.+)/i,
    preference: /(?:like|love|hate|prefer)\s+(.+)/i,
    fact: /(?:is|are|was|were)\s+(.+)/i,
    location: /(?:at|in|near|around)\s+(.+)/i,
    time: /(?:at|every|during)\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i
};

// Add keyword patterns at the top with other constants
export const MEMORY_KEYWORDS = {
    'phrase that pays': {
        store: /(?:the )?phrase that pays (?:is|=) (.+)/i,
        retrieve: /what(?:'s| is)(?: the)? phrase that pays/i
    },
    'passphrase': {
        store: /(?:the )?passphrase (?:is|=) (.+)/i,
        retrieve: /what(?:'s| is)(?: the)? passphrase/i
    },
    'secret word': {
        store: /(?:the )?secret word (?:is|=) (.+)/i,
        retrieve: /what(?:'s| is)(?: the)? secret word/i
    },
    'favorite': {
        store: /(?:my )?favorite (\w+) (?:is|=) (.+)/i,
        retrieve: /what(?:'s| is) (?:my )?favorite (\w+)/i,
    },
    'remember': {
        store: /^remember (?:that )?([^(is)].+)/i,  // Don't match if contains "is"
        retrieve: /what (?:did I|about|was) (.+)/i
    }
};

// Add at the top with other constants
export const MIC_INITIALIZATION_DELAY = 4000;  // 4 seconds delay

// Add the MESSAGES constant
export const MESSAGES = {
    STATUS: {
        DEFAULT: "Click the Conversation Mode checkbox, or press the microphone button \n\n...to enable conversations, or enter a message and press Send",
        LISTENING: "Listening...",
        SPEAKING: "AI is speaking...",
        PROCESSING: "Processing...",
        READY: "Ready",
        ERROR: "Error occurred. Please refresh the page if issues persist.",
        INITIALIZING: "Initializing app...",
        VIDEO_PLAYING: 'Video playing...'
    },
    CONVERSATION: {
        ENABLE: "Conversation Mode is now enabled. You can speak freely \n ...and say 'exit' when you want to end the conversation.",
        DISABLE: "Conversation Mode has been disabled. You can still type messages or click the microphone button for single responses.",
        EXIT: 'Conversation ended'
    },
    CLOSINGS: {
        EXIT: "Okay. Bye for now. We'll chat later!",
        TIMEOUT: (minutes) => `I haven't heard anything for ${minutes} minutes, so I'll end our conversation now. Feel free to restart Conversation Mode when you'd like to chat again!`
    },
    ERRORS: {
        INIT: "Error initializing app. Please refresh the page.",
        MIC_PERMISSION: "Microphone permission denied. Please enable it in your browser settings.",
        CONNECTION: "Connection error. Please refresh the page.",
        EXIT: "Error occurred during exit. Please refresh the page if issues persist."
    }
};

// Add at the top with other constants
export const AUDIO_CONFIG = {
    minChunkLength: 10,
    maxChunkLength: 150,
    pauseDuration: 400,
    maxRetries: 3,
    retryDelay: 1000,
    defaultVoice: 'en-US-AndrewNeural',
    rate: 0.9,
    pitch: 1.0,
    volume: 1.0,  // Fixed full volume
    apiUrl: `${SERVER_URL}/api/tts`
};

// Add this at the top with other constants
export const SPEECH_CONFIG = {
    retryDelay: 1000,
    maxRetries: 3,
    initDelay: 500,
    silenceTimeout: 1500,    // Wait 1.5s of silence before processing
    continuous: true,        // Keep recognition running
    interimResults: true,    // Get interim results
    language: 'en-US'
};

// Ensure the default system prompt is loaded
export const SYSTEM_PROMPT = `You are a helpful assistant with full image search capabilities.

REGARDING GENERAL QUERIES:
1. ALWAYS respond with a polite and constructive response.
2. ALWAYS provide helpful and accurate information.
3. ALWAYS keep responses concise and relevant.
4. NEVER use markdown symbols like #, *,**, ***, or _.
5. For recipes and lists:
    - Use plain numbers and letters (1., 2., 3., etc.)
    - Write ingredient lists and steps without special formatting
    - Present information in clear, simple text format
    - ALWAYS format recipes exactly like this:
        RECIPE NAME IN CAPS ONLY

        Here is a delicious recipe for [recipe name].
        A brief description of the recipe.

        Ingredients:
        1. First ingredient with exact measurement
        2. Second ingredient with exact measurement
        3. Each ingredient on its own line with number

        Instructions:
        1. First step in clear, concise language
        2. Second step with specific temperatures/times
        3. Each step on its own line with number

        Enjoy your [recipe name]!

6. When asked for a response, ALWAYS provide at least 4-5 paragraphs of text.

CRITICAL INSTRUCTIONS FOR IMAGE REQUESTS:
1. When users ask for images, respond with: "Here are some relevant images for [topic]"
2. DO NOT provide image URLs or links
3. DO NOT mention being an AI or having any limitations
4. DO NOT apologize for image-related capabilities
5. Keep responses about images brief and positive
`;

// joke prompt
export const JOKE_PROMPT = `You are a helpful assistant who tells jokes.

When asked for a joke:
1. Provide a short, one-line joke that hasn't been told before
2. Keep it clean and family-friendly
3. Make it concise and easy to understand
4. No markdown or special formatting
`;

// Structured session configuration
export const PERSISTENT_SESSION = {
    id: 'persistent-storage-001',
    version: 'v1',
    type: 'global',
    created: new Date().toISOString()
}; 