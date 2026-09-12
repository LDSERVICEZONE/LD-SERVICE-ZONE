import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { AppProvider, useAuth } from "./context/AppContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./pages/app/Dashboard";
import WalletPage from "./pages/app/WalletPage";
import RechargePage from "./pages/app/RechargePage";
import ServicesPage from "./pages/app/ServicesPage";
import CustomersPage from "./pages/app/CustomersPage";
import AnalyticsPage from "./pages/app/AnalyticsPage";
import SupportPage from "./pages/app/SupportPage";
import ProfilePage from "./pages/app/ProfilePage";
import ApplicationsPage from "./pages/app/ApplicationsPage";
import AdminShell from "./components/layout/AdminShell";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AnimatedBackground from "./components/background/AnimatedBackground";
import AdminApplications from "./pages/admin/AdminApplications";
import AdminServices from "./pages/admin/AdminServices";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminHelpRequests from "./pages/admin/AdminHelpRequests";
import PublicNav from "./components/layout/PublicNav";

function AppRoutes() {
  const location = useLocation();
  const { loggedIn, role, logout, authLoading, authError, refreshUser, login } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#07111F] flex items-center justify-center text-white/50 text-sm">
        Loading LD SERVICE ZONE…
      </div>
    );
  }

  if (authError) return <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#07111F] p-6 text-white">
    <p role="alert">{authError}</p>
    <button onClick={() => void refreshUser()} className="rounded-lg bg-blue-600 px-4 py-2">Retry</button>
    <button onClick={() => void logout()}>Sign out</button>
  </div>;

  return (
    <Routes>
      <Route
        path="/"
        element={
          loggedIn ? (
            <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />
          ) : (
            <div className="relative isolate min-h-screen bg-[#07111F]">
              <AnimatedBackground />
              <Landing onLogin={login} />
            </div>
          )
        }
      />
      <Route
        path="/login"
        element={
          loggedIn ? (
            <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />
          ) : (
            <div className="relative isolate min-h-screen bg-[#07111F]">
              <AnimatedBackground />
              <PublicNav />
              <Login onLogin={login} />
            </div>
          )
        }
      />
      <Route
        path="/reset-password"
        element={
          <div className="relative isolate min-h-screen bg-[#07111F]">
            <AnimatedBackground />
            <PublicNav />
            <ResetPassword />
          </div>
        }
      />
      <Route
        path="/register"
        element={
          loggedIn ? <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace /> :
          <div className="relative isolate min-h-screen bg-[#07111F]">
            <AnimatedBackground />
            <PublicNav />
            <Register />
          </div>
        }
      />

      {/* Retailer App */}
      <Route
        path="/dashboard"
        element={
          loggedIn ? (
            role === "retailer" ? <AppShell onLogout={logout} /> : <Navigate to="/admin" replace />
          ) : (
            <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
          )
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="recharge" element={<RechargePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="support" element={<SupportPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="applications" element={<ApplicationsPage />} />
      </Route>

      {/* Admin App */}
      <Route
        path="/admin"
        element={
          loggedIn ? (
            role === "admin" ? (
              <AdminShell onLogout={logout} />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
          )
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="applications" element={<AdminApplications />} />
        <Route path="services" element={<AdminServices />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="help" element={<AdminHelpRequests />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
        <Analytics />
      </AppProvider>
    </BrowserRouter>
  );
}
