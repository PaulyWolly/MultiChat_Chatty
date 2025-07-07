// fetch_movie_descriptions_from_tmdb.js
// Script to fetch movie descriptions from TMDB for all movies in the library
// Usage: node scripts/fetch_movie_descriptions_from_tmdb.js

require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Load TMDB API key from config
let TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_API_KEY) {
  try {
    const config = require('../config/config.js');
    TMDB_API_KEY = config.TMDB_API_KEY || config.tmdbApiKey;
  } catch (e) {
    console.error('Could not load TMDB API key from config. Set TMDB_API_KEY in env or config.js');
    process.exit(1);
  }
}
if (!TMDB_API_KEY) {
  console.error('TMDB API key not found.');
  process.exit(1);
}

const MOVIES_JSON = path.join(__dirname, '../server/data/media-library-movies.json');
const OUTPUT_JSON = path.join(__dirname, '../server/data/movie_descriptions.json');
const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/movie';
const TMDB_MOVIE_URL = 'https://api.themoviedb.org/3/movie';

function cleanTitle(title) {
  // Remove year, resolution, and extra info from title
  return title.replace(/\([0-9]{4}\)/, '').replace(/\[[^\]]*\]/g, '').replace(/\s{2,}/g, ' ').trim();
}

async function fetchDescription(title, year) {
  // 1. Search for the movie
  const url = `${TMDB_SEARCH_URL}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}${year ? `&year=${year}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB search failed for ${title}`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) return null;
  const movie = data.results[0];
  // 2. Get full details (for best description)
  const detailsRes = await fetch(`${TMDB_MOVIE_URL}/${movie.id}?api_key=${TMDB_API_KEY}`);
  if (!detailsRes.ok) return movie.overview || null;
  const details = await detailsRes.json();
  return details.overview || movie.overview || null;
}

function collectMoviesFromFolders(folder, arr) {
  if (folder.files && folder.files.length > 0) {
    folder.files.forEach(file => {
      arr.push({
        title: folder.path, // folder name contains title and year
        fileName: file.name,
        absPath: file.absPath,
        relPath: file.relPath
      });
    });
  }
  if (folder.folders && folder.folders.length > 0) {
    folder.folders.forEach(sub => collectMoviesFromFolders(sub, arr));
  }
}

(async () => {
  const moviesObj = JSON.parse(fs.readFileSync(MOVIES_JSON, 'utf8'));
  const movieArr = [];
  collectMoviesFromFolders(moviesObj, movieArr);
  const results = {};
  for (const movie of movieArr) {
    const rawTitle = movie.title || '';
    const yearMatch = rawTitle.match(/\((\d{4})\)/);
    const year = yearMatch ? yearMatch[1] : '';
    const title = cleanTitle(rawTitle);
    process.stdout.write(`Fetching: ${title}${year ? ' (' + year + ')' : ''} ... `);
    try {
      const description = await fetchDescription(title, year);
      results[movie.absPath || movie.relPath || rawTitle] = {
        title: rawTitle,
        year,
        description: description || ''
      };
      console.log('OK');
    } catch (err) {
      results[movie.absPath || movie.relPath || rawTitle] = {
        title: rawTitle,
        year,
        description: ''
      };
      console.log('FAILED');
    }
    await new Promise(r => setTimeout(r, 300));
  }
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\nDone. Descriptions saved to ${OUTPUT_JSON}`);
})(); 