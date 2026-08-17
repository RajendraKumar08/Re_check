const mongoose = require('mongoose');

const liveInterviewSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'user', 
    required: true 
  },
  jobRole: { 
    type: String, 
    required: true 
  },
  difficulty: { 
    type: String, 
    default: 'Mid-Level'
  },
  resumeText: { 
    type: String 
  },
  codeSnippet: { 
    type: String, 
    default: '// Write your live solution here...' 
  },
  codeLanguage: { 
    type: String, 
    default: 'javascript' 
  },
  transcript: [
    {
      speaker: { type: String, enum: ['AI', 'Candidate'] },
      text: String,
      timestamp: { type: Date, default: Date.now }
    }
  ],
  status: { 
    type: String, 
    enum: ['active', 'completed'], 
    default: 'active' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('LiveInterview', liveInterviewSchema);