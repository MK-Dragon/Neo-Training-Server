// /src/App.jsx

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';


// components:
import NavBar from './components/NavBar';
import Footer from './components/Footer';


// Login / Pass Recovery Pages
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx'; <Route path="/ForgotPassword" element={<ForgotPassword />} />
import ResetPassword from './pages/ResetPassword.jsx'; <Route path="/ResetPassword" element={<ResetPassword />} />



// Login Related Pages
import ActivateAccount from './pages/ActivateAccount.jsx';
import Verify2FA from './pages/Verify2FA.jsx';

// General Porpose Pages
import Home from './pages/Home.jsx';
import UserManagement from './pages/UserManagement.jsx';
import UserProfile from './pages/UserProfile.jsx'; <Route path="/profile" element={<UserProfile />} />



// This helper component handles the logic
function NavigationWrapper() {
  const location = useLocation();
  
  // Define paths where you DON'T want the navbar
  const hideNavbarPaths = ['/login', '/register'];

  return (
    <>
      {/* Only show NavBar if current path is NOT in the hide list */}
      {!hideNavbarPaths.includes(location.pathname) && <NavBar />}
      
      <div style={{ marginTop: location.pathname === '/login' ? '0' : '80px' }}>
        <Routes>
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          {/* Login */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/ForgotPassword" element={<ForgotPassword />} />
          <Route path="/ResetPassword" element={<ResetPassword />} />

          {/* Login Related */}
          <Route path="/activate" element={<ActivateAccount />} />
          <Route path="/verify-2fa" element={<Verify2FA />} />
          
          {/* User Destinations */}
          <Route path="/userProfile" element={<UserProfile />} />
          <Route path="/UserManagement" element={<UserManagement />} />
        </Routes>
      </div>

      {!hideNavbarPaths.includes(location.pathname) && <Footer />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <NavigationWrapper />
    </BrowserRouter>
  );
}

export default App;