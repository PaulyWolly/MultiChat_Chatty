// RecipeManager.js
// Modular Recipe Manager component for MultiChat_Chatty
// Encapsulates all recipe, image, print, and TTS logic as in the working repo

class RecipeManager {
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
     * Render a recipe as plain text in a chat message bubble, add print button, handle images and TTS
     * @param {HTMLElement} messageElement - The chat bubble DOM node
     * @param {string} recipeText - The full recipe text
     * @param {string[]} imageUrls - Array of image URLs
     */
    renderRecipe(messageElement, recipeText, imageUrls = []) {
        if (!messageElement) return;

        const messageContent = messageElement.querySelector('.message-content');
        if (!messageContent) {
            console.error("Could not find '.message-content' in message element", messageElement);
            return;
        }
        messageContent.innerHTML = ''; // Clear existing content

        // --- Structured Recipe Parsing and Rendering ---
        const lines = recipeText.trim().split('\\n').map(l => l.trim()).filter(l => l);
        
        if (lines.length === 0) return;

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
                const li = document.createElement('li');
                li.textContent = item;
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
                const li = document.createElement('li');
                li.textContent = item;
                list.appendChild(li);
            });
            instructionsEl.appendChild(list);
            recipeContainer.appendChild(instructionsEl);
        }
        
        messageContent.appendChild(recipeContainer);

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
    
        // --- AUDIO FIX ---
        // TTS uses the original, non-capitalized text from the server
        this.queueAudioChunk(recipeText); 
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

    queueAudioChunk(text) {
        const chunks = this.splitTextIntoChunks(text);
        this.audioQueue.push(...chunks);
        if (!this.isPlaying) this.playNextInQueue();
    }

    async playNextInQueue() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            return;
        }
        this.isPlaying = true;
        const chunk = this.audioQueue.shift();
        // Replace this with your TTS playback logic
        // Example: window.playAudio(chunk);
        if (window.playAudio) {
            await window.playAudio(chunk);
        }
        setTimeout(() => this.playNextInQueue(), 200);
    }
}

window.RecipeManager = RecipeManager; 