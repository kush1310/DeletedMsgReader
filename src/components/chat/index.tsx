/**
 * Chat UI Components
 *
 * Conversation list row, message bubble, and deleted message card.
 * Styled in Anthropic Claude warm editorial aesthetic with honey-amber deleted cards.
 */

import React, { useState } from 'react';
import {
  Trash2,
  Pencil,
  Image as ImageIcon,
  Video,
  FileText,
  MapPin,
  Copy,
  Users,
  Phone,
  ExternalLink,
  Clock,
  KeyRound,
  Check,
} from 'lucide-react';
import type { Conversation, Message, MediaType, ExtractedEntity } from '@/types';
import { Avatar, DeletedBadge } from '@/components/common';
import { extractEntities } from '@/services/EntityExtractor';
import { computeWordDiff } from '@/services/DiffEngine';

/* =============================================================
   Conversation List Row
   ============================================================= */

interface ConversationRowProps {
  readonly conversation: Conversation;
  readonly onClick: (conversationId: string) => void;
  readonly onLongPress?: (conversation: Conversation) => void;
}

export function ConversationRow({ conversation, onClick, onLongPress }: ConversationRowProps) {
  const formattedTime = formatTimestamp(conversation.lastMessageTimestamp);
  const hasDeleted    = conversation.deletedCount > 0;
  const [pressTimer, setPressTimer] = useState<number | null>(null);

  function handleTouchStart() {
    if (!onLongPress) return;
    const timer = window.setTimeout(() => {
      onLongPress(conversation);
    }, 550);
    setPressTimer(timer);
  }

  function handleTouchEnd() {
    if (pressTimer) {
      window.clearTimeout(pressTimer);
      setPressTimer(null);
    }
  }

  return (
    <button
      type="button"
      id={`conversation-row-${conversation.id}`}
      onClick={() => onClick(conversation.id)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onContextMenu={(e) => {
        if (onLongPress) {
          e.preventDefault();
          onLongPress(conversation);
        }
      }}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-white hover:bg-[#F8F9FA] active:bg-[#F3F4F6] transition-all duration-180 cursor-pointer text-left border-b border-[#E5E7EB] last:border-b-0"
      style={hasDeleted ? { borderLeft: '3px solid #D97706' } : { borderLeft: '3px solid transparent' }}
    >
      <Avatar name={conversation.chatTitle} size="md" isGroup={conversation.isGroup} hasRecentDeletion={hasDeleted} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {conversation.isGroup && (
              <Users className="w-3 h-3 text-[#6B7280] flex-shrink-0" strokeWidth={2.2} />
            )}
            <span className="text-sm font-bold text-[#111827] truncate">
              {conversation.chatTitle}
            </span>
          </div>
          <span className="text-2xs text-[#6B7280] flex-shrink-0 font-medium">{formattedTime}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {hasDeleted && (
              <Trash2 className="w-3.5 h-3.5 text-[#D97706] flex-shrink-0" strokeWidth={2.2} />
            )}
            <span className={`text-xs truncate ${hasDeleted ? 'text-[#D97706] font-semibold' : 'text-[#6B7280]'}`}>
              {hasDeleted
                ? `${conversation.deletedCount} deleted message${conversation.deletedCount > 1 ? 's' : ''} recovered`
                : 'Tap to view chat'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {hasDeleted && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-900 text-2xs font-bold shadow-xs">
                {conversation.deletedCount > 9 ? '9+' : conversation.deletedCount}
              </span>
            )}
            {conversation.unreadCount > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#2C6BED] flex items-center justify-center text-white text-2xs font-bold shadow-xs">
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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (entities.length === 0) return null;

  function copyEntity(val: string, index: number, e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(val).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    }).catch(() => {});
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 pt-1.5 border-t border-amber-300/60">
      {entities.map((entity, idx) => {
        let icon = <Copy className="w-2.5 h-2.5" />;
        if (entity.type === 'PHONE_NUMBER') icon = <Phone className="w-2.5 h-2.5" />;
        if (entity.type === 'URL')          icon = <ExternalLink className="w-2.5 h-2.5" />;
        if (entity.type === 'MEETING_TIME') icon = <Clock className="w-2.5 h-2.5" />;
        if (entity.type === 'OTP_CODE')     icon = <KeyRound className="w-2.5 h-2.5" />;

        const isCopied = copiedIndex === idx;

        return (
          <button
            key={`${entity.type}-${idx}`}
            type="button"
            onClick={(e) => copyEntity(entity.value, idx, e)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/90 hover:bg-amber-200 text-amber-900 text-2xs font-bold border border-amber-300 transition-colors shadow-xs"
            title={`Copy ${entity.label}: ${entity.value}`}
          >
            {isCopied ? <Check className="w-2.5 h-2.5 text-accent" strokeWidth={3} /> : icon}
            <span>{isCopied ? 'Copied!' : `${entity.label}: ${entity.value}`}</span>
          </button>
        );
      })}
    </div>
  );
}

/* =============================================================
   Audio Waveform Visualizer
   ============================================================= */

function AudioWaveform({ durationSeconds }: { readonly durationSeconds: number }) {
  const bars = [4, 8, 14, 10, 18, 12, 16, 20, 14, 8, 16, 12, 6, 10, 14, 8];
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 mt-1.5 p-2 rounded-xl bg-surface-850 border border-surface-700">
      <div className="flex items-center gap-0.5 h-5 flex-1">
        {bars.map((height, i) => (
          <div
            key={i}
            className="w-1 bg-accent rounded-full opacity-80"
            style={{ height: `${height}px` }}
          />
        ))}
      </div>
      <span className="text-2xs font-bold text-content-muted tabular-nums">
        {formattedDuration}
      </span>
    </div>
  );
}

/* =============================================================
   Edit Diff Viewer
   ============================================================= */

function EditDiffViewer({ originalText, newText }: { readonly originalText: string; readonly newText?: string | null }) {
  if (!newText || originalText === newText) return null;
  const diffChunks = computeWordDiff(originalText, newText);

  return (
    <div className="mt-2 pt-2 border-t border-surface-700/80 text-xs">
      <span className="text-2xs font-bold text-accent uppercase tracking-wider block mb-1">
        Edit Revision Diff:
      </span>
      <div className="p-2 rounded-xl bg-surface-850 border border-surface-700 text-content-primary leading-relaxed">
        {diffChunks.map((chunk, idx) => {
          if (chunk.type === 'REMOVED') {
            return (
              <span
                key={idx}
                className="line-through text-rose-700 bg-rose-50 px-1 py-0.5 rounded mx-0.5 text-2xs font-medium"
              >
                {chunk.text}
              </span>
            );
          }
          if (chunk.type === 'ADDED') {
            return (
              <span
                key={idx}
                className="text-emerald-800 bg-emerald-50 font-bold px-1 py-0.5 rounded mx-0.5 text-2xs"
              >
                {chunk.text}
              </span>
            );
          }
          return <span key={idx}>{chunk.text}</span>;
        })}
      </div>
    </div>
  );
}

/* =============================================================
   Message Bubble
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
        </div>
        <div className="bubble-deleted w-full">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-accent flex-shrink-0" strokeWidth={2.2} />
              <span className="text-[#9C5418] text-xs font-bold">Message deleted by sender</span>
            </div>
            {message.messageText && (
              <button
                type="button"
                id={`copy-bubble-${message.id}`}
                onClick={copyDeletedText}
                aria-label="Copy recovered message text"
                className="p-1 rounded-lg hover:bg-amber-200/70 text-[#9C5418] transition-colors flex-shrink-0"
              >
                <Copy className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            )}
          </div>
          {message.messageText && (
            <div className="mt-2 pt-2 border-t border-amber-300/60">
              <span className="text-2xs font-bold text-[#9C5418] uppercase tracking-wider block mb-0.5">
                Recovered Text:
              </span>
              <p className="text-content-primary text-sm not-italic font-medium leading-relaxed">{message.messageText}</p>
              {message.audioDurationSeconds && (
                <AudioWaveform durationSeconds={message.audioDurationSeconds} />
              )}
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
          <span className="flex items-center gap-0.5 text-2xs text-accent font-semibold bg-accent-muted px-1.5 py-0.5 rounded-full">
            <Pencil className="w-2.5 h-2.5" strokeWidth={2} />
            Edited {message.editCount ? `(v${message.editCount + 1})` : ''}
          </span>
        )}
      </div>
      <div className="bubble-received shadow-xs">
        {message.mediaType && <MediaIndicator mediaType={message.mediaType} />}
        {message.audioDurationSeconds && (
          <AudioWaveform durationSeconds={message.audioDurationSeconds} />
        )}
        {message.messageText && (
          <p className="text-content-primary text-sm font-normal leading-relaxed">{message.messageText}</p>
        )}
        {message.isEdited && message.originalText && (
          <EditDiffViewer originalText={message.originalText} newText={message.messageText} />
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
   Deleted Message Card (for Deleted-Only Page)
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
      onClick={onClick}
      className="p-4 rounded-2xl border border-[#FED7AA] bg-[#FFF4E5] transition-all duration-180 hover:border-[#D97706] active:scale-[0.99] cursor-pointer shadow-xs"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={chatTitle} size="sm" hasRecentDeletion />
          <div className="min-w-0">
            <span className="text-xs font-bold text-[#111827] truncate block">
              {chatTitle}
            </span>
            <span className="text-2xs text-[#D97706] font-semibold truncate block">
              From: {message.senderName}
            </span>
          </div>
        </div>
        <DeletedBadge />
      </div>

      {message.messageText ? (
        <div className="p-3 rounded-xl bg-white border border-[#FED7AA] mb-2 shadow-xs">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-2xs font-bold text-[#92400E] uppercase tracking-wider">
              Recovered Content:
            </span>
            <span className="text-2xs text-[#6B7280] tabular-nums font-semibold">
              {charCount} chars
            </span>
          </div>
          <p className="text-[#111827] text-sm font-medium leading-relaxed break-words">
            {message.messageText}
          </p>
          {message.audioDurationSeconds && (
            <AudioWaveform durationSeconds={message.audioDurationSeconds} />
          )}
          <EntityChips entities={entities} />
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-white/70 mb-2 text-[#6B7280] text-xs italic">
          No message body was captured prior to deletion.
        </div>
      )}

      <div className="flex items-center justify-between text-2xs text-[#6B7280] pt-1 border-t border-amber-200/80 font-medium">
        <span className="tabular-nums">{formattedTime}</span>
        {message.messageText && (
          <button
            type="button"
            id={`copy-card-${message.id}`}
            onClick={copyText}
            className="flex items-center gap-1 text-[#D97706] font-bold hover:text-[#B45309] transition-colors px-2 py-0.5 rounded-md bg-white border border-[#FED7AA] shadow-xs"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
        )}
      </div>
    </div>
  );
}

function formatTimestamp(timestamp: number): string {
  if (!timestamp) return '';
  const now = new Date();
  const date = new Date(timestamp);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return '';
  const diffMinutes = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMinutes < 1)  return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24)   return `${diffHours}h ago`;
  return '';
}
