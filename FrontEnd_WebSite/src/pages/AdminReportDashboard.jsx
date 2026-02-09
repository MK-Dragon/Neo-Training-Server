// src/pages/AdminReportDashboard.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Container, Table, Card, Badge, Spinner, 
  Row, Col, Button, Form, Accordion, Stack, ToggleButton, ToggleButtonGroup 
} from 'react-bootstrap';
import html2pdf from 'html2pdf.js';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const AdminReportDashboard = () => {
  const [turmas, setTurmas] = useState([]);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(['ongoing']); // Default
  const [sortConfig, setSortConfig] = useState({ key: 'startDate', direction: 'asc' });
  
  const reportRef = useRef();
  const token = localStorage.getItem('token');

  useEffect(() => { fetchTurmas(); }, []);

  // --- Data Fetching ---
  const fetchTurmas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ServerIP}/api/Enrollment/GetTurmaToEnrollStudents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setTurmas(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchStudents = async (turmaId) => {
    try {
      const res = await fetch(`${ServerIP}/api/Enrollment/students-by-turma/${turmaId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setStudents(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchGrades = async (studentId, turmaId) => {
    try {
      const res = await fetch(`${ServerIP}/api/StudentGrades/student-report?studentId=${studentId}&turmaId=${turmaId}`);
      if (res.ok) setGrades(await res.json());
    } catch (err) { console.error(err); }
  };

  // --- Helpers ---
  const getTurmaStatus = (start, end) => {
    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (now < startDate) return 'upcoming';
    if (now > endDate) return 'finished';
    return 'ongoing';
  };

  const handleTurmaSelect = (turma) => {
    setSelectedTurma(turma);
    setSelectedStudent(null);
    setGrades([]);
    fetchStudents(turma.turmaId || turma.TurmaId);
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    fetchGrades(student.studentId || student.StudentId, selectedTurma.turmaId || selectedTurma.TurmaId);
  };

  // --- Table Logic ---
  const sortedAndFilteredTurmas = useMemo(() => {
    return turmas
      .filter(t => statusFilter.includes(getTurmaStatus(t.startDate, t.endDate)))
      .sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [turmas, statusFilter, sortConfig]);

  const downloadPDF = () => {
    const element = reportRef.current;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Report_${selectedStudent?.name}_${selectedTurma?.turmaName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" variant="primary" /></Container>;

  return (
    <Container className="mt-5 pt-4 pb-5">
      <h2 className="fw-bold mb-4">Academic Records Management</h2>

      <Accordion defaultActiveKey="0">
        {/* STEP 1: TURMA SELECTION */}
        <Accordion.Item eventKey="0">
          <Accordion.Header>
            <Stack direction="horizontal" gap={3}>
              <i className="bi bi-collection-play text-primary"></i>
              <span>1. Select Turma {selectedTurma && <Badge bg="primary" className="ms-2">{selectedTurma.turmaName}</Badge>}</span>
            </Stack>
          </Accordion.Header>
          <Accordion.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <ToggleButtonGroup type="checkbox" value={statusFilter} onChange={setStatusFilter}>
                <ToggleButton id="tgl-ongoing" variant="outline-success" value="ongoing" size="sm">Ongoing</ToggleButton>
                <ToggleButton id="tgl-upcoming" variant="outline-primary" value="upcoming" size="sm">Upcoming</ToggleButton>
                <ToggleButton id="tgl-finished" variant="outline-secondary" value="finished" size="sm">Finished</ToggleButton>
              </ToggleButtonGroup>
            </div>

            <Table hover responsive size="sm" className="align-middle">
              <thead className="table-light">
                <tr style={{ cursor: 'pointer' }}>
                  <th onClick={() => setSortConfig({ key: 'turmaName', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Turma</th>
                  <th onClick={() => setSortConfig({ key: 'courseName', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Course</th>
                  <th onClick={() => setSortConfig({ key: 'startDate', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>Start</th>
                  <th>End</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredTurmas.map((t, idx) => {
                  const status = getTurmaStatus(t.startDate, t.endDate);
                  return (
                    <tr key={idx} onClick={() => handleTurmaSelect(t)} className={selectedTurma?.turmaId === t.turmaId ? "table-primary" : ""}>
                      <td className="fw-bold">{t.turmaName}</td>
                      <td>{t.courseName}</td>
                      <td>{new Date(t.startDate).toLocaleDateString()}</td>
                      <td>{new Date(t.endDate).toLocaleDateString()}</td>
                      <td>
                        <Badge bg={status === 'ongoing' ? 'success' : status === 'upcoming' ? 'primary' : 'secondary'}>
                          {status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Accordion.Body>
        </Accordion.Item>

        {/* STEP 2: STUDENT SELECTION */}
        <Accordion.Item eventKey="1" disabled={!selectedTurma}>
          <Accordion.Header>
            <Stack direction="horizontal" gap={3}>
              <i className="bi bi-people text-primary"></i>
              <span>2. Select Student {selectedStudent && <Badge bg="primary" className="ms-2">{selectedStudent.name}</Badge>}</span>
            </Stack>
          </Accordion.Header>
          <Accordion.Body>
            <Row className="g-3">
              {students.map((s, idx) => (
                <Col md={4} key={idx}>
                  <Card 
                    className={`p-3 cursor-pointer border-2 ${selectedStudent?.studentId === s.studentId ? 'border-primary bg-primary-subtle' : ''}`}
                    onClick={() => handleStudentSelect(s)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="fw-bold">{s.name}</div>
                    <div className="small text-muted">{s.email}</div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Accordion.Body>
        </Accordion.Item>

        {/* STEP 3: REPORT CARD & PDF */}
        <Accordion.Item eventKey="2" disabled={!selectedStudent}>
          <Accordion.Header>
            <Stack direction="horizontal" gap={3}>
              <i className="bi bi-file-earmark-bar-graph text-primary"></i>
              <span>3. Report Card View</span>
            </Stack>
          </Accordion.Header>
          <Accordion.Body>
            <div className="text-end mb-3">
              <Button variant="success" onClick={downloadPDF} size="sm">
                <i className="bi bi-file-earmark-pdf me-2"></i>Export Student PDF
              </Button>
            </div>

            <div ref={reportRef} className="p-2">
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-dark text-white p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h4 className="mb-0">Academic Performance Report</h4>
                      <small className="opacity-75">{selectedTurma?.courseName} ({selectedTurma?.turmaName})</small>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold">{selectedStudent?.name}</div>
                      <div className="small opacity-50">Generated: {new Date().toLocaleDateString()}</div>
                    </div>
                  </div>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered className="mt-3">
                    <thead className="table-light">
                      <tr>
                        <th>Module</th>
                        <th className="text-center">Grade</th>
                        <th className="text-center">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.map((g, i) => (
                        <tr key={i}>
                          <td>{g.moduleName || g.ModuleName}</td>
                          <td className="text-center fw-bold">{g.grade ?? '-'}</td>
                          <td className="text-center">
                            {(g.grade ?? 0) >= 10 ? 
                              <span className="text-success fw-bold">PASS</span> : 
                              <span className="text-danger fw-bold">FAIL</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </div>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
};

export default AdminReportDashboard;