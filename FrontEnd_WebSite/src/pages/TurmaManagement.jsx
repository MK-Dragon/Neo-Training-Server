// /src/pages/TurmaManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Row, Col, Card, Badge, ListGroup, InputGroup, Pagination } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const TurmaManagement = () => {
  const [turmas, setTurmas] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  
  const [editingTurma, setEditingTurma] = useState(null);
  const [viewingTurma, setViewingTurma] = useState(null);
  
  const [formData, setFormData] = useState({ TurmaName: '', CourseId: '', DateStart: '', DateEnd: '' });

  // --- SORTING, FILTERING, PAGINATION STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [statusFilters, setStatusFilters] = useState({ Ongoing: true, Upcoming: true, Finished: true });
  const [sortConfig, setSortConfig] = useState({ key: 'TurmaName', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const formatDateForInput = (dateString) => dateString ? dateString.split('T')[0] : '';

  const getTimingStatus = (start, end) => {
    const today = new Date().setHours(0,0,0,0);
    const startDate = start ? new Date(start).setHours(0,0,0,0) : null;
    const endDate = end ? new Date(end).setHours(0,0,0,0) : null;

    if (endDate && today > endDate) return { label: "Finished", bg: "secondary" };
    if (startDate && today < startDate) return { label: "Upcoming", bg: "info" };
    return { label: "Ongoing", bg: "success" };
  };

  // --- FILTERING & SORTING LOGIC ---
  const processedTurmas = useMemo(() => {
    let result = [...turmas];

    result = result.filter(t => {
      const name = (t.turmaName ?? t.TurmaName ?? "").toLowerCase();
      const course = (t.courseName ?? t.CourseName ?? "").toLowerCase();
      const isDel = t.isDeleted ?? t.IsDeleted ?? 0;
      const status = getTimingStatus(t.dateStart ?? t.DateStart, t.dateEnd ?? t.DateEnd).label;

      const matchesSearch = name.includes(searchTerm.toLowerCase()) || course.includes(searchTerm.toLowerCase());
      const matchesDeleted = showDeleted ? true : isDel === 0;
      const matchesStatus = statusFilters[status];

      return matchesSearch && matchesDeleted && matchesStatus;
    });

    result.sort((a, b) => {
      const aVal = a[sortConfig.key] ?? a[sortConfig.key.charAt(0).toLowerCase() + sortConfig.key.slice(1)] ?? "";
      const bVal = b[sortConfig.key] ?? b[sortConfig.key.charAt(0).toLowerCase() + sortConfig.key.slice(1)] ?? "";

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [turmas, searchTerm, showDeleted, statusFilters, sortConfig]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedTurmas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(processedTurmas.length / itemsPerPage);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // --- ACTION HANDLERS ---
  const handleOpenEditModal = (turma = null) => {
    setError('');
    if (turma) {
      setEditingTurma(turma);
      setFormData({ 
        TurmaName: turma.turmaName ?? turma.TurmaName, 
        CourseId: turma.courseId ?? turma.CourseId,
        DateStart: formatDateForInput(turma.dateStart ?? turma.DateStart),
        DateEnd: formatDateForInput(turma.dateEnd ?? turma.DateEnd)
      });
    } else {
      setEditingTurma(null);
      setFormData({ TurmaName: '', CourseId: '', DateStart: '', DateEnd: '' });
    }
    setShowEditModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (formData.DateStart && formData.DateEnd && formData.DateEnd < formData.DateStart) {
        setError("End Date cannot be earlier than Start Date.");
        return;
    }
    const isEditing = !!editingTurma;
    const body = { 
        TurmaId: isEditing ? (editingTurma.turmaId ?? editingTurma.TurmaId) : 0, 
        TurmaName: formData.TurmaName, 
        CourseId: parseInt(formData.CourseId),
        DateStart: formData.DateStart || null,
        DateEnd: formData.DateEnd || null
    };
    try {
      const response = await fetch(`${ServerIP}/api/Turma/${isEditing ? 'update-turma' : 'create-turma'}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (response.ok) { setShowEditModal(false); fetchTurmas(); }
      else { setError(await response.text() || "Failed to save."); }
    } catch (err) { setError("Server error."); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Cancel this Turma?")) return;
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

  const handleViewTurma = async (turma) => {
    setViewingTurma(turma);
    setStudents([]);
    try {
      const res = await fetch(`${ServerIP}/api/Turma/list-students/${turma.turmaId ?? turma.TurmaId}`);
      if (res.ok) setStudents(await res.json());
    } catch (err) { console.log("Error loading students."); }
    setShowViewModal(true);
  };

  return (
    <Container className="mt-5 pt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Turma Management</h2>
        <Button variant="success" onClick={() => handleOpenEditModal()}>+ New Turma</Button>
      </div>

      <Card className="mb-4 shadow-sm border-0 bg-light">
        <Card.Body>
          <Row className="align-items-center g-3">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>🔍</InputGroup.Text>
                <Form.Control 
                  placeholder="Search..." 
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                />
              </InputGroup>
            </Col>
            <Col md={5} className="d-flex gap-3 justify-content-center">
                {['Ongoing', 'Upcoming', 'Finished'].map(status => (
                    <Form.Check 
                        key={status} type="checkbox" label={status}
                        checked={statusFilters[status]} 
                        onChange={() => { setStatusFilters(prev => ({ ...prev, [status]: !prev[status] })); setCurrentPage(1); }}
                    />
                ))}
            </Col>
            <Col md={3} className="d-flex justify-content-end">
              <Form.Check 
                type="switch" id="del-switch" label="Show Canceled"
                checked={showDeleted} onChange={(e) => { setShowDeleted(e.target.checked); setCurrentPage(1); }}
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Table striped bordered hover responsive>
        <thead className="table-dark text-nowrap">
          <tr>
            {/*<th onClick={() => requestSort('TurmaId')} style={{cursor:'pointer'}}>ID {sortConfig.key === 'TurmaId' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th> */}
            <th onClick={() => requestSort('TurmaName')} style={{cursor:'pointer'}}>Name {sortConfig.key === 'TurmaName' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
            <th onClick={() => requestSort('CourseName')} style={{cursor:'pointer'}}>Course {sortConfig.key === 'CourseName' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
            <th onClick={() => requestSort('DateStart')} style={{cursor:'pointer'}}>Start {sortConfig.key === 'DateStart' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
            <th onClick={() => requestSort('DateEnd')} style={{cursor:'pointer'}}>End {sortConfig.key === 'DateEnd' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map(t => {
            const id = t.turmaId ?? t.TurmaId;
            const isDel = t.isDeleted ?? t.IsDeleted ?? 0;
            const timing = getTimingStatus(t.dateStart ?? t.DateStart, t.dateEnd ?? t.DateEnd);

            return (
              <tr key={id}>
                {/*<td>{id}</td>*/}
                <td 
                  onClick={() => handleViewTurma(t)} 
                  className="fw-bold" 
                  style={{ cursor: isDel === 0 ? 'pointer' : 'default', color: isDel === 0 ? '#0d6efd' : '#6c757d', textDecoration: isDel === 0 ? 'underline' : 'line-through' }}
                >
                  {t.turmaName ?? t.TurmaName}
                </td>
                <td>{t.courseName ?? t.CourseName}</td>
                <td>{formatDateForInput(t.dateStart ?? t.DateStart) || '---'}</td>
                <td>{formatDateForInput(t.dateEnd ?? t.DateEnd) || '---'}</td>
                <td><Badge bg={isDel === 1 ? "danger" : timing.bg}>{isDel === 1 ? "Canceled" : timing.label}</Badge></td>
                <td className="text-nowrap">
                  <Button variant="warning" size="sm" onClick={() => handleOpenEditModal(t)} className="me-2">Edit</Button>
                  {isDel === 0 ? (
                    <Button variant="danger" size="sm" onClick={() => handleDelete(id)}>Cancel</Button>
                  ) : (
                    <Button variant="success" size="sm" onClick={() => handleRecover(id)}>Recover</Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {totalPages > 1 && (
        <Pagination className="justify-content-center">
            {[...Array(totalPages)].map((_, i) => (
                <Pagination.Item key={i + 1} active={i + 1 === currentPage} onClick={() => setCurrentPage(i + 1)}>
                    {i + 1}
                </Pagination.Item>
            ))}
        </Pagination>
      )}

      {/* VIEW MODAL */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered>
        <Modal.Header closeButton className={viewingTurma?.isDeleted || viewingTurma?.IsDeleted ? "bg-secondary text-white" : "bg-info text-white"}>
          <Modal.Title>
            {viewingTurma?.turmaName ?? viewingTurma?.TurmaName}
            {(viewingTurma?.isDeleted || viewingTurma?.IsDeleted) && (
              <Badge bg="danger" className="ms-2" style={{ fontSize: '0.5em' }}>CANCELED</Badge>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <div className="mb-3 text-center">
                <Badge bg="light" text="dark" className="border mx-1">Start: {formatDateForInput(viewingTurma?.dateStart ?? viewingTurma?.DateStart) || '---'}</Badge>
                <Badge bg="light" text="dark" className="border mx-1">End: {formatDateForInput(viewingTurma?.dateEnd ?? viewingTurma?.DateEnd) || '---'}</Badge>
            </div>
            <h6 className="fw-bold border-bottom pb-2">Enrolled Students ({students.length})</h6>
            <ListGroup variant="flush">
                {students.map((s, idx) => (
                    <ListGroup.Item key={idx} className="d-flex justify-content-between small">
                        <span>{idx + 1}. <strong>{s.username ?? s.Username}</strong></span>
                        <span className="text-muted">{s.email ?? s.Email}</span>
                    </ListGroup.Item>
                ))}
            </ListGroup>
        </Modal.Body>
      </Modal>

      {/* EDIT MODAL */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title>{editingTurma ? 'Edit Turma' : 'New Turma'}</Modal.Title>
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
                  <option key={c.id ?? c.Id} value={c.id ?? c.Id}>{c.name ?? c.Name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Row>
                <Col>
                    <Form.Group className="mb-3">
                        <Form.Label>Start Date</Form.Label>
                        <Form.Control type="date" value={formData.DateStart} onChange={e => setFormData({...formData, DateStart: e.target.value})} />
                    </Form.Group>
                </Col>
                <Col>
                    <Form.Group className="mb-3">
                        <Form.Label>End Date</Form.Label>
                        <Form.Control type="date" value={formData.DateEnd} onChange={e => setFormData({...formData, DateEnd: e.target.value})} />
                    </Form.Group>
                </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default TurmaManagement;