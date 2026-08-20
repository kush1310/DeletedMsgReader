/**
 * ChatDetailPage
 *
 * Full message timeline for a single WhatsApp conversation.
 * Styled in Anthropic Claude warm editorial aesthetic.
 * Connects directly to NativeBridgeService to query Room SQLite DB on Android.
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  X,
  AlertTriangle,
  ShieldCheck,
  Info,
  Lock,
  Trash2 as JumpIcon,
  Filter,
  FileDown,
  CheckCircle2,
} from 'lucide-react';
import { TopAppBar, IconButton } from '@/components/navigation';
import { Avatar, EmptyState, SectionDivider, SearchInput, LoadingSpinner, FloatingPill } from '@/components/common';
import { MessageBubble } from '@/components/chat';
import {
  getMessages,
  getConversations,
  exportChatAsPDF,
  exportChatAsCSV,
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
  const [deletedIdxCursor, setDeletedIdxCursor] = useState(0);
  const [isExporting,      setIsExporting]      = useState(false);

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

  function handleJumpToDeleted(): void {
    if (deletedMessages.length === 0) return;
    const target = deletedMessages[deletedIdxCursor % deletedMessages.length];
    const elem = document.getElementById(`msg-deleted-${target.id}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      elem.classList.add('ring-2', 'ring-accent');
      setTimeout(() => elem.classList.remove('ring-2', 'ring-accent'), 2000);
    }
    setDeletedIdxCursor(prev => prev + 1);
  }

  async function handleExportPDF() {
    if (!conversationId || !conversation) return;
    setIsExporting(true);
    try {
      await exportChatAsPDF(conversationId, conversation.chatTitle);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportCSV() {
    if (!conversationId || !conversation) return;
    setIsExporting(true);
    try {
      await exportChatAsCSV(conversationId, conversation.chatTitle);
    } finally {
      setIsExporting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-canvas">
        <TopAppBar
          title="Loading..."
          leading={
            <IconButton
              id="back-button-loading"
              icon={<ArrowLeft className="w-5 h-5 text-content-primary" />}
              label="Back to conversations"
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
      <div className="flex flex-col h-full bg-canvas">
        <TopAppBar
          title="Conversation Not Found"
          leading={
            <IconButton
              id="back-button-not-found"
              icon={<ArrowLeft className="w-5 h-5 text-content-primary" />}
              label="Back to conversations"
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
    <div className="flex flex-col h-full bg-canvas relative">
      <TopAppBar
        title={conversation.chatTitle}
        subtitle={
          showDeletedOnly
            ? `Showing ${deletedMessages.length} deleted only`
            : `${allMessages.length} messages${deletedMessages.length > 0 ? ` · ${deletedMessages.length} deleted` : ''}`
        }
        leading={
          <IconButton
            id="chat-detail-back-button"
            icon={<ArrowLeft className="w-5 h-5 text-content-primary" />}
            label="Back to conversations"
            onClick={() => navigate('/chats')}
          />
        }
        trailing={
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
            {deletedMessages.length > 0 && (
              <IconButton
                id="chat-deleted-filter-button"
                icon={
                  <Filter
                    className={`w-5 h-5 ${showDeletedOnly ? 'text-accent' : 'text-content-primary'}`}
                    strokeWidth={2.2}
                  />
                }
                label={showDeletedOnly ? 'Show all messages' : 'Show deleted messages only'}
                onClick={() => setShowDeletedOnly(prev => !prev)}
              />
            )}
            <IconButton
              id="chat-info-toggle-button"
              icon={<Info className="w-5 h-5 text-accent" strokeWidth={2.2} />}
              label="Thread Info"
              onClick={() => setShowThreadInfo(!showThreadInfo)}
            />
            <Avatar name={conversation.chatTitle} size="sm" isGroup={conversation.isGroup} />
          </div>
        }
      />

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

      {/* User-Friendly Thread Security & Info Modal */}
      {showThreadInfo && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowThreadInfo(false)}
        >
          <div
            className="card max-w-md w-full p-6 space-y-4 shadow-card-lg animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-surface-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-accent-muted flex items-center justify-center text-accent">
                  <ShieldCheck className="w-5 h-5" strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-content-primary">Chat Details</h3>
                  <p className="text-2xs text-accent font-semibold">Private On-Device Vault</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowThreadInfo(false)}
                className="w-7 h-7 rounded-full bg-surface-850 flex items-center justify-center text-content-muted hover:text-content-primary"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-surface-700">
                <span className="text-content-muted font-medium">Participant</span>
                <span className="font-bold text-content-primary">{conversation.chatTitle}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-700">
                <span className="text-content-muted font-medium">Chat Type</span>
                <span className="font-bold text-content-primary">{conversation.isGroup ? 'Group Chat' : 'Direct Contact'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-700">
                <span className="text-content-muted font-medium">Messages Captured</span>
                <span className="font-bold text-content-primary">{allMessages.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-700">
                <span className="text-content-muted font-medium">Deleted Messages Recovered</span>
                <span className="font-bold text-accent">{deletedMessages.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-700">
                <span className="text-content-muted font-medium">Storage Status</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Stored Locally on Device
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExporting}
                className="btn-neu-secondary text-xs py-2.5 flex items-center justify-center gap-1.5 font-bold"
              >
                <FileDown className="w-3.5 h-3.5 text-accent" />
                <span>Export PDF</span>
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={isExporting}
                className="btn-neu-secondary text-xs py-2.5 flex items-center justify-center gap-1.5 font-bold"
              >
                <FileDown className="w-3.5 h-3.5 text-accent" />
                <span>Export CSV</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowThreadInfo(false)}
              className="btn-neu-primary w-full text-xs py-2.5 mt-2 font-bold"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {deletedMessages.length > 0 && !showDeletedOnly && (
        <FloatingPill
          id="jump-to-deleted-pill"
          icon={<JumpIcon className="w-3.5 h-3.5 text-white" strokeWidth={2.2} />}
          label={`${deletedMessages.length} Deleted · Jump`}
          onClick={handleJumpToDeleted}
          bottom={24}
        />
      )}

      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto pb-4 px-4 space-y-4 ${searchOpen ? 'pt-28' : 'pt-16'}`}
      >
        <div className="flex items-center justify-center my-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-850 border border-surface-700 rounded-full shadow-xs">
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
              action={
                showDeletedOnly ? (
                  <button
                    type="button"
                    onClick={() => setShowDeletedOnly(false)}
                    className="btn-neu-secondary text-xs py-2 px-4"
                  >
                    Show All Messages
                  </button>
                ) : undefined
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
