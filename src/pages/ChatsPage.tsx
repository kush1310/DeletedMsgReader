/**
 * ChatsPage
 *
 * Lists all captured WhatsApp conversations sorted by most recent activity.
 *
 * Visual system: NotiCatch Material 3 Expressive
 * - Pure tonal canvas with zero token collision between light/dark themes.
 * - Conversation rows with circular initials avatars, primary unread badges,
 *   amber deleted message counters, and haptic long-press action sheets.
 * - Material 3 search and filter pills.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  RefreshCw,
  BellOff,
  CheckCircle2,
  FileText,
  Share2,
  Trash2,
  X,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { TopAppBar, IconButton } from '@/components/navigation';
import { SearchInput, EmptyState, LoadingSpinner, ConfirmationModal } from '@/components/common';
import { ConversationRow } from '@/components/chat';
import {
  getConversations,
  checkNotificationListenerEnabled,
  requestNotificationListenerPermission,
  markConversationAsReadNative,
  deleteConversationNative,
  exportChatAsPDFNative,
  exportChatAsCSVNative,
  isNativeAndroid,
} from '@/services/NativeBridgeService';
import { searchAndRank } from '@/services/SearchEngine';
import { HapticService } from '@/services/HapticService';
import type { Conversation } from '@/types';

type ChatFilter = 'all' | 'deleted' | 'groups' | 'direct';

const FILTER_LABELS: Record<ChatFilter, string> = {
  all:     'All',
  deleted: 'Has Deleted',
  groups:  'Groups',
  direct:  'Direct',
};

export function ChatsPage() {
  const navigate  = useNavigate();
  const isNative  = isNativeAndroid();

  const [searchQuery,       setSearchQuery]       = useState('');
  const [conversations,     setConversations]     = useState<Conversation[]>([]);
  const [isLoading,         setIsLoading]         = useState(true);
  const [isRefreshing,      setIsRefreshing]      = useState(false);
  const [activeFilter,      setActiveFilter]      = useState<ChatFilter>('all');
  const [lastSynced,        setLastSynced]        = useState<Date | null>(null);
  const [hasNotifAccess,    setHasNotifAccess]    = useState<boolean | null>(null);
  const [searchVisible,     setSearchVisible]     = useState(false);

  const [selectedChat,      setSelectedChat]      = useState<Conversation | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionFeedback,    setActionFeedback]    = useState<string | null>(null);

  /**
   * verifyPermissionState
   *
   * Checks whether the Android NotificationListenerService is currently enabled.
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
   * Fetches all captured conversations from the on-device Room SQLite DB.
   */
  const loadData = useCallback(async (): Promise<void> => {
    const data = await getConversations();
    setConversations(data);
    setLastSynced(new Date());
    setIsLoading(false);
  }, []);

  async function handleRefresh(): Promise<void> {
    HapticService.tap();
    setIsRefreshing(true);
    await Promise.all([loadData(), verifyPermissionState()]);
    setIsRefreshing(false);
    HapticService.success();
  }

  useEffect(() => {
    loadData();
    verifyPermissionState();
  }, [loadData, verifyPermissionState]);

  /* Re-verify permission and reload conversations when the app regains focus */
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

  /* Polling interval — refreshes every 3.5 seconds for near-real-time updates */
  useEffect(() => {
    const timer = setInterval(() => { loadData(); }, 3500);
    return () => clearInterval(timer);
  }, [loadData]);

  /* Listen for new-message events fired by the native Kotlin bridge */
  useEffect(() => {
    function handleNewMessage(): void { loadData(); }
    window.addEventListener('noticatch:new-message', handleNewMessage);
    return () => window.removeEventListener('noticatch:new-message', handleNewMessage);
  }, [loadData]);

  async function handleMarkAsRead(chat: Conversation) {
    HapticService.selection();
    await markConversationAsReadNative(chat.id);
    setSelectedChat(null);
    await loadData();
    setActionFeedback('Marked as read');
    setTimeout(() => setActionFeedback(null), 2000);
  }

  async function handleExportPDF(chat: Conversation) {
    HapticService.impact();
    setSelectedChat(null);
    setActionFeedback('Generating PDF...');
    await exportChatAsPDFNative(chat.id);
    setActionFeedback('PDF exported successfully');
    setTimeout(() => setActionFeedback(null), 2500);
  }

  async function handleExportCSV(chat: Conversation) {
    HapticService.impact();
    setSelectedChat(null);
    setActionFeedback('Generating CSV...');
    await exportChatAsCSVNative(chat.id);
    setActionFeedback('CSV exported successfully');
    setTimeout(() => setActionFeedback(null), 2500);
  }

  async function handleDeleteChat(chat: Conversation) {
    HapticService.deleteAction();
    await deleteConversationNative(chat.id);
    setShowDeleteConfirm(false);
    setSelectedChat(null);
    await loadData();
    setActionFeedback('Conversation deleted');
    setTimeout(() => setActionFeedback(null), 2000);
  }

  const filteredResults = useMemo(() => {
    let list = conversations;

    if (activeFilter === 'deleted') {
      list = list.filter(chat => chat.hasDeletedMessages || chat.deletedCount > 0);
    } else if (activeFilter === 'groups') {
      list = list.filter(chat => chat.isGroup);
    } else if (activeFilter === 'direct') {
      list = list.filter(chat => !chat.isGroup);
    }

    if (!searchQuery.trim()) {
      return list.map(item => ({ item, score: 1, matchedPositions: [] }));
    }

    return searchAndRank(
      list,
      (chat: Conversation) => `${chat.chatTitle} ${chat.lastMessageSnippet ?? ''}`,
      searchQuery
    );
  }, [conversations, activeFilter, searchQuery]);

  function handleConversationSelect(conversationId: string): void {
    HapticService.navigate();
    navigate(`/chats/${conversationId}`);
  }

  const totalDeleted = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.deletedCount ?? 0), 0),
    [conversations]
  );

  if (isLoading) {
    return (
      <main
        className="flex flex-col h-screen overflow-hidden"
        style={{
          background: 'var(--md-sys-color-background)',
          color: 'var(--md-sys-color-on-surface)',
        }}
      >
        <TopAppBar
          title="NotiCatch"
          subtitle="Loading conversations..."
          leading={
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'var(--md-sys-color-primary-container)',
                color: 'var(--md-sys-color-on-primary-container)',
              }}
            >
              <ShieldCheck className="w-4 h-4" strokeWidth={2.2} />
            </div>
          }
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </main>
    );
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        background: 'var(--md-sys-color-background)',
        color: 'var(--md-sys-color-on-surface)',
      }}
    >
      {/* Top Application Bar */}
      <TopAppBar
        title="NotiCatch"
        subtitle={
          lastSynced
            ? `Synced ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : undefined
        }
        leading={
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-primary)',
            }}
          >
            <ShieldCheck className="w-4 h-4" strokeWidth={2.2} />
          </div>
        }
        trailing={
          <>
            <IconButton
              id="chats-search-button"
              icon={<Search className="w-5 h-5" strokeWidth={2} style={{ color: 'var(--md-sys-color-on-surface)' }} />}
              label="Search conversations"
              onClick={() => {
                HapticService.tap();
                setSearchVisible(v => !v);
              }}
            />
            <IconButton
              id="chats-refresh-button"
              icon={
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  strokeWidth={2.2}
                  style={{ color: 'var(--md-sys-color-on-surface)' }}
                />
              }
              label="Refresh conversation list"
              onClick={handleRefresh}
            />
          </>
        }
      />

      {/* Notification Access Disabled Banner */}
      {hasNotifAccess === false && (
        <div className="pt-14 px-4 pb-2 z-20">
          <div
            className="rounded-2xl p-3.5 border animate-slide-down space-y-2"
            style={{
              background: 'var(--md-sys-color-warning-container)',
              borderColor: 'var(--md-sys-color-warning-border)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <BellOff
                className="w-4 h-4 flex-shrink-0"
                style={{ color: 'var(--md-sys-color-warning)' }}
                strokeWidth={2.2}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold" style={{ color: 'var(--md-sys-color-on-warning-container)' }}>
                  Notification Access Disabled
                </p>
                <p className="text-2xs font-medium leading-relaxed" style={{ color: 'var(--md-sys-color-on-warning-container)' }}>
                  WhatsApp notifications cannot be captured until listener access is enabled.
                </p>
              </div>
            </div>
            <button
              type="button"
              id="enable-notif-access-btn"
              onClick={() => {
                HapticService.selection();
                requestNotificationListenerPermission();
              }}
              className="btn-primary w-full text-xs"
            >
              Enable Notification Access
            </button>
          </div>
        </div>
      )}

      {/* Action Toast */}
      {actionFeedback && (
        <div
          className="fixed top-16 left-4 right-4 z-50 p-3 rounded-2xl text-xs font-bold text-center shadow-lg animate-slide-down"
          style={{
            background: 'var(--md-sys-color-primary)',
            color: 'var(--md-sys-color-on-primary)',
          }}
        >
          {actionFeedback}
        </div>
      )}

      {/* Search + Filter Strip */}
      <div
        className={`px-4 space-y-2 z-20 border-b ${hasNotifAccess === false ? 'pt-2' : 'pt-20'} pb-2.5`}
        style={{
          background: 'var(--md-sys-color-surface)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        {searchVisible && (
          <SearchInput
            id="chats-search-input"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search conversations..."
          />
        )}

        <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          {(['all', 'deleted', 'groups', 'direct'] as ChatFilter[]).map(filter => (
            <button
              key={filter}
              type="button"
              id={`filter-pill-${filter}`}
              aria-selected={activeFilter === filter}
              onClick={() => {
                HapticService.selection();
                setActiveFilter(filter);
              }}
              className={activeFilter === filter ? 'filter-pill-active' : 'filter-pill-inactive'}
            >
              {FILTER_LABELS[filter]}
            </button>
          ))}
          {totalDeleted > 0 && (
            <span
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-bold border"
              style={{
                background: 'var(--md-sys-color-tertiary-container)',
                color: 'var(--md-sys-color-on-tertiary-container)',
                borderColor: 'var(--md-sys-color-tertiary-border)',
              }}
            >
              {totalDeleted} deleted
            </span>
          )}
        </div>
      </div>

      {/* Scrollable Conversation List */}
      <div className="flex-1 overflow-y-auto pb-20">
        {filteredResults.length > 0 ? (
          <ul
            role="list"
            className="divide-y"
            style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
          >
            {filteredResults.map((result, index) => (
              <li
                key={result.item.id}
                className="animate-slide-up"
                style={{
                  animationDelay: `${Math.min(index * 25, 200)}ms`,
                  borderColor: 'var(--md-sys-color-outline-variant)',
                }}
              >
                <ConversationRow
                  conversation={result.item}
                  onClick={handleConversationSelect}
                  onLongPress={chat => {
                    HapticService.longPress();
                    setSelectedChat(chat);
                  }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 pt-16 space-y-4">
            <EmptyState
              icon={<MessageCircle className="w-7 h-7" style={{ color: 'var(--md-sys-color-on-surface-muted)' }} strokeWidth={1.8} />}
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
          </div>
        )}
      </div>

      {/* Long-Press Action Sheet */}
      {selectedChat && !showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
          style={{ backgroundColor: 'var(--md-sys-color-scrim)' }}
          onClick={() => setSelectedChat(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-5 shadow-xl border animate-slide-up space-y-3"
            style={{
              background: 'var(--md-sys-color-surface-container-low)',
              borderColor: 'var(--md-sys-color-outline-variant)',
              boxShadow: 'var(--md-elevation-5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between pb-3 border-b"
              style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
            >
              <div className="min-w-0 flex-1">
                <h3
                  className="text-base font-bold truncate"
                  style={{ color: 'var(--md-sys-color-on-surface)' }}
                >
                  {selectedChat.chatTitle}
                </h3>
                <p
                  className="text-2xs font-medium mt-0.5"
                  style={{ color: 'var(--md-sys-color-on-surface-muted)' }}
                >
                  {selectedChat.isGroup ? 'Group Chat' : 'Direct Contact'} &middot; {selectedChat.deletedCount} deleted
                </p>
              </div>
              <button
                type="button"
                onClick={() => { HapticService.tap(); setSelectedChat(null); }}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: 'var(--md-sys-color-surface-container-highest)',
                  color: 'var(--md-sys-color-on-surface-variant)',
                }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleMarkAsRead(selectedChat)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors text-xs font-bold min-h-[48px]"
                style={{
                  color: 'var(--md-sys-color-on-surface)',
                  background: 'var(--md-sys-color-surface)',
                }}
              >
                <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--md-sys-color-primary)' }} />
                <span>Mark as Read</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportPDF(selectedChat)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors text-xs font-bold min-h-[48px]"
                style={{
                  color: 'var(--md-sys-color-on-surface)',
                  background: 'var(--md-sys-color-surface)',
                }}
              >
                <FileText className="w-4 h-4" style={{ color: 'var(--md-sys-color-primary)' }} />
                <span>Export as PDF Dossier</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportCSV(selectedChat)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors text-xs font-bold min-h-[48px]"
                style={{
                  color: 'var(--md-sys-color-on-surface)',
                  background: 'var(--md-sys-color-surface)',
                }}
              >
                <Share2 className="w-4 h-4" style={{ color: 'var(--md-sys-color-primary)' }} />
                <span>Export as CSV Spreadsheet</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  HapticService.warning();
                  setShowDeleteConfirm(true);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors text-xs font-bold min-h-[48px]"
                style={{
                  color: 'var(--md-sys-color-error)',
                  background: 'var(--md-sys-color-error-container)',
                }}
              >
                <Trash2 className="w-4 h-4" style={{ color: 'var(--md-sys-color-error)' }} />
                <span>Delete Conversation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title="Delete Conversation"
        description={`Permanently delete all captured messages for "${selectedChat?.chatTitle}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDangerous={true}
        confirmVariant="danger"
        onConfirm={() => selectedChat && handleDeleteChat(selectedChat)}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
