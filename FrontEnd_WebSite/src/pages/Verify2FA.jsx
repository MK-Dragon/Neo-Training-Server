// /src/pages/Verify2FA.jsx

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const Verify2FA = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('processing');
    const navigate = useNavigate();

    useEffect(() => {
        const verify = async () => {
            const code = searchParams.get('code');
            const request = searchParams.get('request');

            if (!code || !request) {
                console.error("Missing code or request ID");
                return;
            }
            
            try {
            // Updated fetch to include the request parameter
            const response = await fetch(
                `${ServerIP}/api/Api/verify-2fa?code=${encodeURIComponent(code)}&request=${request}`
            );
            
            const data = await response.json();

            if (response.ok) {
                // Note: Don't navigate to '/' here! 
                // The phone user just needs to see a success message.
                setStatus('success'); 
                alert("Verified! You can return to your other screen.");
            } else {
                alert(data.message);
                navigate('/login');
            }
        } catch (err) {
            console.error("Verification failed", err);
        }
        };
        verify();
    }, []);

    return <h2>Verifying 2FA... Please wait.</h2>;
};

export default Verify2FA;