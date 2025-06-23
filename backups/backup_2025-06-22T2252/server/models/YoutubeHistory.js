const mongoose = require('mongoose');

const YoutubeHistorySchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    query: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// To ensure a query is unique per session and update timestamp on new search
YoutubeHistorySchema.index({ sessionId: 1, query: 1 }, { unique: true });

module.exports = mongoose.model('YoutubeHistory', YoutubeHistorySchema); 