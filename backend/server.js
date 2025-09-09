const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// POST endpoint to update profile
app.post('/update-profile', (req, res) => {
    const data = req.body;

    fs.writeFile('../bio.json', JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error('Error writing to bio.json:', err);
            return res.status(500).json({ success: false, message: 'Failed to update profile' });
        }
        console.log('Profile updated successfully');
        res.json({ success: true, message: 'Profile updated successfully' });
    });
});

// Optional: Serve profile data for frontend
app.get('/profile', (req, res) => {
    fs.readFile('../bio.json', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading bio.json:', err);
            return res.status(500).json({ success: false, message: 'Failed to read profile' });
        }
        res.json(JSON.parse(data));
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`SmartCardLink server running at http://localhost:${PORT}`);
});
