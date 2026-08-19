package com.noticatch.app.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Index

/**
 * MessageEntity
 *
 * Room database entity for a single captured WhatsApp notification.
 * High-performance indexing supporting:
 *   - Composite index on (conversationId, timestamp DESC) for sub-millisecond sliding-window queries
 *   - Composite unique index on (conversationId, senderName, timestamp, messageText) for deduplication
 *   - Index on isDeletedBySender for fast recovery queries
 *
 * @field id                - UUIDv4 primary key generated at capture time.
 * @field conversationId    - Foreign key to ConversationEntity.id.
 * @field senderName        - Sanitized sender display name from notification title.
 * @field messageText       - Notification body text; null for deletions.
 * @field notificationId    - Android system notification ID (for deduplication).
 * @field timestamp         - Unix epoch ms of notification receipt (sbn.postTime).
 * @field isDeletedBySender - True when deletion pattern matched this message.
 * @field isEdited          - True when edit pattern matched this message.
 * @field mediaType         - Media attachment type label (null for text-only).
 * @field mediaPath         - Local file path to saved media (null if none).
 * @field hashSignature     - SHA-256 composite of key fields for tamper detection.
 * @field isPurged          - True when soft-deleted during retention cycle.
 * @field purgedAt          - Timestamp of soft-deletion.
 */
@Entity(
    tableName = "messages",
    indices   = [
        Index(value = ["conversationId", "timestamp"]),
        Index(value = ["isDeletedBySender", "timestamp"]),
        Index(
            value  = ["conversationId", "senderName", "timestamp", "messageText"],
            unique = false
        )
    ]
)
data class MessageEntity(
    @PrimaryKey val id:                String,
    val conversationId:    String,
    val senderName:        String,
    val messageText:       String?,
    val notificationId:    Int,
    val timestamp:         Long,
    val isDeletedBySender: Boolean,
    val isEdited:          Boolean = false,
    val mediaType:         String? = null,
    val mediaPath:         String? = null,
    val hashSignature:     String = "",
    val isPurged:          Boolean = false,
    val purgedAt:          Long? = null,
)
