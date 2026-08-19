package com.noticatch.app.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Index

/**
 * MessageEntity
 *
 * Room database entity for a single captured WhatsApp notification.
 * High-performance indexing supporting:
 *   - Composite index on (conversationId, timestamp DESC) for sliding-window queries
 *   - Composite index on (isDeletedBySender, timestamp) for recovery filtering
 *   - Edit tracking: originalText, editCount, editedAt
 *   - Audio/Voice note duration tracking
 *   - Ephemeral disappearing message retention
 *
 * @field id                   - UUIDv4 primary key generated at capture time.
 * @field conversationId       - Foreign key to ConversationEntity.id.
 * @field senderName           - Sanitized sender display name from notification title.
 * @field messageText          - Notification body text; null for deletions.
 * @field originalText         - Pre-edited message body text if message was edited.
 * @field notificationId       - Android system notification ID (for deduplication).
 * @field timestamp            - Unix epoch ms of notification receipt (sbn.postTime).
 * @field isDeletedBySender    - True when deletion pattern matched this message.
 * @field isEdited             - True when edit pattern matched this message.
 * @field editCount            - Number of revisions captured for this message.
 * @field editedAt             - Timestamp of the most recent revision.
 * @field mediaType            - Media attachment type label (null for text-only).
 * @field mediaPath            - Local file path to saved media (null if none).
 * @field audioDurationSeconds - Duration of voice notes in seconds (null if none).
 * @field isDisappearing       - True if sent in WhatsApp Disappearing Messages mode.
 * @field hashSignature        - SHA-256 composite of key fields for tamper detection.
 * @field isPurged             - True when soft-deleted during retention cycle.
 * @field purgedAt             - Timestamp of soft-deletion.
 */
@Entity(
    tableName = "messages",
    indices   = [
        Index(value = ["conversationId", "timestamp"]),
        Index(value = ["isDeletedBySender", "timestamp"]),
        Index(value = ["isEdited", "timestamp"]),
        Index(
            value  = ["conversationId", "senderName", "timestamp", "messageText"],
            unique = false
        )
    ]
)
data class MessageEntity(
    @PrimaryKey val id:                   String,
    val conversationId:       String,
    val senderName:           String,
    val messageText:          String?,
    val originalText:         String? = null,
    val notificationId:       Int,
    val timestamp:            Long,
    val isDeletedBySender:    Boolean,
    val isEdited:             Boolean = false,
    val editCount:            Int = 0,
    val editedAt:             Long? = null,
    val mediaType:            String? = null,
    val mediaPath:            String? = null,
    val audioDurationSeconds: Int? = null,
    val isDisappearing:       Boolean = false,
    val hashSignature:        String = "",
    val isPurged:             Boolean = false,
    val purgedAt:             Long? = null,
)
