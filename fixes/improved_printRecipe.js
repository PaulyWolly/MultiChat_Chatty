// =====================================================
// IMPROVED RECIPE HANDLING FUNCTIONS
// =====================================================

window.printRecipe = async function(recipeText, messageElement) {
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
        
        // Split the recipe text into sections
        const sections = recipeText.split(/(?:ingredients:|instructions:|directions:)/i);
        
        const description = sections[0]
            .split('\n')[0]
            .substring(recipeName.length)
            .replace(/^[^a-zA-Z]+/, '')
            .trim();

        // Improved parsing for ingredients and instructions
        let ingredients = [];
        let instructions = [];

        // Find ingredients section more robustly
        const ingredientsMatch = recipeText.match(/ingredients:\s*([\s\S]*?)(?:instructions:|directions:|$)/i);
        if (ingredientsMatch) {
            ingredients = ingredientsMatch[1]
                .split(/\n/)
                .map(item => item.replace(/^\d+\.\s*/, '').trim())
                .filter(item => item.length > 0 && !item.match(/^instructions:|^directions:/i));
        }

        // Find instructions section more robustly
        const instructionsMatch = recipeText.match(/(?:instructions:|directions:)\s*([\s\S]*?)$/i);
        if (instructionsMatch) {
            instructions = instructionsMatch[1]
                .split(/\n/)
                .map(item => item.replace(/^\d+\.\s*/, '').trim())
                .filter(item => item.length > 0);
        }

        // Create print window
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            throw new Error('Pop-up blocked. Please allow pop-ups and try again.');
        }

        // Enhanced print content with better formatting
        const printContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>${recipeName} - Recipe</title>
                    <style>
                        body {
                            font-family: 'Georgia', 'Times New Roman', serif;
                            line-height: 1.6;
                            padding: 40px;
                            max-width: 800px;
                            margin: 0 auto;
                            color: #333;
                        }
                        
                        h1 {
                            color: #2c3e50;
                            border-bottom: 3px solid #3498db;
                            padding-bottom: 10px;
                            margin-bottom: 20px;
                            text-align: center;
                        }
                        
                        h2 {
                            color: #34495e;
                            margin-top: 30px;
                            margin-bottom: 15px;
                            border-left: 4px solid #3498db;
                            padding-left: 15px;
                        }
                        
                        .description {
                            font-style: italic;
                            color: #666;
                            margin-bottom: 30px;
                            text-align: center;
                            font-size: 1.1em;
                        }
                        
                        ul, ol {
                            margin: 0;
                            padding-left: 25px;
                        }
                        
                        li {
                            margin-bottom: 8px;
                            line-height: 1.5;
                        }
                        
                        .ingredients {
                            background: #f8f9fa;
                            padding: 20px;
                            border-radius: 8px;
                            margin-bottom: 30px;
                        }
                        
                        .instructions {
                            margin-bottom: 30px;
                        }
                        
                        .recipe-images {
                            margin-top: 30px;
                            text-align: center;
                        }
                        
                        .recipe-images img {
                            max-width: 200px;
                            max-height: 200px;
                            object-fit: cover;
                            border-radius: 8px;
                            margin: 10px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        }
                        
                        @media print {
                            body {
                                padding: 20px;
                            }
                            
                            .recipe-images img {
                                max-width: 150px;
                                max-height: 150px;
                            }
                        }
                        
                        @page {
                            margin: 1in;
                        }
                    </style>
                </head>
                <body>
                    <h1>${recipeName}</h1>
                    
                    ${description ? `<div class="description">${description}</div>` : ''}
                    
                    ${ingredients.length > 0 ? `
                        <div class="ingredients">
                            <h2>🥄 Ingredients</h2>
                            <ul>
                                ${ingredients.map(ingredient => `<li>${ingredient}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    ${instructions.length > 0 ? `
                        <div class="instructions">
                            <h2>👩‍🍳 Instructions</h2>
                            <ol>
                                ${instructions.map(instruction => `<li>${instruction}</li>`).join('')}
                            </ol>
                        </div>
                    ` : ''}
                    
                    ${imageUrls.length > 0 ? `
                        <div class="recipe-images">
                            <h2>📸 Images</h2>
                            ${imageUrls.map(url => `<img src="${url}" alt="Recipe image" onerror="this.style.display='none'">`).join('')}
                        </div>
                    ` : ''}
                    
                    <div style="margin-top: 40px; text-align: center; color: #999; font-size: 0.9em;">
                        Generated by MultiChat Chatty • ${new Date().toLocaleDateString()}
                    </div>
                </body>
            </html>
        `;

        // Write content and set up printing
        printWindow.document.write(printContent);
        printWindow.document.close();

        // Wait for images to load before printing
        printWindow.onload = function() {
            // Small delay to ensure everything is rendered
            setTimeout(() => {
                printWindow.print();
                printWindow.onafterprint = function() {
                    printWindow.close();
                };
            }, 500);
        };

    } catch (error) {
        console.error('Error printing recipe:', error);
        alert(`Failed to print recipe: ${error.message}`);
    }
};

function printRecipe(recipeText, messageElement) {
    // Call the async version
    window.printRecipe(recipeText, messageElement);
} 