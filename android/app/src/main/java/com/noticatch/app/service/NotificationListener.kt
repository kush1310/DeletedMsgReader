package com.noticatch.app.service

import android.app.Notification
import android.content.Intent
import android.os.Bundle
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
 * Android NotificationListenerService for NotiCatch.
 * Intercepts incoming WhatsApp notifications (com.whatsapp and com.whatsapp.w4b),
 * extracts message content before deletion, classifies the notification type
 * (user message vs deletion signal), and persists records to the Room database.
 * Broadcasts a local intent so the Capacitor WebView layer receives live updates.
 *
 * Architecture: air-gapped local-only. Zero network access.
 */
class NotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG                  = "NotiCatchListener"
        private const val WHATSAPP_PKG         = "com.whatsapp"
        private const val WHATSAPP_BUSINESS_PKG = "com.whatsapp.w4b"

        /** Broadcast action fired when a new message or deletion is captured. */
        const val ACTION_NEW_MESSAGE = "com.noticatch.app.NEW_MESSAGE"

        /** Extra keys for broadcast intent payload. */
        const val EXTRA_SENDER          = "sender"
        const val EXTRA_MESSAGE         = "message"
        const val EXTRA_CONVERSATION_ID = "conversationId"
        const val EXTRA_IS_DELETED      = "isDeleted"
        const val EXTRA_TIMESTAMP       = "timestamp"

        /* Deletion signal patterns — mirrors ClassificationEngine.ts */
        private val DELETION_PATTERNS = listOf(
            Regex("this message was deleted",       RegexOption.IGNORE_CASE),
            Regex("you deleted this message",       RegexOption.IGNORE_CASE),
            Regex("message deleted",                RegexOption.IGNORE_CASE),
            Regex("esta mensagem foi apagada",      RegexOption.IGNORE_CASE),
            Regex("este mensaje fue eliminado",     RegexOption.IGNORE_CASE),
            Regex("ce message a été supprimé",      RegexOption.IGNORE_CASE),
            Regex("diese nachricht wurde gelöscht", RegexOption.IGNORE_CASE),
            Regex("यह संदेश हटा दिया गया"),
            Regex("تم حذف هذه الرسالة"),
        )

        /* OTP/spam patterns — suppressed when spam filter is enabled */
        private val OTP_PATTERNS = listOf(
            Regex("\\b\\d{4,8}\\b.*\\bcode\\b",    RegexOption.IGNORE_CASE),
            Regex("\\bverification code\\b",        RegexOption.IGNORE_CASE),
            Regex("\\botp\\b",                      RegexOption.IGNORE_CASE),
            Regex("\\bone.time\\b",                 RegexOption.IGNORE_CASE),
            Regex("\\bpassword.*\\d{4,8}",          RegexOption.IGNORE_CASE),
        )

        /* Shared preferences key for spam filter state */
        const val PREF_SPAM_FILTER = "spam_filter_enabled"
        const val PREFS_NAME       = "noticatch_prefs"
    }

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var database: NotiCatchDatabase

    override fun onCreate() {
        super.onCreate()
        database = NotiCatchDatabase.getInstance(applicationContext)
        Log.d(TAG, "NotificationListener service created.")
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "NotificationListener service destroyed.")
    }

    /**
     * onNotificationPosted
     *
     * Fires when any notification is posted to the status bar.
     * Filters to WhatsApp packages only, extracts content, classifies,
     * applies spam filter, then persists to Room DB and broadcasts to WebView.
     *
     * @param  sbn  - StatusBarNotification posted by Android system.
     * @validates   - Package whitelist, blank title/text rejection, OTP spam gate.
     * @edge-cases  - Null SBN or notification extras are silently skipped.
     */
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val packageName = sbn.packageName ?: return

        if (packageName != WHATSAPP_PKG && packageName != WHATSAPP_BUSINESS_PKG) return

        val notification: Notification = sbn.notification ?: return
        val extras: Bundle             = notification.extras ?: return

        val title   = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
        val text    = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim()  ?: ""
        val groupKey = sbn.groupKey

        if (title.isBlank() && text.isBlank()) return

        val timestamp      = sbn.postTime
        val notificationId = sbn.id
        val isDeletion     = DELETION_PATTERNS.any { pattern -> pattern.containsMatchIn(text) }

        /* Spam filter gate — reject OTP messages if filter is enabled */
        val spamFilterEnabled = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .getBoolean(PREF_SPAM_FILTER, true)
        if (spamFilterEnabled && !isDeletion && OTP_PATTERNS.any { it.containsMatchIn(text) }) {
            Log.d(TAG, "OTP/spam notification suppressed for sender: $title")
            return
        }

        serviceScope.launch {
            persistNotification(
                packageName    = packageName,
                senderName     = title,
                messageText    = if (isDeletion) null else text,
                notificationId = notificationId,
                timestamp      = timestamp,
                isDeletion     = isDeletion,
                groupKey       = groupKey,
            )
        }
    }

    /**
     * onNotificationRemoved
     *
     * Fires when a notification is dismissed or removed.
     * If the removal corresponds to a WhatsApp deletion signal, the
     * matching stored message is flagged as deleted by sender.
     *
     * @param  sbn  - Removed StatusBarNotification.
     */
    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val packageName = sbn.packageName ?: return
        if (packageName != WHATSAPP_PKG && packageName != WHATSAPP_BUSINESS_PKG) return
        Log.d(TAG, "WhatsApp notification removed: id=${sbn.id}")
    }

    /**
     * persistNotification
     *
     * Performs Room DB upsert for a captured notification event.
     * Resolves or creates the parent Conversation, then inserts the Message record.
     * Broadcasts ACTION_NEW_MESSAGE on completion for WebView real-time update.
     *
     * @param  packageName     - Source package identifier.
     * @param  senderName      - Notification title (contact or group name).
     * @param  messageText     - Notification body text; null if deletion signal.
     * @param  notificationId  - Android system notification ID.
     * @param  timestamp       - Unix epoch ms of notification receipt.
     * @param  isDeletion      - True if deletion pattern matched.
     * @param  groupKey        - Notification group key for conversation grouping.
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

        /* If this is a deletion signal, mark existing message deleted */
        if (isDeletion) {
            val existing = database.messageDao()
                .findRecentBySender(conversation.id, senderName, timestamp)
            if (existing != null) {
                database.messageDao().update(existing.copy(isDeletedBySender = true))
                Log.d(TAG, "Marked message as deleted: sender=$senderName")
                broadcastNewMessage(senderName, null, conversation.id, true, timestamp)
                return
            }
        }

        /* Insert new message record */
        val message = MessageEntity(
            id                = UUID.randomUUID().toString(),
            conversationId    = conversation.id,
            senderName        = senderName,
            messageText       = messageText,
            notificationId    = notificationId,
            timestamp         = timestamp,
            isDeletedBySender = isDeletion,
            isEdited          = false,
            mediaType         = null,
            mediaPath         = null,
            hashSignature     = "${conversation.id}|${senderName}|${timestamp}|${messageText ?: ""}",
        )
        database.messageDao().insert(message)

        Log.d(TAG, "Persisted message: sender=$senderName, deleted=$isDeletion, len=${messageText?.length ?: 0}")
        broadcastNewMessage(senderName, messageText, conversation.id, isDeletion, timestamp)
    }

    /**
     * broadcastNewMessage
     *
     * Fires a LocalBroadcast intent so the Capacitor WebView layer
     * can dispatch a JS CustomEvent and trigger real-time UI refresh.
     *
     * @param  senderName       - Display name of message sender.
     * @param  messageText      - Message body text or null for deletions.
     * @param  conversationId   - Parent conversation UUID.
     * @param  isDeleted        - True if this is a deletion event.
     * @param  timestamp        - Unix epoch ms.
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
