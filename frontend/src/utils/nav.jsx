import {Link} from 'react-router'
import '../nav.css'

function Nav(){
    return <>
        <nav className="nav-container">
            <div 
                className="nav-glass-bar"
                style={{
                    display: "flex", 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '8px 16px', 
                    width: "85%", 
                    margin: "auto", 
                    borderRadius: "50px"
                }}
            >
                {/* Main Feature Nav Options */}
                <div className="nav-section main-nav">
                    <Link 
                        to='/upload-resume' 
                        className="nav-glass-btn primary-upload"
                        style={{color: 'white', textDecoration: 'none'}}
                    >
                        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="12" y1="18" x2="12" y2="12" />
                            <polyline points="9 15 12 12 15 15" />
                        </svg>
                        <span>Upload Resume</span>
                    </Link>

                    <Link 
                        to='/job-compatibility' 
                        className="nav-glass-btn primary-job"
                        style={{color: 'white', textDecoration: 'none'}}
                    >
                        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span>Job Compatibility</span>
                    </Link>
                </div>

                {/* Divider */}
                <div className="nav-divider"></div>

                {/* Side Auth Options (Register & Login) */}
                <div className="nav-section auth-nav">
                    <Link 
                        to='/register' 
                        className="nav-glass-btn auth-register"
                        style={{color: 'white', textDecoration: 'none'}}
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
                        style={{color: 'white', textDecoration: 'none'}}
                    >
                        <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                            <polyline points="10 17 15 12 10 7" />
                            <line x1="15" y1="12" x2="3" y2="12" />
                        </svg>
                        <span>Login</span>
                    </Link>
                </div>
            </div>
        </nav>
    </>
}

export default Nav;