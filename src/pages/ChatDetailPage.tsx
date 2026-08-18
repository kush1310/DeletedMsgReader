/**
 * ChatDetailPage
 *
 * Full message timeline for a single WhatsApp conversation.
 * Blends Claude's clean typography, thoughtful spacing, and analytical insight panels
 * with WhatsApp's iconic message flow, timestamp badges, and recovery status tags.
 *
 * Includes:
 *   1. Boyer-Moore-Horspool search acceleration within conversation
 *   2. Thread Security & Integrity metadata panel (Claude style)
 *   3. Interactive Notification Simulator to test real-time capture and recovery
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  X,
  AlertTriangle,
  ShieldCheck,
  Info,
  Send,
  Trash2,
  Lock,
} from 'lucide-react';
import { TopAppBar, IconButton } from '@/components/navigation';
import { Avatar, EmptyState, SectionDivider, SearchInput } from '@/components/common';
import { MessageBubble } from '@/components/chat';
import {
  getConversationById,
  getMessagesByConversation,
  insertMessage,
  markMessageAsDeleted,
} from '@/services/DatabaseService';
import { generateUUID } from '@/services/SecurityService';
import { searchAndRank } from '@/services/SearchEngine';
import type { Message } from '@/types';

/**
 * ChatDetailPage
 *
 * Displays the captured message timeline in Claude + WhatsApp hybrid aesthetic.
 */
