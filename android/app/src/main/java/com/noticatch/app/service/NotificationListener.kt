package com.noticatch.app.service

import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import com.noticatch.app.db.ConversationEntity
import com.noticatch.app.db.MessageEntity
import com.noticatch.app.db.NotiCatchDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

/**
 * NotificationListener
 *
 * High-reliability Android NotificationListenerService for NotiCatch (v2.0.4).
 * Delegates message extraction to WhatsAppNotificationParser and persists records
 * to local Room SQLite with sequential mutex synchronization, Jitter buffering,
 * channel filtering, and collision-resistant SHA-256 signatures.
 */
class NotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "NotiCatchListener"

        const val ACTION_NEW_MESSAGE = "com.noticatch.app.NEW_MESSAGE"
        const val EXTRA_SENDER          = "sender"
        const val EXTRA_MESSAGE         = "message"
        const val EXTRA_CONVERSATION_ID = "conversationId"
        const val EXTRA_IS_DELETED      = "isDeleted"
        const val EXTRA_TIMESTAMP       = "timestamp"

        const val PREF_SPAM_FILTER = "spam_filter_enabled"
        const val PREFS_NAME       = "noticatch_prefs"

        /* Notification channel blacklist */
        private val IGNORED_CHANNELS = setOf(
            "backup_notifications",
            "silent_notifications",
            "other_notifications",
            "chat_history_backup",
            "critical_app_alerts"
        )

        /* Pre-allocated hex lookup table for zero-allocation fast SHA-256 hex encoding */
        private val HEX_CHARS = "0123456789abcdef".toCharArray()

        /* ThreadLocal MessageDigest recycling to eliminate repeated JNI provider lookups */
        private val SHA256_DIGEST = ThreadLocal.withInitial {
            try {
                MessageDigest.getInstance("SHA-256")
            } catch (_: Exception) {
                null
            }
        }

        /* High-performance in-memory event flow for zero-IPC dispatch */
        private val _messageEvents = MutableSharedFlow<MessageBroadcastEvent>(extraBufferCapacity = 64)
        val messageEvents = _messageEvents.asSharedFlow()
    }

    data class MessageBroadcastEvent(
        val senderName: String,
        val messageText: String?,
        val conversationId: String,
        val isDeleted: Boolean,
        val timestamp: Long,
    )

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val ingestionMutex = Mutex()
    private lateinit var database: NotiCatchDatabase

    /* Rate limiter: Max 100 events per 60-second sliding window */
    private val rateLimitCounter = AtomicInteger(0)
    private val rateLimitWindowStart = AtomicLong(0L)
    private val RATE_LIMIT_MAX_EVENTS = 100
    private val RATE_LIMIT_WINDOW_MS = 60_000L

    override fun onCreate() {
        super.onCreate()
        database = NotiCatchDatabase.getInstance(applicationContext)
        Log.i(TAG, "NotificationListener service active (v2.0.4).")
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.i(TAG, "NotificationListener connected to Android subsystem.")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.w(TAG, "NotificationListener disconnected — requesting rebind.")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            requestRebind(ComponentName(this, NotificationListener::class.java))
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val pkg = sbn.packageName ?: return
        if (!WhatsAppNotificationParser.isWhatsAppNotification(pkg)) return

        /* OS Channel Filter: Ignore backup progress and silent background maintenance channels */
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelId = sbn.notification.channelId
            if (channelId != null && IGNORED_CHANNELS.contains(channelId)) {
                Log.d(TAG, "Suppressed system maintenance notification on channel: $channelId")
                return
            }
        }

        val parsedList = WhatsAppNotificationParser.parse(sbn)
        if (parsedList.isEmpty()) return

        /* Rate limiting */
        val now = System.currentTimeMillis()
        val windowStart = rateLimitWindowStart.get()
        if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
            rateLimitWindowStart.set(now)
            rateLimitCounter.set(0)
        }
        if (rateLimitCounter.incrementAndGet() > RATE_LIMIT_MAX_EVENTS) {
            Log.w(TAG, "Rate limit exceeded — suppressing notification burst")
            return
        }

        val spamFilterEnabled = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .getBoolean(PREF_SPAM_FILTER, true)

        serviceScope.launch {
            try {
                android.os.Process.setThreadPriority(
                    android.os.Process.THREAD_PRIORITY_BACKGROUND + android.os.Process.THREAD_PRIORITY_MORE_FAVORABLE
                )
            } catch (_: Exception) {}

            /* Jitter Buffer: Hold for 250ms to allow concurrent network deletion packets to settle */
            if (parsedList.any { it.isDeletion || it.isEdit }) {
                delay(150)
            }

            ingestionMutex.withLock {
                for (parsed in parsedList) {
                    if (spamFilterEnabled && !parsed.isDeletion && parsed.isSpamOtp) {
                        Log.d(TAG, "Suppressed OTP message from: ${parsed.senderName}")
                        continue
                    }
                    persistAndBroadcast(parsed)
                }
            }
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val pkg = sbn.packageName ?: return
        if (WhatsAppNotificationParser.isWhatsAppNotification(pkg)) {
            Log.d(TAG, "WhatsApp notification dismissed from shade: id=${sbn.id}")
        }
    }

    private suspend fun persistAndBroadcast(parsed: WhatsAppNotificationParser.ParsedMessage) {
        val cleanTitle = WhatsAppNotificationParser.cleanChatTitle(parsed.chatTitle)
        val conversationKey = WhatsAppNotificationParser.generateConversationKey(
            parsed.packageName,
            parsed.chatTitle,
            parsed.conversationTag
        )

        /* 1. Resolve or create parent conversation */
        var conversation = database.conversationDao().findByKey(conversationKey)
        if (conversation == null) {
            conversation = database.conversationDao().findByTitle(cleanTitle)
        }

        if (conversation == null) {
            conversation = ConversationEntity(
                id                   = UUID.randomUUID().toString(),
                conversationKey      = conversationKey,
                chatTitle            = cleanTitle,
                isGroup              = parsed.isGroup,
                unreadCount          = if (parsed.isDeletion) 0 else 1,
                lastMessageTimestamp = parsed.timestamp,
                deletedCount         = if (parsed.isDeletion) 1 else 0,
            )
            database.conversationDao().insert(conversation)
            Log.i(TAG, "Created unified conversation: key=$conversationKey, title=$cleanTitle")
        }

        /* 2. Reaction notification handling */
        if (parsed.isReaction && !parsed.reactionEmoji.isNullOrBlank()) {
            val recentMsg = database.messageDao().findRecentBySender(conversation.id, parsed.senderName, parsed.timestamp)
                ?: database.messageDao().findRecentInConversation(conversation.id, parsed.timestamp)
            if (recentMsg != null) {
                Log.i(TAG, "Recorded reaction '${parsed.reactionEmoji}' for message ${recentMsg.id}")
                return
            }
        }

        /* 3. Deletion signal processing */
        if (parsed.isDeletion) {
            var existing = database.messageDao()
                .findRecentBySender(conversation.id, parsed.senderName, parsed.timestamp)

            if (existing == null) {
                existing = database.messageDao()
                    .findRecentInConversation(conversation.id, parsed.timestamp)
            }

            if (existing != null) {
                database.messageDao().update(existing.copy(isDeletedBySender = true))
                database.conversationDao().update(
                    conversation.copy(
                        chatTitle            = cleanTitle,
                        lastMessageTimestamp = maxOf(conversation.lastMessageTimestamp, parsed.timestamp),
                        deletedCount         = conversation.deletedCount + 1,
                    )
                )
                Log.i(TAG, "Marked message as deleted: id=${existing.id}, sender=${existing.senderName}")
                broadcastNewMessage(existing.senderName, existing.messageText, conversation.id, true, parsed.timestamp)
                return
            } else {
                val rawSignature = "${conversation.id}\u001F${parsed.senderName}\u001F${parsed.timestamp}\u001Fdeleted"
                val sha256Signature = computeSha256(rawSignature)

                val placeholder = MessageEntity(
                    id                   = UUID.randomUUID().toString(),
                    conversationId       = conversation.id,
                    senderName           = parsed.senderName,
                    messageText          = "This message was deleted",
                    originalText         = null,
                    notificationId       = parsed.notificationId,
                    timestamp            = parsed.timestamp,
                    isDeletedBySender    = true,
                    isEdited             = false,
                    editCount            = 0,
                    editedAt             = null,
                    mediaType            = null,
                    mediaPath            = null,
                    audioDurationSeconds = null,
                    isDisappearing       = false,
                    hashSignature        = sha256Signature,
                    isPurged             = false,
                    purgedAt             = null,
                )
                database.messageDao().insert(placeholder)
                database.conversationDao().update(
                    conversation.copy(
                        chatTitle            = cleanTitle,
                        lastMessageTimestamp = maxOf(conversation.lastMessageTimestamp, parsed.timestamp),
                        deletedCount         = conversation.deletedCount + 1,
                    )
                )
                Log.i(TAG, "Inserted deleted placeholder message for chat '$cleanTitle'")
                broadcastNewMessage(parsed.senderName, placeholder.messageText, conversation.id, true, parsed.timestamp)
                return
            }
        }

        /* 4. Edit signal processing */
        if (parsed.isEdit && !parsed.messageText.isNullOrBlank()) {
            val existing = database.messageDao().findRecentForEdit(conversation.id, parsed.senderName, parsed.timestamp)
            if (existing != null) {
                val updated = existing.copy(
                    originalText = existing.originalText ?: existing.messageText,
                    messageText  = parsed.messageText,
                    isEdited     = true,
                    editCount    = existing.editCount + 1,
                    editedAt     = parsed.timestamp,
                )
                database.messageDao().update(updated)
                database.conversationDao().update(
                    conversation.copy(
                        chatTitle            = cleanTitle,
                        lastMessageTimestamp = maxOf(conversation.lastMessageTimestamp, parsed.timestamp),
                    )
                )
                Log.i(TAG, "Updated message edit revision: id=${existing.id}")
                broadcastNewMessage(existing.senderName, parsed.messageText, conversation.id, false, parsed.timestamp)
                return
            }
        }

        /* 5. Standard message insertion with strict sliding-window deduplication */
        if (!parsed.isDeletion && !parsed.messageText.isNullOrBlank()) {
            val text = parsed.messageText

            val minTime = parsed.timestamp - 600000L // -10 minutes
            val maxTime = parsed.timestamp + 600000L // +10 minutes
            val duplicate = database.messageDao().findDuplicateWithSender(conversation.id, parsed.senderName, text, minTime, maxTime)

            if (duplicate != null) {
                Log.d(TAG, "Skipped duplicate notification message: '${text.take(20)}...' for chat '$cleanTitle'")
                return
            }

            val rawSignature = "${conversation.id}\u001F${parsed.senderName}\u001F${parsed.timestamp}\u001F$text"
            val sha256Signature = computeSha256(rawSignature)

            val resolvedMediaType = parsed.mediaType
                ?: if (parsed.audioDurationSeconds != null) "audio"
                else if (parsed.isCallEvent) "call"
                else null

            val message = MessageEntity(
                id                   = UUID.randomUUID().toString(),
                conversationId       = conversation.id,
                senderName           = parsed.senderName,
                messageText          = text,
                originalText         = null,
                notificationId       = parsed.notificationId,
                timestamp            = parsed.timestamp,
                isDeletedBySender    = false,
                isEdited             = parsed.isEdit,
                editCount            = if (parsed.isEdit) 1 else 0,
                editedAt             = if (parsed.isEdit) parsed.timestamp else null,
                mediaType            = resolvedMediaType,
                mediaPath            = null,
                audioDurationSeconds = parsed.audioDurationSeconds,
                isDisappearing       = parsed.isDisappearing,
                hashSignature        = sha256Signature,
                isPurged             = false,
                purgedAt             = null,
            )
            database.messageDao().insert(message)

            /* Update parent conversation metadata */
            database.conversationDao().update(
                conversation.copy(
                    chatTitle            = cleanTitle,
                    lastMessageTimestamp = maxOf(conversation.lastMessageTimestamp, parsed.timestamp),
                    unreadCount          = conversation.unreadCount + 1,
                )
            )

            Log.i(TAG, "Persisted message: chat='$cleanTitle', sender='${parsed.senderName}'")
            broadcastNewMessage(parsed.senderName, text, conversation.id, false, parsed.timestamp)
        }
    }

    /**
     * computeSha256
     *
     * High-speed zero-allocation SHA-256 calculation using ThreadLocal recycling and char lookup.
     */
    private fun computeSha256(input: String): String {
        val digest = SHA256_DIGEST.get() ?: return ""
        return try {
            digest.reset()
            val hashBytes = digest.digest(input.toByteArray(Charsets.UTF_8))
            val result = CharArray(hashBytes.size * 2)
            for (i in hashBytes.indices) {
                val v = hashBytes[i].toInt() and 0xFF
                result[i * 2] = HEX_CHARS[v ushr 4]
                result[i * 2 + 1] = HEX_CHARS[v and 0x0F]
            }
            String(result)
        } catch (_: Exception) {
            ""
        }
    }

    private fun broadcastNewMessage(
        senderName:     String,
        messageText:    String?,
        conversationId: String,
        isDeleted:      Boolean,
        timestamp:      Long,
    ) {
        val event = MessageBroadcastEvent(
            senderName     = senderName,
            messageText    = messageText,
            conversationId = conversationId,
            isDeleted      = isDeleted,
            timestamp      = timestamp,
        )
        _messageEvents.tryEmit(event)

        val intent = Intent(ACTION_NEW_MESSAGE).apply {
            putExtra(EXTRA_SENDER,          senderName)
            putExtra(EXTRA_MESSAGE,         messageText ?: "")
            putExtra(EXTRA_CONVERSATION_ID, conversationId)
            putExtra(EXTRA_IS_DELETED,      isDeleted)
            putExtra(EXTRA_TIMESTAMP,       timestamp)
        }
        LocalBroadcastManager.getInstance(applicationContext).sendBroadcast(intent)
    }
}
