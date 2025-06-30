const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TV_SHOWS_DIR = 'S:/MEDIA/TV-SHOWS/';
const DATA_DIR = path.join(__dirname, '../public/components/MediaLibrary/data');
const OUTPUT_JSON = path.join(DATA_DIR, 'season_episode_images.json');
const OVERRIDES_PATH = path.join(DATA_DIR, 'season_episode_tmdb_overrides.json');

if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env');
    process.exit(1);
}

function cleanShowName(name) {
    // Remove year in parentheses, brackets, or after dash
    return name
        .replace(/\(\d{4}\)/, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\d{4}/, '')
        .replace(/\b(720p|1080p|2160p|4k|bluray|brrip|web-dl|web|hdtv|dvdrip|yify|x264|x265|aac|mp3|dts|eac3|ac3|flac|truehd|atmos|10bit|5\.1|7\.1|yts|yts\.mx|yts\.ag|yts\.am|rarbg|hdrip|bdrip|repack|extended|remastered|uncut|proper|limited|internal|dual|audio|subs|eng|ita|spa|fre|ger|rus|jpn|kor|chi|fr|es|de|ru|jp|kr|cn|mx|am|ag|lt|gaz|bokutox|lama|ptp|h264|h265|hevc|web-dl|webdl|web-rip|webrip|dvdr|dvdscr|dvdscreener|cam|ts|tc|r5|scr|unrated|director.s.cut|remux|criterion|multi|multi.audio|multi.subs|multi.language|multi.lang|fixed|amzn|dd|h.264|playweb)\b/gi, '')
        .replace(/[._-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function loadOverrides() {
    if (!fs.existsSync(OVERRIDES_PATH)) {
        fs.writeFileSync(OVERRIDES_PATH, JSON.stringify({
            // Example:
            // "Chuck (2010)": 84947
        }, null, 2));
        return {};
    }
    return JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
}

async function searchTMDBShow(showName, overrideId) {
    if (overrideId) return overrideId;
    const url = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(showName)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
        return data.results[0].id;
    }
    return null;
}

async function fetchSeasonPoster(tvId, seasonNumber) {
    const url = `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null;
}

async function fetchEpisodeStill(tvId, seasonNumber, episodeNumber) {
    const url = `https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.still_path ? `https://image.tmdb.org/t/p/w500${data.still_path}` : null;
}

async function main() {
    const shows = fs.readdirSync(TV_SHOWS_DIR, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    const overrides = loadOverrides();
    const result = {};
    for (const showName of shows) {
        const cleanedName = cleanShowName(showName);
        const overrideId = overrides[showName] || overrides[cleanedName];
        console.log(`🔍 Searching TMDB for: ${showName} (cleaned: ${cleanedName})${overrideId ? ' [override]' : ''}`);
        const tvId = await searchTMDBShow(cleanedName, overrideId);
        if (!tvId) {
            console.log(`❌ No TMDB match for: ${showName}`);
            continue;
        }
        result[showName] = { seasons: {} };
        // Guess season folders (Season 1, Season 2, ...)
        const showPath = path.join(TV_SHOWS_DIR, showName);
        const seasonFolders = fs.readdirSync(showPath, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
        for (const seasonFolder of seasonFolders) {
            const match = seasonFolder.match(/season[ _-]?(\d+)/i);
            if (!match) continue;
            const seasonNumber = parseInt(match[1], 10);
            if (!seasonNumber) continue;
            const posterUrl = await fetchSeasonPoster(tvId, seasonNumber);
            result[showName].seasons[seasonNumber] = { poster: posterUrl, episodes: {} };
            // Guess episode files (S01E01, etc.)
            const seasonPath = path.join(showPath, seasonFolder);
            const files = fs.readdirSync(seasonPath).filter(f => /\.(mp4|mkv|avi|mov)$/i.test(f));
            for (const file of files) {
                const epMatch = file.match(/E(\d{2})/i);
                if (!epMatch) continue;
                const episodeNumber = parseInt(epMatch[1], 10);
                if (!episodeNumber) continue;
                const stillUrl = await fetchEpisodeStill(tvId, seasonNumber, episodeNumber);
                result[showName].seasons[seasonNumber].episodes[episodeNumber] = { still: stillUrl };
            }
        }
    }
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2));
    console.log(`\n🎉 Done! Season and episode images saved to ${OUTPUT_JSON}`);
    console.log(`📝 [TMDB-OVERRIDES] Manual overrides: ${OVERRIDES_PATH}`);
}

main(); 