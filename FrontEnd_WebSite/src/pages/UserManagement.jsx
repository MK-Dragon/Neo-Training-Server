// /src/pages/UserManagement.jsx

import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form } from 'react-bootstrap';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
    try {
        const res = await fetch('https://localhost:7089/api/Api/users', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        // 1. Check if the response is actually okay (200-299)
        if (!res.ok) {
            const errorText = await res.text(); // Get raw text to see the error
            console.error(`Error ${res.status}: ${errorText}`);
            return;
        }

        // 2. Only parse if there is content
        const data = await res.json();
        setUsers(data);
    } catch (err) {
        console.error("Fetch failed:", err);
    }
};

    const handleEditClick = (user) => {
        setSelectedUser({ ...user }); // Clone user to avoid direct state mutation
        setShowModal(true);
    };

    const handleSaveChanges = async () => {
        const res = await fetch(`https://localhost:7089/api/Api/users/${selectedUser.id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(selectedUser)
        });

        if (res.ok) {
            setShowModal(false);
            fetchUsers(); // Refresh the list
        }
    };

    return (
        <div className="container mt-5">
            <h3>User Management</h3>
            <Table striped bordered hover>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u.id}>
                            <td>{u.id}</td>
                            <td>{u.username}</td>
                            <td>{u.email}</td>
                            <td>{u.roleId}</td>
                            <td>
                                <Button variant="warning" onClick={() => handleEditClick(u)}>Edit</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton><Modal.Title>Edit User</Modal.Title></Modal.Header>
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
                                    value={selectedUser.email} 
                                    onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})} 
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