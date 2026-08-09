const express = require('express');
const router = express.Router();
const {checkForAuthenticationCookie} = require('../middlewares/auth');
const LiveInterview = require('../models/liveInterview');


router.get('/history', checkForAuthenticationCookie("token"), async (req, res) => {
  try {
    const interviews = await LiveInterview.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, interviews });
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching history' });
  }
});


router.get('/:id', checkForAuthenticationCookie("token"), async (req, res) => {
  try {
    const interview = await LiveInterview.findById(req.params.id);
    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    res.json({ success: true, interview });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;