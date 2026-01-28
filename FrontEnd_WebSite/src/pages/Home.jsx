// src/pages/Home.jsx

import React, { useEffect } from 'react'; // 1. Added useEffect here
import { Link, useNavigate } from 'react-router-dom'; // 2. Added useNavigate here

const ServerIP = import.meta.env.VITE_IP_PORT_AUTH_SERVER;


const Home = () => {
  const navigate = useNavigate(); // 3. Initialize navigate inside the component

  useEffect(() => {
    const verifyToken = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${ServerIP}/api/Api/verify`, {
        method: 'GET', // Cleaner than POST for a simple check
        headers: {
          'Authorization': `Bearer ${token}`, // The middleware looks specifically for this
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        //console.log("Verified user:", data.user);
        console.log("Verified username:", data.username);
        localStorage.setItem("username", data.username);
        console.log("User Role:", data.role);
        localStorage.setItem("userRole", data.role);

      } else {
        // Token is expired, tampered with, or invalid
        localStorage.removeItem('token');
        navigate('/login');
      }
    } catch (err) {
      console.error("Network error - is the API running?");
    }
  };

    verifyToken();
  }, [navigate]); // Added navigate to the dependency array

  const cardStyle = {
    transition: 'transform 0.2s ease-in-out',
    cursor: 'pointer'
  };

  return (
    <section className="bg-light py-5 min-vh-100 d-flex align-items-center">
      <div className="container text-center">
        <h1>Hello World</h1>
        <p>If you see this, you are authenticated!</p>
      </div>
    </section>
  );
};

export default Home;