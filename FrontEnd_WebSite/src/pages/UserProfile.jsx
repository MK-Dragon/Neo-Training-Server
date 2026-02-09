// /src/pages/UserProfile.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Button, Modal, Form, Card, Spinner, Badge, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const UserProfile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [extraInfo, setExtraInfo] = useState(null);
    const [teacherCourses, setTeacherCourses] = useState([]);
    const [teacherModules, setTeacherModules] = useState([]);
    const [studentEnrollments, setStudentEnrollments] = useState([]);
    const [showModal, setShowModal] = useState(false);
    
    const [uploading, setUploading] = useState(false);
    const [imgTimestamp, setImgTimestamp] = useState(Date.now());
    const fileInputRef = useRef(null);
    const pdfRef = useRef(null);

    const [passwords, setPasswords] = useState({ old: '', new1: '', new2: '' });
    const [msg, setMsg] = useState({ text: '', isError: false });

    useEffect(() => { fetchProfile(); }, []);
    
    useEffect(() => { 
        if (user) { 
            fetchRoleSpecificProfile(); 
            if (user.role.toLowerCase() === 'teacher') {
                fetchTeacherHistory();
            } else if (user.role.toLowerCase() === 'student') {
                fetchStudentHistory();
            }
        } 
    }, [user]);

    const fetchProfile = async () => {
        const storedUsername = localStorage.getItem('username'); 
        try {
            const res = await fetch(`${ServerIP}/api/User/users/${storedUsername}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) { setUser(await res.json()); }
        } catch (err) { console.error("Failed to fetch profile:", err); }
    };

    const fetchRoleSpecificProfile = async () => {
        const endpoint = user.role.toLowerCase() === 'teacher' ? `teacher-profile` : `student-profile`;
        try {
            const res = await fetch(`${ServerIP}/api/User/${endpoint}/${user.id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) { setExtraInfo(await res.json()); }
        } catch (err) { console.error("Failed to fetch specific profile info:", err); }
    };

    const fetchStudentHistory = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${ServerIP}/api/Student/student/${user.id}/enrolled-turmas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const turmas = await res.json();
                const detailedTurmas = await Promise.all(turmas.map(async (t) => {
                    const turmaId = t.turmaId || t.TurmaId;
                    const gradeRes = await fetch(`${ServerIP}/api/StudentGrades/student-report?studentId=${user.id}&turmaId=${turmaId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    let avg = 0;
                    let status = "Not Graded";

                    if (gradeRes.ok) {
                        const grades = await gradeRes.json();
                        if (grades && grades.length > 0) {
                            const hasNullGrade = grades.some(g => g.grade === null);
                            const validGrades = grades.filter(g => g.grade !== null);
                            const sum = validGrades.reduce((acc, curr) => acc + curr.grade, 0);
                            avg = validGrades.length > 0 ? (sum / validGrades.length) : 0;

                            if (hasNullGrade) {
                                status = "In Progress";
                            } else {
                                status = avg >= 9.5 ? "Passed" : "Failed";
                            }
                        }
                    }
                    return { ...t, average: avg.toFixed(2), status };
                }));
                setStudentEnrollments(detailedTurmas);
            }
        } catch (err) { console.error("Error fetching student history:", err); }
    };

    const fetchTeacherHistory = async () => {
        const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
        try {
            const [coursesRes, modulesRes] = await Promise.all([
                fetch(`${ServerIP}/api/Statistics/courses-history/${user.id}`, { headers }),
                fetch(`${ServerIP}/api/Statistics/modules-history/${user.id}`, { headers })
            ]);
            if (coursesRes.ok) setTeacherCourses(await coursesRes.json());
            if (modulesRes.ok) setTeacherModules(await modulesRes.json());
        } catch (err) { console.error("Error fetching teacher history:", err); }
    };

    const downloadPDF = () => {
        const input = pdfRef.current;
        html2canvas(input, { useCORS: true, logging: false }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
            pdf.save(`Profile_${user.username}.pdf`);
        });
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
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });
            if (res.ok) { setImgTimestamp(Date.now()); }
        } catch (err) { console.error("Upload error:", err); } finally { setUploading(false); }
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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ OldPasswordHash: passwords.old, NewPasswordHash: passwords.new1 })
        });
        if (res.ok) {
            setMsg({ text: "Password updated successfully!", isError: false });
            setPasswords({ old: '', new1: '', new2: '' });
            setTimeout(() => { setShowModal(false); setMsg({ text: '', isError: false }); }, 2000);
        } else {
            const err = await res.text();
            setMsg({ text: err || "Failed to update password.", isError: true });
        }
    };

    if (!user) return <div className="text-center mt-5"><Spinner animation="border" /> Loading...</div>;

    return (
        <Container className="mt-5 pt-5 pb-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <p className="text-muted mb-0">Review and export your official profile data.</p>
                <Button variant="danger" onClick={downloadPDF}>
                    <i className="bi bi-file-earmark-pdf me-2"></i>Export as PDF
                </Button>
            </div>

            <div ref={pdfRef} className="p-3 bg-white">
                <Row className="align-items-center mb-4">
                    <Col xs="auto">
                        <div className="position-relative" style={{ cursor: 'pointer' }} onClick={() => fileInputRef.current.click()}>
                            <div style={{ width: '150px', height: '150px', borderRadius: '50%', overflow: 'hidden', border: '4px solid #0d6efd' }}>
                                <img 
                                    crossOrigin="anonymous"
                                    src={`${ServerIP}/api/DownloadUpload/profile-image/${user.id}?t=${imgTimestamp}`} 
                                    alt="Profile" 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${user.username}&background=random&size=150`; }}
                                />
                            </div>
                            <div className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '35px', height: '35px', border: '2px solid white' }}>
                                {uploading ? <Spinner animation="border" size="sm" /> : <span>📷</span>}
                            </div>
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} />
                        </div>
                    </Col>
                    <Col>
                        <h1 className="display-4 mb-0">@{user.username}</h1>
                        <p className="text-muted fs-5 text-capitalize">{user.role} Profile</p>
                    </Col>
                </Row>

                <Card className="shadow-sm p-4 mb-4" style={{ borderRadius: '25px', border: '2px solid #000' }}>
                    <Card.Body>
                        <Row className="fs-5">
                            <Col md={6}><p><strong>Age:</strong> {calculateAge(user.birthDate)}</p><p><strong>E-mail:</strong> {user.email}</p></Col>
                            <Col md={6}><p><strong>Role:</strong> <Badge bg="info" text="dark">{user.role}</Badge></p><p><strong>Status:</strong> {user.activated ? "Active" : "Pending"}</p></Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* STUDENT ACADEMIC HISTORY SECTION */}
                {user.role.toLowerCase() === 'student' && (
                    <Card className="shadow-sm mb-4 border-0">
                        <Card.Header className="bg-dark text-white fw-bold py-3">
                            <i className="bi bi-mortarboard-fill me-2"></i> Academic Enrollment History
                        </Card.Header>
                        <Card.Body>
                            <Table responsive hover className="align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Turma</th>
                                        <th>Course</th>
                                        <th>Average Grade</th>
                                        <th>Status</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentEnrollments.map((t, idx) => (
                                        <tr key={idx}>
                                            <td className="fw-bold">{t.turmaName || t.TurmaName}</td>
                                            <td>{t.courseName || t.CourseName}</td>
                                            <td><span className="fs-5 fw-bold">{t.average}</span> <small className="text-muted">/ 20</small></td>
                                            <td>
                                                <Badge bg={
                                                    t.status === 'Passed' ? 'success' : 
                                                    t.status === 'Failed' ? 'danger' : 
                                                    t.status === 'In Progress' ? 'warning text-dark' : 'secondary'
                                                }>
                                                    {t.status}
                                                </Badge>
                                            </td>
                                            <td className="text-end">
                                                <Button 
                                                    variant="outline-primary" 
                                                    size="sm"
                                                    onClick={() => navigate(`/student-report/${t.turmaId ?? t.TurmaId}`)}
                                                >
                                                    View Report Card
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {studentEnrollments.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="text-center text-muted py-4">No academic history found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                )}

                {/* TEACHER HISTORY SECTION */}
                {user.role.toLowerCase() === 'teacher' && (
                    <Row className="g-4">
                        <Col md={6}>
                            <Card className="shadow-sm h-100 border-0 bg-light">
                                <Card.Header className="bg-primary text-white fw-bold">Course History</Card.Header>
                                <Card.Body>
                                    <Table borderless hover size="sm">
                                        <tbody>
                                            {teacherCourses.map(c => (
                                                <tr key={c.courseId}>
                                                    <td><i className="bi bi-journal-bookmark me-2"></i>{c.courseName}</td>
                                                </tr>
                                            ))}
                                            {teacherCourses.length === 0 && <tr><td className="text-muted small">No courses recorded.</td></tr>}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={6}>
                            <Card className="shadow-sm h-100 border-0 bg-light">
                                <Card.Header className="bg-dark text-white fw-bold">Specialized Modules</Card.Header>
                                <Card.Body>
                                    <Table borderless hover size="sm">
                                        <tbody>
                                            {teacherModules.map(m => (
                                                <tr key={m.id}>
                                                    <td><i className="bi bi-box me-2"></i>{m.name}</td>
                                                    <td className="text-end"><Badge bg="secondary">{m.durationInHours}h</Badge></td>
                                                </tr>
                                            ))}
                                            {teacherModules.length === 0 && <tr><td className="text-muted small">No modules recorded.</td></tr>}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                )}
            </div>

            <div className="mt-4 text-center">
                <Button variant="outline-primary" className="px-5 py-2 fw-bold" onClick={() => setShowModal(true)}>
                    🔒 Change Password
                </Button>
            </div>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton><Modal.Title>Security Update</Modal.Title></Modal.Header>
                <Modal.Body>
                    {msg.text && <div className={`alert ${msg.isError ? 'alert-danger' : 'alert-success'}`}>{msg.text}</div>}
                    <Form onSubmit={handlePasswordChange}>
                        <Form.Group className="mb-3">
                            <Form.Label>Current Password</Form.Label>
                            <Form.Control type="password" required value={passwords.old} onChange={e => setPasswords({...passwords, old: e.target.value})} />
                        </Form.Group>
                        <hr />
                        <Form.Group className="mb-3">
                            <Form.Label>New Password</Form.Label>
                            <Form.Control type="password" required value={passwords.new1} onChange={e => setPasswords({...passwords, new1: e.target.value})} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Confirm New Password</Form.Label>
                            <Form.Control type="password" required value={passwords.new2} onChange={e => setPasswords({...passwords, new2: e.target.value})} />
                        </Form.Group>
                        <Button variant="primary" type="submit" className="w-100 py-2">Update Password</Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default UserProfile;