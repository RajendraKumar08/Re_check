import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import "./job-compatibility.css";
import "./upload-resume.css";

function Jobcompactibility() {
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

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
      <div className="compatibility-container" style={{ textAlign: "center", padding: "4rem 1rem" }}>
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

  const checkCompatibility = async (e) => {
    if (e) e.preventDefault();
    if (!resume) {
      setError("Please select a resume file first.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Please paste the job description text.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("resume", resume);
    formData.append("jobDescription", jobDescription);

    try {
      const response = await axios.post(
        "http://localhost:8000/api/resume/jobCompatibility",
        formData,
        {
          withCredentials: true,
        }
      );
      setResult(response.data);
    } catch (err) {
      console.error("Job compatibility error", err);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to calculate job compatibility. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  const matchNum = result ? parseInt(result.matchPercentage, 10) || 0 : 0;
  const circumference = 2 * Math.PI * 58;
  const strokeDashoffset = circumference - (matchNum / 100) * circumference;

  const getMatchBadgeClass = (score) => {
    if (score >= 80) return "badge-strong";
    if (score >= 60) return "badge-moderate";
    return "badge-low";
  };

  return (
    <div className="compatibility-container">
      {/* Header */}
      <div className="compatibility-header">
        <h1>Job Description Compatibility</h1>
        <p>
          Compare your resume against any target job description to get an accurate ATS match score, skill breakdown, and tailored optimization advice.
        </p>
      </div>

      {/* Main Input Form */}
      {!result && (
        <div className="compatibility-card">
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
              <div className="loading-title">Calculating Job Match...</div>
              <div className="loading-subtitle">
                Our AI model is cross-referencing your resume experience with the target job requirements.
              </div>
            </div>
          ) : (
            <form onSubmit={checkCompatibility} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Job Description Textarea */}
              <div>
                <label className="form-group-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  Target Job Description
                </label>
                <textarea
                  className="jd-textarea"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the target job description or requirements here..."
                  rows={7}
                />
              </div>

              {/* Resume File Upload */}
              <div>
                <label className="form-group-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Your Resume File
                </label>

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
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className="dropzone-title">Click to upload or drag & drop resume</div>
                    <div className="dropzone-subtitle">PDF, DOCX, DOC or TXT supported</div>
                  </div>
                ) : (
                  <div className="selected-file-card">
                    <div className="selected-file-info">
                      <div className="file-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="file-details">
                        <div className="file-name">{resume.name}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-remove-file"
                      title="Change file"
                      onClick={(e) => {
                        e.stopPropagation();
                        setResume(null);
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-analyze-compatibility"
                disabled={!resume || !jobDescription.trim()}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Calculate Job Match
              </button>
            </form>
          )}
        </div>
      )}

      {/* Results Dashboard */}
      {result && (
        <div>
          <div className="dashboard-header" style={{ marginBottom: "1.5rem" }}>
            <div className="dashboard-title">
              <h2>Job Compatibility Results</h2>
              <p>AI evaluation matching your resume against the target role</p>
            </div>
            <button className="btn-reupload" onClick={handleReset}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6" />
                <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M2.5 16l1.2 1.2A10 10 0 0 0 22 12.5" />
              </svg>
              Test Another Role
            </button>
          </div>

          <div className="comp-results-grid">
            {/* Score Ring */}
            <div className="comp-score-card">
              <div className="comp-score-circle">
                <svg viewBox="0 0 130 130">
                  <circle className="comp-score-bg" cx="65" cy="65" r="58" />
                  <circle
                    className="comp-score-val"
                    cx="65"
                    cy="65"
                    r="58"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="comp-score-overlay">
                  <span className="comp-score-number">{matchNum}</span>
                  <span className="comp-score-percent">% Match</span>
                </div>
              </div>
              <span className={`comp-badge ${getMatchBadgeClass(matchNum)}`}>
                {result.matchLevel || (matchNum >= 80 ? "Strong Match" : matchNum >= 60 ? "Moderate Match" : "Low Match")}
              </span>
            </div>

            {/* Analysis & Skill Breakdown */}
            <div className="comp-details-column">
              {/* Executive Summary Card */}
              {result.summary && (
                <div className="section-card">
                  <div className="section-title title-strengths">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    Role Match Analysis
                  </div>
                  <div style={{ fontSize: "0.95rem", lineHeight: "1.6", color: "var(--text)" }}>
                    {result.summary}
                  </div>
                </div>
              )}

              {/* Skills Grid */}
              <div className="comp-skills-grid">
                {/* Matching Skills */}
                {Array.isArray(result.matchingSkills) && result.matchingSkills.length > 0 && (
                  <div className="section-card">
                    <div className="section-title title-strengths">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Matching Skills
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {result.matchingSkills.map((skill, idx) => (
                        <span key={idx} className="skill-pill-green">
                          ✓ {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Skills */}
                {Array.isArray(result.missingSkills) && result.missingSkills.length > 0 && (
                  <div className="section-card">
                    <div className="section-title title-weaknesses">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Missing Job Requirements
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {result.missingSkills.map((skill, idx) => (
                        <span key={idx} className="skill-pill-red">
                          ! {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
                <div className="section-card">
                  <div className="section-title title-suggestions">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8.5 14.5A6 6 0 0 1 11 2h2a6 6 0 0 1 2.5 12.5V17A1.5 1.5 0 0 1 14 18.5h-4A1.5 1.5 0 0 1 8.5 17v-2.5z" />
                      <path d="M9 21h6" />
                    </svg>
                    Actionable Recommendations
                  </div>
                  <div className="suggestions-list">
                    {result.recommendations.map((item, idx) => (
                      <div key={idx} className="suggestion-item">
                        <div className="suggestion-step">{idx + 1}</div>
                        <div>{item}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Jobcompactibility;