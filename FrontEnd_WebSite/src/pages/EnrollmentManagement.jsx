// /src/pages/EnrollmentManagement.jsx

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ListGroup, Button, Badge, InputGroup, Form, Alert, Spinner } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const EnrollmentManagement = () => {
  const [students, setStudents] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // NOTE: Using the Enrollment and Turma controllers respectively
      const [studRes, turmaRes] = await Promise.all([
        fetch(`${ServerIP}/api/Enrollment/unenrolled-students`),
        fetch(`${ServerIP}/api/Turma/all-turmas`)
      ]);

      if (!studRes.ok || !turmaRes.ok) throw new Error("Failed to load lists.");

      const studData = await studRes.json();
      const turmaData = await turmaRes.json();
      
      setStudents(Array.isArray(studData) ? studData : []);
      // Filter active classes
      setTurmas(Array.isArray(turmaData) ? turmaData.filter(t => (t.isDeleted ?? t.IsDeleted ?? 0) === 0) : []);
    } catch (err) {
      setError("Error connecting to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedStudent || !selectedTurma) return;

    setError('');
    setSuccess('');

    // Normalize IDs from whichever casing the API returned
    const sId = selectedStudent.UserId ?? selectedStudent.userId ?? selectedStudent.id;
    const tId = selectedTurma.TurmaId ?? selectedTurma.turmaId ?? selectedTurma.id;

    // This must match your C# 'NewEnrollment' class properties exactly
    const enrollmentBody = {
      StudentId: sId,
      TurmaId: tId
    };

    try {
      const response = await fetch(`${ServerIP}/api/Enrollment/enroll-student`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(enrollmentBody)
      });

      if (response.ok) {
        setSuccess(`Enrolled successfully!`);
        setSelectedStudent(null);
        setSelectedTurma(null);
        fetchData(); // Refresh lists
      } else {
        const msg = await response.text();
        setError(msg || "Enrollment failed.");
      }
    } catch (err) {
      setError("Network error occurred.");
    }
  };

  const filteredStudents = students.filter(s => 
    (s.Username ?? s.username ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <Container className="mt-5 pt-5 text-center">
      <Spinner animation="border" variant="primary" />
      <p>Loading lists...</p>
    </Container>
  );

  return (
    <Container className="mt-5 pt-4">
      <h2>Student Enrollment</h2>
      <p className="text-muted">Select an available student and an active Turma.</p>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Row>
        <Col md={5}>
          <Card className="shadow-sm">
            <Card.Header className="bg-primary text-white">Unenrolled Students</Card.Header>
            <Card.Body>
              <Form.Control 
                className="mb-3"
                placeholder="Search name..." 
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <ListGroup variant="flush" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredStudents.map(s => {
                  const id = s.UserId ?? s.userId;
                  return (
                    <ListGroup.Item 
                      key={id} 
                      action 
                      active={(selectedStudent?.UserId ?? selectedStudent?.userId) === id}
                      onClick={() => setSelectedStudent(s)}
                    >
                      {s.Username ?? s.username}
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        <Col md={2} className="d-flex align-items-center justify-content-center py-3">
          <Button 
            variant="success" 
            size="lg" 
            disabled={!selectedStudent || !selectedTurma}
            onClick={handleEnroll}
          >
            Enroll ➔
          </Button>
        </Col>

        <Col md={5}>
          <Card className="shadow-sm">
            <Card.Header className="bg-success text-white">Active Turmas</Card.Header>
            <Card.Body>
              <ListGroup variant="flush" style={{ maxHeight: '445px', overflowY: 'auto' }}>
                {turmas.map(t => {
                  const id = t.TurmaId ?? t.turmaId;
                  return (
                    <ListGroup.Item 
                      key={id} 
                      action 
                      active={(selectedTurma?.TurmaId ?? selectedTurma?.turmaId) === id}
                      onClick={() => setSelectedTurma(t)}
                    >
                      {t.TurmaName ?? t.turmaName}
                      <div className="small text-muted">{t.CourseName ?? t.courseName}</div>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EnrollmentManagement;