/*
  FETCH_TMDB_TV-SHOW_EPISODE_IMAGES.JS
  Version: 5
  AppName: MultiChat_Chatty [v5]
  Updated: 7/5/2025 @8:45PM
  Created by Paul Welby
*/

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TV_SHOWS_DIR = 'S:/MEDIA/TV-SHOWS/';
const DATA_DIR = path.join(__dirname, '../public/components/MediaLibrary/data');
const OUTPUT_JSON = path.join(DATA_DIR, 'tmdb_tv-show_episode_images.json');
const OVERRIDES_PATH = path.join(DATA_DIR, 'episode_tmdb_tv-show_overrides.json');

if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env');
    process.exit(1);
}

function cleanShowName(name) {
    return name
        .replace(/\(\d{4}\)/, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\d{4}/, '')
        .replace(/[._-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function loadOverrides() {
    if (!fs.existsSync(OVERRIDES_PATH)) {
        fs.writeFileSync(OVERRIDES_PATH, JSON.stringify({}, null, 2));
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
    
    let showsFound = 0;
    let totalEpisodes = 0;
    let episodesWithStills = 0;
    
    console.log(`🎬 Starting TV show episode still fetch for ${shows.length} shows...\n`);
    
    for (const showName of shows) {
        const cleanedName = cleanShowName(showName);
        const overrideId = overrides[showName] || overrides[cleanedName];
        console.log(`🔍 Searching TMDB for: ${showName} (cleaned: ${cleanedName})${overrideId ? ' [override]' : ''}`);
        
        const tvId = await searchTMDBShow(cleanedName, overrideId);
        if (!tvId) {
            console.log(`❌ No TMDB match for: ${showName}`);
            continue;
        }
        
        console.log(`✅ Found TMDB match for: ${showName} (ID: ${tvId})`);
        showsFound++;
        
        result[showName] = { seasons: {} };
        const showPath = path.join(TV_SHOWS_DIR, showName);
        const seasonFolders = fs.readdirSync(showPath, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
        
        let showEpisodes = 0;
        let showEpisodesWithStills = 0;
        
        for (const seasonFolder of seasonFolders) {
            const match = seasonFolder.match(/season[ _-]?(\d+)/i);
            if (!match) continue;
            const seasonNumber = parseInt(match[1], 10);
            if (!seasonNumber) continue;
            
            result[showName].seasons[seasonNumber] = { episodes: {} };
            const seasonPath = path.join(showPath, seasonFolder);
            const files = fs.readdirSync(seasonPath).filter(f => /\.(mp4|mkv|avi|mov|m4v)$/i.test(f));
            
            let seasonEpisodes = 0;
            let seasonEpisodesWithStills = 0;
            
            for (const file of files) {
                const epMatch = file.match(/E(\d{2})/i);
                if (!epMatch) continue;
                const episodeNumber = parseInt(epMatch[1], 10);
                if (!episodeNumber) continue;
                
                showEpisodes++;
                totalEpisodes++;
                seasonEpisodes++;
                
                console.log(`   📺 Fetching S${seasonNumber}E${episodeNumber.toString().padStart(2, '0')} still...`);
                const stillUrl = await fetchEpisodeStill(tvId, seasonNumber, episodeNumber);
                result[showName].seasons[seasonNumber].episodes[episodeNumber] = { still: stillUrl };
                
                if (stillUrl) {
                    console.log(`   ✅ S${seasonNumber}E${episodeNumber.toString().padStart(2, '0')} still found: ${stillUrl.split('/').pop()}`);
                    showEpisodesWithStills++;
                    episodesWithStills++;
                    seasonEpisodesWithStills++;
                } else {
                    console.log(`   ❌ S${seasonNumber}E${episodeNumber.toString().padStart(2, '0')} still not available`);
                }
            }
            
            if (seasonEpisodes > 0) {
                console.log(`   📊 Season ${seasonNumber}: ${seasonEpisodesWithStills}/${seasonEpisodes} episodes have stills`);
            }
        }
        
        if (showEpisodes > 0) {
            console.log(`   📊 ${showName}: ${showEpisodesWithStills}/${showEpisodes} episodes have stills\n`);
        } else {
            console.log(`   ⚠️  ${showName}: No episode files found\n`);
        }
    }
    
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(result, null, 2));
    
    console.log(`\n🎉 Episode still fetch complete!`);
    console.log(`📊 Summary:`);
    console.log(`   • Shows processed: ${shows.length}`);
    console.log(`   • Shows found on TMDB: ${showsFound}`);
    console.log(`   • Total episodes: ${totalEpisodes}`);
    console.log(`   • Episodes with stills: ${episodesWithStills}`);
    console.log(`   • Success rate: ${totalEpisodes > 0 ? ((episodesWithStills / totalEpisodes) * 100).toFixed(1) : 0}%`);
    console.log(`📄 Data saved to: ${OUTPUT_JSON}`);
    console.log(`📝 Manual overrides: ${OVERRIDES_PATH}`);
}

main(); 