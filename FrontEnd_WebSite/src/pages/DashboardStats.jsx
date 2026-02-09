// /src/pages/DashboardStats.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Spinner, Alert, Badge } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const DashboardStats = () => {
    const [ongoingStats, setOngoingStats] = useState(null);
    const [topTeachers, setTopTeachers] = useState([]);
    const [areasSummary, setAreasSummary] = useState([]);
    const [statusSummary, setStatusSummary] = useState(null);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'courseCount', direction: 'desc' });

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchAllStats();
    }, []);

    const fetchAllStats = async () => {
        setLoading(true);
        const headers = { 'Authorization': `Bearer ${token}` };
        try {
            const [ongoingRes, teachersRes, areasRes, statusRes] = await Promise.all([
                fetch(`${ServerIP}/api/Statistics/ongoing-stats-courses-students`, { headers }),
                fetch(`${ServerIP}/api/Statistics/top-teachers`, { headers }),
                fetch(`${ServerIP}/api/Statistics/courses-per-areas`, { headers }),
                fetch(`${ServerIP}/api/Statistics/status-finnished-ongoing`, { headers })
            ]);

            setOngoingStats(await ongoingRes.json());
            setTopTeachers(await teachersRes.json());
            setAreasSummary(await areasRes.json());
            setStatusSummary(await statusRes.json());
        } catch (err) {
            setError("Could not load dashboard statistics.");
        } finally {
            setLoading(false);
        }
    };

    const sortedAreas = useMemo(() => {
        let sortableItems = [...areasSummary];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [areasSummary, sortConfig]);

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <Spinner animation="grow" variant="primary" />
        </div>
    );

    return (
        <Container className="mt-5 pt-4 pb-5">
            <div className="mb-4">
                <h2 className="fw-bold">Management Dashboard</h2>
                <p className="text-muted small">Overview of academic activity and performance</p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Section 1: KPI Cards with Bootstrap Icons */}
            <Row className="g-4 mb-5">
                <Col md={3}>
                    <StatCard 
                        title="Active Students" 
                        value={ongoingStats?.totalActiveStudents} 
                        iconClass="bi-people-fill text-primary" 
                        subtitle="Current student headcount"
                    />
                </Col>
                <Col md={3}>
                    <StatCard 
                        title="Ongoing Courses/Turmas" 
                        value={ongoingStats?.totalOngoingCourses} 
                        iconClass="bi-journal-check text-success" 
                        subtitle="Turmas ongoing right now"
                    />
                </Col>
                <Col md={3}>
                    <StatCard 
                        title="Ongoing Courses" 
                        value={statusSummary?.ongoingTurmas} 
                        iconClass="bi-arrow-repeat text-info" 
                        subtitle="Status summary"
                    />
                </Col>
                <Col md={3}>
                    <StatCard 
                        title="Finished Courses" 
                        value={statusSummary?.finishedTurmas} 
                        iconClass="bi-check2-circle text-secondary" 
                        subtitle="Archive history"
                    />
                </Col>
            </Row>

            <Row className="g-4">
                {/* Section 2: Sortable Area Table */}
                <Col lg={7}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-white border-bottom-0 pt-3">
                            <h5 className="fw-bold"><i className="bi bi-grid-3x3-gap me-2"></i>Areas Summary</h5>
                        </Card.Header>
                        <Card.Body>
                            <Table hover responsive size="sm" className="align-middle">
                                <thead className="table-light">
                                    <tr style={{ cursor: 'pointer' }}>
                                        <th onClick={() => setSortConfig({ key: 'areaName', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                                            Area Name <i className="bi bi-arrow-down-up small ms-1"></i>
                                        </th>
                                        <th className="text-end" onClick={() => setSortConfig({ key: 'courseCount', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
                                            Courses <i className="bi bi-arrow-down-up small ms-1"></i>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedAreas.map(area => (
                                        <tr key={area.areaId}>
                                            <td className="py-2 fw-medium">{area.areaName}</td>
                                            <td className="text-end py-2">
                                                <Badge bg="dark" pill>{area.courseCount}</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Section 3: Teacher Ranking */}
                <Col lg={5}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-dark text-white pt-3">
                            <h5 className="fw-bold"><i className="bi bi-trophy-fill text-warning me-2"></i>Top Performance</h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <div className="list-group list-group-flush">
                                {topTeachers.map((teacher, idx) => (
                                    <div key={teacher.teacherId} className="list-group-item d-flex justify-content-between align-items-center py-3">
                                        <div className="d-flex align-items-center">
                                            <div className="me-3 text-muted fw-bold" style={{ width: '25px' }}>{idx + 1}.</div>
                                            <div>
                                                <div className="fw-bold mb-0" style={{ fontSize: '0.95rem' }}>{teacher.name}</div>
                                                <div className="small text-muted" style={{ fontSize: '0.8rem' }}>{teacher.email}</div>
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                                {teacher.totalClassesTaught} Classes
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

        </Container>
    );
};

const StatCard = ({ title, value, iconClass, subtitle }) => (
    <Card className="shadow-sm border-0 h-100 overflow-hidden">
        <Card.Body className="d-flex align-items-center">
            <div className="flex-shrink-0 bg-light rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                <i className={`bi ${iconClass} fs-3`}></i>
            </div>
            <div className="ms-3">
                <h4 className="fw-bold mb-0">{value || 0}</h4>
                <div className="text-muted small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>{title}</div>
            </div>
        </Card.Body>
    </Card>
);

export default DashboardStats;