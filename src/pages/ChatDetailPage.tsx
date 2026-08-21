/**
 * ChatDetailPage
 *
 * Full conversation timeline view for a single WhatsApp contact or group.
 *
 * Visual system: Signal Android Clean Light Aesthetic
 * - White top app bar with back navigation, circular initials avatar, title,
 *   header search toggle, and thread options action sheet.
 * - Unified full-screen message timeline (eliminates white-gap container bugs).
 * - Received messages: crisp white speech bubbles with hairline neutral border.
 * - Deleted messages: prominent amber-colored recovered cards with deleted badge.
 * - Bottom utility strip: dedicated Deleted Filter toggle and PDF/CSV Export buttons
 *   (redundant bottom search bar removed in favor of top-bar search).
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  MoreVertical,
  X,
  FileText,
  Share2,
  Trash2,
  Lock,
  ArrowDown,
  Filter,
  Info,
} from 'lucide-react';
import { IconButton } from '@/components/navigation';
import { SearchInput, EmptyState, LoadingSpinner } from '@/components/common';
import { MessageBubble } from '@/components/chat';
import {
  getMessagesByConversation,
  getConversations,
  markConversationAsReadNative,
  exportChatAsPDFNative,
  exportChatAsCSVNative,
} from '@/services/NativeBridgeService';
import type { Message, Conversation } from '@/types';

function avatarBgColor(name: string): string {
  const palette = [
    '#2C6BED', '#059669', '#D97706', '#DC2626',
    '#7C3AED', '#0891B2', '#4F46E5', '#BE185D',
  ];
  const index = (name.charCodeAt(0) || 0) % palette.length;
  return palette[index];
}

interface DateGroup {
  readonly dateLabel: string;
  readonly messages:  readonly Message[];
}

function SectionDivider({ label }: { readonly label: string }) {
  return (
    <div className="flex items-center justify-center my-3">
      <div className="px-3 py-1 rounded-full text-2xs font-semibold shadow-xs border border-[#E5E7EB]"
        style={{ background: '#F3F4F6', color: '#6B7280' }}>
        {label}
      </div>
    </div>
  );
}

export function ChatDetailPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate           = useNavigate();

  const [conversation,    setConversation]    = useState<Conversation | null>(null);
  const [allMessages,     setAllMessages]     = useState<Message[]>([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [showDeletedOnly, setShowDeletedOnly] = useState(false);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [searchOpen,      setSearchOpen]      = useState(false);
  const [showThreadInfo,  setShowThreadInfo]  = useState(false);
  const [showScrollDown,  setShowScrollDown]  = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef          = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async (): Promise<void> => {
    if (!conversationId) return;

    try {
      const [messagesData, convs] = await Promise.all([
        getMessagesByConversation(conversationId),
        getConversations(),
      ]);

      setAllMessages(messagesData);

      const current = convs.find((c: Conversation) => c.id === conversationId);
      if (current) {
        setConversation(current);
      } else {
        const fallbackTitle = messagesData[0]?.senderName || 'WhatsApp Contact';
        setConversation({
          id:                   conversationId,
          chatTitle:            fallbackTitle,
          isGroup:              false,
          unreadCount:          0,
          lastMessageTimestamp: messagesData[messagesData.length - 1]?.timestamp || Date.now(),
          deletedCount:         messagesData.filter((m: Message) => m.isDeletedBySender).length,
        });
      }

      await markConversationAsReadNative(conversationId);
    } catch (err) {
      console.error('Error loading chat details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* Auto-scroll to bottom on first load */
  useEffect(() => {
    if (!isLoading && allMessages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLoading, allMessages.length]);

  /* Listen for new messages from background listener */
  useEffect(() => {
    function handleNewMessage(): void { loadData(); }
    window.addEventListener('noticatch:new-message', handleNewMessage);
    return () => window.removeEventListener('noticatch:new-message', handleNewMessage);
  }, [loadData]);

  /* Search filtered messages */
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return allMessages;
    const q = searchQuery.toLowerCase();
    return allMessages.filter(m =>
      (m.messageText && m.messageText.toLowerCase().includes(q)) ||
      m.senderName.toLowerCase().includes(q)
    );
  }, [allMessages, searchQuery]);

  /* Deleted filter */
  const displayedMessages = useMemo(() => {
    const base = searchQuery.trim() ? searchResults : allMessages;
    if (!showDeletedOnly) return base;
    return base.filter(m => m.isDeletedBySender);
  }, [allMessages, searchResults, searchQuery, showDeletedOnly]);

  const deletedMessages = useMemo(() =>
    allMessages.filter(m => m.isDeletedBySender),
    [allMessages]
  );

  /* Date grouping */
  const groupedByDate = useMemo((): DateGroup[] => {
    const groups: Record<string, Message[]> = {};
    for (const msg of displayedMessages) {
      const dateKey = formatDividerDate(new Date(msg.timestamp));
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(msg);
    }
    return Object.entries(groups).map(([dateLabel, messages]) => ({
      dateLabel,
      messages,
    }));
  }, [displayedMessages]);

  function handleScroll() {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 150);
  }

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  /* ============================================================
     Loading state
     ============================================================ */
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-10 flex flex-col bg-white text-[#111827]">
        <header className="fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] pt-safe">
          <div className="flex items-center px-2 h-14">
            <IconButton
              id="chat-detail-back-button"
              icon={<ArrowLeft className="w-5 h-5 text-[#111827]" />}
              label="Back to conversations"
              onClick={() => navigate('/chats')}
            />
            <span className="ml-2 text-sm font-bold text-[#111827]">Loading conversation...</span>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center pt-14">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  /* ============================================================
     Conversation not found
     ============================================================ */
  if (!conversation) {
    return (
      <div className="fixed inset-0 z-10 flex flex-col bg-white text-[#111827]">
        <header className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-[#E5E7EB] pt-safe">
          <div className="flex items-center px-2 h-14">
            <IconButton
              id="chat-detail-back-button"
              icon={<ArrowLeft className="w-5 h-5 text-[#111827]" />}
              label="Back to conversations"
              onClick={() => navigate('/chats')}
            />
            <span className="ml-2 text-sm font-bold text-[#111827]">Conversation Not Found</span>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center pt-14 px-4">
          <EmptyState
            icon={<Info className="w-8 h-8 text-[#9CA3AF]" />}
            title="Conversation Not Found"
            description="The requested chat record does not exist in local storage."
            action={
              <button
                type="button"
                onClick={() => navigate('/chats')}
                className="w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs"
                style={{ background: '#2C6BED' }}
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
     Main chat timeline view — Signal Clean White Aesthetic
     ============================================================ */
  return (
    <div className="fixed inset-0 z-10 flex flex-col bg-white text-[#111827] overflow-hidden select-none">

      {/* Clean Top Bar — Signal Chat Screen style */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] pt-safe">
        <div className="flex items-center justify-between px-2 h-14">
          <div className="flex items-center gap-2 min-w-0">
            <IconButton
              id="chat-detail-back-button"
              icon={<ArrowLeft className="w-5 h-5 text-[#111827]" />}
              label="Back to conversations"
              onClick={() => navigate('/chats')}
            />
            {/* Avatar circle */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-xs"
              style={{ background: avatarBgColor(conversation.chatTitle) }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-[#111827] truncate max-w-[160px] sm:max-w-xs leading-tight">
                {conversation.chatTitle}
              </h1>
              <p className="text-2xs text-[#6B7280] font-medium leading-tight">
                {conversation.isGroup ? 'Group Conversation' : 'Direct Message'}
              </p>
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
                    : { background: '#F3F4F6', color: '#4B5563', borderColor: '#E5E7EB' }
                }
              >
                <Trash2 className="w-3 h-3 text-[#D97706]" strokeWidth={2} />
                <span>{deletedMessages.length} Deleted</span>
              </button>
            )}
            <IconButton
              id="chat-search-toggle-button"
              icon={
                searchOpen
                  ? <X className="w-5 h-5 text-[#111827]" strokeWidth={2.2} />
                  : <Search className="w-5 h-5 text-[#111827]" strokeWidth={2.2} />
              }
              label={searchOpen ? 'Close search' : 'Search messages'}
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setSearchQuery('');
              }}
            />
            <IconButton
              id="chat-info-toggle-button"
              icon={<MoreVertical className="w-5 h-5 text-[#111827]" strokeWidth={2.2} />}
              label="Thread Options"
              onClick={() => setShowThreadInfo(!showThreadInfo)}
            />
          </div>
        </div>
      </header>

      {/* In-Thread Search Bar */}
      {searchOpen && (
        <div className="fixed top-14 left-0 right-0 z-30 border-b border-[#E5E7EB] bg-white px-4 py-2.5 shadow-xs animate-slide-down">
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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowThreadInfo(false)}
        >
          <div
            className="w-full max-w-md p-6 space-y-4 shadow-xl rounded-3xl border border-[#E5E7EB] bg-white animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-base font-bold text-[#111827]">Thread Details</h3>
              <button
                type="button"
                onClick={() => setShowThreadInfo(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-[#F3F4F6] text-[#6B7280] hover:text-[#111827] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-[#6B7280] font-medium">
              <div className="flex justify-between">
                <span>Total Captured Messages</span>
                <span className="font-bold text-[#111827]">{allMessages.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Deleted by Sender</span>
                <span className="font-bold" style={{ color: '#D97706' }}>{deletedMessages.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Storage Mode</span>
                <span className="font-bold text-[#111827]">On-Device Room SQLite WAL</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#E5E7EB]">
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
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-[#E5E7EB] bg-[#F3F4F6] text-[#111827]"
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
          className="fixed bottom-20 right-4 z-30 w-9 h-9 rounded-full flex items-center justify-center shadow-md border border-[#E5E7EB] bg-white text-[#6B7280] hover:text-[#111827]"
        >
          <ArrowDown className="w-4 h-4" strokeWidth={2.2} />
        </button>
      )}

      {/* ---- Scrollable Message Timeline ---- */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto px-4 space-y-3 ${searchOpen ? 'pt-28' : 'pt-16'} pb-24`}
        style={{ background: '#F8F9FA' }}
      >
        {/* Vault security pill */}
        <div className="flex items-center justify-center my-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#E5E7EB] bg-white shadow-xs">
            <Lock className="w-3 h-3 text-[#2C6BED]" strokeWidth={2} />
            <span className="text-2xs text-[#6B7280] font-semibold">
              100% Offline Vault · Zero Network Transfer
            </span>
          </div>
        </div>

        {groupedByDate.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<Info className="w-8 h-8 text-[#9CA3AF]" />}
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

      {/* ---- Read-Only Utility Bar (Clean action strip without redundant search input) ---- */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E5E7EB] bg-white pb-safe shadow-xs">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 max-w-lg mx-auto">
          {/* Deleted-only toggle filter */}
          <button
            type="button"
            onClick={() => setShowDeletedOnly(prev => !prev)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold border transition-all"
            style={
              showDeletedOnly
                ? { background: '#FFF4E5', color: '#92400E', borderColor: '#FED7AA' }
                : { background: '#F3F4F6', color: '#4B5563', borderColor: '#E5E7EB' }
            }
          >
            <Filter className="w-3.5 h-3.5" strokeWidth={2} />
            <span>{showDeletedOnly ? 'Showing Deleted Only' : 'Filter Deleted Messages'}</span>
          </button>

          {/* Export shortcut button */}
          <button
            type="button"
            onClick={() => setShowThreadInfo(true)}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-bold border border-[#DBEAFE] text-[#2C6BED] transition-colors"
            style={{ background: '#EEF2FF' }}
            title="Export conversation dossier"
          >
            <Share2 className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Export</span>
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
