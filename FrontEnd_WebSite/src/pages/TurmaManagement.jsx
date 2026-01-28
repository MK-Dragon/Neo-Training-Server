// /src/pages/TurmaManagement.jsx

import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Row, Col, Card, Badge, ListGroup, InputGroup } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const TurmaManagement = () => {
  const [turmas, setTurmas] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  
  // Separate Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  
  // Data States
  const [editingTurma, setEditingTurma] = useState(null);
  const [viewingTurma, setViewingTurma] = useState(null);
  const [formData, setFormData] = useState({ TurmaName: '', CourseId: '' });

  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

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

  // --- VIEW MODAL LOGIC (Click on Name) ---
  const handleViewTurma = async (turma) => {
    setViewingTurma(turma);
    setStudents([]);
    const id = turma.TurmaId ?? turma.turmaId ?? turma.id;
    
    try {
      const res = await fetch(`${ServerIP}/api/Turma/list-students/${id}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) { console.log("Error loading students."); }
    setShowViewModal(true);
  };

  // --- EDIT MODAL LOGIC (Click Edit Button) ---
  const handleOpenEditModal = (turma = null) => {
    setError('');
    if (turma) {
      setEditingTurma(turma);
      setFormData({ 
        TurmaName: turma.TurmaName ?? turma.turmaName, 
        CourseId: turma.CourseId ?? turma.courseId 
      });
    } else {
      setEditingTurma(null);
      setFormData({ TurmaName: '', CourseId: '' });
    }
    setShowEditModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const isEditing = !!editingTurma;
    const endpoint = isEditing ? 'update-turma' : 'create-turma';
    const id = editingTurma ? (editingTurma.TurmaId ?? editingTurma.turmaId ?? editingTurma.id) : null;
    
    const body = { 
        TurmaId: id, 
        TurmaName: formData.TurmaName, 
        CourseId: parseInt(formData.CourseId) 
    };

    try {
      const response = await fetch(`${ServerIP}/api/Turma/${endpoint}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setShowEditModal(false);
        fetchTurmas();
      } else {
        const msg = await response.text();
        setError(msg || "Failed to save.");
      }
    } catch (err) { setError("Server error."); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this Turma?")) return;
    try {
      const res = await fetch(`${ServerIP}/api/Turma/delete-turma/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchTurmas();
    } catch (err) { setError("Server error."); }
  };

  const handleRecover = async (id) => {
    try {
      const res = await fetch(`${ServerIP}/api/Turma/recover-turma/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchTurmas();
    } catch (err) { setError("Server error."); }
  };

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
        <Button variant="success" onClick={() => handleOpenEditModal()}>+ New Turma</Button>
      </div>

      <Card className="mb-4 shadow-sm border-0 bg-light">
        <Card.Body>
          <Row>
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
            <Col md={6} className="d-flex justify-content-end align-items-center">
              <Form.Check 
                type="switch" id="del-switch" label="Show Deleted"
                checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)}
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
            <th>Turma Name (Click to view)</th>
            <th>Course</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredTurmas.map(t => {
            const id = t.TurmaId ?? t.turmaId ?? t.id;
            const isDel = t.isDeleted ?? t.IsDeleted ?? 0;
            return (
              <tr key={id}>
                <td>{id}</td>
                <td 
                    onClick={() => isDel === 0 && handleViewTurma(t)}
                    style={{ 
                        cursor: isDel === 0 ? 'pointer' : 'default', 
                        color: isDel === 0 ? '#0d6efd' : '#6c757d',
                        textDecoration: isDel === 0 ? 'underline' : 'line-through'
                    }}
                >
                  {t.TurmaName ?? t.turmaName}
                </td>
                <td>{t.CourseName ?? t.courseName}</td>
                <td>
                  <Badge bg={isDel === 1 ? "danger" : "success"}>
                    {isDel === 1 ? "Deleted" : "Active"}
                  </Badge>
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
  <div className="d-flex gap-2">
    <Button 
      variant="warning" 
      size="sm" 
      onClick={() => handleOpenEditModal(t)}
      style={{ minWidth: '60px' }}
    >
      Edit
    </Button>
    
    {isDel === 0 ? (
      <Button 
        variant="danger" 
        size="sm" 
        onClick={() => handleDelete(id)}
        style={{ minWidth: '60px' }}
      >
        Delete
      </Button>
    ) : (
      <Button 
        variant="success" 
        size="sm" 
        onClick={() => handleRecover(id)}
        style={{ minWidth: '75px' }}
      >
        Recover
      </Button>
    )}
  </div>
</td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {/* --- MODAL A: VIEW ONLY (List of Students) --- */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered>
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title>{viewingTurma?.TurmaName ?? viewingTurma?.turmaName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold text-uppercase text-muted">Enrolled Students</h6>
            <Badge pill bg="primary" style={{ fontSize: '1rem' }}>
              {students.length} Total
            </Badge>
          </div>
          <ListGroup variant="flush" className="border rounded shadow-sm">
            {students.map((s, idx) => (
              <ListGroup.Item key={s.UserId ?? s.userId} className="d-flex justify-content-between">
                <span>{idx + 1}. <strong>{s.Username ?? s.username}</strong></span>
                <small className="text-muted">{s.Email ?? s.email}</small>
              </ListGroup.Item>
            ))}
            {students.length === 0 && (
              <div className="text-center py-4 text-muted">No students assigned to this class.</div>
            )}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      {/* --- MODAL B: EDIT ONLY (Form Settings) --- */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title>{editingTurma ? 'Edit Turma Details' : 'Create New Turma'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Turma Name</Form.Label>
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
                  <option key={c.Id ?? c.id} value={c.Id ?? c.id}>{c.Name ?? c.name}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Changes</Button>
          </Modal.Footer>
        </Form>
      </Modal>

    </Container>
  );
};

export default TurmaManagement;