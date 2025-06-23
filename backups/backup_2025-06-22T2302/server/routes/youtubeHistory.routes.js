const express = require('express');
const router = express.Router();
const YoutubeHistory = require('../models/YoutubeHistory');

// GET history for a session
router.get('/:sessionId', async (req, res) => {
    try {
        const history = await YoutubeHistory.find({ sessionId: req.params.sessionId })
            .sort({ timestamp: -1 })
            .limit(20);
        res.json(history.map(item => item.query));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST a new query to the history
router.post('/', async (req, res) => {
    const { sessionId, query } = req.body;
    if (!sessionId || !query) {
        return res.status(400).json({ message: 'Missing sessionId or query' });
    }

    try {
        // Use upsert to either create a new entry or update the timestamp of an existing one
        const result = await YoutubeHistory.findOneAndUpdate(
            { sessionId, query },
            { $set: { timestamp: new Date() } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.status(201).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE a query from the history
router.delete('/:sessionId/:query', async (req, res) => {
    try {
        const { sessionId, query } = req.params;
        const result = await YoutubeHistory.deleteOne({ sessionId, query: decodeURIComponent(query) });
        if (result.deletedCount === 0) {
            // It's not an error if we try to delete something that's not in the DB
            // (e.g., it only existed in local cache), so we send success.
            return res.status(200).json({ message: 'Query not found in DB, but operation successful.' });
        }
        res.status(200).json({ message: 'Query deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 