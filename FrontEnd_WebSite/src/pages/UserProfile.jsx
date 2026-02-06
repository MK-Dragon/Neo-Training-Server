// /src/pages/UserProfile.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Button, Modal, Form, Card, Spinner } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const UserProfile = () => {
    const [user, setUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    
    // UI & Upload states
    const [uploading, setUploading] = useState(false);
    const [imgTimestamp, setImgTimestamp] = useState(Date.now());
    const fileInputRef = useRef(null);

    // Password states
    const [passwords, setPasswords] = useState({ old: '', new1: '', new2: '' });
    const [msg, setMsg] = useState({ text: '', isError: false });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const storedUsername = localStorage.getItem('username'); 
        try {
            const res = await fetch(`${ServerIP}/api/User/users/${storedUsername}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            }
        } catch (err) {
            console.error("Failed to fetch profile:", err);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !user) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const res = await fetch(`${ServerIP}/api/DownloadUpload/upload-profile-image/${user.id}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (res.ok) {
                // Update timestamp to force browser to reload the image URL
                setImgTimestamp(Date.now());
            } else {
                alert("Failed to upload image.");
            }
        } catch (err) {
            console.error("Upload error:", err);
        } finally {
            setUploading(false);
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
            setPasswords({ old: '', new1: '', new2: '' });
            setTimeout(() => {
                setShowModal(false);
                setMsg({ text: '', isError: false });
            }, 2000);
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
                    {/* PROFILE IMAGE WITH CLICK-TO-UPLOAD */}
                    <div 
                        className="position-relative"
                        style={{ cursor: 'pointer' }}
                        onClick={() => fileInputRef.current.click()}
                    >
                        <div style={{ 
                            width: '150px', 
                            height: '150px', 
                            borderRadius: '50%', 
                            overflow: 'hidden', 
                            border: '4px solid #0d6efd',
                            backgroundColor: '#f8f9fa'
                        }}>
                            <img 
                                src={`${ServerIP}/api/DownloadUpload/profile-image/${user.id}?t=${imgTimestamp}`} 
                                alt="Profile" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                    e.target.onerror = null; 
                                    e.target.src = `https://ui-avatars.com/api/?name=${user.username}&background=random&size=150`;
                                }}
                            />
                        </div>
                        
                        {/* Overlay Spinner or Edit Icon */}
                        <div className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '35px', height: '35px', border: '2px solid white' }}>
                            {uploading ? <Spinner animation="border" size="sm" /> : <span>📷</span>}
                        </div>
                        
                        {/* Hidden File Input */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                        />
                    </div>
                </Col>
                <Col>
                    <h1 className="display-4 mb-0">@{user.username}</h1>
                    <p className="text-muted fs-5">Personal Profile</p>
                </Col>
            </Row>

            <Card className="shadow-sm p-4" style={{ borderRadius: '25px', border: '2px solid #000' }}>
                <Card.Body>
                    <Row className="fs-4">
                        <Col md={6}>
                            <p><strong>Age:</strong> {calculateAge(user.birthDate)}</p>
                            <p><strong>E-mail:</strong> {user.email}</p>
                        </Col>
                        <Col md={6}>
                            <p><strong>Role:</strong> <span className="badge bg-info text-dark text-capitalize">{user.role}</span></p>
                            <p><strong>Status:</strong> {user.activated ? <span className="text-success">Active</span> : <span className="text-danger">Pending</span>}</p>
                        </Col>
                    </Row>
                    <div className="mt-4 border-top pt-3">
                        <Button variant="outline-primary" className="px-4 py-2" onClick={() => setShowModal(true)}>
                            🔒 Change Password
                        </Button>
                    </div>
                </Card.Body>
            </Card>

            {/* Change Password Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Security Update</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {msg.text && <div className={`alert ${msg.isError ? 'alert-danger' : 'alert-success'}`}>{msg.text}</div>}
                    <Form onSubmit={handlePasswordChange}>
                        <Form.Group className="mb-3">
                            <Form.Label>Current Password</Form.Label>
                            <Form.Control 
                                type="password" 
                                required 
                                value={passwords.old}
                                onChange={e => setPasswords({...passwords, old: e.target.value})} 
                            />
                        </Form.Group>
                        <hr />
                        <Form.Group className="mb-3">
                            <Form.Label>New Password</Form.Label>
                            <Form.Control 
                                type="password" 
                                required 
                                value={passwords.new1}
                                onChange={e => setPasswords({...passwords, new1: e.target.value})} 
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Confirm New Password</Form.Label>
                            <Form.Control 
                                type="password" 
                                required 
                                value={passwords.new2}
                                onChange={e => setPasswords({...passwords, new2: e.target.value})} 
                            />
                        </Form.Group>
                        <Button variant="primary" type="submit" className="w-100 py-2">Update Password</Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default UserProfile;