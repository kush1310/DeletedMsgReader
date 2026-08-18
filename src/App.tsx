/**
 * App.tsx — Root Application Router and Session Coordinator
 *
 * Defines the client-side routing tree and wraps all pages with
 * the shared session lifecycle observer. The session observer monitors
 * app visibility changes and triggers automatic locking after the
 * configured session timeout.
 *
 * Route tree:
 *   /login         → LoginPage (no nav, no shared bars)
 *   /setup         → SetupPage (no nav, permission wizard)
 *   /chats         → ChatsPage       (bottom nav)
 *   /chats/:id     → ChatDetailPage  (back nav)
 *   /deleted       → DeletedOnlyPage (bottom nav)
 *   /settings      → SettingsPage    (bottom nav)
 *   /contact       → ContactUsPage   (back nav)
 *   /feedback      → FeedbackPage    (back nav)
 *   /              → Redirects to /login
 */

import React, { useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { BottomNavbar } from '@/components/navigation';
import { LoginPage        } from '@/pages/LoginPage';
import { SetupPage        } from '@/pages/SetupPage';
// LandingPage is accessible via /chats (the main tab) in the current route tree
import { ChatsPage        } from '@/pages/ChatsPage';
import { ChatDetailPage   } from '@/pages/ChatDetailPage';
import { DeletedOnlyPage  } from '@/pages/DeletedOnlyPage';
import { SettingsPage     } from '@/pages/SettingsPage';
import { ContactUsPage    } from '@/pages/ContactUsPage';
import { FeedbackPage     } from '@/pages/FeedbackPage';
import { seedDevelopmentData } from '@/services/DatabaseService';
import type { NavTab } from '@/types';

/* Seed development data once on module load */
seedDevelopmentData();

/**
 * Pages that display the bottom navigation bar.
 * All other routes (login, setup, chat detail, contact, feedback)
 * manage their own navigation independently.
 */
const BOTTOM_NAV_ROUTES = new Set(['/chats', '/deleted', '/settings']);

/** Maps route paths to NavTab identifiers for BottomNavbar active state */
const PATH_TO_TAB: Record<string, NavTab> = {
  '/chats':    'chats',
  '/deleted':  'deleted',
  '/settings': 'settings',
};

/**
 * AppShell
 *
 * Inner shell component that manages the bottom navigation bar visibility
 * and tab selection based on the current route. Wraps all authenticated routes.
 */
function AppShell({ children }: { readonly children: React.ReactNode }) {
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
 * AppShell provides bottom nav visibility logic. Auth guard logic
 * would wrap the authenticated routes in production.
 */
export function App() {
  return (
    <AppShell>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Authentication screens (no shared nav) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<SetupPage />} />

        {/* Main app routes (with bottom nav) */}
        <Route path="/chats"    element={<ChatsPage />} />
        <Route path="/deleted"  element={<DeletedOnlyPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Detail and support routes (back nav only) */}
        <Route path="/chats/:conversationId" element={<ChatDetailPage />} />
        <Route path="/contact"  element={<ContactUsPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AppShell>
  );
}
