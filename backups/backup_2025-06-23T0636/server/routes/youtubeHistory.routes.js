const express = require('express');
const router = express.Router();
const YoutubeHistory = require('../models/YoutubeHistory');
const YouTubeSearch = require('../models/YoutubeHistory'); // Assuming this is the intended model

// GET history for a session
router.get('/list', async (req, res) => {
    try {
        // For now, we get all history. Later, this could be filtered by user/session.
        const history = await YoutubeHistory.find({})
            .sort({ timestamp: -1 })
            .limit(50); // Limit to last 50 queries

        // Also fetch which queries are "saved" (we'll define what 'saved' means, e.g., in a playlist)
        // This is a placeholder for a more complex check. For now, we can assume 'isSaved' is a property.
        const queries = history.map(item => ({
            query: item.query,
            displayName: item.query.replace(/\+/g, ' '),
            isSaved: item.isSaved || false, // Assuming a schema field `isSaved`
            lastSearched: item.timestamp
        }));
        
        res.json({ success: true, queries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST a new query to the history
router.post('/add', async (req, res) => {
    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ success: false, message: 'Missing query' });
    }

    try {
        // Use upsert to either create a new entry or update the timestamp of an existing one
        const result = await YoutubeHistory.findOneAndUpdate(
            { query },
            { $set: { timestamp: new Date() } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(201).json({ success: true, historyItem: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE a query from the history
router.delete('/delete/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const result = await YoutubeHistory.deleteOne({ query: decodeURIComponent(query) });
        
        if (result.deletedCount === 0) {
            return res.status(200).json({ success: true, message: 'Query not found, but operation successful.' });
        }
        res.status(200).json({ success: true, message: 'Query deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Save or "favorite" a query
router.post('/save', async (req, res) => {
    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ success: false, message: 'Missing query' });
    }

    try {
        const result = await YoutubeHistory.findOneAndUpdate(
            { query },
            { $set: { isSaved: true } },
            { new: true }
        );
        if (!result) {
            return res.status(404).json({ success: false, message: 'Query not found' });
        }
        res.json({ success: true, historyItem: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router; 