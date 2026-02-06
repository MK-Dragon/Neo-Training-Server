// src/pages/TeacherSchedule.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Row, Col, Button, Badge, Spinner, Alert, ProgressBar } from 'react-bootstrap';
import { format, startOfWeek, addDays, addHours, isSameHour, parseISO } from 'date-fns';
import { FaChalkboardTeacher, FaClock, FaMapMarkerAlt, FaDesktop, FaTools } from 'react-icons/fa';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const TeacherSchedule = () => {
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  // Teacher ID is retrieved from localStorage (same as userId)
  const teacherId = localStorage.getItem('userId');

  const fetchSchedule = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      const start = format(currentWeek, "yyyy-MM-dd'T'00:00:00");
      const end = format(addDays(currentWeek, 7), "yyyy-MM-dd'T'23:59:59");
      
      // Using the specific teacher endpoint
      const url = `${ServerIP}/api/Shcedule/teacher/${teacherId}/schedule?start=${start}&end=${end}`;
      const res = await fetch(url);
      
      if (res.ok) {
        const data = await res.json();
        // Backend returns { message, data: [] } or just the list depending on result
        const finalData = data.data ? data.data : data;
        setScheduleData(Array.isArray(finalData) ? finalData : []);
      }
    } catch (err) {
      console.error("Error loading teacher schedule", err);
    } finally {
      setLoading(false);
    }
  }, [teacherId, currentWeek]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const days = [...Array(7)].map((_, i) => addDays(currentWeek, i));
  const hours = [...Array(15)].map((_, i) => i + 8); // 08:00 to 22:00

  if (!teacherId) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">Access Denied: No Teacher ID found. Please log in.</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-5 pt-4 px-4">
      {/* Header Info */}
      <Card className="shadow-sm border-0 mb-4 bg-white">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={5}>
              <div className="d-flex align-items-center">
                <div className="bg-primary text-white p-3 rounded-circle me-3">
                  <FaChalkboardTeacher size={24} />
                </div>
                <div>
                  <span className="fw-bold text-secondary small text-uppercase d-block">Teaching Schedule</span>
                  <h4 className="mb-0 text-dark">Personal Calendar</h4>
                </div>
              </div>
            </Col>
            
            <Col md={4} className="text-center mt-3 mt-md-0">
              <div className="d-flex justify-content-center align-items-center gap-2">
                <Button variant="outline-primary" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>&larr;</Button>
                <div className="fw-bold px-3 py-1 bg-light rounded shadow-sm border">
                  {format(currentWeek, 'dd MMM')} - {format(addDays(currentWeek, 6), 'dd MMM yyyy')}
                </div>
                <Button variant="outline-primary" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>&rarr;</Button>
              </div>
            </Col>

            <Col md={3} className="text-end">
              <Button variant="primary" onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Grid Table */}
      <Card className="shadow-sm border-0 rounded-3 overflow-hidden">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '75vh' }}>
              <Table bordered className="mb-0 text-center align-middle">
                <thead className="bg-primary text-white">
                  <tr>
                    <th style={{ width: '100px', backgroundColor: '#0d6efd' }}>Hour</th>
                    {days.map(day => (
                      <th key={day.toString()} className="py-3 fw-normal" style={{ backgroundColor: '#0d6efd' }}>
                        <span className="fw-bold">{format(day, 'EEEE')}</span><br/>{format(day, 'dd/MM')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map(hour => (
                    <tr key={hour} style={{ height: '110px' }}>
                      <td className="bg-light fw-bold text-secondary">
                        <FaClock className="me-1 small" /> {hour.toString().padStart(2, '0')}:00
                      </td>
                      {days.map(day => {
                        const slotTime = addHours(day, hour);
                        // Find match in PascalCase or camelCase
                        const session = scheduleData.find(s => {
                          const dt = s.dateTime || s.DateTime;
                          return dt && isSameHour(parseISO(dt), slotTime);
                        });

                        return (
                          <td key={day.toString()} className="p-1" style={{ width: '14%', verticalAlign: 'top' }}>
                            {session && (
                              <div className="h-100 border-start border-4 border-primary bg-white shadow-sm p-2 rounded text-start position-relative">
                                {/* Module Name */}
                                <div className="fw-bold text-dark text-truncate mb-1" style={{fontSize: '0.85rem'}}>
                                  {session.moduleName || session.ModuleName}
                                </div>
                                
                                {/* Turma Name */}
                                <div className="text-primary small fw-bold mb-1">
                                  {session.turmaName || session.TurmaName}
                                </div>

                                {/* Room & Assets */}
                                <div className="d-flex gap-1 mb-2">
                                  <Badge bg="light" text="dark" className="border">
                                    <FaMapMarkerAlt className="me-1 text-danger" /> 
                                    {session.salaNome || session.SalaNome}
                                  </Badge>
                                  {(session.hasPc === 1 || session.HasPc === 1) && <FaDesktop className="text-muted" title="Has PCs" />}
                                  {(session.hasOficina === 1 || session.HasOficina === 1) && <FaTools className="text-muted" title="Has Workshop" />}
                                </div>

                                {/* Progress Section (Using the DTO data) */}
                                {(session.totalDuration || session.TotalDuration) > 0 && (
                                  <div className="mt-auto">
                                    <div className="d-flex justify-content-between small text-muted" style={{fontSize: '0.7rem'}}>
                                      <span>Progress</span>
                                      <span>{session.hoursCompleted || session.HoursCompleted}h / {session.totalDuration || session.TotalDuration}h</span>
                                    </div>
                                    <ProgressBar 
                                      now={((session.hoursCompleted || session.HoursCompleted) / (session.totalDuration || session.TotalDuration)) * 100} 
                                      style={{ height: '4px' }}
                                      variant="success"
                                    />
                                  </div>
                                )}
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

export default TeacherSchedule;