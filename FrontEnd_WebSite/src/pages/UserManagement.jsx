// /src/pages/UserManagement.jsx

import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, InputGroup, Row, Col } from 'react-bootstrap';

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

    // --- Password States (Put inside the component here) ---
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [passError, setPassError] = useState('');

    // --- Effects ---
    useEffect(() => {
        fetchUsers();
    }, []);

    // Reset passwords when modal opens/closes
    useEffect(() => {
        if (!showModal) {
            setNewPass('');
            setConfirmPass('');
            setPassError('');
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

    // --- Logic: Sorting ---
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // --- Logic: Data Processing ---
    const processedUsers = users
        .filter(u => {
            const matchesRole = filterRole === 'all' || u.role === filterRole;
            const matchesSearch = 
                u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.email.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesRole && matchesSearch;
        })
        .sort((a, b) => {
            const valA = a[sortConfig.key] || '';
            const valB = b[sortConfig.key] || '';
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    // --- Logic: Actions ---
    const handleEditClick = (user) => {
        setSelectedUser({ ...user }); 
        setShowModal(true);
    };

    const handleSaveChanges = async () => {
        // Validation: If they typed anything in new password, they must match
        if (newPass !== "" && newPass !== confirmPass) {
            setPassError("Passwords do not match!");
            return;
        }

        const dataToSend = {
            ...selectedUser,
            newPasswordHash: newPass // Send plain text, C# will hash it
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
                const errorMsg = await res.text();
                setPassError(errorMsg || "Failed to save changes.");
            }
        } catch (err) {
            setPassError("Server error.");
        }
    };

    return (
        <div className="container mt-5">
            <h3 className="mb-4">User Management</h3>

            {/* Controls: Search and Filter */}
            <Row className="mb-4 g-3">
                <Col md={6}>
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
            </Row>

            {/* User Table */}
            <Table striped bordered hover responsive>
                <thead className="table-dark text-nowrap">
                    <tr>
                        <th onClick={() => requestSort('id')} style={{ cursor: 'pointer' }}>
                            ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
                        </th>
                        <th onClick={() => requestSort('username')} style={{ cursor: 'pointer' }}>
                            Username {sortConfig.key === 'username' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
                        </th>
                        <th onClick={() => requestSort('email')} style={{ cursor: 'pointer' }}>
                            Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
                        </th>
                        <th onClick={() => requestSort('role')} style={{ cursor: 'pointer' }}>
                            Role {sortConfig.key === 'role' && (sortConfig.direction === 'asc' ? '🔼' : '🔽')}
                        </th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {processedUsers.map(u => (
                        <tr key={u.id}>
                            <td>{u.id}</td>
                            <td>{u.username}</td>
                            <td>{u.email}</td>
                            <td>
                                <span className={`badge ${u.role === 'Admin' ? 'bg-danger' : u.role === 'Teacher' ? 'bg-primary' : 'bg-secondary'}`}>
                                    {u.role}
                                </span>
                            </td>
                            <td>
                                <Button variant="warning" size="sm" onClick={() => handleEditClick(u)}>Edit</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit User: {selectedUser?.username}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedUser && (
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Username</Form.Label>
                                <Form.Control 
                                    value={selectedUser.username} 
                                    onChange={(e) => setSelectedUser({...selectedUser, username: e.target.value})} 
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control 
                                    type="email"
                                    value={selectedUser.email} 
                                    onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})} 
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Role</Form.Label>
                                <Form.Select 
                                    value={selectedUser.role} 
                                    onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})}
                                >
                                    <option value="Admin">Admin</option>
                                    <option value="Teacher">Teacher</option>
                                    <option value="Student">Student</option>
                                </Form.Select>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Check 
                                    type="switch"
                                    label="Account Activated"
                                    checked={selectedUser.activated === 1}
                                    onChange={(e) => setSelectedUser({...selectedUser, activated: e.target.checked ? 1 : 0})}
                                />
                            </Form.Group>

                            <hr />
                            <h5>Force Password Reset (Admin)</h5>
                            {passError && <div className="text-danger small mb-2">{passError}</div>}
                            
                            <Form.Group className="mb-2">
                                <Form.Label>New Password</Form.Label>
                                <Form.Control 
                                    type="password" 
                                    value={newPass}
                                    onChange={(e) => setNewPass(e.target.value)}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Confirm Password</Form.Label>
                                <Form.Control 
                                    type="password" 
                                    value={confirmPass}
                                    onChange={(e) => setConfirmPass(e.target.value)}
                                />
                            </Form.Group>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSaveChanges}>Save Changes</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default UserManagement;