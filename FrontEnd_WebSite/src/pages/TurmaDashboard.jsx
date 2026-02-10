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

  // Selection & Filtering State
  const [allTurmas, setAllTurmas] = useState([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
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
      // 1. Fetch Students
      const studentRes = await fetch(`${ServerIP}/api/Turma/list-students/${turmaId}`);
      const studentData = studentRes.ok ? await studentRes.json() : [];
      setStudents(studentData);

      // 2. Fetch Curriculum Plan
      const planRes = await fetch(`${ServerIP}/api/Teacher/turma/${turmaId}/curriculum-plan`);
      const planData = planRes.ok ? await planRes.json() : [];

      // 3. Fetch Teacher/Module Details
      const detailsRes = await fetch(`${ServerIP}/api/Teacher/turma/${turmaId}/modules-details`);
      const detailsData = detailsRes.ok ? await detailsRes.json() : [];

      // 4. Fetch Progress from Schedule Controller for each module
      const merged = await Promise.all(planData.map(async (planItem) => {
        const mId = planItem.moduleId ?? planItem.ModuleId;
        
        // Calling your new endpoint: api/Shcedule/module-progress/{turmaId}/{moduleId}
        const progressRes = await fetch(`${ServerIP}/api/Shcedule/module-progress/${turmaId}/${mId}`);
        const prog = progressRes.ok ? await progressRes.json() : null;

        const teacherDetail = detailsData.find(d => (d.moduleId ?? d.ModuleId) === mId);

        return {
          moduleId: mId,
          moduleName: planItem.moduleName ?? planItem.ModuleName,
          // Using targetDuration from DTO or falling back to plan duration
          totalDuration: prog?.targetDuration ?? planItem.durationH ?? 0,
          orderIndex: planItem.orderIndex ?? planItem.OrderIndex ?? 0,
          teacherId: teacherDetail?.teacherId ?? null,
          teacherName: teacherDetail?.teacherName ?? null,
          // New Schedule Progress Fields
          hoursTaught: prog?.hoursTaught ?? 0,
          totalScheduled: prog?.totalScheduled ?? 0,
          remainingToSchedule: prog?.remainingToSchedule ?? 0
        };
      }));

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
      {/* HEADER & FILTERS */}
      <Card className="mb-4 shadow-sm border-0 bg-dark text-white">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6}>
              <h3 className="mb-1">Turma Management Dashboard</h3>
              <p className="opacity-75 mb-0 small">Curriculum, Schedules, and Progress Tracking.</p>
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
                    <option key={t.turmaId} value={t.turmaId}>{t.turmaName}</option>
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
          {/* TURMA PROFILE DETAILS */}
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
                          <div className="text-muted small fw-bold text-uppercase">Start</div>
                          <div className="fw-bold">{t.dateStart ? new Date(t.dateStart).toLocaleDateString() : '—'}</div>
                        </div>
                        <div className="text-muted fs-4">→</div>
                        <div>
                          <div className="text-muted small fw-bold text-uppercase">End</div>
                          <div className="fw-bold">{t.dateEnd ? new Date(t.dateEnd).toLocaleDateString() : '—'}</div>
                        </div>
                      </div>
                    </Col>
                    <Col md={3} className="text-md-end">
                      <Badge 
                        bg={status === 'ongoing' ? 'success' : status === 'upcoming' ? 'primary' : 'secondary'} 
                        className="px-3 py-2 mb-2"
                      >
                        {status.toUpperCase()}
                      </Badge>
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="w-100 fw-bold shadow-sm"
                        onClick={() => navigate(`/turma-report/${selectedTurmaId}`)}
                      >
                        <i className="bi bi-file-earmark-bar-graph me-2"></i>Export Class Report
                      </Button>
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
              <Col lg={9}>
                <Card className="shadow-sm border-0">
                  <Card.Header className="bg-white py-3">
                    <h5 className="mb-0 fw-bold">Curriculum & Scheduling Progress</h5>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <Table hover responsive className="mb-0 align-middle">
                      <thead className="table-light text-uppercase small">
                        <tr>
                          <th className="text-center">#</th>
                          <th>Module</th>
                          <th>Instructor</th>
                          <th>Schedule coverage</th>
                          <th>Taught Progress</th>
                          <th className="text-end px-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {moduleDetails.map((mod) => {
                          const schedPct = Math.min(100, Math.round((mod.totalScheduled / mod.totalDuration) * 100));
                          const taughtPct = Math.min(100, Math.round((mod.hoursTaught / mod.totalDuration) * 100));

                          return (
                            <tr key={mod.moduleId}>
                              <td className="text-center text-muted fw-bold">{mod.orderIndex}</td>
                              <td>
                                <div className="fw-bold">{mod.moduleName}</div>
                                <small className="text-muted">{mod.totalDuration}h Total</small>
                              </td>
                              <td>
                                {mod.teacherName ? (
                                  <Badge bg="info" className="fw-normal text-dark">{mod.teacherName}</Badge>
                                ) : (
                                  <Badge bg="light" text="dark" className="border fw-normal">Vacant</Badge>
                                )}
                              </td>
                              {/* New Column: Schedule Coverage */}
                              <td>
                                <div className="d-flex justify-content-between small mb-1">
                                  <span>{mod.totalScheduled} / {mod.totalDuration}h</span>
                                  <span className="text-muted">{schedPct}%</span>
                                </div>
                                <ProgressBar now={schedPct} variant="warning" style={{ height: '4px' }} />
                              </td>
                              {/* New Column: Taught Progress */}
                              <td style={{ minWidth: '150px' }}>
                                <div className="d-flex justify-content-between small mb-1">
                                  <span className="fw-bold">{mod.hoursTaught}h Taught</span>
                                  <span>{taughtPct}%</span>
                                </div>
                                <ProgressBar 
                                  variant={taughtPct >= 100 ? "success" : "primary"} 
                                  now={taughtPct} 
                                  style={{ height: '8px' }}
                                />
                              </td>
                              <td className="text-end px-3">
                                <Stack direction="horizontal" gap={2} className="justify-content-end">
                                  <Button variant="outline-dark" size="sm" onClick={() => handleOpenAssignModal(mod)}>
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
                          );
                        })}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={3}>
                <Card className="shadow-sm border-0">
                  <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold">Students</h5>
                    <Badge pill bg="dark">{students.length}</Badge>
                  </Card.Header>
                  <ListGroup variant="flush">
                    {students.map(s => (
                      <ListGroup.Item key={s.userId} className="py-2 border-bottom">
                        <div className="fw-bold small">{s.username}</div>
                        <div className="text-muted" style={{fontSize: '0.75rem'}}>{s.email}</div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Card>
              </Col>
            </Row>
          )}
        </>
      )}

      {/* ASSIGNMENT MODAL */}
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Assign Instructor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="text-muted small text-uppercase fw-bold">Module</label>
            <h5 className="text-primary">{selectedModule?.moduleName}</h5>
          </div>
          <Form.Group>
            <Form.Label className="fw-bold">Instructor</Form.Label>
            <Form.Select 
              value={teacherToAssign} 
              onChange={(e) => setTeacherToAssign(e.target.value)}
            >
              <option value="">-- Select --</option>
              {qualifiedTeachers.map(t => (
                <option key={t.userId} value={t.userId}>{t.username}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleAssignTeacher} disabled={!teacherToAssign}>
            Confirm Assignment
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TurmaDashboard;