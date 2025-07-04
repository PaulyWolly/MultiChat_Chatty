const fs = require('fs');
const path = require('path');

const MEDIA_ROOT = 'S:/MEDIA/TV-SHOWS';
const OUTPUT_FILE = path.join(__dirname, '../server/data/media-library-tv-shows.json');
const SEASON_IMAGES_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/tmdb_tv-show_season_images.json');
const EPISODE_IMAGES_JSON = path.join(__dirname, '../public/components/MediaLibrary/data/tmdb_tv-show_episode_images.json');

function isVideoFile(filename) {
    const exts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];
    return exts.includes(path.extname(filename).toLowerCase());
}

function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const folders = [];
    const files = [];
    for (const entry of entries) {
        if (entry.isDirectory()) {
            folders.push(entry.name);
        } else if (entry.isFile() && isVideoFile(entry.name)) {
            files.push(entry.name);
        }
    }
    return { folders, files };
}

function walkMedia(dir, relPath = '', images = {}) {
    const absPath = path.join(dir, relPath);
    const { folders, files } = scanDirectory(absPath);
    const result = {
        path: relPath,
        folders: [],
        files: files.map(f => ({
            name: f,
            absPath: path.join(absPath, f),
            relPath: path.join(relPath, f)
        }))
    };
    for (const folder of folders) {
        result.folders.push(walkMedia(dir, path.join(relPath, folder), images));
    }
    // If this is a season folder, try to attach poster and episode stills
    // Assume structure: /Show Name/Season XX/
    const relParts = relPath.split(path.sep).filter(Boolean);
    if (relParts.length === 2) {
        const [showName, seasonFolder] = relParts;
        const seasonMatch = seasonFolder.match(/season[ _-]?(\d+)/i);
        if (seasonMatch) {
            const seasonNum = String(parseInt(seasonMatch[1], 10));
            if (images[showName] && images[showName].seasons && images[showName].seasons[seasonNum]) {
                const seasonData = images[showName].seasons[seasonNum];
                result.poster = seasonData.poster || null;
                // Attach stills to episodes by matching episode number in filename
                for (const fileObj of result.files) {
                    const epMatch = fileObj.name.match(/S\d+E(\d+)/i);
                    if (epMatch) {
                        const epNum = String(parseInt(epMatch[1], 10));
                        if (seasonData.episodes && seasonData.episodes[epNum]) {
                            fileObj.still = seasonData.episodes[epNum].still || null;
                        }
                    }
                }
            }
        }
    }
    return result;
}

function main() {
    console.log(`Scanning TV-SHOWS library at: ${MEDIA_ROOT}`);
    let seasonImages = {};
    let episodeImages = {};
    
    // Load season images
    try {
        seasonImages = JSON.parse(fs.readFileSync(SEASON_IMAGES_JSON, 'utf8'));
        console.log('✅ Loaded season images data');
    } catch (e) {
        console.warn('Could not load season images JSON:', e.message);
    }
    
    // Load episode images
    try {
        episodeImages = JSON.parse(fs.readFileSync(EPISODE_IMAGES_JSON, 'utf8'));
        console.log('✅ Loaded episode images data');
    } catch (e) {
        console.warn('Could not load episode images JSON:', e.message);
    }
    
    // Merge the image data
    const images = {};
    for (const showName in seasonImages) {
        images[showName] = { seasons: {} };
        if (seasonImages[showName].seasons) {
            for (const seasonNum in seasonImages[showName].seasons) {
                images[showName].seasons[seasonNum] = {
                    poster: seasonImages[showName].seasons[seasonNum].poster || null,
                    episodes: {}
                };
                
                // Add episode data if available
                if (episodeImages[showName] && 
                    episodeImages[showName].seasons && 
                    episodeImages[showName].seasons[seasonNum] &&
                    episodeImages[showName].seasons[seasonNum].episodes) {
                    images[showName].seasons[seasonNum].episodes = episodeImages[showName].seasons[seasonNum].episodes;
                }
            }
        }
    }
    
    const mediaTree = walkMedia(MEDIA_ROOT, '', images);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mediaTree, null, 2));
    console.log(`TV-SHOWS scan complete. Output written to: ${OUTPUT_FILE}`);
}

if (require.main === module) {
    main();
} 