/**
 * DeletedOnlyPage
 *
 * Filtered view displaying exclusively messages that were deleted by
 * the sender and successfully recovered by NotiCatch.
 * Accelerated by Boyer-Moore-Horspool and Damerau-Levenshtein search algorithms.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { TopAppBar } from '@/components/navigation';
import { SearchInput, EmptyState } from '@/components/common';
import { DeletedMessageCard } from '@/components/chat';
import { getDeletedMessages, getAllConversations } from '@/services/DatabaseService';
import { searchAndRank } from '@/services/SearchEngine';
import type { Conversation } from '@/types';

/**
 * DeletedOnlyPage
 *
 * Renders only the messages flagged as `isDeletedBySender = true` with BMH search.
 */
export function DeletedOnlyPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const allDeletedMessages = useMemo(() => getDeletedMessages(), []);
  const allConversations   = useMemo(() => getAllConversations(), []);

  const conversationMap = useMemo(() => {
    const map = new Map<string, Conversation>();
    for (const conv of allConversations) {
      map.set(conv.id, conv);
    }
    return map;
  }, [allConversations]);

  /* Apply Boyer-Moore-Horspool search across deleted messages */
  const searchResults = useMemo(() => {
    return searchAndRank(
      allDeletedMessages,
      message => `${message.senderName} ${message.messageText ?? ''}`,
      searchQuery,
    );
  }, [allDeletedMessages, searchQuery]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-800">
      <TopAppBar
        title="Deleted Messages"
        subtitle={`${allDeletedMessages.length} message${allDeletedMessages.length !== 1 ? 's' : ''} recovered`}
      />

      {/* Fixed Search Bar container below TopAppBar */}
      <div className="pt-14 z-20 bg-surface-800 border-b border-surface-700/80 px-4 py-2.5 shadow-xs">
        <SearchInput
          id="deleted-search-input"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search deleted messages (BMH indexed)..."
          matchCount={searchQuery ? searchResults.length : undefined}
          algorithmLabel="Boyer-Moore-Horspool O(n/m)"
        />
      </div>

      {/* Scrollable Deleted Message cards */}
      <div className="flex-1 overflow-y-auto pb-20">
        {searchResults.length > 0 ? (
          <div className="px-4 py-3 space-y-3">
            {searchResults.map((result, index) => {
              const message = result.item;
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
            title={searchQuery ? 'No results found' : 'No deleted messages yet'}
            description={
              searchQuery
                ? `No deleted messages match query "${searchQuery}" under BMH search.`
                : 'Deleted WhatsApp messages will appear here as they are recovered in real-time.'
            }
          />
        )}
      </div>
    </div>
  );
}
