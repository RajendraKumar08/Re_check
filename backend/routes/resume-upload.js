// routes/resume-upload.js
const express = require('express');
const router = express.Router();
const { upload } = require('../services/cloudinary');

router.post('/upload-resume', (req, res) => {
  upload.single('resume')(req, res, (err) => {
    if (err) {
      console.error('Cloudinary upload error:', err);
      return res.status(500).json({ error: err.message || 'Cloudinary upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    return res.status(200).json({ 
      success: true, 
      resumeUrl: req.file.path || req.file.secure_url 
    });
  });
});

module.exports = router;