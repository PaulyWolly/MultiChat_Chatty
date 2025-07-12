/*
  JOKE.JS
  Version: 7
  AppName: MultiChat_Chatty [v7]
  Updated: 7/12/2025 @5:40AM
  Created by Paul Welby
*/

const mongoose = require('mongoose');

// Joke Schema - for storing user's custom jokes
const jokeSchema = new mongoose.Schema({
    title: String,
    content: String,
    userId: String,
    dateCreated: { type: Date, default: Date.now }
}, {
    collection: 'my_jokes'  // Specify collection name
});

// Add indexes for faster lookups
jokeSchema.index({ userId: 1, title: 1 });

module.exports = mongoose.model('Joke', jokeSchema); 