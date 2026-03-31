import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SplashView from './pages/SplashView';
import RoleSelectionView from './pages/RoleSelectionView';
import LoginView from './pages/LoginView';
import AdminRegisterView from './pages/AdminRegisterView';
import ViewerLoginView from './pages/ViewerLoginView';
import DashboardView from './pages/DashboardView';
import ResidentListView from './pages/ResidentListView';
import ResidentFormView from './pages/ResidentFormView';
import ResidentDetailView from './pages/ResidentDetailView';
import AttendanceView from './pages/AttendanceView';
import AttendanceReportView from './pages/AttendanceReportView';
import DocumentsView from './pages/DocumentsView';
import DonationsManagementView from './pages/DonationsManagementView';
import FoodRequirementsView from './pages/FoodRequirementsView';
import SupplyNeedsView from './pages/SupplyNeedsView';
import InstitutionMessagesView from './pages/InstitutionMessagesView';
import SettingsView from './pages/SettingsView';
import LogsView from './pages/LogsView';
import DonationReportView from './pages/DonationReportView';
import ViewerDashboardView from './pages/viewer/ViewerDashboardView';
import InstitutionListView from './pages/viewer/InstitutionListView';
import InstitutionDetailView from './pages/viewer/InstitutionDetailView';
import FoodDonationView from './pages/viewer/FoodDonationView';
import FundDonationView from './pages/viewer/FundDonationView';
import DonationHistoryView from './pages/viewer/DonationHistoryView';
import ViewerMessagesView from './pages/viewer/ViewerMessagesView';
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
          <Route path="/admin/register" element={<AdminRegisterView />} />
          <Route path="/viewer/login" element={<ViewerLoginView />} />

          {/* Admin Protected Routes inside MainLayout */}
          <Route element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/residents" element={<ResidentListView />} />
            <Route path="/resident/new" element={<ResidentFormView />} />
            <Route path="/resident/:id" element={<ResidentFormView />} />
            <Route path="/resident/:id/view" element={<ResidentDetailView />} />
            <Route path="/attendance" element={<AttendanceView />} />
            <Route path="/attendance-report" element={<AttendanceReportView />} />
            <Route path="/documents" element={<DocumentsView />} />
            <Route path="/donations" element={<DonationsManagementView />} />
            <Route path="/requirements" element={<FoodRequirementsView />} />
            <Route path="/needs" element={<SupplyNeedsView />} />
            <Route path="/messages" element={<InstitutionMessagesView />} />
            <Route path="/logs" element={<LogsView />} />
            <Route path="/donation-report" element={<DonationReportView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Route>

          {/* Viewer Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['viewer']} />}>
            <Route path="/viewer/dashboard" element={<ViewerDashboardView />} />
            <Route path="/viewer/institutions" element={<InstitutionListView />} />
            <Route path="/viewer/institution/:id" element={<InstitutionDetailView />} />
            <Route path="/viewer/institution/:id/food" element={<FoodDonationView />} />
            <Route path="/viewer/institution/:id/fund" element={<FundDonationView />} />
            <Route path="/viewer/history" element={<DonationHistoryView />} />
            <Route path="/viewer/messages" element={<ViewerMessagesView />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
