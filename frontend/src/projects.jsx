import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import "./projects.css";

function Projects() {
  const [githubrepo, setGithubrepo] = useState("");
  const [projectquestionsandAnswer, setProjectquestionsandAnswer] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState({});
  const [practiceMode, setPracticeMode] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState({});
  const [toastMessage, setToastMessage] = useState("");
  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  // Preset example repos for quick testing
  const presetRepos = [
    "https://github.com/facebook/react",
    "https://github.com/expressjs/express",
    "https://github.com/vercel/next.js",
    "https://github.com/tailwindlabs/tailwindcss"
  ];

  // Auth session check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/user/me`, {
          withCredentials: true,
        });
        setUser(res.data.user || res.data);
      } catch (err) {
        console.error("Session check error", err);
        navigate("/login");
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 2500);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!githubrepo.trim()) {
      setError("Please enter a valid GitHub repository URL.");
      return;
    }

    setLoading(true);
    setError(null);
    setProjectquestionsandAnswer([]);

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/project/project-questions`,
        { githubrepo: githubrepo.trim() },
        { withCredentials: true }
      );

      if (res.data && res.data.error) {
        setError(res.data.error);
      } else if (Array.isArray(res.data)) {
        setProjectquestionsandAnswer(res.data);
        // Expand all by default
        const initialExpanded = {};
        res.data.forEach((_, idx) => {
          initialExpanded[idx] = true;
        });
        setExpandedItems(initialExpanded);
      } else {
        setError("Received an invalid response format from the server.");
      }
    } catch (err) {
      console.error("Error generating project questions:", err);
      setError(
        err.response?.data?.error || err.message || "Failed to analyze repository. Please check backend server."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (index) => {
    setExpandedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const toggleAll = (expand) => {
    const updated = {};
    projectquestionsandAnswer.forEach((_, idx) => {
      updated[idx] = expand;
    });
    setExpandedItems(updated);
  };

  const toggleRevealAnswer = (index) => {
    setRevealedAnswers((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  };

  // Filtered questions based on search input
  const filteredQuestions = projectquestionsandAnswer.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.question?.toLowerCase().includes(query) ||
      item.answer?.toLowerCase().includes(query)
    );
  });

  if (authLoading) {
    return (
      <div className="projects-container" style={{ textAlign: "center", paddingTop: "5rem" }}>
        <div className="loading-spinner-large" style={{ margin: "0 auto" }}></div>
        <p style={{ color: "var(--text)", marginTop: "1.5rem" }}>Loading session...</p>
      </div>
    );
  }

  return (
    <div className="projects-container">
      {/* Header Section */}
      <div className="projects-header">
        <div className="projects-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
          <span>AI Repository Inspector</span>
        </div>
        <h1>Project Technical Prep</h1>
        <p>
          Analyze any public GitHub repository to generate 10 tailored, deep-dive interview questions with complete solutions based on real code architecture.
        </p>
      </div>

      {/* Input Card */}
      <div className="projects-form-card">
        <form onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="repo-input-field">
            GitHub Repository URL or Name
          </label>
          <div className="input-wrapper">
            <span className="input-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </span>
            <input
              id="repo-input-field"
              type="text"
              className="repo-input"
              placeholder="e.g. https://github.com/facebook/react"
              value={githubrepo}
              onChange={(e) => {
                setGithubrepo(e.target.value);
                if (error) setError(null);
              }}
              disabled={loading}
            />
            {githubrepo && !loading && (
              <button
                type="button"
                className="clear-btn"
                onClick={() => setGithubrepo("")}
                title="Clear input"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>

          {/* Preset Buttons */}
          <div className="presets-wrapper">
            <span className="presets-label">Quick Try:</span>
            {presetRepos.map((url, idx) => (
              <button
                key={idx}
                type="button"
                className="preset-chip"
                onClick={() => {
                  setGithubrepo(url);
                  if (error) setError(null);
                }}
              >
                {url.replace("https://github.com/", "")}
              </button>
            ))}
          </div>

          <button type="submit" className="btn-generate" disabled={loading || !githubrepo.trim()}>
            {loading ? (
              <>
                <div className="loading-spinner-large" style={{ width: 20, height: 20, borderWidth: 2 }} />
                <span>Analyzing Repository & Codebase...</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>Generate Technical Questions</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="projects-error-banner">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading Card View */}
      {loading && (
        <div className="projects-loading-card">
          <div className="loading-spinner-large"></div>
          <div>
            <h3 className="loading-title">Scanning GitHub Repository</h3>
            <p className="loading-subtext">
              Extracting system architecture, key modules, dependencies, and generating interview questions...
            </p>
          </div>
        </div>
      )}

      {/* Results View */}
      {!loading && projectquestionsandAnswer.length > 0 && (
        <div className="projects-results">
          <div className="results-toolbar">
            <div className="results-repo-info">
              <h2 className="results-repo-title">
                <span>Interview Questions</span>
                <span className="results-count-badge">{filteredQuestions.length} Items</span>
              </h2>
            </div>

            <div className="toolbar-controls">
              <input
                type="text"
                className="search-filter-input"
                placeholder="Filter questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <button
                type="button"
                className={`tool-btn ${practiceMode ? "active" : ""}`}
                onClick={() => setPracticeMode(!practiceMode)}
                title="Hide answers to self-test"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>{practiceMode ? "Practice Mode ON" : "Practice Mode"}</span>
              </button>

              <button
                type="button"
                className="tool-btn"
                onClick={() => toggleAll(true)}
              >
                Expand All
              </button>

              <button
                type="button"
                className="tool-btn"
                onClick={() => toggleAll(false)}
              >
                Collapse All
              </button>
            </div>
          </div>

          <div className="qa-list">
            {filteredQuestions.map((item, index) => {
              const isExpanded = expandedItems[index] !== false;
              const isAnswerRevealed = !practiceMode || revealedAnswers[index];

              return (
                <div key={index} className="qa-card">
                  <div className="qa-card-header" onClick={() => toggleExpand(index)}>
                    <div className="qa-question-content">
                      <div className="qa-meta">
                        <span className="qa-num-badge">Q{index + 1}</span>
                        <span className="qa-category-tag">Technical Concept</span>
                      </div>
                      <h3 className="qa-question-text">{item.question}</h3>
                    </div>

                    <div className="qa-card-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(
                            `Q: ${item.question}\n\nA: ${item.answer}`,
                            "Question & Answer"
                          );
                        }}
                        title="Copy Question & Answer"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>

                      <div className={`icon-btn expand-icon ${isExpanded ? "expanded" : ""}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="qa-answer-container">
                      <div className="answer-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                        </svg>
                        <span>Expected Answer & Technical Breakdown</span>
                      </div>

                      {isAnswerRevealed ? (
                        <p className="answer-text">{item.answer}</p>
                      ) : (
                        <button
                          type="button"
                          className="btn-reveal-answer"
                          onClick={() => toggleRevealAnswer(index)}
                        >
                          👁 Reveal Model Answer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Initial Empty / Feature Showcase View */}
      {!loading && projectquestionsandAnswer.length === 0 && (
        <div className="projects-showcase">
          <h2>How Project Interview Analysis Works</h2>
          <p style={{ color: "var(--text)", maxWidth: "560px", margin: "0.5rem auto 0" }}>
            Give candidate interviewers and applicants deep insight into any code base with instant AI architectural evaluation.
          </p>

          <div className="showcase-grid">
            <div className="showcase-item">
              <div className="showcase-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              </div>
              <h4>Architecture Analysis</h4>
              <p>Evaluates repository design patterns, component relationships, and folder structure.</p>
            </div>

            <div className="showcase-item">
              <div className="showcase-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h4>10 Technical Q&As</h4>
              <p>Generates tailored technical questions testing real codebase comprehension and practical trade-offs.</p>
            </div>

            <div className="showcase-item">
              <div className="showcase-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h4>Self-Practice Mode</h4>
              <p>Hide model answers to quiz yourself before revealing the technical breakdown.</p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-feedback">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default Projects;