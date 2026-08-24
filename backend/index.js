require("dotenv").config();
const express = require('express');
const app = express();
const http = require('http'); // 1. Added HTTP module
const { Server } = require('socket.io'); // 2. Added Socket.io
const mongoose = require('mongoose');
const WebSocket = require('ws'); // 3. Added ws package
const cors = require("cors");
const User = require("./models/user");
const cookieParser = require("cookie-parser");

// Existing Routes
const userRoute = require("./routes/user");
const resumeRoute = require("./routes/resume");
const interviewRoute = require("./routes/interview");
const uploadRoute = require('./routes/resume-upload'); 
const projectRoute = require('./routes/project');

// Models & Services for Live Interview
const LiveInterview = require("./models/liveInterview");
const { handleGeminiLiveSession } = require("./services/livegemini");

// 4. Wrap express app in HTTP server for WebSocket support
const server = http.createServer(app);

// 5. Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust this to match your frontend URL in production
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "http://127.0.0.1:5173"],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 8000;

// Database Connection
const MONGO_URI = process.env.MONGODB_URI;
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("Mongo db connected");

    // Create/update indexes
    await User.syncIndexes();

    console.log("User indexes synced");
  })
  .catch((err) => console.log("mongodb err", err));



// Test Route
app.get('/', (req, res) => {
  res.json('Hello World!');
});

// Express API Routes
app.use('/api/resume', resumeRoute);
app.use('/api/user', userRoute);
app.use('/api/interview', interviewRoute);
app.use('/api/upload', uploadRoute);
app.use('/api/project', projectRoute);

// -------------------------------------------------------------
// REAL-TIME SOCKET.IO HANDLERS FOR LIVE INTERVIEW & CODE EDITOR
// -------------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`⚡ New client connected: ${socket.id}`);
  let geminiWs = null;
  let currentSessionId = null;

  // Event 1: Start Interview Session
  socket.on('start-session', async (data) => {
    try {
      const { userId, jobRole, difficulty, resumeText, resumeUrl } = data || {};

      // Ensure valid ObjectId for userId
      let validUserId = userId;
      if (!validUserId || !mongoose.Types.ObjectId.isValid(validUserId)) {
        validUserId = new mongoose.Types.ObjectId();
      }

      // Create session record in Mongo
      const session = new LiveInterview({
        userId: validUserId,
        jobRole: jobRole || "Full Stack Developer",
        difficulty: difficulty || "Mid-Level",
        resumeText: resumeText || "",
        resumeUrl: resumeUrl || ""
      });
      await session.save();
      currentSessionId = session._id;

      // Start live stream connection to Gemini via services/livegemini.js
      geminiWs = handleGeminiLiveSession(socket, {
        jobRole: session.jobRole,
        difficulty: session.difficulty,
        resumeText: session.resumeText
      });

      socket.emit('session-started', { sessionId: currentSessionId });
    } catch (err) {
      console.error('Session Init Error:', err);
      socket.emit('error', err.message || 'Failed to initialize live interview session');
    }
  });

  // Event 2: Relay user audio buffer/chunks to Gemini
  socket.on('user-audio-chunk', (base64Audio) => {
    if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [{
            mimeType: 'audio/pcm;rate=16000',
            data: base64Audio
          }]
        }
      }));
    }
  });

  // Event 2b: Explicit Turn Completion from VAD
  socket.on('turn-complete', () => {
    if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.send(JSON.stringify({
        clientContent: {
          turnComplete: true
        }
      }));
    }
  });

  // Event 3: Real-time Code Editor Updates
  socket.on('code-update', async ({ sessionId, code, language }) => {
    try {
      if (sessionId && code !== lastCodeSnippet) {
        lastCodeSnippet = code;

        // Non-blocking database update
        LiveInterview.findByIdAndUpdate(sessionId, {
          codeSnippet: code,
          codeLanguage: language
        }).catch(err => console.error('DB Code Sync Error:', err));

        // Inform Gemini about code updates only if modified
        if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
          geminiWs.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [],
              text: `[System Update: Candidate code changed in editor (${language}):\n${code}]`
            }
          }));
        }
      }
    } catch (err) {
      console.error('Code Sync Error:', err);
    }
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    if (geminiWs) geminiWs.close();
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// 6. Listen using 'server.listen' instead of 'app.listen'
server.listen(PORT, () => {
  console.log(`server is running at the port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

