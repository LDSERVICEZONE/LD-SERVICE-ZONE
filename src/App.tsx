import { lazy, Suspense } from "react"
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom"
import { Analytics } from "@vercel/analytics/react"
import { AppProvider, useAuth } from "@/features/session/AppContext"
import AppShell from "./components/layout/AppShell"
import AdminShell from "./components/layout/AdminShell"
import AnimatedBackground from "./components/background/AnimatedBackground"
import PublicNav from "./components/layout/PublicNav"

const Landing = lazy(() => import("./pages/Landing"))
const Login = lazy(() => import("./pages/Login"))
const Register = lazy(() => import("./pages/Register"))
const ResetPassword = lazy(() => import("./pages/ResetPassword"))
const Dashboard = lazy(() => import("./pages/app/Dashboard"))
const WalletPage = lazy(() => import("./pages/app/WalletPage"))
const RechargePage = lazy(() => import("./pages/app/RechargePage"))
const ServicesPage = lazy(() => import("./pages/app/ServicesPage"))
const CustomersPage = lazy(() => import("./pages/app/CustomersPage"))
const AnalyticsPage = lazy(() => import("./pages/app/AnalyticsPage"))
const SupportPage = lazy(() => import("./pages/app/SupportPage"))
const ProfilePage = lazy(() => import("./pages/app/ProfilePage"))
const ApplicationsPage = lazy(() => import("./pages/app/ApplicationsPage"))
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"))
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"))
const AdminTransactions = lazy(() => import("./pages/admin/AdminTransactions"))
const AdminApplications = lazy(() => import("./pages/admin/AdminApplications"))
const AdminServices = lazy(() => import("./pages/admin/AdminServices"))
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"))
const AdminReports = lazy(() => import("./pages/admin/AdminReports"))
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"))
const AdminHelpRequests = lazy(() => import("./pages/admin/AdminHelpRequests"))

function RouteLoading() {
  return (
    <div className="min-h-screen bg-[#07111F] flex items-center justify-center text-white/50 text-sm">
      Loading LD SERVICE ZONE…
    </div>
  )
}

function AppRoutes() {
  const location = useLocation()
  const { loggedIn, role, logout, authLoading, authError, refreshUser, login } =
    useAuth()

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#07111F] flex items-center justify-center text-white/50 text-sm">
        Loading LD SERVICE ZONE…
      </div>
    )
  }

  if (authError)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#07111F] p-6 text-white">
        <p role="alert">{authError}</p>
        <button
          onClick={() => void refreshUser()}
          className="rounded-lg bg-blue-600 px-4 py-2"
        >
          Retry
        </button>
        <button onClick={() => void logout()}>Sign out</button>
      </div>
    )

  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route
          path="/"
          element={
            loggedIn ? (
              <Navigate
                to={role === "admin" ? "/admin" : "/dashboard"}
                replace
              />
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
              <Navigate
                to={role === "admin" ? "/admin" : "/dashboard"}
                replace
              />
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
            loggedIn ? (
              <Navigate
                to={role === "admin" ? "/admin" : "/dashboard"}
                replace
              />
            ) : (
              <div className="relative isolate min-h-screen bg-[#07111F]">
                <AnimatedBackground />
                <PublicNav />
                <Register />
              </div>
            )
          }
        />

        {/* Retailer App */}
        <Route
          path="/dashboard"
          element={
            loggedIn ? (
              role === "retailer" ? (
                <AppShell onLogout={logout} />
              ) : (
                <Navigate to="/admin" replace />
              )
            ) : (
              <Navigate
                to="/login"
                state={{ from: location.pathname + location.search }}
                replace
              />
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
              <Navigate
                to="/login"
                state={{ from: location.pathname + location.search }}
                replace
              />
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
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
        <Analytics />
      </AppProvider>
    </BrowserRouter>
  )
}
