/**
 * Chat UI Components
 *
 * Conversation list row, message bubble, and deleted message indicator
 * components used across the Chats and ChatDetail pages.
 * Styled strictly for Material Design 3 / WhatsApp Light Theme.
 */

import React from 'react';
import { Trash2, Pencil, Image as ImageIcon, Video, FileText, MapPin } from 'lucide-react';
import type { Conversation, Message, MediaType } from '@/types';
import { Avatar, DeletedBadge } from '@/components/common';

/* =============================================================
   Conversation List Row
   ============================================================= */

interface ConversationRowProps {
  readonly conversation: Conversation;
  readonly onClick: (conversationId: string) => void;
}

/**
 * ConversationRow
 *
 * Displays a single WhatsApp conversation entry in the chat list.
 * Shows avatar, chat title, last message preview, timestamp, unread badge,
 * and a deleted message count indicator when applicable.
 */
export function ConversationRow({ conversation, onClick }: ConversationRowProps) {
  const formattedTime = formatTimestamp(conversation.lastMessageTimestamp);

  return (
    <button
      type="button"
      id={`conversation-row-${conversation.id}`}
      onClick={() => onClick(conversation.id)}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface-900 hover:bg-surface-850 active:bg-surface-700 transition-colors duration-150 cursor-pointer text-left border-b border-surface-700/60 last:border-b-0"
    >
      {/* Avatar */}
      <Avatar name={conversation.chatTitle} size="md" isGroup={conversation.isGroup} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-sm font-bold text-content-primary truncate">
            {conversation.chatTitle}
          </span>
          <span className="text-2xs text-content-muted flex-shrink-0 font-medium">{formattedTime}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {conversation.deletedCount > 0 && (
              <Trash2 className="w-3.5 h-3.5 text-warning flex-shrink-0" strokeWidth={2.2} />
            )}
            <span className={`text-xs truncate ${conversation.deletedCount > 0 ? 'text-amber-800 font-semibold' : 'text-content-secondary'}`}>
              {conversation.deletedCount > 0
                ? `${conversation.deletedCount} deleted message${conversation.deletedCount > 1 ? 's' : ''} recovered`
                : 'Tap to view timeline'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {conversation.deletedCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 text-2xs font-extrabold shadow-xs">
                {conversation.deletedCount}
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
   Message Bubble (WhatsApp Light Mode Style)
   ============================================================= */

interface MessageBubbleProps {
  readonly message: Message;
}

/**
 * MessageBubble
 *
 * Renders a single message in the conversation timeline.
 * Normal messages appear as clean white WhatsApp-style bubbles.
 * Deleted messages render with soft amber warning highlights.
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour:   '2-digit',
    minute: '2-digit',
  });

  if (message.isDeletedBySender) {
    return (
      <div className="flex flex-col items-start gap-1 animate-slide-up w-full max-w-[85%]">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-2xs text-accent font-bold">{message.senderName}</span>
        </div>
        <div className="bubble-deleted w-full">
          <div className="flex items-center gap-2 mb-1.5">
            <Trash2 className="w-4 h-4 text-warning flex-shrink-0" strokeWidth={2.2} />
            <span className="text-amber-900 text-xs font-bold">This message was deleted</span>
          </div>
          {message.messageText && (
            <div className="mt-2 pt-2 border-t border-amber-200">
              <span className="text-2xs font-semibold text-amber-700 uppercase tracking-wider block mb-0.5">
                Recovered Text:
              </span>
              <p className="text-content-primary text-sm not-italic font-medium">{message.messageText}</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <DeletedBadge compact />
          <span className="text-2xs text-content-muted font-medium">{formattedTime}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1 animate-slide-up max-w-[85%]">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-2xs text-accent font-bold">{message.senderName}</span>
        {message.isEdited && (
          <span className="flex items-center gap-0.5 text-2xs text-content-muted font-medium">
            <Pencil className="w-2.5 h-2.5" strokeWidth={2} />
            Edited
          </span>
        )}
      </div>
      <div className="bubble-received">
        {message.mediaType && <MediaIndicator mediaType={message.mediaType} />}
        {message.messageText && (
          <p className="text-content-primary text-sm font-normal">{message.messageText}</p>
        )}
      </div>
      <span className="text-2xs text-content-muted font-medium">{formattedTime}</span>
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
  image:    <ImageIcon   className="w-3.5 h-3.5 text-accent" strokeWidth={2} />,
  video:    <Video       className="w-3.5 h-3.5 text-accent" strokeWidth={2} />,
  audio:    <FileText    className="w-3.5 h-3.5 text-accent" strokeWidth={2} />,
  document: <FileText    className="w-3.5 h-3.5 text-accent" strokeWidth={2} />,
  sticker:  <ImageIcon   className="w-3.5 h-3.5 text-accent" strokeWidth={2} />,
  contact:  <FileText    className="w-3.5 h-3.5 text-accent" strokeWidth={2} />,
  location: <MapPin      className="w-3.5 h-3.5 text-accent" strokeWidth={2} />,
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

/**
 * MediaIndicator
 *
 * Renders a compact media type badge inside a message bubble.
 */
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
  readonly message: Message;
  readonly chatTitle: string;
  readonly onClick?: () => void;
}

/**
 * DeletedMessageCard
 *
 * Standalone card view of a deleted message for the Deleted-Only page.
 */
export function DeletedMessageCard({ message, chatTitle, onClick }: DeletedMessageCardProps) {
  const formattedTime = new Date(message.timestamp).toLocaleString([], {
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={event => event.key === 'Enter' && onClick?.()}
      className={`card p-4 space-y-3 ${onClick ? 'card-interactive' : ''}`}
    >
      {/* Header */}
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

      {/* Recovered content */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Trash2 className="w-3.5 h-3.5 text-warning" strokeWidth={2.2} />
          <span className="text-2xs text-amber-900 font-bold uppercase tracking-wide">Recovered Content</span>
        </div>
        {message.messageText ? (
          <p className="text-content-primary text-sm leading-relaxed font-medium">{message.messageText}</p>
        ) : (
          <p className="text-content-muted text-sm italic">
            {message.mediaType ? `${mediaLabelMap[message.mediaType]} attachment` : 'Message content unavailable'}
          </p>
        )}
      </div>
    </div>
  );
}

/* =============================================================
   Utility
   ============================================================= */

/**
 * formatTimestamp
 *
 * Converts a Unix epoch ms timestamp to a human-readable relative time string.
 */
function formatTimestamp(timestamp: number): string {
  const now   = new Date();
  const date  = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 1 && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
