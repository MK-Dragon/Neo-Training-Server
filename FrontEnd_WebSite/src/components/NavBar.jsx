// /src/components/NavBar.jsx

import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { Link, useNavigate } from 'react-router-dom';

function NavBar() {
  const navigate = useNavigate();

  const handleLogout = async (e) => {
    e.preventDefault(); // Prevent default link behavior

    const token = localStorage.getItem('token');

    try {
      // 1. Notify the API to invalidate the token
      // Even if this fails (e.g., network error), we still want to log out locally
      await fetch('https://localhost:7089/api/Api/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (err) {
      console.error("API logout failed, cleaning up locally anyway", err);
    }

    // 2. Clean up local storage
    localStorage.removeItem('token');
    localStorage.removeItem('username');

    // 3. Redirect to login
    navigate('/login');
  };

  return (
    <Navbar expand="lg" bg="primary" data-bs-theme="dark" className="shadow-sm" fixed="top">
      <Container>
        <Navbar.Brand as={Link} to="/">Home</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Dashboard</Nav.Link>
            <Nav.Link as={Link} to="/UserManagement">Edit Users</Nav.Link>
            {/* We use an anchor-like link but trigger the function */}
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
