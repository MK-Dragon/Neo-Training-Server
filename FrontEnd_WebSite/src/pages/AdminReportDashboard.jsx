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
  const [studentSearch, setStudentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(['ongoing']); 
  const [sortConfig, setSortConfig] = useState({ key: 'dateStart', direction: 'asc' });
  
  const reportRef = useRef();

  useEffect(() => { 
    fetchActiveTurmas(); 
  }, []);

  // --- API FETCHING ---

  const fetchActiveTurmas = async () => {
    setLoading(true);
    try {
      // Endpoint: [HttpGet("all-active-turmas")]
      const res = await fetch(`${ServerIP}/api/Turma/all-active-turmas`);
      if (res.ok) {
        const data = await res.json();
        setTurmas(data);
      }
    } catch (err) {
      console.error("Error fetching turmas:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (turmaId) => {
    try {
      // Endpoint: [HttpGet("list-students/{turmaId}")]
      const res = await fetch(`${ServerIP}/api/Turma/list-students/${turmaId}`);
      if (res.ok) setStudents(await res.json());
      else setStudents([]);
    } catch (err) { console.error("Error fetching students:", err); }
  };

  const fetchGrades = async (studentId, turmaId) => {
    try {
      // Endpoint: [HttpGet("student-report")]
      const res = await fetch(`${ServerIP}/api/StudentGrades/student-report?studentId=${studentId}&turmaId=${turmaId}`);
      if (res.ok) setGrades(await res.json());
    } catch (err) { console.error("Error fetching grades:", err); }
  };

  // --- LOGIC HELPERS ---

  const getTurmaStatus = (start, end) => {
    if (!start || !end) return 'ongoing';
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
    fetchStudents(turma.turmaId);
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    // student.userId is from StudentInTurmaDTO
    fetchGrades(student.userId, selectedTurma.turmaId);
  };

  const sortedAndFilteredTurmas = useMemo(() => {
    return turmas
      .filter(t => statusFilter.includes(getTurmaStatus(t.dateStart, t.dateEnd)))
      .sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [turmas, statusFilter, sortConfig]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.username.toLowerCase().includes(studentSearch.toLowerCase()) || 
      s.email.toLowerCase().includes(studentSearch.toLowerCase())
    );
  }, [students, studentSearch]);

  const downloadPDF = () => {
    const element = reportRef.current;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Report_${selectedStudent?.username}_${selectedTurma?.turmaName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  if (loading) return (
    <Container className="text-center mt-5 py-5">
      <Spinner animation="grow" variant="primary" />
      <p className="mt-3 text-muted">Loading Academic Data...</p>
    </Container>
  );

  return (
    <Container className="mt-5 pt-4 pb-5">
      <div className="mb-4">
        <h2 className="fw-bold text-dark">Administrative Reports</h2>
        <p className="text-muted small text-uppercase fw-bold" style={{ letterSpacing: '1px' }}>
          Turma Management & Student Performance
        </p>
      </div>

      <Accordion defaultActiveKey="0" className="shadow-sm border rounded overflow-hidden">
        
        {/* SECTION 1: TURMA SELECTION */}
        <Accordion.Item eventKey="0">
          <Accordion.Header>
            <i className="bi bi-calendar3 me-2 text-primary"></i>
            <span className="fw-bold">1. Select Turma</span>
            {selectedTurma && <Badge bg="primary" className="ms-3">{selectedTurma.turmaName}</Badge>}
          </Accordion.Header>
          <Accordion.Body>
            <div className="mb-3">
              <label className="small text-muted mb-2 d-block">Filter Status:</label>
              <ToggleButtonGroup type="checkbox" value={statusFilter} onChange={setStatusFilter} className="mb-2">
                <ToggleButton id="tgl-ongoing" variant="outline-success" value="ongoing" size="sm">Ongoing</ToggleButton>
                <ToggleButton id="tgl-upcoming" variant="outline-primary" value="upcoming" size="sm">Upcoming</ToggleButton>
                <ToggleButton id="tgl-finished" variant="outline-secondary" value="finished" size="sm">Finished</ToggleButton>
              </ToggleButtonGroup>
            </div>

            <Table hover responsive className="align-middle">
              <thead className="table-light">
                <tr style={{ cursor: 'pointer' }}>
                  <th onClick={() => setSortConfig({ key: 'turmaName', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                    Turma <i className="bi bi-arrow-down-up small ms-1"></i>
                  </th>
                  <th onClick={() => setSortConfig({ key: 'courseName', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                    Course <i className="bi bi-arrow-down-up small ms-1"></i>
                  </th>
                  <th>Timeline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedAndFilteredTurmas.map((t) => {
                  const status = getTurmaStatus(t.dateStart, t.dateEnd);
                  const isSelected = selectedTurma?.turmaId === t.turmaId;
                  return (
                    <tr key={t.turmaId} onClick={() => handleTurmaSelect(t)} className={isSelected ? "table-primary" : ""}>
                      <td className="fw-bold">{t.turmaName}</td>
                      <td>{t.courseName}</td>
                      <td className="small text-muted">
                        {t.dateStart ? new Date(t.dateStart).toLocaleDateString() : '—'} ➔ {t.dateEnd ? new Date(t.dateEnd).toLocaleDateString() : '—'}
                      </td>
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

        {/* SECTION 2: STUDENT SELECTION */}
        <Accordion.Item eventKey="1" disabled={!selectedTurma}>
          <Accordion.Header>
            <i className="bi bi-people me-2 text-primary"></i>
            <span className="fw-bold">2. Enrolled Students</span>
            {selectedStudent && <Badge bg="primary" className="ms-3">{selectedStudent.username}</Badge>}
          </Accordion.Header>
          <Accordion.Body>
            <Form.Control 
              type="text" 
              placeholder="Search by name or email..." 
              className="mb-4"
              onChange={(e) => setStudentSearch(e.target.value)} 
            />
            <Row className="g-3">
              {filteredStudents.map((s) => (
                <Col md={4} key={s.userId}>
                  <Card 
                    className={`h-100 shadow-sm border-2 ${selectedStudent?.userId === s.userId ? 'border-primary bg-primary-subtle' : ''}`}
                    onClick={() => handleStudentSelect(s)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Card.Body className="py-3">
                      <div className="fw-bold">{s.username}</div>
                      <div className="text-muted small">{s.email}</div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Accordion.Body>
        </Accordion.Item>

        {/* SECTION 3: THE REPORT CARD */}
        <Accordion.Item eventKey="2" disabled={!selectedStudent}>
          <Accordion.Header>
            <i className="bi bi-file-earmark-check me-2 text-primary"></i>
            <span className="fw-bold">3. Student Report Card</span>
          </Accordion.Header>
          <Accordion.Body>
            <div className="d-flex justify-content-end mb-4">
              <Button variant="outline-danger" onClick={downloadPDF}>
                <i className="bi bi-file-earmark-pdf me-2"></i>Download Official PDF
              </Button>
            </div>

            <div ref={reportRef} className="p-1">
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-dark text-white p-4">
                  <Row className="align-items-center">
                    <Col>
                      <h4 className="mb-1">Academic Performance Record</h4>
                      <p className="mb-0 opacity-75 fw-light">{selectedTurma?.courseName} ({selectedTurma?.turmaName})</p>
                    </Col>
                    <Col className="text-end">
                      <div className="fw-bold fs-5">{selectedStudent?.username}</div>
                      <div className="small opacity-50">Student ID: {selectedStudent?.userId}</div>
                    </Col>
                  </Row>
                </Card.Header>
                <Card.Body className="p-4">
                  <Table hover responsive className="align-middle">
                    <thead className="table-light">
                      <tr>
                        <th className="py-3">Module Description</th>
                        <th className="py-3 text-center">Grade (0-20)</th>
                        <th className="py-3 text-center">Outcome</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.map((item, index) => {
                        const gradeVal = item.grade ?? item.Grade;
                        return (
                          <tr key={index}>
                            <td className="fw-semibold text-secondary">{item.moduleName ?? item.ModuleName}</td>
                            <td className="text-center fs-5">
                              {gradeVal !== null && gradeVal !== undefined ? (
                                <span className={gradeVal >= 10 ? "text-success fw-bold" : "text-danger fw-bold"}>
                                  {gradeVal}
                                </span>
                              ) : (
                                <span className="text-muted opacity-50 small italic">Pending</span>
                              )}
                            </td>
                            <td className="text-center">
                              {gradeVal === null || gradeVal === undefined ? (
                                <Badge pill bg="secondary" className="px-3 py-2 fw-normal opacity-75">Not Graded</Badge>
                              ) : gradeVal >= 10 ? (
                                <Badge pill bg="success" className="px-3 py-2 fw-normal">Passed</Badge>
                              ) : (
                                <Badge pill bg="danger" className="px-3 py-2 fw-normal">Failed</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </Card.Body>
                <Card.Footer className="bg-light text-muted small py-3 d-flex justify-content-between">
                   <span>Authenticated Academic Document</span>
                   <span>Date: {new Date().toLocaleDateString()}</span>
                </Card.Footer>
              </Card>
            </div>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </Container>
  );
};

export default AdminReportDashboard;