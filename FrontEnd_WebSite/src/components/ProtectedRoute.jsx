import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    // No token? Send them to login
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;