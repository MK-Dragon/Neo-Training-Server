// src/pages/TurmaDashboard.jsx
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Container, Row, Col, Card, Table, Button, Modal, Stack,
  Form, Badge, Alert, Spinner, ListGroup, ProgressBar, ToggleButtonGroup, ToggleButton 
} from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const TurmaDashboard = () => {
  const navigate = useNavigate();

  // Selection State
  const [allTurmas, setAllTurmas] = useState([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  
  // Filtering State (Default: Ongoing and Recent 30 days)
  const [statusFilter, setStatusFilter] = useState(['ongoing', 'recent']); 
  
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
    fetchAllTurmas();
  }, []);

  useEffect(() => {
    if (selectedTurmaId) {
      loadTurmaData(selectedTurmaId);
    }
  }, [selectedTurmaId]);

  const fetchAllTurmas = async () => {
    try {
      const res = await fetch(`${ServerIP}/api/Turma/all-turmas`);
      if (res.ok) {
        const data = await res.json();
        setAllTurmas(data);
      }
    } catch (err) { setError("Failed to load turmas."); }
  };

  // Helper to determine status based on your requirements
  const getTurmaStatus = (start, end) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    if (now < startDate) return 'upcoming';
    if (now >= startDate && now <= endDate) return 'ongoing';
    if (now > endDate && endDate >= thirtyDaysAgo) return 'recent';
    return 'finished';
  };

  // Logic to filter the dropdown list
  const filteredTurmas = useMemo(() => {
    return allTurmas.filter(t => {
      const status = getTurmaStatus(t.dateStart, t.dateEnd);
      return statusFilter.includes(status);
    });
  }, [allTurmas, statusFilter]);

  const loadTurmaData = async (turmaId) => {
    setLoading(true);
    setError('');
    try {
      const studentRes = await fetch(`${ServerIP}/api/Turma/list-students/${turmaId}`);
      const studentData = studentRes.ok ? await studentRes.json() : [];
      setStudents(studentData);

      const planRes = await fetch(`${ServerIP}/api/Teacher/turma/${turmaId}/curriculum-plan`);
      const planData = planRes.ok ? await planRes.json() : [];

      const detailsRes = await fetch(`${ServerIP}/api/Teacher/turma/${turmaId}/modules-details`);
      const detailsData = detailsRes.ok ? await detailsRes.json() : [];

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
    setQualifiedTeachers([]); 
    try {
      const res = await fetch(`${ServerIP}/api/Teacher/module/${mod.moduleId}/teachers`);
      if (res.ok) {
        const data = await res.json();
        setQualifiedTeachers(data);
      }
      setShowAssignModal(true);
    } catch (err) { alert("Error fetching qualified teachers."); }
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
      } else { alert("Assignment failed."); }
    } catch (err) { alert("Server error."); }
  };

  return (
    <Container className="mt-5 pt-4">
      {/* HEADER SECTION WITH DROPDOWN AND FILTERS */}
      <Card className="mb-4 shadow-sm border-0 bg-dark text-white">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6}>
              <h3 className="mb-1">Turma Management Dashboard</h3>
              <p className="opacity-75 mb-0 small">Manage curriculum, teachers, and enrollments.</p>
            </Col>
            <Col md={6}>
              <div className="d-flex flex-column align-items-md-end gap-2">
                <ToggleButtonGroup type="checkbox" value={statusFilter} onChange={setStatusFilter} size="sm">
                  <ToggleButton id="tgl-on" variant="outline-success" value="ongoing">Ongoing</ToggleButton>
                  <ToggleButton id="tgl-up" variant="outline-primary" value="upcoming">Upcoming</ToggleButton>
                  <ToggleButton id="tgl-rec" variant="outline-info" value="recent">Recent (30d)</ToggleButton>
                  <ToggleButton id="tgl-fin" variant="outline-secondary" value="finished">Old</ToggleButton>
                </ToggleButtonGroup>

                <Form.Select 
                  value={selectedTurmaId} 
                  onChange={(e) => setSelectedTurmaId(e.target.value)}
                  className="form-select-lg"
                >
                  <option value="">Select Turma ({filteredTurmas.length} available)...</option>
                  {filteredTurmas.map(t => (
                    <option key={t.turmaId} value={t.turmaId}>
                      {t.turmaName}
                    </option>
                  ))}
                </Form.Select>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {!selectedTurmaId ? (
        <Alert variant="secondary" className="text-center py-5 dashed-border shadow-sm">
          <h5>No Turma Selected</h5>
          <p className="text-muted mb-0 small">Please choose a Turma from the dropdown to initialize management.</p>
        </Alert>
      ) : (
        <>
          {/* NEW SECTION: SELECTED TURMA PROFILE DETAILS */}
          <Card className="mb-4 shadow-sm border-0 border-start border-4 border-primary bg-light">
            <Card.Body className="py-3">
              {allTurmas.filter(t => t.turmaId.toString() === selectedTurmaId).map(t => {
                const status = getTurmaStatus(t.dateStart, t.dateEnd);
                return (
                  <Row key={t.turmaId} className="align-items-center">
                    <Col md={4} className="border-end">
                      <div className="text-muted small text-uppercase fw-bold mb-1">Course & Class</div>
                      <h4 className="mb-0 text-primary">{t.turmaName}</h4>
                      <div className="text-secondary fw-semibold small">{t.courseName}</div>
                    </Col>
                    <Col md={5} className="px-md-4">
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <div className="text-muted small fw-bold text-uppercase">Start Date</div>
                          <div className="fw-bold"><i className="bi bi-calendar-event me-2"></i>{t.dateStart ? new Date(t.dateStart).toLocaleDateString() : '—'}</div>
                        </div>
                        <div className="text-muted fs-4 px-2">→</div>
                        <div>
                          <div className="text-muted small fw-bold text-uppercase">End Date</div>
                          <div className="fw-bold"><i className="bi bi-calendar-check me-2"></i>{t.dateEnd ? new Date(t.dateEnd).toLocaleDateString() : '—'}</div>
                        </div>
                      </div>
                    </Col>
                    <Col md={3} className="text-md-end">
                      <div className="text-muted small fw-bold text-uppercase mb-1">Life-Cycle Status</div>
                      <Badge 
                        bg={status === 'ongoing' ? 'success' : status === 'upcoming' ? 'primary' : status === 'recent' ? 'info' : 'secondary'} 
                        className="px-3 py-2"
                      >
                        {status === 'recent' ? 'FINISHED (RECENT)' : status.toUpperCase()}
                      </Badge>
                    </Col>
                  </Row>
                );
              })}
            </Card.Body>
          </Card>

          {loading ? (
            <div className="text-center py-5"><Spinner animation="grow" variant="primary" /></div>
          ) : (
            <Row className="g-4">
              {/* CURRICULUM TABLE */}
              <Col lg={8}>
                <Card className="shadow-sm border-0">
                  <Card.Header className="bg-white py-3">
                    <h5 className="mb-0 fw-bold">Curriculum & Teaching Staff</h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <Table hover responsive className="mb-0 align-middle">
                      <thead className="table-light text-uppercase small">
                        <tr>
                          <th className="text-center">#</th>
                          <th>Module</th>
                          <th>Instructor</th>
                          <th>Hours Progress</th>
                          <th className="text-end px-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {moduleDetails.map((mod) => (
                          <tr key={mod.moduleId}>
                            <td className="text-center text-muted fw-bold">{mod.orderIndex}</td>
                            <td>
                              <div className="fw-bold">{mod.moduleName}</div>
                              <small className="text-muted">{mod.totalDuration}h Total</small>
                            </td>
                            <td>
                              {mod.teacherName ? (
                                <Badge bg="primary" className="fw-normal">{mod.teacherName}</Badge>
                              ) : (
                                <Badge bg="light" text="dark" className="border fw-normal text-uppercase small">Vacant</Badge>
                              )}
                            </td>
                            <td style={{ minWidth: '160px' }}>
                              <div className="d-flex justify-content-between small mb-1">
                                <span className="fw-bold">{mod.hoursCompleted}h</span>
                                <span>{Math.round((mod.hoursCompleted / mod.totalDuration) * 100)}%</span>
                              </div>
                              <ProgressBar 
                                variant={mod.isCompleted ? "success" : "primary"} 
                                now={(mod.hoursCompleted / mod.totalDuration) * 100} 
                                style={{ height: '6px' }}
                              />
                            </td>
                            <td className="text-end px-3">
                              <Stack direction="horizontal" gap={2} className="justify-content-end">
                                <Button 
                                  variant="outline-dark" 
                                  size="sm" 
                                  onClick={() => handleOpenAssignModal(mod)}
                                >
                                  {mod.teacherId ? "Reassign" : "Assign"}
                                </Button>
                                <Button 
                                  variant="outline-success" 
                                  size="sm" 
                                  onClick={() => navigate(`/turma/${selectedTurmaId}/module/${mod.moduleId}/grades`)}
                                >
                                  Grades
                                </Button>
                              </Stack>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>

              {/* STUDENT SIDEBAR */}
              <Col lg={4}>
                <Card className="shadow-sm border-0">
                  <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold">Enrollments</h5>
                    <Badge pill bg="dark">{students.length}</Badge>
                  </Card.Header>
                  <ListGroup variant="flush">
                    {students.map(s => (
                      <ListGroup.Item key={s.userId} className="py-3 border-bottom">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="fw-bold">{s.username}</div>
                            <div className="text-muted small">{s.email}</div>
                          </div>
                          {s.enrollmentIsDeleted === 1 && <Badge bg="danger">Inactive</Badge>}
                        </div>
                      </ListGroup.Item>
                    ))}
                    {students.length === 0 && (
                      <div className="p-5 text-center text-muted italic small">No students enrolled yet.</div>
                    )}
                  </ListGroup>
                </Card>
              </Col>
            </Row>
          )}
        </>
      )}

      {/* ASSIGNMENT MODAL */}
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>Instructor Assignment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="text-muted small text-uppercase fw-bold">Target Module</label>
            <h5 className="text-primary">{selectedModule?.moduleName}</h5>
          </div>
          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">Select Qualified Teacher</Form.Label>
            <Form.Select 
              value={teacherToAssign} 
              onChange={(e) => setTeacherToAssign(e.target.value)}
              className="form-select-lg"
            >
              <option value="">-- Choose Instructor --</option>
              {qualifiedTeachers.map(t => (
                <option key={t.userId} value={t.userId}>
                  {t.username}
                </option>
              ))}
            </Form.Select>
            {qualifiedTeachers.length === 0 && (
               <Form.Text className="text-danger">No teachers are qualified for this module in the database.</Form.Text>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="bg-light border-0">
          <Button variant="link" className="text-muted" onClick={() => setShowAssignModal(false)}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={handleAssignTeacher} 
            disabled={!teacherToAssign}
            className="px-4 shadow-sm"
          >
            Confirm Assignment
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TurmaDashboard;