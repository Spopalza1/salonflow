import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import {
  HashRouter as Router,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { NotificationProvider } from '@/lib/NotificationContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from '@/components/ScrollToTop';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

import Home from '@/pages/Home';
import FrontDeskDashboard from '@/pages/FrontDeskDashboard';
import StylistView from '@/pages/StylistView';
import GuestMenu from '@/pages/GuestMenu';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import VerifyAccount from '@/pages/VerifyAccount';
import SalonSignUp from '@/pages/SalonSignUp';

const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-account',
  '/salon-signup',
  '/guest',
  '/guest-menu',
]);

function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-xl"
      role="status"
      aria-label="Loading SalonFlow"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">Loading SalonFlow…</p>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const location = useLocation();
  const isPublicRoute = PUBLIC_ROUTES.has(location.pathname);

  // Public guest and auth pages should not wait for private-session resolution.
  if (isLoadingPublicSettings || (!isPublicRoute && isLoadingAuth)) {
    return <LoadingScreen />;
  }

  if (!isPublicRoute && authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  if (!isPublicRoute && authError?.type === 'auth_required') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={location.pathname}
        initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
        transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
        className="min-h-screen"
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-account" element={<VerifyAccount />} />
          <Route path="/salon-signup" element={<SalonSignUp />} />

          {/* Keep both paths so old and newly generated guest links work. */}
          <Route path="/guest" element={<GuestMenu />} />
          <Route path="/guest-menu" element={<GuestMenu />} />

          <Route
            element={
              <ProtectedRoute
                unauthenticatedElement={
                  <Navigate to="/login" replace state={{ from: location }} />
                }
                allowedRoles={['admin']}
              />
            }
          >
            <Route element={<Layout />}>
              <Route path="/front-desk" element={<FrontDeskDashboard />} />
            </Route>
          </Route>

          <Route
            element={
              <ProtectedRoute
                unauthenticatedElement={
                  <Navigate to="/login" replace state={{ from: location }} />
                }
                allowedRoles={['admin', 'stylist', 'user']}
              />
            }
          >
            <Route element={<Layout />}>
              <Route path="/stylist" element={<StylistView />} />
            </Route>
          </Route>

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </motion.main>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AuthProvider>
          <NotificationProvider>
            <ScrollToTop />
            <AuthenticatedApp />
            <Toaster />
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}
