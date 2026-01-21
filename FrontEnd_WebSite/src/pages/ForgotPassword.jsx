// \src\pages\ForgotPassword.jsx

import React, { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${ServerIP}/api/Api/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Ensure "Email" matches the C# property name casing
                body: JSON.stringify({ Email: email }) 
            });

            if (res.ok) {
                setMessage("Check your email for a reset link.");
            } else {
                console.error("Server responded with error:", res.status);
                setMessage("An error occurred. Please try again.");
            }
        } catch (err) {
            console.error("Fetch failed:", err);
            setMessage("Could not connect to the server.");
        }
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


export default ForgotPassword;