/**
 * ChatsPage
 *
 * Lists all captured WhatsApp conversations sorted by most recent activity.
 * Powered by the Boyer-Moore-Horspool & Damerau-Levenshtein search engine.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { TopAppBar } from '@/components/navigation';
import { SearchInput, EmptyState } from '@/components/common';
import { ConversationRow } from '@/components/chat';
import { getAllConversations } from '@/services/DatabaseService';
import { searchAndRank } from '@/services/SearchEngine';

/**
 * ChatsPage
 *
 * Renders the full conversation list with an accelerated Boyer-Moore search bar.
 */
export function ChatsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const allConversations = useMemo(() => getAllConversations(), []);

  /* Apply Boyer-Moore-Horspool & Damerau-Levenshtein search ranking */
  const searchResults = useMemo(() => {
    return searchAndRank(
      allConversations,
      conversation => conversation.chatTitle,
      searchQuery,
    );
  }, [allConversations, searchQuery]);

  function handleConversationSelect(conversationId: string): void {
    navigate(`/chats/${conversationId}`);
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-800">
      <TopAppBar
        title="Chats"
        subtitle={`${allConversations.length} active conversation${allConversations.length !== 1 ? 's' : ''}`}
      />

      {/* Fixed Search Bar container below TopAppBar */}
      <div className="pt-14 z-20 bg-surface-800 border-b border-surface-700/80 px-4 py-2.5 shadow-xs">
        <SearchInput
          id="chats-search-input"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search conversations (BMH sub-linear search)..."
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
                ? `No conversations match query "${searchQuery}" under BMH search.`
                : 'WhatsApp conversations will appear here once NotiCatch captures the first notification.'
            }
          />
        )}
      </div>
    </div>
  );
}
