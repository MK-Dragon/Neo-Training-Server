// /src/pages/UserManagement.jsx
import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, InputGroup, Row, Col, Badge, Alert, Pagination, Card, Spinner } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const UserManagement = () => {
    // --- Data States ---
    const [users, setUsers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // --- Search, Sort, Filter & Pagination States ---
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
    const [filterRole, setFilterRole] = useState('all');
    const [showDeleted, setShowDeleted] = useState(true);
    
    // Pagination specific states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // --- Password, Image & UI States ---
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [uploading, setUploading] = useState(false);
    const [imgTimestamp, setImgTimestamp] = useState(Date.now()); 

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterRole, showDeleted, itemsPerPage]);

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

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedUser) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            const res = await fetch(`${ServerIP}/api/DownloadUpload/upload-profile-image/${selectedUser.id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });

            if (res.ok) {
                setImgTimestamp(Date.now());
            } else {
                setErrorMsg("Failed to upload image.");
            }
        } catch (err) {
            setErrorMsg("Network error during upload.");
        } finally {
            setUploading(false);
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

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentUsers = processedUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(processedUsers.length / itemsPerPage);

    const handleEditClick = (user) => {
        setSelectedUser({ ...user }); 
        setImgTimestamp(Date.now()); 
        setShowModal(true);
    };

    const handleSaveChanges = async () => {
        if (newPass !== "" && newPass !== confirmPass) {
            setErrorMsg("Passwords do not match!");
            return;
        }
        const dataToSend = { ...selectedUser, newPasswordHash: newPass };
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
        } catch (err) { setErrorMsg("Server error."); }
    };

    return (
        <div className="container mt-5 pt-4">
            <h3 className="mb-4">User Management</h3>

            <Card className="mb-4 shadow-sm border-0 bg-light">
                <Card.Body>
                    <Row className="g-3 align-items-end">
                        <Col md={4}>
                            <Form.Label className="fw-bold">Search</Form.Label>
                            <InputGroup>
                                <InputGroup.Text>🔍</InputGroup.Text>
                                <Form.Control placeholder="Username or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </InputGroup>
                        </Col>
                        <Col md={2}>
                            <Form.Label className="fw-bold">Role</Form.Label>
                            <Form.Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                                <option value="all">All Roles</option>
                                <option value="Admin">Admin</option>
                                <option value="Teacher">Teacher</option>
                                <option value="Student">Student</option>
                            </Form.Select>
                        </Col>
                        <Col md={2}>
                            <Form.Label className="fw-bold">Per Page</Form.Label>
                            <Form.Select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                            </Form.Select>
                        </Col>
                        <Col md={4} className="d-flex align-items-center justify-content-end">
                            <Form.Check type="switch" id="show-deleted-check" label="Include Deleted" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Table striped bordered hover responsive className="align-middle">
                <thead className="table-dark text-nowrap">
                    <tr>
                        <th>Avatar</th>
                        <th onClick={() => requestSort('id')} style={{ cursor: 'pointer' }}>ID {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</th>
                        <th onClick={() => requestSort('username')} style={{ cursor: 'pointer' }}>Username {sortConfig.key === 'username' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</th>
                        <th onClick={() => requestSort('email')} style={{ cursor: 'pointer' }}>Email {sortConfig.key === 'email' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕️'}</th>
                        <th>Role</th>
                        <th className="text-center">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {currentUsers.map(u => (
                        <tr key={u.id} className={u.isDeleted === 1 ? "table-secondary opacity-75" : ""}>
                            <td className="text-center" style={{ width: '80px' }}>
                                <img 
                                    src={`${ServerIP}/api/DownloadUpload/profile-image/${u.id}?t=${imgTimestamp}`} 
                                    alt="User" 
                                    className="rounded-circle border"
                                    style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                    onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${u.username}&background=random&size=64`; }}
                                />
                            </td>
                            <td>{u.id}</td>
                            <td style={u.isDeleted === 1 ? { textDecoration: 'line-through' } : {}}>
                                {u.username} {u.isDeleted === 1 && <Badge bg="danger" className="ms-2">DELETED</Badge>}
                            </td>
                            <td>{u.email}</td>
                            <td>
                                <Badge bg={u.role === 'Admin' ? 'danger' : u.role === 'Teacher' ? 'primary' : 'secondary'}>{u.role}</Badge>
                            </td>
                            <td className="text-center">
                                <Button variant={u.isDeleted === 1 ? "outline-dark" : "warning"} size="sm" onClick={() => handleEditClick(u)} className="px-3">
                                    {u.isDeleted === 1 ? "Restore" : "Edit"}
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-3">
                    <Pagination>
                        <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                        <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} />
                        {[...Array(totalPages)].map((_, idx) => (
                            <Pagination.Item key={idx + 1} active={idx + 1 === currentPage} onClick={() => setCurrentPage(idx + 1)}>{idx + 1}</Pagination.Item>
                        ))}
                        <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} />
                        <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
                    </Pagination>
                </div>
            )}

            <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
                <Modal.Header closeButton><Modal.Title>Manage User: {selectedUser?.username}</Modal.Title></Modal.Header>
                <Modal.Body>
                    {selectedUser && (
                        <Form>
                            <div className="text-center mb-4 p-3 border-bottom bg-light rounded-top">
                                <div className="position-relative d-inline-block">
                                    <img 
                                        src={`${ServerIP}/api/DownloadUpload/profile-image/${selectedUser.id}?t=${imgTimestamp}`}
                                        alt="Profile"
                                        className="rounded-circle shadow-sm border border-3 border-white"
                                        style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                                        onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${selectedUser.username}&background=random&size=128`; }}
                                    />
                                    {uploading && <div className="position-absolute top-50 start-50 translate-middle"><Spinner animation="border" variant="primary" size="sm" /></div>}
                                </div>
                                <div className="mt-3">
                                    <Form.Group controlId="formFileSm">
                                        <Form.Label className="small fw-bold text-secondary">Change Profile Photo</Form.Label>
                                        <Form.Control type="file" size="sm" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                                    </Form.Group>
                                </div>
                            </div>
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
                                <Col md={3}><Form.Label>Status</Form.Label><Form.Check type="switch" label="Activated" checked={selectedUser.activated === 1} onChange={(e) => setSelectedUser({...selectedUser, activated: e.target.checked ? 1 : 0})} /></Col>
                                <Col md={3}><Form.Label>Visibility</Form.Label><Form.Check type="switch" id="modal-delete-switch" label={selectedUser.isDeleted === 1 ? "Deleted" : "Active"} className={selectedUser.isDeleted === 1 ? "text-danger fw-bold" : "text-success"} checked={selectedUser.isDeleted === 1} onChange={(e) => setSelectedUser({...selectedUser, isDeleted: e.target.checked ? 1 : 0})} /></Col>
                            </Row>
                            <hr /><h5 className="text-primary">Administrative Password Override</h5>
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
                    <Button variant="primary" onClick={handleSaveChanges} disabled={uploading}>Apply Changes</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default UserManagement;