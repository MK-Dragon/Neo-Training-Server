import React, { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await fetch('https://localhost:7089/api/Api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        setMessage("Check your email for a reset link.");
    };

    return (
        <Container className="mt-5" style={{ maxWidth: '400px' }}>
            <h3>Recover Password</h3>
            {message && <Alert variant="info">{message}</Alert>}
            <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                    <Form.Label>Email Address</Form.Label>
                    <Form.Control type="email" required onChange={e => setEmail(e.target.value)} />
                </Form.Group>
                <Button type="submit" className="w-100">Send Reset Link</Button>
            </Form>
        </Container>
    );
};

