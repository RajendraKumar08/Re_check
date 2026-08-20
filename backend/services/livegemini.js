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
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck'
              }
            }
          }
        },
        systemInstruction: {
          parts: [{
            text: `You are an expert technical interviewer conducting a live fast-paced interview.
                   Target Role: ${jobRole}
                   Difficulty Level: ${difficulty}
                   Candidate Resume Summary: ${resumeText || 'Not provided'}
                   
                   CRITICAL INSTRUCTIONS FOR LOW LATENCY & CONVERSATIONAL FLOW:
                   1. Respond IMMEDIATELY as soon as the candidate finishes speaking.
                   2. Keep spoken responses short, punchy, and direct (1 to 2 short sentences max).
                   3. Never deliver lengthy monologues. Maintain a rapid back-and-forth conversational flow.
                   4. Ask targeted technical questions appropriate for ${jobRole} at ${difficulty} level.`
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

      if (response.serverContent?.interrupted) {
        socket.emit('ai-interrupted');
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