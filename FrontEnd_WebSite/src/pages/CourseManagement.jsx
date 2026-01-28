// /src/pages/CourseManagement.jsx

import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Row, Col, Card, Badge, ListGroup, InputGroup } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [allModules, setAllModules] = useState([]); 
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [error, setError] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({ Name: '', Level: 'Beginner', durationInHours: 0 });
  const [courseModules, setCourseModules] = useState([]); 
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchCourses();
    fetchAllModules();
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

  const fetchAllModules = async () => {
    try {
      const response = await fetch(`${ServerIP}/api/Module/allmodules`);
      if (response.ok) {
        const data = await response.json();
        // Filter out deleted modules immediately
        setAllModules(data.filter(m => (m.isDeleted ?? m.IsDeleted ?? 0) === 0));
      }
    } catch (err) { console.error("Could not load modules list."); }
  };

  const handleOpenModal = async (course = null) => {
    setError('');
    if (course) {
      const id = course.Id ?? course.id;
      setEditingCourse(course);
      setFormData({ 
        Name: course.Name ?? course.name ?? '', 
        Level: course.Level ?? course.level ?? 'Beginner', 
        durationInHours: course.durationInHours ?? course.DurationInHours ?? 0 
      });
      
      try {
        const res = await fetch(`${ServerIP}/api/Courses/course-id?course_id=${id}`);
        if (res.ok) {
          const fullCourse = await res.json();
          setCourseModules(fullCourse.Modules || fullCourse.modules || []);
        }
      } catch (err) { setError("Could not load course modules."); }
    } else {
      setEditingCourse(null);
      setFormData({ Name: '', Level: 'Beginner', durationInHours: 0 });
      setCourseModules([]);
    }
    setShowModal(true);
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    const isEditing = !!editingCourse;
    const endpoint = isEditing ? 'update-course' : 'create-course';
    
    // Construct body to match your C# DTOs
    const body = isEditing 
      ? { 
          Id: editingCourse.Id ?? editingCourse.id,
          Name: formData.Name, 
          Level: formData.Level, 
          durationInHours: formData.durationInHours,
          IsDeleted: 0,
          Modules: courseModules 
        } 
      : { 
          Name: formData.Name, 
          Level: formData.Level,
          DurationInHours: formData.durationInHours 
        };

    try {
      const response = await fetch(`${ServerIP}/api/Courses/${endpoint}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setShowModal(false);
        fetchCourses();
      } else {
        const msg = await response.text();
        setError(msg || "Failed to save course.");
      }
    } catch (err) { setError("Server error."); }
  };

  const addModuleToCourse = async () => {
    if (!selectedModuleId || !editingCourse) return;
    
    const modIdInt = parseInt(selectedModuleId);
    const moduleToAdd = allModules.find(m => (m.Id ?? m.id) === modIdInt);
    const courseId = editingCourse.Id ?? editingCourse.id;

    const payload = [{
      CourseId: courseId,
      ModuleId: modIdInt,
      OrderIndex: courseModules.length
    }];

    try {
      const res = await fetch(`${ServerIP}/api/CourseModule/add-modules-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setCourseModules([...courseModules, moduleToAdd]);
        setSelectedModuleId('');
      } else {
        setError("Module is already in this course or error occurred.");
      }
    } catch (err) { setError("Failed to link module."); }
  };

  const removeModuleFromCourse = async (moduleId) => {
  if (!window.confirm("Remove this module from the course?")) return;
  
  // Normalize IDs to handle potential casing issues from the API
  const courseId = editingCourse.Id ?? editingCourse.id;
  
  // Log for debugging: Open F12 console to see these values
  console.log(`Attempting to remove Module ${moduleId} from Course ${courseId}`);

  try {
    const res = await fetch(`${ServerIP}/api/CourseModule/delete-module-from-course/${courseId}/${moduleId}`, {
      method: 'PATCH', // Standardized method name
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      }
    });

    if (res.ok) {
      // ONLY update the UI if the database confirmed the delete
      setCourseModules(prevModules => 
        prevModules.filter(m => (m.Id ?? m.id) !== moduleId)
      );
      console.log("Successfully removed from database.");
    } else {
      // If res.ok is false, the database did NOT change
      const errorData = await res.json().catch(() => ({}));
      const errorMsg = errorData.message || "Failed to remove module from database.";
      setError(errorMsg);
      console.error("Backend Error:", errorMsg);
    }
  } catch (err) {
    console.error("Network/Server Error:", err);
    setError("Could not connect to the server to delete the module.");
  }
};

  // Safe filtering logic
  const filteredCourses = courses.filter(c => {
    const name = c.Name ?? c.name ?? "";
    const deleted = c.IsDeleted ?? c.isDeleted ?? 0;
    return name.toLowerCase().includes(searchTerm.toLowerCase()) && deleted === 0;
  });

  return (
    <Container className="mt-5 pt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Course Management</h2>
        <Button variant="success" onClick={() => handleOpenModal()}>+ Create Course</Button>
      </div>

      <InputGroup className="mb-4">
        <InputGroup.Text>🔍</InputGroup.Text>
        <Form.Control 
          placeholder="Search courses by name..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
      </InputGroup>

      <Table striped bordered hover responsive>
        <thead className="table-dark">
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Level</th>
            <th>Duration</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredCourses.map(c => {
            const id = c.Id ?? c.id;
            const name = c.Name ?? c.name;
            const level = c.Level ?? c.level;
            const duration = c.durationInHours ?? c.DurationInHours;

            return (
              <tr key={id}>
                <td>{id}</td>
                <td>{name}</td>
                <td><Badge bg="info">{level}</Badge></td>
                <td>{duration}h</td>
                <td>
                  <Button variant="warning" size="sm" onClick={() => handleOpenModal(c)}>
                    Edit / Modules
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Form onSubmit={handleSaveCourse}>
          <Modal.Header closeButton>
            <Modal.Title>{editingCourse ? 'Edit Course' : 'Create New Course'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
            <Row>
              <Col md={6}>
                <h6 className="text-muted text-uppercase small fw-bold">General Information</h6>
                <Form.Group className="mb-3">
                  <Form.Label>Course Name</Form.Label>
                  <Form.Control 
                    value={formData.Name} 
                    onChange={e => setFormData({...formData, Name: e.target.value})} 
                    required 
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Level</Form.Label>
                  <Form.Select value={formData.Level} onChange={e => setFormData({...formData, Level: e.target.value})}>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Base Duration (Hours)</Form.Label>
                  <Form.Control 
                    type="number"
                    value={formData.durationInHours} 
                    onChange={e => setFormData({...formData, durationInHours: parseInt(e.target.value)})} 
                  />
                </Form.Group>
              </Col>
              
              <Col md={6} className="border-start">
                <h6 className="text-muted text-uppercase small fw-bold">Course Modules</h6>
                <ListGroup className="mb-3" style={{maxHeight: '250px', overflowY: 'auto'}}>
                  {courseModules.map(m => (
                    <ListGroup.Item key={m.Id ?? m.id} className="d-flex justify-content-between align-items-center">
                      <span>{m.Name ?? m.name} <small className="text-muted">({m.DurationInHours ?? m.durationInHours}h)</small></span>
                      <Button variant="link" className="text-danger p-0" onClick={() => removeModuleFromCourse(m.Id ?? m.id)}>
                        Remove
                      </Button>
                    </ListGroup.Item>
                  ))}
                  {courseModules.length === 0 && (
                    <ListGroup.Item className="text-center py-4 text-muted">
                      No modules assigned to this course.
                    </ListGroup.Item>
                  )}
                </ListGroup>

                {editingCourse && (
                  <div className="bg-light p-2 rounded">
                    <Form.Label className="small fw-bold">Add Module</Form.Label>
                    <InputGroup size="sm">
                      <Form.Select value={selectedModuleId} onChange={e => setSelectedModuleId(e.target.value)}>
                        <option value="">Select a module...</option>
                        {allModules
                          .filter(am => !courseModules.some(cm => (cm.Id ?? cm.id) === (am.Id ?? am.id)))
                          .map(am => (
                            <option key={am.Id ?? am.id} value={am.Id ?? am.id}>
                              {am.Name ?? am.name}
                            </option>
                          ))
                        }
                      </Form.Select>
                      <Button variant="primary" onClick={addModuleToCourse} disabled={!selectedModuleId}>
                        Add
                      </Button>
                    </InputGroup>
                  </div>
                )}
                {!editingCourse && (
                  <Alert variant="info" className="small">
                    Create the course first to manage its modules.
                  </Alert>
                )}
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Course Changes</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default CourseManagement;