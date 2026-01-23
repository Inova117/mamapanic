// MongoDB initialization script for Docker
db = db.getSiblingDB('mama_respira');

// Create collections
db.createCollection('users');
db.createCollection('user_sessions');
db.createCollection('validation_cards');
db.createCollection('checkins');
db.createCollection('chat_messages');
db.createCollection('direct_messages');
db.createCollection('bitacoras');

print('Database and collections created successfully');
