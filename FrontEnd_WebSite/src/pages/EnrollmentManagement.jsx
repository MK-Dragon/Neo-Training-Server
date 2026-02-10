// /src/pages/EnrollmentManagement.jsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ListGroup, Button, Badge, Form, Alert, Stack, Spinner } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const EnrollmentManagement = () => {
  const [pendingEntries, setPendingEntries] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [studentSortMode, setStudentSortMode] = useState('default'); 
  const [turmaSort, setTurmaSort] = useState('startDate');
  const [hideOngoing, setHideOngoing] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendRes, turmaRes] = await Promise.all([
        fetch(`${ServerIP}/api/PreEnrollment/pending-list`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${ServerIP}/api/Enrollment/GetTurmaToEnrollStudents`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const pendData = await pendRes.json();
      const turmaData = await turmaRes.json();
      setPendingEntries(pendData);
      setTurmas(turmaData);
    } catch (err) {
      setError("Error connecting to the server.");
    } finally {
      setLoading(false);
    }
  };

  const groupedStudents = pendingEntries.reduce((acc, current) => {
    const studentId = current.studentId ?? current.StudentId;
    if (!acc[studentId]) {
      acc[studentId] = {
        id: studentId,
        name: current.studentName ?? current.StudentName,
        email: current.studentEmail ?? current.StudentEmail,
        options: []
      };
    }
    if (acc[studentId].options.length < 2) acc[studentId].options.push(current);
    return acc;
  }, {});

  // FILTER LOGIC: Show only students matching selected Turma OR all students if none selected
  const studentList = Object.values(groupedStudents)
    .filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!selectedTurma) return matchesSearch;
      
      const tId = selectedTurma.turmaId ?? selectedTurma.TurmaId;
      const isChoice = s.options.some(opt => (opt.turmaId ?? opt.TurmaId) === tId);
      return matchesSearch && isChoice;
    })
    .sort((a, b) => {
      if (studentSortMode === '1st') return (a.options[0]?.turmaName || '').localeCompare(b.options[0]?.turmaName || '');
      if (studentSortMode === '2nd') return (a.options[1]?.turmaName || '').localeCompare(b.options[1]?.turmaName || '');
      return 0; 
    });

  const getStudentHighlight = (student) => {
    if (!selectedTurma) return "";
    const tId = selectedTurma.turmaId ?? selectedTurma.TurmaId;
    const isFirst = (student.options[0]?.turmaId ?? student.options[0]?.TurmaId) === tId;
    const isSecond = (student.options[1]?.turmaId ?? student.options[1]?.TurmaId) === tId;
    
    if (isFirst) return "bg-success-subtle border-success";
    if (isSecond) return "bg-warning-subtle border-warning";
    return "";
  };

  const getTurmaHighlight = (tId) => {
    if (!selectedStudent) return "";
    const firstId = selectedStudent.options[0]?.turmaId ?? selectedStudent.options[0]?.TurmaId;
    const secondId = selectedStudent.options[1]?.turmaId ?? selectedStudent.options[1]?.TurmaId;
    if (tId === firstId) return "border-success bg-success-subtle";
    if (tId === secondId) return "border-warning bg-warning-subtle";
    return "";
  };

  const handleEnroll = async () => {
    if (!selectedStudent || !selectedTurma) return;
    const tId = selectedTurma.turmaId ?? selectedTurma.TurmaId;
    try {
      const res = await fetch(`${ServerIP}/api/Enrollment/enroll-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ StudentId: selectedStudent.id, TurmaId: tId })
      });
      if (res.ok) {
        await fetch(`${ServerIP}/api/PreEnrollment/clear-pre-enroll/${selectedStudent.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        setSuccess(`Enrolled ${selectedStudent.name}!`);
        setSelectedStudent(null);
        setSelectedTurma(null);
        fetchData();
      }
    } catch (err) { setError("Network error."); }
  };

  // FILTER LOGIC: Show only choices of selected student OR all turmas if none selected
  const processedTurmas = turmas
    .filter(t => {
      const ongoing = (new Date() >= new Date(t.startDate) && new Date() <= new Date(t.endDate));
      if (hideOngoing && ongoing) return false;
      
      if (!selectedStudent) return true;
      
      const tId = t.turmaId ?? t.TurmaId;
      return selectedStudent.options.some(opt => (opt.turmaId ?? opt.TurmaId) === tId);
    })
    .sort((a, b) => {
      const field = turmaSort === 'startDate' ? 'startDate' : 'endDate';
      return new Date(a[field]) - new Date(b[field]);
    });

  return (
    <Container className="mt-5 pt-4">
      <h2 className="fw-bold mb-4 text-dark">Enrollment Management</h2>
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Row className="g-4">
        {/* Left: Student List */}
        <Col lg={4}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-primary text-white py-3">
              <Stack direction="horizontal" gap={2}>
                <h5 className="mb-0 me-auto">Students {selectedTurma && <Badge bg="light" text="primary">Filtered</Badge>}</h5>
                <Form.Select size="sm" className="w-auto" onChange={(e) => setStudentSortMode(e.target.value)}>
                  <option value="default">Default</option>
                  <option value="1st">Sort 1st Choice</option>
                  <option value="2nd">Sort 2nd Choice</option>
                </Form.Select>
              </Stack>
            </Card.Header>
            <Card.Body>
              <Form.Control className="mb-3" placeholder="Filter by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <ListGroup variant="flush" style={{ maxHeight: '650px', overflowY: 'auto' }}>
                {loading ? <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div> : 
                 studentList.map(s => {
                  const isSSelected = selectedStudent?.id === s.id;
                  const highlightClass = getStudentHighlight(s);
                  return (
                    <ListGroup.Item 
                      key={s.id} 
                      action 
                      onClick={() => setSelectedStudent(isSSelected ? null : s)}
                      className={`rounded mb-2 border p-3 ${highlightClass}`}
                      style={{ 
                        borderWidth: isSSelected ? '4px' : (highlightClass ? '2px' : '1px'),
                        borderColor: isSSelected ? '#dc3545' : undefined, 
                      }}
                    >
                      <div className={`fw-bold fs-5 ${isSSelected ? 'text-danger' : 'text-dark'}`}>{s.name}</div>
                      <Stack direction="horizontal" gap={2} className="mt-2">
                        {s.options.map((opt, idx) => (
                          <Badge key={idx} bg={idx === 0 ? "success" : "warning"} text={idx === 1 ? "dark" : ""}>
                            {idx + 1}º: {opt.turmaName}
                          </Badge>
                        ))}
                      </Stack>
                    </ListGroup.Item>
                  );
                })}
                {!loading && studentList.length === 0 && <div className="text-center text-muted py-4">No students found.</div>}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        {/* Center: Action UI */}
        <Col lg={3} className="d-flex flex-column align-items-center justify-content-center">
          <Card className="text-center shadow-sm w-100 mb-4 border-light border-2">
            <Card.Body className="py-4">
              <i className="bi bi-person-check fs-1 text-primary"></i>
              <hr className="my-3 mx-4 opacity-25" />
              <div className="py-2">
                <div className="text-muted small mb-1">Target Student</div>
                <h6 className={selectedStudent ? "text-danger fw-bold" : "text-muted"}>{selectedStudent?.name || "Student Name"}</h6>
                <div className="my-3 text-muted fw-light">to</div>
                <div className="text-muted small mb-1">Target Turma</div>
                <h6 className={selectedTurma ? "text-danger fw-bold" : "text-muted"}>{selectedTurma?.turmaName || "Turma Name"}</h6>
              </div>
            </Card.Body>
          </Card>
          <Button 
            variant="success" size="lg" className="w-100 py-3 shadow-sm fw-bold border-0" 
            disabled={!selectedStudent || !selectedTurma}
            onClick={handleEnroll}
            style={{ backgroundColor: '#67ac8c' }}
          >
            Confirm Placement
          </Button>
          {(selectedStudent || selectedTurma) && (
            <Button variant="link" size="sm" className="text-muted mt-2" onClick={() => {setSelectedStudent(null); setSelectedTurma(null);}}>
              Clear Filters / Reset
            </Button>
          )}
        </Col>

        {/* Right: Turma List */}
        <Col lg={5}>
          <Card className="shadow-sm border-0 h-100">
            <Card.Header className="bg-dark text-white py-3">
              <Stack direction="horizontal" gap={2}>
                <h5 className="mb-0 me-auto">Turmas {selectedStudent && <Badge bg="primary">Choices Only</Badge>}</h5>
                <Form.Check type="switch" label="Hide Ongoing" className="small" onChange={(e) => setHideOngoing(e.target.checked)} />
                <Form.Select size="sm" className="w-auto bg-dark text-white border-secondary" onChange={(e) => setTurmaSort(e.target.value)}>
                  <option value="startDate">Sort: Start</option>
                  <option value="endDate">Sort: End</option>
                </Form.Select>
              </Stack>
            </Card.Header>
            <Card.Body>
              <ListGroup variant="flush" style={{ maxHeight: '650px', overflowY: 'auto' }}>
                {loading ? <div className="text-center py-5"><Spinner animation="border" variant="dark" /></div> : 
                 processedTurmas.map(t => {
                  const id = t.turmaId ?? t.TurmaId;
                  const isTSelected = (selectedTurma?.turmaId ?? selectedTurma?.TurmaId) === id;
                  const highlight = getTurmaHighlight(id);
                  const ongoing = (new Date() >= new Date(t.startDate) && new Date() <= new Date(t.endDate));

                  return (
                    <ListGroup.Item 
                      key={id} 
                      action 
                      onClick={() => setSelectedTurma(isTSelected ? null : t)}
                      className={`rounded mb-2 border ${highlight}`}
                      style={{ 
                        borderWidth: isTSelected ? '4px' : (highlight ? '2px' : '1px'),
                        borderColor: isTSelected ? '#dc3545' : undefined, 
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className={`fw-bold fs-5 ${isTSelected ? 'text-danger' : 'text-dark'}`}>{t.turmaName}</div>
                          <div className="text-muted small">{t.courseName}</div>
                          <div className="text-muted small mt-1">
                            {new Date(t.startDate).toLocaleDateString('en-GB')} → {new Date(t.endDate).toLocaleDateString('en-GB')}
                          </div>
                        </div>
                        <div className="text-end">
                          <Badge pill className="px-3 py-2 mb-1" style={{ backgroundColor: '#6c757d', fontSize: '0.85rem' }}>
                            {t.studentCount} / 30
                          </Badge>
                          {ongoing && <Badge bg="danger" className="d-block mt-1">Ongoing</Badge>}
                        </div>
                      </div>
                    </ListGroup.Item>
                  );
                })}
                {!loading && processedTurmas.length === 0 && <div className="text-center text-muted py-4">No matching turmas found.</div>}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default EnrollmentManagement;