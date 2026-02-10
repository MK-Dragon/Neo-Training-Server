import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Form, Row, Col, Button, Badge, Spinner, Alert, Modal, ListGroup, ProgressBar } from 'react-bootstrap';
import { format, startOfWeek, addDays, addHours, isSameHour, parseISO } from 'date-fns';
import { FaDesktop, FaTools, FaCalendarPlus, FaTrash, FaEdit, FaClock, FaChalkboardTeacher, FaBookOpen, FaDoorOpen } from 'react-icons/fa';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const TurmaScheduleAdmin = () => {
  const [activeTurmas, setActiveTurmas] = useState([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedSlots, setSelectedSlots] = useState([]); 
  const [availableRooms, setAvailableRooms] = useState([]);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [progressData, setProgressData] = useState({}); // Stores { moduleId: progressDTO }
  const [modalLoading, setModalLoading] = useState(false);
  
  const [currentSessionDetails, setCurrentSessionDetails] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    const fetchTurmas = async () => {
      try {
        const res = await fetch(`${ServerIP}/api/Turma/all-active-turmas`);
        if (res.ok) setActiveTurmas(await res.json());
      } catch (err) { setError("Failed to load Turmas."); }
    };
    fetchTurmas();
  }, []);

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

  const handleSlotClick = (day, hour, session) => {
    if (session) {
      setSelectedSlots([{ day, hour, isExisting: true, sessionData: session }]);
      return;
    }
    
    const isSelected = selectedSlots.some(s => !s.isExisting && format(s.day, 'yyyyMMdd') === format(day, 'yyyyMMdd') && s.hour === hour);
    if (isSelected) {
      setSelectedSlots(selectedSlots.filter(s => !(format(s.day, 'yyyyMMdd') === format(day, 'yyyyMMdd') && s.hour === hour)));
      return;
    }

    if (selectedSlots.length > 0 && !selectedSlots[0].isExisting) {
      const sorted = [...selectedSlots].sort((a, b) => a.hour - b.hour);
      const sameDay = format(day, 'yyyyMMdd') === format(sorted[0].day, 'yyyyMMdd');
      const isAdjacent = hour === sorted[0].hour - 1 || hour === sorted[sorted.length - 1].hour + 1;
      if (sameDay && isAdjacent) setSelectedSlots([...selectedSlots, { day, hour }]);
      else setSelectedSlots([{ day, hour }]); 
    } else {
      setSelectedSlots([{ day, hour }]);
    }
  };

  const handleOpenModal = async () => {
    setModalLoading(true);
    const isExisting = !!selectedSlots[0].isExisting;
    setIsEditMode(isExisting);
    
    const sorted = [...selectedSlots].sort((a, b) => a.hour - b.hour);
    const dayStr = format(sorted[0].day, 'yyyy-MM-dd');
    const start = `${dayStr}T${String(sorted[0].hour).padStart(2, '0')}:00:00`;
    const end = `${dayStr}T${String(sorted[sorted.length - 1].hour).padStart(2, '0')}:00:00`;

    try {
      const suggUrl = `${ServerIP}/api/ModuleTurmaTeacher/suggest-teacher-module?TurmaId=${selectedTurmaId}&StartTime=${start}&EndTime=${end}`;
      const suggRes = await fetch(suggUrl);
      const suggestionsList = await suggRes.json();
      const finalSuggestions = Array.isArray(suggestionsList) ? suggestionsList : (suggestionsList.data || []);
      setSuggestions(finalSuggestions);

      const uniqueModuleIds = [...new Set(finalSuggestions.map(s => s.moduleId))];
      const progressMap = {};
      
      await Promise.all(uniqueModuleIds.map(async (mId) => {
        try {
          const pRes = await fetch(`${ServerIP}/api/Shcedule/module-progress/${selectedTurmaId}/${mId}`);
          if (pRes.ok) progressMap[mId] = await pRes.json();
        } catch (e) { console.error("Progress fetch error", e); }
      }));
      setProgressData(progressMap);

      if (isExisting) {
        const detailRes = await fetch(`${ServerIP}/api/Shcedule/details?turmaId=${selectedTurmaId}&dateTime=${start}`);
        if (detailRes.ok) {
          const details = await detailRes.json();
          setCurrentSessionDetails(details);
          setEditingScheduleId(details.scheduleId);
          setSelectedRoomId(details.salaId.toString());
          setSelectedSuggestion({
            teacherId: details.teacherId,
            teacherName: details.teacherName,
            moduleId: details.moduleId,
            moduleName: details.moduleName
          });
        }
      } else {
        setCurrentSessionDetails(null);
        setSelectedSuggestion(null);
        setSelectedRoomId('');
        setEditingScheduleId(null);
      }

      setShowModal(true);
    } catch (err) {
      alert("Error preparing data.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedSuggestion || !selectedRoomId) return;
    setModalLoading(true);

    const sorted = [...selectedSlots].sort((a, b) => a.hour - b.hour);
    const dayStr = format(sorted[0].day, 'yyyy-MM-dd');
    const start = `${dayStr}T${String(sorted[0].hour).padStart(2, '0')}:00:00`;

    const roomObject = availableRooms.find(r => r.id.toString() === selectedRoomId.toString());
    const finalSalaNome = roomObject ? roomObject.nome : (currentSessionDetails?.salaNome || "");

    const payload = {
      ScheduleId: editingScheduleId || 0,
      TurmaId: parseInt(selectedTurmaId),
      TurmaName: activeTurmas.find(t => t.turmaId.toString() === selectedTurmaId.toString())?.turmaName || "",
      ModuleId: selectedSuggestion.moduleId,
      ModuleName: selectedSuggestion.moduleName,
      TeacherId: selectedSuggestion.teacherId,
      TeacherName: selectedSuggestion.teacherName,
      SalaId: parseInt(selectedRoomId),
      SalaNome: finalSalaNome,
      DateTime: start
    };

    try {
      let res;
      if (isEditMode) {
        res = await fetch(`${ServerIP}/api/Shcedule/update-schedule`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        const end = `${dayStr}T${String(sorted[sorted.length - 1].hour).padStart(2, '0')}:00:00`;
        res = await fetch(`${ServerIP}/api/Shcedule/add-schedule-bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ...payload, 
            FormadorId: selectedSuggestion.teacherId, 
            StartTime: start, 
            EndTime: end 
          })
        });
      }

      if (res.ok) {
        setShowModal(false);
        setSelectedSlots([]);
        fetchSchedule();
      } else {
        const data = await res.json();
        alert(`Error: ${data.message || "Operation failed"}`);
      }
    } catch (err) { 
      alert("Network error."); 
    } finally { 
      setModalLoading(false); 
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this class?")) return;
    setModalLoading(true);
    try {
      const res = await fetch(`${ServerIP}/api/Shcedule/delete-schedule/${editingScheduleId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setShowModal(false);
        setSelectedSlots([]);
        fetchSchedule();
      }
    } catch (err) { alert("Error deleting."); }
    finally { setModalLoading(false); }
  };

  const days = [...Array(7)].map((_, i) => addDays(currentWeek, i));
  const hours = [...Array(15)].map((_, i) => i + 8); 

  return (
    <Container fluid className="mt-5 pt-4 px-4">
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
            </Col>
            <Col md={6} className="text-end">
              {selectedSlots.length > 0 && selectedSlots[0].isExisting ? (
                <Button variant="warning" size="lg" onClick={handleOpenModal}>
                    <FaEdit className="me-2"/> Edit Session
                </Button>
              ) : (
                <>
                  <Button variant="outline-danger" size="lg" className="me-2" disabled={selectedSlots.length === 0} onClick={() => setSelectedSlots([])}>
                    <FaTrash className="me-2"/> Clear
                  </Button>
                  <Button variant="success" size="lg" disabled={selectedSlots.length === 0} onClick={handleOpenModal}>
                    {modalLoading ? <Spinner size="sm" /> : <><FaCalendarPlus className="me-2"/> Book Block ({selectedSlots.length})</>}
                  </Button>
                </>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

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
                        const isExistingSelect = isSelected && selectedSlots[0].isExisting;

                        return (
                          <td 
                            key={day.toString()} 
                            onClick={() => handleSlotClick(day, hour, session)}
                            style={{ 
                                backgroundColor: isExistingSelect ? '#fff3cd' : (isSelected ? '#cfe2ff' : ''), 
                                cursor: 'pointer' 
                            }}
                          >
                            {session ? (
                              <div className={`h-100 border-start border-4 ${isExistingSelect ? 'border-warning' : 'border-primary'} bg-white shadow-sm p-2 rounded text-start`} style={{ fontSize: '0.8rem' }}>
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
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className={isEditMode ? "bg-warning text-dark" : "bg-success text-white"}>
          <Modal.Title>
            {isEditMode ? <><FaEdit className="me-2"/> Edit Session</> : <><FaCalendarPlus className="me-2"/> Finalize Schedule</>}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light">
          
          <h5 className="mb-3">1. Select Teacher & Module</h5>
          {suggestions.length === 0 && !isEditMode ? (
            <Alert variant="warning">No suggestions available for this range.</Alert>
          ) : (
            <ListGroup className="shadow-sm mb-4" style={{maxHeight: '400px', overflowY: 'auto'}}>
              {suggestions.map((s, idx) => {
                const prog = progressData[s.moduleId];
                const isSelected = selectedSuggestion?.teacherId === s.teacherId && selectedSuggestion?.moduleId === s.moduleId;
                
                return (
                  <ListGroup.Item 
                    key={idx} 
                    action 
                    active={isSelected}
                    onClick={() => setSelectedSuggestion(s)}
                    className="py-3"
                  >
                    <Row className="align-items-center">
                      <Col md={5}>
                        <div className="fw-bold fs-6">{s.moduleName}</div>
                        <div className="small text-muted"><FaChalkboardTeacher className="me-1"/>{s.teacherName}</div>
                      </Col>
                      <Col md={7}>
                        {prog ? (
                          <div className="progress-info">
                            <div className="d-flex justify-content-between mb-1 small fw-bold">
                              <span style={{fontSize: '0.7rem'}} className="text-muted">
                                Taught: {prog.hoursTaught}h | Scheduled: <span className="text-warning">{prog.totalScheduled}h</span>
                              </span>
                              <span className="text-danger" style={{fontSize: '0.7rem'}}>
                                {prog.remainingToSchedule}h Missing
                              </span>
                            </div>
                            <ProgressBar style={{height: '8px'}} className="mb-1">
                               <ProgressBar variant="success" now={(prog.hoursTaught / prog.targetDuration) * 100} key={1} />
                               <ProgressBar variant="warning" now={((prog.totalScheduled - prog.hoursTaught) / prog.targetDuration) * 100} key={2} />
                            </ProgressBar>
                            <div className="text-end text-muted fw-bold" style={{fontSize: '0.65rem'}}>Goal: {prog.targetDuration}h</div>
                          </div>
                        ) : (
                          <div className="text-center small text-muted italic">Loading progress...</div>
                        )}
                      </Col>
                    </Row>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          )}

          <div className="bg-white p-3 rounded border shadow-sm">
            <h5 className="mb-3">2. Choose Room & Confirm</h5>
            <Row>
              <Col xs={12} className="mb-3">
                <Form.Label className="small fw-bold text-muted text-uppercase">Room Selection</Form.Label>
                <Form.Select 
                  value={selectedRoomId} 
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                >
                  <option value="">-- Select a Room --</option>
                  {availableRooms.map(room => (
                    <option key={room.id} value={room.id}>{room.nome}</option>
                  ))}
                </Form.Select>
              </Col>
            </Row>
            
            <Row>
              <Col className="d-flex justify-content-end gap-2">
                {isEditMode && (
                  <Button variant="danger" onClick={handleDelete} disabled={modalLoading}>
                    <FaTrash className="me-2" /> Delete
                  </Button>
                )}
                <Button 
                  variant={isEditMode ? "warning" : "success"} 
                  onClick={handleSave} 
                  disabled={!selectedRoomId || !selectedSuggestion || modalLoading}
                  className={isEditMode ? "text-dark fw-bold" : ""}
                >
                  {modalLoading ? <Spinner size="sm" /> : isEditMode ? 'Update Session' : 'Confirm Booking'}
                </Button>
              </Col>
            </Row>
          </div>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default TurmaScheduleAdmin;