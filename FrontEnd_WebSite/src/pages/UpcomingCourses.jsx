// /src/pages/UpcomingCourses.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, ListGroup, Modal, Spinner, Alert } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const UpcomingCourses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const userRole = localStorage.getItem('userRole'); 
    const userId = localStorage.getItem('userId'); 

    const [showModal, setShowModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [loadingModules, setLoadingModules] = useState(false);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [enrolling, setEnrolling] = useState(false);
    const [enrollMsg, setEnrollMsg] = useState({ text: '', isError: false });

    useEffect(() => {
        fetchUpcoming();
    }, []);

    const fetchUpcoming = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${ServerIP}/api/Courses/upcoming`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCourses(data);
            } else {
                setError("Failed to load upcoming courses.");
            }
        } catch (err) {
            setError("Network error. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const handleViewModules = async (course) => {
        setLoadingModules(true);
        setSelectedCourse(course); // Immediately set initial data (TurmaId, CourseName, etc)
        setShowModal(true);
        setEnrollMsg({ text: '', isError: false }); 
        
        try {
            // Updated to use course.courseId from your new C# class
            const res = await fetch(`${ServerIP}/api/Courses/course-id?course_id=${course.courseId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                // Merge existing course/turma data with fetched modules
                setSelectedCourse(prev => ({ ...prev, modules: data.modules }));
            }
        } catch (err) {
            console.error("Error fetching modules:", err);
        } finally {
            setLoadingModules(false);
        }
    };

    const handlePreEnroll = async () => {
        console.log(`User: ${userId} / Turma: ${selectedCourse?.turmaId}`);

        if (!userId || !selectedCourse?.turmaId) {
            setEnrollMsg({ text: "Information missing (User or Turma ID).", isError: true });
            return;
        }

        setEnrolling(true);
        try {
            const res = await fetch(`${ServerIP}/api/PreEnrollment/pre-enroll`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    UserId: parseInt(userId),
                    TurmaId: selectedCourse.turmaId 
                })
            });

            const data = await res.json();

            if (res.ok) {
                setEnrollMsg({ text: data.message, isError: false });
                setTimeout(() => {
                    setShowConfirmModal(false);
                    setShowModal(false);
                }, 2500);
            } else {
                setEnrollMsg({ text: data || "Enrollment failed.", isError: true });
            }
        } catch (err) {
            setEnrollMsg({ text: "Server error.", isError: true });
        } finally {
            setEnrolling(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "TBA";
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    };

    if (loading) {
        return (
            <Container className="text-center mt-5 pt-5">
                <Spinner animation="grow" variant="primary" />
                <p className="mt-3">Fetching upcoming classes...</p>
            </Container>
        );
    }

    return (
        <Container className="mt-5 pt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold">Upcoming Courses</h2>
                    <p className="text-muted">Register for the next sessions</p>
                </div>
                <Badge bg="primary" pill className="px-3 py-2">
                    {courses.length} Available
                </Badge>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Row className="g-4">
                {courses.map((course, index) => (
                    // Unique key using TurmaId
                    <Col key={`turma-${course.turmaId}-${index}`} lg={4} md={6}>
                        <Card className="h-100 shadow-sm border-0 transition-all border-top border-primary border-4">
                            <Card.Header className="bg-white border-0 pt-4">
                                <Badge bg={course.level === 'Advanced' ? 'danger' : 'info'} className="mb-2">
                                    {course.level}
                                </Badge>
                                <Card.Title className="fs-4 fw-bold text-dark">{course.courseName}</Card.Title>
                            </Card.Header>
                            <Card.Body>
                                <div className="d-flex align-items-center mb-2">
                                    <span className="me-2">📅</span>
                                    <span className="fw-bold text-primary">{formatDate(course.dateStart)}</span>
                                </div>
                                <div className="d-flex align-items-center mb-3 text-muted">
                                    <span className="me-2">⏱️</span>
                                    <span>{course.durationInHours} Total Hours</span>
                                </div>
                            </Card.Body>
                            <Card.Footer className="bg-light border-0 pb-4 d-grid">
                                <Button 
                                    variant="outline-primary" 
                                    onClick={() => handleViewModules(course)}
                                >
                                    View Details
                                </Button>
                            </Card.Footer>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Details Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{selectedCourse?.courseName}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-4 text-center p-3 bg-light rounded">
                        <p className="mb-1 text-muted small text-uppercase fw-bold">Starting Date</p>
                        <h5 className="text-primary mb-0">{formatDate(selectedCourse?.dateStart)}</h5>
                    </div>

                    <h6 className="fw-bold mb-3 text-secondary text-uppercase" style={{fontSize: '0.8rem'}}>Curriculum</h6>
                    {loadingModules ? (
                        <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
                    ) : (
                        <ListGroup variant="flush">
                            {selectedCourse?.modules?.map((mod, idx) => (
                                <ListGroup.Item key={`mod-${mod.id}-${idx}`} className="d-flex justify-content-between align-items-center px-0">
                                    <div><span className="text-muted me-2">{idx + 1}.</span>{mod.name}</div>
                                    <Badge bg="light" text="dark" pill>{mod.durationInHours}h</Badge>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                    {userRole === 'Student' && (
                        <Button variant="primary" onClick={() => setShowConfirmModal(true)}>
                            Register Interest
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>

            {/* Confirm Modal */}
            <Modal show={showConfirmModal} onHide={() => !enrolling && setShowConfirmModal(false)} centered size="sm">
                <Modal.Header className="bg-primary text-white border-0">
                    <Modal.Title className="fs-5">Final Step</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center py-4">
                    {enrollMsg.text ? (
                        <Alert variant={enrollMsg.isError ? 'danger' : 'success'}>
                            {enrollMsg.text}
                        </Alert>
                    ) : (
                        <>
                            <p className="mb-1">Enroll in <strong>{selectedCourse?.courseName}</strong>?</p>
                            <p className="text-primary small fw-bold">Starts: {formatDate(selectedCourse?.dateStart)}</p>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer className="justify-content-center border-0">
                    {!enrollMsg.text && (
                        <>
                            <Button variant="light" onClick={() => setShowConfirmModal(false)} disabled={enrolling}>Cancel</Button>
                            <Button variant="primary" onClick={handlePreEnroll} disabled={enrolling}>
                                {enrolling ? <Spinner size="sm" className="me-2"/> : "Confirm"}
                            </Button>
                        </>
                    )}
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default UpcomingCourses;