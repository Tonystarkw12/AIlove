import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { LobsterPage } from './pages/LobsterPage';
import { LobsterChatPage } from './pages/LobsterChatPage';
import { LobsterSkillPage } from './pages/LobsterSkillPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { ConsentPage } from './pages/ConsentPage';
import { TabBar } from './components/TabBar';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-linear-to-b from-[#1a3a5c] to-[#0d1f33]">
        <div className="text-4xl animate-pulse">🦞</div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-linear-to-b from-[#1a3a5c] to-[#0d1f33]">
      {children}
      <TabBar />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout><HomePage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout><ProfilePage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lobster"
        element={
          <ProtectedRoute>
            <AppLayout><LobsterPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lobster/skill"
        element={
          <ProtectedRoute>
            <AppLayout><LobsterSkillPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lobster/chat"
        element={
          <ProtectedRoute>
            <AppLayout><LobsterChatPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscription"
        element={
          <ProtectedRoute>
            <AppLayout><SubscriptionPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consents"
        element={
          <ProtectedRoute>
            <AppLayout><ConsentPage /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
