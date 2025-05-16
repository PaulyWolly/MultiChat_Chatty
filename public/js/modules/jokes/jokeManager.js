/*
  JOKE_MANAGER.js
  Version: 22.0.2
  AppName: Multi-Chat [v22.0.2]
  Updated: May 13, 2025 @4:45PM
  Created by Paul Welby
*/

import { addMessageToChat, updateStatus } from '/js/dom.js';
import { queueAudioChunk } from '../audio/audioManager.js';
import { JOKE_PROMPT } from '/js/config.js';
import { getPatterns, stripMarkdown } from '../utils/helpers.js';

// Joke manager state
const jokeState = {
    isRecording: false,
    currentTitle: '',
    currentContent: '',
    pendingTitle: '',
    savingJoke: false
};

/**
 * Initialize joke manager
 */
export function init() {
    // Reset state
    resetState();
}

/**
 * Reset joke manager state
 */
export function resetState() {
    jokeState.isRecording = false;
    jokeState.currentTitle = '';
    jokeState.currentContent = '';
    jokeState.pendingTitle = '';
    jokeState.savingJoke = false;
}

/**
 * Handle joke requests
 */
export async function handleJokeRequest(message) {
    // Handle YES/NO for pending joke FIRST
    const pendingJoke = sessionStorage.getItem('pendingJoke');
    if (pendingJoke && /^yes$/i.test(message)) {
        const joke = JSON.parse(pendingJoke);
        const cleanJoke = stripMarkdown(joke.content);
        addMessageToChat('assistant', cleanJoke);
        await queueAudioChunk(cleanJoke);
        sessionStorage.removeItem('pendingJoke');
        return true;
    } else if (pendingJoke && /^no$/i.test(message)) {
        addMessageToChat('user', message);
        addMessageToChat('assistant', "Okay, maybe next time!");
        await queueAudioChunk("Okay, maybe next time!");
        sessionStorage.removeItem('pendingJoke');
        return true;
    }

    const patterns = getPatterns();

    // Handle joke saving
    if (patterns.saveJoke.some(pattern => pattern.test(message))) {
        addMessageToChat('user', message);
        await startSaving();
        return true;
    }

    // Handle joke retrieval
    const jokeMatch = patterns.jokes.getMyJoke.exec(message);
    if (jokeMatch) {
        addMessageToChat('user', message);
        await retrieveJoke(jokeMatch[1]);
        return true;
    }

    // Handle joke listing
    if (patterns.listJokes.some(pattern => pattern.test(message))) {
        addMessageToChat('user', message);
        const showAll = message.toLowerCase().includes('all jokes');
        window.isJokeListAudioPlaying = true;
        await listJokes(showAll);
        return true;
    }

    // Handle joke deletion
    if (patterns.jokes.deleteJoke.test(message)) {
        const match = patterns.jokes.deleteJoke.exec(message);
        const id = match[1];
        addMessageToChat('user', message);
        const confirmMsg = `Are you sure you want to delete joke with ID: ${id}? Say YES to confirm or NO to cancel.`;
        addMessageToChat('assistant', confirmMsg);
        await queueAudioChunk(confirmMsg);
        sessionStorage.setItem('pendingDelete', id);
        return true;
    }

    if (message.toLowerCase() === 'yes' && sessionStorage.getItem('pendingDelete')) {
        const id = sessionStorage.getItem('pendingDelete');
        await deleteJoke(id);
        sessionStorage.removeItem('pendingDelete');
        return true;
    }

    if (message.toLowerCase() === 'no' && sessionStorage.getItem('pendingDelete')) {
        const msg = "Okay, I won't delete the joke.";
        addMessageToChat('assistant', msg);
        await queueAudioChunk(msg);
        sessionStorage.removeItem('pendingDelete');
        return true;
    }

    // Handle joke updating
    if (/^update( my)? joke (?:about |called |titled )?(.+)$/i.test(message)) {
        const title = message.match(/^update( my)? joke (?:about |called |titled )?(.+)$/i)[2];
        addMessageToChat('user', message);
        jokeState.isRecording = 'updating';
        jokeState.currentTitle = title;
        const msg = "Okay, tell me the new version of your joke. Say COMPLETE when done";
        addMessageToChat('assistant', msg);
        await queueAudioChunk(msg);
        updateStatus("Recording updated joke...");
        jokeState.currentContent = '';
        return true;
    }

    // Handle joke search
    if (/^search( my)? jokes? (?:for |about |containing )?(.+)$/i.test(message)) {
        const searchTerm = message.match(/^search( my)? jokes? (?:for |about |containing )?(.+)$/i)[2];
        addMessageToChat('user', message);
        await searchJokes(searchTerm);
        return true;
    }

    return false; // Message wasn't joke-related
}

/**
 * Start the joke saving process
 */
