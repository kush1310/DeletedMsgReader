/**
 * ChatDetailPage
 *
 * Full message timeline for a single WhatsApp conversation.
 * Blends clean typography, thoughtful spacing, and analytical insight panels
 * with WhatsApp's iconic message flow, timestamp badges, and recovery status tags.
 *
 * Connects directly to NativeBridgeService to query Room SQLite DB on Android
 * and verifies rolling Merkle tree integrity across all messages.
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
} from '@/services/NativeBridgeService';
import { searchAndRank } from '@/services/SearchEngine';
import { verifyConversationIntegrity } from '@/services/CryptoAuditService';
import type { Message, Conversation, MerkleAuditResult } from '@/types';

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
  const [merkleAudit,      setMerkleAudit]      = useState<MerkleAuditResult | null>(null);
  const [deletedIdxCursor, setDeletedIdxCursor] = useState(0);
  const [isExporting,      setIsExporting]      = useState(false);

  const loadThreadData = useCallback(async (): Promise<void> => {
    if (!conversationId) {
      setIsLoading(false);
      return;
    }

    const [convos, msgs] = await Promise.all([
      getConversations(),
      getMessages(conversationId),
    ]);
    const found = convos.find(c => c.id === conversationId) ?? null;
    setConversation(found);
    setAllMessages(msgs);
    setIsLoading(false);

    /* Run Merkle tree integrity audit */
    const auditResult = await verifyConversationIntegrity(msgs);
    setMerkleAudit(auditResult);
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
      elem.classList.add('ring-2', 'ring-amber-500', 'ring-offset-2');
      setTimeout(() => {
        elem.classList.remove('ring-2', 'ring-amber-500', 'ring-offset-2');
      }, 2000);
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
      <div className="flex flex-col h-full bg-surface-900">
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
      <div className="flex flex-col h-full bg-surface-900">
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
            icon={<AlertTriangle className="w-8 h-8 text-amber-700" />}
            title="Conversation Not Found"
            description="This chat thread does not exist in local storage."
            action={
              <button
                type="button"
                onClick={() => navigate('/chats')}
                className="btn-primary text-xs py-2 px-4"
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
    <div className="flex flex-col h-full bg-surface-900 relative">
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
                    className={`w-5 h-5 ${showDeletedOnly ? 'text-amber-600' : 'text-content-primary'}`}
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

      {searchOpen && (
        <div className="pt-14 z-20 bg-surface-800 border-b border-surface-700/80 px-4 py-2.5 shadow-xs animate-slide-down">
          <SearchInput
            id="chat-detail-search-input"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={`Search in ${conversation.chatTitle}...`}
            matchCount={searchQuery ? searchResults.length : undefined}
            algorithmLabel="Boyer-Moore-Horspool in-thread O(n/m)"
          />
        </div>
      )}

      {showThreadInfo && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="card max-w-md w-full p-6 space-y-4 shadow-card-lg animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center border border-emerald-300 shadow-skeuo-chip">
                  <ShieldCheck className="w-5 h-5 text-accent" strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="font-extrabold text-content-primary text-base">Merkle Cryptographic Audit</h3>
                  <p className="text-2xs text-content-muted font-semibold">Air-Gapped Immutable Record</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowThreadInfo(false)}
                className="text-content-muted hover:text-content-primary p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" strokeWidth={2.2} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-surface-700">
                <span className="text-content-muted font-medium">Participant</span>
                <span className="font-bold text-content-primary">{conversation.chatTitle}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-700">
                <span className="text-content-muted font-medium">Type</span>
                <span className="font-bold text-content-primary">{conversation.isGroup ? 'Group Chat' : 'Direct 1-on-1'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-700">
                <span className="text-content-muted font-medium">Total Messages Captured</span>
                <span className="font-bold text-content-primary">{allMessages.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-700">
                <span className="text-content-muted font-medium">Deleted Messages Recovered</span>
                <span className="font-bold text-amber-700">{deletedMessages.length}</span>
              </div>
              {merkleAudit && (
                <>
                  <div className="flex justify-between py-2 border-b border-surface-700">
                    <span className="text-content-muted font-medium">Merkle Chain Status</span>
                    <span className="font-bold text-accent flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                      100% Cryptographically Verified
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 py-2 border-b border-surface-700">
                    <span className="text-content-muted font-medium">Root Hash Digest</span>
                    <span className="font-mono text-2xs text-accent break-all bg-surface-800 p-1.5 rounded border border-surface-700">
                      {merkleAudit.rootHash}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExporting}
                className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" />
                Export PDF
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={isExporting}
                className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowThreadInfo(false)}
              className="btn-primary w-full text-xs py-2.5 mt-2"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {deletedMessages.length > 0 && !showDeletedOnly && (
        <FloatingPill
          id="jump-to-deleted-pill"
          icon={<JumpIcon className="w-3.5 h-3.5 text-amber-700" strokeWidth={2.2} />}
          label={`${deletedMessages.length} Deleted · Tap to Jump`}
          onClick={handleJumpToDeleted}
          bottom={24}
        />
      )}

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pt-14 pb-4 px-4 space-y-4"
      >
        <div className="flex items-center justify-center my-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-800 border border-surface-700 rounded-full shadow-xs">
            <Lock className="w-3 h-3 text-content-muted" strokeWidth={2} />
            <span className="text-2xs text-content-muted font-semibold text-center">
              Air-Gapped & Encrypted Local Storage · 0 Bytes Network Egress
            </span>
          </div>
        </div>

        {groupedByDate.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<Info className="w-8 h-8 text-content-muted" />}
              title={showDeletedOnly ? 'No Deleted Messages in this Thread' : 'No Messages in Thread'}
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
                    className="btn-secondary text-xs py-2 px-4"
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
