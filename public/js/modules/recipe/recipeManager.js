/*
  RECIPE_MANAGER.js
  Version: 23.0.0
  AppName: Multi-Chat [v23.0.0]
  Updated: 5/16/2025 @1:00AM
  Created by Paul Welby
*/

import { isRecipe, getPatterns } from '../utils/helpers.js';

/**
 * Print a recipe to a new window
 * Called from the onclick handler in the UI
 */
export async function printRecipe(recipeText, messageElement) {
    try {
        console.log('Recipe text sent to server:', recipeText.substring(0, 200));

        // Get any images from the message element FIRST
        const images = messageElement.querySelectorAll('.image-link img');
        const imageUrls = Array.from(images).map(img => img.src);
        console.log('Found recipe images:', imageUrls);

        const response = await fetch('/api/recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: recipeText })
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        const recipeName = data.recipe.name;
        
        // Enhanced recipe parsing
        const sections = recipeText.split(/(?:ingredients:|instructions:|directions:|cooking time:|servings:|difficulty:|notes:|tips:)/i);
        
        // Extract recipe metadata
        const description = sections[0]
            .split('\n')[0]
            .substring(recipeName.length)
            .replace(/^[^a-zA-Z]+/, '')
            .trim();

        // Parse cooking time, servings, and difficulty
        const cookingTime = recipeText.match(/cooking time:?\s*(\d+\s*(?:minutes?|hours?|mins?|hrs?))/i)?.[1] || 'Not specified';
        const servings = recipeText.match(/servings:?\s*(\d+)/i)?.[1] || 'Not specified';
        const difficulty = recipeText.match(/difficulty:?\s*(easy|medium|hard|beginner|intermediate|advanced)/i)?.[1] || 'Not specified';

        // Parse ingredients with quantities
        const ingredients = sections[1] ? sections[1].trim().split(/\d+\./).filter(item => item.trim()) : [];
        const formattedIngredients = ingredients.map(item => {
            const match = item.match(/^([\d\/\s]+(?:\s*(?:cup|tbsp|tsp|oz|g|ml|lb|kg)s?)?)\s*(.+)/i);
            if (match) {
                return `<li><span class="quantity">${match[1].trim()}</span> ${match[2].trim()}</li>`;
            }
            return `<li>${item.trim()}</li>`;
        });

        // Parse instructions
        const instructions = sections[2] ? sections[2].trim().split(/\d+\./).filter(item => item.trim()) : [];

        // Parse notes/tips
        const notes = sections[3] ? sections[3].trim().split(/\d+\./).filter(item => item.trim()) : [];

        // Create print window
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            throw new Error('Pop-up blocked. Please allow pop-ups and try again.');
        }

        // Create formatted HTML with enhanced recipe content
        const formattedText = createFormattedRecipeHtml(
            recipeName, 
            description, 
            cookingTime, 
            servings, 
            difficulty, 
            formattedIngredients, 
            instructions, 
            notes, 
            imageUrls
        );

        printWindow.document.write(createRecipePrintPage(recipeName, formattedText));
        
        printWindow.document.close();
        
        // Wait for images to load before printing
        setTimeout(() => {
            printWindow.print();
        }, 1000);

    } catch (error) {
        console.error('Error printing recipe:', error);
        alert('Sorry, there was an error processing the recipe. Please try again.');
    }
}

/**
 * Create formatted HTML content for a recipe
 */
function createFormattedRecipeHtml(
    recipeName, 
    description, 
    cookingTime, 
    servings, 
    difficulty, 
    formattedIngredients, 
    instructions, 
    notes, 
    imageUrls
) {
    return `
        <div class="recipe-content">
            <div class="recipe-metadata">
                <div class="metadata-item">
                    <span class="label">Cooking Time:</span>
                    <span class="value">${cookingTime}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">Servings:</span>
                    <span class="value">${servings}</span>
                </div>
                <div class="metadata-item">
                    <span class="label">Difficulty:</span>
                    <span class="value">${difficulty}</span>
                </div>
            </div>
            <div class="recipe-intro">${description}</div>
            <h2>Ingredients</h2>
            <ul class="ingredients-list">
                ${formattedIngredients.join('')}
            </ul>
            <h2>Instructions</h2>
            <ol class="instructions-list">
                ${instructions.map(item => `<li>${item.trim()}</li>`).join('')}
            </ol>
            ${notes.length > 0 ? `
                <h2>Notes & Tips</h2>
                <ul class="notes-list">
                    ${notes.map(item => `<li>${item.trim()}</li>`).join('')}
                </ul>
            ` : ''}
        </div>
        ${imageUrls.length > 0 ? `
            <div class="recipe-images">
                <h2>Recipe Images</h2>
                <div class="image-grid">
                    ${imageUrls.map(url => `<img src="${url}" alt="Recipe Image">`).join('')}
                </div>
            </div>
        ` : ''}
        <div class="recipe-actions">
            <button onclick="window.print()" class="print-button">Print Recipe</button>
            <button onclick="saveAsPDF()" class="pdf-button">Save as PDF</button>
            <button onclick="shareRecipe()" class="share-button">Share Recipe</button>
        </div>
    `;
}

