/**
 * App.tsx — Root Application Router and Session Coordinator
 *
 * Defines the client-side routing tree and enforces real-time inactivity session locking.
 * Integrates InactivityLockService for heartbeat checks, user input listeners,
 * and background-to-foreground lifecycle evaluation.
 *
 * MASVS-AUTH-1: Session token integrity validation.
 * MASVS-PLATFORM-2: Parameter sanitization on dynamic route segments.
 * MASVS-RESILIENCE-4: AppErrorBoundary protects against unhandled render crashes.
 */

import { type ReactNode, useCallback, useEffect, lazy, Suspense, Component, type ErrorInfo } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { BottomNavbar } from '@/components/navigation';
import { LoginPage } from '@/pages/LoginPage';
import { ChatsPage } from '@/pages/ChatsPage';
import { ChatDetailPage } from '@/pages/ChatDetailPage';
import { DeletedOnlyPage } from '@/pages/DeletedOnlyPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { hasAcceptedPrivacyPolicy } from '@/services/SecurityService';
import { inactivityLockService } from '@/services/InactivityLockService';
import { ShieldAlert, RotateCcw } from 'lucide-react';
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

/**
 * AppErrorBoundary
 *
 * Catches unhandled rendering errors and async chunk loading failures.
 * Displays a secure fallback UI without leaking internal stack traces.
 */
interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Application render error caught by boundary:', error.name, errorInfo.componentStack);
  }

  private handleReload = (): void => {
    this.setState({ hasError: false });
    window.location.href = '/login';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-critical/10 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-critical" />
          </div>
          <h1 className="text-xl font-bold text-content-primary mb-2">
            Session Interrupted
          </h1>
          <p className="text-sm text-content-secondary max-w-xs mb-6">
            An unexpected error occurred. For your security, the session has been isolated.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Return to Login</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
 * validateSessionToken
 *
 * Validates the structure and sanity of the stored session start timestamp.
 * Rejects NaN, non-integer, negative, or future-dated timestamps (> 5 mins into future).
 */
function validateSessionToken(token: string | null): boolean {
  if (!token) return false;
  const timestamp = Number(token);
  if (!Number.isFinite(timestamp) || !Number.isInteger(timestamp) || timestamp <= 0) {
    return false;
  }
  const now = Date.now();
  if (timestamp > now + 300_000) {
    return false;
  }
  return true;
}

/**
 * SessionGuard
 *
 * Enforces session timeout, token integrity, and real-time inactivity locking.
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
      if (persisted && validateSessionToken(persisted)) {
        sessionStart = persisted;
        sessionStorage.setItem('session_start', persisted);
      }
    }

    if (!validateSessionToken(sessionStart)) {
      sessionStorage.removeItem('session_start');
      localStorage.removeItem('noticatch_session_start');
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
 * ProtectedChatDetailRoute
 *
 * Sanitizes and validates the conversationId param before rendering ChatDetailPage.
 */
function ProtectedChatDetailRoute() {
  const { conversationId } = useParams<{ conversationId: string }>();

  if (!conversationId || conversationId.trim().length === 0 || conversationId.length > 256) {
    return <Navigate to="/chats" replace />;
  }

  return <ChatDetailPage />;
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
 * Root component rendering the full React Router v6 route tree with Suspense chunking and ErrorBoundary.
 */
export function App() {
  return (
    <AppErrorBoundary>
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
            <Route path="/chats/:conversationId"  element={<ProtectedChatDetailRoute />} />
            <Route path="/contact"  element={<ContactUsPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="*"         element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </AppErrorBoundary>
  );
}
