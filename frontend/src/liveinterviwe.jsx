import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { Mic, MicOff, Play, Square, Sparkles, CheckCircle2, Upload, FileText, X, Loader2, AlertCircle } from 'lucide-react';
import './liveinterview.css';

const SOCKET_SERVER_URL = 'http://localhost:8000'; // Match backend port

export default function LiveInterview({ userId, jobRole, difficulty, resumeText }) {
  const navigate = useNavigate();

  // Auth & User State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Setup Form State
  const [selectedJobRole, setSelectedJobRole] = useState(jobRole || 'Full Stack Developer');
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficulty || 'Mid-Level');
  const [selectedResumeText, setSelectedResumeText] = useState(resumeText || '');

  // Resume File Upload State
  const [resumeFile, setResumeFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const [extractSuccess, setExtractSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Session & Connection State
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
  const isAiSpeakingRef = useRef(false);
  const aiAudioEndTimeRef = useRef(0);
  const activeSourcesRef = useRef([]);
  const isUserSpeakingRef = useRef(false);
  const silenceFrameCountRef = useRef(0);
  const codeTimeoutRef = useRef(null);

  // Fetch User Auth
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/user/me", {
          withCredentials: true,
        });
        const userData = response.data.user || response.data;
        setUser(userData);
        if (userData?.resumeText && !selectedResumeText) {
          setSelectedResumeText(userData.resumeText);
        }
      } catch (err) {
        console.error("Error fetching user", err);
        navigate("/login");
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  // Stop all active AI Audio playback
  const stopAllAiAudio = () => {
    if (activeSourcesRef.current) {
      activeSourcesRef.current.forEach((src) => {
        try {
          src.stop();
        } catch (e) {}
      });
      activeSourcesRef.current = [];
    }
    nextPlayTimeRef.current = 0;
    isAiSpeakingRef.current = false;
    aiAudioEndTimeRef.current = 0;
  };

  // Socket setup
  useEffect(() => {
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

    socketRef.current.on('ai-audio-chunk', (base64PcmChunk) => {
      playPcmAudioChunk(base64PcmChunk);
    });

    socketRef.current.on('ai-transcript', (text) => {
      setTranscripts((prev) => [...prev, { speaker: 'AI', text }]);
    });

    socketRef.current.on('ai-interrupted', () => {
      stopAllAiAudio();
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      stopInterview();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // RESUME FILE HANDLERS & AUTOMATIC TEXT EXTRACTION
  const extractResumeText = async (file) => {
    setIsExtracting(true);
    setExtractError(null);
    setExtractSuccess(false);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await axios.post(
        'http://localhost:8000/api/resume/extract-text',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true,
        }
      );

      if (response.data && response.data.text) {
        setSelectedResumeText(response.data.text);
        setExtractSuccess(true);
      } else {
        setExtractError('Could not read text content from the uploaded resume.');
      }
    } catch (err) {
      console.error('Error extracting resume text:', err);
      setExtractError(
        err.response?.data?.error || 'Failed to extract text from resume.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    setResumeFile(file);
    await extractResumeText(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const removeFile = (e) => {
    e.stopPropagation();
    setResumeFile(null);
    setSelectedResumeText('');
    setExtractSuccess(false);
    setExtractError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // START INTERVIEW
  const startInterview = async () => {
    if (!socketRef.current) return;

    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000
      });

      socketRef.current.emit('start-session', {
        userId: userId || user?._id || user?.id,
        jobRole: selectedJobRole,
        difficulty: selectedDifficulty,
        resumeText: selectedResumeText
      });

      await startMicrophoneCapture();
    } catch (err) {
      console.error('Failed to start interview:', err);
    }
  };

  // STOP INTERVIEW
  const stopInterview = () => {
    setIsInterviewActive(false);
    stopAllAiAudio();

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  // CAPTURE MICROPHONE & CONVERT TO PCM 16kHz
  const startMicrophoneCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000
        }
      });
      mediaStreamRef.current = stream;

      const inputAudioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });

      const source = inputAudioContext.createMediaStreamSource(stream);
      // Reduce buffer size to 2048 for faster response (~128ms chunks)
      const processor = inputAudioContext.createScriptProcessor(2048, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMuted) return;

        const inputData = e.inputBuffer.getChannelData(0);

        // 1. Voice Activity Detection (RMS volume level)
        let sumSquares = 0;
        for (let i = 0; i < inputData.length; i++) {
          sumSquares += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sumSquares / inputData.length);

        // 2. Echo Prevention: If AI speaker output is currently playing, suppress mic input
        const now = audioContextRef.current ? audioContextRef.current.currentTime : 0;
        const isAiActive = isAiSpeakingRef.current || (aiAudioEndTimeRef.current && now < aiAudioEndTimeRef.current);

        if (isAiActive) {
          if (rms > 0.05) {
            // User intentionally spoke loud over AI speaker -> interrupt AI
            stopAllAiAudio();
          } else {
            // Suppress speaker echo leakage
            return;
          }
        }

        // 3. VAD Noise Gate & Turn Completion Gating:
        // Noise floor threshold: 0.015. Anything below is treated as ambient background noise.
        const SILENCE_THRESHOLD = 0.015;

        if (rms >= SILENCE_THRESHOLD) {
          // User is actively speaking
          isUserSpeakingRef.current = true;
          silenceFrameCountRef.current = 0;
        } else {
          // Volume is below speech threshold
          if (isUserSpeakingRef.current) {
            // User was speaking, now paused/stopped speaking
            silenceFrameCountRef.current += 1;

            // Send up to 3 frames (~380ms) of pure digital silence (all zeroes)
            // to cleanly signal turn completion to Gemini's server-side VAD
            if (silenceFrameCountRef.current <= 3) {
              const zeroPcm = new Int16Array(inputData.length);
              const zeroBase64 = btoa(String.fromCharCode(...new Uint8Array(zeroPcm.buffer)));
              if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit('user-audio-chunk', zeroBase64);
              }
              return;
            } else if (silenceFrameCountRef.current === 4) {
              // Mark speech ended and notify backend to trigger immediate Gemini turn completion
              isUserSpeakingRef.current = false;
              if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit('user-speech-end');
              }
              return;
            } else {
              // User is silent, stop sending room noise
              return;
            }
          } else {
            // User is not speaking and silent period has passed; skip sending ambient noise
            return;
          }
        }

        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const base64Audio = btoa(
          String.fromCharCode(...new Uint8Array(pcm16.buffer))
        );

        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('user-audio-chunk', base64Audio);
        }
      };

      source.connect(processor);
      processor.connect(inputAudioContext.destination);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  // PLAY INCOMING PCM AUDIO CHUNKS
  const playPcmAudioChunk = (base64PcmChunk) => {
    if (!audioContextRef.current) return;

    try {
      const binaryString = atob(base64PcmChunk);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Data = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(int16Data.length);

      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0;
      }

      const audioBuffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      const currentTime = audioContextRef.current.currentTime;
      if (nextPlayTimeRef.current < currentTime) {
        nextPlayTimeRef.current = currentTime;
      }

      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += audioBuffer.duration;

      aiAudioEndTimeRef.current = nextPlayTimeRef.current;
      isAiSpeakingRef.current = true;
      activeSourcesRef.current.push(source);

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        if (audioContextRef.current && audioContextRef.current.currentTime >= aiAudioEndTimeRef.current - 0.05) {
          isAiSpeakingRef.current = false;
        }
      };
    } catch (err) {
      console.error('Error playing audio chunk:', err);
    }
  };

  // CODE EDITOR CHANGE (Debounced 1000ms to avoid flooding Gemini Live WS)
  const handleCodeChange = (newCode) => {
    setCode(newCode);

    if (codeTimeoutRef.current) {
      clearTimeout(codeTimeoutRef.current);
    }

    codeTimeoutRef.current = setTimeout(() => {
      if (socketRef.current && sessionIdRef.current) {
        socketRef.current.emit('code-update', {
          sessionId: sessionIdRef.current,
          code: newCode,
          language
        });
      }
    }, 1000);
  };

  if (authLoading) {
    return (
      <div className="live-interview-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          <p style={{ color: '#94a3b8' }}>Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="live-interview-container">
      {!isInterviewActive ? (
        /* SETUP CARD VIEW */
        <div className="interview-setup-wrapper">
          <div className="interview-setup-card">
            <h2 className="setup-title">AI Live Technical Interview</h2>
            <p className="setup-subtitle">
              Prepare for real-time interactive technical assessment with Gemini AI.
            </p>

            <div className="form-group">
              <label>Target Job Role</label>
              <input
                type="text"
                className="form-input"
                value={selectedJobRole}
                onChange={(e) => setSelectedJobRole(e.target.value)}
                placeholder="e.g. Frontend Developer, Full Stack Engineer"
              />
            </div>

            <div className="form-group">
              <label>Difficulty Level</label>
              <select
                className="form-select"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                <option value="Entry-Level">Entry-Level / Junior</option>
                <option value="Mid-Level">Mid-Level Engineer</option>
                <option value="Senior-Level">Senior / Tech Lead</option>
              </select>
            </div>

            {/* RESUME FILE UPLOAD SECTION */}
            <div className="form-group">
              <label>Upload Candidate Resume (PDF / Document)</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                accept=".pdf,.doc,.docx,.txt"
                style={{ display: 'none' }}
              />

              <div
                className={`dropzone ${isDragging ? 'dragging' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  borderColor: isDragging
                    ? '#818cf8'
                    : extractError
                    ? '#ef4444'
                    : extractSuccess
                    ? '#10b981'
                    : 'rgba(99, 102, 241, 0.4)',
                  backgroundColor: isDragging
                    ? 'rgba(99, 102, 241, 0.12)'
                    : 'rgba(99, 102, 241, 0.03)',
                }}
              >
                {!resumeFile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Upload size={32} color="#818cf8" />
                    <p style={{ color: '#e2e8f0', fontWeight: 500, margin: 0 }}>
                      Click or drag & drop resume file here
                    </p>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      Supports PDF, DOC, DOCX or TXT files
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.6)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <FileText size={24} color="#818cf8" />
                        <div style={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <p style={{ margin: 0, fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {resumeFile.name}
                          </p>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {(resumeFile.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                        title="Remove File"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {isExtracting && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', fontSize: '0.85rem', justifyContent: 'center' }}>
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Extracting text from resume...</span>
                      </div>
                    )}

                    {extractSuccess && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.85rem', justifyContent: 'center' }}>
                        <CheckCircle2 size={16} />
                        <span>Resume text extracted successfully ({selectedResumeText.length} chars)</span>
                      </div>
                    )}

                    {extractError && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '0.85rem', justifyContent: 'center' }}>
                        <AlertCircle size={16} />
                        <span>{extractError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={startInterview}
              className="start-btn"
              disabled={!isConnected || isExtracting}
            >
              <Play size={20} />
              {isExtracting
                ? 'Extracting Resume Text...'
                : !isConnected
                ? 'Connecting to Server...'
                : 'Start Live Interview'}
            </button>
          </div>
        </div>
      ) : (
        /* ACTIVE INTERVIEW ROOM VIEW */
        <>
          {/* Room Header */}
          <div className="room-header">
            <div className="header-meta">
              <span className="role-badge">{selectedJobRole}</span>
              <span className="difficulty-badge">{selectedDifficulty}</span>
              <span style={{ fontSize: '0.85rem', color: isConnected ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isConnected ? '#10b981' : '#ef4444' }}></span>
                {isConnected ? 'Live Connected' : 'Disconnected'}
              </span>
            </div>
            <button onClick={stopInterview} className="end-call-btn">
              <Square size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> End Interview
            </button>
          </div>

          {/* Room Main Split Panel */}
          <div className="room-main">
            {/* Left Feed Panel */}
            <div className="feed-panel">
              <div className="ai-avatar-card">
                <div className="avatar-circle">
                  <div className="avatar-pulse"></div>
                  <Sparkles size={36} color="#ffffff" />
                </div>
                <div className="ai-status-text">Gemini Interviewer</div>
                <div className="wave-container">
                  <div className="wave-bar" style={{ animationDelay: '0s' }}></div>
                  <div className="wave-bar" style={{ animationDelay: '0.2s' }}></div>
                  <div className="wave-bar" style={{ animationDelay: '0.4s' }}></div>
                  <div className="wave-bar" style={{ animationDelay: '0.1s' }}></div>
                  <div className="wave-bar" style={{ animationDelay: '0.3s' }}></div>
                </div>
              </div>

              {/* Subtitles & Transcripts */}
              <div className="transcript-feed">
                {transcripts.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', marginTop: '2rem' }}>
                    Interview transcript will appear here live...
                  </p>
                ) : (
                  transcripts.map((msg, index) => (
                    <div
                      key={index}
                      className={`transcript-bubble ${msg.speaker === 'AI' ? 'ai' : 'user'}`}
                    >
                      <strong>{msg.speaker}: </strong>
                      <span>{msg.text}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Microphone Controls */}
              <div className="panel-controls">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`mic-btn ${isMuted ? 'active' : ''}`}
                  title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  {isMuted ? 'Microphone Muted' : 'Microphone Active'}
                </span>
              </div>
            </div>

            {/* Right Code Editor Panel */}
            <div className="editor-panel">
              <div className="editor-toolbar">
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Live Code Workspace</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="sync-status">
                    <CheckCircle2 size={14} /> Real-time Sync
                  </span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="lang-select"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
              </div>

              <div className="editor-container">
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language={language}
                  value={code}
                  onChange={handleCodeChange}
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}