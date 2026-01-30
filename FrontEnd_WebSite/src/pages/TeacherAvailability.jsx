// src/pages/TeacherAvailability.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Button, Table, Alert, Badge } from 'react-bootstrap';
import { format, startOfWeek, addDays, addHours, isSameHour, parseISO } from 'date-fns';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const TeacherAvailability = () => {
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  // Use username since teacherId was undefined
  const username = localStorage.getItem('username');
  const userRole = localStorage.getItem('userRole');
  const userIsTeacher = (userRole === 'Teacher');
  const user_id = localStorage.getItem('userId');
  console.log("user_id: " + user_id);

  // We still need the numeric ID for POST/PUT requests. 
  // We'll extract it from the token properly this time.
  const token = localStorage.getItem('token');
  let teacherId = null;
  if (token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      // Check common claim keys for the ID
      //teacherId = payload.userId || payload.id || payload.nameid || payload.sub;
      teacherId = localStorage.getItem('userId');
      console.log("Teacher id: " + teacherId);

    } catch (e) {
      console.error("Token parsing error", e);
    }
  }

  const fetchAvailability = useCallback(async () => {
    if (!userIsTeacher || !username) return;
    setLoading(true);
    try {
      const start = currentWeek.toISOString();
      const end = addDays(currentWeek, 7).toISOString();
      
      // Updated to use formadorUsername per your new C# endpoint
      const response = await fetch(
        `${ServerIP}/api/Availabilaty/teacher-availability?formadorUsername=${username}&start=${start}&end=${end}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setAvailability(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError("Failed to load availability data.");
    } finally {
      setLoading(false);
    }
  }, [username, userIsTeacher, currentWeek]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const handleToggleSlot = async (dateHour) => {
    const existingSlot = availability.find(a => isSameHour(parseISO(a.DataHora), dateHour));
    
    // Safety check for teacherId
    /*const fId = parseInt(teacherId);
    if (!fId) {
      setError("Could not identify Teacher ID. Please log in again.");
      return;
    }*/

    try {
      let response;
      if (existingSlot) {
        // MATCHING UpdateAvailability.cs
        const updateBody = {
          DispoId: parseInt(existingSlot.DispoId || existingSlot.dispoId || existingSlot.id),
          Disponivel: existingSlot.Disponivel === 1 ? 0 : 1,
          DataHora: dateHour.toISOString()
        };

        response = await fetch(`${ServerIP}/api/Availabilaty/update-availability`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateBody)
        });
      } else {
        // MATCHING TeacherAvailability.cs
        const createBody = {
          FormadorId: teacherId,
          DataHora: dateHour.toISOString(),
          Disponivel: 1 
        };

        response = await fetch(`${ServerIP}/api/Availabilaty/set-availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createBody)
        });
      }

      if (response.ok) {
        fetchAvailability();
      } else {
        const errorText = await response.text();
        setError(`Server Error: ${errorText}`);
      }
    } catch (err) {
      setError("Network error. " + err);
    }
  };

  const days = [...Array(7)].map((_, i) => addDays(currentWeek, i));
  const hours = [...Array(24)].map((_, i) => i);

  if (!userIsTeacher) return <Alert variant="danger" className="m-5">Access Denied. Teacher role required.</Alert>;

  return (
    <Container className="mt-5 pt-4">
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center py-3">
          <h4 className="mb-0">Availability: {username}</h4>
          <div className="d-flex gap-2">
            <Button variant="outline-light" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>&larr; Prev</Button>
            <Button variant="outline-light" size="sm" onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
            <Button variant="outline-light" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>Next &rarr;</Button>
          </div>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
          
          <div className="table-responsive" style={{ maxHeight: '70vh' }}>
            <Table bordered hover className="text-center align-middle">
              <thead className="sticky-top bg-white">
                <tr>
                  <th style={{ width: '100px' }}>Hour</th>
                  {days.map(day => (
                    <th key={day.toString()} className="small">
                      {format(day, 'EEE')}<br />
                      <span className="text-muted">{format(day, 'dd/MM')}</span>
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
                      const slotData = availability.find(a => isSameHour(parseISO(a.DataHora), slotTime));
                      const isAvailable = slotData?.Disponivel === 1;

                      return (
                        <td 
                          key={day.toString()} 
                          onClick={() => handleToggleSlot(slotTime)}
                          style={{ 
                            cursor: 'pointer',
                            backgroundColor: isAvailable ? '#d1e7dd' : 'transparent',
                          }}
                        >
                          {isAvailable ? <Badge bg="success">Available</Badge> : <span className="opacity-25">-</span>}
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