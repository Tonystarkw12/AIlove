import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/ProfilePage';
import { MapPage } from './pages/MapPage';
import { ChatPage } from './pages/ChatPage';
import { CommunityPage } from './pages/CommunityPage';
import { PokeballPage } from './pages/PokeballPage';
import { LobsterPage } from './pages/LobsterPage';
import { LobsterChatPage } from './pages/LobsterChatPage';
import { LobsterSkillPage } from './pages/LobsterSkillPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { ConsentPage } from './pages/ConsentPage';
import { IntroductionPage } from './pages/IntroductionPage';
import { TabBar } from './components/TabBar';
import { MusicPlayer } from './components/MusicPlayer';
import './index.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#9BBC0F] to-[#8BAC0F]">
        <div className="text-2xl animate-pulse">加载中...</div>
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
    <div className="min-h-screen bg-gradient-to-b from-[#9BBC0F] to-[#8BAC0F]">
      <MusicPlayer autoPlay={false} />
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
            <AppLayout>
              <HomePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MapPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ChatPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/community"
        element={
          <ProtectedRoute>
            <AppLayout>
              <CommunityPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProfilePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pokeball"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PokeballPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      {/* LobLove Routes */}
      <Route
        path="/lobster"
        element={
          <ProtectedRoute>
            <LobsterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lobster/skill"
        element={
          <ProtectedRoute>
            <LobsterSkillPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscription"
        element={
          <ProtectedRoute>
            <SubscriptionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/consents"
        element={
          <ProtectedRoute>
            <ConsentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/introductions"
        element={
          <ProtectedRoute>
            <IntroductionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/lobster/chat"
        element={
          <ProtectedRoute>
            <LobsterChatPage />
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
