import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Form, Button, Modal, ListGroup, Pagination, Alert } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const TeacherModuleManager = () => {
    // Data States
    const [teachers, setTeachers] = useState([]);
    const [modules, setModules] = useState([]);
    const [selectedTeacherModules, setSelectedTeacherModules] = useState([]);
    
    // UI States
    const [showTeacherModal, setShowTeacherModal] = useState(false);
    const [showModuleModal, setShowModuleModal] = useState(false);
    const [activeItem, setActiveItem] = useState(null); 
    const [error, setError] = useState('');

    // Pagination/Search States
    const [teacherSearch, setTeacherSearch] = useState('');
    const [moduleSearch, setModuleSearch] = useState('');
    const [tPage, setTPage] = useState(1);
    const [mPage, setMPage] = useState(1);
    const itemsPerPage = 6;

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            // 1. Fetch Teachers using your new endpoint
            const tRes = await fetch(`${ServerIP}/api/Teacher/teachers-list`);
            const mRes = await fetch(`${ServerIP}/api/Module/allmodules`);

            if (tRes.ok && mRes.ok) {
                const tData = await tRes.json();
                const mData = await mRes.json();
                
                setTeachers(tData); // UserSimple uses userId and username
                setModules(mData.filter(m => m.isDeleted === 0));
            }
        } catch (err) { setError("Failed to load data from server."); }
    };

    // Open Teacher Detail Modal
    const handleTeacherClick = async (teacher) => {
        setActiveItem(teacher);
        try {
            // Note: C# UserSimple has userId, React receives it as userId
            const res = await fetch(`${ServerIP}/api/Teacher/teacher/${teacher.userId}/modules`);
            if (res.ok) {
                const data = await res.json();
                setSelectedTeacherModules(data);
                setShowTeacherModal(true);
            }
        } catch (err) { setError("Error loading teacher modules."); }
    };

    const assignAction = async (tId, mId) => {
        try {
            const res = await fetch(`${ServerIP}/api/Teacher/assign-module`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formadorId: tId, moduleId: mId })
            });
            if (res.ok) {
                // Refresh local state based on which modal is open
                if (showTeacherModal) handleTeacherClick(activeItem);
                if (showModuleModal) setShowModuleModal(false);
            }
        } catch (err) { console.error(err); }
    };

    const removeAction = async (tId, mId) => {
        if (!window.confirm("Remove this module from teacher?")) return;
        try {
            const res = await fetch(`${ServerIP}/api/Teacher/remove-module`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formadorId: tId, moduleId: mId })
            });
            if (res.ok) handleTeacherClick(activeItem);
        } catch (err) { console.error(err); }
    };

    // Logic for list filtering
    const filteredTeachers = teachers.filter(t => t.username.toLowerCase().includes(teacherSearch.toLowerCase()));
    const filteredModules = modules.filter(m => m.name.toLowerCase().includes(moduleSearch.toLowerCase()));

    return (
        <Container className="mt-5 pt-4">
            <h2 className="mb-4">Staff Curriculum Management</h2>
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            
            <Row>
                {/* TEACHERS LIST */}
                <Col md={6}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-primary text-white fw-bold">Teachers List</Card.Header>
                        <Card.Body>
                            <Form.Control 
                                type="text" placeholder="🔍 Search teacher..." className="mb-3"
                                onChange={(e) => {setTeacherSearch(e.target.value); setTPage(1);}}
                            />
                            <Table hover borderless size="sm">
                                <thead className="table-light"><tr><th>Username</th><th>ID</th></tr></thead>
                                <tbody>
                                    {filteredTeachers.slice((tPage-1)*itemsPerPage, tPage*itemsPerPage).map(t => (
                                        <tr key={t.userId} onClick={() => handleTeacherClick(t)} style={{cursor:'pointer'}}>
                                            <td className="text-primary fw-bold">{t.username}</td>
                                            <td className="text-muted small">#{t.userId}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            <Pagination size="sm">
                                {[...Array(Math.ceil(filteredTeachers.length / itemsPerPage))].map((_, i) => (
                                    <Pagination.Item key={i} active={i + 1 === tPage} onClick={() => setTPage(i+1)}>{i+1}</Pagination.Item>
                                ))}
                            </Pagination>
                        </Card.Body>
                    </Card>
                </Col>

                {/* MODULES LIST */}
                <Col md={6}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-dark text-white fw-bold">Active Modules</Card.Header>
                        <Card.Body>
                            <Form.Control 
                                type="text" placeholder="🔍 Search module..." className="mb-3"
                                onChange={(e) => {setModuleSearch(e.target.value); setMPage(1);}}
                            />
                            <Table hover borderless size="sm">
                                <thead className="table-light"><tr><th>Module Name</th><th>Hours</th></tr></thead>
                                <tbody>
                                    {filteredModules.slice((mPage-1)*itemsPerPage, mPage*itemsPerPage).map(m => (
                                        <tr key={m.id} onClick={() => {setActiveItem(m); setShowModuleModal(true);}} style={{cursor:'pointer'}}>
                                            <td className="text-success fw-bold">{m.name}</td>
                                            <td>{m.durationInHours}h</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            <Pagination size="sm">
                                {[...Array(Math.ceil(filteredModules.length / itemsPerPage))].map((_, i) => (
                                    <Pagination.Item key={i} active={i + 1 === mPage} onClick={() => setMPage(i+1)}>{i+1}</Pagination.Item>
                                ))}
                            </Pagination>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* MODAL 1: TEACHER DETAILS (Assign/Remove Modules) */}
            <Modal show={showTeacherModal} onHide={() => setShowTeacherModal(false)} size="lg" centered>
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>Manage Expertise: {activeItem?.username}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row>
                        <Col md={6}>
                            <h6 className="fw-bold border-bottom pb-2">Assigned Modules</h6>
                            <ListGroup variant="flush">
                                {selectedTeacherModules.map(m => (
                                    <ListGroup.Item key={m.id} className="d-flex justify-content-between align-items-center px-0">
                                        <span>{m.name} <small className="text-muted">({m.durationInHours}h)</small></span>
                                        <Button variant="danger" size="sm" onClick={() => removeAction(activeItem.userId, m.id)}>Remove</Button>
                                    </ListGroup.Item>
                                ))}
                                {selectedTeacherModules.length === 0 && <p className="text-muted small mt-2">No modules assigned yet.</p>}
                            </ListGroup>
                        </Col>
                        <Col md={6} className="border-start">
                            <h6 className="fw-bold border-bottom pb-2">Available to Add</h6>
                            <div style={{maxHeight:'300px', overflowY:'auto'}}>
                                {modules.filter(m => !selectedTeacherModules.some(sm => sm.id === m.id)).map(m => (
                                    <Button 
                                        key={m.id} variant="outline-primary" size="sm" className="m-1"
                                        onClick={() => assignAction(activeItem.userId, m.id)}
                                    >
                                        + {m.name}
                                    </Button>
                                ))}
                            </div>
                        </Col>
                    </Row>
                </Modal.Body>
            </Modal>

            {/* MODAL 2: MODULE DETAILS (Assign to Teachers) */}
            <Modal show={showModuleModal} onHide={() => setShowModuleModal(false)} centered>
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title>{activeItem?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p><strong>Duration:</strong> {activeItem?.durationInHours} Hours</p>
                    <hr />
                    <h6 className="fw-bold mb-3">Quick Assign to Teacher:</h6>
                    <ListGroup style={{maxHeight:'300px', overflowY:'auto'}}>
                        {teachers.map(t => (
                            <ListGroup.Item key={t.userId} className="d-flex justify-content-between align-items-center">
                                {t.username}
                                <Button variant="success" size="sm" onClick={() => assignAction(t.userId, activeItem.id)}>Assign</Button>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default TeacherModuleManager;