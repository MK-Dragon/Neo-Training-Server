// src/pages/TeacherAvailability.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Button, Table, Alert, Badge, Spinner } from 'react-bootstrap';
import { format, startOfWeek, addDays, addHours, isSameHour, parseISO } from 'date-fns';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const TeacherAvailability = () => {
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingSlot, setProcessingSlot] = useState(null);
  const [error, setError] = useState('');
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const username = localStorage.getItem('username');
  const userRole = localStorage.getItem('userRole');
  const userIsTeacher = (userRole === 'Teacher');
  const teacherId = localStorage.getItem('userId');

  const fetchAvailability = useCallback(async () => {
    if (!userIsTeacher || !teacherId) return;
    setLoading(true);
    try {
      const start = currentWeek.toISOString();
      const end = addDays(currentWeek, 7).toISOString();

      const response = await fetch(
        `${ServerIP}/api/Availabilaty/teacher-availability?formadorId=${teacherId}&start=${start}&end=${end}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const normalizedData = (Array.isArray(data) ? data : []).map(item => ({
          DispoId: item.dispoId ?? item.DispoId ?? item.dispo_id,
          DataHora: item.dataHora ?? item.DataHora ?? item.data_hora,
          Disponivel: item.disponivel ?? item.Disponivel ?? 0
        }));
        setAvailability(normalizedData);
      }
    } catch (err) {
      setError("Failed to load availability data.");
    } finally {
      setLoading(false);
    }
  }, [userIsTeacher, teacherId, currentWeek]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const handleToggleSlot = async (dateHour) => {
    const timeKey = dateHour.toISOString();
    if (processingSlot === timeKey) return; 

    const existingSlot = availability.find(a => 
      a.DataHora ? isSameHour(parseISO(a.DataHora), dateHour) : false
    );
    
    setProcessingSlot(timeKey);
    setError('');

    try {
      let response;
      if (existingSlot) {
        const updateBody = {
            FormadorId: parseInt(teacherId),
            Disponivel: existingSlot.Disponivel === 1 ? 0 : 1,
            DataHora: timeKey
        };
        response = await fetch(`${ServerIP}/api/Availabilaty/update-availability`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateBody)
        });
      } else {
        const createBody = {
          FormadorId: parseInt(teacherId),
          DataHora: timeKey,
          Disponivel: 1 
        };
        response = await fetch(`${ServerIP}/api/Availabilaty/set-availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createBody)
        });
      }

      if (response.ok) {
        await fetchAvailability();
      } else {
        const errorJson = await response.json();
        setError(`Error: ${JSON.stringify(errorJson.errors || errorJson.message)}`);
      }
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setProcessingSlot(null);
    }
  };

  const days = [...Array(7)].map((_, i) => addDays(currentWeek, i));
  
  // --- UPDATED: HOURS FROM 08:00 TO 22:00 ---
  // Array(15) creates slots for 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22
  const hours = [...Array(15)].map((_, i) => i + 8);

  if (!userIsTeacher) return <Alert variant="danger" className="m-5">Access Denied. Teacher role required.</Alert>;

  return (
    <Container className="mt-5 pt-4">
      <Card className="shadow-sm border-0 overflow-hidden">
        <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center py-3">
          <h4 className="mb-0">Teacher Schedule: {username}</h4>
          <div className="d-flex gap-2">
            <Button variant="outline-light" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>&larr; Prev</Button>
            <Button variant="outline-light" size="sm" onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
            <Button variant="outline-light" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>Next &rarr;</Button>
          </div>
        </Card.Header>
        <Card.Body className="p-0"> {/* p-0 helps the scroll area reach the edges */}
          <div className="p-3 bg-light border-bottom d-flex gap-3 small">
             <div className="d-flex align-items-center"><Badge bg="success" className="me-1">&nbsp;</Badge> Available</div>
             <div className="d-flex align-items-center"><Badge bg="danger" className="me-1">&nbsp;</Badge> Busy</div>
             <div className="d-flex align-items-center"><Badge bg="light" text="dark" className="me-1 border">-</Badge> Not Set</div>
          </div>

          {error && <Alert variant="danger" className="m-3" dismissible onClose={() => setError('')}>{error}</Alert>}
          
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>
          ) : (
            /* --- FIXED SCROLL WRAPPER --- */
            <div style={{ 
              height: "65vh", 
              overflowY: "auto", 
              overflowX: "auto", 
              display: "block",
              position: "relative" 
            }}>
              <Table bordered className="text-center align-middle m-0" style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: "850px" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10, backgroundColor: "#fff" }}>
                  <tr>
                    <th style={{ 
                      position: "sticky", left: 0, zIndex: 11, backgroundColor: "#f8f9fa",
                      width: "100px", borderRight: "2px solid #dee2e6" 
                    }}>Hour</th>
                    {days.map(day => (
                      <th key={day.toString()} style={{ backgroundColor: "#f8f9fa", minWidth: "110px", borderBottom: "2px solid #dee2e6" }}>
                        <div className="fw-bold">{format(day, 'EEE')}</div>
                        <div className="text-muted small">{format(day, 'dd/MM')}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map(hour => (
                    <tr key={hour}>
                      <td style={{ 
                        position: "sticky", left: 0, zIndex: 5, backgroundColor: "#f8f9fa", 
                        fontWeight: "bold", borderRight: "2px solid #dee2e6" 
                      }}>{hour}:00</td>
                      {days.map(day => {
                        const slotTime = addHours(day, hour);
                        const slotData = availability.find(a => 
                          a.DataHora ? isSameHour(parseISO(a.DataHora), slotTime) : false
                        );
                        
                        const isAvailable = slotData?.Disponivel === 1;
                        const isBusy = slotData?.Disponivel === 0;
                        const isProcessing = processingSlot === slotTime.toISOString();

                        return (
                          <td 
                            key={day.toString()} 
                            onClick={() => !isProcessing && handleToggleSlot(slotTime)}
                            style={{ 
                              cursor: isProcessing ? 'not-allowed' : 'pointer',
                              backgroundColor: isAvailable ? '#d1e7dd' : isBusy ? '#f8d7da' : 'transparent',
                              height: '55px',
                              transition: 'all 0.1s'
                            }}
                          >
                            {isProcessing ? (
                              <Spinner animation="border" size="sm" variant="secondary" />
                            ) : isAvailable ? (
                              <Badge bg="success">Available</Badge>
                            ) : isBusy ? (
                              <Badge bg="danger">Busy</Badge>
                            ) : (
                              <span className="text-muted opacity-25">-</span>
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

export default TeacherAvailability;