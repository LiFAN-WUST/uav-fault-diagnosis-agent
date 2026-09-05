import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import TechDashboard from "./pages/TechDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { AgentChatView } from "./components/agent/AgentChatView";
import Layout from "./components/Layout";

export default function App() {
  const { auth, login, logout, isReady, isLoggedIn } = useAuth();

  if (!isReady) {
    return <div className="min-h-screen bg-[#f7f7f8]" />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isLoggedIn ? <Navigate to="/demo" replace /> : <LoginPage onLogin={login} />
          }
        />
        <Route
          path="/demo"
          element={
            isLoggedIn ? (
              <div className="h-screen overflow-hidden bg-white">
                <AgentChatView auth={auth} demoMode />
              </div>
            ) : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/agent"
          element={
            isLoggedIn ? (
              <Layout auth={auth} onLogout={logout}><AgentChatView auth={auth} /></Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/user"
          element={
            isLoggedIn && auth.role === "user" ? (
              <Layout auth={auth} onLogout={logout}><AgentChatView auth={auth} /></Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/user/dashboard"
          element={
            isLoggedIn && auth.role === "user" ? (
              <Navigate to="/user" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/user/agent"
          element={
            isLoggedIn && auth.role === "user" ? (
              <Navigate to="/user" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/tech"
          element={
            isLoggedIn && auth.role === "tech" ? (
              <Layout auth={auth} onLogout={logout}><AgentChatView auth={auth} /></Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/tech/dashboard"
          element={
            isLoggedIn && auth.role === "tech" ? (
              <Layout auth={auth} onLogout={logout}><TechDashboard auth={auth} /></Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/tech/agent"
          element={
            isLoggedIn && auth.role === "tech" ? (
              <Navigate to="/tech" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin"
          element={
            isLoggedIn && auth.role === "admin" ? (
              <Layout auth={auth} onLogout={logout}><AdminDashboard auth={auth} /></Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
