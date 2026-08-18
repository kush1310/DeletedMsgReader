/**
 * ChatDetailPage
 *
 * Full message timeline for a single WhatsApp conversation.
 * Renders all captured messages in chronological order, clearly
 * distinguishing deleted messages (recovered) from standard ones.
 * Supports message search within the thread.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, AlertTriangle } from 'lucide-react';
import { TopAppBar, IconButton } from '@/components/navigation';
import { Avatar, EmptyState, SectionDivider, SearchInput } from '@/components/common';
import { MessageBubble } from '@/components/chat';
import { getConversationById, getMessagesByConversation } from '@/services/DatabaseService';
import { validateSearchQuery, sanitizeTextInput } from '@/services/SecurityService';
import type { Message } from '@/types';

/**
 * ChatDetailPage
 *
 * Displays the captured message timeline in Material Design 3 Light Mode.
 */
export function ChatDetailPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate           = useNavigate();
  const bottomRef          = useRef<HTMLDivElement>(null);

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const conversation = useMemo(
    () => (conversationId ? getConversationById(conversationId) : undefined),
    [conversationId],
  );

  const allMessages: Message[] = useMemo(
    () => (conversationId ? getMessagesByConversation(conversationId) : []),
    [conversationId],
  );

  /* Scroll to the bottom of the message list on mount */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, []);

  /* Apply search filter */
  const displayedMessages = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!searchOpen || !validateSearchQuery(trimmed)) return allMessages;
    const sanitized = sanitizeTextInput(trimmed).toLowerCase();
    return allMessages.filter(message =>
      message.messageText?.toLowerCase().includes(sanitized) ||
      message.senderName.toLowerCase().includes(sanitized)
    );
  }, [allMessages, searchQuery, searchOpen]);

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

  if (!conversation) {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-4 bg-surface-800">
        <p className="text-content-muted text-sm font-medium">Conversation not found.</p>
        <button id="back-to-chats-button" type="button" onClick={() => navigate('/chats')} className="btn-primary">
          Back to Chats
        </button>
      </div>
    );
  }

  function handleToggleSearch(): void {
    setSearchOpen(!searchOpen);
    if (searchOpen) setSearchQuery('');
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-800">
      {/* Top bar with back button and conversation info */}
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
          <div className="flex items-center gap-1.5">
            <Avatar name={conversation.chatTitle} size="sm" isGroup={conversation.isGroup} />
            <IconButton
              id="chat-search-toggle-button"
              icon={searchOpen ? <X className="w-5 h-5" strokeWidth={2.2} /> : <Search className="w-5 h-5" strokeWidth={2} />}
              label={searchOpen ? 'Close search' : 'Search messages'}
              onClick={handleToggleSearch}
            />
          </div>
        }
      />

      {/* Inline search bar */}
      {searchOpen && (
        <div className="fixed top-14 left-0 right-0 z-20 px-4 py-2.5 bg-surface-900/95 backdrop-blur-md border-b border-surface-700 shadow-xs animate-slide-up">
          <SearchInput
            id="chat-search-input"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search in this conversation..."
          />
        </div>
      )}

      {/* Deleted messages alert banner */}
      {deletedCount > 0 && !searchOpen && (
        <div className="fixed top-14 left-0 right-0 z-10 px-4 pt-2.5 pointer-events-none">
          <div className="flex items-center gap-2 bg-amber-50/95 border border-amber-300 shadow-xs backdrop-blur-xs rounded-xl px-3.5 py-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" strokeWidth={2.2} />
            <p className="text-2xs text-amber-950 font-bold">
              {deletedCount} deleted message{deletedCount > 1 ? 's' : ''} recovered — highlighted with amber tags
            </p>
          </div>
        </div>
      )}

      {/* Message timeline */}
      <div className={`flex-1 overflow-y-auto px-4 pb-20 space-y-1 ${searchOpen ? 'pt-28' : deletedCount > 0 ? 'pt-28' : 'pt-16'}`}>
        {groupedMessages.length > 0 ? (
          groupedMessages.map(group => (
            <div key={group.dateLabel}>
              <SectionDivider label={group.dateLabel} />
              <div className="space-y-3 py-1">
                {group.messages.map(message => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={<Search className="w-8 h-8" strokeWidth={2} />}
            title="No messages found"
            description={`No messages match "${searchQuery}" in this conversation.`}
          />
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
