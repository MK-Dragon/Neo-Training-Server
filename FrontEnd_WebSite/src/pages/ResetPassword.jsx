import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Container, Form, Button, Alert } from 'react-bootstrap';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const email = searchParams.get('email');
    const token = searchParams.get('token');

    const handleReset = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        const res = await fetch('https://localhost:7089/api/Api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, token, newPassword })
        });

        if (res.ok) {
            alert("Password reset successful!");
            navigate('/login');
        }
    };

    return (
        <Container className="mt-5" style={{ maxWidth: '400px' }}>
            <h3>Set New Password</h3>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleReset}>
                <Form.Group className="mb-3">
                    <Form.Label>New Password</Form.Label>
                    <Form.Control type="password" required onChange={e => setNewPassword(e.target.value)} />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Confirm Password</Form.Label>
                    <Form.Control type="password" required onChange={e => setConfirmPassword(e.target.value)} />
                </Form.Group>
                <Button type="submit" variant="primary" className="w-100">Update Password</Button>
            </Form>
        </Container>
    );
};

export default ResetPassword;