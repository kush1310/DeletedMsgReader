/**
 * DeletedOnlyPage
 *
 * Shows ALL messages flagged as deleted by sender across ALL conversations.
 *
 * Visual system: NotiCatch Material 3 Expressive
 * - Pure tonal canvas with zero token collision between light/dark themes.
 * - Amber deleted message cards, primary active filter pills, and haptic feedback.
 * - Covers every conversation across the entire on-device vault.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ArrowUpDown } from 'lucide-react';
import { TopAppBar } from '@/components/navigation';
import { SearchInput, EmptyState, LoadingSpinner } from '@/components/common';
import { DeletedMessageCard } from '@/components/chat';
import { getDeletedMessages, getConversations } from '@/services/NativeBridgeService';
import { searchAndRank } from '@/services/SearchEngine';
import { extractEntities } from '@/services/EntityExtractor';
import { HapticService } from '@/services/HapticService';
import type { Conversation, Message } from '@/types';

type DeletedFilter = 'all' | 'groups' | 'direct' | 'phones' | 'links' | 'otps' | 'today';
type SortMode = 'newest' | 'oldest' | 'chat';

const FILTER_LABELS: Record<DeletedFilter, string> = {
  all:    'All',
  groups: 'Groups',
  direct: 'Direct',
  phones: 'Phones',
  links:  'Links',
  otps:   'OTPs',
  today:  'Today',
};

const SORT_LABELS: Record<SortMode, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  chat:   'By Chat',
};

function isToday(timestamp: number): boolean {
  const date = new Date(timestamp);
  const now  = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth()    === now.getMonth()    &&
    date.getDate()     === now.getDate()
  );
}

export function DeletedOnlyPage() {
  const navigate = useNavigate();

  const [searchQuery,     setSearchQuery]     = useState('');
  const [deletedMessages, setDeletedMessages] = useState<Message[]>([]);
  const [conversations,   setConversations]   = useState<Conversation[]>([]);
  const [isLoading,       setIsLoading]       = useState(true);
  const [activeFilter,    setActiveFilter]    = useState<DeletedFilter>('all');
  const [sortMode,        setSortMode]        = useState<SortMode>('newest');

  const loadData = useCallback(async (): Promise<void> => {
    const [deleted, convos] = await Promise.all([getDeletedMessages(), getConversations()]);
    setDeletedMessages(deleted);
    setConversations(convos);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    function handleNewMessage(): void { loadData(); }
    window.addEventListener('noticatch:new-message', handleNewMessage);
    return () => window.removeEventListener('noticatch:new-message', handleNewMessage);
  }, [loadData]);

  const conversationMap = useMemo(() => {
    const map = new Map<string, Conversation>();
    for (const conv of conversations) { map.set(conv.id, conv); }
    return map;
  }, [conversations]);

  const searchResults = useMemo(() => searchAndRank(
    deletedMessages,
    message => `${message.senderName} ${message.messageText ?? ''}`,
    searchQuery,
  ), [deletedMessages, searchQuery]);

  const displayedMessages = useMemo(() => {
    let filtered = searchResults.map(r => r.item);

    switch (activeFilter) {
      case 'groups': filtered = filtered.filter(m => conversationMap.get(m.conversationId)?.isGroup === true); break;
      case 'direct': filtered = filtered.filter(m => conversationMap.get(m.conversationId)?.isGroup === false); break;
      case 'phones': filtered = filtered.filter(m => extractEntities(m.messageText).some(e => e.type === 'PHONE_NUMBER')); break;
      case 'links':  filtered = filtered.filter(m => extractEntities(m.messageText).some(e => e.type === 'URL')); break;
      case 'otps':   filtered = filtered.filter(m => extractEntities(m.messageText).some(e => e.type === 'OTP_CODE')); break;
      case 'today':  filtered = filtered.filter(m => isToday(m.timestamp)); break;
      default: break;
    }

    switch (sortMode) {
      case 'oldest': return [...filtered].sort((a, b) => a.timestamp - b.timestamp);
      case 'chat':   return [...filtered].sort((a, b) => {
        const ta = conversationMap.get(a.conversationId)?.chatTitle ?? '';
        const tb = conversationMap.get(b.conversationId)?.chatTitle ?? '';
        return ta.localeCompare(tb);
      });
      default: return [...filtered].sort((a, b) => b.timestamp - a.timestamp);
    }
  }, [searchResults, activeFilter, sortMode, conversationMap]);

  const totalChars = useMemo(() =>
    displayedMessages.reduce((sum, m) => sum + (m.messageText?.length ?? 0), 0),
  [displayedMessages]);

  if (isLoading) {
    return (
      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{
          background: 'var(--md-sys-color-background)',
          color: 'var(--md-sys-color-on-surface)',
        }}
      >
        <TopAppBar title="Deleted Vault" />
        <div className="pt-14 flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        background: 'var(--md-sys-color-background)',
        color: 'var(--md-sys-color-on-surface)',
      }}
    >
      <TopAppBar
        title="Deleted Vault"
        subtitle={
          deletedMessages.length > 0
            ? `${deletedMessages.length} message${deletedMessages.length !== 1 ? 's' : ''} recovered`
            : 'None recovered yet'
        }
      />

      <div
        className="pt-16 z-20 border-b shadow-xs"
        style={{
          background: 'var(--md-sys-color-surface)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        <div className="px-4 pt-2.5 pb-2">
          <SearchInput
            id="deleted-search-input"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search deleted messages..."
            matchCount={searchQuery ? displayedMessages.length : undefined}
          />
        </div>

        <div className="flex items-center gap-2 px-4 pb-2 overflow-x-auto no-scrollbar" role="tablist" aria-label="Message filters">
          {(Object.keys(FILTER_LABELS) as DeletedFilter[]).map(filter => (
            <button
              key={filter}
              id={`deleted-filter-${filter}`}
              type="button"
              role="tab"
              aria-selected={activeFilter === filter}
              onClick={() => {
                HapticService.selection();
                setActiveFilter(filter);
              }}
              className={activeFilter === filter ? 'filter-pill-active' : 'filter-pill-inactive'}
            >
              {FILTER_LABELS[filter]}
            </button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-1 flex-shrink-0">
            <ArrowUpDown className="w-3 h-3" style={{ color: 'var(--md-sys-color-on-surface-muted)' }} strokeWidth={2} />
            {(Object.keys(SORT_LABELS) as SortMode[]).map(mode => (
              <button
                key={mode}
                id={`deleted-sort-${mode}`}
                type="button"
                onClick={() => {
                  HapticService.selection();
                  setSortMode(mode);
                }}
                className="text-2xs px-2 py-0.5 rounded-lg font-semibold transition-all duration-180"
                style={{
                  color: sortMode === mode
                    ? 'var(--md-sys-color-primary)'
                    : 'var(--md-sys-color-on-surface-variant)',
                  background: sortMode === mode
                    ? 'var(--md-sys-color-primary-container)'
                    : 'transparent',
                  fontWeight: sortMode === mode ? 700 : 500,
                }}
              >
                {SORT_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>

        {displayedMessages.length > 0 && (
          <div
            className="px-4 py-1.5 flex items-center justify-between text-2xs font-medium border-t"
            style={{
              background: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
              color: 'var(--md-sys-color-on-surface-variant)',
            }}
          >
            <span>{displayedMessages.length} item{displayedMessages.length !== 1 ? 's' : ''} shown</span>
            <span className="font-mono">{totalChars.toLocaleString()} characters recovered</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-24">
        {displayedMessages.length === 0 ? (
          <EmptyState
            icon={<Trash2 className="w-7 h-7" style={{ color: 'var(--md-sys-color-on-surface-muted)' }} />}
            title="No Deleted Messages Found"
            description={
              searchQuery || activeFilter !== 'all'
                ? 'No messages match your active search or filter selection.'
                : 'When contacts delete messages in WhatsApp, they will be captured and displayed here.'
            }
            action={
              activeFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    HapticService.selection();
                    setActiveFilter('all');
                  }}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Reset Filters
                </button>
              ) : undefined
            }
          />
        ) : (
          displayedMessages.map(message => (
            <DeletedMessageCard
              key={message.id}
              message={message}
              chatTitle={conversationMap.get(message.conversationId)?.chatTitle ?? 'Unknown Chat'}
              onClick={() => {
                HapticService.navigate();
                navigate(`/chats/${message.conversationId}`);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
