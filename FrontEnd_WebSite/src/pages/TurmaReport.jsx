import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Table, Button, Spinner, Card, Badge } from 'react-bootstrap';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const TurmaReport = () => {
    const { turmaId } = useParams();
    const [loading, setLoading] = useState(true);
    const [turmaInfo, setTurmaInfo] = useState(null);
    const [reportData, setReportData] = useState([]);
    const [moduleList, setModuleList] = useState([]); 
    const pdfRef = useRef();

    useEffect(() => {
        if (turmaId) fetchData();
    }, [turmaId]);

    const fetchData = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            // 1. Get Turma Details
            const turmaRes = await fetch(`${ServerIP}/api/Turma/turma/${turmaId}`, { headers });
            if (!turmaRes.ok) throw new Error("Turma not found");
            const turmaJson = await turmaRes.json();
            setTurmaInfo(turmaJson);

            // 2. Get List of Students
            const studentsRes = await fetch(`${ServerIP}/api/Turma/list-students/${turmaId}`, { headers });
            const students = studentsRes.ok ? await studentsRes.json() : [];

            // 3. Map grades
            const fullReport = await Promise.all(students.map(async (student) => {
                const gradeRes = await fetch(`${ServerIP}/api/StudentGrades/student-report?studentId=${student.userId}&turmaId=${turmaId}`, { headers });
                const grades = gradeRes.ok ? await gradeRes.json() : [];
                return { ...student, grades };
            }));

            // 4. Set Headers
            const allModules = [];
            fullReport.forEach(student => {
                student.grades.forEach(m => {
                    if (!allModules.find(x => x.moduleId === m.moduleId)) {
                        allModules.push({ moduleId: m.moduleId, moduleName: m.moduleName });
                    }
                });
            });

            setModuleList(allModules);
            setReportData(fullReport);
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = async () => {
    const input = pdfRef.current;
    
    // 1. Save original styles to restore later
    const originalWidth = input.style.width;
    const originalOverflow = input.style.overflow;

    // 2. Force the element to its full content width so nothing is hidden
    input.style.width = "max-content"; 
    input.style.overflow = "visible";

    try {
        const canvas = await html2canvas(input, {
            scale: 2, // High quality
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            // Capture the full scroll width of the element
            width: input.scrollWidth,
            height: input.scrollHeight,
            windowWidth: input.scrollWidth
        });

        const imgData = canvas.toDataURL('image/png');
        
        // Use 'l' for landscape since your table is very wide
        const pdf = new jsPDF('l', 'mm', 'a4'); 
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        // Position it with a small top margin
        pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
        pdf.save(`Report_${turmaInfo?.turmaName || 'Turma'}.pdf`);
    } catch (err) {
        console.error("PDF Generation Error:", err);
    } finally {
        // 3. Restore original styles
        input.style.width = originalWidth;
        input.style.overflow = originalOverflow;
    }
};

    if (loading) return (
        <Container className="text-center mt-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Generating Report...</p>
        </Container>
    );

    return (
        <Container className="mt-5 pt-4">
            <div className="d-flex justify-content-between align-items-end mb-4 no-print">
                <div>
                    <h1 className="display-6 fw-bold">Turma Dashboard</h1>
                    <p className="text-muted">Manage and export academic performance.</p>
                </div>
                <Button variant="danger" size="lg" onClick={downloadPDF} className="shadow-sm">
                    <i className="bi bi-file-pdf-fill me-2"></i>Export Official PDF
                </Button>
            </div>

            {/* Everything inside this div is what goes into the PDF */}
            <div ref={pdfRef} className="p-4 bg-white">
                <div className="mb-4 border-bottom pb-3">
                    <h2 className="text-primary fw-bold mb-1">
                        {turmaInfo?.turmaName || "Turma Report"}
                    </h2>
                    <h5 className="text-secondary">
                        Course: <span className="text-dark">{turmaInfo?.courseName || "N/A"}</span>
                    </h5>
                    <div className="d-flex gap-3 mt-2 small text-muted">
                        <span><strong>Report Date:</strong> {new Date().toLocaleDateString()}</span>
                        <span><strong>Total Students:</strong> {reportData.length}</span>
                    </div>
                </div>

                <Table bordered hover responsive className="align-middle text-center">
                    <thead className="table-light">
                        <tr className="align-middle">
                            <th className="text-start" style={{ width: '200px' }}>Student Name</th>
                            {moduleList.map(m => (
                                <th key={m.moduleId} style={{ fontSize: '0.8rem' }}>
                                    {m.moduleName}
                                </th>
                            ))}
                            <th className="bg-primary text-white">Final Average</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.map((student) => {
                            const validGrades = student.grades.filter(g => g.grade !== null);
                            const sum = validGrades.reduce((acc, curr) => acc + curr.grade, 0);
                            const avg = validGrades.length > 0 ? (sum / validGrades.length).toFixed(2) : "0.00";

                            return (
                                <tr key={student.userId}>
                                    <td className="text-start fw-semibold">{student.username}</td>
                                    {moduleList.map(m => {
                                        const g = student.grades.find(grade => grade.moduleId === m.moduleId);
                                        return (
                                            <td key={m.moduleId}>
                                                {g?.grade !== null ? (
                                                    <span className={g?.grade < 9.5 ? "text-danger fw-bold" : ""}>
                                                        {g?.grade}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted small">N/A</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className={`fw-bold ${parseFloat(avg) >= 9.5 ? 'text-success' : 'text-danger'}`}>
                                        {avg}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>

                <div className="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
                    <p className="small text-muted mb-0">
                        * Grading Scale: 0 - 20 | Passing Grade: 9.5
                    </p>
                    <div className="text-end">
                        <div style={{ width: '200px', borderBottom: '1px solid #dee2e6' }} className="mb-1"></div>
                        <span className="small text-muted">Coordinator Signature</span>
                    </div>
                </div>
            </div>
        </Container>
    );
};

export default TurmaReport;