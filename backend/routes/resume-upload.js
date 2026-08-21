// routes/upload.js
const express = require('express');
const router = express.Router();
const { upload } = require('../services/cloudinary');

router.post('/upload-resume', upload.single('resume'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    return res.status(200).json({ 
      success: true, 
      resumeUrl: req.file.path 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;