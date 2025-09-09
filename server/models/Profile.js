// models/Profile.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProfileSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  company: { type: String },
  card_url: { type: String, index: true },
  createdAt: { type: Date, default: Date.now }
});

// Prevent model overwrite error in watch mode / nodemon
module.exports = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);
