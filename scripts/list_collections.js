/*
  LIST_COLLECTIONS.JS
  Version: 7
  AppName: MultiChat_Chatty [v7]
  Updated: 7/12/2025 @5:40AM
  Created by Paul Welby
*/

require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') });
const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI;
const dbName = 'Chat_Streaming_Image';

(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const collections = await db.listCollections().toArray();
  console.log('Collections in database:', collections.map(c => c.name));
  await client.close();
})(); 