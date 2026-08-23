/**
 * Chat UI Components — NotiCatch Material 3 Expressive Chat System
 *
 * ConversationRow  — 72dp message-list row with circular avatar, haptic long-press,
 *                    ripple on tap, amber semantic left-accent for deleted chats.
 *
 * MessageBubble    — Received and deleted message bubbles with slide-in animation,
 *                    semantic token surfaces, edit-diff viewer, entity chips.
 *
 * DeletedMessageCard — Standalone amber card for the Deleted Vault page.
 *
 * All components use CSS custom property semantic tokens — zero hardcoded hex values.
 * Dark theme is fully supported through the .dark class on <html>.
 */

import React, { useState, useRef, useCallback } from 'react';
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
import { Avatar, DeletedBadge, addRipple } from '@/components/common';
import { extractEntities } from '@/services/EntityExtractor';
import { computeWordDiff } from '@/services/DiffEngine';
import { HapticService } from '@/services/HapticService';

/* =============================================================================
   Conversation List Row
   ============================================================================= */

interface ConversationRowProps {
  readonly conversation: Conversation;
  readonly onClick:       (conversationId: string) => void;
  readonly onLongPress?:  (conversation: Conversation) => void;
}

/**
 * ConversationRow
 *
 * Single conversation entry in the Chats list. Displays circular avatar,
 * chat title, last message snippet, timestamp, and badge counts.
 *
 * Deleted chats receive an amber 3dp left accent border using tertiary token.
 * Long-press (550ms threshold) triggers the action sheet with haptic confirmation.
 * Tap fires a ripple wave + HapticService.tap().
 *
 * @param conversation - Conversation data object from Room/SQLite.
 * @param onClick      - Tap handler navigating to the chat detail.
 * @param onLongPress  - Long-press handler opening the action sheet.
 */
