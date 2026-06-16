import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./contexts/AuthProvider";
import { ThemeProvider } from "./contexts/ThemeProvider";
import RequireAuth from "./components/RequireAuth";
import AppLayout from "./components/layout/AppLayout";
import { Spinner } from "./components/ui";

import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// Route-level code splitting for the heavier authenticated surfaces.
const BoardsDashboard = lazy(() => import("./pages/BoardsDashboard"));
const BoardsLibrary = lazy(() => import("./pages/BoardsLibrary"));
const TemplatesPage = lazy(() => import("./pages/TemplatesPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const ActivityPage = lazy(() => import("./pages/ActivityPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const BoardPage = lazy(() => import("./pages/BoardPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const InvitePage = lazy(() => import("./pages/InvitePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

function AppContent() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<BoardsDashboard />} />
            <Route path="/boards" element={<BoardsLibrary />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/board/:boardId" element={<BoardPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 2500,
            style: {
              background: "var(--color-elevated)",
              color: "var(--color-ink)",
              border: "1px solid var(--color-hairline)",
              borderRadius: "12px",
              boxShadow: "var(--shadow-pop)",
              fontSize: "14px",
              padding: "10px 14px",
            },
            success: { iconTheme: { primary: "var(--color-positive)", secondary: "var(--color-surface)" } },
            error: { iconTheme: { primary: "var(--color-danger)", secondary: "var(--color-surface)" } },
          }}
        />
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
