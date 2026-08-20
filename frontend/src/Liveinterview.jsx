import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { Mic, MicOff, Play, Square } from 'lucide-react';

const SOCKET_SERVER_URL = 'http://localhost:8000'; // Match your backend port

export default function LiveInterview({ userId, jobRole, difficulty, resumeText }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [code, setCode] = useState('// Write your solution here...\n\nfunction solve() {\n  \n}');
  const [language, setLanguage] = useState('javascript');
  const [transcripts, setTranscripts] = useState([]);

  // Refs for WebSockets and Web Audio API
  const socketRef = useRef(null);
  const sessionIdRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const nextPlayTimeRef = useRef(0);
  const activeSourcesRef = useRef([]);
  
  // VAD Refs
  const isSpeakingRef = useRef(false);
  const silenceStartRef = useRef(null);

  useEffect(() => {
    // 1. Initialize Socket.io Connection
    socketRef.current = io(SOCKET_SERVER_URL);

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to backend socket');
    });

    socketRef.current.on('session-started', ({ sessionId }) => {
      sessionIdRef.current = sessionId;
      setIsInterviewActive(true);
      console.log('Interview session initialized:', sessionId);
    });

    // 2. Receive AI Audio Stream & Play in Browser
    socketRef.current.on('ai-audio-chunk', (base64PcmChunk) => {
      playPcmAudioChunk(base64PcmChunk);
    });

    // 3. Receive AI Subtitles/Transcripts
    socketRef.current.on('ai-transcript', (text) => {
      setTranscripts((prev) => [...prev, { speaker: 'AI', text }]);
    });
    
    // 4. Handle AI Interruption (flush audio queue)
    socketRef.current.on('ai-interrupted', () => {
      console.log('AI was interrupted - flushing audio queue');
      activeSourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
      });
      activeSourcesRef.current = [];
      if (audioContextRef.current) {
        nextPlayTimeRef.current = audioContextRef.current.currentTime;
      }
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      stopInterview();
      socketRef.current.disconnect();
    };
  }, []);

  // --- START INTERVIEW ---
  const startInterview = async () => {
    if (!socketRef.current) return;

    // Initialize Web Audio Context for Audio Playback & Capture
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 24000 // Match Gemini output audio sample rate
    });

    // Emit session start event to backend
    socketRef.current.emit('start-session', {
      userId,
      jobRole,
      difficulty,
      resumeText
    });

    // Start Recording Candidate Microphone
    await startMicrophoneCapture();
  };

  // --- STOP INTERVIEW ---
  const stopInterview = () => {
    setIsInterviewActive(false);

    // Stop Microphone Stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  // --- CAPTURE & CONVERT MICROPHONE TO PCM 16kHz ---
  const startMicrophoneCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const inputAudioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000 // 16kHz required by Gemini
      });

      const source = inputAudioContext.createMediaStreamSource(stream);
      // Process audio buffer in chunks of 4096 samples
      const processor = inputAudioContext.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMuted) return;

        const inputData = e.inputBuffer.getChannelData(0);
        let sumSquares = 0;
        
        // Convert Float32 audio samples to Int16 PCM and calculate RMS for VAD
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          sumSquares += inputData[i] * inputData[i];
        }
        
        // VAD logic
        const rms = Math.sqrt(sumSquares / inputData.length);
        const volumeThreshold = 0.01; 
        
        if (rms > volumeThreshold) {
          isSpeakingRef.current = true;
          silenceStartRef.current = null;
        } else if (isSpeakingRef.current) {
          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > 500) {
            // Detected > 500ms of silence after speaking, signal turn complete
            isSpeakingRef.current = false;
            silenceStartRef.current = null;
            if (socketRef.current && socketRef.current.connected) {
              socketRef.current.emit('turn-complete');
            }
          }
        }

        // Only send audio chunks if we are speaking or trailing silence
        // This flushes pending socket buffers by avoiding sending endless silence
        if (isSpeakingRef.current || silenceStartRef.current !== null) {
          const base64Audio = btoa(
            String.fromCharCode(...new Uint8Array(pcm16.buffer))
          );

          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('user-audio-chunk', base64Audio);
          }
        }
      };

      source.connect(processor);
      processor.connect(inputAudioContext.destination);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  // --- PLAY INCOMING PCM AUDIO CHUNKS ---
  const playPcmAudioChunk = (base64PcmChunk) => {
    if (!audioContextRef.current) return;

    // Decode Base64 back to binary array
    const binaryString = atob(base64PcmChunk);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16Data = new Int16Array(bytes.buffer);
    const float32Data = new Float32Array(int16Data.length);

    // Convert Int16 back to Float32 array for Web Audio API
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 32768.0;
    }

    // Create audio buffer (24kHz Mono)
    const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
    audioBuffer.getChannelData(0).set(float32Data);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    // Queue audio chunks continuously to avoid gaps or overlapping speech
    const currentTime = audioContextRef.current.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
    };
    activeSourcesRef.current.push(source);

    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;
  };

  // --- HANDLE LIVE CODE EDITOR CHANGES ---
  const handleCodeChange = (newCode) => {
    setCode(newCode);

    // Debounce or emit live code updates to server
    if (socketRef.current && sessionIdRef.current) {
      socketRef.current.emit('code-update', {
        sessionId: sessionIdRef.current,
        code: newCode,
        language
      });
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#1e1e1e', color: '#fff' }}>
      {/* LEFT PANEL: Live Controls & AI Voice Output / Transcript */}
      <div style={{ width: '40%', padding: '20px', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
        <h2>Live AI Technical Interview</h2>
        <p>Status: <span style={{ color: isConnected ? '#4caf50' : '#f44336' }}>{isConnected ? 'Connected' : 'Disconnected'}</span></p>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {!isInterviewActive ? (
            <button onClick={startInterview} style={btnStyle('#4caf50')}>
              <Play size={18} /> Start Interview
            </button>
          ) : (
            <button onClick={stopInterview} style={btnStyle('#f44336')}>
              <Square size={18} /> End Interview
            </button>
          )}

          {isInterviewActive && (
            <button onClick={() => setIsMuted(!isMuted)} style={btnStyle(isMuted ? '#ff9800' : '#2196f3')}>
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />} {isMuted ? 'Unmute' : 'Mute'}
            </button>
          )}
        </div>

        {/* Transcript Log Container */}
        <div style={{ flex: 1, backgroundColor: '#252526', padding: '15px', borderRadius: '8px', overflowY: 'auto' }}>
          <h3>Interview Subtitles</h3>
          {transcripts.map((msg, index) => (
            <div key={index} style={{ marginBottom: '10px' }}>
              <strong>{msg.speaker}: </strong>
              <span>{msg.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL: Real-time Monaco Code Editor */}
      <div style={{ width: '60%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px', backgroundColor: '#2d2d2d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Code Editor</span>
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            style={{ backgroundColor: '#3c3c3c', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px' }}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
        </div>

        <Editor
          height="100%"
          theme="vs-dark"
          language={language}
          value={code}
          onChange={handleCodeChange}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false
          }}
        />
      </div>
    </div>
  );
}

const btnStyle = (bgColor) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: bgColor,
  color: '#fff',
  border: 'none',
  padding: '10px 16px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 'bold'
});