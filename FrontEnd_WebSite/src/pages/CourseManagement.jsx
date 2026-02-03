// /src/pages/CourseManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Row, Col, Badge, ListGroup, InputGroup } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [allModulesList, setAllModulesList] = useState([]); // List for the dropdown
  const [courseModules, setCourseModules] = useState([]); // Active modules for editing course
  
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({ Name: '', Level: 'Beginner', DurationInHours: 0 });
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchCourses();
    fetchAllAvailableModules();
  }, []);

  // Sort by orderIndex automatically for the UI
  const sortedModules = useMemo(() => {
    return [...courseModules].sort((a, b) => a.orderIndex - b.orderIndex);
  }, [courseModules]);

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
          
          // Map strictly to the names your React state expects
          const normalized = data.map(m => ({
            moduleId: m.moduleId ?? m.ModuleId,
            moduleName: m.moduleName ?? m.ModuleName,
            durationH: m.durationH ?? m.DurationH,
            // Fallback chain for the tier index
            orderIndex: m.orderIndex !== undefined ? m.orderIndex : (m.OrderIndex !== undefined ? m.OrderIndex : 0)
          }));
          
          setCourseModules(normalized);
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

    // 1. Optimistic UI update
    setCourseModules(prev => prev.map(m => 
      m.moduleId === moduleId ? { ...m, orderIndex: tierInt } : m
    ));

    try {
      // 2. Call the HttpPatch("update-module-order") endpoint
      await fetch(`${ServerIP}/api/CourseModule/update-module-order`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          courseId: courseId,
          moduleId: moduleId,
          orderIndex: tierInt
        })
      });
    } catch (err) { console.error("Failed to update order on server."); }
  };

  const addModuleToCourse = async () => {
    if (!selectedModuleId || !editingCourse) return;
    const courseId = editingCourse.id ?? editingCourse.Id;
    const modIdInt = parseInt(selectedModuleId);

    const payload = [{
      courseId: courseId,
      moduleId: modIdInt,
      orderIndex: courseModules.length + 1
    }];

    try {
      const res = await fetch(`${ServerIP}/api/CourseModule/add-modules-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        // Reload modules list to ensure we have correct names/durations from DB
        handleOpenModal(editingCourse);
      }
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
      if (res.ok) {
        setCourseModules(prev => prev.filter(m => m.moduleId !== moduleId));
      }
    } catch (err) { setError("Could not remove module."); }
  };

  const handleSaveCourseSettings = async (e) => {
    e.preventDefault();
    const isEditing = !!editingCourse;
    const body = { 
      Id: isEditing ? (editingCourse.id ?? editingCourse.Id) : 0,
      Name: formData.Name, 
      Level: formData.Level, 
      DurationInHours: formData.DurationInHours
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
        setError(await res.text() || "Failed to save course settings.");
      }
    } catch (err) { setError("Server error."); }
  };

  return (
    <Container className="mt-5 pt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Course Management</h2>
        <Button variant="success" onClick={() => handleOpenModal()}>+ Create Course</Button>
      </div>

      <InputGroup className="mb-4">
        <InputGroup.Text>🔍</InputGroup.Text>
        <Form.Control 
          placeholder="Search by name..." 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </InputGroup>

      <Table striped bordered hover responsive>
        <thead className="table-dark">
          <tr>
            <th>ID</th><th>Name</th><th>Level</th><th>Duration</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {courses.filter(c => (c.name ?? c.Name).toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
            <tr key={c.id ?? c.Id}>
              <td>{c.id ?? c.Id}</td>
              <td>{c.name ?? c.Name}</td>
              <td><Badge bg="info">{c.level ?? c.Level}</Badge></td>
              <td>{c.durationInHours ?? c.DurationInHours}h</td>
              <td>
                <Button variant="warning" size="sm" onClick={() => handleOpenModal(c)}>Edit / Modules</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Form onSubmit={handleSaveCourseSettings}>
          <Modal.Header closeButton>
            <Modal.Title>{editingCourse ? 'Course Structure & Tiers' : 'New Course'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
            <Row>
              <Col md={5}>
                <h6 className="fw-bold mb-3">Course Info</h6>
                <Form.Group className="mb-2">
                  <Form.Label>Name</Form.Label>
                  <Form.Control value={formData.Name} onChange={e => setFormData({...formData, Name: e.target.value})} required />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Level</Form.Label>
                  <Form.Select value={formData.Level} onChange={e => setFormData({...formData, Level: e.target.value})}>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Base Duration (Hours)</Form.Label>
                  <Form.Control type="number" value={formData.DurationInHours} onChange={e => setFormData({...formData, DurationInHours: parseInt(e.target.value)})} />
                </Form.Group>
                <Button variant="primary" type="submit" className="w-100">Update Core Info</Button>
              </Col>
              
              <Col md={7} className="border-start">
                <h6 className="fw-bold mb-3">Module Tiers (Order)</h6>
                <ListGroup className="mb-3" style={{maxHeight: '300px', overflowY: 'auto'}}>
                  {sortedModules.map(m => (
                    <ListGroup.Item key={m.moduleId} className="p-2">
                      <Row className="align-items-center g-2">
                        <Col xs={3}>
                          <Form.Control 
                            type="number" size="sm" 
                            value={m.orderIndex} 
                            onChange={(e) => handleTierChange(m.moduleId, e.target.value)}
                            title="Set Tier / Order"
                          />
                        </Col>
                        <Col xs={7}>
                          <div className="text-truncate fw-bold small">{m.moduleName}</div>
                          <small className="text-muted">{m.durationH}h</small>
                        </Col>
                        <Col xs={2} className="text-end">
                          <Button variant="link" className="text-danger p-0" onClick={() => removeModuleFromCourse(m.moduleId)}>
                            Remove
                          </Button>
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                  {courseModules.length === 0 && (
                    <div className="text-center text-muted p-4">No modules linked yet.</div>
                  )}
                </ListGroup>

                {editingCourse && (
                  <div className="bg-light p-2 rounded border">
                    <Form.Label className="small fw-bold">Link New Module</Form.Label>
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