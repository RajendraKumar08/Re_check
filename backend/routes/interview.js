const express = require('express');
const router = express.Router();
const {checkForAuthenticationCookie} = require('../middlewares/auth');
const LiveInterview = require('../models/liveInterview');


router.get('/history', checkForAuthenticationCookie("token"), async (req, res) => {
  try {
    const userId = req.user?._id;
    console.log("userId", userId)
    console.log("user", req.user);
    
    if (!userId) {
      console.log("No user ID found");
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    console.log("Fetching interviews for user ID:", userId);

    const interviews = await LiveInterview.find({ userId: userId }).sort({ createdAt: -1 });
    console.log("Found interviews:", interviews.length);

    res.json({ success: true, interviews });
  } catch (error) {
    console.error("Error in /history:", error);
    res.status(500).json({ success: false, error: 'Server error while fetching history', details: error.message });
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