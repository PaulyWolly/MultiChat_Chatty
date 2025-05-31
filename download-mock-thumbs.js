const fs = require('fs');
const path = require('path');
const https = require('https');

// Get number of images from command line, default to 36
const numThumbnails = parseInt(process.argv[2], 10) || 36;
// Optional: allow output directory as second argument
const outDir = process.argv[3] || path.join(__dirname, '..', 'public', 'assets', 'img', 'mock');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Download mock thumbnails
async function downloadMockThumbnails() {
    const baseUrl = 'https://placehold.co/320x180.png?text=Mock+';

    for (let i = 1; i <= numThumbnails; i++) {
        const filepath = path.join(outDir, `thumb${i}.png`);
        const url = `${baseUrl}${i}`;

        await new Promise((resolve, reject) => {
            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download thumbnail ${i}: ${response.statusCode}`));
                    return;
                }

                const file = fs.createWriteStream(filepath);
                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    console.log(`Downloaded thumbnail ${i}`);
                    resolve();
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }
}

// Run the download
downloadMockThumbnails()
    .then(() => console.log(`All ${numThumbnails} mock thumbnails downloaded successfully to ${outDir}!`))
    .catch(err => console.error('Error downloading thumbnails:', err));
