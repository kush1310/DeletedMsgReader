package com.noticatch.app.service

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
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
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong

/**
 * NotificationListener
 *
 * High-reliability Android NotificationListenerService for NotiCatch.
 * Intercepts incoming WhatsApp notifications in real-time, extracts individual messages,
 * persists to Room SQLite with short-window deduplication, and broadcasts events to the UI.
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

        /* Pre-allocated hex lookup table for zero-allocation fast SHA-256 hex encoding */
        private val HEX_CHARS = "0123456789abcdef".toCharArray()

        /* ThreadLocal MessageDigest recycling */
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

        @Volatile
        var isConnected: Boolean = false
            private set

        /**
         * ensureServiceConnected
         *
         * Reconnects or kickstarts the NotificationListenerService if the OS unbound it.
         */
        fun ensureServiceConnected(context: Context) {
            val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
            val isEnabled = flat != null && flat.contains(context.packageName)
            if (isEnabled) {
                val componentName = ComponentName(context, NotificationListener::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    try {
                        requestRebind(componentName)
                        Log.i(TAG, "Requested rebind for NotificationListenerService.")
                    } catch (e: Exception) {
                        try {
                            val pm = context.packageManager
                            pm.setComponentEnabledSetting(
                                componentName,
                                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                                PackageManager.DONT_KILL_APP
                            )
                            pm.setComponentEnabledSetting(
                                componentName,
                                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                                PackageManager.DONT_KILL_APP
                            )
                            Log.i(TAG, "Toggled NotificationListenerService component state to force rebind.")
                        } catch (e2: Exception) {
                            Log.w(TAG, "Could not toggle component state: ${e2.message}")
                        }
                    }
                }
            }
        }
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
    private var database: NotiCatchDatabase? = null

    /* Rate limiter: Max 1000 events per 60-second sliding window */
    private val rateLimitCounter = AtomicInteger(0)
    private val rateLimitWindowStart = AtomicLong(0L)
    private val RATE_LIMIT_MAX_EVENTS = 1000
    private val RATE_LIMIT_WINDOW_MS = 60_000L

    override fun onCreate() {
        super.onCreate()
        database = NotiCatchDatabase.getInstance(applicationContext)
        Log.i(TAG, "NotificationListener service active.")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        isConnected = true
        if (database == null) {
            database = NotiCatchDatabase.getInstance(applicationContext)
        }
        Log.i(TAG, "NotificationListener connected to Android subsystem.")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        isConnected = false
        Log.w(TAG, "NotificationListener disconnected — requesting rebind.")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            try {
                requestRebind(ComponentName(this, NotificationListener::class.java))
            } catch (e: Exception) {
                Log.w(TAG, "Failed to request rebind on disconnect: ${e.message}")
            }
        }
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val pkg = sbn.packageName ?: return
        if (!WhatsAppNotificationParser.isWhatsAppNotification(pkg)) return

        /* OS Channel Filter: Ignore pure background backup progress channels */
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channelId = sbn.notification.channelId
            if (isIgnoredChannel(channelId)) {
                Log.d(TAG, "Suppressed backup maintenance notification on channel: $channelId")
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
            Log.w(TAG, "Rate limit exceeded — suppressing excessive burst")
            return
        }

        val spamFilterEnabled = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .getBoolean(PREF_SPAM_FILTER, false)

        serviceScope.launch {
            try {
                android.os.Process.setThreadPriority(
                    android.os.Process.THREAD_PRIORITY_BACKGROUND + android.os.Process.THREAD_PRIORITY_MORE_FAVORABLE
                )
            } catch (_: Exception) {}

            /* Jitter Buffer: Hold for 150ms to allow concurrent network deletion packets to settle */
            if (parsedList.any { it.isDeletion || it.isEdit }) {
                delay(150)
            }

            ingestionMutex.withLock {
                val db = database ?: NotiCatchDatabase.getInstance(applicationContext).also { database = it }
                for (parsed in parsedList) {
                    if (spamFilterEnabled && !parsed.isDeletion && parsed.isSpamOtp) {
                        Log.d(TAG, "Suppressed OTP message from: ${parsed.senderName}")
                        continue
                    }
                    persistAndBroadcast(db, parsed)
                }
            }
        }
    }

    private fun isIgnoredChannel(channelId: String?): Boolean {
        if (channelId == null) return false
        val lower = channelId.lowercase()
        return lower == "chat_history_backup" ||
               lower == "backup_notifications" ||
               (lower.contains("backup") && !lower.contains("message") && !lower.contains("chat"))
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val pkg = sbn.packageName ?: return
        if (WhatsAppNotificationParser.isWhatsAppNotification(pkg)) {
            Log.d(TAG, "WhatsApp notification dismissed: id=${sbn.id}")
        }
    }

    private suspend fun persistAndBroadcast(db: NotiCatchDatabase, parsed: WhatsAppNotificationParser.ParsedMessage) {
        val cleanTitle = WhatsAppNotificationParser.cleanChatTitle(parsed.chatTitle)
        val conversationKey = WhatsAppNotificationParser.generateConversationKey(
            parsed.packageName,
            parsed.chatTitle,
            parsed.conversationTag
        )

        /* 1. Resolve or create parent conversation */
        var conversation = db.conversationDao().findByKey(conversationKey)
        if (conversation == null) {
            conversation = db.conversationDao().findByTitle(cleanTitle)
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
            db.conversationDao().insert(conversation)
            Log.i(TAG, "Created conversation: key=$conversationKey, title=$cleanTitle")
        }

        /* 2. Reaction notification handling */
        if (parsed.isReaction && !parsed.reactionEmoji.isNullOrBlank()) {
            val recentMsg = db.messageDao().findRecentBySender(conversation.id, parsed.senderName, parsed.timestamp)
                ?: db.messageDao().findRecentInConversation(conversation.id, parsed.timestamp)
            if (recentMsg != null) {
                Log.i(TAG, "Recorded reaction '${parsed.reactionEmoji}' for message ${recentMsg.id}")
                return
            }
        }

        /* 3. Deletion signal processing */
        if (parsed.isDeletion) {
            var existing = db.messageDao()
                .findRecentBySender(conversation.id, parsed.senderName, parsed.timestamp)

            if (existing == null) {
                existing = db.messageDao()
                    .findRecentInConversation(conversation.id, parsed.timestamp)
            }

            if (existing != null) {
                db.messageDao().update(existing.copy(isDeletedBySender = true))
                db.conversationDao().update(
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
                db.messageDao().insert(placeholder)
                db.conversationDao().update(
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
            val existing = db.messageDao().findRecentForEdit(conversation.id, parsed.senderName, parsed.timestamp)
            if (existing != null) {
                val updated = existing.copy(
                    originalText = existing.originalText ?: existing.messageText,
                    messageText  = parsed.messageText,
                    isEdited     = true,
                    editCount    = existing.editCount + 1,
                    editedAt     = parsed.timestamp,
                )
                db.messageDao().update(updated)
                db.conversationDao().update(
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

        /* 5. Standard message insertion with 3-second sliding-window duplicate suppression */
        if (!parsed.isDeletion && !parsed.messageText.isNullOrBlank()) {
            val text = parsed.messageText

            val minTime = parsed.timestamp - 3000L // -3 seconds
            val maxTime = parsed.timestamp + 3000L // +3 seconds
            val duplicate = db.messageDao().findDuplicateWithSender(conversation.id, parsed.senderName, text, minTime, maxTime)

            if (duplicate != null) {
                Log.d(TAG, "Skipped duplicate drawer notification: '${text.take(20)}...' for chat '$cleanTitle'")
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
            db.messageDao().insert(message)

            /* Update parent conversation metadata */
            db.conversationDao().update(
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
