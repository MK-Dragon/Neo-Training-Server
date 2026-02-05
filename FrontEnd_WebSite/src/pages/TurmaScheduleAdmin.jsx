// src/pages/TurmaScheduleAdmin.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Form, Row, Col, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { format, startOfWeek, addDays, addHours, isSameHour, parseISO } from 'date-fns';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const TurmaScheduleAdmin = () => {
  const [activeTurmas, setActiveTurmas] = useState([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    const fetchTurmas = async () => {
      try {
        const res = await fetch(`${ServerIP}/api/Turma/all-active-turmas`);
        if (res.ok) setActiveTurmas(await res.json());
      } catch (err) {
        setError("Failed to load Turmas.");
      }
    };
    fetchTurmas();
  }, []);

  const fetchSchedule = useCallback(async () => {
    if (!selectedTurmaId) return;
    setLoading(true);
    setError('');
    try {
      const start = currentWeek.toISOString();
      const end = addDays(currentWeek, 7).toISOString();
      const url = `${ServerIP}/api/Shcedule/schedules-filter?start=${start}&end=${end}&turmaId=${selectedTurmaId}`;
      const res = await fetch(url);
      
      if (res.ok) {
        setScheduleData(await res.json());
      } else {
        setError("Could not retrieve schedule for this time frame.");
      }
    } catch (err) {
      setError("Network error fetching schedules.");
    } finally {
      setLoading(false);
    }
  }, [selectedTurmaId, currentWeek]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const days = [...Array(7)].map((_, i) => addDays(currentWeek, i));
  
  // FIXED: Range from 8 to 22 (15 total slots)
  const hours = [...Array(15)].map((_, i) => i + 8); 

  return (
    <Container className="mt-5 pt-4">
      <Card className="shadow-sm border-0 mb-4 bg-light">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={5}>
              <Form.Group>
                <Form.Label className="fw-bold">Select Active Turma</Form.Label>
                <Form.Select 
                  value={selectedTurmaId} 
                  onChange={(e) => setSelectedTurmaId(e.target.value)}
                  className="form-select-lg"
                >
                  <option value="">-- Choose a Turma --</option>
                  {activeTurmas.map(t => (
                    <option key={t.turmaId} value={t.turmaId}>
                      {t.turmaName} ({t.courseName})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={7} className="text-md-end mt-3 mt-md-0">
              <div className="d-flex justify-content-md-end gap-2">
                <Button variant="outline-dark" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>&larr; Prev</Button>
                <Button variant="dark" size="sm" onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Current Week</Button>
                <Button variant="outline-dark" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>Next &rarr;</Button>
              </div>
              <div className="mt-2 fw-bold text-primary small text-uppercase">
                {format(currentWeek, 'dd MMM')} - {format(addDays(currentWeek, 6), 'dd MMM yyyy')}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          {error && <Alert variant="danger" className="m-3">{error}</Alert>}
          
          {!selectedTurmaId ? (
            <div className="text-center py-5 text-muted italic">Select a turma to view the 08h-22h schedule.</div>
          ) : loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '80vh' }}>
              <Table bordered hover className="mb-0 text-center align-middle" style={{ minWidth: '1100px' }}>
                <thead className="table-dark sticky-top">
                  <tr>
                    <th style={{ width: '90px', zIndex: 10 }}>Hour</th>
                    {days.map(day => (
                      <th key={day.toString()} className="py-2">
                        {format(day, 'EEEE')}<br/>
                        <span className="small opacity-75">{format(day, 'dd/MM')}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map(hour => (
                    <tr key={hour} style={{ height: '75px' }}>
                      <td className="bg-light fw-bold border-end">{hour.toString().padStart(2, '0')}:00</td>
                      {days.map(day => {
                        const slotTime = addHours(day, hour);
                        const session = scheduleData.find(s => isSameHour(parseISO(s.dateTime), slotTime));

                        return (
                          <td key={day.toString()} className={session ? "p-1" : "bg-light opacity-25"}>
                            {session ? (
                              <div className="shadow-sm rounded p-1 bg-white border-start border-4 border-primary" style={{ fontSize: '0.85rem' }}>
                                <div className="fw-bold text-truncate" title={session.moduleName}>{session.moduleName}</div>
                                <div className="text-muted small">
                                   <Badge bg="secondary" className="me-1 fw-normal">{session.salaNome}</Badge>
                                   <span>{session.teacherName}</span>
                                </div>
                              </div>
                            ) : null}
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

export default TurmaScheduleAdmin;