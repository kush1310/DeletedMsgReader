/**
 * ChatsPage
 *
 * Lists all captured WhatsApp conversations sorted by most recent activity.
 * Styled in Anthropic Claude warm editorial aesthetic.
 * All dummy and simulated test message triggers have been removed.
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
  Menu,
} from 'lucide-react';
import { TopAppBar, IconButton, SideNavigationDrawer } from '@/components/navigation';
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
  const navigate = useNavigate();
  const isNative = isNativeAndroid();

  const [searchQuery,           setSearchQuery]           = useState('');
  const [conversations,         setConversations]         = useState<Conversation[]>([]);
  const [isLoading,             setIsLoading]             = useState(true);
  const [isRefreshing,          setIsRefreshing]          = useState(false);
  const [activeFilter,          setActiveFilter]          = useState<ChatFilter>('all');
  const [lastSynced,            setLastSynced]            = useState<Date | null>(null);
  const [hasNotifAccess,        setHasNotifAccess]        = useState<boolean | null>(null);
  const [isDrawerOpen,          setIsDrawerOpen]          = useState(false);

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

  if (isLoading) {
    return (
      <main className="flex flex-col h-screen overflow-hidden bg-canvas">
        <TopAppBar
          title="Chats"
          subtitle="Loading conversations..."
          leading={
            <IconButton
              id="chats-hamburger-btn"
              icon={<Menu className="w-5 h-5 text-content-primary" strokeWidth={2} />}
              label="Menu"
              onClick={() => setIsDrawerOpen(true)}
            />
          }
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-canvas">
      {/* Top Application Bar */}
      <TopAppBar
        title="Chats"
        subtitle={
          lastSynced
            ? `Synced ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : undefined
        }
        leading={
          <IconButton
            id="chats-hamburger-btn"
            icon={<Menu className="w-5 h-5 text-content-primary" strokeWidth={2} />}
            label="Open Navigation Drawer"
            onClick={() => setIsDrawerOpen(true)}
          />
        }
        trailing={
          <IconButton
            id="chats-refresh-button"
            icon={
              <RefreshCw
                className={`w-4 h-4 text-content-secondary ${isRefreshing ? 'animate-spin' : ''}`}
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
        <div className="pt-14 px-4 pb-2 z-20">
          <div className="card p-3.5 border-amber-300 bg-[#FDF4E7] shadow-card space-y-2 animate-slide-down">
            <div className="flex items-center gap-2.5 text-accent">
              <BellOff className="w-4 h-4 text-accent shrink-0" strokeWidth={2.2} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-accent">Notification Access Disabled</p>
                <p className="text-2xs text-[#9C5418] font-medium leading-relaxed">
                  WhatsApp notifications cannot be captured until listener access is enabled.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                id="enable-notif-access-btn"
                onClick={requestNotificationListenerPermission}
                className="btn-neu-primary flex-1 text-2xs py-2 font-bold"
              >
                Enable Notification Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Toast Feedback */}
      {actionFeedback && (
        <div className="fixed top-16 left-4 right-4 z-50 p-2.5 rounded-xl bg-accent text-white text-xs font-bold text-center shadow-warm-md animate-slide-down">
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
          <div className="px-4">
            <ul role="list" className="card overflow-hidden divide-y divide-surface-700 shadow-card">
              {filteredResults.map((result, index) => (
                <li
                  key={result.item.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${Math.min(index * 30, 240)}ms` }}
                >
                  <ConversationRow
                    conversation={result.item}
                    onClick={handleConversationSelect}
                    onLongPress={chat => setSelectedChat(chat)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <EmptyState
              icon={<MessageCircle className="w-7 h-7" strokeWidth={1.8} />}
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

      {/* Side Navigation Drawer */}
      <SideNavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* Long-Press Action Sheet Modal */}
      {selectedChat && !showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedChat(null)}
        >
          <div
            className="w-full max-w-sm bg-surface-900 rounded-3xl p-5 shadow-card-lg border border-surface-700 animate-slide-up space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-surface-700">
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-base font-bold text-content-primary truncate">
                  {selectedChat.chatTitle}
                </h3>
                <p className="text-2xs text-content-muted font-medium">
                  {selectedChat.isGroup ? 'Group Chat' : 'Direct Contact'} &middot; {selectedChat.deletedCount} deleted
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChat(null)}
                className="w-7 h-7 rounded-full bg-surface-850 flex items-center justify-center text-content-muted"
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
                <span>Export as PDF Dossier</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportCSV(selectedChat)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-850 hover:bg-surface-700 text-left transition-colors text-xs font-bold text-content-primary"
              >
                <Share2 className="w-4 h-4 text-accent" />
                <span>Export as CSV Spreadsheet</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-left transition-colors text-xs font-bold text-rose-700"
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
