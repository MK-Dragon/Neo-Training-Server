// /src/pages/UpcomingCourses.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, ListGroup, Modal, Spinner, Alert } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const UpcomingCourses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Module Modal States
    const [showModal, setShowModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [loadingModules, setLoadingModules] = useState(false);

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

    const handleViewModules = async (courseId) => {
        setLoadingModules(true);
        setSelectedCourse(null);
        setShowModal(true);
        
        try {
            // Using your specific endpoint: api/Courses/course-id?course_id=X
            const res = await fetch(`${ServerIP}/api/Courses/course-id?course_id=${courseId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                setSelectedCourse(data); // Expecting course object with Modules array
            } else {
                alert("Could not load course details.");
            }
        } catch (err) {
            console.error("Error fetching modules:", err);
        } finally {
            setLoadingModules(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "TBA";
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <Container className="text-center mt-5 pt-5">
                <Spinner animation="grow" variant="primary" />
                <p className="mt-3">Finding courses starting soon...</p>
            </Container>
        );
    }

    return (
        <Container className="mt-5 pt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold">Upcoming Courses</h2>
                    <p className="text-muted">Programs starting within the next 60 days</p>
                </div>
                <Badge bg="primary" pill className="px-3 py-2">
                    {courses.length} Courses Found
                </Badge>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {!loading && courses.length === 0 && (
                <Card className="text-center p-5 border-dashed">
                    <Card.Body>
                        <h4 className="text-muted">No courses starting in the next 60 days.</h4>
                        <Button variant="link" onClick={fetchUpcoming}>Refresh List</Button>
                    </Card.Body>
                </Card>
            )}

            <Row className="g-4">
                {courses.map((course) => (
                    <Col key={course.id} lg={4} md={6}>
                        <Card className="h-100 shadow-sm border-0 hover-shadow transition-all">
                            <Card.Header className="bg-white border-0 pt-4">
                                <Badge bg={course.level === 'Advanced' ? 'danger' : 'info'} className="mb-2">
                                    {course.level}
                                </Badge>
                                <Card.Title className="fs-4 fw-bold text-dark">{course.name}</Card.Title>
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
                                    variant="outline-dark" 
                                    onClick={() => handleViewModules(course.id)}
                                >
                                    View Syllabus & Modules
                                </Button>
                            </Card.Footer>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Modules Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="md">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {loadingModules ? "Loading Details..." : selectedCourse?.name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {loadingModules ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : selectedCourse ? (
                        <>
                            <h6 className="fw-bold mb-3 text-secondary text-uppercase" style={{ letterSpacing: '1px' }}>
                                Course Modules
                            </h6>
                            <ListGroup variant="flush">
                                {selectedCourse.modules && selectedCourse.modules.length > 0 ? (
                                    selectedCourse.modules.map((mod, idx) => (
                                        <ListGroup.Item key={mod.id} className="d-flex justify-content-between align-items-center px-0">
                                            <div>
                                                <span className="text-muted me-2">{idx + 1}.</span>
                                                {mod.name}
                                            </div>
                                            <Badge bg="light" text="dark" pill>
                                                {mod.durationInHours}h
                                            </Badge>
                                        </ListGroup.Item>
                                    ))
                                ) : (
                                    <p className="text-muted">No modules registered for this course.</p>
                                )}
                            </ListGroup>
                            <div className="mt-4 p-3 bg-light rounded text-center">
                                <small className="text-muted">
                                    Total Course Duration: <strong>{selectedCourse.durationInHours} Hours</strong>
                                </small>
                            </div>
                        </>
                    ) : null}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                    <Button variant="primary">Register Interest</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default UpcomingCourses;