export async function startSaving() {
    try {
        jokeState.savingJoke = true;
        const response = "Okay, what is the name of the joke you want to store?";
        addMessageToChat('assistant', response);
        await queueAudioChunk(response);
        jokeState.isRecording = 'waiting_for_title';
        updateStatus("Waiting for joke title...");
        return true;
    } catch (error) {
        console.error('Error starting joke saving:', error);
        resetState();
        return false;
    }
}

/**
 * Save joke to database
 */
export async function saveJoke() {
    try {
        const response = await fetch('/api/jokes/save-joke', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: jokeState.currentTitle,
                content: jokeState.currentContent,
                userId: window.sessionId  // Uses the persistent sessionId
            })
        });
        const data = await response.json();

        if (data.success) {
            const successMessage = `Great! I've saved your joke. To hear it later, just say 'tell me my joke about ${jokeState.currentTitle}'`;
            addMessageToChat('assistant', successMessage);
            await queueAudioChunk(successMessage);
        } else {
            const errorMessage = "Sorry, I couldn't save your joke. Please try again.";
            addMessageToChat('assistant', errorMessage);
            await queueAudioChunk(errorMessage);
        }
    } catch (error) {
        console.error('Error saving joke:', error);
        const errorMessage = "Sorry, there was an error saving your joke.";
        addMessageToChat('assistant', errorMessage);
        await queueAudioChunk(errorMessage);
    }
}

/**
 * Retrieve joke from database
 */
export async function retrieveJoke(title) {
    const startTime = performance.now();
    try {
        // Normalize the title to match how it's stored
        const normalizedTitle = title.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
        const response = await fetch(`/api/jokes/get-joke/${encodeURIComponent(normalizedTitle)}?sessionId=${window.sessionId}`);
        const data = await response.json();

        if (data.success && data.joke) {
            const message = "I found your joke. Would you like to hear it? Say Yes to hear it or No to cancel.";
            const metadata = {
                model: 'memory',
                duration: `${((performance.now() - startTime) / 1000).toFixed(2)}s`,
                tokens: '32 tokens',
                messageType: 'joke'
            };
            const cleanJoke = stripMarkdown(data.joke.content);
            addMessageToChat('assistant', cleanJoke, metadata);
            await queueAudioChunk(cleanJoke);
            sessionStorage.setItem('pendingJoke', JSON.stringify(data.joke));
        } else {
            const message = `Sorry, I couldn't find a joke about "${title}".`;
            const metadata = {
                model: 'memory',
                duration: `${((performance.now() - startTime) / 1000).toFixed(2)}s`,
                tokens: '37 tokens',
                messageType: 'joke'
            };
            const cleanMessage = stripMarkdown(message);
            addMessageToChat('assistant', cleanMessage, metadata);
            await queueAudioChunk(cleanMessage);
        }
    } catch (error) {
        console.error('Error retrieving joke:', error);
        const errorMessage = "Sorry, there was an error retrieving your joke.";
        const metadata = {
            model: 'memory',
            duration: `${((performance.now() - startTime) / 1000).toFixed(2)}s`,
            tokens: '30 tokens',
            messageType: 'error'
        };
        const cleanErrorMessage = stripMarkdown(errorMessage);
        addMessageToChat('assistant', cleanErrorMessage, metadata);
        await queueAudioChunk(cleanErrorMessage);
    }
}

/**
 * List jokes from database
 */
export async function listJokes(showAll = false) {
    const startTime = performance.now();
    try {
        const response = await fetch(`/api/jokes/list-jokes?type=my jokes&sessionId=${window.sessionId}`);
        const data = await response.json();

        if (data.success && data.jokes && data.jokes.length > 0) {
            const messageText = "Here is a listing of your jokes:";
            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            const tokenCount = messageText.length + data.jokes.reduce((acc, joke) => acc + joke.title.length, 0);

            // Add message with proper metadata
            const messageElement = addMessageToChat('assistant', messageText, {
                model: 'memory',
                metrics: {
                    model: 'memory',
                    totalTokens: tokenCount,
                    startTime: startTime,
                    endTime: endTime,
                    duration: duration
                },
                type: 'joke-list'
            });

            // Create and append the joke list
            const list = document.createElement('ol');
            data.jokes.forEach(joke => {
                const item = document.createElement('li');
                item.textContent = joke.title;
                list.appendChild(item);
            });

            messageElement.querySelector('.message-content').appendChild(list);

            // Add help text
            const helpText = document.createElement('p');
            helpText.style.marginTop = '10px';
            helpText.style.fontStyle = 'italic';
            helpText.textContent = 'To hear your joke, ask... "Tell me my joke about [joke name]"';
            messageElement.querySelector('.message-content').appendChild(helpText);

            await queueAudioChunk(messageText);
            for (let i = 0; i < data.jokes.length; i++) {
                const cleanJoke = stripMarkdown(data.jokes[i].title);
                await queueAudioChunk(cleanJoke);
            }
            await queueAudioChunk("To hear your joke, ask Tell me my joke about, followed by the joke name");
        } else {
            const message = "You haven't saved any jokes yet.";
            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            addMessageToChat('assistant', message, {
                model: 'memory',
                metrics: {
                    model: 'memory',
                    totalTokens: message.length,
                    startTime: startTime,
                    endTime: endTime,
                    duration: duration
                },
                type: 'joke-list'
            });
            await queueAudioChunk(message);
        }
    } catch (error) {
        console.error('Error listing jokes:', error);
        const errorMessage = "Sorry, there was an error retrieving your jokes.";
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        addMessageToChat('assistant', errorMessage, {
            model: 'memory',
            metrics: {
                model: 'memory',
                totalTokens: errorMessage.length,
                startTime: startTime,
                endTime: endTime,
                duration: duration
            },
            type: 'error'
        });
        await queueAudioChunk(errorMessage);
    }
}

