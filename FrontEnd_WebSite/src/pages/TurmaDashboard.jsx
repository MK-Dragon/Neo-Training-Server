// \src\pages\TurmaDashboard.jsx

import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Container, Row, Col, Card, Table, Button, Modal, 
  Form, Badge, Alert, Spinner, ListGroup, ProgressBar 
} from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const TurmaDashboard = () => {
  const navigate = useNavigate();

  // Selection State
  const [activeTurmas, setActiveTurmas] = useState([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  
  // Data State
  const [students, setStudents] = useState([]);
  const [moduleDetails, setModuleDetails] = useState([]);
  const [qualifiedTeachers, setQualifiedTeachers] = useState([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [teacherToAssign, setTeacherToAssign] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchActiveTurmas();
  }, []);

  useEffect(() => {
    if (selectedTurmaId) {
      loadTurmaData(selectedTurmaId);
    }
  }, [selectedTurmaId]);

  const fetchActiveTurmas = async () => {
    try {
      const res = await fetch(`${ServerIP}/api/Turma/all-active-turmas`);
      if (res.ok) {
        const data = await res.json();
        setActiveTurmas(data);
      }
    } catch (err) { setError("Failed to load active turmas."); }
  };

  const loadTurmaData = async (turmaId) => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Students
      const studentRes = await fetch(`${ServerIP}/api/Turma/list-students/${turmaId}`);
      const studentData = studentRes.ok ? await studentRes.json() : [];
      setStudents(studentData);

      // 2. Fetch the "Skeleton" (Curriculum Plan)
      const planRes = await fetch(`${ServerIP}/api/Teacher/turma/${turmaId}/curriculum-plan`);
      const planData = planRes.ok ? await planRes.json() : [];

      // 3. Fetch the "Details" (Current Teacher assignments)
      const detailsRes = await fetch(`${ServerIP}/api/Teacher/turma/${turmaId}/modules-details`);
      const detailsData = detailsRes.ok ? await detailsRes.json() : [];

      // 4. Merge: Always show curriculum modules, overlay teacher details if they exist
      const merged = planData.map(planItem => {
        const detail = detailsData.find(d => (d.moduleId ?? d.ModuleId) === (planItem.moduleId ?? planItem.ModuleId));
        return {
          moduleId: planItem.moduleId ?? planItem.ModuleId,
          moduleName: planItem.moduleName ?? planItem.ModuleName,
          totalDuration: planItem.durationH ?? planItem.DurationH ?? 0,
          orderIndex: planItem.orderIndex ?? planItem.OrderIndex ?? 0,
          teacherId: detail?.teacherId ?? detail?.TeacherId ?? null,
          teacherName: detail?.teacherName ?? detail?.TeacherName ?? null,
          hoursCompleted: detail?.hoursCompleted ?? detail?.HoursCompleted ?? 0,
          isCompleted: detail?.isCompleted ?? detail?.IsCompleted ?? 0
        };
      });

      setModuleDetails(merged.sort((a, b) => a.orderIndex - b.orderIndex));

    } catch (err) {
      setError("Error loading dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignModal = async (mod) => {
    setSelectedModule(mod);
    setTeacherToAssign(mod.teacherId || '');
    setQualifiedTeachers([]); // Clear previous list
    
    try {
      // Fetch only teachers qualified to teach THIS module
      const res = await fetch(`${ServerIP}/api/Teacher/module/${mod.moduleId}/teachers`);
      if (res.ok) {
        const data = await res.json();
        setQualifiedTeachers(data);
      }
      setShowAssignModal(true);
    } catch (err) {
      alert("Error fetching qualified teachers.");
    }
  };

  const handleAssignTeacher = async () => {
    if (!teacherToAssign || !selectedModule) return;

    const payload = {
      TurmaId: parseInt(selectedTurmaId),
      ModuleId: selectedModule.moduleId,
      TeacherId: parseInt(teacherToAssign)
    };

    try {
      const res = await fetch(`${ServerIP}/api/Teacher/assign-teacher-to-module`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAssignModal(false);
        loadTurmaData(selectedTurmaId);
      } else {
        alert("Assignment failed.");
      }
    } catch (err) { alert("Server error."); }
  };


  return (
    <Container className="mt-5 pt-4">
      <Card className="mb-4 shadow-sm border-0 bg-dark text-white">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={8}>
              <h3 className="mb-1">Turma Management Dashboard</h3>
              <p className="opacity-75 mb-0">Control student enrollment and teacher curriculum assignments.</p>
            </Col>
            <Col md={4}>
              <Form.Select 
                value={selectedTurmaId} 
                onChange={(e) => setSelectedTurmaId(e.target.value)}
                className="form-select-lg"
              >
                <option value="">Select Turma to Manage...</option>
                {activeTurmas.map(t => (
                  <option key={t.turmaId ?? t.TurmaId} value={t.turmaId ?? t.TurmaId}>
                    {t.turmaName ?? t.TurmaName}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {!selectedTurmaId ? (
        <Alert variant="secondary" className="text-center py-5 dashed-border">
          <h5>Please select a Turma from the dropdown to initialize the dashboard.</h5>
        </Alert>
      ) : (
        <>
          {loading ? (
            <div className="text-center py-5"><Spinner animation="grow" variant="primary" /></div>
          ) : (
            <Row>
              <Col lg={8}>
                <Card className="shadow-sm">
                  <Card.Header className="bg-white py-3">
                    <h5 className="mb-0">Curriculum & Teaching Staff</h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <Table hover responsive className="mb-0 align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Order</th>
                          <th>Module Name</th>
                          <th>Instructor</th>
                          <th>Progress</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {moduleDetails.map((mod) => (
                          <tr key={mod.moduleId}>
                            <td className="text-center text-muted">#{mod.orderIndex}</td>
                            <td>
                              <div className="fw-bold">{mod.moduleName}</div>
                              <small className="text-muted">{mod.totalDuration} Hours Total</small>
                            </td>
                            <td>
                              {mod.teacherName ? (
                                <Badge bg="primary" className="fw-normal">{mod.teacherName}</Badge>
                              ) : (
                                <Badge bg="light" text="dark" className="border fw-normal text-uppercase">Vacant</Badge>
                              )}
                            </td>
                            <td style={{ minWidth: '150px' }}>
                              <div className="d-flex justify-content-between small mb-1">
                                <span>{mod.hoursCompleted}h done</span>
                                <span>{Math.round((mod.hoursCompleted / mod.totalDuration) * 100)}%</span>
                              </div>
                              <ProgressBar 
                                variant={mod.isCompleted ? "success" : "primary"} 
                                now={(mod.hoursCompleted / mod.totalDuration) * 100} 
                                style={{ height: '6px' }}
                              />
                            </td>
                            <td className="text-end">
                              <Button 
                                variant="outline-dark" 
                                size="sm" 
                                onClick={() => handleOpenAssignModal(mod)}
                              >
                                {mod.teacherId ? "Reassign" : "Assign Teacher"}
                              </Button>
                              <Button 
                                variant="outline-success" 
                                size="sm" 
                                className="ms-2"
                                onClick={() => navigate(`/turma/${selectedTurmaId}/module/${mod.moduleId}/grades`)}
                              >
                                Grades
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={4}>
                <Card className="shadow-sm">
                  <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Student List</h5>
                    <Badge pill bg="secondary">{students.length}</Badge>
                  </Card.Header>
                  <ListGroup variant="flush">
                    {students.map(s => (
                      <ListGroup.Item key={s.userId ?? s.UserId} className="py-3">
                        <div className="fw-bold">{s.username ?? s.Username}</div>
                        <div className="text-muted small">{s.email ?? s.Email}</div>
                        {s.enrollmentIsDeleted === 1 && <Badge bg="danger">Inactive</Badge>}
                      </ListGroup.Item>
                    ))}
                    {students.length === 0 && (
                      <div className="p-4 text-center text-muted italic">No students enrolled.</div>
                    )}
                  </ListGroup>
                </Card>
              </Col>
            </Row>
          )}
        </>
      )}

      {/* Teacher Assignment Modal */}
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>Assign Instructor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h6>Module: <span className="text-primary">{selectedModule?.moduleName}</span></h6>
          <p className="text-muted small mb-4">Choose from teachers qualified to teach this specific module.</p>
          
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Qualified Teachers</Form.Label>
            <Form.Select 
              value={teacherToAssign} 
              onChange={(e) => setTeacherToAssign(e.target.value)}
              className="form-select-lg"
            >
              <option value="">-- Select Instructor --</option>
              {qualifiedTeachers.map(t => (
                <option key={t.userId ?? t.UserId} value={t.userId ?? t.UserId}>
                  {t.username ?? t.Username}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          
          {qualifiedTeachers.length === 0 && (
            <Alert variant="danger" className="py-2 small">
              No teachers are currently associated with this module in the system.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="link" className="text-muted" onClick={() => setShowAssignModal(false)}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={handleAssignTeacher} 
            disabled={!teacherToAssign}
            className="px-4"
          >
            Confirm Assignment
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TurmaDashboard;