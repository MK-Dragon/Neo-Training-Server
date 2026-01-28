// src/pages/Home.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Image } from 'react-bootstrap';
import profilePic from '../images/profile/user.jpg';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const Home = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    username: localStorage.getItem('username') || 'User',
    role: localStorage.getItem('userRole') || ''
  });

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${ServerIP}/api/Api/verify`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem("username", data.username);
          localStorage.setItem("userRole", data.role);
          setUserData({ username: data.username, role: data.role });
        } else {
          localStorage.clear();
          navigate('/login');
        }
      } catch (err) {
        console.error("Verification error:", err);
      }
    };

    verifyToken();
  }, [navigate]);

  const isAdmin = userData.role === 'Admin';
  const isTeacher = userData.role === 'Teacher' || isAdmin;
  const isStudent = userData.role === 'Student' || isAdmin;

  // Reusable Component for Dashboard Cards
  const DashboardCard = ({ title, text, link, icon, variant = "primary" }) => (
    <Col md={4} className="mb-4">
      <Card className="h-100 shadow-sm border-0 transition-hover" style={{ cursor: 'pointer' }}>
        <Card.Body className="text-center d-flex flex-column justify-content-center">
          <div className={`text-${variant} mb-3`} style={{ fontSize: '2rem' }}>{icon}</div>
          <Card.Title className="fw-bold">{title}</Card.Title>
          <Card.Text className="text-muted small">{text}</Card.Text>
          <Button as={Link} to={link} variant={`outline-${variant}`} size="sm" className="mt-auto stretched-link">
            Open
          </Button>
        </Card.Body>
      </Card>
    </Col>
  );

  return (
    <Container className="py-5 mt-5">
      {/* --- HERO SECTION --- */}
      <Card className="bg-primary text-white border-0 shadow mb-5 overflow-hidden">
        <Row className="g-0 align-items-center">
          <Col md={3} className="text-center p-4">
            <Image 
              src={profilePic} 
              roundedCircle 
              fluid 
              style={{ width: '150px', border: '5px solid rgba(255,255,255,0.2)' }}
              alt="User Profile"
            />
          </Col>
          <Col md={9} className="p-4">
            <h1 className="display-5 fw-bold">Welcome back, {userData.username}!</h1>
            <p className="lead mb-0">Role: <Badge bg="light" text="dark" className="ms-2">{userData.role}</Badge></p>
          </Col>
        </Row>
      </Card>

      {/* --- MANAGEMENT SECTION (ADMIN ONLY) --- */}
      {isAdmin && (
        <section className="mb-5">
          <h3 className="mb-4 border-bottom pb-2">Management</h3>
          <Row>
            <DashboardCard title="User Management" text="Manage user accounts and roles." link="/UserManagement" icon="👥" variant="dark" />
            <DashboardCard title="Module Management" text="Edit curriculum and module details." link="/ModuleManagement" icon="📚" variant="dark" />
            <DashboardCard title="Sala Management" text="Manage classroom allocations." link="/SalaManagement" icon="🏢" variant="dark" />
            <DashboardCard title="Course Management" text="Organize courses and module links." link="/CourseManagement" icon="🎓" variant="dark" />
            <DashboardCard title="Turma Management" text="Create and manage class groups, link them to courses, and view student lists." link="/TurmaManagement" icon="🏫" variant="success" />
          </Row>
        </section>
      )}

      {/* --- TEACHER SECTION --- */}
      {isTeacher && (
        <section className="mb-5">
          <h3 className="mb-4 border-bottom pb-2">Teacher Dashboard</h3>
          <Row>
            <DashboardCard title="My Schedule" text="View your upcoming classes." link="/schedule" icon="📅" variant="success" />
            <DashboardCard title="Grade Modules" text="Submit grades for your students." link="/grading" icon="📝" variant="success" />
            <DashboardCard title="Availability" text="Manage your working hours." link="/availability" icon="⏰" variant="success" />
          </Row>
        </section>
      )}

      {/* --- STUDENT SECTION --- */}
      {isStudent && (
        <section className="mb-5">
          <h3 className="mb-4 border-bottom pb-2">Student Hub</h3>
          <Row>
            <DashboardCard title="My Schedule" text="Check your class timings." link="/schedule" icon="📅" variant="info" />
            <DashboardCard title="My Grades" text="View your academic performance." link="/grades" icon="🏆" variant="info" />
            <DashboardCard title="Course Materials" text="Access files and resources." link="/materials" icon="📁" variant="info" />
          </Row>
        </section>
      )}
    </Container>
  );
};

// Simple helper for the Hero badge
const Badge = ({ children, bg, text }) => (
  <span className={`badge bg-${bg} text-${text} px-3 py-2 rounded-pill shadow-sm`}>
    {children}
  </span>
);

export default Home;