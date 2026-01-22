// /src/pages/UserManagement.jsx

import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, InputGroup, Row, Col, Badge, Alert } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const UserManagement = () => {
    // --- Data States ---
    const [users, setUsers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // --- Search, Sort, and Filter States ---
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
    const [filterRole, setFilterRole] = useState('all');
    const [showDeleted, setShowDeleted] = useState(true);

    // --- Password & UI States ---
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (!showModal) {
            setNewPass('');
            setConfirmPass('');
            setErrorMsg('');
        }
    }, [showModal]);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${ServerIP}/api/User/users`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error("Fetch failed:", err);
        }
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const processedUsers = users
        .filter(u => {
            const matchesRole = filterRole === 'all' || u.role === filterRole;
            const matchesSearch = 
                u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDeleted = showDeleted ? true : u.isDeleted === 0;
            return matchesRole && matchesSearch && matchesDeleted;
        })
        .sort((a, b) => {
            const valA = a[sortConfig.key] || '';
            const valB = b[sortConfig.key] || '';
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    const handleEditClick = (user) => {
        setSelectedUser({ ...user }); 
        setShowModal(true);
    };

    const handleSaveChanges = async () => {
        if (newPass !== "" && newPass !== confirmPass) {
            setErrorMsg("Passwords do not match!");
            return;
        }

        const dataToSend = {
            ...selectedUser,
            newPasswordHash: newPass 
        };

        try {
            const res = await fetch(`${ServerIP}/api/User/users/${selectedUser.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(dataToSend)
            });

            if (res.ok) {
                setShowModal(false);
                fetchUsers();
            } else {
                const text = await res.text();
                setErrorMsg(text || "Failed to save changes.");
            }
        } catch (err) {
            setErrorMsg("Server error.");
        }
    };

    return (
        <div className="container mt-5 pt-4">
            <h3 className="mb-4">User Management</h3>

            {/* Filter Bar */}
            <Row className="mb-4 g-3 align-items-center">
                <Col md={5}>
                    <InputGroup>
                        <InputGroup.Text>🔍</InputGroup.Text>
                        <Form.Control
                            placeholder="Search by username or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </InputGroup>
                </Col>
                <Col md={3}>
                    <Form.Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                        <option value="all">All Roles</option>
                        <option value="Admin">Admin</option>
                        <option value="Teacher">Teacher</option>
                        <option value="Student">Student</option>
                    </Form.Select>
                </Col>
                <Col md={4}>
                    <Form.Check 
                        type="checkbox"
                        id="show-deleted-check"
                        label="Include Deleted Users"
                        checked={showDeleted}
                        onChange={(e) => setShowDeleted(e.target.checked)}
                    />
                </Col>
            </Row>

            <Table striped bordered hover responsive>
                <thead className="table-dark text-nowrap">
                    <tr>
                        <th onClick={() => requestSort('id')} style={{ cursor: 'pointer' }}>ID ▲▼</th>
                        <th onClick={() => requestSort('username')} style={{ cursor: 'pointer' }}>Username ▲▼</th>
                        <th onClick={() => requestSort('email')} style={{ cursor: 'pointer' }}>Email ▲▼</th>
                        <th>Role</th>
                        <th className="text-center">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {processedUsers.map(u => (
                        <tr key={u.id} className={u.isDeleted === 1 ? "table-secondary opacity-75" : ""}>
                            <td>{u.id}</td>
                            <td style={u.isDeleted === 1 ? { textDecoration: 'line-through' } : {}}>
                                {u.username} {u.isDeleted === 1 && <Badge bg="danger" className="ms-2">DELETED</Badge>}
                            </td>
                            <td>{u.email}</td>
                            <td>
                                <Badge bg={u.role === 'Admin' ? 'danger' : u.role === 'Teacher' ? 'primary' : 'secondary'}>
                                    {u.role}
                                </Badge>
                            </td>
                            <td className="text-center">
                                <Button 
                                    variant={u.isDeleted === 1 ? "outline-dark" : "warning"} 
                                    size="sm" 
                                    onClick={() => handleEditClick(u)}
                                    className="px-3"
                                >
                                    {u.isDeleted === 1 ? "Restore" : "Edit"}
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Manage User: {selectedUser?.username}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedUser && (
                        <Form>
                            <Row>
                                <Col md={6}><Form.Group className="mb-3"><Form.Label>Username</Form.Label><Form.Control value={selectedUser.username} onChange={(e) => setSelectedUser({...selectedUser, username: e.target.value})} /></Form.Group></Col>
                                <Col md={6}><Form.Group className="mb-3"><Form.Label>Email</Form.Label><Form.Control type="email" value={selectedUser.email} onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})} /></Form.Group></Col>
                            </Row>

                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Role</Form.Label>
                                        <Form.Select value={selectedUser.role} onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})}>
                                            <option value="Admin">Admin</option>
                                            <option value="Teacher">Teacher</option>
                                            <option value="Student">Student</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={3}>
                                    <Form.Label>Status</Form.Label>
                                    <Form.Check type="switch" label="Activated" checked={selectedUser.activated === 1} onChange={(e) => setSelectedUser({...selectedUser, activated: e.target.checked ? 1 : 0})} />
                                </Col>
                                <Col md={3}>
                                    <Form.Label>Visibility</Form.Label>
                                    <Form.Check 
                                        type="switch" 
                                        id="modal-delete-switch" 
                                        label={selectedUser.isDeleted === 1 ? "Deleted" : "Active"} 
                                        className={selectedUser.isDeleted === 1 ? "text-danger fw-bold" : "text-success"}
                                        checked={selectedUser.isDeleted === 1} 
                                        onChange={(e) => setSelectedUser({...selectedUser, isDeleted: e.target.checked ? 1 : 0})} 
                                    />
                                </Col>
                            </Row>

                            <hr />
                            <h5 className="text-primary">Administrative Password Override</h5>
                            {errorMsg && <Alert variant="danger" className="py-2">{errorMsg}</Alert>}
                            <Row>
                                <Col md={6}><Form.Group className="mb-2"><Form.Label>New Password</Form.Label><Form.Control type="password" placeholder="Leave empty to keep current" value={newPass} onChange={(e) => setNewPass(e.target.value)} /></Form.Group></Col>
                                <Col md={6}><Form.Group className="mb-3"><Form.Label>Confirm Password</Form.Label><Form.Control type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} /></Form.Group></Col>
                            </Row>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer className="bg-light">
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                    <Button variant="primary" onClick={handleSaveChanges}>Apply Changes</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default UserManagement;