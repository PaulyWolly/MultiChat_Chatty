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

    // Check for duplicate videoId
    if (playlist.videos.some(v => v.videoId === videoId)) {
      return res.status(409).json({ error: 'DUPLICATE_VIDEO' });
    }

    playlist.videos.unshift({ videoId, title, thumbnail });
    await playlist.save();
    res.json({ success: true, playlist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add video to playlist' });
  }
});

// Remove a video from a playlist
router.delete('/:playlistId/videos/:videoEntryId', requireAuth, async (req, res) => {
  try {
    const playlist = await Playlist.findOne({ 
      _id: req.params.playlistId, 
      userId: req.userId 
    });
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    playlist.videos = playlist.videos.filter(v => v._id.toString() !== req.params.videoEntryId);
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
    const { videoEntryId, targetPlaylistId } = req.body;
    if (!videoEntryId || !targetPlaylistId) {
      return res.status(400).json({ error: 'Video entry ID and target playlist ID required' });
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

    const video = sourcePlaylist.videos.id(videoEntryId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found in source playlist' });
    }

    sourcePlaylist.videos = sourcePlaylist.videos.filter(v => v._id.toString() !== videoEntryId);
    targetPlaylist.videos.unshift(video);

    await Promise.all([sourcePlaylist.save(), targetPlaylist.save()]);
    res.json({ success: true, sourcePlaylist, targetPlaylist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to move video' });
  }
});

// Delete a playlist
router.delete('/:playlistId', requireAuth, async (req, res) => {
  try {
    const playlist = await Playlist.findOneAndDelete({ _id: req.params.playlistId, userId: req.userId });
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// Rename a video title in a playlist
router.put('/:playlistId/videos/:videoEntryId/title', requireAuth, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'New title required' });

    const playlist = await Playlist.findOne({ _id: req.params.playlistId, userId: req.userId });
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const video = playlist.videos.id(req.params.videoEntryId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found in playlist' });
    }

    video.title = title;
    await playlist.save();
    res.json({ success: true, playlist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rename video title' });
  }
});

module.exports = router; 