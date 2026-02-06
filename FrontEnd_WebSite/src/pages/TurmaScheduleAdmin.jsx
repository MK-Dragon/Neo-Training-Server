// src/pages/TurmaScheduleAdmin.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Form, Row, Col, Button, Badge, Spinner, Alert, Modal, ListGroup } from 'react-bootstrap';
import { format, startOfWeek, addDays, addHours, isSameHour, parseISO } from 'date-fns';
import { FaDesktop, FaTools, FaCheckCircle, FaCalendarPlus, FaTrash } from 'react-icons/fa';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const TurmaScheduleAdmin = () => {
  // --- State ---
  const [activeTurmas, setActiveTurmas] = useState([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedSlots, setSelectedSlots] = useState([]); 
  const [availableRooms, setAvailableRooms] = useState([]);
  
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState('');

  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // 1. Initial Load: Turmas
  useEffect(() => {
    const fetchTurmas = async () => {
      try {
        const res = await fetch(`${ServerIP}/api/Turma/all-active-turmas`);
        if (res.ok) setActiveTurmas(await res.json());
      } catch (err) { setError("Failed to load active Turmas."); }
    };
    fetchTurmas();
  }, []);

  // 2. Fetch Grid Data
  const fetchSchedule = useCallback(async () => {
    if (!selectedTurmaId) { setScheduleData([]); return; }
    setLoading(true);
    try {
      const start = format(currentWeek, "yyyy-MM-dd'T'00:00:00");
      const end = format(addDays(currentWeek, 7), "yyyy-MM-dd'T'23:59:59");
      const url = `${ServerIP}/api/Shcedule/schedules-filter?start=${start}&end=${end}&turmaId=${selectedTurmaId}`;
      const res = await fetch(url);
      if (res.ok) setScheduleData(await res.json());
    } catch (err) { setError("Network error."); }
    finally { setLoading(false); }
  }, [selectedTurmaId, currentWeek]);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  // 3. Fetch Available Rooms (Strict Slot Range)
  useEffect(() => {
    const fetchRooms = async () => {
      if (selectedSlots.length === 0) { setAvailableRooms([]); return; }
      const sorted = [...selectedSlots].sort((a, b) => a.hour - b.hour);
      const dayStr = format(sorted[0].day, 'yyyy-MM-dd');
      
      const start = `${dayStr}T${String(sorted[0].hour).padStart(2, '0')}:00:00`;
      const end = `${dayStr}T${String(sorted[sorted.length - 1].hour).padStart(2, '0')}:00:00`;

      try {
        const res = await fetch(`${ServerIP}/api/Salas/available-rooms-range?start=${start}&end=${end}`);
        if (res.ok) {
          const data = await res.json();
          setAvailableRooms(Array.isArray(data) ? data : (data.data || []));
        }
      } catch (err) { console.error("Room fetch failed"); }
    };
    fetchRooms();
  }, [selectedSlots]);

  // --- Grid Handlers ---
  const handleSlotClick = (day, hour, hasExistingSession) => {
    if (hasExistingSession) return; 
    const isSelected = selectedSlots.some(s => format(s.day, 'yyyyMMdd') === format(day, 'yyyyMMdd') && s.hour === hour);
    
    if (isSelected) {
      setSelectedSlots(selectedSlots.filter(s => !(format(s.day, 'yyyyMMdd') === format(day, 'yyyyMMdd') && s.hour === hour)));
      return;
    }

    if (selectedSlots.length > 0) {
      const sorted = [...selectedSlots].sort((a, b) => a.hour - b.hour);
      const sameDay = format(day, 'yyyyMMdd') === format(sorted[0].day, 'yyyyMMdd');
      const isAdjacent = hour === sorted[0].hour - 1 || hour === sorted[sorted.length - 1].hour + 1;
      
      if (sameDay && isAdjacent) {
        setSelectedSlots([...selectedSlots, { day, hour }]);
      } else {
        setSelectedSlots([{ day, hour }]); 
      }
    } else {
      setSelectedSlots([{ day, hour }]);
    }
  };

  // --- Modal Logic ---
  const handleOpenBooking = async () => {
    setBookingLoading(true);
    const sorted = [...selectedSlots].sort((a, b) => a.hour - b.hour);
    const dayStr = format(sorted[0].day, 'yyyy-MM-dd');
    
    // Strict Slot EndTime (e.g., 8h to 10h sends 08:00 and 10:00)
    const start = `${dayStr}T${String(sorted[0].hour).padStart(2, '0')}:00:00`;
    const end = `${dayStr}T${String(sorted[sorted.length - 1].hour).padStart(2, '0')}:00:00`;

    try {
      const url = `${ServerIP}/api/ModuleTurmaTeacher/suggest-teacher-module?TurmaId=${selectedTurmaId}&StartTime=${start}&EndTime=${end}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setSuggestions(Array.isArray(data) ? data : (data.data || []));
        setShowBookingModal(true);
      }
    } catch (err) { 
      alert("Error loading suggestions"); 
    } finally { 
      setBookingLoading(false); 
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedSuggestion || !selectedRoomId) return;
    setBookingLoading(true);

    try {
      const sorted = [...selectedSlots].sort((a, b) => a.hour - b.hour);
      const dayStr = format(sorted[0].day, 'yyyy-MM-dd');
      
      const bulkBody = {
        TurmaId: parseInt(selectedTurmaId),
        ModuleId: selectedSuggestion.moduleId,
        FormadorId: selectedSuggestion.teacherId,
        SalaId: parseInt(selectedRoomId),
        StartTime: `${dayStr}T${String(sorted[0].hour).padStart(2, '0')}:00:00`,
        EndTime: `${dayStr}T${String(sorted[sorted.length - 1].hour).padStart(2, '0')}:00:00`
      };

      const res = await fetch(`${ServerIP}/api/Shcedule/add-schedule-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkBody)
      });

      const data = await res.json();
      if (res.ok) {
        setShowBookingModal(false);
        setSelectedSlots([]);
        setSelectedSuggestion(null);
        setSelectedRoomId('');
        fetchSchedule(); 
      } else { 
        alert(`Booking Failed: ${data.message || "Slot conflict detected."}`); 
      }
    } catch (err) { 
      alert("Error saving schedule."); 
    } finally { 
      setBookingLoading(false); 
    }
  };

  const days = [...Array(7)].map((_, i) => addDays(currentWeek, i));
  const hours = [...Array(15)].map((_, i) => i + 8); 

  return (
    <Container fluid className="mt-5 pt-4 px-4">
      {/* --- TOP CONTROLS --- */}
      <Card className="shadow-sm border-0 mb-4 bg-light">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={3}>
              <Form.Select value={selectedTurmaId} onChange={(e) => setSelectedTurmaId(e.target.value)} className="form-select-lg">
                <option value="">-- Choose Turma --</option>
                {activeTurmas.map(t => <option key={t.turmaId} value={t.turmaId}>{t.turmaName}</option>)}
              </Form.Select>
            </Col>
            <Col md={3} className="text-center">
              <Button variant="outline-primary" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>&larr;</Button>
              <Button variant="primary" size="sm" className="mx-2" onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</Button>
              <Button variant="outline-primary" size="sm" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>&rarr;</Button>
              <div className="mt-1 small fw-bold text-uppercase">{format(currentWeek, 'dd MMM')} - {format(addDays(currentWeek, 6), 'dd MMM yyyy')}</div>
            </Col>
            <Col md={6} className="text-end">
              <Button 
                variant="outline-danger" 
                size="lg" 
                className="me-2" 
                disabled={selectedSlots.length === 0} 
                onClick={() => setSelectedSlots([])}
              >
                <FaTrash className="me-2"/> Clear
              </Button>
              <Button 
                variant="success" 
                size="lg" 
                disabled={selectedSlots.length === 0} 
                onClick={handleOpenBooking}
              >
                {bookingLoading ? <Spinner size="sm" /> : <><FaCalendarPlus className="me-2"/> Book Slots ({selectedSlots.length})</>}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* --- GRID --- */}
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          {!selectedTurmaId ? (
            <div className="text-center py-5 text-muted"><h4>Select a Turma to begin.</h4></div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '72vh' }}>
              <Table bordered className="mb-0 text-center align-middle">
                <thead className="table-dark sticky-top">
                  <tr>
                    <th style={{ width: '85px', color: 'white', backgroundColor: '#212529' }}>Time</th>
                    {days.map(day => (
                      <th key={day.toString()} className="py-2 small" style={{ color: 'white', backgroundColor: '#212529' }}>
                        {format(day, 'EEEE')}<br/>{format(day, 'dd/MM')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hours.map(hour => (
                    <tr key={hour} style={{ height: '90px' }}>
                      <td className="bg-light fw-bold small">{hour.toString().padStart(2, '0')}:00</td>
                      {days.map(day => {
                        const slotTime = addHours(day, hour);
                        const session = scheduleData.find(s => isSameHour(parseISO(s.dateTime), slotTime));
                        const isSelected = selectedSlots.some(s => format(s.day, 'yyyyMMdd') === format(day, 'yyyyMMdd') && s.hour === hour);
                        return (
                          <td 
                            key={day.toString()} 
                            onClick={() => handleSlotClick(day, hour, !!session)}
                            className={session ? "p-1" : "bg-light pointer-cursor"}
                            style={{ backgroundColor: isSelected ? '#cfe2ff' : '', cursor: session ? 'default' : 'pointer' }}
                          >
                            {session ? (
                              <div className="h-100 border-start border-4 border-primary bg-white shadow-sm p-2 rounded text-start" style={{ fontSize: '0.8rem' }}>
                                <div className="fw-bold text-primary text-truncate">{session.moduleName}</div>
                                <div className="small text-dark"><strong>P:</strong> {session.teacherName}</div>
                                <Badge bg="secondary" className="fw-normal">Sala: {session.salaNome}</Badge>
                              </div>
                            ) : isSelected && (
                              <div className="small text-primary fw-bold">
                                {availableRooms.length} Rooms<br/>
                                <FaDesktop /> {availableRooms.filter(r => r.temPcs).length} | <FaTools /> {availableRooms.filter(r => r.temOficina).length}
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

      {/* --- MODAL --- */}
      <Modal show={showBookingModal} onHide={() => setShowBookingModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>Finalize Schedule</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light">
          <h5 className="mb-3">1. Select Teacher & Module</h5>
          {suggestions.length === 0 ? (
            <Alert variant="warning" className="shadow-sm border-start border-4 border-warning">
              <Alert.Heading className="h6 fw-bold">No Teachers Available</Alert.Heading>
              <p className="small mb-0">No assigned teachers are available for the entire selected slot range ({selectedSlots.length} slots).</p>
            </Alert>
          ) : (
            <ListGroup className="shadow-sm mb-4">
              {suggestions.map((s, idx) => (
                <ListGroup.Item 
                  key={idx} 
                  action 
                  active={selectedSuggestion === s}
                  onClick={() => setSelectedSuggestion(s)}
                  className="d-flex justify-content-between align-items-center"
                >
                  <div>
                    <div className="fw-bold">{s.moduleName}</div>
                    <div className="small opacity-75">{s.teacherName}</div>
                  </div>
                  <div className="text-end">
                     <Badge bg="success" className="me-1">{s.hoursCompleted}h Done</Badge>
                     <Badge bg="warning" text="dark">{(s.totalDuration - s.hoursCompleted)}h Left</Badge>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}

          {selectedSuggestion && suggestions.length > 0 && (
            <div className="bg-white p-3 rounded border shadow-sm animate__animated animate__fadeIn">
              <h5 className="mb-3">2. Choose Room & Confirm</h5>
              <Row className="align-items-end">
                <Col md={8}>
                  <Form.Group>
                    <Form.Label className="small fw-bold">Available Rooms (Slot-Safe)</Form.Label>
                    <Form.Select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)}>
                      <option value="">-- Select a Room --</option>
                      {availableRooms.map(room => (
                        <option key={room.id} value={room.id}>
                          {room.nome} {room.temPcs ? '💻' : ''} {room.temOficina ? '🛠️' : ''}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Button variant="success" className="w-100 py-2" disabled={!selectedRoomId || bookingLoading} onClick={handleConfirmBooking}>
                    {bookingLoading ? <Spinner size="sm" /> : <><FaCheckCircle className="me-2"/> Confirm Bulk</>}
                  </Button>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default TurmaScheduleAdmin;