const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const MEDIA_LIBRARY_PATH = path.join(__dirname, '../data/media-library.json');

router.get('/media-library', (req, res) => {
    fs.readFile(MEDIA_LIBRARY_PATH, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Failed to read media library', details: err.message });
        }
        try {
            const json = JSON.parse(data);
            res.json({ success: true, library: json });
        } catch (parseErr) {
            res.status(500).json({ success: false, error: 'Failed to parse media library', details: parseErr.message });
        }
    });
});

module.exports = router; 