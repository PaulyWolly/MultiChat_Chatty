// Fix print button creation
const fs = require('fs');

const appJsPath = 'app.js';
let content = fs.readFileSync(appJsPath, 'utf8');

// Find and replace the problematic print button code
const oldCode = `            // Add the buttons
            recipeButtons.innerHTML = \`
                <button style="
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    font-size: 20px;
                    padding: 0;
                    margin: 0;
                " onclick="printRecipe('\${messageContent.textContent.replace(/'/g, "\\\\'")}', this.closest('.message'))" title="Print Recipe">🖨️</button>
            \`;`;

const newCode = `            // Create print button safely without inline onclick
            const printButton = document.createElement('button');
            printButton.style.cssText = \`
                background: transparent;
                border: none;
                cursor: pointer;
                font-size: 20px;
                padding: 0;
                margin: 0;
            \`;
            printButton.title = 'Print Recipe';
            printButton.innerHTML = '🖨️';
            
            // Add event listener to avoid JavaScript parsing issues
            printButton.addEventListener('click', function() {
                const cleanText = messageContent.textContent || messageContent.innerText || '';
                console.log('Print button clicked with clean text length:', cleanText.length);
                printRecipe(cleanText, messageElement);
            });
            
            recipeButtons.appendChild(printButton);`;

// Replace the code
const updatedContent = content.replace(oldCode, newCode);

if (updatedContent !== content) {
    fs.writeFileSync(appJsPath, updatedContent);
    console.log('Successfully fixed print button creation!');
} else {
    console.log('Could not find the target code to replace.');
} 