export function ConversationRow({ conversation, onClick, onLongPress }: ConversationRowProps) {
  const formattedTime = formatTimestamp(conversation.lastMessageTimestamp);
  const hasDeleted    = conversation.deletedCount > 0;
  const buttonRef     = useRef<HTMLButtonElement>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const longPressActivated = useRef(false);

  /**
   * handlePressStart
   *
   * Records the start of a press gesture. Starts a 550ms timer to classify
   * the gesture as a long press. If the timer fires, HapticService.longPress()
   * is fired and the action sheet is triggered.
   */
  const handlePressStart = useCallback(() => {
    if (!onLongPress) return;
    longPressActivated.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressActivated.current = true;
      HapticService.longPress();
      onLongPress(conversation);
    }, 550);
  }, [conversation, onLongPress]);

  /**
   * handlePressEnd
   *
   * Cancels the long-press timer if the finger/pointer was lifted before
   * the 550ms threshold, classifying the gesture as a normal tap.
   */
  const handlePressEnd = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  /**
   * handleTap
   *
   * Fires the tap navigation only if the gesture was not already classified
   * as a long press. Adds ripple effect and haptic tap.
   *
   * @param event - React mouse event used for ripple origin coordinates.
   */
  const handleTap = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (longPressActivated.current) {
      longPressActivated.current = false;
      return;
    }
    HapticService.tap();
    addRipple(event, buttonRef.current);
    onClick(conversation.id);
  }, [conversation.id, onClick]);

  return (
    <button
      ref={buttonRef}
      type="button"
      id={`conversation-row-${conversation.id}`}
      onClick={handleTap}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchMove={handlePressEnd}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onContextMenu={(event) => {
        if (onLongPress) {
          event.preventDefault();
          HapticService.longPress();
          onLongPress(conversation);
        }
      }}
      className="message-row ripple-container"
      style={{
        borderLeft: hasDeleted
          ? '3px solid var(--md-sys-color-tertiary)'
          : '3px solid transparent',
      }}
    >
      <Avatar
        name={conversation.chatTitle}
        size="md"
        isGroup={conversation.isGroup}
        hasRecentDeletion={hasDeleted}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {conversation.isGroup && (
              <Users
                className="w-3 h-3 flex-shrink-0"
                strokeWidth={2.2}
                style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
              />
            )}
            <span
              className="text-sm font-bold truncate"
              style={{ color: 'var(--md-sys-color-on-surface)' }}
            >
              {conversation.chatTitle}
            </span>
          </div>
          <span
            className="text-2xs flex-shrink-0 font-medium"
            style={{ color: 'var(--md-sys-color-on-surface-muted)' }}
          >
            {formattedTime}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {hasDeleted && (
              <Trash2
                className="w-3.5 h-3.5 flex-shrink-0"
                strokeWidth={2.2}
                style={{ color: 'var(--md-sys-color-tertiary)' }}
              />
            )}
            <span
              className="text-xs truncate font-medium"
              style={{
                color: hasDeleted
                  ? 'var(--md-sys-color-tertiary)'
                  : 'var(--md-sys-color-on-surface-variant)',
                fontWeight: hasDeleted ? 600 : 400,
              }}
            >
              {hasDeleted
                ? `${conversation.deletedCount} deleted message${conversation.deletedCount > 1 ? 's' : ''} recovered`
                : (conversation.lastMessageSnippet ?? 'Tap to view chat')
              }
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {hasDeleted && (
              <span
                className="min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center text-2xs font-bold"
                style={{
                  background: 'var(--md-sys-color-tertiary-container)',
                  color: 'var(--md-sys-color-on-tertiary-container)',
                  border: '1px solid var(--md-sys-color-tertiary-border)',
                }}
              >
                {conversation.deletedCount > 9 ? '9+' : conversation.deletedCount}
              </span>
            )}
            {conversation.unreadCount > 0 && (
              <span
                className="badge-unread"
                aria-label={`${conversation.unreadCount} unread`}
              >
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/* =============================================================================
   Entity Chips
   ============================================================================= */

interface EntityChipsProps {
  readonly entities: readonly ExtractedEntity[];
}

/**
 * EntityChips
 *
 * Inline copyable chip row for extracted entities (phone numbers, URLs, OTPs,
 * meeting times) extracted from recovered message text. Tapping a chip copies
 * the entity value to clipboard with a transient check icon confirmation.
 *
 * @param entities - Array of ExtractedEntity objects from EntityExtractor.
 */
function EntityChips({ entities }: EntityChipsProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (entities.length === 0) return null;

  function copyEntity(value: string, index: number, event: React.MouseEvent): void {
    event.stopPropagation();
    HapticService.success();
    navigator.clipboard.writeText(value).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    }).catch(() => {});
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 mt-2 pt-1.5 border-t"
      style={{ borderColor: 'var(--md-sys-color-tertiary-border)' }}
    >
      {entities.map((entity, idx) => {
        let icon = <Copy className="w-2.5 h-2.5" />;
        if (entity.type === 'PHONE_NUMBER') icon = <Phone       className="w-2.5 h-2.5" />;
        if (entity.type === 'URL')          icon = <ExternalLink className="w-2.5 h-2.5" />;
        if (entity.type === 'MEETING_TIME') icon = <Clock       className="w-2.5 h-2.5" />;
        if (entity.type === 'OTP_CODE')     icon = <KeyRound    className="w-2.5 h-2.5" />;

        const isCopied = copiedIndex === idx;

        return (
          <button
            key={`${entity.type}-${idx}`}
            type="button"
            onClick={(event) => copyEntity(entity.value, idx, event)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-2xs font-bold border transition-all duration-150 active:scale-95"
            style={{
              background: 'var(--md-sys-color-tertiary-container)',
              color: 'var(--md-sys-color-on-tertiary-container)',
              borderColor: 'var(--md-sys-color-tertiary-border)',
            }}
            title={`Copy ${entity.label}: ${entity.value}`}
          >
            {isCopied
              ? <Check className="w-2.5 h-2.5" strokeWidth={3} style={{ color: 'var(--md-sys-color-primary)' }} />
              : icon
            }
            <span>{isCopied ? 'Copied!' : `${entity.label}: ${entity.value}`}</span>
          </button>
        );
      })}
    </div>
  );
}

/* =============================================================================
   Audio Waveform Visualizer
   ============================================================================= */

/**
 * AudioWaveform
 *
 * Static waveform visualization for voice messages. Uses surface-container
 * tokens for the track and primary token for the waveform bars.
 *
 * @param durationSeconds - Voice note duration in seconds.
 */
function AudioWaveform({ durationSeconds }: { readonly durationSeconds: number }) {
  const bars = [4, 8, 14, 10, 18, 12, 16, 20, 14, 8, 16, 12, 6, 10, 14, 8];
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      className="flex items-center gap-2 mt-1.5 p-2 rounded-xl border"
      style={{
        background: 'var(--md-sys-color-surface-container)',
        borderColor: 'var(--md-sys-color-outline-variant)',
      }}
    >
      <div className="flex items-center gap-0.5 h-5 flex-1">
        {bars.map((height, barIndex) => (
          <div
            key={barIndex}
            className="w-1 rounded-full opacity-80"
            style={{
              height: `${height}px`,
              background: 'var(--md-sys-color-primary)',
            }}
          />
        ))}
      </div>
      <span
        className="text-2xs font-bold tabular-nums"
        style={{ color: 'var(--md-sys-color-on-surface-muted)' }}
      >
        {formattedDuration}
      </span>
    </div>
  );
}

/* =============================================================================
   Edit Diff Viewer
   ============================================================================= */

/**
 * EditDiffViewer
 *
 * Inline word-level diff between the original and edited versions of a message.
 * Removed words shown with rose strikethrough on error-container.
 * Added words shown with emerald bold on success-container.
 *
 * @param originalText - The text before the edit.
 * @param newText      - The current text after the edit.
 */
function EditDiffViewer({ originalText, newText }: { readonly originalText: string; readonly newText?: string | null }) {
  if (!newText || originalText === newText) return null;
  const diffChunks = computeWordDiff(originalText, newText);

  return (
    <div
      className="mt-2 pt-2 border-t text-xs"
      style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
    >
      <span
        className="text-2xs font-bold uppercase tracking-wider block mb-1"
        style={{ color: 'var(--md-sys-color-primary)' }}
      >
        Edit Revision Diff:
      </span>
      <div
        className="p-2 rounded-xl border leading-relaxed"
        style={{
          background: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
          color: 'var(--md-sys-color-on-surface)',
        }}
      >
        {diffChunks.map((chunk, idx) => {
          if (chunk.type === 'REMOVED') {
            return (
              <span
                key={idx}
                className="line-through px-1 py-0.5 rounded mx-0.5 text-2xs font-medium"
                style={{
                  color: 'var(--md-sys-color-error)',
                  background: 'var(--md-sys-color-error-container)',
                }}
              >
                {chunk.text}
              </span>
            );
          }
          if (chunk.type === 'ADDED') {
            return (
              <span
                key={idx}
                className="font-bold px-1 py-0.5 rounded mx-0.5 text-2xs"
                style={{
                  color: 'var(--md-sys-color-success)',
                  background: 'var(--md-sys-color-success-container)',
                }}
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

/* =============================================================================
   Media Type Indicator
   ============================================================================= */

interface MediaIndicatorProps {
  readonly mediaType: MediaType;
}

const MEDIA_ICON_MAP: Record<MediaType, React.ReactNode> = {
  image:    <ImageIcon className="w-3.5 h-3.5" strokeWidth={2} style={{ color: 'var(--md-sys-color-primary)' }} />,
  video:    <Video     className="w-3.5 h-3.5" strokeWidth={2} style={{ color: 'var(--md-sys-color-primary)' }} />,
  audio:    <FileText  className="w-3.5 h-3.5" strokeWidth={2} style={{ color: 'var(--md-sys-color-primary)' }} />,
  document: <FileText  className="w-3.5 h-3.5" strokeWidth={2} style={{ color: 'var(--md-sys-color-primary)' }} />,
  sticker:  <ImageIcon className="w-3.5 h-3.5" strokeWidth={2} style={{ color: 'var(--md-sys-color-primary)' }} />,
  contact:  <FileText  className="w-3.5 h-3.5" strokeWidth={2} style={{ color: 'var(--md-sys-color-primary)' }} />,
  location: <MapPin    className="w-3.5 h-3.5" strokeWidth={2} style={{ color: 'var(--md-sys-color-primary)' }} />,
};

const MEDIA_LABEL_MAP: Record<MediaType, string> = {
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
 * Compact header row inside a message bubble indicating the attached media type.
 *
 * @param mediaType - MediaType enum value from the captured message.
 */
function MediaIndicator({ mediaType }: MediaIndicatorProps) {
  return (
    <div
      className="flex items-center gap-1.5 text-xs mb-1.5 pb-1.5 border-b font-medium"
      style={{
        color: 'var(--md-sys-color-on-surface-variant)',
        borderColor: 'var(--md-sys-color-outline-variant)',
      }}
    >
      {MEDIA_ICON_MAP[mediaType]}
      <span>{MEDIA_LABEL_MAP[mediaType]}</span>
    </div>
  );
}

/* =============================================================================
   Message Bubble
   ============================================================================= */

interface MessageBubbleProps {
  readonly message: Message;
  readonly isGroup?: boolean;
}

/**
 * MessageBubble
 *
 * Renders a single captured message in the chat timeline.
 *
 * Deleted by sender: amber bubble-deleted surface with recovered text block,
 * entity chips, audio waveform, copy button, and DeletedBadge.
 *
 * Received (normal): neutral bubble-received surface with optional media
 * indicator, audio waveform, edit diff, and edit badge.
 *
 * @param message - Message data object from Room/SQLite.
 * @param isGroup - If true, renders the sender name header for group threads.
 */
export function MessageBubble({ message, isGroup = false }: MessageBubbleProps) {
  const absoluteTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour:   '2-digit',
    minute: '2-digit',
  });
  const relativeTime = formatRelativeTime(message.timestamp);
  const entities     = extractEntities(message.messageText);

  function copyDeletedText(event: React.MouseEvent): void {
    event.stopPropagation();
    HapticService.success();
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
        {isGroup && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="text-2xs font-bold"
              style={{ color: 'var(--md-sys-color-primary)' }}
            >
              {message.senderName}
            </span>
          </div>
        )}

        <div className="bubble-deleted w-full">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <Trash2
                className="w-4 h-4 flex-shrink-0"
                strokeWidth={2.2}
                style={{ color: 'var(--md-color-deleted-icon)' }}
              />
              <span
                className="text-xs font-bold"
                style={{ color: 'var(--md-color-deleted-text)' }}
              >
                Message deleted by sender
              </span>
            </div>
            {message.messageText && (
              <button
                type="button"
                id={`copy-bubble-${message.id}`}
                onClick={copyDeletedText}
                aria-label="Copy recovered message text"
                className="p-1.5 rounded-lg transition-all active:scale-90"
                style={{
                  color: 'var(--md-color-deleted-text)',
                  background: 'var(--md-sys-color-tertiary-container)',
                }}
              >
                <Copy className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            )}
          </div>

          {message.messageText && (
            <div
              className="mt-2 pt-2 border-t"
              style={{ borderColor: 'var(--md-sys-color-tertiary-border)' }}
            >
              <span
                className="text-2xs font-bold uppercase tracking-wider block mb-0.5"
                style={{ color: 'var(--md-color-recovered-text-strong)' }}
              >
                Recovered Text:
              </span>
              <p
                className="text-sm not-italic font-medium leading-relaxed"
                style={{ color: 'var(--md-sys-color-on-surface)' }}
              >
                {message.messageText}
              </p>
              {message.audioDurationSeconds && (
                <AudioWaveform durationSeconds={message.audioDurationSeconds} />
              )}
              <EntityChips entities={entities} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <DeletedBadge compact />
          <span
            className="text-2xs font-medium"
            style={{ color: 'var(--md-sys-color-on-surface-muted)' }}
          >
            {absoluteTime}
          </span>
          {relativeTime && (
            <span
              className="text-2xs font-normal opacity-60"
              style={{ color: 'var(--md-sys-color-on-surface-muted)' }}
            >
              &middot; {relativeTime}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      id={`msg-${message.id}`}
      className="flex flex-col items-start gap-1 animate-slide-up max-w-[85%]"
    >
      {(isGroup || message.isEdited) && (
        <div className="flex items-center gap-1.5 mb-0.5">
          {isGroup && (
            <span
              className="text-2xs font-bold"
              style={{ color: 'var(--md-sys-color-primary)' }}
            >
              {message.senderName}
            </span>
          )}
          {message.isEdited && (
            <span
              className="flex items-center gap-0.5 text-2xs font-semibold px-1.5 py-0.5 rounded-full"
              style={{
                color: 'var(--md-sys-color-on-primary-container)',
                background: 'var(--md-sys-color-primary-container)',
              }}
            >
              <Pencil className="w-2.5 h-2.5" strokeWidth={2} />
              Edited {message.editCount ? `(v${message.editCount + 1})` : ''}
            </span>
          )}
        </div>
      )}

      <div className="bubble-received elevation-1">
        {message.mediaType && <MediaIndicator mediaType={message.mediaType} />}
        {message.audioDurationSeconds && (
          <AudioWaveform durationSeconds={message.audioDurationSeconds} />
        )}
        {message.messageText && (
          <p
            className="text-sm font-normal leading-relaxed"
            style={{ color: 'var(--md-sys-color-on-surface)' }}
          >
            {message.messageText}
          </p>
        )}
        {message.isEdited && message.originalText && (
          <EditDiffViewer originalText={message.originalText} newText={message.messageText} />
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="text-2xs font-medium"
          style={{ color: 'var(--md-sys-color-on-surface-muted)' }}
        >
          {absoluteTime}
        </span>
        {relativeTime && (
          <span
            className="text-2xs font-normal opacity-60"
            style={{ color: 'var(--md-sys-color-on-surface-muted)' }}
          >
            &middot; {relativeTime}
          </span>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   Deleted Message Card (Deleted Vault Page)
   ============================================================================= */

interface DeletedMessageCardProps {
  readonly message:   Message;
  readonly chatTitle: string;
  readonly onClick?:  () => void;
}

/**
 * DeletedMessageCard
 *
 * Standalone card displayed on the Deleted Vault page. Shows the full recovered
 * message content with entity chips, audio waveform, copy button, and metadata.
 *
 * Uses tertiary-container semantic tokens for the amber surface — fully dark
 * theme aware. Tap fires a spring press animation and navigation haptic.
 *
 * @param message   - Message data object.
 * @param chatTitle - Display name of the parent conversation.
 * @param onClick   - Navigation handler to the parent chat thread.
 */
export function DeletedMessageCard({ message, chatTitle, onClick }: DeletedMessageCardProps) {
  const formattedTime = new Date(message.timestamp).toLocaleString([], {
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
  const charCount = message.messageText?.length ?? 0;
  const entities  = extractEntities(message.messageText);
  const cardRef   = useRef<HTMLDivElement>(null);

  const handleCardPress = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick) return;
    HapticService.tap();
    addRipple(event, cardRef.current);
    onClick();
  }, [onClick]);

  function copyText(event: React.MouseEvent): void {
    event.stopPropagation();
    HapticService.success();
    if (message.messageText) {
      navigator.clipboard.writeText(message.messageText).catch(() => {});
    }
  }

  return (
    <div
      ref={cardRef}
      id={`deleted-card-${message.id}`}
      onClick={handleCardPress}
      role="button"
      tabIndex={0}
      className="relative overflow-hidden rounded-2xl border p-4 animate-reveal-up active:scale-[0.99] ripple-container transition-all duration-180"
      style={{
        background: 'var(--md-color-deleted-surface)',
        borderColor: 'var(--md-color-deleted-border)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={chatTitle} size="sm" hasRecentDeletion />
          <div className="min-w-0">
            <span
              className="text-xs font-bold truncate block"
              style={{ color: 'var(--md-sys-color-on-surface)' }}
            >
              {chatTitle}
            </span>
            <span
              className="text-2xs font-semibold truncate block"
              style={{ color: 'var(--md-color-deleted-icon)' }}
            >
              From: {message.senderName}
            </span>
          </div>
        </div>
        <DeletedBadge />
      </div>

      {message.messageText ? (
        <div
          className="p-3 rounded-xl border mb-2"
          style={{
            background: 'var(--md-sys-color-surface)',
            borderColor: 'var(--md-color-deleted-border)',
          }}
        >
          <div className="flex items-center justify-between gap-1 mb-1">
            <span
              className="text-2xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--md-color-recovered-text-strong)' }}
            >
              Recovered Content:
            </span>
            <span
              className="text-2xs tabular-nums font-semibold"
              style={{ color: 'var(--md-sys-color-on-surface-muted)' }}
            >
              {charCount} chars
            </span>
          </div>
          <p
            className="text-sm font-medium leading-relaxed break-words"
            style={{ color: 'var(--md-sys-color-on-surface)' }}
          >
            {message.messageText}
          </p>
          {message.audioDurationSeconds && (
            <AudioWaveform durationSeconds={message.audioDurationSeconds} />
          )}
          <EntityChips entities={entities} />
        </div>
      ) : (
        <div
          className="p-2.5 rounded-xl mb-2 text-xs italic"
          style={{
            background: 'color-mix(in srgb, var(--md-sys-color-surface) 70%, transparent)',
            color: 'var(--md-sys-color-on-surface-muted)',
          }}
        >
          No message body was captured prior to deletion.
        </div>
      )}

      <div
        className="flex items-center justify-between text-2xs pt-1 border-t font-medium"
        style={{
          color: 'var(--md-sys-color-on-surface-muted)',
          borderColor: 'var(--md-color-deleted-border)',
        }}
      >
        <span className="tabular-nums">{formattedTime}</span>
        {message.messageText && (
          <button
            type="button"
            id={`copy-card-${message.id}`}
            onClick={copyText}
            className="flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg border transition-all duration-150 active:scale-95"
            style={{
              color: 'var(--md-color-deleted-icon)',
              background: 'var(--md-sys-color-surface)',
              borderColor: 'var(--md-color-deleted-border)',
            }}
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
        )}
      </div>
    </div>
  );
}

/* =============================================================================
   Timestamp Utilities
   ============================================================================= */

/**
 * formatTimestamp
 *
 * Formats a Unix millisecond timestamp into a human-readable relative date
 * appropriate for conversation list display:
 * - Today: 12:34
 * - Yesterday: Yesterday
 * - Within 7 days: Mon, Tue, ...
 * - Older: Sep 12
 *
 * @param  timestamp - Unix timestamp in milliseconds.
 * @returns          - Formatted string or empty if timestamp is falsy.
 */
function formatTimestamp(timestamp: number): string {
  if (!timestamp) return '';
  const now      = new Date();
  const date     = new Date(timestamp);
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

/**
 * formatRelativeTime
 *
 * Returns a compact relative time label for message timestamps shown below
 * message bubbles. Returns empty string for messages older than 24h.
 *
 * @param  timestamp - Unix timestamp in milliseconds.
 * @returns          - Relative string ('just now', '5m ago', '2h ago', or '').
 */
function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return '';
  const diffMinutes = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMinutes < 1)  return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24)   return `${diffHours}h ago`;
  return '';
}
