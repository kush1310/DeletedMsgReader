/**
 * Chat UI Components
 *
 * Conversation list row, message bubble, and deleted message card.
 * Enhanced with:
 *   - Entity extraction chips (Phone numbers, URLs, OTPs, Times)
 *   - Relative and absolute time displays
 *   - Merkle hash integrity indication
 *   - Clean, accessible touch targets with unique IDs
 */

import React from 'react';
import {
  Trash2,
  Pencil,
  Image as ImageIcon,
  Video,
  FileText,
  MapPin,
  Copy,
  ChevronRight,
  Users,
  Phone,
  ExternalLink,
  Clock,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import type { Conversation, Message, MediaType, ExtractedEntity } from '@/types';
import { Avatar, DeletedBadge } from '@/components/common';
import { extractEntities } from '@/services/EntityExtractor';

/* =============================================================
   Conversation List Row
   ============================================================= */

interface ConversationRowProps {
  readonly conversation: Conversation;
  readonly onClick: (conversationId: string) => void;
}

export function ConversationRow({ conversation, onClick }: ConversationRowProps) {
  const formattedTime = formatTimestamp(conversation.lastMessageTimestamp);
  const hasDeleted    = conversation.deletedCount > 0;

  return (
    <button
      type="button"
      id={`conversation-row-${conversation.id}`}
      onClick={() => onClick(conversation.id)}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface-900 hover:bg-surface-850 active:bg-surface-700 transition-all duration-150 cursor-pointer text-left border-b border-surface-700/60 last:border-b-0"
      style={hasDeleted ? { borderLeft: '3px solid #F59E0B' } : { borderLeft: '3px solid transparent' }}
    >
      <Avatar name={conversation.chatTitle} size="md" isGroup={conversation.isGroup} hasRecentDeletion={hasDeleted} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {conversation.isGroup && (
              <Users className="w-3 h-3 text-content-muted flex-shrink-0" strokeWidth={2.2} />
            )}
            <span className="text-sm font-bold text-content-primary truncate">
              {conversation.chatTitle}
            </span>
          </div>
          <span className="text-2xs text-content-muted flex-shrink-0 font-medium">{formattedTime}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {hasDeleted && (
              <Trash2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" strokeWidth={2.2} />
            )}
            <span className={`text-xs truncate ${hasDeleted ? 'text-amber-800 font-semibold' : 'text-content-secondary'}`}>
              {hasDeleted
                ? `${conversation.deletedCount} deleted message${conversation.deletedCount > 1 ? 's' : ''} recovered`
                : 'Tap to view timeline'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {hasDeleted && (
              <span className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 text-2xs font-extrabold shadow-xs">
                {conversation.deletedCount > 9 ? '9+' : conversation.deletedCount}
              </span>
            )}
            {conversation.unreadCount > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-accent flex items-center justify-center text-white text-2xs font-bold shadow-xs">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/* =============================================================
   Entity Chips Component
   ============================================================= */

interface EntityChipsProps {
  readonly entities: readonly ExtractedEntity[];
}

function EntityChips({ entities }: EntityChipsProps) {
  if (entities.length === 0) return null;

  function copyEntity(val: string, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(val).catch(() => {});
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 pt-1.5 border-t border-amber-200/80">
      {entities.map((entity, idx) => {
        let icon = <Copy className="w-2.5 h-2.5" />;
        if (entity.type === 'PHONE_NUMBER') icon = <Phone className="w-2.5 h-2.5" />;
        if (entity.type === 'URL')          icon = <ExternalLink className="w-2.5 h-2.5" />;
        if (entity.type === 'MEETING_TIME') icon = <Clock className="w-2.5 h-2.5" />;
        if (entity.type === 'OTP_CODE')     icon = <KeyRound className="w-2.5 h-2.5" />;

        return (
          <button
            key={`${entity.type}-${idx}`}
            type="button"
            onClick={(e) => copyEntity(entity.value, e)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/90 hover:bg-amber-200 text-amber-900 text-2xs font-bold border border-amber-300 transition-colors shadow-xs"
            title={`Copy ${entity.label}: ${entity.value}`}
          >
            {icon}
            <span>{entity.label}: {entity.value}</span>
          </button>
        );
      })}
    </div>
  );
}

/* =============================================================
   Message Bubble (WhatsApp Style)
   ============================================================= */

interface MessageBubbleProps {
  readonly message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const absoluteTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour:   '2-digit',
    minute: '2-digit',
  });
  const relativeTime = formatRelativeTime(message.timestamp);
  const entities = extractEntities(message.messageText);

  function copyDeletedText(event: React.MouseEvent): void {
    event.stopPropagation();
    if (message.messageText) {
      navigator.clipboard.writeText(message.messageText).catch(() => {});
    }
  }

  if (message.isDeletedBySender) {
    return (
      <div
        id={`msg-deleted-${message.id}`}
        className="flex flex-col items-start gap-1 animate-slide-up w-full max-w-[88%]"
      >
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-2xs text-accent font-bold">{message.senderName}</span>
          {message.hashSignature && (
            <span title="Cryptographic SHA-256 Fingerprinted" className="flex items-center text-accent">
              <ShieldCheck className="w-2.5 h-2.5 text-accent" strokeWidth={2.5} />
            </span>
          )}
        </div>
        <div className="bubble-deleted w-full shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-amber-600 flex-shrink-0" strokeWidth={2.2} />
              <span className="text-amber-900 text-xs font-bold">Message deleted by sender</span>
            </div>
            {message.messageText && (
              <button
                type="button"
                id={`copy-bubble-${message.id}`}
                onClick={copyDeletedText}
                aria-label="Copy recovered message text"
                className="p-1 rounded hover:bg-amber-200/60 text-amber-700 transition-colors flex-shrink-0"
              >
                <Copy className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            )}
          </div>
          {message.messageText && (
            <div className="mt-2 pt-2 border-t border-amber-200">
              <span className="text-2xs font-semibold text-amber-700 uppercase tracking-wider block mb-0.5">
                Recovered Text:
              </span>
              <p className="text-content-primary text-sm not-italic font-medium leading-relaxed">{message.messageText}</p>
              <EntityChips entities={entities} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <DeletedBadge compact />
          <span className="text-2xs text-content-muted font-medium">{absoluteTime}</span>
          {relativeTime && (
            <span className="text-2xs text-content-muted font-normal opacity-60">&middot; {relativeTime}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div id={`msg-${message.id}`} className="flex flex-col items-start gap-1 animate-slide-up max-w-[85%]">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-2xs text-accent font-bold">{message.senderName}</span>
        {message.isEdited && (
          <span className="flex items-center gap-0.5 text-2xs text-content-muted font-medium">
            <Pencil className="w-2.5 h-2.5" strokeWidth={2} />
            Edited
          </span>
        )}
      </div>
      <div className="bubble-received shadow-xs">
        {message.mediaType && <MediaIndicator mediaType={message.mediaType} />}
        {message.messageText && (
          <p className="text-content-primary text-sm font-normal leading-relaxed">{message.messageText}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-2xs text-content-muted font-medium">{absoluteTime}</span>
        {relativeTime && (
          <span className="text-2xs text-content-muted font-normal opacity-60">&middot; {relativeTime}</span>
        )}
      </div>
    </div>
  );
}

/* =============================================================
   Media Type Indicator
   ============================================================= */

interface MediaIndicatorProps {
  readonly mediaType: MediaType;
}

const mediaIconMap: Record<MediaType, React.ReactNode> = {
  image:    <ImageIcon className="w-3.5 h-3.5 text-accent" strokeWidth={2} />,
  video:    <Video     className="w-3.5 h-3.5 text-accent" strokeWidth={2} />,
  audio:    <FileText  className="w-3.5 h-3.5 text-accent" strokeWidth={2} />,
  document: <FileText  className="w-3.5 h-3.5 text-accent" strokeWidth={2} />,
  sticker:  <ImageIcon className="w-3.5 h-3.5 text-accent" strokeWidth={2} />,
  contact:  <FileText  className="w-3.5 h-3.5 text-accent" strokeWidth={2} />,
  location: <MapPin    className="w-3.5 h-3.5 text-accent" strokeWidth={2} />,
};

const mediaLabelMap: Record<MediaType, string> = {
  image:    'Image',
  video:    'Video',
  audio:    'Voice message',
  document: 'Document',
  sticker:  'Sticker',
  contact:  'Contact card',
  location: 'Location',
};

function MediaIndicator({ mediaType }: MediaIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5 text-content-secondary text-xs mb-1.5 pb-1.5 border-b border-surface-700 font-medium">
      {mediaIconMap[mediaType]}
      <span>{mediaLabelMap[mediaType]}</span>
    </div>
  );
}

/* =============================================================
   Deleted Message Card (for the Deleted-Only Page)
   ============================================================= */

interface DeletedMessageCardProps {
  readonly message:   Message;
  readonly chatTitle: string;
  readonly onClick?:  () => void;
}

export function DeletedMessageCard({ message, chatTitle, onClick }: DeletedMessageCardProps) {
  const formattedTime = new Date(message.timestamp).toLocaleString([], {
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
  const charCount = message.messageText?.length ?? 0;
  const entities = extractEntities(message.messageText);

  function copyText(event: React.MouseEvent): void {
    event.stopPropagation();
    if (message.messageText) {
      navigator.clipboard.writeText(message.messageText).catch(() => {});
    }
  }

  return (
    <div
      id={`deleted-card-${message.id}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={event => event.key === 'Enter' && onClick?.()}
      className={`card p-4 space-y-3 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={message.senderName} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-content-primary truncate">{message.senderName}</p>
            <p className="text-2xs text-content-muted truncate font-medium">{chatTitle}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <DeletedBadge />
          <span className="text-2xs text-content-muted font-medium">{formattedTime}</span>
        </div>
      </div>

      <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.2} />
            <span className="text-2xs text-amber-900 font-bold uppercase tracking-wide">Recovered Content</span>
          </div>
          {message.messageText && (
            <button
              type="button"
              id={`copy-card-${message.id}`}
              onClick={copyText}
              aria-label="Copy recovered text to clipboard"
              className="p-1 rounded hover:bg-amber-200/60 text-amber-700 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          )}
        </div>
        {message.messageText ? (
          <p className="text-content-primary text-sm leading-relaxed font-medium">{message.messageText}</p>
        ) : (
          <p className="text-content-muted text-sm italic">
            {message.mediaType ? `${mediaLabelMap[message.mediaType]} attachment` : 'Message content unavailable'}
          </p>
        )}
        <EntityChips entities={entities} />
        {charCount > 0 && (
          <p className="text-2xs text-amber-700/70 font-medium mt-2">{charCount} characters recovered</p>
        )}
      </div>

      {onClick && (
        <button
          type="button"
          id={`view-chat-cta-${message.id}`}
          onClick={event => { event.stopPropagation(); onClick(); }}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-accent hover:bg-accent-muted rounded-lg transition-colors border border-accent/20"
        >
          View in Chat
          <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

/* =============================================================
   Utility Functions
   ============================================================= */

function formatTimestamp(timestamp: number): string {
  const now      = new Date();
  const date     = new Date(timestamp);
  const diffMs   = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 1 && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatRelativeTime(timestamp: number): string | null {
  const diffMs   = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1)  return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24)  return `${diffHrs} hr${diffHrs > 1 ? 's' : ''} ago`;

  return null;
}