/**
 * Confirm joke deletion
 */
export async function confirmDelete(title) {
    const message = `Are you sure you want to delete your joke "${title}"? Say YES to confirm or NO to cancel.`;
    addMessageToChat('assistant', message);
    await queueAudioChunk(message);
    sessionStorage.setItem('pendingDelete', title);
    return true;
}

/**
 * Delete joke from database
 */
export async function deleteJoke(title) {
    try {
        // First get the joke to get its ID
        const getResponse = await fetch(`/api/jokes/delete-joke/${encodeURIComponent(title)}`);
        const getData = await getResponse.json();

        if (!getData.success) {
            throw new Error('Joke not found');
        }

        // Then delete using the ID
        const response = await fetch(
            `/api/jokes/delete-joke/${getData.joke.id}`,
            {
                method: 'DELETE'
            }
        );
        const data = await response.json();

        if (data.success) {
            const message = `I've deleted your joke "${title}"`;
            addMessageToChat('assistant', message);
            await queueAudioChunk(message);
        } else {
            const message = "Sorry, I couldn't find that joke to delete.";
            addMessageToChat('assistant', message);
            await queueAudioChunk(message);
        }
    } catch (error) {
        console.error('Error deleting joke:', error);
        const errorMessage = "Sorry, there was an error deleting your joke.";
        addMessageToChat('assistant', errorMessage);
        await queueAudioChunk(errorMessage);
    }
}

/**
 * Update joke in database
 */
export async function updateJoke(title, newContent) {
    try {
        const response = await fetch(`/api/jokes/update-joke/${encodeURIComponent(title)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: newContent,
                userId: window.sessionId
            })
        });
        const data = await response.json();

        if (data.success) {
            const message = `I've updated your joke "${title}"`;
            addMessageToChat('assistant', message);
            await queueAudioChunk(message);
        } else {
            const message = "Sorry, I couldn't find that joke to update.";
            addMessageToChat('assistant', message);
            await queueAudioChunk(message);
        }
    } catch (error) {
        console.error('Error updating joke:', error);
        const errorMessage = "Sorry, there was an error updating your joke.";
        addMessageToChat('assistant', errorMessage);
        await queueAudioChunk(errorMessage);
    }
}

/**
 * Search jokes in database
 */
export async function searchJokes(searchTerm) {
    try {
        const response = await fetch(`/api/jokes/search-jokes?term=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();

        if (data.success && data.jokes.length > 0) {
            const message = `I found ${data.jokes.length} joke${data.jokes.length > 1 ? 's' : ''} containing "${searchTerm}". Would you like to hear them?`;
            addMessageToChat('assistant', message);
            await queueAudioChunk(message);
            sessionStorage.setItem('searchResults', JSON.stringify(data.jokes));
        } else {
            const message = `I couldn't find any jokes containing "${searchTerm}".`;
            addMessageToChat('assistant', message);
            await queueAudioChunk(message);
        }
    } catch (error) {
        console.error('Error searching jokes:', error);
        const errorMessage = "Sorry, there was an error searching your jokes.";
        addMessageToChat('assistant', errorMessage);
        await queueAudioChunk(errorMessage);
    }
}

/**
 * Display jokes in a formatted list
 */
export function displayJokes(jokes) {
    const jokeList = document.createElement('div');
    jokeList.className = 'joke-list';

    jokes.forEach(joke => {
        const jokeItem = document.createElement('div');
        jokeItem.className = 'joke-item';
        jokeItem.innerHTML = `
            <span class="joke-number">${joke.number}.</span>
            <span class="joke-text">${joke.text}</span>
        `;
        jokeList.appendChild(jokeItem);
    });

    addMessageToChat('system', jokeList.outerHTML);
}

/**
 * Get the joke state
 */
export function getJokeState() {
    return { ...jokeState };
}

/**
 * Set the joke state
 */
export function setJokeState(newState) {
    Object.assign(jokeState, newState);
} 