// /src/App.jsx

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

// components:
import NavBar from './components/NavBar';
import Footer from './components/Footer';

// Login / Pass Recovery Pages
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx'; 
import ResetPassword from './pages/ResetPassword.jsx'; 

// Login Related Pages
import ActivateAccount from './pages/ActivateAccount.jsx';
import Verify2FA from './pages/Verify2FA.jsx';

// General Purpose Pages
import Home from './pages/Home.jsx';
import UserManagement from './pages/UserManagement.jsx';
import UserProfile from './pages/UserProfile.jsx'; 

// Management
import SalaManagement from './pages/SalaManagement.jsx';
import ModuleManagement from './pages/ModuleManagement.jsx';
import CourseManagement from './pages/CourseManagement.jsx';
import TurmaManagement from './pages/TurmaManagement.jsx';
import TeacherModuleManager from './pages/TeacherModuleManager.jsx';
import AdminTeacherSchedule from './pages/AdminTeacherSchedule.jsx';

// Teacher Management
import TeacherAvailability from './pages/TeacherAvailability.jsx';
import TurmaDashboard from './pages/TurmaDashboard.jsx';

// Grades 
import ModuleGrades from './pages/ModuleGrades.jsx'; // for Teachers and Admins
import StudentReport from './pages/StudentReport.jsx'; // for Students


// Enroll Students
import EnrollmentManagement from './pages/EnrollmentManagement.jsx';



function NavigationWrapper() {
  const location = useLocation();
  
  // Normalize paths to lowercase to prevent matching issues
  const currentPath = location.pathname.toLowerCase();
  const hideNavbarPaths = ['/login', '/register', '/forgotpassword', '/resetpassword'];

  const shouldHide = hideNavbarPaths.includes(currentPath);

  return (
    <>
      {!shouldHide && <NavBar />}
      
      <div style={{ marginTop: shouldHide ? '0' : '80px' }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/ForgotPassword" element={<ForgotPassword />} />
          <Route path="/ResetPassword" element={<ResetPassword />} />
          <Route path="/activate" element={<ActivateAccount />} />
          <Route path="/verify-2fa" element={<Verify2FA />} />

          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/userProfile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          
          {/* Admin Protected Routes */}
          <Route path="/UserManagement" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="/SalaManagement" element={<ProtectedRoute><SalaManagement /></ProtectedRoute>} />
          <Route path="/ModuleManagement" element={<ProtectedRoute><ModuleManagement /></ProtectedRoute>} />
          <Route path="/CourseManagement" element={<ProtectedRoute><CourseManagement /></ProtectedRoute>} />
          <Route path="/TurmaManagement" element={<ProtectedRoute><TurmaManagement /></ProtectedRoute>} />
          <Route path="/TeacherModuleManager" element={<ProtectedRoute><TeacherModuleManager /></ProtectedRoute>} />
          <Route path="/AdminTeacherSchedule" element={<ProtectedRoute><AdminTeacherSchedule /></ProtectedRoute>} />

          {/* Teacher Mangement */}
          <Route path="/TeacherAvailability" element={<ProtectedRoute><TeacherAvailability /></ProtectedRoute>} />
          <Route path="/TurmaDashboard" element={<ProtectedRoute><TurmaDashboard /></ProtectedRoute>} />

          {/* Grades */}
          <Route path="/turma/:turmaId/module/:moduleId/grades" element={<ProtectedRoute><ModuleGrades /></ProtectedRoute>} />
          <Route path="/student-report/:turmaId" element={<ProtectedRoute><StudentReport /></ProtectedRoute>} />

          {/* Enroll Students */}
          <Route path="/EnrollmentManagement" element={<ProtectedRoute><EnrollmentManagement /></ProtectedRoute>} />

          {/* Catch-all: Redirect to Home or 404 */}
          <Route path="*" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        </Routes>
      </div>

      {!shouldHide && <Footer />}
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