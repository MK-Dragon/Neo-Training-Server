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
        
        // NORMALIZATION: Handle all possible casing from the Backend/DB
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

    // Find if we already have a record for this specific hour
    const existingSlot = availability.find(a => 
      a.DataHora ? isSameHour(parseISO(a.DataHora), dateHour) : false
    );
    
    setProcessingSlot(timeKey);
    setError('');

    try {
      let response;
      if (existingSlot) {
        // UPDATE EXISTING SLOT
        const updateBody = {
        FormadorId: parseInt(teacherId), // Using the ID from localStorage/state
        Disponivel: existingSlot.Disponivel === 1 ? 0 : 1,
        DataHora: timeKey
    };

        console.log("Sending Update:", updateBody);

        response = await fetch(`${ServerIP}/api/Availabilaty/update-availability`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateBody)
        });
      } else {
        // CREATE NEW SLOT
        const createBody = {
          FormadorId: parseInt(teacherId),
          DataHora: timeKey,
          Disponivel: 1 
        };

        console.log("Sending Create:", createBody);

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
        console.error("Server Error Response:", errorJson);
        setError(`Error: ${JSON.stringify(errorJson.errors || errorJson.message)}`);
      }
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setProcessingSlot(null);
    }
  };

  const days = [...Array(7)].map((_, i) => addDays(currentWeek, i));
  const hours = [...Array(24)].map((_, i) => i);

  if (!userIsTeacher) return <Alert variant="danger" className="m-5">Access Denied. Teacher role required.</Alert>;

  return (
    <Container className="mt-5 pt-4">
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center py-3">
          <h4 className="mb-0">Teacher Schedule: {username}</h4>
          <div className="d-flex gap-2">
            <Button variant="outline-light" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>&larr; Prev</Button>
            <Button variant="outline-light" size="sm" onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
            <Button variant="outline-light" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>Next &rarr;</Button>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="mb-3 d-flex gap-3 small">
             <div className="d-flex align-items-center"><Badge bg="success" className="me-1">&nbsp;</Badge> Available</div>
             <div className="d-flex align-items-center"><Badge bg="danger" className="me-1">&nbsp;</Badge> Busy</div>
             <div className="d-flex align-items-center"><Badge bg="light" text="dark" border className="me-1">-</Badge> Not Set</div>
          </div>

          {error && <Alert variant="danger" dismissible onClose={() => setError('')} style={{ fontSize: '0.8rem' }}>{error}</Alert>}
          
          <div className="table-responsive" style={{ maxHeight: '75vh' }}>
            <Table bordered hover size="sm" className="text-center align-middle">
              <thead className="sticky-top bg-white" style={{ zIndex: 10 }}>
                <tr>
                  <th style={{ width: '80px', backgroundColor: '#f8f9fa' }}>Hour</th>
                  {days.map(day => (
                    <th key={day.toString()} style={{ minWidth: '100px', backgroundColor: '#f8f9fa' }}>
                      <div className="fw-bold">{format(day, 'EEE')}</div>
                      <div className="text-muted extra-small">{format(day, 'dd/MM')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map(hour => (
                  <tr key={hour}>
                    <td className="fw-bold bg-light">{hour}:00</td>
                    {days.map(day => {
                      const slotTime = addHours(day, hour);
                      const slotTimeISO = slotTime.toISOString();
                      
                      const slotData = availability.find(a => 
                        a.DataHora ? isSameHour(parseISO(a.DataHora), slotTime) : false
                      );
                      
                      const isAvailable = slotData?.Disponivel === 1;
                      const isBusy = slotData?.Disponivel === 0;
                      const isProcessing = processingSlot === slotTimeISO;

                      return (
                        <td 
                          key={day.toString()} 
                          onClick={() => !isProcessing && handleToggleSlot(slotTime)}
                          style={{ 
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            backgroundColor: isAvailable ? '#d1e7dd' : isBusy ? '#f8d7da' : 'transparent',
                            height: '45px',
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
        </Card.Body>
      </Card>
    </Container>
  );
};

export default TeacherAvailability;