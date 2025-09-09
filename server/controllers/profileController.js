// C:\Users\ADMIN\Desktop\smartcardlink-app\server\controllers\profileController.js

const Profile = require('../models/Profile');

// ADMIN email (hardcoded for now, later we can move to env variable)
const ADMIN_EMAIL = "allanmujera91@gmail.com";

// Create a new profile
exports.addProfile = async (req, res) => {
  try {
    const newProfile = new Profile(req.body);
    const savedProfile = await newProfile.save();
    res.status(201).json({ success: true, data: savedProfile });
  } catch (error) {
    console.error("Error saving profile:", error.message);
    res.status(500).json({ success: false, message: "Failed to save profile" });
  }
};

// Get all profiles (ADMIN ONLY)
exports.getAllProfiles = async (req, res) => {
  try {
    const requesterEmail = req.user?.email || null;

    if (requesterEmail !== ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const profiles = await Profile.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: profiles });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch profiles" });
  }
};

// Get a single profile by ID (public route)
exports.getProfileById = async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
};

// Delete a profile by ID (ADMIN ONLY)
exports.deleteProfile = async (req, res) => {
  try {
    const requesterEmail = req.user?.email || null;

    if (requesterEmail !== ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const deleted = await Profile.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    res.status(200).json({ success: true, message: "Profile deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete profile" });
  }
};
