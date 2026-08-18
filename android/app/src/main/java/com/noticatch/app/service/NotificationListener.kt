package com.noticatch.app.service

import android.app.Notification
import android.content.Intent
import android.os.Bundle
import android.os.Parcelable
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
import kotlinx.coroutines.launch
import java.util.UUID

/**
 * NotificationListener
 *
 * High-reliability Android NotificationListenerService for NotiCatch.
 * Implements multi-tier payload extraction supporting Android 10-14 MessagingStyle,
 * bundled notifications, big-text expansions, and multilingual deletion detection.
 *
 * Architecture: 100% on-device SQLite persistence via Room DB. Zero network access.
 */
class NotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG                   = "NotiCatchListener"
        private const val WHATSAPP_PKG          = "com.whatsapp"
        private const val WHATSAPP_BUSINESS_PKG  = "com.whatsapp.w4b"

        /** Broadcast action fired when a new message or deletion is captured. */
        const val ACTION_NEW_MESSAGE = "com.noticatch.app.NEW_MESSAGE"

        /** Extra keys for broadcast intent payload. */
        const val EXTRA_SENDER          = "sender"
        const val EXTRA_MESSAGE         = "message"
        const val EXTRA_CONVERSATION_ID = "conversationId"
        const val EXTRA_IS_DELETED      = "isDeleted"
        const val EXTRA_TIMESTAMP       = "timestamp"

        /* Multilingual deletion patterns */
        private val DELETION_PATTERNS = listOf(
            Regex("this message was deleted",       RegexOption.IGNORE_CASE),
            Regex("you deleted this message",       RegexOption.IGNORE_CASE),
            Regex("message deleted",                RegexOption.IGNORE_CASE),
            Regex("deleted this message",           RegexOption.IGNORE_CASE),
            Regex("deleted a message",              RegexOption.IGNORE_CASE),
            Regex("esta mensagem foi apagada",      RegexOption.IGNORE_CASE),
            Regex("este mensaje fue eliminado",     RegexOption.IGNORE_CASE),
            Regex("ce message a été supprimé",      RegexOption.IGNORE_CASE),
            Regex("diese nachricht wurde gelöscht", RegexOption.IGNORE_CASE),
            Regex("questa messaggio è stato eliminato", RegexOption.IGNORE_CASE),
            Regex("dit bericht is verwijderd",      RegexOption.IGNORE_CASE),
            Regex("यह संदेश हटा दिया गया"),
            Regex("تم حذف هذه الرسالة"),
            Regex("这个消息已被删除"),
        )

        /* OTP / automated verification spam filters */
        private val OTP_PATTERNS = listOf(
            Regex("\\b\\d{4,8}\\b.*\\b(code|otp)\\b", RegexOption.IGNORE_CASE),
            Regex("\\bverification code\\b",           RegexOption.IGNORE_CASE),
            Regex("\\bone.time.password\\b",           RegexOption.IGNORE_CASE),
        )

        const val PREF_SPAM_FILTER = "spam_filter_enabled"
        const val PREFS_NAME       = "noticatch_prefs"
    }

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var database: NotiCatchDatabase

    override fun onCreate() {
        super.onCreate()
        database = NotiCatchDatabase.getInstance(applicationContext)
        Log.d(TAG, "NotificationListener service instantiated.")
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "NotificationListener connected to Android notification subsystem.")
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "NotificationListener service destroyed.")
    }

    /**
     * onNotificationPosted
     *
     * Intercepts incoming notifications, performs multi-tier payload extraction,
     * checks for deletion signals, and persists to Room database.
     *
     * @param  sbn  - StatusBarNotification provided by Android OS.
     */
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val packageName = sbn.packageName ?: return

        if (packageName != WHATSAPP_PKG && packageName != WHATSAPP_BUSINESS_PKG) return

        val notification: Notification = sbn.notification ?: return
        val extras: Bundle             = notification.extras ?: return

        /* Multi-tier Title Extraction */
        val title = extractTitle(extras)

        /* Multi-tier Text Extraction (MessagingStyle, BigText, TextLines, Text) */
        val text = extractBodyText(extras)

        if (title.isBlank() && text.isBlank()) {
            Log.d(TAG, "Ignored empty notification payload: id=${sbn.id}")
            return
        }

        /* Check summary / group header notifications */
        if (text.matches(Regex("^\\d+\\s+new\\s+messages?$", RegexOption.IGNORE_CASE))) {
            Log.d(TAG, "Ignored summary notification count: $text")
            return
        }

        val timestamp      = sbn.postTime
        val notificationId = sbn.id
        val groupKey       = sbn.groupKey

        /* Deletion signal detection */
        val isDeletion = DELETION_PATTERNS.any { pattern ->
            pattern.containsMatchIn(text) || pattern.containsMatchIn(title)
        }

        /* Spam filter check */
        val spamFilterEnabled = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .getBoolean(PREF_SPAM_FILTER, true)
        if (spamFilterEnabled && !isDeletion && OTP_PATTERNS.any { it.containsMatchIn(text) }) {
            Log.d(TAG, "Suppressed OTP notification: sender=$title")
            return
        }

        serviceScope.launch {
            persistNotification(
                packageName    = packageName,
                senderName     = if (title.isNotBlank()) title else "WhatsApp Contact",
                messageText    = if (isDeletion) null else text,
                notificationId = notificationId,
                timestamp      = timestamp,
                isDeletion     = isDeletion,
                groupKey       = groupKey,
            )
        }
    }

    /**
     * extractTitle
     *
     * Resolves the sender or conversation title across Android notification fields.
     */
    private fun extractTitle(extras: Bundle): String {
        extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString()?.trim()?.let {
            if (it.isNotBlank()) return it
        }
        extras.getCharSequence(Notification.EXTRA_TITLE_BIG)?.toString()?.trim()?.let {
            if (it.isNotBlank()) return it
        }
        extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim()?.let {
            if (it.isNotBlank()) return it
        }
        return ""
    }

    /**
     * extractBodyText
     *
     * Recursively extracts notification message text from MessagingStyle Bundles,
     * BigText, TextLines, and standard Text fields.
     */
    private fun extractBodyText(extras: Bundle): String {
        /* 1. Android MessagingStyle EXTRA_MESSAGES parcelable array */
        val messages = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
        if (messages != null && messages.isNotEmpty()) {
            for (i in messages.indices.reversed()) {
                val item = messages[i]
                if (item is Bundle) {
                    val msgText = item.getCharSequence("text")?.toString()?.trim()
                    if (!msgText.isNullOrBlank()) {
                        return msgText
                    }
                }
            }
        }

        /* 2. EXTRA_BIG_TEXT */
        extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim()?.let {
            if (it.isNotBlank()) return it
        }

        /* 3. EXTRA_TEXT_LINES (multi-line bundled preview) */
        val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
        if (textLines != null && textLines.isNotEmpty()) {
            for (i in textLines.indices.reversed()) {
                val line = textLines[i]?.toString()?.trim()
                if (!line.isNullOrBlank()) {
                    return line
                }
            }
        }

        /* 4. Standard EXTRA_TEXT */
        extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim()?.let {
            if (it.isNotBlank()) return it
        }

        return ""
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val packageName = sbn.packageName ?: return
        if (packageName != WHATSAPP_PKG && packageName != WHATSAPP_BUSINESS_PKG) return
        Log.d(TAG, "WhatsApp notification dismissed: id=${sbn.id}")
    }

    /**
     * persistNotification
     *
     * Inserts or updates ConversationEntity and MessageEntity in Room database,
     * with 72-hour sliding window deletion recovery.
     */
    private suspend fun persistNotification(
        packageName:    String,
        senderName:     String,
        messageText:    String?,
        notificationId: Int,
        timestamp:      Long,
        isDeletion:     Boolean,
        groupKey:       String?,
    ) {
        val conversationKey = groupKey ?: "${packageName}_${senderName}"

        /* Resolve or create conversation */
        var conversation = database.conversationDao().findByKey(conversationKey)
        if (conversation == null) {
            conversation = ConversationEntity(
                id                   = UUID.randomUUID().toString(),
                conversationKey      = conversationKey,
                chatTitle            = senderName,
                isGroup              = groupKey?.endsWith("@g.us") ?: false,
                unreadCount          = 1,
                lastMessageTimestamp = timestamp,
                deletedCount         = if (isDeletion) 1 else 0,
            )
            database.conversationDao().insert(conversation)
        } else {
            database.conversationDao().update(
                conversation.copy(
                    lastMessageTimestamp = timestamp,
                    unreadCount          = conversation.unreadCount + 1,
                    deletedCount         = if (isDeletion) conversation.deletedCount + 1 else conversation.deletedCount,
                )
            )
        }

        /* Deletion signal processing */
        if (isDeletion) {
            /* 1. Primary lookup: matching sender within 72h */
            var existing = database.messageDao()
                .findRecentBySender(conversation.id, senderName, timestamp)

            /* 2. Fallback lookup: most recent non-deleted message in conversation within 72h */
            if (existing == null) {
                existing = database.messageDao()
                    .findRecentInConversation(conversation.id, timestamp)
            }

            if (existing != null) {
                database.messageDao().update(existing.copy(isDeletedBySender = true))
                Log.d(TAG, "Successfully marked existing message as deleted: id=${existing.id}, sender=${existing.senderName}")
                broadcastNewMessage(existing.senderName, existing.messageText, conversation.id, true, timestamp)
                return
            } else {
                Log.d(TAG, "Deletion signal received but no prior message found in 72h window for conversation=${conversation.id}")
            }
        }

        /* Standard message insertion */
        if (!isDeletion && !messageText.isNullOrBlank()) {
            val message = MessageEntity(
                id                = UUID.randomUUID().toString(),
                conversationId    = conversation.id,
                senderName        = senderName,
                messageText       = messageText,
                notificationId    = notificationId,
                timestamp         = timestamp,
                isDeletedBySender = false,
                isEdited          = false,
                mediaType         = null,
                mediaPath         = null,
                hashSignature     = "${conversation.id}|${senderName}|${timestamp}|${messageText}",
            )
            database.messageDao().insert(message)

            Log.d(TAG, "Persisted message: sender=$senderName, len=${messageText.length}")
            broadcastNewMessage(senderName, messageText, conversation.id, false, timestamp)
        }
    }

    /**
     * broadcastNewMessage
     *
     * Sends local broadcast so MessageBridgePlugin can relay live updates to React WebView.
     */
    private fun broadcastNewMessage(
        senderName:     String,
        messageText:    String?,
        conversationId: String,
        isDeleted:      Boolean,
        timestamp:      Long,
    ) {
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
