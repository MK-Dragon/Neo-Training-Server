// src/pages/Home.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Container, Row, Col, Card, Button, Image, 
  Modal, ListGroup, Spinner, Badge as RBBadge 
} from 'react-bootstrap';
import profilePic from '../images/profile/user.jpg';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const Home = () => {
  const navigate = useNavigate();
  
  // --- User Identity State ---
  const [userData, setUserData] = useState({
    username: localStorage.getItem('username') || 'User',
    role: localStorage.getItem('userRole') || '',
    id: localStorage.getItem('userId') || null
  });

  // --- Modal & Data States ---
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  
  const [showStudentTurmaModal, setShowStudentTurmaModal] = useState(false);
  const [studentTurmas, setStudentTurmas] = useState([]);
  
  const [loadingModalData, setLoadingModalData] = useState(false);

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
          localStorage.setItem("userId", data.id);
          setUserData({ username: data.username, role: data.role, id: data.id });
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

  // --- Teacher Logic: Fetch Assignments ---
  const handleOpenGrading = async () => {
    const userId = userData.id || localStorage.getItem('userId');
    if (!userId) return;

    setShowGradingModal(true);
    setLoadingModalData(true);
    try {
      const res = await fetch(`${ServerIP}/api/Teacher/teacher/${userId}/assignments`);
      if (res.ok) {
        const data = await res.json();
        setTeacherAssignments(data);
      }
    } catch (err) {
      console.error("Teacher fetch error:", err);
    } finally {
      setLoadingModalData(false);
    }
  };

  // --- Student Logic: Fetch Enrolled Turmas ---
  const handleOpenStudentGrades = async () => {
    const userId = userData.id || localStorage.getItem('userId');
    if (!userId) return;

    setShowStudentTurmaModal(true);
    setLoadingModalData(true);
    try {
      const res = await fetch(`${ServerIP}/api/Student/student/${userId}/enrolled-turmas`);
      if (res.ok) {
        const data = await res.json();
        setStudentTurmas(data);
      }
    } catch (err) {
      console.error("Student fetch error:", err);
    } finally {
      setLoadingModalData(false);
    }
  };

  const isAdmin = userData.role === 'Admin';
  const isTeacher = userData.role === 'Teacher' || isAdmin;
  const isStudent = userData.role === 'Student' || isAdmin;

  // Reusable Component for Dashboard Cards
  const DashboardCard = ({ title, text, link, icon, variant = "primary", onClick }) => (
    <Col md={4} className="mb-4">
      <Card 
        className="h-100 shadow-sm border-0 transition-hover" 
        style={{ cursor: 'pointer' }}
        onClick={onClick}
      >
        <Card.Body className="text-center d-flex flex-column justify-content-center">
          <div className={`text-${variant} mb-3`} style={{ fontSize: '2rem' }}>{icon}</div>
          <Card.Title className="fw-bold">{title}</Card.Title>
          <Card.Text className="text-muted small">{text}</Card.Text>
          {link ? (
            <Button as={Link} to={link} variant={`outline-${variant}`} size="sm" className="mt-auto stretched-link">
              Open
            </Button>
          ) : (
            <Button variant={`outline-${variant}`} size="sm" className="mt-auto">
              Select
            </Button>
          )}
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
          <h3 className="mb-4 border-bottom pb-2">Administrative Management</h3>
          <Row>
            {/* Existing Links */}
            <DashboardCard title="User Management" text="Manage user accounts and roles." link="/UserManagement" icon="👥" variant="dark" />
            <DashboardCard title="Course Management" text="Organize and edit course curriculum." link="/CourseManagement" icon="🎓" variant="dark" />
            <DashboardCard title="Module Management" text="Define and update academic modules." link="/ModuleManagement" icon="📚" variant="dark" />

            <DashboardCard title="Enrollment Management" text="Register and track student enrollments." link="/EnrollmentManagement" icon="📋" variant="success" />
            <DashboardCard title="Teacher Assignments" text="Assign modules to specific teachers." link="/TeacherModuleManager" icon="🤝" variant="success" />
            <DashboardCard title="Turma Management" text="Manage class groups and scheduling." link="/TurmaManagement" icon="🏫" variant="success" />

            <DashboardCard 
              title="Turma Dashboard" 
              text="Overview of all active classes and statistics." 
              link="/turmadashboard" 
              icon="📊" 
              variant="primary" 
            />

            <DashboardCard 
              title="Sala Management" 
              text="Manage physical and virtual classrooms." 
              link="/SalaManagement" 
              icon="🏢" 
              variant="primary" 
            />
            <DashboardCard 
              title="Teacher Schedules" 
              text="Manage and override teacher availability and assignments." 
              link="/AdminTeacherSchedule" 
              icon="📅" 
              variant="primary" 
            />

            <DashboardCard 
              title="Turma Schedules" 
              text="Monitor weekly classroom and teacher distributions." 
              link="/TurmaScheduleAdmin" 
              icon="🗓️" 
              variant="success" 
            />
          </Row>
        </section>
      )}

      {/* --- TEACHER SECTION --- */}
      {isTeacher && (
        <section className="mb-5">
          <h3 className="mb-4 border-bottom pb-2">Teacher Dashboard</h3>
          <Row>
            <DashboardCard title="My Schedule" text="View your upcoming classes." link="/schedule" icon="📅" variant="success" />
            <DashboardCard 
              title="Grade Modules" 
              text="Submit grades for your students." 
              icon="📝" 
              variant="success" 
              onClick={handleOpenGrading} 
            />
            <DashboardCard title="Manage Availability" text="Manage your hours." link="/TeacherAvailability" icon="⏰" variant="success" />
          </Row>
        </section>
      )}

      {/* --- STUDENT SECTION --- */}
      {isStudent && (
        <section className="mb-5">
          <h3 className="mb-4 border-bottom pb-2">Student Hub</h3>
          <Row>
            <DashboardCard title="My Schedule" text="Check your class timings." link="/schedule" icon="📅" variant="info" />
            <DashboardCard 
              title="My Grades" 
              text="View your academic performance." 
              icon="🏆" 
              variant="info" 
              onClick={handleOpenStudentGrades} 
            />
            <DashboardCard title="Course Materials" text="Access files and resources." link="/materials" icon="📁" variant="info" />
          </Row>
        </section>
      )}

      {/* --- MODAL: TEACHER GRADING SELECTION --- */}
      <Modal show={showGradingModal} onHide={() => setShowGradingModal(false)} centered scrollable>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>Select Module to Grade</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {loadingModalData ? (
            <div className="text-center p-5"><Spinner animation="border" variant="success" /></div>
          ) : (
            <ListGroup variant="flush">
              {teacherAssignments.length > 0 ? (
                teacherAssignments.map((item, idx) => (
                  <ListGroup.Item key={idx} action onClick={() => navigate(`/turma/${item.turmaId ?? item.TurmaId}/module/${item.moduleId ?? item.ModuleId}/grades`)} className="d-flex justify-content-between align-items-center py-3 px-4">
                    <div>
                      <div className="fw-bold">{item.turmaName ?? item.TurmaName}</div>
                      <div className="text-muted small">{item.moduleName ?? item.ModuleName}</div>
                    </div>
                    <RBBadge bg="success" pill>Open Grades</RBBadge>
                  </ListGroup.Item>
                ))
              ) : (
                <div className="p-5 text-center text-muted">No active assignments found.</div>
              )}
            </ListGroup>
          )}
        </Modal.Body>
      </Modal>

      {/* --- MODAL: STUDENT TURMA SELECTION --- */}
      <Modal show={showStudentTurmaModal} onHide={() => setShowStudentTurmaModal(false)} centered scrollable>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>Select Your Course</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {loadingModalData ? (
            <div className="text-center p-5"><Spinner animation="border" variant="info" /></div>
          ) : (
            <ListGroup variant="flush">
              {studentTurmas.length > 0 ? (
                studentTurmas.map((t, idx) => (
                  <ListGroup.Item key={idx} action onClick={() => navigate(`/student-report/${t.turmaId ?? t.TurmaId}`)} className="d-flex justify-content-between align-items-center py-3 px-4">
                    <div>
                      <div className="fw-bold">{t.courseName ?? t.CourseName}</div>
                      <div className="text-muted small">Turma: {t.turmaName ?? t.TurmaName}</div>
                    </div>
                    <RBBadge bg="info" pill>View Report</RBBadge>
                  </ListGroup.Item>
                ))
              ) : (
                <div className="p-5 text-center text-muted">You are not enrolled in any active classes.</div>
              )}
            </ListGroup>
          )}
        </Modal.Body>
      </Modal>

    </Container>
  );
};

const Badge = ({ children, bg, text }) => (
  <span className={`badge bg-${bg} text-${text} px-3 py-2 rounded-pill shadow-sm`}>
    {children}
  </span>
);

export default Home;