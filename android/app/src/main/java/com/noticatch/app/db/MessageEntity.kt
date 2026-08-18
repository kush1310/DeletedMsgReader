package com.noticatch.app.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Index

/**
 * MessageEntity
 *
 * Room database entity for a single captured WhatsApp notification.
 * Maps one-to-one with the TypeScript Message interface.
 * Indexed on conversationId for fast per-conversation queries and
 * on isDeletedBySender for fast deleted-messages page queries.
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
 */
@Entity(
    tableName = "messages",
    indices   = [
        Index(value = ["conversationId"]),
        Index(value = ["isDeletedBySender"]),
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
    val isEdited:          Boolean,
    val mediaType:         String?,
    val mediaPath:         String?,
    val hashSignature:     String,
)
