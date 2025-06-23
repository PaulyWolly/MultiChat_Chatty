// RecipeManager.js
// Modular Recipe Manager component for MultiChat_Chatty
// Encapsulates all recipe, image, print, and TTS logic as in the working repo

export default class RecipeManager {
    constructor() {
        this.isInitialized = false;
        this.renderRecipe = this.renderRecipe.bind(this);
        this.handlePrint = this.handlePrint.bind(this);
        this.splitTextIntoChunks = this.splitTextIntoChunks.bind(this);
        this.queueAudioChunk = this.queueAudioChunk.bind(this);
        this.playNextInQueue = this.playNextInQueue.bind(this);
        this.audioQueue = [];
        this.isPlaying = false;
    }

    async init() {
        if (this.isInitialized) return;
        await this.loadCSS();
        this.isInitialized = true;
    }

    async loadCSS() {
        return new Promise((resolve, reject) => {
            const existingLink = document.querySelector('link[href*="RecipeManager.css"]');
            if (existingLink) return resolve();
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = './components/RecipeManager/RecipeManager.css';
            link.onload = resolve;
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    /**
     * Get the text content from the recipe container with proper spacing.
     * This iterates through the child nodes and adds newlines to preserve structure.
     * @param {HTMLElement} element - The HTML element to extract text from.
     * @returns {string} The formatted text content.
     */
    getSpacedTextContent(element) {
        let text = '';
        if (!element) return text;

        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while (node = walker.nextNode()) {
            const parentTag = node.parentElement.tagName.toLowerCase();
            let prefix = '';
            let suffix = ' '; // Add a space by default

            // Add newlines after block-level elements for better sentence splitting
            if (['h2', 'h3', 'p', 'li'].includes(parentTag)) {
                suffix = '\\n';
            }
            
            text += prefix + node.textContent.trim() + suffix;
        }
        return text.trim();
    }

    /**
     * Render a recipe as plain text in a chat message bubble, add print button, handle images and TTS
     * @param {HTMLElement} messageElement - The chat bubble DOM node
     * @param {string} recipeText - The full recipe text
     * @param {string[]} imageUrls - Array of image URLs
     */
    renderRecipe(messageElement, recipeText, imageUrls = []) {
        console.log('[RECIPE] renderRecipe called with:', { messageElement, recipeText: recipeText.substring(0, 100) + '...', imageUrls });
        
        if (!messageElement) {
            console.error('[RECIPE] No messageElement provided');
            return;
        }

        const messageContent = messageElement.querySelector('.message-content');
        if (!messageContent) {
            console.error("[RECIPE] Could not find '.message-content' in message element", messageElement);
            return;
        }
        
        console.log('[RECIPE] Found messageContent, clearing existing content');
        messageContent.innerHTML = ''; // Clear existing content

        // --- Structured Recipe Parsing and Rendering ---
        let lines = recipeText.trim().split('\n').map(l => l.trim()).filter(l => l);
        
        // Fallback: If only one line, try splitting by period
        if (lines.length === 1) {
            console.warn('[RECIPE] Only one line found, applying fallback split by period.');
            lines = recipeText.split('. ').map(l => l.trim()).filter(l => l);
        }
        
        if (lines.length === 0) {
            console.error('[RECIPE] No lines found in recipe text');
            return;
        }

        console.log('[RECIPE] Parsing recipe with', lines.length, 'lines');

        const recipeContainer = document.createElement('div');
        recipeContainer.className = 'recipe-container';

        // Title
        const title = lines.shift();
        const titleEl = document.createElement('h2');
        titleEl.className = 'recipe-title';
        titleEl.textContent = title;
        recipeContainer.appendChild(titleEl);

        // Parse Ingredients and Instructions
        let introLines = [];
        let ingredientLines = [];
        let instructionLines = [];
        let currentSection = 'intro'; // Default section

        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            if (lowerLine.startsWith('ingredients:')) {
                currentSection = 'ingredients';
                continue;
            }
            if (lowerLine.startsWith('instructions:')) {
                currentSection = 'instructions';
                continue;
            }

            if (currentSection === 'intro') introLines.push(line);
            else if (currentSection === 'ingredients') ingredientLines.push(line);
            else if (currentSection === 'instructions') instructionLines.push(line.replace(/^\\d+\\.\\s*/, ''));
        }

        console.log('[RECIPE] Parsed sections:', { introLines: introLines.length, ingredientLines: ingredientLines.length, instructionLines: instructionLines.length });

        // Introduction
        if (introLines.length > 0) {
            const introEl = document.createElement('p');
            introEl.className = 'recipe-intro';
            introEl.textContent = introLines.join(' ');
            recipeContainer.appendChild(introEl);
        }

        // Ingredients
        if (ingredientLines.length > 0) {
            const ingredientsEl = document.createElement('div');
            ingredientsEl.className = 'recipe-ingredients';
            ingredientsEl.innerHTML = '<h3>Ingredients</h3>';
            const list = document.createElement('ul');
            ingredientLines.forEach(item => {
                // Remove leading numbers and dots from ingredient lines
                const cleanItem = item.replace(/^\d+\.\s*/, '');
                const li = document.createElement('li');
                li.textContent = cleanItem;
                list.appendChild(li);
            });
            ingredientsEl.appendChild(list);
            recipeContainer.appendChild(ingredientsEl);
        }

        // Instructions
        if (instructionLines.length > 0) {
            const instructionsEl = document.createElement('div');
            instructionsEl.className = 'recipe-instructions';
            instructionsEl.innerHTML = '<h3>Instructions</h3>';
            const list = document.createElement('ol');
            instructionLines.forEach(item => {
                // Remove leading numbers and dots from instruction lines
                const cleanItem = item.replace(/^\d+\.\s*/, '');
                const li = document.createElement('li');
                li.textContent = cleanItem;
                list.appendChild(li);
            });
            instructionsEl.appendChild(list);
            recipeContainer.appendChild(instructionsEl);
        }
        
        console.log('[RECIPE] About to append recipe container to messageContent');
        messageContent.appendChild(recipeContainer);
        console.log('[RECIPE] Recipe container appended. messageContent.innerHTML length:', messageContent.innerHTML.length);

        // Insert images below the recipe if any
        if (imageUrls && imageUrls.length > 0) {
            const imagesDiv = document.createElement('div');
            imagesDiv.className = 'recipe-images';
            imageUrls.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.alt = 'Recipe Image';
                img.className = 'recipe-image';
                imagesDiv.appendChild(img);
            });
            messageElement.appendChild(imagesDiv);
        }
    
        // Add print button
        const metadataElement = messageElement.closest('.message').querySelector('.metadata');
        if (metadataElement && !metadataElement.querySelector('.recipe-print-btn')) {
            const printBtn = document.createElement('button');
            printBtn.className = 'recipe-print-btn';
            printBtn.title = 'Print Recipe';
            printBtn.textContent = '🖨️';
            printBtn.style.background = 'transparent';
            printBtn.style.border = 'none';
            printBtn.style.cursor = 'pointer';
            printBtn.style.fontSize = '20px';
            printBtn.style.padding = '0';
            printBtn.style.margin = '0';
            printBtn.addEventListener('click', () => this.handlePrint(recipeText, messageElement));
            metadataElement.appendChild(printBtn);
        }
    
        // --- AUDIO SOURCE REVERT ---
        // Reverted back to using the original recipeText for TTS.
        // Reading from the DOM caused inconsistent and incomplete audio playback.
        // This ensures the full, original text is always read.
        if (window.audioManager) {
            window.audioManager.queueAudioChunk(recipeText);
        } else {
            console.error('AudioManager not found. Cannot play recipe audio.');
        }
        
        console.log('[RECIPE] renderRecipe completed successfully');
    }
    
