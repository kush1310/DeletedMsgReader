/**
 * ChatsPage
 *
 * Lists all captured WhatsApp conversations sorted by most recent activity.
 * Data is loaded from the native Room DB via NativeBridgeService on Android.
 * Real-time refresh: listens for the 'noticatch:new-message' CustomEvent
 * dispatched by the Capacitor bridge when a new notification is captured.
 *
 * Features:
 *   - Auto-deduplicated conversation threads
 *   - Long-press action sheet (Export PDF/CSV, Mark as Read, Delete Chat)
 *   - Real-time unread badge clearance
 *   - Filter tabs: [All] [Has Deleted] [Groups] [Direct]
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  RefreshCw,
  BellOff,
  Zap,
  CheckCircle2,
  FileText,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { TopAppBar, IconButton } from '@/components/navigation';
import { SearchInput, EmptyState, LoadingSpinner, ConfirmationModal } from '@/components/common';
import { ConversationRow } from '@/components/chat';
import {
  getConversations,
  checkNotificationListenerEnabled,
  requestNotificationListenerPermission,
  simulateNotification,
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
  const navigate = useNavigate();
  const isNative = isNativeAndroid();

  const [searchQuery,           setSearchQuery]           = useState('');
  const [conversations,         setConversations]         = useState<Conversation[]>([]);
  const [isLoading,             setIsLoading]             = useState(true);
  const [isRefreshing,          setIsRefreshing]          = useState(false);
  const [activeFilter,          setActiveFilter]          = useState<ChatFilter>('all');
  const [lastSynced,            setLastSynced]            = useState<Date | null>(null);
  const [hasNotifAccess,        setHasNotifAccess]        = useState<boolean | null>(null);
  const [isSimulating,          setIsSimulating]          = useState(false);

  /* Long-Press Action Sheet state */
  const [selectedChat,          setSelectedChat]          = useState<Conversation | null>(null);
  const [showDeleteConfirm,     setShowDeleteConfirm]     = useState(false);
  const [actionFeedback,        setActionFeedback]        = useState<string | null>(null);

  const verifyPermissionState = useCallback(async (): Promise<void> => {
    if (!isNative) {
      setHasNotifAccess(true);
      return;
    }
    const enabled = await checkNotificationListenerEnabled();
    setHasNotifAccess(enabled);
  }, [isNative]);

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

  useEffect(() => {
    const timer = setInterval(() => {
      loadData();
    }, 3500);
    return () => clearInterval(timer);
  }, [loadData]);

  useEffect(() => {
    function handleNewMessage(): void {
      loadData();
    }
    window.addEventListener('noticatch:new-message', handleNewMessage);
    return () => window.removeEventListener('noticatch:new-message', handleNewMessage);
  }, [loadData]);

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

  /* Actions from Long-Press Sheet */
  async function handleMarkAsRead(chat: Conversation) {
    await markConversationAsReadNative(chat.id);
    setSelectedChat(null);
    await loadData();
    setActionFeedback('Marked as read');
    setTimeout(() => setActionFeedback(null), 2000);
  }

  async function handleExportPDF(chat: Conversation) {
    const res = await exportChatAsPDFNative(chat.id, chat.chatTitle);
    setSelectedChat(null);
    if (res.filePath) {
      setActionFeedback(`Exported ${res.rowCount} messages to PDF`);
      setTimeout(() => setActionFeedback(null), 2500);
    }
  }

  async function handleExportCSV(chat: Conversation) {
    const res = await exportChatAsCSVNative(chat.id, chat.chatTitle);
    setSelectedChat(null);
    if (res.filePath) {
      setActionFeedback(`Exported ${res.rowCount} messages to CSV`);
      setTimeout(() => setActionFeedback(null), 2500);
    }
  }

  async function handleDeleteConfirm() {
    if (!selectedChat) return;
    await deleteConversationNative(selectedChat.id);
    setShowDeleteConfirm(false);
    setSelectedChat(null);
    await loadData();
    setActionFeedback('Chat deleted');
    setTimeout(() => setActionFeedback(null), 2000);
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

      {/* Permission Warning Banner */}
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
                onClick={requestNotificationListenerPermission}
                className="btn-neu-primary flex-1 text-2xs py-2 font-black tracking-wide"
              >
                1. Enable Notification Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Toast Feedback */}
      {actionFeedback && (
        <div className="fixed top-16 left-4 right-4 z-50 p-2.5 rounded-xl bg-accent text-white text-xs font-bold text-center shadow-lg animate-slide-down">
          {actionFeedback}
        </div>
      )}

      {/* Search and Filters */}
      <div className={`px-4 pt-3 pb-2 space-y-2 z-20 ${hasNotifAccess === false ? '' : 'pt-16'}`}>
        <SearchInput
          id="chats-search-input"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search conversations..."
        />

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
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
                  onLongPress={chat => setSelectedChat(chat)}
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

      {/* Long-Press Action Sheet Modal */}
      {selectedChat && !showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedChat(null)}
        >
          <div
            className="w-full max-w-sm bg-surface-900 rounded-3xl p-5 shadow-skeuo-heavy border border-white/80 animate-slide-up space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-surface-700">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-extrabold text-content-primary truncate">
                  {selectedChat.chatTitle}
                </h3>
                <p className="text-2xs text-content-muted font-medium">
                  {selectedChat.isGroup ? 'Group Chat' : 'Direct Contact'} &middot; {selectedChat.deletedCount} deleted
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChat(null)}
                className="w-7 h-7 rounded-full bg-surface-800 flex items-center justify-center text-content-muted"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleMarkAsRead(selectedChat)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-850 hover:bg-surface-700 text-left transition-colors text-xs font-bold text-content-primary"
              >
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span>Mark as Read</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportPDF(selectedChat)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-850 hover:bg-surface-700 text-left transition-colors text-xs font-bold text-content-primary"
              >
                <FileText className="w-4 h-4 text-accent" />
                <span>Export Chat to PDF</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportCSV(selectedChat)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-850 hover:bg-surface-700 text-left transition-colors text-xs font-bold text-content-primary"
              >
                <Share2 className="w-4 h-4 text-accent" />
                <span>Export Chat to CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-left transition-colors text-xs font-bold text-rose-700 border border-rose-200"
              >
                <Trash2 className="w-4 h-4 text-rose-700" />
                <span>Delete Entire Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {selectedChat && (
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          title={`Delete "${selectedChat.chatTitle}"?`}
          description="All captured messages and deletion history for this conversation will be permanently removed from local SQLite storage."
          confirmLabel="Delete Chat"
          confirmVariant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setSelectedChat(null);
          }}
        />
      )}
    </div>
  );
}
