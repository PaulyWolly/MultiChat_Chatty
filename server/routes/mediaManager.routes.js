/*
  MEDIAMANAGER.ROUTES.JS
  Version: 1
  AppName: MultiChat_Chatty [v7]
  Created by AI for MediaManager modal backend
*/

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const TMDBPosterService = require('../services/TMDBPosterService');
const config = require('../../config/config');
const fs = require('fs');
const path = require('path');

const TMDB_API_KEY = process.env.TMDB_API_KEY || config.TMDB_API_KEY || config.tmdbApiKey;
const TMDB_MOVIE_URL = 'https://api.themoviedb.org/3/movie';
const TMDB_TV_URL = 'https://api.themoviedb.org/3/tv';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const MOVIES_JSON = path.join(__dirname, '../data/media-library-movies.json');
const TV_JSON = path.join(__dirname, '../data/media-library-tv-shows.json');
const MOVIE_CAST_JSON = path.join(__dirname, '../../public/data/movie_cast.json');
const MOVIE_DESC_JSON = path.join(__dirname, '../../public/data/movie_descriptions.json');

// GET /api/media/unconfigured
router.get('/api/media/unconfigured', (req, res) => {
  try {
    const { type } = req.query;
    if (!type || (type !== 'movie' && type !== 'tv')) {
      return res.status(400).json({ success: false, error: 'Invalid or missing type (movie|tv)' });
    }
    const mediaJsonPath = type === 'movie' ? MOVIES_JSON : TV_JSON;
    const mediaData = JSON.parse(fs.readFileSync(mediaJsonPath, 'utf8'));
    const folders = mediaData.library && Array.isArray(mediaData.library.folders)
      ? mediaData.library.folders : (Array.isArray(mediaData.folders) ? mediaData.folders : []);
    // For now, just return all folders (can filter for unconfigured later)
    return res.json({ success: true, items: folders });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/media/fetch-tmdb
router.post('/fetch-tmdb', async (req, res) => {
  try {
    console.log('[TMDB FETCH] Request:', req.body);
    const { type, title, tmdbId } = req.body;
    if (!type || (type !== 'movie' && type !== 'tv')) {
      return res.status(400).json({ success: false, error: 'Invalid or missing type (movie|tv)' });
    }
    if (!title && !tmdbId) {
      return res.status(400).json({ success: false, error: 'Must provide title or tmdbId' });
    }
    if (tmdbId) {
      // Fetch by TMDB ID (full details)
      const url = type === 'movie'
        ? `${TMDB_MOVIE_URL}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits`
        : `${TMDB_TV_URL}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
      console.log('[TMDB FETCH] URL:', url);
      const response = await fetch(url);
      const tmdbData = await response.json();
      console.log('[TMDB FETCH] Response:', tmdbData);
      if (!response.ok) throw new Error('TMDB fetch failed');
      const poster = tmdbData.poster_path ? `${TMDB_IMAGE_BASE}${tmdbData.poster_path}` : null;
      const description = tmdbData.overview || '';
      const cast = tmdbData.credits && tmdbData.credits.cast
        ? tmdbData.credits.cast.slice(0, 12).map(actor => ({
            name: actor.name,
            character: actor.character,
            profile: actor.profile_path ? `${TMDB_IMAGE_BASE}${actor.profile_path}` : null
          }))
        : [];
      return res.json({
        success: true,
        data: {
          tmdbId: tmdbData.id,
          title: tmdbData.title || tmdbData.name || '',
          year: (tmdbData.release_date || tmdbData.first_air_date || '').slice(0,4),
          poster,
          description,
          cast
        }
      });
    } else {
      // Search by title (return multiple matches for user selection)
      let results = [];
      if (type === 'movie') {
        console.log('[TMDB SEARCH] Calling searchMovieOptions with:', title);
        results = await TMDBPosterService.searchMovieOptions(title);
        console.log('[TMDB SEARCH] Results:', results);
        results = results.map(m => ({
          tmdbId: m.id,
          title: m.title,
          year: m.year,
          poster: m.poster_url,
          description: m.overview,
          vote_average: m.vote_average
        }));
      } else {
        console.log('[TMDB SEARCH] Calling searchTVShowOptions with:', title);
        results = await TMDBPosterService.searchTVShowOptions(title);
        console.log('[TMDB SEARCH] Results:', results);
        results = results.map(m => ({
          tmdbId: m.id,
          title: m.name,
          year: m.year,
          poster: m.poster_url,
          description: m.overview,
          vote_average: m.vote_average
        }));
      }
      if (!results.length) {
        return res.status(404).json({ success: false, error: 'No results found on TMDB' });
      }
      return res.json({ success: true, results });
    }
  } catch (err) {
    console.error('[TMDB FETCH] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/media/save
router.post('/save', (req, res) => {
  try {
    const { type, absPath, poster, description, cast, title, year } = req.body;
    if (!type || (type !== 'movie' && type !== 'tv')) {
      return res.status(400).json({ success: false, error: 'Invalid or missing type (movie|tv)' });
    }
    if (!absPath) {
      return res.status(400).json({ success: false, error: 'Missing absPath' });
    }
    
    // Save under ONE key: the full absPath
    console.log('[MEDIA SAVE] Saving under key:', absPath);
    
    // Save description
    let descData = {};
    if (fs.existsSync(MOVIE_DESC_JSON)) descData = JSON.parse(fs.readFileSync(MOVIE_DESC_JSON, 'utf8'));
    if (!descData[absPath]) descData[absPath] = {};
    descData[absPath].title = title || '';
    descData[absPath].year = year || '';
    descData[absPath].description = description || '';
    fs.writeFileSync(MOVIE_DESC_JSON, JSON.stringify(descData, null, 2));
    
    // Save cast
    let castData = {};
    if (fs.existsSync(MOVIE_CAST_JSON)) castData = JSON.parse(fs.readFileSync(MOVIE_CAST_JSON, 'utf8'));
    castData[absPath] = { 
      title: title || '', 
      year: year || '', 
      cast: cast || [] 
    };
    fs.writeFileSync(MOVIE_CAST_JSON, JSON.stringify(castData, null, 2));
    
    console.log('[MEDIA SAVE] Saved data under key:', absPath);
    
    // Poster saving would be handled elsewhere (file copy/upload), but can store poster URL/path here if needed
    return res.json({ success: true, keySaved: absPath });
  } catch (err) {
    console.error('[MEDIA SAVE] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/media/bulk-update
router.post('/api/media/bulk-update', async (req, res) => {
  // For now, just return a stub response
  return res.json({ success: true, message: 'Bulk update started (not yet implemented)' });
});

// POST /api/media/validate-path
router.post('/api/media/validate-path', (req, res) => {
  try {
    const { path: mediaPath, type } = req.body;
    if (!mediaPath) return res.status(400).json({ success: false, error: 'Missing path' });
    // Basic regex for movie: /<name> (<year>) [setting]/movie.name.(year).[setting].ext
    let valid = false;
    if (type === 'movie') {
      valid = /.+ \(\d{4}\) \[.+\]\/[^\/]+\.(mp4|mkv|avi|mov)$/i.test(mediaPath);
    } else if (type === 'tv') {
      // Example: /<show>/Season 01/S01E01.ext
      valid = /.+\/Season \d{2}\/S\d{2}E\d{2}\.(mp4|mkv|avi|mov)$/i.test(mediaPath);
    }
    return res.json({ success: true, valid });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router; 