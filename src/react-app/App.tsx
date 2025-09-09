import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { useNotifications } from './components/NotificationToast';
import NotificationToast from './components/NotificationToast';
import Dashboard from './pages/Dashboard';
import ClientManagement from './pages/ClientManagement';
import AccountManagement from './pages/AccountManagement';
import AdsActive from './pages/AdsActive';
import Selections from './pages/Selections';
import Setup from './pages/Setup';
import UserManagement from './pages/UserManagement';
import PermissionManagement from './pages/PermissionManagement';
import EmailTest from './pages/EmailTest';
import Login from './pages/Login';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalHeader from './components/GlobalHeader';

function AppContent() {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <GlobalHeader />
      <div className="min-h-screen">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/profile" element={<ProtectedRoute permissions={['dashboard.view']}><Profile /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute permissions={['dashboard.view']}><Settings /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute permissions={['dashboard.view']}><Dashboard /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute permissions={['clients.view']}><ClientManagement /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute permissions={['users.view']}><UserManagement /></ProtectedRoute>} />
          <Route path="/permission-management" element={<ProtectedRoute requireSuperAdmin><PermissionManagement /></ProtectedRoute>} />
          <Route path="/admin/email-test" element={<ProtectedRoute permissions={['clients.manage']}><EmailTest /></ProtectedRoute>} />
          <Route path="/setup" element={<ProtectedRoute requireSuperAdmin><Setup /></ProtectedRoute>} />
          <Route path="/ads-active" element={<ProtectedRoute permissions={['ads.view']}><AdsActive /></ProtectedRoute>} />
          <Route path="/selections" element={<ProtectedRoute permissions={['selections.view']}><Selections /></ProtectedRoute>} />
          <Route path="/c/:slug/ads/active" element={<ProtectedRoute permissions={['ads.view']}><AdsActive /></ProtectedRoute>} />
          <Route path="/c/:slug/creatives/active" element={<ProtectedRoute permissions={['ads.view']}><AdsActive /></ProtectedRoute>} />
          <Route path="/c/:slug/accounts" element={<ProtectedRoute permissions={['ads.view']}><AccountManagement /></ProtectedRoute>} />
        </Routes>
      </div>

      {/* Notification Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
