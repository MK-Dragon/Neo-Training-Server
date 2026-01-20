// /src/components/NavBar.jsx

import React, { useState } from 'react'; // 1. Add useState
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { Link, useNavigate } from 'react-router-dom';

function NavBar() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false); // 2. State to track expansion

  const username = localStorage.getItem('username') || "Profile";
  const userRole = localStorage.getItem('userRole');

  // Helper to close the navbar
  const closeNav = () => setExpanded(false);

  const handleLogout = async (e) => {
    e.preventDefault();
    closeNav(); // Close the menu on logout
    const token = localStorage.getItem('token');

    try {
      await fetch('https://localhost:7089/api/Api/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      console.error("API logout failed", err);
    }

    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  return (
    <Navbar 
      expand="lg" 
      bg="primary" 
      data-bs-theme="dark" 
      className="shadow-sm" 
      fixed="top"
      expanded={expanded} // 3. Controlled component
      onToggle={(nextExpanded) => setExpanded(nextExpanded)} // 4. Sync toggle button
    >
      <Container>
        <Navbar.Brand as={Link} to="/" onClick={closeNav}>Home</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {/* Added onClick={closeNav} to every link */}
            <Nav.Link as={Link} to="/" onClick={closeNav}>Dashboard</Nav.Link>
            
            {userRole === 'Admin' && (
               <Nav.Link as={Link} to="/UserManagement" onClick={closeNav}>Edit Users</Nav.Link>
            )}
          </Nav>

          <Nav>
            <Nav.Link as={Link} to="/profile" className="fw-bold text-info" onClick={closeNav}>
              👤 {username}
            </Nav.Link>
            <Nav.Link onClick={handleLogout} style={{ cursor: 'pointer' }}>
              Logout
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavBar;