// src/pages/AdminTeacherSchedule.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Button, Table, Alert, Badge, Spinner, Form, Row, Col } from 'react-bootstrap';
import { format, startOfWeek, addDays, addHours, isSameHour, parseISO } from 'date-fns';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const AdminTeacherSchedule = () => {
  // --- Admin Selection State ---
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  
  // --- Calendar Logic State ---
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingSlot, setProcessingSlot] = useState(null);
  const [error, setError] = useState('');
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // 1. Fetch Teachers List for the Select
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await fetch(`${ServerIP}/api/Teacher/teachers-list`);
        if (res.ok) {
          const data = await res.json();
          setTeachers(data); // Expecting List<UserSimple> (UserId, Username)
        }
      } catch (err) {
        setError("Could not load teachers list.");
      }
    };
    fetchTeachers();
  }, []);

  // 2. Fetch data (Availability + Assignments) when teacher or week changes
  const fetchData = useCallback(async () => {
    if (!selectedTeacherId) return;
    setLoading(true);
    try {
      const start = currentWeek.toISOString();
      const end = addDays(currentWeek, 7).toISOString();

      // Fetch availability and assignments concurrently
      const [availRes, assignRes] = await Promise.all([
        fetch(`${ServerIP}/api/Availabilaty/teacher-availability?formadorId=${selectedTeacherId}&start=${start}&end=${end}`),
        fetch(`${ServerIP}/api/Teacher/teacher/${selectedTeacherId}/assignments`)
      ]);

      if (availRes.ok) {
        const data = await availRes.json();
        const normalizedData = (Array.isArray(data) ? data : []).map(item => ({
          DispoId: item.dispoId ?? item.DispoId,
          DataHora: item.dataHora ?? item.DataHora,
          Disponivel: item.disponivel ?? item.Disponivel ?? 0
        }));
        setAvailability(normalizedData);
      }

      if (assignRes.ok) {
        setTeacherAssignments(await assignRes.json());
      }
    } catch (err) {
      setError("Failed to load teacher data.");
    } finally {
      setLoading(false);
    }
  }, [selectedTeacherId, currentWeek]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleSlot = async (dateHour) => {
    if (!selectedTeacherId) return;
    const timeKey = dateHour.toISOString();
    const existingSlot = availability.find(a => 
      a.DataHora ? isSameHour(parseISO(a.DataHora), dateHour) : false
    );
    
    setProcessingSlot(timeKey);
    try {
      const body = {
        FormadorId: parseInt(selectedTeacherId),
        DataHora: timeKey,
        Disponivel: existingSlot?.Disponivel === 1 ? 0 : 1
      };

      const endpoint = existingSlot ? 'update-availability' : 'set-availability';
      const method = existingSlot ? 'PUT' : 'POST';

      const response = await fetch(`${ServerIP}/api/Availabilaty/${endpoint}`, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) await fetchData();
    } catch (err) {
      setError("Failed to update availability.");
    } finally {
      setProcessingSlot(null);
    }
  };

  const days = [...Array(7)].map((_, i) => addDays(currentWeek, i));
  const hours = [...Array(15)].map((_, i) => i + 8);

  return (
    <Container className="mt-5 pt-4">
      {/* --- TEACHER SELECTOR & ASSIGNMENT INFO --- */}
      <Card className="shadow-sm border-0 mb-4 bg-light">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={5}>
              <Form.Group>
                <Form.Label className="fw-bold text-uppercase small text-muted">Manage Teacher Availability</Form.Label>
                <Form.Select 
                  value={selectedTeacherId} 
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="form-select-lg"
                >
                  <option value="">Select a Teacher...</option>
                  {teachers.map(t => (
                    <option key={t.userId ?? t.UserId} value={t.userId ?? t.UserId}>
                      {t.username ?? t.Username}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={7}>
              {selectedTeacherId && (
                <div className="mt-3 mt-md-0 p-3 bg-white rounded border border-info border-start-4">
                  <div className="fw-bold mb-2">Current Assignments:</div>
                  {teacherAssignments.length > 0 ? (
                    <div className="d-flex flex-wrap gap-2">
                      {teacherAssignments.map((a, i) => (
                        <Badge key={i} bg="info" className="text-dark p-2">
                          {a.turmaName} | {a.moduleName}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted italic small">No active assignments found.</span>
                  )}
                </div>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* --- CALENDAR GRID --- */}
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center py-3">
          <h5 className="mb-0">Weekly Schedule Editor</h5>
          <div className="d-flex gap-2">
            <Button variant="outline-light" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>Prev</Button>
            <Button variant="outline-light" size="sm" onClick={() => setCurrentWeek(new Date())}>Today</Button>
            <Button variant="outline-light" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>Next</Button>
          </div>
        </Card.Header>
        <Card.Body>
          {!selectedTeacherId ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-person-badge display-4"></i>
              <p className="mt-2">Please select a teacher above to manage their schedule.</p>
            </div>
          ) : loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '70vh' }}>
              <Table bordered size="sm" className="text-center align-middle">
                <thead className="sticky-top bg-white">
                  <tr>
                    <th style={{ backgroundColor: '#f8f9fa' }}>Hour</th>
                    {days.map(day => (
                      <th key={day.toString()} style={{ backgroundColor: '#f8f9fa', minWidth: '100px' }}>
                        {format(day, 'EEE')}<br/>
                        <small>{format(day, 'dd/MM')}</small>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map(hour => (
                    <tr key={hour}>
                      <td className="bg-light fw-bold">{hour}:00</td>
                      {days.map(day => {
                        const slotTime = addHours(day, hour);
                        const slotData = availability.find(a => isSameHour(parseISO(a.DataHora), slotTime));
                        const isProcessing = processingSlot === slotTime.toISOString();
                        
                        return (
                          <td 
                            key={day.toString()} 
                            onClick={() => !isProcessing && handleToggleSlot(slotTime)}
                            style={{ 
                              cursor: 'pointer',
                              height: '40px',
                              backgroundColor: slotData?.Disponivel === 1 ? '#d1e7dd' : slotData?.Disponivel === 0 ? '#f8d7da' : 'transparent',
                              transition: 'all 0.1s'
                            }}
                          >
                            {isProcessing ? <Spinner animation="border" size="sm" /> : 
                             slotData?.Disponivel === 1 ? <Badge bg="success">Available</Badge> : 
                             slotData?.Disponivel === 0 ? <Badge bg="danger">Busy</Badge> : '-'}
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

export default AdminTeacherSchedule;