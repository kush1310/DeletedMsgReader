/**
 * DeletedOnlyPage
 *
 * Shows ALL messages flagged as deleted by sender across ALL conversations.
 * Data is loaded from Room DB via NativeBridgeService on Android.
 * No filtering is applied beyond the isDeletedBySender flag — OTP/spam
 * was already excluded at ingestion time by the spam filter gate.
 *
 * Real-time refresh via 'noticatch:new-message' CustomEvent.
 * Search: Boyer-Moore-Horspool & Damerau-Levenshtein.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { TopAppBar } from '@/components/navigation';
import { SearchInput, EmptyState, LoadingSpinner } from '@/components/common';
import { DeletedMessageCard } from '@/components/chat';
import {
  getDeletedMessages,
  getConversations,
} from '@/services/NativeBridgeService';
import { searchAndRank } from '@/services/SearchEngine';
import type { Conversation, Message } from '@/types';

/**
 * DeletedOnlyPage
 *
 * Renders all recovered deleted messages across all captured conversations.
 * Shows conversation title alongside each deleted message row for context.
 */
export function DeletedOnlyPage() {
  const navigate = useNavigate();

  const [searchQuery,       setSearchQuery]       = useState('');
  const [deletedMessages,   setDeletedMessages]   = useState<Message[]>([]);
  const [conversations,     setConversations]     = useState<Conversation[]>([]);
  const [isLoading,         setIsLoading]         = useState(true);

  /**
   * loadData
   *
   * Fetches all deleted messages and conversations directly from Room SQLite database.
   */
  const loadData = useCallback(async (): Promise<void> => {
    const [deleted, convos] = await Promise.all([
      getDeletedMessages(),
      getConversations(),
    ]);
    setDeletedMessages(deleted);
    setConversations(convos);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* Real-time refresh */
  useEffect(() => {
    function handleNewMessage(): void {
      loadData();
    }
    window.addEventListener('noticatch:new-message', handleNewMessage);
    return () => window.removeEventListener('noticatch:new-message', handleNewMessage);
  }, [loadData]);

  /* Build conversation lookup map */
  const conversationMap = useMemo(() => {
    const map = new Map<string, Conversation>();
    for (const conv of conversations) {
      map.set(conv.id, conv);
    }
    return map;
  }, [conversations]);

  /* Apply Boyer-Moore-Horspool search across deleted messages */
  const searchResults = useMemo(() => {
    return searchAndRank(
      deletedMessages,
      message => `${message.senderName} ${message.messageText ?? ''}`,
      searchQuery,
    );
  }, [deletedMessages, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-surface-800">
        <TopAppBar title="Deleted Messages" />
        <div className="pt-14 flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-800">
      <TopAppBar
        title="Deleted Messages"
        subtitle={
          deletedMessages.length > 0
            ? `${deletedMessages.length} message${deletedMessages.length !== 1 ? 's' : ''} recovered`
            : 'None recovered yet'
        }
      />

      {/* Fixed Search Bar */}
      <div className="pt-14 z-20 bg-surface-800 border-b border-surface-700/80 px-4 py-2.5 shadow-xs">
        <SearchInput
          id="deleted-search-input"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search deleted messages..."
          matchCount={searchQuery ? searchResults.length : undefined}
          algorithmLabel="Boyer-Moore-Horspool O(n/m)"
        />
      </div>

      {/* Scrollable Deleted Message Cards */}
      <div className="flex-1 overflow-y-auto pb-20">
        {searchResults.length > 0 ? (
          <div className="px-4 py-3 space-y-3">
            {searchResults.map((result, index) => {
              const message      = result.item;
              const conversation = conversationMap.get(message.conversationId);
              return (
                <div
                  key={message.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${Math.min(index * 30, 250)}ms` }}
                >
                  <DeletedMessageCard
                    message={message}
                    chatTitle={conversation?.chatTitle ?? 'Unknown conversation'}
                    onClick={conversation ? () => navigate(`/chats/${conversation.id}`) : undefined}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Trash2 className="w-8 h-8 text-amber-600" strokeWidth={2} />}
            title={searchQuery ? 'No results found' : 'No deleted messages recovered yet'}
            description={
              searchQuery
                ? `No deleted messages match "${searchQuery}".`
                : 'When someone deletes a WhatsApp message, the original text will appear here automatically.'
            }
          />
        )}
      </div>
    </div>
  );
}
