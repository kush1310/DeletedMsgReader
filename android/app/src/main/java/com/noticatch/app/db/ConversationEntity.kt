package com.noticatch.app.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Index

/**
 * ConversationEntity
 *
 * Room database entity representing a WhatsApp conversation thread.
 * Uniquely identified by conversationKey which is derived from the
 * notification group key (for groups) or package+senderName (for DMs).
 *
 * @field id                   - UUIDv4 primary key.
 * @field conversationKey      - Unique composite key derived at capture time.
 * @field chatTitle            - Display name (contact name or group name).
 * @field isGroup              - True if the conversation key ends with "@g.us".
 * @field unreadCount          - Incremented on each captured message.
 * @field lastMessageTimestamp - Unix epoch ms of most recently captured message.
 * @field deletedCount         - Count of deletion signals captured in this thread.
 */
@Entity(
    tableName = "conversations",
    indices   = [Index(value = ["conversationKey"], unique = true)]
)
data class ConversationEntity(
    @PrimaryKey val id:                   String,
    val conversationKey:      String,
    val chatTitle:            String,
    val isGroup:              Boolean,
    val unreadCount:          Int,
    val lastMessageTimestamp: Long,
    val deletedCount:         Int,
)
