import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { io } from "socket.io-client";
import Editor from "@monaco-editor/react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Upload,
  FileText,
  Code2,
  CheckCircle2,
  Volume2,
  Send,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "./liveinterview.css";

function LiveInterview() {
  // Navigation & User Auth state
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Setup Form State
  const [jobRole, setJobRole] = useState("Full Stack Developer");
  const [difficulty, setDifficulty] = useState("Mid-Level");
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeFileName, setResumeFileName] = useState("");
  const [extractedText, setExtractedText] = useState("");

  // Interview Room State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [code, setCode] = useState("// Write your solution here...\n\nfunction solution() {\n  \n}");
  const [language, setLanguage] = useState("javascript");
  const [isMicOn, setIsMicOn] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  const [manualInput, setManualInput] = useState("");
  const [syncStatus, setSyncStatus] = useState("Synced");

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Refs for WebSockets, Audio & Debouncing
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const codeDebounceTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const transcriptEndRef = useRef(null);

  // 1. Fetch user authentication on mount
  useEffect(() => {
    const fetchAuth = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/user/me", {
          withCredentials: true
        });
        setUser(res.data);
      } catch (err) {
        if (err.response?.status === 401) {
          navigate("/login");
        }
      } finally {
        setAuthLoading(false);
      }
    };
    fetchAuth();
  }, [navigate]);

  // 2. Timer effect for active interview session
  useEffect(() => {
    let interval = null;
    if (isSessionActive) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isSessionActive]);

  // 3. Auto-scroll transcripts to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  // Handle Resume File Selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== "application/pdf") {
        alert("Please upload a valid PDF resume file.");
        return;
      }
      setResumeFile(file);
      setResumeFileName(file.name);
    }
  };

  // Start Interview Handler
  const handleStartInterview = async (e) => {
    e.preventDefault();
    if (!resumeFile) {
      alert("Please upload your resume PDF to begin.");
      return;
    }

    setIsConnecting(true);

    try {
      let resumeText = "";
      try {
        const formData = new FormData();
        formData.append("resume", resumeFile);

        const textRes = await axios.post(
          "http://localhost:8000/api/resume/extract-text",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            withCredentials: true
          }
        );

        resumeText = textRes.data.text || "";
      } catch (extractErr) {
        console.warn("Resume text extraction endpoint warning:", extractErr);
        // Fallback to basic file info if endpoint is unavailable
        resumeText = `Uploaded resume: ${resumeFile.name}`;
      }

      setExtractedText(resumeText);

      // Step B: Initialize Socket.io connection to backend server
      const socket = io("http://localhost:8000", {
        withCredentials: true,
        transports: ["websocket", "polling"]
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("⚡ Connected to Live Interview Socket:", socket.id);
        socket.emit("start-session", {
          userId: user?._id || user?.id,
          jobRole,
          difficulty,
          resumeText
        });
      });

      socket.on("connect_error", (connErr) => {
        console.error("Socket Connection Error:", connErr);
        alert("Failed to connect to backend interview socket: " + (connErr.message || "Server unreachable"));
        setIsConnecting(false);
      });

      socket.on("session-started", (data) => {
        setSessionId(data.sessionId);
        setIsConnecting(false);
        setIsSessionActive(true);
        setTranscripts([
          {
            sender: "ai",
            text: `Hello! I am your AI Technical Interviewer for the ${jobRole} position. I have reviewed your resume and we are ready to begin. Tell me about yourself and your primary technical skills.`
          }
        ]);
      });

      // Handle AI Transcript Stream from Gemini
      socket.on("ai-transcript", (textChunk) => {
        setIsAiSpeaking(true);
        setTranscripts((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.sender === "ai") {
            return [...prev.slice(0, -1), { sender: "ai", text: last.text + " " + textChunk }];
          } else {
            return [...prev, { sender: "ai", text: textChunk }];
          }
        });

        setTimeout(() => setIsAiSpeaking(false), 2500);
      });

      // Handle AI Audio Chunks (Raw PCM/Base64)
      socket.on("ai-audio-chunk", (base64Audio) => {
        setIsAiSpeaking(true);
        playPcmAudio(base64Audio);
      });

      socket.on("error", (err) => {
        console.error("Socket Error:", err);
        alert(err || "Live Session Error");
        setIsConnecting(false);
      });

    } catch (err) {
      console.error("Failed to start session:", err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to start interview session.";
      alert(errMsg);
      setIsConnecting(false);
    }
  };

  // Helper to play raw PCM/WAV audio chunks received from Gemini
  const playPcmAudio = (base64Data) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioCtx = audioContextRef.current;
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Simple web audio buffer trigger
      audioCtx.decodeAudioData(bytes.buffer, (buffer) => {
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start(0);
      }, () => {});
    } catch (e) {
      console.log("Audio decode exception:", e);
    }
  };

  // Handle Code Change in Monaco Editor with Debounce
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setSyncStatus("Saving...");

    if (codeDebounceTimerRef.current) {
      clearTimeout(codeDebounceTimerRef.current);
    }

    codeDebounceTimerRef.current = setTimeout(() => {
      if (socketRef.current && sessionId) {
        socketRef.current.emit("code-update", {
          sessionId,
          code: newCode,
          language
        });
        setSyncStatus("Synced with AI");
      }
    }, 1200);
  };

  // Send Manual Candidate Text Input
  const handleSendTextResponse = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    const userText = manualInput.trim();
    setTranscripts((prev) => [...prev, { sender: "user", text: userText }]);
    setManualInput("");

    if (socketRef.current && sessionId) {
      socketRef.current.emit("code-update", {
        sessionId,
        code: `[Candidate Spoken Response]: ${userText}\n\n${code}`,
        language
      });
    }
  };

  // End Interview Call
  const handleEndInterview = () => {
    if (window.confirm("Are you sure you want to end the live interview?")) {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      setIsSessionActive(false);
      alert("Interview session completed! Great job.");
      navigate("/user");
    }
  };

  // Format Timer
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (authLoading) {
    return (
      <div className="live-interview-container" style={{ alignItems: "center", justifyContent: "center" }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: "#818cf8" }} />
      </div>
    );
  }

  return (
    <div className="live-interview-container">
      {!isSessionActive ? (
        /* STAGE 1: SETUP & RESUME UPLOAD */
        <div className="interview-setup-wrapper">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="interview-setup-card"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.5rem" }}>
              <Sparkles style={{ color: "#a855f7" }} size={28} />
              <h2 className="setup-title">Live AI Technical Interview</h2>
            </div>
            <p className="setup-subtitle">
              Upload your resume and customize your role to launch an interactive live interview powered by Gemini Multimodal API.
            </p>

            <form onSubmit={handleStartInterview}>
              <div className="form-group">
                <label>Target Job Role</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Full Stack Developer, React Engineer"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Interview Difficulty</label>
                <select
                  className="form-select"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="Entry Level / Junior">Entry Level / Junior</option>
                  <option value="Mid-Level">Mid-Level</option>
                  <option value="Senior / Technical Lead">Senior / Technical Lead</option>
                </select>
              </div>

              <div className="form-group">
                <label>Upload Resume (PDF)</label>
                <label className="dropzone">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  <Upload size={32} style={{ color: "#818cf8", margin: "0 auto 0.5rem" }} />
                  {resumeFileName ? (
                    <div style={{ color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                      <FileText size={18} /> {resumeFileName}
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontWeight: 600, color: "#e2e8f0" }}>Click to upload Resume PDF</p>
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Supported format: .PDF</span>
                    </div>
                  )}
                </label>
              </div>

              <button type="submit" className="start-btn" disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    <span>Connecting AI Interviewer...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>Start Live Interview</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      ) : (
        /* STAGE 2: LIVE INTERVIEW ROOM */
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          {/* Header Bar */}
          <header className="room-header">
            <div className="header-meta">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="role-badge">{jobRole}</span>
                <span className="difficulty-badge">{difficulty}</span>
              </div>
              <div style={{ fontSize: "0.9rem", color: "#94a3b8", fontWeight: 600 }}>
                Time: <span style={{ color: "#ffffff" }}>{formatTime(timerSeconds)}</span>
              </div>
            </div>

            <button className="end-call-btn" onClick={handleEndInterview}>
              <PhoneOff size={16} style={{ display: "inline", marginRight: "6px" }} />
              End Interview
            </button>
          </header>

          {/* Main Content Split Pane */}
          <div className="room-main">
            {/* Left: AI Feed & Transcript */}
            <div className="feed-panel">
              <div className="ai-avatar-card">
                <div className="avatar-circle">
                  <Sparkles size={36} color="#ffffff" />
                  {isAiSpeaking && <div className="avatar-pulse"></div>}
                </div>
                <div className="ai-status-text">
                  {isAiSpeaking ? "Gemini AI Speaking..." : "Gemini AI Listening"}
                </div>

                {isAiSpeaking && (
                  <div className="wave-container">
                    <div className="wave-bar" style={{ animationDelay: "0s" }}></div>
                    <div className="wave-bar" style={{ animationDelay: "0.2s" }}></div>
                    <div className="wave-bar" style={{ animationDelay: "0.4s" }}></div>
                    <div className="wave-bar" style={{ animationDelay: "0.1s" }}></div>
                    <div className="wave-bar" style={{ animationDelay: "0.3s" }}></div>
                  </div>
                )}
              </div>

              {/* Live Transcript Stream */}
              <div className="transcript-feed">
                {transcripts.map((t, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`transcript-bubble ${t.sender}`}
                  >
                    <strong>{t.sender === "ai" ? "Interviewer AI" : "You"}:</strong>
                    <p style={{ marginTop: "4px" }}>{t.text}</p>
                  </motion.div>
                ))}
                <div ref={transcriptEndRef} />
              </div>

              {/* Candidate Response Input Bar */}
              <div className="panel-controls">
                <form onSubmit={handleSendTextResponse} style={{ display: "flex", gap: "8px", width: "100%" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type your answer to AI..."
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="start-btn" style={{ width: "auto", margin: 0, padding: "0 1rem" }}>
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Live Monaco Code Editor */}
            <div className="editor-panel">
              <div className="editor-toolbar">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Code2 size={20} style={{ color: "#818cf8" }} />
                  <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#cbd5e1" }}>Candidate Code Workspace</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <span className="sync-status">
                    <CheckCircle2 size={14} /> {syncStatus}
                  </span>
                  <select
                    className="lang-select"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="typescript">TypeScript</option>
                  </select>
                </div>
              </div>

              <div className="editor-container">
                <Editor
                  height="100%"
                  language={language}
                  theme="vs-dark"
                  value={code}
                  onChange={handleCodeChange}
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveInterview;