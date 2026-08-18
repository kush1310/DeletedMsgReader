/**
 * App.tsx — Root Application Router and Session Coordinator
 *
 * Defines the client-side routing tree and enforces session timeout.
 * On each route change, checks elapsed time since last unlock against
 * sessionTimeoutSeconds setting and forces re-authentication if expired.
 *
 * Route tree:
 *   /login         → LoginPage (no nav)
 *   /setup         → SetupPage (no nav, permission wizard)
 *   /chats         → ChatsPage       (bottom nav)
 *   /chats/:id     → ChatDetailPage  (back nav)
 *   /deleted       → DeletedOnlyPage (bottom nav)
 *   /settings      → SettingsPage    (bottom nav)
 *   /contact       → ContactUsPage   (back nav)
 *   /feedback      → FeedbackPage    (back nav)
 *   /              → Redirects to /login
 */

import { type ReactNode, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { BottomNavbar } from '@/components/navigation';
import { LandingPage      } from '@/pages/LandingPage';
import { LoginPage        } from '@/pages/LoginPage';
import { SetupPage        } from '@/pages/SetupPage';
import { ChatsPage        } from '@/pages/ChatsPage';
import { ChatDetailPage   } from '@/pages/ChatDetailPage';
import { DeletedOnlyPage  } from '@/pages/DeletedOnlyPage';
import { SettingsPage     } from '@/pages/SettingsPage';
import { ContactUsPage    } from '@/pages/ContactUsPage';
import { FeedbackPage     } from '@/pages/FeedbackPage';
import { loadAppSettings  } from '@/services/NativeBridgeService';
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
const AUTH_EXEMPT_ROUTES = new Set(['/login', '/setup']);

/**
 * SessionGuard
 *
 * Enforces session timeout on each route transition.
 * Reads session_start from sessionStorage and compares elapsed time
 * against the persisted sessionTimeoutSeconds setting.
 * Navigates to /login if the session has expired.
 *
 * Resets the activity timer on user interaction (touch/click).
 */
function SessionGuard() {
  const navigate = useNavigate();
  const location = useLocation();

  const checkSession = useCallback(async (): Promise<void> => {
    if (AUTH_EXEMPT_ROUTES.has(location.pathname)) return;

    const sessionStart = sessionStorage.getItem('session_start');
    if (!sessionStart) {
      navigate('/login', { replace: true });
      return;
    }

    const settings = await loadAppSettings();
    if (settings.sessionTimeoutSeconds === 0) return; /* "Never" option */

    const elapsed = Date.now() - Number(sessionStart);
    const timeoutMs = settings.sessionTimeoutSeconds * 1000;

    if (elapsed > timeoutMs) {
      sessionStorage.removeItem('session_start');
      navigate('/login', { replace: true });
    }
  }, [location.pathname, navigate]);

  /* Check session on every route change */
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  /* Reset session timer on any user interaction */
  useEffect(() => {
    function resetTimer(): void {
      if (AUTH_EXEMPT_ROUTES.has(location.pathname)) return;
      const current = sessionStorage.getItem('session_start');
      if (current) {
        sessionStorage.setItem('session_start', String(Date.now()));
      }
    }

    window.addEventListener('touchstart', resetTimer, { passive: true });
    window.addEventListener('click',      resetTimer, { passive: true });

    return () => {
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('click',      resetTimer);
    };
  }, [location.pathname]);

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
 * No dummy data is seeded — all data comes from real captured notifications.
 */
export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/"        element={<Navigate to="/login" replace />} />
        <Route path="/login"   element={<LoginPage />} />
        <Route path="/setup"   element={<SetupPage />} />
        <Route path="/dashboard" element={<LandingPage />} />
        <Route path="/landing"   element={<LandingPage />} />
        <Route path="/chats"          element={<ChatsPage />} />
        <Route path="/deleted"        element={<DeletedOnlyPage />} />
        <Route path="/settings"       element={<SettingsPage />} />
        <Route path="/chats/:conversationId" element={<ChatDetailPage />} />
        <Route path="/contact"  element={<ContactUsPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="*"         element={<Navigate to="/login" replace />} />
      </Routes>
    </AppShell>
  );
}
