import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;

const ActivateAccount = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('activating'); // 'activating', 'success', 'error'
    const [message, setMessage] = useState('');

    useEffect(() => {
        const activate = async () => {
            const code = searchParams.get('code');
            if (!code) {
                setStatus('error');
                setMessage('No activation code found.');
                return;
            }

            try {
                const response = await fetch(`${ServerIP}/api/Api/activate?code=${encodeURIComponent(code)}`);
                const data = await response.json();

                if (response.ok) {
                    setStatus('success');
                    setMessage(data.message);
                } else {
                    setStatus('error');
                    setMessage(data.message);
                }
            } catch (err) {
                setStatus('error');
                setMessage('Could not connect to the server.');
            }
        };

        activate();
    }, [searchParams]);

    return (
        <div className="container text-center mt-5">
            <div className="card p-5 shadow mx-auto" style={{ maxWidth: '500px' }}>
                {status === 'activating' && <h2>Activating your account...</h2>}
                
                {status === 'success' && (
                    <>
                        <h2 className="text-success">Success!</h2>
                        <p>{message}</p>
                        <Link to="/login" className="btn btn-primary mt-3">Go to Login</Link>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <h2 className="text-danger">Oops!</h2>
                        <p>{message}</p>
                        <Link to="/register" className="btn btn-outline-secondary mt-3">Try Registering Again</Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default ActivateAccount;