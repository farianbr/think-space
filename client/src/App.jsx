import { Routes, Route, useLocation } from "react-router-dom";

import Home from "./pages/Home";
import BoardsDashboard from "./pages/BoardsDashboard";
import BoardPage from "./pages/BoardPage";
import Header from "./components/Header";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { AuthProvider } from "./contexts/AuthProvider";
import RequireAuth from "./components/RequireAuth";

function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <>
      {!isHomePage && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/boards"
          element={
            <RequireAuth>
              <BoardsDashboard />
            </RequireAuth>
          }
        />

        <Route
          path="/board/:boardId"
          element={
            <RequireAuth>
              <BoardPage />
            </RequireAuth>
          }
        />

        <Route path="*" element={<div>404 - Not Found</div>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
