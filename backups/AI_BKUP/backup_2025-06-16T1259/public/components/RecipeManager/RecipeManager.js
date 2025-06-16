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
        // Render plain text
        if (!messageElement) return;
        messageElement.textContent = recipeText;

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

        // TTS: queue recipe text
        this.queueAudioChunk(recipeText);
    }

    handlePrint(recipeText, messageElement) {
        // Print the recipe and images
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Pop-up blocked. Please allow pop-ups and try again.');
            return;
        }
        let printContent = `<pre style="font-family:inherit;">${recipeText}</pre>`;
        // Add images if present
        const images = messageElement.querySelectorAll('img');
        if (images.length > 0) {
            printContent += '<div style="margin-top:20px;">';
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
                        pre { font-size: 16px; white-space: pre-wrap; }
                        img { display: block; margin: 0 auto 12px auto; border-radius: 8px; }
                    </style>
                </head>
                <body>
                    ${printContent}
                </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);
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