export function ChatDetailPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate           = useNavigate();
  const bottomRef          = useRef<HTMLDivElement>(null);

  const [searchOpen,       setSearchOpen]       = useState(false);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [showThreadInfo,   setShowThreadInfo]   = useState(false);
  const [simulatedText,    setSimulatedText]    = useState('');
  const [versionKey,       setVersionKey]       = useState(0);

  const conversation = useMemo(
    () => (conversationId ? getConversationById(conversationId) : undefined),
    [conversationId, versionKey],
  );

  const allMessages: Message[] = useMemo(
    () => (conversationId ? getMessagesByConversation(conversationId) : []),
    [conversationId, versionKey],
  );

  /* Scroll to the bottom of the message list on load or new message */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length]);

  /* Apply Boyer-Moore-Horspool search ranking */
  const searchResults = useMemo(() => {
    if (!searchOpen || !searchQuery.trim()) {
      return allMessages.map(m => ({ item: m, score: 100, highlights: [] }));
    }
    return searchAndRank(
      allMessages,
      m => `${m.senderName} ${m.messageText ?? ''}`,
      searchQuery,
    );
  }, [allMessages, searchQuery, searchOpen]);

  const displayedMessages = useMemo(() => {
    return searchResults.map(res => res.item);
  }, [searchResults]);

  /* Group messages by date for section dividers */
  const groupedMessages = useMemo(() => {
    const groups: Array<{ dateLabel: string; messages: Message[] }> = [];
    let currentLabel = '';

    for (const message of displayedMessages) {
      const label = new Date(message.timestamp).toLocaleDateString([], {
        weekday: 'long',
        month:   'long',
        day:     'numeric',
      });
      if (label !== currentLabel) {
        groups.push({ dateLabel: label, messages: [] });
        currentLabel = label;
      }
      groups[groups.length - 1].messages.push(message);
    }

    return groups;
  }, [displayedMessages]);

  const deletedCount = allMessages.filter(m => m.isDeletedBySender).length;

  /* Notification Simulator Handlers */
  function handleSimulateIncoming(): void {
    if (!conversationId || !conversation || !simulatedText.trim()) return;

    insertMessage({
      id: generateUUID(),
      conversationId,
      senderName: conversation.chatTitle,
      messageText: simulatedText.trim(),
      notificationId: Math.floor(Math.random() * 999_999),
      timestamp: Date.now(),
      isDeletedBySender: false,
      isEdited: false,
      mediaType: null,
      mediaPath: null,
      hashSignature: 'sim-hash-' + generateUUID(),
    });

    setSimulatedText('');
    setVersionKey(prev => prev + 1);
  }

  function handleSimulateDeleteLast(): void {
    if (!conversationId || allMessages.length === 0) return;
    const lastActive = [...allMessages].reverse().find(m => !m.isDeletedBySender);
    if (!lastActive) return;

    markMessageAsDeleted(lastActive.id);
    setVersionKey(prev => prev + 1);
  }

  if (!conversation) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 bg-surface-800">
        <p className="text-content-muted text-sm font-bold">Conversation not found.</p>
        <button id="back-to-chats-button" type="button" onClick={() => navigate('/chats')} className="btn-primary">
          Back to Chats
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-800">
      {/* Top AppBar with Claude-inspired typography and WhatsApp icons */}
      <TopAppBar
        title={conversation.chatTitle}
        subtitle={
          deletedCount > 0
            ? `${deletedCount} deleted message${deletedCount > 1 ? 's' : ''} recovered`
            : `${allMessages.length} message${allMessages.length !== 1 ? 's' : ''} captured`
        }
        leading={
          <IconButton
            id="chat-back-button"
            icon={<ArrowLeft className="w-5 h-5 text-content-primary" strokeWidth={2.2} />}
            label="Back to chats"
            onClick={() => navigate('/chats')}
          />
        }
        trailing={
          <div className="flex items-center gap-1">
            <IconButton
              id="chat-search-toggle-button"
              icon={
                searchOpen
                  ? <X      className="w-5 h-5 text-content-primary" strokeWidth={2.2} />
                  : <Search className="w-5 h-5 text-content-primary" strokeWidth={2.2} />
              }
              label={searchOpen ? 'Close search' : 'Search messages'}
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setSearchQuery('');
              }}
            />
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

      {/* In-Thread Boyer-Moore Search Bar */}
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

      {/* Claude-style Security & Integrity Drawer Modal */}
      {showThreadInfo && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="card max-w-md w-full p-6 space-y-4 shadow-card-lg animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center border border-emerald-300 shadow-skeuo-chip">
                  <ShieldCheck className="w-5 h-5 text-accent" strokeWidth={2.2} />
                </div>
                <div>
                  <h3 className="font-extrabold text-content-primary text-base">Thread Security Audit</h3>
                  <p className="text-2xs text-content-muted font-semibold">Air-Gapped Cryptographic Record</p>
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
                <span className="font-bold text-content-primary">{conversation.isGroup ? 'Group Chat' : 'Direct Conversation'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-700">
                <span className="text-content-muted font-medium">Total Messages Captured</span>
                <span className="font-bold text-content-primary">{allMessages.length}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-surface-700">
                <span className="text-content-muted font-medium">Deleted Messages Recovered</span>
                <span className="font-bold text-amber-700">{deletedCount}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-content-muted font-medium">Encryption Standard</span>
                <span className="font-bold text-accent">AES-256-GCM / SQLCipher</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowThreadInfo(false)}
              className="btn-primary w-full text-xs py-2.5"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Deleted message recovery alert banner */}
      <div className={`${searchOpen ? '' : 'pt-14'} z-10 px-4 py-2 bg-surface-800`}>
        {deletedCount > 0 && (
          <div className="card-neu flex items-center gap-2.5 px-3.5 py-2 border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/50 text-amber-950 text-xs shadow-skeuo-chip">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" strokeWidth={2.2} />
            <p className="leading-tight font-bold">
              {deletedCount} deleted message{deletedCount > 1 ? 's' : ''} recovered — highlighted with amber tags
            </p>
          </div>
        )}
      </div>

      {/* Message Timeline */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {groupedMessages.length > 0 ? (
          groupedMessages.map(group => (
            <div key={group.dateLabel} className="space-y-3">
              <SectionDivider label={group.dateLabel} />
              {group.messages.map(message => (
                <MessageBubble
                  key={message.id}
                  message={message}
                />
              ))}
            </div>
          ))
        ) : (
          <EmptyState
            icon={<Search className="w-8 h-8" strokeWidth={1.8} />}
            title="No matching messages"
            description={`No messages matching "${searchQuery}" found in this thread.`}
          />
        )}
        <div ref={bottomRef} />
      </div>

      {/* Claude + WhatsApp Interactive Simulation Bar */}
      <div className="p-3 bg-surface-900/95 backdrop-blur-md border-t border-surface-700/80 shadow-lg">
        <div className="flex items-center gap-2">
          <input
            id="simulation-message-input"
            type="text"
            value={simulatedText}
            onChange={e => setSimulatedText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSimulateIncoming()}
            placeholder={`Simulate incoming WhatsApp alert from ${conversation.chatTitle}...`}
            className="input-field py-2 text-xs flex-1 shadow-neu-inset"
          />
          <button
            id="simulate-send-btn"
            type="button"
            onClick={handleSimulateIncoming}
            disabled={!simulatedText.trim()}
            className="btn-primary py-2 px-3 text-xs disabled:opacity-40"
            title="Simulate incoming WhatsApp notification"
          >
            <Send className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
          <button
            id="simulate-delete-btn"
            type="button"
            onClick={handleSimulateDeleteLast}
            className="btn-danger py-2 px-3 text-xs"
            title="Simulate sender clicking 'Delete for Everyone'"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1 text-2xs text-content-muted font-medium">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-accent" strokeWidth={2.2} />
            Air-Gapped AES-256 local archive
          </span>
          <span>Tap trash icon to simulate sender deleting last message</span>
        </div>
      </div>
    </div>
  );
}
