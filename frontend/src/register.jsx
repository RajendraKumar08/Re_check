import axios from "axios"
import { useState } from "react"
import { Link, useNavigate } from 'react-router'
import './auth.css'

function Register() {
  const [formdata, setformdata] = useState({
    fullname: "",
    email: "",
    password: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const navigate = useNavigate()

  function handlechange(e) {
    if (errorMsg) setErrorMsg(null)
    setformdata({
      ...formdata,
      [e.target.name]: e.target.value
    })
  }

  const handlesubmit = async (e) => {
    e.preventDefault()
    if (!formdata.fullname || !formdata.email || !formdata.password) {
      setErrorMsg("Please fill out all required fields.")
      return
    }

    if (formdata.password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.")
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/user/register`,
        {
          fullname: formdata.fullname.trim(),
          email: formdata.email.trim(),
          password: formdata.password
        },
        { withCredentials: true }
      )

      setSuccessMsg("Registration successful! Redirecting to login...")
      setTimeout(() => {
        window.location.href = '/login'
      }, 1200)
    } catch (error) {
      console.error("Registration error:", error)
      const errMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Registration failed. Please try again."
      setErrorMsg(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="16" y1="11" x2="22" y2="11" />
            </svg>
            <span>Create Account</span>
          </div>
          <h1>Get Started</h1>
          <p>Create an account to track your interview prep & project evaluations.</p>
        </div>

        {errorMsg && (
          <div className="auth-error-alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-success-alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handlesubmit} className="auth-form">
          <div className="input-group">
            <label className="input-label" htmlFor="fullname-input">Full Name</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="fullname-input"
                type="text"
                name="fullname"
                className="auth-input"
                placeholder="John Doe"
                value={formdata.fullname}
                onChange={handlechange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="reg-email-input">Email Address</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                id="reg-email-input"
                type="email"
                name="email"
                className="auth-input"
                placeholder="name@example.com"
                value={formdata.email}
                onChange={handlechange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="reg-password-input">Password</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="reg-password-input"
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="auth-input"
                placeholder="Create a strong password (min 6 chars)"
                value={formdata.password}
                onChange={handlechange}
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1. 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-auth-submit" disabled={loading}>
            {loading ? (
              <>
                <div className="btn-spinner" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Register</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account?</span>
          <Link to="/login" className="auth-footer-link">
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Register