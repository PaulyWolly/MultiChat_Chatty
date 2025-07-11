/*
  YOUTUBEHISTORY.JS
  Version: 7
  AppName: MultiChat_Chatty [v7]
  Updated: 7/11/2025 @3:40PM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

const YoutubeHistorySchema = new mongoose.Schema({
    query: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    isSaved: {
        type: Boolean,
        default: false
    }
});

// To ensure a query is unique per session and update timestamp on new search
YoutubeHistorySchema.index({ query: 1 }, { unique: true });

module.exports = mongoose.model('YoutubeHistory', YoutubeHistorySchema); 