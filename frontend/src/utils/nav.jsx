import { useState, useEffect } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router'
import '../nav.css'

function Nav(){
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchUser = () => {
        axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/user/me`, {
            withCredentials: true
        })
        .then((res) => {
            setUser(res.data.user || res.data);
        })
        .catch(() => {
            setUser(null);
        })
        .finally(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const handleLogout = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/user/logout`, {}, { withCredentials: true });
        } catch (err) {
            console.error("Logout error", err);
        } finally {
            setUser(null);
            navigate('/login');
        }
    };

    return (
        <nav className="nav-container">
            <div className="nav-glass-bar">
                {/* Main Feature Nav Options */}
                <div className="nav-section main-nav">
                    <div 
                        onClick={() => {
                            if (!user) navigate('/login');
                            else navigate('/upload-resume');
                        }}
                        className="nav-glass-btn primary-upload"
                    >
                        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="12" y1="18" x2="12" y2="12" />
                            <polyline points="9 15 12 12 15 15" />
                        </svg>
                        <span>Upload Resume</span>
                    </div>

                    <div
                        onClick={() => {
                            if (!user) navigate('/login');
                            else navigate('/job-compatibility');
                        }}
                        className="nav-glass-btn primary-job"
                    >
                        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span>Job Compatibility</span>
                    </div>

                    <div
                        onClick={() => {
                            if (!user) navigate('/login');
                            else navigate('/live-interview');
                        }}
                        className="nav-glass-btn primary-interview"
                    >
                        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="4" width="20" height="14" rx="2" ry="2"/>
                            <path d="M2 10h20"/>
                            <polygon points="16 8 12 4 8 8"/>
                        </svg>
                        <span>Live Interview</span>
                    </div>

                    <div
                        onClick={() => {
                            if (!user) navigate('/login');
                            else navigate('/projects');
                        }}
                        className="nav-glass-btn primary-projects"
                    >
                        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span>Projects</span>
                    </div>
                </div>

                <div className="nav-divider"></div>

                {/* Auth Controls */}
                {user ? (
                    <div className="nav-section auth-nav">
                        <Link 
                            to='/user' 
                            className="nav-glass-btn auth-user"
                            title={user.full_name || user.fullname || user.email}
                        >
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            <span className="user-name-text">{user.full_name || user.fullname || user.email}</span>
                        </Link>

                        <button 
                            onClick={handleLogout}
                            className="nav-glass-btn auth-logout"
                        >
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                <polyline points="10 17 15 12 10 7" />
                                <line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                            <span>Logout</span>
                        </button>
                    </div>
                ) : (
                    <div className="nav-section auth-nav">
                        <Link 
                            to='/register' 
                            className="nav-glass-btn auth-register"
                        >
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <line x1="19" y1="8" x2="19" y2="14" />
                                <line x1="16" y1="11" x2="22" y2="11" />
                            </svg>
                            <span>Register</span>
                        </Link>

                        <Link 
                            to='/login' 
                            className="nav-glass-btn auth-login"
                        >
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                <polyline points="10 17 15 12 10 7" />
                                <line x1="15" y1="12" x2="3" y2="12" />
                            </svg>
                            <span>Login</span>
                        </Link>
                    </div>
                )}
            </div>
        </nav>
    );
}

export default Nav;