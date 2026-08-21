/**
 * ChatsPage
 *
 * Lists all captured WhatsApp conversations sorted by most recent activity.
 *
 * Visual system: Signal Android Home Screen — pure white canvas, conversation
 * rows with circular initials avatars, Signal-blue unread badges, amber deleted
 * message counters, and a clean search + filter-pill header.
 *
 * Architecture: No hamburger button, no side drawer. Bottom navigation is the
 * sole primary navigation mechanism.
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
   * Checks whether the Android NotificationListenerService is currently
   * enabled. Updates hasNotifAccess to drive the permission warning banner.
   * On the web preview, always reports access as granted.
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
   * Fetches all captured conversations from the on-device Room SQLite DB via
   * NativeBridgeService. Updates state and records the sync timestamp.
   */
  const loadData = useCallback(async (): Promise<void> => {
    const data = await getConversations();
    setConversations(data);
    setLastSynced(new Date());
    setIsLoading(false);
  }, []);

  async function handleRefresh(): Promise<void> {
    setIsRefreshing(true);
    await Promise.all([loadData(), verifyPermissionState()]);
    setIsRefreshing(false);
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

  /**
   * handleMarkAsRead
   *
   * Calls the NativeBridge to mark a conversation as read in the Room DB,
   * then refreshes the conversation list.
   *
   * @param chat - The Conversation to mark as read.
   */
  async function handleMarkAsRead(chat: Conversation) {
    await markConversationAsReadNative(chat.id);
    setSelectedChat(null);
    await loadData();
    setActionFeedback('Marked as read');
    setTimeout(() => setActionFeedback(null), 2000);
  }

  async function handleExportPDF(chat: Conversation) {
    setSelectedChat(null);
    setActionFeedback('Generating PDF...');
    await exportChatAsPDFNative(chat.id);
    setActionFeedback('PDF exported successfully');
    setTimeout(() => setActionFeedback(null), 2500);
  }

  async function handleExportCSV(chat: Conversation) {
    setSelectedChat(null);
    setActionFeedback('Generating CSV...');
    await exportChatAsCSVNative(chat.id);
    setActionFeedback('CSV exported successfully');
    setTimeout(() => setActionFeedback(null), 2500);
  }

  async function handleDeleteChat(chat: Conversation) {
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
    navigate(`/chats/${conversationId}`);
  }

  const totalDeleted = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.deletedCount ?? 0), 0),
    [conversations]
  );

  if (isLoading) {
    return (
      <main className="flex flex-col h-screen overflow-hidden bg-white">
        <TopAppBar
          title="NotiCatch"
          subtitle="Loading conversations..."
          leading={
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#EEF2FF' }}>
              <ShieldCheck className="w-4 h-4 text-[#2C6BED]" strokeWidth={2.2} />
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
    <div className="flex flex-col h-screen overflow-hidden bg-white">

      {/* Top Application Bar — Signal White Style */}
      <TopAppBar
        title="NotiCatch"
        subtitle={
          lastSynced
            ? `Synced ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : undefined
        }
        leading={
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EEF2FF' }}>
            <ShieldCheck className="w-4 h-4 text-[#2C6BED]" strokeWidth={2.2} />
          </div>
        }
        trailing={
          <>
            <IconButton
              id="chats-search-button"
              icon={<Search className="w-5 h-5" strokeWidth={2} />}
              label="Search conversations"
              onClick={() => setSearchVisible(v => !v)}
            />
            <IconButton
              id="chats-refresh-button"
              icon={
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#2C6BED]' : ''}`}
                  strokeWidth={2.2}
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
          <div className="rounded-2xl p-3.5 border animate-slide-down space-y-2"
            style={{ background: '#FFF4E5', borderColor: '#FED7AA' }}>
            <div className="flex items-center gap-2.5">
              <BellOff className="w-4 h-4 flex-shrink-0" style={{ color: '#D97706' }} strokeWidth={2.2} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold" style={{ color: '#92400E' }}>Notification Access Disabled</p>
                <p className="text-2xs font-medium leading-relaxed" style={{ color: '#B45309' }}>
                  WhatsApp notifications cannot be captured until listener access is enabled.
                </p>
              </div>
            </div>
            <button
              type="button"
              id="enable-notif-access-btn"
              onClick={requestNotificationListenerPermission}
              className="w-full py-2 rounded-xl text-white text-xs font-bold transition-colors"
              style={{ background: '#2C6BED' }}
            >
              Enable Notification Access
            </button>
          </div>
        </div>
      )}

      {/* Action Toast */}
      {actionFeedback && (
        <div
          className="fixed top-16 left-4 right-4 z-50 p-2.5 rounded-xl text-white text-xs font-bold text-center shadow-lg animate-slide-down"
          style={{ background: '#2C6BED' }}
        >
          {actionFeedback}
        </div>
      )}

      {/* Search + Filter Strip */}
      <div className={`px-4 space-y-2 z-20 border-b border-[#E5E7EB] bg-white ${hasNotifAccess === false ? 'pt-2' : 'pt-20'} pb-2.5`}>
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
              onClick={() => setActiveFilter(filter)}
              className={activeFilter === filter ? 'filter-pill-active' : 'filter-pill-inactive'}
            >
              {FILTER_LABELS[filter]}
            </button>
          ))}
          {totalDeleted > 0 && (
            <span className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-bold"
              style={{ background: '#FFF4E5', color: '#92400E', border: '1px solid #FED7AA' }}>
              {totalDeleted} deleted
            </span>
          )}
        </div>
      </div>

      {/* Scrollable Conversation List */}
      <div className="flex-1 overflow-y-auto pb-20">
        {filteredResults.length > 0 ? (
          <ul role="list" className="divide-y divide-[#F2F2F7]">
            {filteredResults.map((result, index) => (
              <li
                key={result.item.id}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(index * 25, 200)}ms` }}
              >
                <ConversationRow
                  conversation={result.item}
                  onClick={handleConversationSelect}
                  onLongPress={chat => setSelectedChat(chat)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 pt-16 space-y-4">
            <EmptyState
              icon={<MessageCircle className="w-7 h-7 text-[#9CA3AF]" strokeWidth={1.8} />}
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
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedChat(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-xl border border-[#E5E7EB] animate-slide-up space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F2F7]">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-[#111827] truncate">
                  {selectedChat.chatTitle}
                </h3>
                <p className="text-2xs text-[#9CA3AF] font-medium mt-0.5">
                  {selectedChat.isGroup ? 'Group Chat' : 'Direct Contact'} &middot; {selectedChat.deletedCount} deleted
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChat(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#9CA3AF] hover:text-[#4B5563]"
                style={{ background: '#F2F2F7' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleMarkAsRead(selectedChat)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors text-xs font-bold text-[#111827] hover:bg-[#F8F9FA]"
              >
                <CheckCircle2 className="w-4 h-4 text-[#2C6BED]" />
                <span>Mark as Read</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportPDF(selectedChat)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors text-xs font-bold text-[#111827] hover:bg-[#F8F9FA]"
              >
                <FileText className="w-4 h-4 text-[#2C6BED]" />
                <span>Export as PDF Dossier</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportCSV(selectedChat)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors text-xs font-bold text-[#111827] hover:bg-[#F8F9FA]"
              >
                <Share2 className="w-4 h-4 text-[#2C6BED]" />
                <span>Export as CSV Spreadsheet</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors text-xs font-bold text-rose-700 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
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
        confirmVariant="danger"
        onConfirm={() => selectedChat && handleDeleteChat(selectedChat)}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
