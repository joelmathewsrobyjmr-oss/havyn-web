import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SplashView from './pages/SplashView';
import RoleSelectionView from './pages/RoleSelectionView';
import LoginView from './pages/LoginView';
import DashboardView from './pages/DashboardView';
import ResidentListView from './pages/ResidentListView';
import ResidentFormView from './pages/ResidentFormView';
import AttendanceView from './pages/AttendanceView';
import AttendanceReportView from './pages/AttendanceReportView';
import MainLayout from './layouts/MainLayout';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<SplashView />} />
          <Route path="/role" element={<RoleSelectionView />} />
          <Route path="/login" element={<LoginView />} />

          {/* Protected Routes inside MainLayout */}
          <Route element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/residents" element={<ResidentListView />} />
            <Route path="/resident/:id" element={<ResidentFormView />} />
            <Route path="/attendance" element={<AttendanceView />} />
            <Route path="/attendance-report" element={<AttendanceReportView />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
