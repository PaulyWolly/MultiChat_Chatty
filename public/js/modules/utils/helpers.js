/*
  HELPERS.js
  Version: 22.0.2
  AppName: Multi-Chat [v22.0.2]
  Updated: May 13, 2025 @4:45PM
  Created by Paul Welby
*/

// Helper functions used across the application

/**
 * Checks if the text appears to be a recipe
 */
export function isRecipe(text) {
    // Check if text contains both "Ingredients:" and "Instructions:" or "Directions:"
    return text.includes('Ingredients:') &&
           (text.includes('Instructions:') || text.includes('Directions:'));
}

/**
 * Get the time of day (morning, afternoon, or evening)
 */
export function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
}

/**
 * Check if today is a holiday and return holiday info
 */
export function getHoliday(date) {
    const month = date.getMonth() + 1; // JavaScript months are 0-based
    const day = date.getDate();
    const year = date.getFullYear();

    // Calculate Thanksgiving (4th Thursday of November)
    if (month === 11) {  // November
        const thanksgiving = new Date(year, 10, 1);  // Start with November 1
        while (thanksgiving.getDay() !== 4) {  // Find first Thursday
            thanksgiving.setDate(thanksgiving.getDate() + 1);
        }
        thanksgiving.setDate(thanksgiving.getDate() + 21);  // Add 3 weeks

        if (day === thanksgiving.getDate()) {
            return {
                name: "Thanksgiving Day",
                greeting: "Happy Thanksgiving!"
            };
        }
    }

    // Fixed date holidays
    const holidays = {
        "1/1": { name: "New Year's Day", greeting: "Happy New Year!" },
        "7/4": { name: "Independence Day", greeting: "Happy Independence Day!" },
        "12/24": { name: "Christmas Eve", greeting: "Merry Christmas Eve!" },
        "12/25": { name: "Christmas Day", greeting: "Merry Christmas!" },
        "12/31": { name: "New Year's Eve", greeting: "Happy New Year's Eve!" }
    };

    const dateKey = `${month}/${day}`;
    return holidays[dateKey] || null;
}

/**
 * Format minutes with proper pluralization
 */
export function formatMinutesPlural(minutes) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

/**
 * Strip markdown formatting from text
 */
