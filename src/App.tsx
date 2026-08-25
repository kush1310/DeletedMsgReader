/**
 * App.tsx — Root Application Router and Session Coordinator
 *
 * Defines the client-side routing tree and enforces real-time inactivity session locking.
 * Integrates InactivityLockService for 1000ms heartbeat checks, user input listeners,
 * and background-to-foreground lifecycle evaluation.
 */

import { type ReactNode, useCallback, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { BottomNavbar } from '@/components/navigation';
import { LoginPage } from '@/pages/LoginPage';
import { ChatsPage } from '@/pages/ChatsPage';
import { ChatDetailPage } from '@/pages/ChatDetailPage';
import { DeletedOnlyPage } from '@/pages/DeletedOnlyPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { hasAcceptedPrivacyPolicy } from '@/services/SecurityService';
import { inactivityLockService } from '@/services/InactivityLockService';
import type { NavTab } from '@/types';

/* Lazy loaded secondary routes for optimal initial bundle execution */
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const PrivacyOnboardingPage = lazy(() => import('@/pages/PrivacyOnboardingPage').then(m => ({ default: m.PrivacyOnboardingPage })));
const SetupPage = lazy(() => import('@/pages/SetupPage').then(m => ({ default: m.SetupPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const NotificationsSettingsPage = lazy(() => import('@/pages/NotificationsSettingsPage').then(m => ({ default: m.NotificationsSettingsPage })));
const PermissionsSettingsPage = lazy(() => import('@/pages/PermissionsSettingsPage').then(m => ({ default: m.PermissionsSettingsPage })));
const PrivacySettingsPage = lazy(() => import('@/pages/PrivacySettingsPage').then(m => ({ default: m.PrivacySettingsPage })));
const ContactUsPage = lazy(() => import('@/pages/ContactUsPage').then(m => ({ default: m.ContactUsPage })));
const FeedbackPage = lazy(() => import('@/pages/FeedbackPage').then(m => ({ default: m.FeedbackPage })));

/** Routes that show the bottom navigation bar */
const BOTTOM_NAV_ROUTES = new Set(['/chats', '/deleted', '/settings']);

/** Maps route paths to NavTab identifiers */
const PATH_TO_TAB: Record<string, NavTab> = {
  '/chats':    'chats',
  '/deleted':  'deleted',
  '/settings': 'settings',
};

/** Routes that are exempt from session timeout enforcement */
const AUTH_EXEMPT_ROUTES = new Set(['/login', '/setup', '/onboarding/privacy']);

/**
 * SessionGuard
 *
 * Enforces session timeout and real-time inactivity locking.
 * Reads session_start from sessionStorage and actively monitors inactivity.
 */
function SessionGuard() {
  const navigate = useNavigate();
  const location = useLocation();

  const checkSession = useCallback((): void => {
    if (!hasAcceptedPrivacyPolicy()) {
      if (location.pathname !== '/onboarding/privacy') {
        navigate('/onboarding/privacy', { replace: true });
      }
      return;
    }

    if (AUTH_EXEMPT_ROUTES.has(location.pathname)) return;

    let sessionStart = sessionStorage.getItem('session_start');
    if (!sessionStart) {
      const persisted = localStorage.getItem('noticatch_session_start');
      if (persisted) {
        sessionStart = persisted;
        sessionStorage.setItem('session_start', persisted);
      }
    }

    if (!sessionStart) {
      navigate('/login', { replace: true });
    }
  }, [location.pathname, navigate]);

  /* Route change check */
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  /* Inactivity engine initialization */
  useEffect(() => {
    inactivityLockService.initialize();

    const unsubscribe = inactivityLockService.onLockRequired(() => {
      if (!AUTH_EXEMPT_ROUTES.has(location.pathname)) {
        navigate('/login', { replace: true });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [location.pathname, navigate]);

  return null;
}

/**
 * AppShell
 *
 * Inner shell component managing bottom navigation bar visibility
 * and tab selection based on the current route.
 */
function AppShell({ children }: { readonly children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const showBottomNav = BOTTOM_NAV_ROUTES.has(location.pathname);
  const activeTab     = (PATH_TO_TAB[location.pathname] ?? 'chats') as NavTab;

  const handleTabChange = useCallback((tab: NavTab) => {
    const paths: Record<NavTab, string> = {
      chats:    '/chats',
      deleted:  '/deleted',
      settings: '/settings',
    };
    navigate(paths[tab]);
  }, [navigate]);

  return (
    <>
      <SessionGuard />
      {children}
      {showBottomNav && (
        <BottomNavbar
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      )}
    </>
  );
}

/**
 * App
 *
 * Root component rendering the full React Router v6 route tree with Suspense chunking.
 */
export function App() {
  return (
    <AppShell>
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center" />}>
        <Routes>
          <Route path="/"        element={<Navigate to="/login" replace />} />
          <Route path="/login"   element={<LoginPage />} />
          <Route path="/onboarding/privacy" element={<PrivacyOnboardingPage />} />
          <Route path="/setup"   element={<SetupPage />} />
          <Route path="/dashboard" element={<LandingPage />} />
          <Route path="/landing"   element={<LandingPage />} />
          <Route path="/chats"          element={<ChatsPage />} />
          <Route path="/deleted"        element={<DeletedOnlyPage />} />
          <Route path="/settings"       element={<SettingsPage />} />
          <Route path="/settings/profile"       element={<ProfilePage />} />
          <Route path="/settings/notifications" element={<NotificationsSettingsPage />} />
          <Route path="/settings/permissions"   element={<PermissionsSettingsPage />} />
          <Route path="/settings/privacy"       element={<PrivacySettingsPage />} />
          <Route path="/chats/:conversationId"  element={<ChatDetailPage />} />
          <Route path="/contact"  element={<ContactUsPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="*"         element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
