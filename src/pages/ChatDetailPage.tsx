/**
 * ChatDetailPage
 *
 * Full message timeline for a single captured WhatsApp conversation.
 *
 * Visual system: Signal Android Chat Screen — dark background (#121212),
 * dark received bubbles (#1E2028 / white text), Signal-blue sent bubbles
 * (not applicable — NotiCatch intercepts received notifications only),
 * amber deleted message bubbles, and a dark top bar with back arrow + avatar.
 *
 * The bottom bar is a read-only utility strip (search, deleted-only filter,
 * export actions) — NOT a chat input. NotiCatch is a message VIEWER, not
 * a messenger. All Claude-style input bars, Sonnet model pills, mic buttons,
 * and audio controls have been completely removed.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  X,
  AlertTriangle,
  Info,
  Lock,
  ArrowDown,
  MoreVertical,
  Trash2,
  Filter,
  Download,
  FileText,
  Share2,
} from 'lucide-react';
import { TopAppBar, IconButton } from '@/components/navigation';
import { EmptyState, SectionDivider, SearchInput, LoadingSpinner } from '@/components/common';
import { MessageBubble } from '@/components/chat';
import {
  getMessages,
  getConversations,
  exportChatAsPDFNative,
  exportChatAsCSVNative,
  markConversationAsReadNative,
} from '@/services/NativeBridgeService';
import { searchAndRank } from '@/services/SearchEngine';
import type { Message, Conversation } from '@/types';

/**
 * Derives a deterministic avatar background color from the first char of
 * the contact name. Used for the circular avatar in the dark top bar.
 *
 * @param name - Contact or group display name.
 * @returns    - Hex color for the avatar background.
 */
function avatarBgColor(name: string): string {
  const palette = ['#3730A3', '#166534', '#9A3412', '#9D174D', '#0369A1', '#5B21B6'];
  return palette[(name.charCodeAt(0) || 0) % palette.length];
}

