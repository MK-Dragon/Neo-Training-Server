// /src/components/NavBar.jsx

import React, { useState } from 'react';
import { Container, Nav, Navbar, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

function NavBar() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const username = localStorage.getItem('username') || "Profile";
  const userRole = localStorage.getItem('userRole');

  const closeNav = () => setExpanded(false);

  // ... handleLogout function remains the same ...
  const handleLogout = async (e) => {
    e.preventDefault();
    closeNav();
    const token = localStorage.getItem('token');
    try {
      await fetch('https://localhost:7089/api/Api/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
    } catch (err) { console.error("API logout failed", err); }
    localStorage.clear();
    navigate('/login');
  };

  return (
    <>
      {/* Inline style to force the dropdown to match the primary theme */}
      <style>
        {`
          .custom-nav-dropdown .dropdown-menu {
            background-color: #0d6efd; /* Bootstrap Primary Blue */
            border: none;
            box-shadow: 0px 8px 16px rgba(0,0,0,0.2);
          }
          .custom-nav-dropdown .dropdown-item {
            color: rgba(255, 255, 255, 0.8);
          }
          .custom-nav-dropdown .dropdown-item:hover {
            background-color: #0a58ca; /* Slightly darker blue on hover */
            color: #fff;
          }
          .custom-nav-dropdown .dropdown-divider {
            border-top: 1px solid rgba(255, 255, 255, 0.2);
          }
        `}
      </style>

      <Navbar 
        expand="lg" 
        bg="primary" 
        data-bs-theme="dark" 
        className="shadow-sm" 
        fixed="top"
        expanded={expanded}
        onToggle={(nextExpanded) => setExpanded(nextExpanded)}
      >
        <Container>
          <Navbar.Brand as={Link} to="/" onClick={closeNav}>Home</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/" onClick={closeNav}>Dashboard</Nav.Link>
              
              {userRole === 'Admin' && (
                <NavDropdown 
                  title="Administration" 
                  id="admin-nav-dropdown" 
                  className="custom-nav-dropdown" // Applied the custom class
                >
                  <NavDropdown.Item as={Link} to="/UserManagement" onClick={closeNav}>Edit Users</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/SalaManagement" onClick={closeNav}>Manage Salas</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/ModuleManagement" onClick={closeNav}>Manage Modules</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/CourseManagement" onClick={closeNav}>Manage Courses</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/TurmaManagement" onClick={closeNav}>Manage Turmas</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/TeacherModuleManager" onClick={closeNav}>Manage Teacher/Module</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/AdminTeacherSchedule" onClick={closeNav}>Admin: Teacher Schedule</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/TurmaScheduleAdmin" onClick={closeNav}>Admin: Turma Schedule</NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item as={Link} to="/EnrollmentManagement" onClick={closeNav}>Enrollment Management</NavDropdown.Item>
                  <NavDropdown.Item as={Link} to="/TurmaDashboard" onClick={closeNav}>Turma Dashboard</NavDropdown.Item>
                </NavDropdown>
              )}

              {userRole === 'Teacher' && (
                <Nav.Link as={Link} to="/TeacherAvailability" onClick={closeNav}>Manage Availability</Nav.Link>
              )}

              {userRole === 'Student' && (
                <Nav.Link as={Link} to="/StudentSchedule" onClick={closeNav}>Student Schedule</Nav.Link>
              )}
            </Nav>

            <Nav>
              <Nav.Link as={Link} to="/userProfile" className="fw-bold text-info" onClick={closeNav}>
                👤 {username}
              </Nav.Link>
              <Nav.Link onClick={handleLogout} style={{ cursor: 'pointer' }}>
                Logout
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
}

export default NavBar;