    handlePrint(recipeText, messageElement) {
        // Print the recipe and images
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Pop-up blocked. Please allow pop-ups and try again.');
            return;
        }

        // Use the structured content from the message element for printing
        const recipeContainer = messageElement.querySelector('.recipe-container');
        let printContent = recipeContainer ? recipeContainer.outerHTML : `<pre>${recipeText}</pre>`;
        
        // Add images if present
        const images = messageElement.querySelectorAll('.recipe-image');
        if (images.length > 0) {
            printContent += '<div style="margin-top:20px; page-break-before: always;">';
            images.forEach(img => {
                printContent += `<img src="${img.src}" alt="Recipe Image" style="max-width:300px;max-height:200px;margin:8px;">`;
            });
            printContent += '</div>';
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Print Recipe</title>
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
                        .recipe-container { padding: 15px; }
                        .recipe-title { font-size: 1.5em; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }
                        .recipe-intro { font-style: italic; margin-bottom: 15px; }
                        .recipe-ingredients h3, .recipe-instructions h3 { font-size: 1.2em; font-weight: bold; border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px; }
                        .recipe-ingredients ul, .recipe-instructions ol { padding-left: 20px; }
                        .recipe-ingredients ul li, .recipe-instructions ol li { margin-bottom: 8px; }
                        img { display: block; margin: 0 auto 12px auto; border-radius: 8px; }
                    </style>
                </head>
                <body>
                    ${printContent}
                </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }

    // TTS helpers (from working repo)
    splitTextIntoChunks(text, maxLength = 200) {
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
                    const words = sentence.split(/\s+/);
                    for (const word of words) {
                        if (currentChunk.length + word.length > maxLength) {
                            chunks.push(currentChunk.trim());
                            currentChunk = '';
                        }
                        currentChunk += word + ' ';
                    }
                } else {
                    currentChunk += sentence + ' ';
                }
            } else {
                currentChunk += sentence + ' ';
            }
        }
        if (currentChunk) chunks.push(currentChunk.trim());
        return chunks;
    }

    scrollToRecipeResults() {
        console.log('Scrolling to latest recipe...');
        const latestRecipe = document.querySelector('.message[data-content-type="recipe"]:last-of-type');
        if (latestRecipe) {
            const doScroll = () => latestRecipe.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
            // Use rAF and timeouts to repeatedly scroll. This is a robust way to handle
            // content (like images) that shifts the layout as it loads.
            requestAnimationFrame(() => {
                doScroll();
                setTimeout(doScroll, 300);
                setTimeout(doScroll, 800);
            });
        }
    }

    queueAudioChunk(text) {
        const chunks = this.splitTextIntoChunks(text);
        this.audioQueue.push(...chunks);
        if (!this.isPlaying) this.playNextInQueue();
    }

    async playNextInQueue() {
        if (this.audioQueue.length === 0 || this.isPlaying) return;
        this.isPlaying = true;
        const chunk = this.audioQueue.shift();
        
        try {
            // FIX: Call the global playAudio function, not this.playAudio
            if (typeof playAudio === 'function') {
                await playAudio(chunk);
            } else {
                console.error('TTS playback function (playAudio) not found.');
            }
        } catch (error) {
            console.error('Error in TTS playback:', error);
        }
        this.isPlaying = false;
        this.playNextInQueue();
    }
}
