import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, clearSession, getToken, getUser, setSession } from "./lib/api";
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

export type AuthState = { loggedIn: boolean; role: "retailer" | "admin" };

export default function App() {
  const savedUser = getUser<any>();
  const [auth, setAuth] = useState<AuthState>({ loggedIn: Boolean(getToken() && savedUser), role: savedUser?.role === "admin" ? "admin" : "retailer" });

  useEffect(() => {
    if (!getToken()) return;
    api<any>("/auth/me").then(data => {
      setSession(getToken(), data.user);
      setAuth({ loggedIn: true, role: data.user.role });
    }).catch(() => { clearSession(); setAuth({ loggedIn: false, role: "retailer" }); });
  }, []);

  const login = (role: "retailer" | "admin") => setAuth({ loggedIn: true, role });
  const logout = async () => { try { await api("/auth/logout", { method: "POST" }); } catch {} clearSession(); setAuth({ loggedIn: false, role: "retailer" }); };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <div className="relative isolate min-h-screen bg-[#07111F]">
              <AnimatedBackground />
              <Landing onLogin={login} />
            </div>
          }
        />
        <Route
          path="/login"
          element={
            <div className="relative isolate min-h-screen bg-[#07111F]">
              <AnimatedBackground />
              <Login onLogin={login} />
            </div>
          }
        />
        <Route path="/reset-password" element={<div className="relative isolate min-h-screen bg-[#07111F]"><AnimatedBackground /><ResetPassword /></div>} />
        <Route
          path="/register"
          element={
            <div className="relative isolate min-h-screen bg-[#07111F]">
              <AnimatedBackground />
              <Register />
            </div>
          }
        />

        {/* Retailer App */}
        <Route
          path="/dashboard"
          element={
            auth.loggedIn ? (
              <AppShell onLogout={logout} />
            ) : (
              <Navigate to="/login" replace />
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

        {/* Admin */}
        <Route
          path="/admin"
          element={
            auth.loggedIn && auth.role === "admin" ? (
              <AdminShell onLogout={logout} />
            ) : (
              <Navigate to="/login" replace />
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
    </BrowserRouter>
  );
}
