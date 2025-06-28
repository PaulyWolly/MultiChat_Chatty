require('dotenv').config();
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const MOVIE_DIR = 'S:/MEDIA/movies/';
const DATA_DIR = path.join(__dirname, '../public/components/MediaLibrary/data');
const OUTPUT_JSON = path.join(DATA_DIR, 'movie_posters.json');
const OVERRIDES_PATH = path.join(__dirname, '../public/components/MediaLibrary/data/poster_overrides.json');

if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env');
    process.exit(1);
}

const VIDEO_EXTS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];

function isVideoFile(filename) {
    return VIDEO_EXTS.includes(path.extname(filename).toLowerCase());
}

function scanDir(dir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(scanDir(fullPath));
        } else if (entry.isFile() && isVideoFile(entry.name)) {
            results.push(fullPath);
        }
    }
    return results;
}

function cleanTitle(filename) {
    let name = path.basename(filename, path.extname(filename));

    // Replace dots and underscores with spaces
    name = name.replace(/[._]/g, ' ');

    // Remove year and anything after (optional, but helps with extra tags)
    name = name.replace(/\b(19|20)\d{2}\b.*/g, '');

    // Remove common technical tags, codecs, groups, and release info
    name = name.replace(/\b(720p|1080p|2160p|4k|bluray|brrip|web-dl|web|hdtv|dvdrip|yify|x264|x265|aac|mp3|dts|eac3|ac3|flac|truehd|atmos|10bit|5\\.1|7\\.1|yts|yts\\.mx|yts\\.ag|yts\\.am|rarbg|hdrip|bdrip|repack|extended|remastered|uncut|proper|limited|internal|dual|audio|subs|eng|ita|spa|fre|ger|rus|jpn|kor|chi|fr|es|de|ru|jp|kr|cn|mx|am|ag|lt|gaz|bokutox|lama|ptp|h264|h265|hevc|web-dl|webdl|web-rip|webrip|dvdr|dvdscr|dvdscreener|cam|ts|tc|r5|scr|unrated|director.s.cut|remux|criterion|multi|multi.audio|multi.subs|multi.language|multi.lang|fixed|amzn|dd|h.264|playweb)\\b/gi, '');

    // Remove extra spaces and non-word chars
    name = name.replace(/\\W+/g, ' ');
    name = name.replace(/\\s+/g, ' ').trim();

    return name;
}

function extractYear(str) {
    const match = str.match(/(19|20)\d{2}/);
    return match ? match[0] : null;
}

function cleanName(str) {
    return str
        .replace(/\.[^/.]+$/, "")
        .replace(/\[[^\]]*\]|\([^\)]*\)/g, "")
        .replace(/\b(19|20)\d{2}\b/g, "")
        .replace(/[._-]+/g, " ")
        .replace(/\s+/g, " ").trim();
}

function loadOverrides() {
    if (!fs.existsSync(OVERRIDES_PATH)) {
        fs.writeFileSync(OVERRIDES_PATH, JSON.stringify({
            // Example:
            // "S:\\MEDIA\\MOVIES\\About Time (2013) [1080p] [BluRay]\\About.Time.2013.1080p.BluRay.x264.YIFY.mp4": 222935
        }, null, 2));
        return {};
    }
    return JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
}

async function fetchPosterById(tmdbId) {
    const url = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.poster_path) {
        return `https://image.tmdb.org/t/p/w500${data.poster_path}`;
    }
    return null;
}

async function fetchPosterBySearch(name, year) {
    let url = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`;
    if (year) url += `&year=${year}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
        return `https://image.tmdb.org/t/p/w500${data.results[0].poster_path}`;
    }
    return null;
}

async function main() {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    console.log('🔍 Scanning for movie files...');
    const files = scanDir(MOVIE_DIR);
    console.log(`Found ${files.length} movie files.`);
    const overrides = loadOverrides();
    const posters = {};
    let processed = 0;
    for (const file of files) {
        processed++;
        const title = cleanTitle(file);
        const year = extractYear(path.basename(file));
        const clean = cleanName(path.basename(file));
        let posterUrl = null;
        // Check override first
        if (overrides[file]) {
            console.log(`🟡 [OVERRIDE] Using TMDb ID ${overrides[file]} for ${path.basename(file)}`);
            posterUrl = await fetchPosterById(overrides[file]);
        } else {
            posterUrl = await fetchPosterBySearch(clean, year);
        }
        if (posterUrl) {
            posters[file] = posterUrl;
            console.log(`✅ [POSTER] ${path.basename(file)} => ${posterUrl}`);
        } else {
            console.log(`❌ [POSTER] No poster found for ${path.basename(file)}`);
        }
    }
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(posters, null, 2));
    console.log(`\n🎉 Done! Posters saved to ${OUTPUT_JSON}`);
    console.log(`📝 [TMDB-POSTERS] Manual overrides: ${OVERRIDES_PATH}`);
}

main(); 
})(); 