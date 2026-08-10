import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import "./upload-resume.css";

function Upload_Resume() {
  const [resume, setResume] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [aiResponse, setAiResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [aiquestion, setaiquestion] = useState(null);
  const [aiquestionloading, setaiquestionloading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const navigate = useNavigate();

  const handleCopyQuestion = (text, idx) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handlequestion = async () => {
    if (!resume) {
      setError("Please select or upload a resume file first.");
      return;
    }
    setaiquestionloading(true);
    const formData = new FormData();
    formData.append("resume", resume);
    try {
      const response = await axios.post("http://localhost:8000/api/resume/questionsFromProject", formData, {
        withCredentials: true,
      });
      const questionsData = response.data.questions || response.data;
      setaiquestion(Array.isArray(questionsData) ? questionsData : []);
    } catch (err) {
      console.error("Upload error", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to generate project questions. Please try again."
      );
    } finally {
      setaiquestionloading(false);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/user/me", {
          withCredentials: true,
        });
        setUser(response.data.user || response.data);
      } catch (err) {
        console.error("Error fetching user", err);
        navigate("/login");
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  if (authLoading) {
    return (
      <div className="upload-resume-container" style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <div className="loading-spinner"></div>
        <p style={{ color: "var(--text)", marginTop: "1rem" }}>Verifying session...</p>
      </div>
    );
  }


  const handleFileSelect = (file) => {
    if (!file) return;
    setError(null);
    setResume(file);
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

  const handleUpload = async (e) => {
    if (e) e.preventDefault();
    if (!resume) {
      setError("Please select a resume file before uploading.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("resume", resume);

    try {
      const response = await axios.post(
        "http://localhost:8000/api/resume/analyse",
        formData,
        {
          withCredentials: true,
        }
      );
      setAiResponse(response.data);
    } catch (err) {
      console.error("Upload error", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to analyze resume. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResume(null);
    setAiResponse(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Compute ATS Score formatting
  const getScoreInfo = (rawScore) => {
    const numScore = parseInt(rawScore, 10) || 0;
    if (numScore >= 80) {
      return { gradeClass: "grade-excellent", text: "Excellent Match" };
    } else if (numScore >= 60) {
      return { gradeClass: "grade-good", text: "Good Potential" };
    } else {
      return { gradeClass: "grade-needs-work", text: "Needs Improvement" };
    }
  };

  const scoreNum = aiResponse ? parseInt(aiResponse.atsScore, 10) || 0 : 0;
  const scoreInfo = aiResponse ? getScoreInfo(aiResponse.atsScore) : null;
  const circumference = 2 * Math.PI * 58; // circle radius = 58
  const strokeDashoffset = circumference - (scoreNum / 100) * circumference;

  return (
    <div className="upload-resume-container">
      {/* Header */}
      <div className="upload-header">
        <h1>Re-Check Your Resume</h1>
        <p>
          Upload your resume to receive AI breakdown, ATS score, key strength identification, and customized suggestions.
        </p>
      </div>

      {/* Main Form & Upload Card */}
      {!aiResponse && (
        <div className="upload-card">
          {error && (
            <div className="error-banner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <div className="loading-title">Analyzing Your Resume...</div>
              <div className="loading-subtitle">
                Our AI model is evaluating your skills, formatting, and keyword matching.
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpload}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                style={{ display: "none" }}
                onChange={(e) => handleFileSelect(e.target.files[0])}
              />

              {!resume ? (
                <div
                  className={`dropzone-container ${isDragging ? "is-dragging" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="dropzone-icon-wrapper">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="dropzone-title">Click to upload or drag & drop</div>
                  <div className="dropzone-subtitle">PDF, DOCX, DOC or TXT formats supported</div>
                  <span className="dropzone-formats">Max file size 10MB</span>
                </div>
              ) : (
                <div className="selected-file-card">
                  <div className="selected-file-info">
                    <div className="file-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                    <div className="file-details">
                      <div className="file-name">{resume.name}</div>
                      <div className="file-size">{formatFileSize(resume.size)}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-remove-file"
                    title="Remove file"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              )}

              <div className="upload-actions">
                <button type="submit" className="btn-submit-upload" disabled={!resume}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Analyze Resume
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Analysis Results Dashboard */}
      {aiResponse && (
        <div className="results-dashboard">
          <div className="dashboard-header">
            <div className="dashboard-title">
              <h2>Resume Analysis Results</h2>
              <p>Detailed AI evaluation and actionable recommendations</p>
            </div>
            <button className="btn-reupload" onClick={handleReset}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6" />
                <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M2.5 16l1.2 1.2A10 10 0 0 0 22 12.5" />
              </svg>
              Upload Another Resume
            </button>
          </div>

          {/* Overview Section: Score Meter + Executive Summary */}
          <div className="overview-grid">
            {/* ATS Score Meter Card */}
            <div className="score-card">
              <div className="score-meter">
                <svg viewBox="0 0 130 130">
                  <circle className="score-bg-circle" cx="65" cy="65" r="58" />
                  <circle
                    className="score-val-circle"
                    cx="65"
                    cy="65"
                    r="58"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="score-text-overlay">
                  <span className="score-number">{scoreNum}</span>
                  <span className="score-label">ATS Score</span>
                </div>
              </div>
              <span className={`score-grade-badge ${scoreInfo.gradeClass}`}>
                {scoreInfo.text}
              </span>
            </div>

            {/* Executive Summary Card */}
            {aiResponse.summary && (
              <div className="summary-card">
                <div className="summary-card-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Executive Summary
                </div>
                <div className="summary-content">{aiResponse.summary}</div>
              </div>
            )}
          </div>

          {/* Strengths & Weaknesses Grid */}
          <div className="details-grid">
            {/* Strengths Card */}
            {Array.isArray(aiResponse.strengths) && aiResponse.strengths.length > 0 && (
              <div className="section-card">
                <div className="section-title title-strengths">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Key Strengths
                </div>
                <ul className="icon-list">
                  {aiResponse.strengths.map((item, idx) => (
                    <li key={idx}>
                      <span className="badge-icon icon-strength">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses Card */}
            {Array.isArray(aiResponse.weaknesses) && aiResponse.weaknesses.length > 0 && (
              <div className="section-card">
                <div className="section-title title-weaknesses">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Areas for Improvement
                </div>
                <ul className="icon-list">
                  {aiResponse.weaknesses.map((item, idx) => (
                    <li key={idx}>
                      <span className="badge-icon icon-weakness">!</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Missing Keywords Cloud */}
          {Array.isArray(aiResponse.missingKeywords) && aiResponse.missingKeywords.length > 0 && (
            <div className="section-card">
              <div className="section-title title-keywords">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
                Missing Industry Keywords
              </div>
              <p style={{ fontSize: "0.9rem", color: "var(--text)", marginBottom: "1rem" }}>
                Adding these relevant keywords can significantly increase your ATS scanning visibility.
              </p>
              <div className="keyword-tags">
                {aiResponse.missingKeywords.map((keyword, idx) => (
                  <span className="keyword-pill" key={idx}>
                    <span className="keyword-plus">+</span> {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions List */}
          {Array.isArray(aiResponse.suggestions) && aiResponse.suggestions.length > 0 && (
            <div className="section-card">
              <div className="section-title title-suggestions">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8.5 14.5A6 6 0 0 1 11 2h2a6 6 0 0 1 2.5 12.5V17A1.5 1.5 0 0 1 14 18.5h-4A1.5 1.5 0 0 1 8.5 17v-2.5z" />
                  <path d="M9 21h6" />
                </svg>
                Actionable Optimization Steps
              </div>
              <div className="suggestions-list">
                {aiResponse.suggestions.map((suggestion, idx) => (
                  <div className="suggestion-item" key={idx}>
                    <div className="suggestion-step">{idx + 1}</div>
                    <div>{suggestion}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Project & Technical Interview Questions Section */}
          <div className="section-card questions-section">
            <div className="questions-section-header">
              <div className="questions-title-wrapper">
                <div className="section-title title-questions">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="M9 13h6" />
                    <path d="M9 17h3" />
                  </svg>
                  Project & Technical Interview Questions
                </div>
                <p className="questions-subtitle">
                  AI-extracted technical and experience-based interview questions tailored to your resume projects.
                </p>
              </div>

              <button
                className="btn-generate-questions"
                type="button"
                onClick={handlequestion}
                disabled={aiquestionloading}
              >
                {aiquestionloading ? (
                  <>
                    <span className="btn-spinner"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    {aiquestion ? "Regenerate Questions" : "Generate Questions"}
                  </>
                )}
              </button>
            </div>

            {/* Loading State */}
            {aiquestionloading && (
              <div className="questions-loading-state">
                <div className="loading-spinner"></div>
                <p>Analyzing project details and crafting targeted technical questions...</p>
              </div>
            )}

            {/* Initial Empty State */}
            {!aiquestionloading && !aiquestion && (
              <div className="questions-empty-state">
                <div className="empty-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <h4>Ready to prep for technical interviews?</h4>
                <p>Click "Generate Questions" above to extract custom project & technical questions from your resume.</p>
              </div>
            )}

            {/* Generated Questions List */}
            {!aiquestionloading && Array.isArray(aiquestion) && aiquestion.length > 0 && (
              <div className="questions-list">
                {aiquestion.map((q, idx) => {
                  const questionText = typeof q === "object" ? q.question : q;
                  const categoryText = typeof q === "object" && q.category ? q.category : "Technical Project";
                  const isCopied = copiedIdx === idx;

                  return (
                    <div key={idx} className="question-card">
                      <div className="question-card-header">
                        <div className="question-badge-group">
                          <span className="question-number">Question #{idx + 1}</span>
                          <span className="question-category-pill">{categoryText}</span>
                        </div>
                        <button
                          className={`btn-copy-question ${isCopied ? "copied" : ""}`}
                          title="Copy Question"
                          onClick={() => handleCopyQuestion(questionText, idx)}
                        >
                          {isCopied ? (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Copied!
                            </>
                          ) : (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <div className="question-text">{questionText}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Upload_Resume;