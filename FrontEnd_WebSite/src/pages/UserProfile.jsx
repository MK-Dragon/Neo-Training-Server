// /src/pages/UserProfile.jsx


import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Modal, Form, Card } from 'react-bootstrap';
import profilePic from '../images/profile/user.jpg'; // Path to your local image

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const UserProfile = () => {
    const [user, setUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    
    // Password states
    const [passwords, setPasswords] = useState({ old: '', new1: '', new2: '' });
    const [msg, setMsg] = useState({ text: '', isError: false });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        // Get the username from the token or localStorage
        const storedUsername = localStorage.getItem('username'); 
        
        const res = await fetch(`${ServerIP}/api/User/users/${storedUsername}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (res.ok) {
            const data = await res.json();
            setUser(data); // This is now your AppUser object
        }
    };

    const calculateAge = (birthDate) => {
        if (!birthDate) return 'N/A';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.new1 !== passwords.new2) {
            setMsg({ text: "New passwords don't match!", isError: true });
            return;
        }

        const res = await fetch(`${ServerIP}/api/User/change-password`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                OldPasswordHash: passwords.old,
                NewPasswordHash: passwords.new1
            })
        });

        if (res.ok) {
            setMsg({ text: "Password updated successfully!", isError: false });
            setTimeout(() => setShowModal(false), 2000);
        } else {
            const err = await res.text();
            setMsg({ text: err || "Failed to update password.", isError: true });
        }
    };

    if (!user) return <div className="text-center mt-5">Loading profile...</div>;

    return (
        <Container className="mt-5 pt-5">
            <Row className="align-items-center mb-4">
                <Col xs="auto">
                    <div style={{ width: '150px', height: '150px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #0d6efd' }}>
                        <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                </Col>
                <Col>
                    <h1 className="display-4">[{user.username}]</h1>
                </Col>
            </Row>

            <Card className="shadow-sm p-4" style={{ borderRadius: '25px', border: '2px solid #000' }}>
                <div className="fs-4">
                    <p><strong>Age:</strong> {calculateAge(user.birthDate)}</p>
                    <p><strong>E-mail:</strong> {user.email}</p>
                    <p><strong>Role:</strong> <span className="text-capitalize">{user.role}</span></p>
                </div>
                <div className="mt-3">
                    <Button variant="outline-primary" onClick={() => setShowModal(true)}>
                        Change Password
                    </Button>
                </div>
            </Card>

            {/* Change Password Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton><Modal.Title>Security Update</Modal.Title></Modal.Header>
                <Modal.Body>
                    {msg.text && <div className={`alert ${msg.isError ? 'alert-danger' : 'alert-success'}`}>{msg.text}</div>}
                    <Form onSubmit={handlePasswordChange}>
                        <Form.Group className="mb-3">
                            <Form.Label>Current Password</Form.Label>
                            <Form.Control type="password" required onChange={e => setPasswords({...passwords, old: e.target.value})} />
                        </Form.Group>
                        <hr />
                        <Form.Group className="mb-3">
                            <Form.Label>New Password</Form.Label>
                            <Form.Control type="password" required onChange={e => setPasswords({...passwords, new1: e.target.value})} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Confirm New Password</Form.Label>
                            <Form.Control type="password" required onChange={e => setPasswords({...passwords, new2: e.target.value})} />
                        </Form.Group>
                        <Button variant="primary" type="submit" className="w-100">Update Password</Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default UserProfile;