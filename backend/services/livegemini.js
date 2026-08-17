const WebSocket = require('ws');

// Handles Gemini Live WebSocket session for audio & code streaming
const handleGeminiLiveSession = (socket, { jobRole, difficulty, resumeText }) => {
  const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${process.env.GEMINI_API_KEY}`;

  const geminiWs = new WebSocket(GEMINI_WS_URL);

  geminiWs.on('open', () => {
    console.log('⚡ Connected to Gemini Multimodal Live API');

    // Setup configuration payload
    const setupMessage = {
      setup: {
        model: 'models/gemini-2.5-flash-native-audio-latest',
        generationConfig: {
          responseModalities: ['AUDIO']
        },
        systemInstruction: {
          parts: [{
            text: `You are an expert technical interviewer conducting a live interview.
                   Target Role: ${jobRole}
                   Difficulty Level: ${difficulty}
                   Candidate Resume Summary: ${resumeText || 'Not provided'}
                   
                   Instructions:
                   1. Ask concise technical questions tailored to the candidate's experience and role.
                   2. Provide clear feedback when code is updated.
                   3. Keep spoken responses short, professional, and conversational.`
          }]
        }
      }
    };

    geminiWs.send(JSON.stringify(setupMessage));
  });

  // Forward audio chunks and transcripts from Gemini to Frontend Socket
  geminiWs.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());

      // Initial trigger when WebSocket setup finishes
      if (response.setupComplete) {
        console.log('⚡ Gemini Live Setup Complete. Starting interview dialogue...');
        geminiWs.send(JSON.stringify({
          clientContent: {
            turns: [{
              role: 'user',
              parts: [{ text: `Hello! I am ready for the ${jobRole} interview.` }]
            }],
            turnComplete: true
          }
        }));
      }

      if (response.serverContent?.modelTurn?.parts) {
        for (const part of response.serverContent.modelTurn.parts) {
          if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
            socket.emit('ai-audio-chunk', part.inlineData.data);
          }
          if (part.text) {
            socket.emit('ai-transcript', part.text);
          }
        }
      }
    } catch (err) {
      console.error('Gemini WS Message Parse Error:', err);
    }
  });

  geminiWs.on('error', (err) => {
    console.error('Gemini WS Error:', err);
    socket.emit('error', 'Gemini AI Connection Warning: ' + (err.message || 'WebSocket Error'));
  });

  geminiWs.on('close', (code, reason) => {
    console.log('Gemini WS Connection Closed:', code, reason?.toString());
  });

  return geminiWs;
};

module.exports = {
  handleGeminiLiveSession
};