/**
 * Create a complete HTML page for the recipe print view
 */
function createRecipePrintPage(recipeName, formattedText) {
    return `
        <!DOCTYPE html>
        <html>
            <head>
                <title>${recipeName}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 40px;
                        color: #333;
                    }
                    h1 {
                        font-size: 28px;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                        text-align: center;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    h2 {
                        font-size: 22px;
                        margin: 30px 0 15px 0;
                        color: #444;
                        border-bottom: 1px solid #ddd;
                        padding-bottom: 5px;
                    }
                    .recipe-metadata {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 20px;
                        margin: 20px 0;
                        padding: 15px;
                        background: #f9f9f9;
                        border-radius: 8px;
                    }
                    .metadata-item {
                        text-align: center;
                    }
                    .metadata-item .label {
                        display: block;
                        font-weight: bold;
                        color: #666;
                        margin-bottom: 5px;
                    }
                    .metadata-item .value {
                        color: #333;
                    }
                    .recipe-intro {
                        font-style: italic;
                        margin: 20px 0;
                        color: #666;
                        line-height: 1.6;
                    }
                    .recipe-content {
                        margin-bottom: 40px;
                    }
                    .ingredients-list {
                        list-style-type: none !important;
                        padding-left: 0;
                        margin-bottom: 30px;
                    }
                    .ingredients-list li {
                        margin-bottom: 10px;
                        line-height: 1.4;
                        display: flex;
                        align-items: baseline;
                    }
                    .ingredients-list .quantity {
                        font-weight: bold;
                        margin-right: 10px;
                        min-width: 80px;
                    }
                    .instructions-list {
                        padding-left: 20px;
                        margin-bottom: 30px;
                    }
                    .instructions-list li {
                        margin-bottom: 15px;
                        line-height: 1.6;
                    }
                    .notes-list {
                        list-style-type: disc;
                        padding-left: 20px;
                        margin-bottom: 30px;
                    }
                    .notes-list li {
                        margin-bottom: 10px;
                        color: #666;
                    }
                    .recipe-images {
                        margin-top: 40px;
                        border-top: 2px solid #eee;
                        padding-top: 20px;
                    }
                    .image-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 20px;
                        margin-top: 20px;
                    }
                    .image-grid img {
                        width: 100%;
                        height: 300px;
                        object-fit: cover;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .recipe-actions {
                        display: flex;
                        gap: 15px;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                    }
                    .recipe-actions button {
                        padding: 10px 20px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: bold;
                        transition: background-color 0.2s;
                    }
                    .print-button {
                        background-color: #4CAF50;
                        color: white;
                    }
                    .pdf-button {
                        background-color: #2196F3;
                        color: white;
                    }
                    .share-button {
                        background-color: #9C27B0;
                        color: white;
                    }
                    .recipe-actions button:hover {
                        opacity: 0.9;
                    }
                    @media print {
                        .recipe-actions {
                            display: none;
                        }
                        .recipe-images {
                            break-before: always;
                        }
                        .image-grid img {
                            max-height: 250px;
                        }
                        .recipe-metadata {
                            background: none;
                            border: 1px solid #ddd;
                        }
                    }
                </style>
            </head>
            <body>
                <h1>${recipeName}</h1>
                ${formattedText}
                <script>
                    function saveAsPDF() {
                        window.print();
                    }
                    function shareRecipe() {
                        if (navigator.share) {
                            navigator.share({
                                title: '${recipeName}',
                                text: 'Check out this recipe!',
                                url: window.location.href
                            });
                        } else {
                            alert('Sharing is not supported on this browser');
                        }
                    }
                </script>
            </body>
        </html>
    `;
}

/**
 * Detect if a text is a recipe
 */
export function detectRecipe(text) {
    return isRecipe(text);
}

/**
 * Handle recipe-related functionality from message text
 */
export function handleRecipeRequest(messageText) {
    const patterns = getPatterns();
    if (patterns.recipe && patterns.recipe.forRecipe && patterns.recipe.forRecipe.test(messageText)) {
        return true;
    }
    if (messageText.toLowerCase().includes('recipe for') || 
        messageText.toLowerCase().includes('how to make') ||
        messageText.toLowerCase().includes('how do i make')) {
        return true;
    }
    return false;
} 