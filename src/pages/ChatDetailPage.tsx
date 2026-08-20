/**
 * ChatDetailPage
 *
 * Full message timeline for a single WhatsApp conversation.
 * Styled to precisely match Anthropic Claude's mobile conversation view (Screenshot 10).
 * Connects directly to NativeBridgeService to query Room SQLite DB on Android.
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
  Plus,
  Mic,
  AudioLines,
  MoreVertical,
  Shapes,
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

export function ChatDetailPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate           = useNavigate();
  const bottomRef          = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [searchOpen,       setSearchOpen]       = useState(false);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [showThreadInfo,   setShowThreadInfo]   = useState(false);
  const [isLoading,        setIsLoading]        = useState(true);
  const [conversation,     setConversation]     = useState<Conversation | null>(null);
  const [allMessages,      setAllMessages]      = useState<Message[]>([]);
  const [showDeletedOnly,  setShowDeletedOnly]  = useState(false);
  const [showScrollDown,   setShowScrollDown]   = useState(false);

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
    function handleNewMessage(): void {
      loadThreadData();
    }
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
      const msgDate = new Date(msg.timestamp);
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

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-canvas">
        <TopAppBar
          title="Conversation"
          leading={
            <IconButton
              id="chat-detail-back-button"
              icon={<ArrowLeft className="w-5 h-5 text-content-primary" />}
              label="Back"
              onClick={() => navigate('/chats')}
            />
          }
        />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col h-screen bg-canvas">
        <TopAppBar
          title="Chat Not Found"
          leading={
            <IconButton
              id="chat-detail-back-button"
              icon={<ArrowLeft className="w-5 h-5 text-content-primary" />}
              label="Back"
              onClick={() => navigate('/chats')}
            />
          }
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <EmptyState
            icon={<AlertTriangle className="w-8 h-8 text-[#9C5418]" />}
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

  return (
    <div className="flex flex-col h-full bg-[#FAF9F5] text-content-primary relative">
      {/* Top App Bar matching Screenshot 10 */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E8E4D8] pt-safe">
        <div className="flex items-center justify-between px-3 h-14">
          <div className="flex items-center gap-2">
            <IconButton
              id="chat-detail-back-button"
              icon={<ArrowLeft className="w-5 h-5 text-content-primary" />}
              label="Back to conversations"
              onClick={() => navigate('/chats')}
            />
            <h1 className="font-serif text-base font-bold text-content-primary truncate max-w-[160px] sm:max-w-xs">
              {conversation.chatTitle}
            </h1>
          </div>

          {/* Floating Artifact / Deleted Counter Pill */}
          {deletedMessages.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDeletedOnly(prev => !prev)}
              className="px-3 py-1 rounded-full bg-surface-750 border border-surface-700 text-content-primary text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Shapes className="w-3.5 h-3.5 text-accent" />
              <span>{deletedMessages.length} Artifact{deletedMessages.length > 1 ? 's' : ''}</span>
            </button>
          )}

          {/* Actions on right */}
          <div className="flex items-center gap-1">
            <IconButton
              id="chat-search-toggle-button"
              icon={
                searchOpen ? (
                  <X className="w-5 h-5 text-content-primary" strokeWidth={2.2} />
                ) : (
                  <Search className="w-5 h-5 text-content-primary" strokeWidth={2.2} />
                )
              }
              label={searchOpen ? 'Close search' : 'Search messages'}
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setSearchQuery('');
              }}
            />
            <IconButton
              id="chat-info-toggle-button"
              icon={<MoreVertical className="w-5 h-5 text-content-primary" strokeWidth={2.2} />}
              label="Thread Options"
              onClick={() => setShowThreadInfo(!showThreadInfo)}
            />
          </div>
        </div>
      </header>

      {/* Floating In-Thread Search Bar */}
      {searchOpen && (
        <div className="fixed top-14 left-0 right-0 z-30 bg-surface-900 border-b border-surface-700 px-4 py-2.5 shadow-card animate-slide-down">
          <SearchInput
            id="chat-detail-search-input"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={`Search in ${conversation.chatTitle}...`}
            matchCount={searchQuery ? searchResults.length : undefined}
          />
        </div>
      )}

      {/* Thread Info Action Sheet */}
      {showThreadInfo && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowThreadInfo(false)}
        >
          <div
            className="card max-w-md w-full p-6 space-y-4 shadow-card-lg bg-white rounded-3xl animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-surface-700">
              <h3 className="font-serif text-base font-bold text-content-primary">
                Thread Details
              </h3>
              <button
                type="button"
                onClick={() => setShowThreadInfo(false)}
                className="w-7 h-7 rounded-full bg-surface-850 flex items-center justify-center text-content-muted hover:text-content-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-content-secondary font-medium">
              <p>Total Captured: <strong>{allMessages.length}</strong></p>
              <p>Deleted Messages: <strong>{deletedMessages.length}</strong></p>
              <p>Storage Mode: <strong>On-device SQLite Room WAL</strong></p>
            </div>

            <div className="flex gap-2 pt-2 border-t border-surface-700">
              <button
                type="button"
                onClick={async () => {
                  setShowThreadInfo(false);
                  await exportChatAsPDFNative(conversation.id);
                }}
                className="btn-neu-primary flex-1 text-xs py-2.5"
              >
                Export PDF
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowThreadInfo(false);
                  await exportChatAsCSVNative(conversation.id);
                }}
                className="btn-neu-secondary flex-1 text-xs py-2.5"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Jump to Bottom Button */}
      {showScrollDown && (
        <button
          type="button"
          id="scroll-to-bottom-button"
          onClick={scrollToBottom}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 w-9 h-9 rounded-full bg-white border border-[#E8E4D8] shadow-card-lg flex items-center justify-center text-content-secondary hover:text-content-primary animate-scale-in"
        >
          <ArrowDown className="w-4 h-4" strokeWidth={2.2} />
        </button>
      )}

      {/* Scrollable Timeline */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto pb-28 px-4 space-y-4 ${searchOpen ? 'pt-28' : 'pt-16'}`}
      >
        <div className="flex items-center justify-center my-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E8E4D8] rounded-full shadow-xs">
            <Lock className="w-3 h-3 text-content-muted" strokeWidth={2} />
            <span className="text-2xs text-content-muted font-semibold text-center">
              100% Offline Vault · Zero Network Transfer
            </span>
          </div>
        </div>

        {groupedByDate.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<Info className="w-8 h-8 text-content-muted" />}
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

      {/* Floating Bottom Input Bar matching Screenshot 10 */}
      <div className="fixed bottom-3 left-4 right-4 z-30 max-w-lg mx-auto">
        <div className="bg-white rounded-3xl p-3 shadow-card-lg border border-[#E8E4D8] flex flex-col gap-2">
          <input
            type="text"
            placeholder="Reply to Claude..."
            readOnly
            className="w-full bg-transparent text-sm text-content-primary placeholder:text-content-muted px-2 py-1 focus:outline-none cursor-default font-medium"
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-surface-850 flex items-center justify-center text-content-secondary hover:text-content-primary transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={2.2} />
              </button>

              <div className="px-3 py-1 rounded-full bg-surface-850 text-content-primary text-xs font-semibold">
                Sonnet 4.6 Medium
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="w-8 h-8 rounded-full flex items-center justify-center text-content-secondary hover:text-content-primary transition-colors"
              >
                <Mic className="w-4 h-4" strokeWidth={2} />
              </button>

              <button
                type="button"
                className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shadow-xs"
              >
                <AudioLines className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </div>
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
