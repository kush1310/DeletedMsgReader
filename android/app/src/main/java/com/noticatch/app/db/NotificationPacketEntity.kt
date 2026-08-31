package com.noticatch.app.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Index

/**
 * NotificationPacketEntity
 *
 * Deep Wireshark-style notification telemetry log entity for SpectralVault.
 * Retains raw incoming status bar notification packets partitioned into 2-hour time slots.
 *
 * @field id                - Unique UUIDv4 packet identifier.
 * @field packageName       - Originating Android package name.
 * @field channelId         - Android notification channel identifier.
 * @field notificationId    - Android status bar notification ID.
 * @field postTime          - Epoch millisecond timestamp of notification post.
 * @field rawTitle          - Raw un-parsed title string.
 * @field rawText           - Raw un-parsed message body.
 * @field extrasJson        - Serialized JSON representation of notification extras bundle.
 * @field timeSlot          - 2-hour time slot key (e.g. "12:00 AM - 02:00 AM").
 * @field isRevocation      - True if packet triggered a message deletion.
 * @field isSelfReply       - True if packet originated from user's Quick-Reply.
 * @field parsedSender      - Extracted sender display name.
 * @field parsedChatTitle   - Extracted conversation / group title.
 */
@Entity(
    tableName = "notification_packets",
    indices = [
        Index(value = ["timeSlot", "postTime"]),
        Index(value = ["packageName", "postTime"]),
        Index(value = ["isRevocation", "postTime"]),
        Index(value = ["postTime"])
    ]
)
data class NotificationPacketEntity(
    @PrimaryKey val id:      String,
    val packageName:         String,
    val channelId:           String?,
    val notificationId:      Int,
    val postTime:            Long,
    val rawTitle:            String?,
    val rawText:             String?,
    val extrasJson:          String,
    val timeSlot:            String,
    val isRevocation:        Boolean,
    val isSelfReply:         Boolean,
    val parsedSender:        String?,
    val parsedChatTitle:     String?,
)
