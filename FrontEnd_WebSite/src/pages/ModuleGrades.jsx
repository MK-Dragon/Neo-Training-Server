// src/pages/ModuleGrades.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, Table, Form, Button, Card, Alert, 
  Spinner, Breadcrumb, Row, Col, Badge 
} from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const ModuleGrades = () => {
  const { turmaId, moduleId } = useParams();
  const navigate = useNavigate();
  
  // Data State
  const [students, setStudents] = useState([]); 
  const [details, setDetails] = useState(null); 
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Role Check: Get role from localStorage
  const userRole = localStorage.getItem('userRole');
  const isAdmin = userRole === 'Admin';

  useEffect(() => {
    loadPageData();
  }, [turmaId, moduleId]);

  const loadPageData = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([
        fetchGrades(),
        fetchModuleMetadata()
      ]);
    } catch (err) {
      setError("Critical error loading page data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    try {
      const res = await fetch(`${ServerIP}/api/StudentGrades/turma-module-grades?turmaId=${turmaId}&moduleId=${moduleId}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      } else {
        setError("Failed to load student grade list.");
      }
    } catch (err) {
      console.error("Grades fetch error:", err);
    }
  };

  const fetchModuleMetadata = async () => {
    try {
      const res = await fetch(`${ServerIP}/api/Teacher/turma-module-details?turmaId=${turmaId}&moduleId=${moduleId}`);
      if (res.ok) {
        const data = await res.json();
        setDetails(data);
      }
    } catch (err) {
      console.error("Metadata fetch error:", err);
    }
  };

  const handleGradeChange = (studentId, value) => {
    const val = value === '' ? '' : parseInt(value);
    setStudents(prev => prev.map(s => 
      (s.studentId ?? s.StudentId) === studentId ? { ...s, grade: val, Grade: val } : s
    ));
  };

  const saveGrade = async (studentId, gradeValue) => {
    if (gradeValue === '' || gradeValue === null) {
        alert("Please enter a grade before saving.");
        return;
    }
    
    const payload = {
      StudentId: studentId,
      TurmaId: parseInt(turmaId),
      ModuleId: parseInt(moduleId),
      Grade: parseInt(gradeValue)
    };

    try {
      const res = await fetch(`${ServerIP}/api/StudentGrades/submit-grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMsg(`Grade saved successfully.`);
        setTimeout(() => setSuccessMsg(''), 2000);
      } else {
        const txt = await res.text();
        alert(txt || "Error saving grade.");
      }
    } catch (err) {
      alert("Network error. Could not connect to server.");
    }
  };

  if (loading) {
    return (
      <Container className="text-center mt-5 pt-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading Evaluation Data...</p>
      </Container>
    );
  }

  return (
    <Container className="mt-5 pt-4">
      <Breadcrumb className="mb-4">
        {/* Only show "Back to Dashboard" for Admin. 
            Teachers will use the browser back button or the Home link in your Navbar */}
        {isAdmin ? (
          <Breadcrumb.Item onClick={() => navigate('/turmadashboard')}>
            Back to Turma Dashboard
          </Breadcrumb.Item>
        ) : (
          <Breadcrumb.Item onClick={() => navigate('/')}>
            Home
          </Breadcrumb.Item>
        )}
        <Breadcrumb.Item active>
            {details?.moduleName || 'Module'} Evaluation
        </Breadcrumb.Item>
      </Breadcrumb>

      <Card className="shadow-sm border-0 mb-4">
        <Card.Header className="bg-dark text-white p-4">
          <Row className="align-items-center">
            <Col md={8}>
              <h3 className="mb-1">{details?.moduleName || "Module Evaluation"}</h3>
              <p className="mb-0 opacity-75">
                <i className="bi bi-people-fill me-2"></i>
                Turma: <strong>{details?.turmaName || turmaId}</strong>
              </p>
            </Col>
            <Col md={4} className="text-md-end mt-3 mt-md-0">
              <Badge bg="primary" className="p-2 px-3 fw-normal">
                Instructor: {details?.teacherName || "Not Assigned"}
              </Badge>
            </Col>
          </Row>
        </Card.Header>

        <Card.Body className="p-4">
          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
          {successMsg && <Alert variant="success">{successMsg}</Alert>}

          <Table hover responsive className="align-middle">
            <thead className="table-light">
              <tr>
                <th className="py-3">Student Name</th>
                <th className="py-3" style={{ width: '180px' }}>Grade (0-20)</th>
                <th className="py-3 text-center">Status</th>
                <th className="py-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const sId = s.studentId ?? s.StudentId;
                const sName = s.studentName ?? s.StudentName;
                const sGrade = s.grade ?? s.Grade ?? '';
                
                return (
                  <tr key={sId}>
                    <td className="fw-bold">{sName}</td>
                    <td>
                      <Form.Control 
                        type="number"
                        min="0"
                        max="20"
                        value={sGrade}
                        onChange={(e) => handleGradeChange(sId, e.target.value)}
                        placeholder="0-20"
                        className="form-control-sm shadow-sm"
                      />
                    </td>
                    <td className="text-center">
                      {sGrade !== '' ? (
                        <Badge pill bg={sGrade >= 10 ? "success" : "danger"}>
                          {sGrade >= 10 ? "Passing" : "Failing"}
                        </Badge>
                      ) : (
                        <Badge pill bg="secondary">Pending</Badge>
                      )}
                    </td>
                    <td className="text-end">
                      <Button 
                        variant="success" 
                        size="sm"
                        onClick={() => saveGrade(sId, sGrade)}
                        className="px-3"
                      >
                        Save
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          
          {students.length === 0 && (
            <div className="text-center py-5">
              <i className="bi bi-person-x display-4 text-muted"></i>
              <p className="mt-3 text-muted">No students are currently enrolled in this turma.</p>
            </div>
          )}
        </Card.Body>
        <Card.Footer className="bg-white text-muted small py-3">
            Reference IDs — Turma: {turmaId} | Module: {moduleId}
        </Card.Footer>
      </Card>
    </Container>
  );
};

export default ModuleGrades;