export function ChatDetailPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate           = useNavigate();
  const bottomRef          = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [searchOpen,       setSearchOpen]       = useState(false);
  const [searchQuery,      setSearchQuery]       = useState('');
  const [showThreadInfo,   setShowThreadInfo]   = useState(false);
  const [isLoading,        setIsLoading]        = useState(true);
  const [conversation,     setConversation]     = useState<Conversation | null>(null);
  const [allMessages,      setAllMessages]      = useState<Message[]>([]);
  const [showDeletedOnly,  setShowDeletedOnly]  = useState(false);
  const [showScrollDown,   setShowScrollDown]   = useState(false);

  /**
   * loadThreadData
   *
   * Marks the conversation as read, then fetches the conversation metadata
   * and the full message list from the on-device Room SQLite DB.
   *
   * @validates - conversationId must be non-empty string.
   * @edge-cases - If conversationId is missing, exits early and sets isLoading false.
   */
  const loadThreadData = useCallback(async (): Promise<void> => {
    if (!conversationId) {
      setIsLoading(false);
      return;
    }

    await markConversationAsReadNative(conversationId);

    const [convos, msgs] = await Promise.all([
      getConversations(),
      getMessages(conversationId),
    ]);
    const found = convos.find((c: Conversation) => c.id === conversationId) ?? null;
    setConversation(found);
    setAllMessages(msgs);
    setIsLoading(false);
  }, [conversationId]);

  useEffect(() => {
    loadThreadData();
  }, [loadThreadData]);

  useEffect(() => {
    function handleNewMessage(): void { loadThreadData(); }
    window.addEventListener('noticatch:new-message', handleNewMessage);
    return () => window.removeEventListener('noticatch:new-message', handleNewMessage);
  }, [loadThreadData]);

  useEffect(() => {
    if (!isLoading && !searchQuery) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLoading, searchQuery]);

  const deletedMessages = useMemo(
    () => allMessages.filter(m => m.isDeletedBySender),
    [allMessages]
  );

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchAndRank(
      allMessages,
      m => `${m.senderName} ${m.messageText ?? ''}`,
      searchQuery
    );
  }, [allMessages, searchQuery]);

  const displayedMessages = useMemo(() => {
    if (searchQuery.trim()) {
      return searchResults.map(r => r.item);
    }
    if (showDeletedOnly) {
      return deletedMessages;
    }
    return allMessages;
  }, [allMessages, deletedMessages, searchResults, searchQuery, showDeletedOnly]);

  const groupedByDate = useMemo(() => {
    const groups: { dateLabel: string; messages: Message[] }[] = [];
    let currentGroup: { dateLabel: string; messages: Message[] } | null = null;

    for (const msg of displayedMessages) {
      const msgDate  = new Date(msg.timestamp);
      const dateLabel = formatDividerDate(msgDate);

      if (!currentGroup || currentGroup.dateLabel !== dateLabel) {
        currentGroup = { dateLabel, messages: [msg] };
        groups.push(currentGroup);
      } else {
        currentGroup.messages.push(msg);
      }
    }
    return groups;
  }, [displayedMessages]);

  function handleScroll(e: React.UIEvent<HTMLDivElement>): void {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 120;
    setShowScrollDown(!isAtBottom);
  }

  function scrollToBottom(): void {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  /* ============================================================
     Loading state
     ============================================================ */
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen" style={{ background: '#121212' }}>
        <TopAppBar
          title="Conversation"
          dark={true}
          leading={
            <IconButton
              id="chat-detail-back-button"
              icon={<ArrowLeft className="w-5 h-5" />}
              label="Back"
              onClick={() => navigate('/chats')}
              dark={true}
            />
          }
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  /* ============================================================
     Not found state
     ============================================================ */
  if (!conversation) {
    return (
      <div className="flex flex-col h-screen" style={{ background: '#121212' }}>
        <TopAppBar
          title="Chat Not Found"
          dark={true}
          leading={
            <IconButton
              id="chat-detail-back-button"
              icon={<ArrowLeft className="w-5 h-5" />}
              label="Back"
              onClick={() => navigate('/chats')}
              dark={true}
            />
          }
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <EmptyState
            icon={<AlertTriangle className="w-8 h-8" style={{ color: '#F59E0B' }} />}
            title="Conversation Not Found"
            description="This chat thread does not exist in local storage."
            action={
              <button
                type="button"
                onClick={() => navigate('/chats')}
                className="btn-neu-primary text-xs py-2 px-4"
              >
                Return to Chats
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const initials = conversation.chatTitle
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  /* ============================================================
     Main chat timeline view
     ============================================================ */
  return (
    <div className="flex flex-col h-full relative" style={{ background: '#121212', color: '#F9FAFB' }}>

      {/* Dark Top Bar — Signal Chat Screen style */}
      <header className="top-bar-dark pt-safe">
        <div className="flex items-center justify-between px-2 h-14">
          <div className="flex items-center gap-2 min-w-0">
            <IconButton
              id="chat-detail-back-button"
              icon={<ArrowLeft className="w-5 h-5" />}
              label="Back to conversations"
              onClick={() => navigate('/chats')}
              dark={true}
            />
            {/* Avatar circle */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: avatarBgColor(conversation.chatTitle) }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate max-w-[160px] sm:max-w-xs leading-tight">
                {conversation.chatTitle}
              </h1>
              {conversation.isGroup && (
                <p className="text-2xs text-[#9CA3AF] font-medium leading-tight">Group</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Deleted-only toggle pill */}
            {deletedMessages.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDeletedOnly(prev => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold border transition-all"
                style={
                  showDeletedOnly
                    ? { background: '#FFF4E5', color: '#92400E', borderColor: '#FED7AA' }
                    : { background: 'rgba(255,255,255,0.08)', color: '#D1D5DB', borderColor: 'rgba(255,255,255,0.12)' }
                }
              >
                <Trash2 className="w-3 h-3" strokeWidth={2} />
                <span>{deletedMessages.length} Deleted</span>
              </button>
            )}
            <IconButton
              id="chat-search-toggle-button"
              icon={
                searchOpen
                  ? <X className="w-5 h-5" strokeWidth={2.2} />
                  : <Search className="w-5 h-5" strokeWidth={2.2} />
              }
              label={searchOpen ? 'Close search' : 'Search messages'}
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setSearchQuery('');
              }}
              dark={true}
            />
            <IconButton
              id="chat-info-toggle-button"
              icon={<MoreVertical className="w-5 h-5" strokeWidth={2.2} />}
              label="Thread Options"
              onClick={() => setShowThreadInfo(!showThreadInfo)}
              dark={true}
            />
          </div>
        </div>
      </header>

      {/* In-Thread Search Bar */}
      {searchOpen && (
        <div className="fixed top-14 left-0 right-0 z-30 border-b px-4 py-2.5 shadow-lg animate-slide-down"
          style={{ background: '#1C1C1E', borderColor: '#2C2C2E' }}>
          <SearchInput
            id="chat-detail-search-input"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={`Search in ${conversation.chatTitle}...`}
            matchCount={searchQuery ? searchResults.length : undefined}
          />
        </div>
      )}

      {/* Thread Options Action Sheet */}
      {showThreadInfo && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowThreadInfo(false)}
        >
          <div
            className="w-full max-w-md p-6 space-y-4 shadow-xl rounded-3xl border animate-scale-in"
            style={{ background: '#1C1C1E', borderColor: '#2C2C2E' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: '#2C2C2E' }}>
              <h3 className="text-base font-bold text-white">Thread Details</h3>
              <button
                type="button"
                onClick={() => setShowThreadInfo(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#9CA3AF] hover:text-white transition-colors"
                style={{ background: '#2C2C2E' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#9CA3AF] font-medium">
              <div className="flex justify-between">
                <span>Total Captured</span>
                <span className="font-bold text-white">{allMessages.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Deleted Messages</span>
                <span className="font-bold" style={{ color: '#F59E0B' }}>{deletedMessages.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Storage Mode</span>
                <span className="font-bold text-white">On-device SQLite Room WAL</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t" style={{ borderColor: '#2C2C2E' }}>
              <button
                type="button"
                onClick={async () => {
                  setShowThreadInfo(false);
                  await exportChatAsPDFNative(conversation.id);
                }}
                className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                style={{ background: '#2C6BED' }}
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowThreadInfo(false);
                  await exportChatAsCSVNative(conversation.id);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 border"
                style={{ background: '#2C2C2E', color: '#D1D5DB', borderColor: '#3C3C3E' }}
              >
                <Share2 className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scroll-to-Bottom FAB */}
      {showScrollDown && (
        <button
          type="button"
          id="scroll-to-bottom-button"
          onClick={scrollToBottom}
          className="fixed bottom-24 right-4 z-30 w-9 h-9 rounded-full flex items-center justify-center shadow-lg animate-scale-in border"
          style={{ background: '#1C1C1E', borderColor: '#2C2C2E', color: '#9CA3AF' }}
        >
          <ArrowDown className="w-4 h-4" strokeWidth={2.2} />
        </button>
      )}

      {/* ---- Scrollable Message Timeline ---- */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto px-4 space-y-3 ${searchOpen ? 'pt-28' : 'pt-16'} pb-24`}
      >
        {/* Vault security pill */}
        <div className="flex items-center justify-center my-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)' }}>
            <Lock className="w-3 h-3 text-[#9CA3AF]" strokeWidth={2} />
            <span className="text-2xs text-[#9CA3AF] font-semibold">
              100% Offline Vault · Zero Network Transfer
            </span>
          </div>
        </div>

        {groupedByDate.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<Info className="w-8 h-8 text-[#6B7280]" />}
              title={showDeletedOnly ? 'No Deleted Messages' : 'No Messages Captured'}
              description={
                showDeletedOnly
                  ? 'None of the captured messages in this conversation have been deleted by the sender.'
                  : 'No notification messages have been recorded for this contact yet.'
              }
            />
          </div>
        ) : (
          groupedByDate.map(group => (
            <div key={group.dateLabel} className="space-y-3">
              <SectionDivider label={group.dateLabel} />
              {group.messages.map(message => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>
          ))
        )}

        <div ref={bottomRef} />
      </div>

      {/* ---- Read-Only Utility Bar (NOT a chat input) ---- */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t pb-safe"
        style={{ background: 'rgba(28, 28, 30, 0.98)', borderColor: '#2C2C2E' }}>
        <div className="flex items-center gap-2 px-4 py-2 max-w-lg mx-auto">
          {/* In-thread search shortcut */}
          <button
            type="button"
            onClick={() => { setSearchOpen(true); }}
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[#9CA3AF] border transition-colors"
            style={{ background: '#2C2C2E', borderColor: '#3C3C3E' }}
          >
            <Search className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
            <span className="truncate">Search messages...</span>
          </button>

          {/* Deleted-only filter toggle */}
          <button
            type="button"
            onClick={() => setShowDeletedOnly(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all flex-shrink-0"
            style={
              showDeletedOnly
                ? { background: '#FFF4E5', color: '#92400E', borderColor: '#FED7AA' }
                : { background: '#2C2C2E', color: '#9CA3AF', borderColor: '#3C3C3E' }
            }
            title={showDeletedOnly ? 'Show all messages' : 'Show deleted only'}
          >
            <Filter className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Deleted</span>
          </button>

          {/* Export shortcut */}
          <button
            type="button"
            onClick={() => setShowThreadInfo(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors flex-shrink-0"
            style={{ background: '#2C2C2E', borderColor: '#3C3C3E', color: '#9CA3AF' }}
            title="Export options"
          >
            <Download className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDividerDate(date: Date): string {
  const today     = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString([], {
    weekday: 'long',
    month:   'short',
    day:     'numeric',
  });
}
