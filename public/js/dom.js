/*
  DOM.js
  Version: 23.0.0
  AppName: Multi-Chat [v23.0.0]
  Updated: 5/16/2025 @1:00AM
  Created by Paul Welby
*/

// DOM elements and operations

// Reference to all HTML elements used in the app
export const elements = {
    chatMessages: document.getElementById('chat-messages'),
    userInput: document.getElementById('user-input'),
    sendButton: document.getElementById('send-button'),
    micButton: document.getElementById('mic-button'),
    status: document.getElementById('status'),
    conversationModeToggle: document.getElementById('conversation-mode'),
    modelSelect: document.getElementById('model-select'),
    voiceSelect: document.getElementById('voice-select'),
    stopAudioButton: document.getElementById('stop-audio-button'),
    processingIndicator: document.getElementById('processing-indicator'),
    imageUploadBtn: document.getElementById('image-upload-btn'),
    imageInput: document.getElementById('image-input'),
    conversationStatus: document.getElementById('conversation-status'),
    videoContainer: document.getElementById('youtube-container'),
};

/**
 * Update the status text and manage UI
 */
export function updateStatus(message) {
    elements.status.textContent = message;
    // Sync stop button visibility with status message
    elements.stopAudioButton.style.display = 
        message === 'AI is speaking...' ? 'inline-block' : 'none';
}

/**
 * Show processing indicator
 */
export function showProcessing() {
    elements.processingIndicator.classList.add('active');
}

/**
 * Hide processing indicator
 */
export function hideProcessing() {
    elements.processingIndicator.classList.remove('active');
}

/**
 * Add a message to the chat UI
 */
export function addMessageToChat(role, content, options = {}, messageType) {
    const messageElement = document.createElement('div');
    // Always add 'assistant' class for assistant responses
    if (role === 'assistant') {
        messageElement.className = 'message assistant';
    } else {
        messageElement.className = `message ${role}`;
    }

    // Add special classes for greeting and exit/closing messages
    const type = options.type || messageType;
    if (role === 'assistant' && type === 'greeting') {
        messageElement.classList.add('greeting-bubble');
    } else if (role === 'assistant' && type === 'exit') {
        messageElement.classList.add('exit-bubble');
    } else if (
        role === 'assistant' &&
        type !== 'greeting' &&
        type !== 'exit' &&
        type !== 'system' &&
        type !== 'time' &&
        type !== 'date' &&
        type !== 'datetime'
    ) {
        // Assign general-bubble class to all regular LLM responses
        messageElement.classList.add('general-bubble');
    }

    // Only add metadata for LLM responses (not greetings, exit, or system/time/date/datetime)
    let metadataElement = null;
    const isLLMResponse = (
        role === 'assistant' &&
        type !== 'greeting' &&
        type !== 'exit' &&
        type !== 'system' &&
        type !== 'time' &&
        type !== 'date' &&
        type !== 'datetime'
    );
    if (isLLMResponse) {
        metadataElement = document.createElement('div');
        metadataElement.className = 'metadata';
        messageElement.appendChild(metadataElement); // Add as first child
    }

    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';

    // Handle different content types
    if (typeof content === 'object' && content.type === 'youtube') {
        contentElement.innerHTML = content.html;
    } else if (role === 'assistant' && typeof content === 'string') {
        // Split into paragraphs for assistant output
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        if (paragraphs.length > 1) {
            paragraphs.forEach(paragraph => {
                const p = document.createElement('p');
                p.textContent = paragraph.trim();
                contentElement.appendChild(p);
            });
        } else {
            // Fallback: single paragraph or no double newlines
            const p = document.createElement('p');
            p.textContent = content.trim();
            contentElement.appendChild(p);
        }
    } else {
        contentElement.textContent = content;
    }

    messageElement.appendChild(contentElement);
    
    elements.chatMessages.appendChild(messageElement);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

    return messageElement;
}

/**
 * Update the content of a message
 */
export function updateMessageContent(messageElement, content, tokenCount) {
    const contentElement = messageElement.querySelector('.message-content');
    const metadataElement = messageElement.querySelector('.metadata');

    if (contentElement) {
        contentElement.innerText = content;
    }

    if (metadataElement && tokenCount) {
        const modelName = document.getElementById('model-select').value;
        const duration = ((Date.now() - performance.now()) / 1000).toFixed(2);

        metadataElement.innerHTML = `
            <span class="model-info">${modelName}</span>&nbsp;|&nbsp;
            <span class="response-time">${duration}s</span>&nbsp;|&nbsp;
            <span class="token-count">${tokenCount} tokens</span>
        `;
    }
}

/**
 * Update the metadata for a message
 */