export function stripMarkdown(text) {
    // Preserve newlines and list formatting
    return text
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // Bold
        .replace(/(\*|_)(.*?)\1/g, '$2')    // Italic
        .replace(/`{3}[\s\S]*?`{3}/g, '')   // Code blocks
        .replace(/`([^`]+)`/g, '$1')        // Inline code
        .replace(/^#+\s+/gm, '')            // Headers
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links
        .replace(/!\[([^\]]+)\]\([^\)]+\)/g, '$1') // Images
        .trim();
}

/**
 * Fetch with automatic retry functionality
 */
export async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

/**
 * Split text into chunks for audio processing
 */
export function splitTextIntoChunks(text, maxLength = 200) {
    // Split text into sentences, keeping the punctuation
    const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [text];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxLength) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            if (sentence.length > maxLength) {
                // Split long sentences into words
                const words = sentence.split(/\s+/);
                for (const word of words) {
                    if (currentChunk.length + word.length > maxLength) {
                        chunks.push(currentChunk.trim());
                        currentChunk = '';
                    }
                    currentChunk += (currentChunk ? ' ' : '') + word;
                }
            } else {
                currentChunk = sentence;
            }
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
    }
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
}

/**
 * Checks if a sessionId is valid
 */
export function isValidSessionId(sid) {
    const parts = sid.split('-');
    return (
        parts.length === 3 &&
        ['global', 'user', 'admin'].includes(parts[0]) &&
        /^v\d+$/.test(parts[2])
    );
}

/**
 * Check if the user's message is an AI greeting response
 */
export function isAIGreetingResponse(text) {
    text = text.toLowerCase().trim();

    // Get the exact AI greeting format
    const timeOfDay = getTimeOfDay();
    const aiGreeting = `good ${timeOfDay}! how can i assist you today?`;

    // Check for exact match or user echoing parts of the greeting
    return text === aiGreeting ||
           text === `good ${timeOfDay}` ||
           text === 'how can i assist you today' ||
           text === 'how may i assist you today';
}

/**
 * Chunk text for audio processing
 */
export function chunkText(text) {
    // Special handling for recipes
    if (text.includes('Ingredients:') || text.includes('Instructions:')) {
        const parts = text.split(/(?:Ingredients:|Instructions:)/g);
        const chunks = [];
        
        // Process each section
        parts.forEach(part => {
            if (!part.trim()) return;
            
            // Split into smaller chunks
            const lines = part
                .split(/\d+\.|[\n\r]+/)
                .map(line => line.trim())
                .filter(line => line.length > 0);
            
            lines.forEach(line => {
                if (line.length > 150) {  // Using constant from AUDIO_CONFIG
                    // Split long lines at punctuation
                    const subChunks = line
                        .split(/([.,;])\s+/)
                        .filter(chunk => chunk.length > 0);
                    chunks.push(...subChunks);
                } else {
                    chunks.push(line);
                }
            });
        });
        
        return chunks;
    }
    
    // Regular text handling
    return text
        .split(/([.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

/**
 * Fade audio volume from one level to another
 */
export function fadeAudio(audio, from, to, duration) {
    return new Promise(resolve => {
        const steps = 20;
        const stepTime = duration / steps;
        const stepSize = (to - from) / steps;
        let current = from;
        
        const interval = setInterval(() => {
            current += stepSize;
            audio.volume = Math.max(0, Math.min(1, current));
            
            if ((stepSize > 0 && current >= to) || (stepSize < 0 && current <= to)) {
                clearInterval(interval);
                audio.volume = to;
                resolve();
            }
        }, stepTime);
    });
}

/**
 * Audio cleanup function
 */
export function cleanup(audio) {
    if (audio) {
        audio.pause();
        audio.src = '';
        URL.revokeObjectURL(audio.src);
    }
}

/**
 * Generate common regex patterns used throughout the app
 */
export function getPatterns() {
    return {
        greetings: [
            /^hi$/i,
            /^hi\s+there$/i,
            /^hello$/i,
            /^hey$/i
        ],
        time: [
            /what(?:'s| is)(?: the)?(?: local)? time/i,
            /tell me(?: the)?(?: local)? time/i,
            /current time/i,
            /time now/i,
            /local time/i,
            /time please/i,
            /time is it/i,
            /got the time/i,
            /have the time/i,
            /^time$/i
        ],
        date: [
            /^what(?:'s| is)(?: the)?(?: current)? date/i,
            /^tell me(?: the)? date/i,
            /^what day is it/i,
            /^what(?:'s| is)? today(?:'s)? date/i,
            /^current date/i,
            /^date today/i,
            /^date now/i,
            /^date please/i,
            /^date$/i
        ],
        dateTime: [
            /date and time/i,
            /time and date/i,
            /current date and time/i,
            /what(?:'s| is) the date and time/i,
            /tell me(?: the)? date and time/i,
            /what day and time/i,
            /today(?:'s| is)? date and time/i,
            /date time/i,
            /time date/i
        ],
        rememberInfo: [
            /^remember that (.+?) is (.+)$/i,
            /^remember (.+?) is (.+)$/i,
            /^please remember that (.+?) is (.+)$/i,
            /^please remember (.+?) is (.+)$/i
        ],
        getPersonalInfo: [
            /^what(?:'s| is) my (.+)\??$/i,
            /^tell me (?:about )?my (.+)\??$/i,
            /^do you remember my (.+)\??$/i,
            /^what do you remember about my (.+)\??$/i,
            /^show me my personal info(?:rmation)?\??$/i,
            /^what do you know about me\??$/i
        ],
        exit: [
            /^(exit|quit|bye|goodbye)$/i
        ],
        saveJoke: [
            /^save a joke$/i,
            /^save joke$/i,
            /^i want to save a joke$/i,
            /^let me tell you a joke$/i,
            /^can i tell you a joke$/i
        ],
        jokes: {
            listAll: /(?:.*?)(all jokes)(?:.*?)$/i,
            listMine: /(?:.*?)(my jokes)(?:.*?)$/i,
            getMyJoke: /(?:tell|show|get|read)(?:\s+me)?\s+my\s+joke\s+(?:about|with|containing)\s+"?([^"]+)"?/i,
            deleteJoke: /^delete joke id (\w+)$/i
        },
        listJokes: [
            /^(show|list|tell me|get|read)?\s*(my jokes|all jokes)\s*$/i,
            /^what(?:.*?)(my jokes|all jokes)(?:.*?)$/i
        ],
        bingSearch: {
            searchTerms: /^(web|bing|internet )\s/i,
        },
        recipeFormatting: {
            numbers: {
                four: /\b4\b/g,
                fourth: /\b4th\b/g
            },
            fractions: {
                half: /\b1\/2\b/g,
                quarter: /\b1\/4\b/g,
                threeQuarters: /\b3\/4\b/g,
                twoThirds: /\b2\/3\b/g,
                oneThird: /\b1\/3\b/g
            }
        },
        youtube: {
            // Match any query that starts with youtube or contains youtube search
            searchVideos: /(^youtube|youtube search|search youtube|search on youtube)/i,
            // Match any play request that includes youtube
            playVideo: /(^play|youtube play|play.*youtube|youtube.*play)/i
        },
        location: /(?:at|in|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        event: /(?:tomorrow|next|on|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        storeName: [
            /^remember (?:that )?my name is (.+)$/i,
            /^my name is (.+)$/i
        ],
        confirmChange: [
            /^(yes|no)$/i
        ],
        getName: [
            /^what(?:'s| is) my name\??$/i,
            /^tell me my name\??$/i,
            /^do you remember my name\??$/i
        ],
    };
}

/**
 * Extract time reference from text
 */
export function extractTimeReference(text) {
    const timePatterns = {
        specific: /(?:at|on|during)\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i,
        relative: /(?:tomorrow|next|in\s+\d+\s+(?:days?|weeks?|months?))/i,
        recurring: /(?:every|each)\s+(\w+)/i,
        date: /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/
    };

    for (const [type, pattern] of Object.entries(timePatterns)) {
        const match = text.match(pattern);
        if (match) {
            return {
                type,
                value: match[1] || match[0],
                original: match[0]
            };
        }
    }
    return null;
}

/**
 * Extract related terms from text
 */
export function extractRelatedTerms(text) {
    const terms = [];

    // Extract people
    const peoplePattern = /(?:with|and|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    let match;
    while ((match = peoplePattern.exec(text)) !== null) {
        terms.push({ type: 'person', value: match[1] });
    }

    // Extract places
    const placePattern = /(?:at|in|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    while ((match = placePattern.exec(text)) !== null) {
        terms.push({ type: 'place', value: match[1] });
    }

    return terms;
}

/**
 * Categorize memory based on content
 */
export function categorizeMemory(text) {
    const MEMORY_CATEGORIES = {
        event: /(?:tomorrow|next|on|at)\s+(.+)/i,
        preference: /(?:like|love|hate|prefer)\s+(.+)/i,
        fact: /(?:is|are|was|were)\s+(.+)/i,
        location: /(?:at|in|near|around)\s+(.+)/i,
        time: /(?:at|every|during)\s+(\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)/i
    };

    for (const [category, pattern] of Object.entries(MEMORY_CATEGORIES)) {
        if (pattern.test(text)) {
            return category;
        }
    }
    return 'general';
}

/**
 * Extract keywords from text
 */
export function extractKeywords(text) {
    // Remove common words and punctuation
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but'];
    return text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => !stopWords.includes(word));
} 