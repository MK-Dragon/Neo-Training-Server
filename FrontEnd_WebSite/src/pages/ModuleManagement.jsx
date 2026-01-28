// /src/pages/ModuleManagement.jsx

import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Row, Col, Card, Pagination, InputGroup, Badge } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const ModuleManagement = () => {
  const [modules, setModules] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [formData, setFormData] = useState({ name: '', durationH: 0, isDeleted: 0 });
  const [error, setError] = useState('');

  // Search, Sort, Filter & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'Id', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const response = await fetch(`${ServerIP}/api/Module/allmodules`);
      if (response.ok) {
        const data = await response.json();
        setModules(data);
      }
    } catch (err) {
      setError("Failed to fetch modules.");
    }
  };

  const handleOpenModal = (mod = null) => {
    if (mod) {
      setEditingModule(mod);
      // Use the normalization trick here too
      setFormData({ 
        name: mod.Name ?? mod.name ?? '', 
        durationH: mod.DurationInHours ?? mod.durationInHours ?? 0, 
        isDeleted: mod.isDeleted ?? mod.IsDeleted ?? 0 
      });
    } else {
      setEditingModule(null);
      setFormData({ name: '', durationH: 0, isDeleted: 0 });
    }
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      let response;
      if (editingModule) {
        // MUST match the C# ModuleUpdate class properties exactly
        const updateData = {
          ModuleId: editingModule.Id ?? editingModule.id, // Correct the ID link
          Name: formData.name,
          DurationH: formData.durationH,
          IsDeleted: formData.isDeleted
        };

        response = await fetch(`${ServerIP}/api/Module/update-module`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(updateData)
        });
      } else {
        // POST remains the same (Query Params)
        const params = new URLSearchParams({
          Name: formData.name,
          DurationInHours: formData.durationH
        });
        response = await fetch(`${ServerIP}/api/Module/addmodule?${params.toString()}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      if (response.ok) {
        setShowModal(false);
        fetchModules();
      } else {
        const msg = await response.text();
        setError(msg || "Operation failed.");
      }
    } catch (err) {
      setError("Communication error with server.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Mark this module as deleted?")) return;
    try {
      const response = await fetch(`${ServerIP}/api/Module/delete-module/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) fetchModules();
    } catch (err) {
      setError("Delete failed.");
    }
  };

  // --- Logic Chain: Filter -> Sort -> Paginate ---
  
  const processedModules = modules
  .filter(m => {
    // We check both Name and name just in case
    const moduleName = m.Name || m.name || "";
    const isModuleDeleted = m.isDeleted ?? m.IsDeleted ?? 0;

    const matchesSearch = moduleName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDeleted = showDeleted ? true : isModuleDeleted === 0;
    
    return matchesSearch && matchesDeleted;
  })
  .sort((a, b) => {
    const key = sortConfig.key;
    // Helper to get value regardless of casing
    const valA = a[key] ?? a[key.toLowerCase()] ?? '';
    const valB = b[key] ?? b[key.toLowerCase()] ?? '';
    
    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(processedModules.length / itemsPerPage);
  const currentItems = processedModules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 if filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showDeleted, itemsPerPage]);

  return (
    <Container className="mt-5 pt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Module Management</h2>
        <Button variant="success" onClick={() => handleOpenModal()}>+ Add Module</Button>
      </div>

      <Card className="mb-4 shadow-sm border-0 bg-light">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={5}>
              <Form.Label className="fw-bold">Search Module</Form.Label>
              <InputGroup>
                <InputGroup.Text>🔍</InputGroup.Text>
                <Form.Control 
                  placeholder="Search by name..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Label className="fw-bold">Items Per Page</Form.Label>
              <Form.Select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </Form.Select>
            </Col>
            <Col md={5} className="d-flex justify-content-end align-items-center">
              <Form.Check 
                type="switch" 
                id="deleted-switch"
                label="Show Deleted Modules" 
                checked={showDeleted} 
                onChange={(e) => setShowDeleted(e.target.checked)} 
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Table striped bordered hover responsive>
        <thead className="table-dark">
          <tr style={{ cursor: 'pointer' }}>
            <th onClick={() => setSortConfig({ key: 'Id', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
              ID {sortConfig.key === 'Id' ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
            </th>
            <th onClick={() => setSortConfig({ key: 'Name', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
              Module Name {sortConfig.key === 'Name' ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
            </th>
            <th onClick={() => setSortConfig({ key: 'DurationInHours', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc' })}>
              Duration {sortConfig.key === 'DurationInHours' ? (sortConfig.direction === 'asc' ? '🔼' : '🔽') : '↕️'}
            </th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
            {currentItems.map((m) => {
                // Normalize properties for the render
                const id = m.Id ?? m.id;
                const name = m.Name ?? m.name;
                const duration = m.DurationInHours ?? m.durationInHours;
                const deleted = m.isDeleted ?? m.IsDeleted ?? 0;

                return (
                <tr key={id} className={deleted === 1 ? "table-secondary" : ""}>
                    <td>{id}</td>
                    <td className={deleted === 1 ? "text-decoration-line-through text-muted" : ""}>
                    {name}
                    </td>
                    <td>{duration}h</td>
                    <td>
                    <Badge bg={deleted === 1 ? "danger" : "success"}>
                        {deleted === 1 ? "Deleted" : "Active"}
                    </Badge>
                    </td>
                    <td>
                    <Button variant="warning" size="sm" className="me-2 text-dark" onClick={() => handleOpenModal(m)}>Edit</Button>
                    {deleted === 0 && (
                        <Button variant="danger" size="sm" onClick={() => handleDelete(id)}>Delete</Button>
                    )}
                    </td>
                </tr>
                );
            })}
        </tbody>
      </Table>

      {totalPages > 1 && (
        <div className="d-flex justify-content-center">
          <Pagination>
            <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
            <Pagination.Prev onClick={() => setCurrentPage(c => Math.max(1, c - 1))} disabled={currentPage === 1} />
            {[...Array(totalPages)].map((_, i) => (
              <Pagination.Item key={i+1} active={i+1 === currentPage} onClick={() => setCurrentPage(i+1)}>
                {i+1}
              </Pagination.Item>
            ))}
            <Pagination.Next onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))} disabled={currentPage === totalPages} />
            <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
          </Pagination>
        </div>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editingModule ? 'Edit Module' : 'Create New Module'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Module Name</Form.Label>
              <Form.Control 
                type="text" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                required 
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Duration (Hours)</Form.Label>
              <Form.Control 
                type="number" 
                min="0"
                value={formData.durationH} 
                onChange={(e) => setFormData({...formData, durationH: Number(e.target.value)})} 
                required 
              />
            </Form.Group>
            {editingModule && (
              <Form.Check 
                type="switch" 
                id="modal-isDeleted-switch"
                label="Status: Deleted" 
                checked={formData.isDeleted === 1}
                onChange={(e) => setFormData({...formData, isDeleted: e.target.checked ? 1 : 0})}
              />
            )}
          </Modal.Body>
          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">
              {editingModule ? 'Update Module' : 'Add Module'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ModuleManagement;