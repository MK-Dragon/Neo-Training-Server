import React, { useState, useEffect, useMemo } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Row, Col, Badge, ListGroup, InputGroup, Pagination } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;
const LEVEL_ORDER = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [allModulesList, setAllModulesList] = useState([]);
  const [courseModules, setCourseModules] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ Name: '', Level: 'Beginner', DurationInHours: 0 });
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'Name', direction: 'asc' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); 

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchCourses();
    fetchAllAvailableModules();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${ServerIP}/api/Courses/all-courses-summary`);
      if (response.ok) {
        const data = await response.json();
        setCourses(Array.isArray(data) ? data : []);
      }
    } catch (err) { setError("Failed to fetch courses."); }
  };

  const fetchAllAvailableModules = async () => {
    try {
      const response = await fetch(`${ServerIP}/api/Module/allmodules`);
      if (response.ok) {
        const data = await response.json();
        setAllModulesList(data.filter(m => (m.isDeleted ?? m.IsDeleted ?? 0) === 0));
      }
    } catch (err) { console.error("Could not load modules."); }
  };

  const getLevelBadge = (level) => {
    const lvl = level?.toLowerCase();
    switch (lvl) {
      case 'advanced': return 'dark';
      case 'intermediate': return 'primary';
      case 'beginner': return 'secondary';
      default: return 'info';
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const processedCourses = useMemo(() => {
    let filtered = courses.filter(c => 
      (c.name ?? c.Name).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let aVal = a[sortConfig.key] ?? a[sortConfig.key.toLowerCase()];
      let bVal = b[sortConfig.key] ?? b[sortConfig.key.toLowerCase()];

      if (sortConfig.key === 'Level') {
        aVal = LEVEL_ORDER[aVal?.toLowerCase()] || 0;
        bVal = LEVEL_ORDER[bVal?.toLowerCase()] || 0;
      }

      // Duration Sort Fix (Removes 'h' and converts to number)
      if (sortConfig.key === 'DurationInHours') {
        aVal = parseFloat(String(aVal).replace(/[^0-9.]/g, '')) || 0;
        bVal = parseFloat(String(bVal).replace(/[^0-9.]/g, '')) || 0;
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [courses, searchTerm, sortConfig]);

  // Pagination Calculations
  const totalPages = Math.ceil(processedCourses.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedCourses.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  // Modal Handlers
  const handleOpenModal = async (course = null) => {
    setError('');
    setSelectedModuleId('');
    if (course) {
      const id = course.id ?? course.Id;
      setEditingCourse(course);
      setFormData({ 
        Name: course.name ?? course.Name ?? '', 
        Level: course.level ?? course.Level ?? 'Beginner', 
        DurationInHours: course.durationInHours ?? course.DurationInHours ?? 0 
      });
      try {
        const res = await fetch(`${ServerIP}/api/CourseModule/course/${id}/modules`);
        if (res.ok) {
          const data = await res.json();
          setCourseModules(data.map(m => ({
            moduleId: m.moduleId ?? m.ModuleId,
            moduleName: m.moduleName ?? m.ModuleName,
            durationH: m.durationH ?? m.DurationH,
            orderIndex: m.orderIndex ?? m.OrderIndex ?? 0
          })));
        }
      } catch (err) { setError("Could not load modules."); }
    } else {
      setEditingCourse(null);
      setFormData({ Name: '', Level: 'Beginner', DurationInHours: 0 });
      setCourseModules([]);
    }
    setShowModal(true);
  };

  const handleTierChange = async (moduleId, newTier) => {
    const courseId = editingCourse.id ?? editingCourse.Id;
    const tierInt = parseInt(newTier) || 0;
    setCourseModules(prev => prev.map(m => m.moduleId === moduleId ? { ...m, orderIndex: tierInt } : m));
    try {
      await fetch(`${ServerIP}/api/CourseModule/update-module-order`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ courseId, moduleId, orderIndex: tierInt })
      });
    } catch (err) { console.error("Failed to update order."); }
  };

  const addModuleToCourse = async () => {
    if (!selectedModuleId || !editingCourse) return;
    const courseId = editingCourse.id ?? editingCourse.Id;
    const payload = [{ courseId, moduleId: parseInt(selectedModuleId), orderIndex: courseModules.length + 1 }];
    try {
      const res = await fetch(`${ServerIP}/api/CourseModule/add-modules-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) handleOpenModal(editingCourse);
    } catch (err) { setError("Failed to link module."); }
  };

  const removeModuleFromCourse = async (moduleId) => {
    if (!window.confirm("Remove module from this course?")) return;
    const courseId = editingCourse.id ?? editingCourse.Id;
    try {
      const res = await fetch(`${ServerIP}/api/CourseModule/delete-module-from-course/${courseId}/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setCourseModules(prev => prev.filter(m => m.moduleId !== moduleId));
    } catch (err) { setError("Could not remove module."); }
  };

  const handleSaveCourseSettings = async (e) => {
    e.preventDefault();
    const isEditing = !!editingCourse;
    const body = { 
      Id: isEditing ? (editingCourse.id ?? editingCourse.Id) : 0,
      ...formData
    };
    try {
      const res = await fetch(`${ServerIP}/api/Courses/${isEditing ? 'update-course' : 'create-course'}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setShowModal(false);
        fetchCourses();
      } else {
        setError(await res.text() || "Failed to save.");
      }
    } catch (err) { setError("Server error."); }
  };

  return (
    <Container className="mt-5 pt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">Course Management</h2>
        <Button variant="success" className="rounded-pill px-4" onClick={() => handleOpenModal()}>
          + Add Course
        </Button>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-4 rounded-4 shadow-sm border mb-4">
        <Row className="align-items-center">
          <Col md={6}>
            <Form.Label className="fw-bold small ms-1">Search Course</Form.Label>
            <InputGroup className="bg-light rounded-pill border px-2">
              <InputGroup.Text className="bg-transparent border-0">🔍</InputGroup.Text>
              <Form.Control 
                className="bg-transparent border-0 shadow-none"
                placeholder="Search by name..." 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              />
            </InputGroup>
          </Col>
          <Col md={3}>
            <Form.Label className="fw-bold small ms-1">Items Per Page</Form.Label>
            <Form.Select 
              className="rounded-pill bg-light border"
              value={itemsPerPage} 
              onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </Form.Select>
          </Col>
        </Row>
      </div>

      {/* Standard Table (SCSS will handle the rounded corners) */}
      <Table striped bordered hover responsive className="align-middle mb-0">
        <thead className="table-dark">
          <tr>
            <th onClick={() => requestSort('Name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              Name {sortConfig.key === 'Name' ? (sortConfig.direction === 'asc' ? '▴' : '▾') : '↕'}
            </th>
            <th onClick={() => requestSort('Level')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              Level {sortConfig.key === 'Level' ? (sortConfig.direction === 'asc' ? '▴' : '▾') : '↕'}
            </th>
            <th onClick={() => requestSort('DurationInHours')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              Duration {sortConfig.key === 'DurationInHours' ? (sortConfig.direction === 'asc' ? '▴' : '▾') : '↕'}
            </th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map(c => (
            <tr key={c.id ?? c.Id}>
              <td className="fw-bold">{c.name ?? c.Name}</td>
              <td>
                <Badge pill bg={getLevelBadge(c.level ?? c.Level)} className="px-3">
                  {c.level ?? c.Level}
                </Badge>
              </td>
              <td>{c.durationInHours ?? c.DurationInHours}h</td>
              <td className="text-center">
                <Button variant="warning" size="sm" onClick={() => handleOpenModal(c)}>Edit</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Pagination Bar */}
      <div className="d-flex justify-content-center mt-4">
        <Pagination>
          <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
          {[...Array(totalPages)].map((_, i) => (
            <Pagination.Item 
              key={i + 1} 
              active={i + 1 === currentPage}
              onClick={() => handlePageChange(i + 1)}
            >
              {i + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
        </Pagination>
      </div>

      {/* Modal - Course Settings & Modules */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Form onSubmit={handleSaveCourseSettings}>
          <Modal.Header closeButton>
            <Modal.Title className="fw-bold">
              {editingCourse ? 'Course Structure & Modules' : 'New Course'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
            <Row>
              <Col md={5}>
                <h6 className="fw-bold mb-3 border-bottom pb-2">General Info</h6>
                <Form.Group className="mb-3">
                  <Form.Label>Course Name</Form.Label>
                  <Form.Control value={formData.Name} onChange={e => setFormData({...formData, Name: e.target.value})} required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Target Level</Form.Label>
                  <Form.Select value={formData.Level} onChange={e => setFormData({...formData, Level: e.target.value})}>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>Base Duration (Hours)</Form.Label>
                  <Form.Control type="number" value={formData.DurationInHours} onChange={e => setFormData({...formData, DurationInHours: parseInt(e.target.value)})} />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100 shadow-sm">Save Changes</Button>
              </Col>
              
              <Col md={7} className="border-start">
                <h6 className="fw-bold mb-3 border-bottom pb-2">Module Sequence</h6>
                <ListGroup className="mb-3" style={{maxHeight: '300px', overflowY: 'auto'}}>
                  {[...courseModules].sort((a,b) => a.orderIndex - b.orderIndex).map(m => (
                    <ListGroup.Item key={m.moduleId}>
                      <Row className="align-items-center g-2">
                        <Col xs={2}>
                          <Form.Control 
                            type="number" size="sm" className="text-center"
                            value={m.orderIndex} 
                            onChange={(e) => handleTierChange(m.moduleId, e.target.value)}
                          />
                        </Col>
                        <Col xs={7}>
                          <div className="text-truncate fw-bold small">{m.moduleName}</div>
                          <small className="text-muted">{m.durationH}h</small>
                        </Col>
                        <Col xs={3} className="text-end">
                          <Button variant="link" className="text-danger p-0 text-decoration-none small" onClick={() => removeModuleFromCourse(m.moduleId)}>
                            Remove
                          </Button>
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>

                {editingCourse && (
                  <div className="bg-light p-3 rounded border">
                    <Form.Label className="small fw-bold mb-2">Link New Module</Form.Label>
                    <InputGroup size="sm">
                      <Form.Select value={selectedModuleId} onChange={e => setSelectedModuleId(e.target.value)}>
                        <option value="">Select a module...</option>
                        {allModulesList
                          .filter(am => !courseModules.some(cm => cm.moduleId === (am.id ?? am.Id)))
                          .map(am => (
                            <option key={am.id ?? am.Id} value={am.id ?? am.Id}>{am.name ?? am.Name}</option>
                          ))
                        }
                      </Form.Select>
                      <Button variant="success" onClick={addModuleToCourse} disabled={!selectedModuleId}>Add</Button>
                    </InputGroup>
                  </div>
                )}
              </Col>
            </Row>
          </Modal.Body>
        </Form>
      </Modal>
    </Container>
  );
};

export default CourseManagement;