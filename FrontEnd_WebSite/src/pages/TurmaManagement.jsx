// /src/pages/TurmaManagement.jsx

import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Row, Col, Card, Badge, ListGroup, InputGroup } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const TurmaManagement = () => {
  const [turmas, setTurmas] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTurma, setEditingTurma] = useState(null);
  const [error, setError] = useState('');
  
  // Filtering & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ TurmaName: '', CourseId: '' });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchTurmas();
    fetchCourses();
  }, []);

  const fetchTurmas = async () => {
    try {
      const response = await fetch(`${ServerIP}/api/Turma/all-turmas`);
      if (response.ok) {
        const data = await response.json();
        setTurmas(Array.isArray(data) ? data : []);
      }
    } catch (err) { setError("Failed to fetch turmas."); }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${ServerIP}/api/Courses/all-courses-summary`);
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      }
    } catch (err) { console.error("Could not load courses."); }
  };

  const handleOpenModal = async (turma = null) => {
    setError('');
    setStudents([]);
    if (turma) {
      // Normalize variable names from API
      const id = turma.TurmaId ?? turma.turmaId ?? turma.id;
      const name = turma.TurmaName ?? turma.turmaName ?? '';
      const cId = turma.CourseId ?? turma.courseId ?? '';

      setEditingTurma(turma);
      setFormData({ TurmaName: name, CourseId: cId });
      
      try {
        const res = await fetch(`${ServerIP}/api/Turma/list-students/${id}`);
        if (res.ok) {
          const data = await res.json();
          setStudents(data);
        }
      } catch (err) { console.log("No students found for this turma."); }
    } else {
      setEditingTurma(null);
      setFormData({ TurmaName: '', CourseId: '' });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const isEditing = !!editingTurma;
    const endpoint = isEditing ? 'update-turma' : 'create-turma';
    const id = editingTurma ? (editingTurma.TurmaId ?? editingTurma.turmaId ?? editingTurma.id) : null;
    
    const body = isEditing 
      ? { TurmaId: id, TurmaName: formData.TurmaName, CourseId: parseInt(formData.CourseId) } 
      : { TurmaName: formData.TurmaName, CourseId: parseInt(formData.CourseId) };

    try {
      const response = await fetch(`${ServerIP}/api/Turma/${endpoint}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setShowModal(false);
        fetchTurmas();
      } else {
        const msg = await response.text();
        setError(msg || "Failed to save Turma.");
      }
    } catch (err) { setError("Server error."); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this Turma?")) return;
    try {
      const res = await fetch(`${ServerIP}/api/Turma/delete-turma/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchTurmas();
      else setError("Failed to delete Turma.");
    } catch (err) { setError("Server error during deletion."); }
  };

  const handleRecover = async (id) => {
    if (!window.confirm("Do you want to restore this Turma?")) return;
    try {
      const res = await fetch(`${ServerIP}/api/Turma/recover-turma/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchTurmas();
      else {
        const msg = await res.text();
        setError(msg || "Failed to recover Turma.");
      }
    } catch (err) { setError("Server error during recovery."); }
  };

  // --- Filtering Logic ---
  const filteredTurmas = turmas.filter(t => {
    const name = t.TurmaName ?? t.turmaName ?? "";
    const isDel = t.isDeleted ?? t.IsDeleted ?? 0;
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDeleted = showDeleted ? true : isDel === 0;
    return matchesSearch && matchesDeleted;
  });

  return (
    <Container className="mt-5 pt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Turma Management</h2>
        <Button variant="success" onClick={() => handleOpenModal()}>+ New Turma</Button>
      </div>

      <Card className="mb-4 shadow-sm border-0 bg-light">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text>🔍</InputGroup.Text>
                <Form.Control 
                  placeholder="Search Turmas..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </InputGroup>
            </Col>
            <Col md={6} className="d-flex justify-content-end">
              <Form.Check 
                type="switch"
                id="show-deleted-switch"
                label="Show Deleted Turmas"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Table striped bordered hover responsive>
        <thead className="table-dark">
          <tr>
            <th>ID</th>
            <th>Turma Name</th>
            <th>Course</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredTurmas.map(t => {
            const id = t.TurmaId ?? t.turmaId ?? t.id;
            const name = t.TurmaName ?? t.turmaName ?? 'Unknown';
            const courseName = t.CourseName ?? t.courseName ?? `ID: ${t.CourseId ?? t.courseId}`;
            const isDel = t.isDeleted ?? t.IsDeleted ?? 0;

            return (
              <tr key={id} className={isDel === 1 ? "table-secondary text-muted" : ""}>
                <td>{id}</td>
                <td className={isDel === 1 ? "text-decoration-line-through" : ""}>
                  {name}
                </td>
                <td>{courseName}</td>
                <td>
                  <Badge bg={isDel === 1 ? "danger" : "success"}>
                    {isDel === 1 ? "Deleted" : "Active"}
                  </Badge>
                </td>
                <td>
                  <Button variant="warning" size="sm" className="me-2" onClick={() => handleOpenModal(t)}>
                    Edit
                  </Button>
                  
                  {isDel === 0 ? (
                    <Button variant="danger" size="sm" onClick={() => handleDelete(id)}>
                      Delete
                    </Button>
                  ) : (
                    <Button variant="success" size="sm" onClick={() => handleRecover(id)}>
                      Recover
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
          {filteredTurmas.length === 0 && (
            <tr><td colSpan="5" className="text-center py-4 text-muted">No turmas found matching your criteria.</td></tr>
          )}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title>{editingTurma ? 'Edit Turma' : 'Create New Turma'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <h6 className="fw-bold">Turma Details</h6>
                <Form.Group className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control 
                    value={formData.TurmaName} 
                    onChange={e => setFormData({...formData, TurmaName: e.target.value})} 
                    required 
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Course</Form.Label>
                  <Form.Select 
                    value={formData.CourseId} 
                    onChange={e => setFormData({...formData, CourseId: e.target.value})}
                    required
                  >
                    <option value="">Select a Course...</option>
                    {courses.map(c => (
                      <option key={c.Id ?? c.id} value={c.Id ?? c.id}>
                        {c.Name ?? c.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={6} className="border-start">
                <h6 className="fw-bold">Students in Class</h6>
                <ListGroup variant="flush" style={{maxHeight: '250px', overflowY: 'auto'}}>
                  {students.map(s => (
                    <ListGroup.Item key={s.UserId ?? s.userId} className="small py-1">
                      {s.Username ?? s.username}
                    </ListGroup.Item>
                  ))}
                  {students.length === 0 && (
                    <div className="text-center py-4 text-muted">No students assigned.</div>
                  )}
                </ListGroup>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Changes</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default TurmaManagement;