export function updateMetadata(messageElement, metadata = {}) {
    // Skip metadata for system messages and date/time responses
    if (metadata.type === 'system' ||
        metadata.messageType === 'time' ||
        metadata.messageType === 'date' ||
        metadata.messageType === 'dateTime') {
        return {};
    }

    const metadataElement = messageElement.querySelector('.metadata');
    if (!metadataElement) return;

    // Get model name with proper fallbacks
    let modelName = metadata?.model || elements.modelSelect?.value || 'gpt-4o-mini';

    // Calculate duration
    let duration;
    if (metadata.metrics?.duration) {
        duration = metadata.metrics.duration;
    } else if (metadata.metrics?.startTime && metadata.metrics?.endTime) {
        duration = ((metadata.metrics.endTime - metadata.metrics.startTime) / 1000).toFixed(2);
    } else if (metadata.startTime) {
        duration = ((Date.now() - metadata.startTime) / 1000).toFixed(2);
    } else {
        duration = '0.00';
    }

    // Get token count - restore original token count handling
    const tokenCount = metadata.tokenCount ||
                      metadata.metrics?.totalTokens ||
                      41; // Default token count for system messages

    // Format the metadata string
    metadataElement.innerHTML = `
        <span class="model-info">${modelName}</span>&nbsp;|&nbsp;
        <span class="response-time">${duration}s</span>&nbsp;|&nbsp;
        <span class="token-count">${tokenCount} tokens</span>
    `;

    // Check for recipe content and handle recipe buttons
    const messageContent = messageElement.querySelector('.message-content');
    if (messageContent) {
        const text = messageContent.textContent;
        const hasIngredients = text.toLowerCase().includes('ingredients:');
        const hasInstructions = text.toLowerCase().includes('instructions:') ||
                                text.toLowerCase().includes('steps:');

        if (hasIngredients && hasInstructions) {
            // Make metadata div a flex container
            metadataElement.style.display = 'flex';
            metadataElement.style.alignItems = 'center';
            metadataElement.style.justifyContent = 'space-between';

            // Create recipe buttons container
            const recipeButtons = document.createElement('span');
            recipeButtons.className = 'recipe-buttons';
            recipeButtons.style.cssText = `
                display: flex;
                gap: 5px;
                margin-left: auto;
            `;

            // Add the buttons
            recipeButtons.innerHTML = `
                <button style="
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    font-size: 20px;
                    padding: 0;
                    margin: 0;
                " onclick="printRecipe('${text.replace(/'/g, "\\'")}', this.closest('.message'))" title="Print Recipe">🖨️</button>
            `;

            metadataElement.appendChild(recipeButtons);
        }
    }
}

/**
 * Insert and style images in a message
 */
export function insertAndStyleImages(images, messageElement) {
    const imageSection = `
        <div class="image-section" style="margin-top: 15px; border-top: 1px solid #ccc; padding-top: 10px;">
            <h3 style="font-size: 1.2em; margin-bottom: 10px; color: #333; font-weight: bold;">Images:</h3>
            <div class="image-container" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; max-width: 100%;">
                ${images.map(image => `
                    <a href="${image.link}" target="_blank" rel="noopener noreferrer" class="image-link"
                        style="cursor: pointer; text-decoration: none; display: block; border: 1px solid #ddd; border-radius: 5px; overflow: hidden; transition: transform 0.2s ease-in-out; aspect-ratio: 1;">
                        <img src="${image.link}" alt="${image.title}" title="${image.title}"
                                style="width: 100%; height: 100%; object-fit: cover; display: block;">
                    </a>
                `).join('')}
            </div>
        </div>
    `;

    // Check if images section already exists
    const existingImageSection = messageElement.querySelector('.image-section');
    if (existingImageSection) {
        existingImageSection.remove();
    }

    messageElement.insertAdjacentHTML('beforeend', imageSection);

    // Add hover effects and error handling
    messageElement.querySelectorAll('.image-link').forEach(link => {
        link.onmouseover = () => link.style.transform = 'scale(1.05)';
        link.onmouseout = () => link.style.transform = 'scale(1)';

        // Add error handling for images
        const img = link.querySelector('img');
        img.onerror = () => {
            img.src = img.getAttribute('data-thumbnail') || 'path/to/fallback-image.jpg';
            console.log('Image failed to load, falling back to thumbnail:', img.src);
        };

        // Store thumbnail as backup
        if (image && image.thumbnail) {
            img.setAttribute('data-thumbnail', image.thumbnail);
        }
    });
}

/**
 * Display image results in chat
 */
export function displayImageResults(images, messageElement = null, query = '') {
    // Filter out duplicate images by thumbnail or link
    const uniqueImages = [];
    const seen = new Set();
    for (const img of images) {
        const key = img.thumbnail || img.link;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueImages.push(img);
        }
    }
    // Only show up to 10 unique images
    const imagesToShow = uniqueImages.slice(0, 10);
    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-results-container';
    imageContainer.style.display = 'grid';
    imageContainer.style.gridTemplateColumns = 'repeat(5, 1fr)';
    imageContainer.style.gridTemplateRows = 'repeat(2, 1fr)';
    imageContainer.style.gap = '10px';
    imageContainer.style.margin = '20px 0';
    imageContainer.style.width = '100%';
    imagesToShow.forEach(image => {
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'image-result';
        const img = document.createElement('img');
        img.src = image.thumbnail;
        img.alt = image.title;
        img.style.width = '100%';
        img.style.height = '216px'; // 80% higher than 120px
        img.style.objectFit = 'cover';
        img.style.borderRadius = '8px';
        img.style.cursor = 'pointer';
        img.onclick = () => window.open(image.link, '_blank');
        imgWrapper.appendChild(img);
        imageContainer.appendChild(imgWrapper);
    });
    // Insert heading before images
    const heading = document.createElement('div');
    heading.className = 'image-results-heading';
    heading.style.fontWeight = 'bold';
    heading.style.margin = '10px 0 5px 0';

    // heading.style.border = '1px solid #ccc';
    heading.style.paddingTop = '10px';

    heading.textContent = query ? `Here are some relevant images of ${query}...` : 'Here are some relevant images...';
    if (messageElement) {
        const contentDiv = messageElement.querySelector('.message-content');
        // Insert a horizontal separator before the heading
        const hr = document.createElement('hr');
        hr.style.margin = '16px 0 8px 0';
        hr.style.border = 'none';
        hr.style.borderTop = '1px solid #ccc';
        contentDiv.appendChild(hr);
        contentDiv.appendChild(heading);
        contentDiv.appendChild(imageContainer);
    } else {
        const messageElementNew = addMessageToChat('assistant', heading.textContent);
        messageElementNew.querySelector('.message-content').appendChild(imageContainer);
    }
} 