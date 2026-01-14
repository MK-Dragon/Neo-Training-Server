import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const Verify2FA = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('processing');
    const navigate = useNavigate();

    useEffect(() => {
        const verify = async () => {
            const code = searchParams.get('code');
            
            try {
                const response = await fetch(`https://localhost:7089/api/Api/verify-2fa?code=${encodeURIComponent(code)}`);
                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('token', data.token); // Save final JWT
                    alert("Verification successful!");
                    navigate('/');
                } else {
                    alert(data.message); // Shows "2FA Link expired"
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