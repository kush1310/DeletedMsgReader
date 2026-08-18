/**
 * ChatsPage
 *
 * Lists all captured WhatsApp conversations sorted by most recent activity.
 * Data is loaded from the native Room DB via NativeBridgeService on Android,
 * or from the empty in-memory store on web (no dummy data).
 *
 * Real-time refresh: listens for the 'noticatch:new-message' CustomEvent
 * dispatched by the Capacitor bridge when a new notification is captured.
 *
 * Search: Boyer-Moore-Horspool & Damerau-Levenshtein via SearchEngine.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { TopAppBar } from '@/components/navigation';
import { SearchInput, EmptyState, LoadingSpinner } from '@/components/common';
import { ConversationRow } from '@/components/chat';
import { getConversations } from '@/services/NativeBridgeService';
import { searchAndRank } from '@/services/SearchEngine';
import type { Conversation } from '@/types';

/**
 * ChatsPage
 *
 * Renders the full conversation list with real captured data and live updates.
 */
export function ChatsPage() {
  const navigate = useNavigate();

  const [searchQuery,    setSearchQuery]    = useState('');
  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [isLoading,      setIsLoading]      = useState(true);

  /**
   * loadData
   *
   * Fetches all conversations directly from the native Room SQLite database.
   */
  const loadData = useCallback(async (): Promise<void> => {
    const data = await getConversations();
    setConversations(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* Real-time refresh when Capacitor broadcasts a new WhatsApp message */
  useEffect(() => {
    function handleNewMessage(): void {
      loadData();
    }
    window.addEventListener('noticatch:new-message', handleNewMessage);
    return () => window.removeEventListener('noticatch:new-message', handleNewMessage);
  }, [loadData]);

  /* Apply Boyer-Moore-Horspool & Damerau-Levenshtein search ranking */
  const searchResults = useMemo(() => {
    return searchAndRank(
      conversations,
      conversation => conversation.chatTitle,
      searchQuery,
    );
  }, [conversations, searchQuery]);

  function handleConversationSelect(conversationId: string): void {
    navigate(`/chats/${conversationId}`);
  }

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
        subtitle={
          conversations.length > 0
            ? `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''} captured`
            : 'Waiting for WhatsApp notifications...'
        }
      />

      {/* Fixed Search Bar */}
      <div className="pt-14 z-20 bg-surface-800 border-b border-surface-700/80 px-4 py-2.5 shadow-xs">
        <SearchInput
          id="chats-search-input"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search conversations..."
          matchCount={searchQuery ? searchResults.length : undefined}
          algorithmLabel="Boyer-Moore-Horspool O(n/m)"
        />
      </div>

      {/* Scrollable Conversation List */}
      <div className="flex-1 overflow-y-auto pb-20">
        {searchResults.length > 0 ? (
          <ul role="list" className="bg-surface-900 shadow-skeuo-card divide-y divide-surface-700/60">
            {searchResults.map((result, index) => (
              <li
                key={result.item.id}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(index * 30, 250)}ms` }}
              >
                <ConversationRow
                  conversation={result.item}
                  onClick={handleConversationSelect}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<MessageCircle className="w-8 h-8" strokeWidth={1.8} />}
            title={searchQuery ? 'No conversations found' : 'No conversations captured yet'}
            description={
              searchQuery
                ? `No conversations match "${searchQuery}".`
                : 'Send or receive a WhatsApp message — it will appear here automatically.'
            }
          />
        )}
      </div>
    </div>
  );
}
