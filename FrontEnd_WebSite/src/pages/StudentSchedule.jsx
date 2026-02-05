// src/pages/StudentSchedule.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom'; // Added for URL params
import { Container, Card, Table, Row, Col, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { format, startOfWeek, addDays, addHours, isSameHour, parseISO } from 'date-fns';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const StudentSchedule = () => {
  const location = useLocation();
  const [turmaDetails, setTurmaDetails] = useState(null); // Holds { TurmaName, CourseName }
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Get student ID and parse turmaId from URL (?turmaId=6)
  const studentId = localStorage.getItem('userId');
  const queryParams = new URLSearchParams(location.search);
  const selectedTurmaId = queryParams.get('turmaId');

  // 1. Fetch Turma Details (Name/Course) using the ID from URL
  useEffect(() => {
    const fetchTurmaInfo = async () => {
      if (!selectedTurmaId) return;
      try {
        const res = await fetch(`${ServerIP}/api/Turma/turma/${selectedTurmaId}`);
        if (res.ok) {
          const data = await res.json();
          setTurmaDetails(data);
        }
      } catch (err) {
        console.error("Error loading turma details", err);
      }
    };
    fetchTurmaInfo();
  }, [selectedTurmaId]);

  // 2. Fetch Schedule Data
  const fetchSchedule = useCallback(async () => {
    if (!selectedTurmaId) return;
    setLoading(true);
    try {
      const start = format(currentWeek, "yyyy-MM-dd'T'00:00:00");
      const end = format(addDays(currentWeek, 7), "yyyy-MM-dd'T'23:59:59");
      const url = `${ServerIP}/api/Shcedule/schedules-filter?start=${start}&end=${end}&turmaId=${selectedTurmaId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setScheduleData(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error loading schedule", err);
    } finally {
      setLoading(false);
    }
  }, [selectedTurmaId, currentWeek]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const days = [...Array(7)].map((_, i) => addDays(currentWeek, i));
  const hours = [...Array(15)].map((_, i) => i + 8);

  if (!studentId) {
    return <Container className="mt-5"><Alert variant="danger">Please log in to view your schedule.</Alert></Container>;
  }

  return (
    <Container fluid className="mt-5 pt-4 px-4">
      <Card className="shadow-sm border-0 mb-4 bg-white">
        <Card.Body>
          <Row className="align-items-center">
            {/* --- TURMA INFO SECTION (Replaced Dropdown) --- */}
            <Col md={5}>
              <div>
                <span className="fw-bold text-secondary small text-uppercase d-block mb-1">Schedule For:</span>
                {turmaDetails ? (
                  <h4 className="mb-0 text-primary">
                    {turmaDetails.turmaName ?? turmaDetails.TurmaName} 
                    <small className="text-muted ms-2 fw-normal">
                      ({turmaDetails.courseName ?? turmaDetails.CourseName})
                    </small>
                  </h4>
                ) : (
                  <div className="text-muted">Loading class info...</div>
                )}
              </div>
            </Col>
            
            <Col md={4} className="text-center mt-3 mt-md-0">
              <div className="d-flex justify-content-center align-items-center gap-2">
                <Button variant="outline-secondary" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>&larr;</Button>
                <div className="fw-bold px-2">{format(currentWeek, 'dd MMM')} - {format(addDays(currentWeek, 6), 'dd MMM yyyy')}</div>
                <Button variant="outline-secondary" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>&rarr;</Button>
              </div>
            </Col>

            <Col md={3} className="text-end">
              <Button variant="outline-primary" onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0 rounded-3 overflow-hidden">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : !selectedTurmaId ? (
            <div className="text-center py-5"><Alert variant="warning">No Turma ID provided in URL.</Alert></div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '75vh' }}>
              <Table bordered hover className="mb-0 text-center align-middle">
                <thead className="bg-dark text-white">
                  <tr>
                    <th style={{ width: '100px', backgroundColor: '#37aa2d' }}>Hour</th>
                    {days.map(day => (
                      <th key={day.toString()} className="py-3 fw-normal" style={{ backgroundColor: '#37aa2d' }}>
                        <span className="fw-bold">{format(day, 'EEEE')}</span><br/>{format(day, 'dd/MM')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map(hour => (
                    <tr key={hour} style={{ height: '100px' }}>
                      <td className="bg-light fw-bold text-secondary">{hour.toString().padStart(2, '0')}:00</td>
                      {days.map(day => {
                        const slotTime = addHours(day, hour);
                        const session = scheduleData.find(s => {
                          const dt = s.dateTime ?? s.DateTime;
                          return dt && isSameHour(parseISO(dt), slotTime);
                        });
                        return (
                          <td key={day.toString()} className="p-1" style={{ width: '14%' }}>
                            {session && (
                              <div className="h-100 border-start border-4 border-success bg-white shadow-sm p-2 rounded text-start animate__animated animate__fadeIn">
                                <div className="fw-bold text-dark text-truncate mb-1">{session.moduleName ?? session.ModuleName}</div>
                                <div className="text-muted small mb-1">P: {session.teacherName ?? session.TeacherName}</div>
                                <Badge bg="info" text="dark" className="fw-normal">Room {session.salaNome ?? session.SalaNome}</Badge>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default StudentSchedule;