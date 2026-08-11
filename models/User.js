const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    status: { type: String, required: true },
    lastInteraction: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
