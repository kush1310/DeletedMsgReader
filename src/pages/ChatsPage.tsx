/**
 * ChatsPage
 *
 * Lists all captured WhatsApp conversations sorted by most recent activity.
 * Data is loaded from the native Room DB via NativeBridgeService on Android.
 * Real-time refresh: listens for the 'noticatch:new-message' CustomEvent
 * dispatched by the Capacitor bridge when a new notification is captured.
 *
 * System Reliability:
 *   - Auto-detects Android Notification Access permission status
 *   - Displays inline 1-tap permission recovery banner if disabled
 *   - Includes Xiaomi/MIUI/HyperOS background optimization guides
 *   - Supports 1-tap Test Notification trigger directly from EmptyState
 *   - Filter tabs: [All] [Has Deleted] [Groups] [Direct]
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  RefreshCw,
  BellOff,
  Zap,
} from 'lucide-react';
import { TopAppBar, IconButton } from '@/components/navigation';
import { SearchInput, EmptyState, LoadingSpinner } from '@/components/common';
import { ConversationRow } from '@/components/chat';
import {
  getConversations,
  checkNotificationListenerEnabled,
  requestNotificationListenerPermission,
  openAutostartSettings,
  requestBatteryOptimizationExemption,
  simulateNotification,
  isNativeAndroid,
} from '@/services/NativeBridgeService';
import { searchAndRank } from '@/services/SearchEngine';
import type { Conversation } from '@/types';

/** Valid filter modes for the conversation list. */
type ChatFilter = 'all' | 'deleted' | 'groups' | 'direct';

const FILTER_LABELS: Record<ChatFilter, string> = {
  all:     'All',
  deleted: 'Has Deleted',
  groups:  'Groups',
  direct:  'Direct',
};

/**
 * ChatsPage
 *
 * Renders the full conversation list with real captured data, live updates,
 * permission status detection, and manual refresh.
 *
 * @returns {JSX.Element}
 */
