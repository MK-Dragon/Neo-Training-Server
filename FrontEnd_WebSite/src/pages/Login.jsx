// /src/pages/Login.jsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { GoogleLogin } from '@react-oauth/google';


const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingFor2FA, setIsWaitingFor2FA] = useState(false); // New State
  const navigate = useNavigate();


  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('https://localhost:7089/api/Api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Instead of navigating, start the 2FA wait
        setIsWaitingFor2FA(true);
        localStorage.setItem("username", data.username);
        localStorage.setItem("userRole", data.role);
        
        // Polling Logic
        const interval = setInterval(async () => {
          try {
            const statusRes = await fetch(`https://localhost:7089/api/Api/check-2fa-status/${data.requestId}`);
            const statusData = await statusRes.json();

            if (statusData.verified) {
              clearInterval(interval);
              localStorage.setItem('token', statusData.token);
              console.log("Data: debug: " + statusData);
              navigate('/');
            }
          } catch (pollErr) {
            console.error("Polling error:", pollErr);
          }
        }, 3000);

      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Server connection failed.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleGoogleSuccess = async (credentialResponse) => {
  setIsLoading(true);
  setError('');
  setIsWaitingFor2FA(false); // Explicitly ensure we aren't in 2FA mode

  try {
    const response = await fetch('https://localhost:7089/api/Api/google-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentialResponse.credential),  // JWT from Google
    });

    const data = await response.json();

    if (response.ok) {
      // Google is pre-verified! Go straight to the app.
      console.log("Data: debug: " + data);
      localStorage.setItem('token', data.token);
      localStorage.setItem("username", data.user);
      localStorage.setItem("userRole", data.role);
      navigate('/'); 
    } else {
      setError(data.message || 'Google Login failed');
    }
  } catch (err) {
    setError('Connection error during Google Login');
  } finally {
    setIsLoading(false);
  }
};



  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card p-4 shadow" style={{ width: '400px' }}>
        
        {/* Conditional Rendering starts here */}
        {!isWaitingFor2FA ? (
          <>
            <h2 className="text-center mb-4">Login</h2>
            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <div className="d-flex align-items-center my-3">
                <hr className="flex-grow-1" />
                <span className="mx-2 text-muted small">OR</span>
                <hr className="flex-grow-1" />
              </div>

              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Login Failed')}
              />
            </div>

            <div className="mt-3 text-center">
              <p className="mb-1">
                Don't have an account? <Link to="/register">Create Account</Link>
              </p>
              <p>
                <Link to="/forgot-password" size="sm" className="text-muted" style={{ fontSize: '0.9rem' }}>
                  Forgot password?
                </Link>
              </p>
            </div>
          </>
        ) : (
          /* This is the 2FA Waiting View */
          <div className="text-center py-4">
            <h2 className="mb-3">Check Your Email</h2>
            <div className="spinner-grow text-primary my-4" style={{width: '3rem', height: '3rem'}} role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">
              We've sent a 2FA link to your email address. 
              <strong> Keep this window open</strong> while you verify the link on your phone or another tab.
            </p>
            <button 
              className="btn btn-link mt-3" 
              onClick={() => setIsWaitingFor2FA(false)}
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;