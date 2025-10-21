import { useState, useEffect } from 'react';
import GoogleLoginForm from './components/GoogleLoginForm';
import ChatRoom from './components/ChatRoom';
import ErrorBoundary from './components/ErrorBoundary';
import PerformanceMonitor, { useAnalytics } from './components/PerformanceMonitor';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { user, token, logout, restoreSession } = useAuth();
  const [isSessionRestored, setIsSessionRestored] = useState(false);
  const { trackPageView } = useAnalytics();

  // Try to restore session on mount
  useEffect(() => {
    const restored = restoreSession();
    setIsSessionRestored(true);
    if (restored) {
      console.log('✅ Session restored from localStorage');
      trackPageView('chat_room');
    } else {
      trackPageView('login');
    }
  }, []);

  const handleLogout = () => {
    logout();
    window.location.reload(); // Simple way to reset all state
  };

  // Show loading state while checking for session
  if (!isSessionRestored) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show chat if logged in, otherwise show Google login
  return (
    <ErrorBoundary>
      <PerformanceMonitor id="App">
        {user && token ? (
          <ChatRoom user={user} token={token} onLogout={handleLogout} />
        ) : (
          <GoogleLoginForm />
        )}
      </PerformanceMonitor>
    </ErrorBoundary>
  );
}