export function ChatsPage() {
  const navigate = useNavigate();
  const isNative = isNativeAndroid();

  const [searchQuery,           setSearchQuery]           = useState('');
  const [conversations,         setConversations]         = useState<Conversation[]>([]);
  const [isLoading,             setIsLoading]             = useState(true);
  const [isRefreshing,          setIsRefreshing]          = useState(false);
  const [activeFilter,          setActiveFilter]          = useState<ChatFilter>('all');
  const [lastSynced,            setLastSynced]            = useState<Date | null>(null);
  const [hasNotifAccess,        setHasNotifAccess]        = useState<boolean | null>(null);
  const [showMiuiGuide,         setShowMiuiGuide]         = useState(false);
  const [isSimulating,          setIsSimulating]          = useState(false);

  /**
   * verifyPermissionState
   *
   * Queries Android settings to check if NotificationListenerService is granted.
   *
   * @returns {Promise<void>}
   */
  const verifyPermissionState = useCallback(async (): Promise<void> => {
    if (!isNative) {
      setHasNotifAccess(true);
      return;
    }
    const enabled = await checkNotificationListenerEnabled();
    setHasNotifAccess(enabled);
  }, [isNative]);

  /**
   * loadData
   *
   * Fetches all conversations from the native Room SQLite database.
   * Updates the lastSynced timestamp on success.
   *
   * @returns {Promise<void>}
   */
  const loadData = useCallback(async (): Promise<void> => {
    const data = await getConversations();
    setConversations(data);
    setLastSynced(new Date());
    setIsLoading(false);
  }, []);

  /**
   * handleRefresh
   *
   * Manually re-fetches conversation data and re-verifies system permissions.
   *
   * @returns {Promise<void>}
   */
  async function handleRefresh(): Promise<void> {
    setIsRefreshing(true);
    await Promise.all([loadData(), verifyPermissionState()]);
    setIsRefreshing(false);
  }

  useEffect(() => {
    loadData();
    verifyPermissionState();
  }, [loadData, verifyPermissionState]);

  /* Re-check permission and refresh data whenever app regains focus */
  useEffect(() => {
    function handleFocus(): void {
      verifyPermissionState();
      loadData();
    }
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [verifyPermissionState, loadData]);

  /* Foreground periodic sync every 3.5 seconds */
  useEffect(() => {
    const timer = setInterval(() => {
      loadData();
    }, 3500);
    return () => clearInterval(timer);
  }, [loadData]);

  /* Real-time refresh when Capacitor broadcasts a new WhatsApp message */
  useEffect(() => {
    function handleNewMessage(): void {
      loadData();
    }
    window.addEventListener('noticatch:new-message', handleNewMessage);
    return () => window.removeEventListener('noticatch:new-message', handleNewMessage);
  }, [loadData]);

  /**
   * handleTriggerTest
   *
   * Injects a sample message from "Mumma" to verify the database and UI pipeline.
   */
  async function handleTriggerTest(): Promise<void> {
    setIsSimulating(true);
    await simulateNotification({
      chatTitle:   'Mumma',
      senderName:  'Mumma',
      messageText: 'Hi! Are you coming home today?',
      isDeleted:   false,
      isGroup:     false,
    });
    await loadData();
    setIsSimulating(false);
  }

  /* Apply Boyer-Moore-Horspool + Damerau-Levenshtein search ranking */
  const searchResults = useMemo(() => {
    return searchAndRank(conversations, conversation => conversation.chatTitle, searchQuery);
  }, [conversations, searchQuery]);

  /* Apply active filter to ranked search results */
  const filteredResults = useMemo(() => {
    return searchResults.filter(result => {
      const conv = result.item;
      switch (activeFilter) {
        case 'deleted': return conv.deletedCount > 0;
        case 'groups':  return conv.isGroup;
        case 'direct':  return !conv.isGroup;
        default:        return true;
      }
    });
  }, [searchResults, activeFilter]);

  function handleConversationSelect(conversationId: string): void {
    navigate(`/chats/${conversationId}`);
  }

  const subtitleText = lastSynced
    ? `Last synced ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : conversations.length > 0
      ? `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''} captured`
      : 'Waiting for WhatsApp notifications...';

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-surface-800">
        <TopAppBar title="Chats" />
        <div className="pt-14 flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-800">
      <TopAppBar
        title="Chats"
        subtitle={subtitleText}
        trailing={
          <IconButton
            id="chats-refresh-button"
            icon={
              <RefreshCw
                className={`w-5 h-5 text-content-primary ${isRefreshing ? 'animate-spin' : ''}`}
                strokeWidth={2.2}
              />
            }
            label="Refresh conversation list"
            onClick={handleRefresh}
          />
        }
      />

      {/* Permission Warning Banner (if Notification Access is disabled) */}
      {hasNotifAccess === false && (
        <div className="pt-14 px-4 pt-3 pb-1 z-30 animate-slide-down">
          <div className="card p-3.5 bg-amber-50 border-2 border-amber-300 shadow-card space-y-2.5">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                <BellOff className="w-4 h-4 text-amber-800" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black text-amber-900 leading-tight">
                  Notification Access Required
                </h4>
                <p className="text-2xs text-amber-800 font-semibold mt-0.5 leading-snug">
                  Android is blocking NotiCatch from reading incoming notifications. Enable Notification Access in Android Settings to capture WhatsApp messages.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                id="enable-notif-access-btn"
                onClick={async () => {
                  await requestNotificationListenerPermission();
                }}
                className="btn-primary flex-1 text-xs py-2 text-center"
              >
                Enable in Settings →
              </button>

              <button
                type="button"
                onClick={() => setShowMiuiGuide(!showMiuiGuide)}
                className="px-2.5 py-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-2xs font-bold hover:bg-amber-200 transition-colors"
              >
                Xiaomi / MIUI Guide
              </button>
            </div>

            {/* Xiaomi / MIUI / HyperOS Special Instructions */}
            {showMiuiGuide && (
              <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-2xs text-content-secondary space-y-2 animate-fade-in font-medium">
                <p className="font-bold text-content-primary">For Xiaomi, Redmi, Poco & Vivo devices:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>In Settings → Special permissions → Allow <strong>NotiCatch</strong>.</li>
                  <li>Enable <strong>Autostart</strong> so the app runs when screen is off.</li>
                  <li>Set Battery Saver to <strong>No restrictions</strong>.</li>
                </ol>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={openAutostartSettings}
                    className="flex-1 py-1.5 rounded-lg bg-surface-700 border border-surface-600 text-content-primary font-bold text-center hover:bg-surface-600"
                  >
                    Open Autostart Settings
                  </button>
                  <button
                    type="button"
                    onClick={requestBatteryOptimizationExemption}
                    className="flex-1 py-1.5 rounded-lg bg-surface-700 border border-surface-600 text-content-primary font-bold text-center hover:bg-surface-600"
                  >
                    Battery Exemption
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fixed Search + Filter Block */}
      <div className={`${hasNotifAccess === false ? 'pt-2' : 'pt-14'} z-20 bg-surface-800 border-b border-surface-700/80 shadow-xs`}>
        <div className="px-4 pt-2.5 pb-2">
          <SearchInput
            id="chats-search-input"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search conversations..."
            matchCount={searchQuery ? filteredResults.length : undefined}
            algorithmLabel="Boyer-Moore-Horspool O(n/m)"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 px-4 pb-2.5 overflow-x-auto" role="tablist" aria-label="Conversation filters">
          {(Object.keys(FILTER_LABELS) as ChatFilter[]).map(filter => (
            <button
              key={filter}
              id={`chats-filter-${filter}`}
              type="button"
              role="tab"
              aria-selected={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
              className={activeFilter === filter ? 'filter-pill-active' : 'filter-pill-inactive'}
            >
              {FILTER_LABELS[filter]}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Conversation List */}
      <div className="flex-1 overflow-y-auto pb-20">
        {filteredResults.length > 0 ? (
          <ul role="list" className="bg-surface-900 shadow-skeuo-card divide-y divide-surface-700/60">
            {filteredResults.map((result, index) => (
              <li
                key={result.item.id}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(index * 40, 360)}ms` }}
              >
                <ConversationRow
                  conversation={result.item}
                  onClick={handleConversationSelect}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <EmptyState
              icon={<MessageCircle className="w-8 h-8" strokeWidth={1.8} />}
              title={
                searchQuery
                  ? 'No conversations found'
                  : activeFilter !== 'all'
                    ? 'No conversations in this filter'
                    : 'No conversations captured yet'
              }
              description={
                searchQuery
                  ? `No conversations match "${searchQuery}".`
                  : activeFilter !== 'all'
                    ? 'Try the All tab to see every captured conversation.'
                    : 'Send or receive a WhatsApp message — it will appear here automatically.'
              }
            />

            {/* Test Simulation Button */}
            <div className="w-full max-w-xs pt-2">
              <button
                type="button"
                id="simulate-test-notif-btn"
                onClick={handleTriggerTest}
                disabled={isSimulating}
                className="w-full py-2.5 px-4 rounded-xl bg-surface-900 border border-surface-600 text-content-primary text-xs font-bold shadow-skeuo-chip flex items-center justify-center gap-2 hover:bg-surface-800 active:scale-95 transition-all"
              >
                <Zap className="w-4 h-4 text-accent" strokeWidth={2.2} />
                {isSimulating ? 'Sending test message...' : 'Simulate Test WhatsApp Message'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
