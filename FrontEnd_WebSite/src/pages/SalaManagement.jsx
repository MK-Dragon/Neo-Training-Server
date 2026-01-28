// /src/pages/SalaManagement.jsx

import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Row, Col, Card, Pagination } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const SalaManagement = () => {
  const [salas, setSalas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSala, setEditingSala] = useState(null);
  const [formData, setFormData] = useState({ nome: '', temPcs: 0, temOficina: 0 });
  const [error, setError] = useState('');

  // --- Filter, Sort & Pagination State ---
  const [filterPcs, setFilterPcs] = useState('all');
  const [filterOficina, setFilterOficina] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'asc' });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default 10

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchSalas();
  }, []);

  const fetchSalas = async () => {
    try {
      const response = await fetch(`${ServerIP}/api/Salas/all-salas`);
      if (response.ok) {
        const data = await response.json();
        setSalas(data);
      }
    } catch (err) {
      setError("Failed to fetch rooms.");
    }
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // 1. Filter and Sort the full list
  const processedSalas = [...salas]
    .filter(sala => {
      const matchesPcs = filterPcs === 'all' || sala.temPcs.toString() === filterPcs;
      const matchesOficina = filterOficina === 'all' || sala.temOficina.toString() === filterOficina;
      return matchesPcs && matchesOficina;
    })
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  // 2. Calculate Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedSalas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(processedSalas.length / itemsPerPage);

  // Reset to page 1 if filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPcs, filterOficina, itemsPerPage]);

  const handleOpenModal = (sala = null) => {
    if (sala) {
      setEditingSala(sala);
      setFormData({ nome: sala.nome, temPcs: sala.temPcs, temOficina: sala.temOficina });
    } else {
      setEditingSala(null);
      setFormData({ nome: '', temPcs: 0, temOficina: 0 });
    }
    setShowModal(true);
  };

  // ... (handleSubmit and handleDelete remain the same as previous)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editingSala ? 'PUT' : 'POST';
    const endpoint = editingSala ? '/api/Salas/update-sala' : '/api/Salas/create-sala';
    const body = editingSala ? { ...formData, id: editingSala.id } : formData;
    try {
      const response = await fetch(`${ServerIP}${endpoint}`, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (response.ok) { setShowModal(false); fetchSalas(); }
    } catch (err) { setError("Server error."); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      const response = await fetch(`${ServerIP}/api/Salas/delete-sala/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) fetchSalas();
    } catch (err) { setError("Delete failed."); }
  };

  return (
    <Container className="mt-5 pt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Sala Management</h2>
        <Button variant="success" onClick={() => handleOpenModal()}>+ Create New Sala</Button>
      </div>

      <Card className="mb-4 shadow-sm border-0 bg-light">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={3}>
              <Form.Label className="fw-bold">PC Availability</Form.Label>
              <Form.Select value={filterPcs} onChange={(e) => setFilterPcs(e.target.value)}>
                <option value="all">All Rooms</option>
                <option value="1">With PCs</option>
                <option value="0">Without PCs</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="fw-bold">Workshop Status</Form.Label>
              <Form.Select value={filterOficina} onChange={(e) => setFilterOficina(e.target.value)}>
                <option value="all">All Rooms</option>
                <option value="1">With Workshop</option>
                <option value="0">Without Workshop</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="fw-bold">Show per page</Form.Label>
              <Form.Select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                <option value={5}>5 rooms</option>
                <option value={10}>10 rooms</option>
                <option value={20}>20 rooms</option>
                <option value={50}>50 rooms</option>
              </Form.Select>
            </Col>
            <Col md={3} className="d-flex justify-content-end">
              <Button variant="outline-secondary" onClick={() => { setFilterPcs('all'); setFilterOficina('all'); setItemsPerPage(10); }}>
                Reset
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Table striped bordered hover responsive>
        <thead className="table-dark">
          <tr>
            <th onClick={() => requestSort('id')} style={{ cursor: 'pointer' }}>ID {sortConfig.key === 'id' ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕️'}</th>
            <th onClick={() => requestSort('nome')} style={{ cursor: 'pointer' }}>Name {sortConfig.key === 'nome' ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕️'}</th>
            <th>Has PCs?</th>
            <th>Has Workshop?</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((sala) => (
            <tr key={sala.id}>
              <td>{sala.id}</td>
              <td>{sala.nome}</td>
              <td>{sala.temPcs === 1 ? '✅ Yes' : '❌ No'}</td>
              <td>{sala.temOficina === 1 ? '✅ Yes' : '❌ No'}</td>
              <td>
                <Button variant="warning" size="sm" className="me-2 text-dark" onClick={() => handleOpenModal(sala)}>Edit</Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(sala.id)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* --- Pagination Controls --- */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-3">
          <Pagination>
            <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
            <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} />
            
            {[...Array(totalPages)].map((_, idx) => (
              <Pagination.Item 
                key={idx + 1} 
                active={idx + 1 === currentPage} 
                onClick={() => setCurrentPage(idx + 1)}
              >
                {idx + 1}
              </Pagination.Item>
            ))}

            <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} />
            <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
          </Pagination>
        </div>
      )}

      {/* Modal code remains the same as previous */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingSala ? 'Edit Sala' : 'New Sala'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Name (Nome)</Form.Label>
              <Form.Control type="text" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
            </Form.Group>
            <Form.Check type="checkbox" label="Has PCs (Tem PCs)" checked={formData.temPcs === 1} onChange={(e) => setFormData({...formData, temPcs: e.target.checked ? 1 : 0})} className="mb-2" />
            <Form.Check type="checkbox" label="Has Workshop (Tem Oficina)" checked={formData.temOficina === 1} onChange={(e) => setFormData({...formData, temOficina: e.target.checked ? 1 : 0})} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Changes</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default SalaManagement;