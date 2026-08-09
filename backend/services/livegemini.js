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
        model: 'models/gemini-2.0-flash-exp',
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Puck' } // Options: Puck, Charon, Kore, Fenrir, Aoede
            }
          }
        },
        systemInstruction: {
          parts: [{
            text: `You are an expert technical interviewer conducting a live video/voice interview.
                   Role: ${jobRole}
                   Difficulty: ${difficulty}
                   Candidate Resume Summary: ${resumeText || 'Not provided'}
                   
                   Instructions:
                   1. Ask concise technical questions tailored to the candidate's answers.
                   2. Monitor the candidate's live code editor and provide real-time feedback.
                   3. Keep spoken responses short, natural, and conversational.`
          }]
        }
      }
    };

    geminiWs.send(JSON.stringify(setupMessage));
  });

  // Forward audio chunks and transcripts from Gemini to Frontend Socket
  geminiWs.on('message', (data) => {
    const response = JSON.parse(data.toString());

    if (response.serverContent?.modelTurn?.parts) {
      for (const part of response.serverContent.modelTurn.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
          socket.emit('ai-audio-chunk', part.inlineData.data);
        }
        if (part.text) {
          socket.emit('ai-transcript', part.text);
        }
      }
    }
  });

  geminiWs.on('error', (err) => console.error('Gemini WS Error:', err));
  geminiWs.on('close', () => console.log('Gemini WS Connection Closed'));

  return geminiWs;
};

module.exports = {
  handleGeminiLiveSession
};