/**
 * App.tsx — Root Application Router and Session Coordinator
 *
 * Defines the client-side routing tree and enforces real-time inactivity session locking.
 * Integrates InactivityLockService for 1000ms heartbeat checks, user input listeners,
 * and background-to-foreground lifecycle evaluation.
 */

import { type ReactNode, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { BottomNavbar } from '@/components/navigation';
import { LandingPage           } from '@/pages/LandingPage';
import { LoginPage             } from '@/pages/LoginPage';
import { PrivacyOnboardingPage } from '@/pages/PrivacyOnboardingPage';
import { SetupPage             } from '@/pages/SetupPage';
import { ChatsPage             } from '@/pages/ChatsPage';
import { ChatDetailPage        } from '@/pages/ChatDetailPage';
import { DeletedOnlyPage       } from '@/pages/DeletedOnlyPage';
import { SettingsPage          } from '@/pages/SettingsPage';
import { ProfilePage           } from '@/pages/ProfilePage';
import { NotificationsSettingsPage } from '@/pages/NotificationsSettingsPage';
import { PermissionsSettingsPage   } from '@/pages/PermissionsSettingsPage';
import { PrivacySettingsPage       } from '@/pages/PrivacySettingsPage';
import { ContactUsPage         } from '@/pages/ContactUsPage';
import { FeedbackPage          } from '@/pages/FeedbackPage';
import { hasAcceptedPrivacyPolicy } from '@/services/SecurityService';
import { inactivityLockService } from '@/services/InactivityLockService';
import type { NavTab } from '@/types';

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
 * Root component rendering the full React Router v6 route tree.
 */
export function App() {
  return (
    <AppShell>
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
    </AppShell>
  );
}
