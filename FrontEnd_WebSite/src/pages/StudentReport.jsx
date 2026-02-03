// src/pages/StudentReport.jsx
import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, Table, Card, Badge, Spinner, 
  Breadcrumb, Alert, Row, Col, Button 
} from 'react-bootstrap';
import html2pdf from 'html2pdf.js'; // Import the library

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const StudentReport = () => {
  const { turmaId } = useParams();
  const navigate = useNavigate();
  const reportRef = useRef(); // Reference to the element we want to print
  
  const studentId = localStorage.getItem('userId');
  const username = localStorage.getItem('username') || "Student";

  const [grades, setGrades] = useState([]);
  const [turmaInfo, setTurmaInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!studentId || !turmaId) {
      setError("Information missing.");
      setLoading(false);
      return;
    }
    loadData();
  }, [studentId, turmaId]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchReport(), fetchTurmaDetails()]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchReport = async () => {
    const res = await fetch(`${ServerIP}/api/StudentGrades/student-report?studentId=${studentId}&turmaId=${turmaId}`);
    if (res.ok) setGrades(await res.json());
  };

  const fetchTurmaDetails = async () => {
    const res = await fetch(`${ServerIP}/api/Turma/turma/${turmaId}`);
    if (res.ok) setTurmaInfo(await res.json());
  };

  // --- PDF GENERATION FUNCTION ---
  const downloadPDF = () => {
    const element = reportRef.current;
    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `Report_Card_${username}_${turmaInfo?.turmaName || 'Course'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true }, // Higher scale = better quality
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  const getStatusBadge = (grade) => {
    if (grade === null || grade === undefined) {
      return <Badge pill bg="secondary" className="px-3 py-2 fw-normal opacity-75">Not Graded</Badge>;
    }
    return grade >= 10 
      ? <Badge pill bg="success" className="px-3 py-2 fw-normal">Passed</Badge>
      : <Badge pill bg="danger" className="px-3 py-2 fw-normal">Failed</Badge>;
  };

  if (loading) return <Container className="text-center mt-5"><Spinner animation="border" variant="info" /></Container>;

  return (
    <Container className="mt-5 pt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Breadcrumb className="mb-0">
          <Breadcrumb.Item onClick={() => navigate('/')}>Home</Breadcrumb.Item>
          <Breadcrumb.Item active>My Report Card</Breadcrumb.Item>
        </Breadcrumb>
        
        {/* DOWNLOAD BUTTON */}
        <Button variant="outline-primary" onClick={downloadPDF}>
          <i className="bi bi-file-earmark-pdf me-2"></i> Download PDF
        </Button>
      </div>

      {/* WRAP THE CARD IN THE REF */}
      <div ref={reportRef}>
        <Card className="shadow-sm border-0">
          <Card.Header className="bg-info text-white p-4">
            <Row className="align-items-center">
              <Col md={7}>
                <h3 className="mb-1">Academic Report Card</h3>
                <h5 className="mb-0 opacity-90 fw-light">
                  {turmaInfo?.courseName} — {turmaInfo?.turmaName}
                </h5>
              </Col>
              <Col md={5} className="text-md-end mt-3 mt-md-0">
                 <div className="d-flex flex-column align-items-md-end">
                   <span className="fs-5 fw-bold mb-1">{username}</span>
                   <div className="small opacity-75">Student ID: {studentId}</div>
                 </div>
              </Col>
            </Row>
          </Card.Header>
          
          <Card.Body className="p-4">
            <Table hover responsive className="align-middle">
              <thead className="table-light">
                <tr>
                  <th className="py-3">Module Name</th>
                  <th className="py-3 text-center">Grade (0-20)</th>
                  <th className="py-3 text-center">Evaluation Status</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((item, index) => {
                  const gradeVal = item.grade ?? item.Grade;
                  return (
                    <tr key={index}>
                      <td className="fw-semibold text-secondary">{item.moduleName ?? item.ModuleName}</td>
                      <td className="text-center fs-5">
                        {gradeVal !== null ? (
                          <span className={gradeVal >= 10 ? "text-success fw-bold" : "text-danger fw-bold"}>
                            {gradeVal}
                          </span>
                        ) : <span className="text-muted opacity-50">—</span>}
                      </td>
                      <td className="text-center">{getStatusBadge(gradeVal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card.Body>
          
          <Card.Footer className="bg-light text-muted small py-3 d-flex justify-content-between">
              <span>Student: <strong>{username}</strong></span>
              <span>Generated on: {new Date().toLocaleDateString()}</span>
          </Card.Footer>
        </Card>
      </div>
    </Container>
  );
};

export default StudentReport;