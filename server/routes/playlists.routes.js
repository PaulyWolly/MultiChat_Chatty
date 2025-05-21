const express = require('express');
const Playlist = require('../models/Playlist');

const router = express.Router();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) {
    return res.status(401).json({ error: 'No session ID provided' });
  }
  req.userId = sessionId;
  next();
};

// List all playlists for the user
router.get('/', requireAuth, async (req, res) => {
  try {
    const playlists = await Playlist.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, playlists });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// Create a new playlist
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Playlist name required' });
    
    const playlist = new Playlist({ 
      userId: req.userId, 
      name, 
      videos: [] 
    });
    await playlist.save();
    res.json({ success: true, playlist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Add a video to a playlist
router.post('/:playlistId/videos', requireAuth, async (req, res) => {
  try {
    const { videoId, title, thumbnail } = req.body;
    if (!videoId || !title || !thumbnail) {
      return res.status(400).json({ error: 'Missing video data' });
    }

    const playlist = await Playlist.findOne({ 
      _id: req.params.playlistId, 
      userId: req.userId 
    });
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    playlist.videos.unshift({ videoId, title, thumbnail });
    await playlist.save();
    res.json({ success: true, playlist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add video to playlist' });
  }
});

// Remove a video from a playlist
router.delete('/:playlistId/videos/:videoId', requireAuth, async (req, res) => {
  try {
    const playlist = await Playlist.findOne({ 
      _id: req.params.playlistId, 
      userId: req.userId 
    });
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    playlist.videos = playlist.videos.filter(v => v.videoId !== req.params.videoId);
    await playlist.save();
    res.json({ success: true, playlist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove video from playlist' });
  }
});

// Rename a playlist
router.put('/:playlistId', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'New name required' });

    const playlist = await Playlist.findOne({ 
      _id: req.params.playlistId, 
      userId: req.userId 
    });
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    playlist.name = name;
    await playlist.save();
    res.json({ success: true, playlist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename playlist' });
  }
});

// Move video between playlists
router.post('/:playlistId/move', requireAuth, async (req, res) => {
  try {
    const { videoId, targetPlaylistId } = req.body;
    if (!videoId || !targetPlaylistId) {
      return res.status(400).json({ error: 'Video ID and target playlist ID required' });
    }

    const sourcePlaylist = await Playlist.findOne({ 
      _id: req.params.playlistId, 
      userId: req.userId 
    });
    
    const targetPlaylist = await Playlist.findOne({ 
      _id: targetPlaylistId, 
      userId: req.userId 
    });

    if (!sourcePlaylist || !targetPlaylist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const video = sourcePlaylist.videos.find(v => v.videoId === videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found in source playlist' });
    }

    sourcePlaylist.videos = sourcePlaylist.videos.filter(v => v.videoId !== videoId);
    targetPlaylist.videos.unshift(video);

    await Promise.all([sourcePlaylist.save(), targetPlaylist.save()]);
    res.json({ success: true, sourcePlaylist, targetPlaylist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to move video' });
  }
});

module.exports = router; 