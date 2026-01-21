import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
    role: 'student' // Default value
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Basic Validation
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${ServerIP}/api/Api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          birthDate: formData.birthDate,
          role: formData.role
        }),
      });

      if (response.ok) {
        // Standard success
        alert("Account created successfully! Please check your email to activate it.");
        navigate('/login');
    } else if (response.status === 409) {
        // Specifically catch the "Conflict" status
        const data = await response.json();
        setError(data.message || "Username or Email already exists.");
    } else {
        // Catch-all for other errors (400, 500, etc.)
        const data = await response.json();
        setError(data.message || 'Registration failed');
    }
    } catch (err) {
      setError('Connection error with the server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center py-5">
      <div className="card p-4 shadow" style={{ width: '500px' }}>
        <h2 className="text-center mb-4">Create Account</h2>
        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleRegister}>
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input name="username" type="text" className="form-control" onChange={handleChange} required />
          </div>

          <div className="mb-3">
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-control" onChange={handleChange} required />
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Password</label>
              <input name="password" type="password" className="form-control" onChange={handleChange} required />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Confirm Password</label>
              <input name="confirmPassword" type="password" className="form-control" onChange={handleChange} required />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Birth Date</label>
            <input name="birthDate" type="date" className="form-control" onChange={handleChange} required />
          </div>

          <div className="mb-4">
            <label className="form-label">Role</label>
            <select name="role" className="form-select" value={formData.role} onChange={handleChange}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          <button type="submit" className="btn btn-success w-100" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="mt-3 text-center">
          <Link to="/login">Already have an account? Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;