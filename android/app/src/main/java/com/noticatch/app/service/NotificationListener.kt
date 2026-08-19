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
import kotlinx.coroutines.launch
import java.security.MessageDigest
import java.util.UUID

/**
 * NotificationListener
 *
 * High-reliability Android NotificationListenerService for NotiCatch.
 * Delegates message extraction to WhatsAppNotificationParser and persists records
 * to local Room SQLite with SHA-256 integrity signatures.
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
    }

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var database: NotiCatchDatabase

    override fun onCreate() {
        super.onCreate()
        database = NotiCatchDatabase.getInstance(applicationContext)
        Log.i(TAG, "NotificationListener service active.")
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
        val parsedList = WhatsAppNotificationParser.parse(sbn)
        if (parsedList.isEmpty()) return

        val spamFilterEnabled = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
            .getBoolean(PREF_SPAM_FILTER, true)

        for (parsed in parsedList) {
            if (spamFilterEnabled && !parsed.isDeletion && parsed.isSpamOtp) {
                Log.d(TAG, "Suppressed OTP message from: ${parsed.senderName}")
                continue
            }

            serviceScope.launch {
                persistAndBroadcast(parsed)
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
        val normalizedTitle = parsed.chatTitle.trim().lowercase()
        val conversationKey = if (parsed.isGroup) {
            "group_${parsed.packageName}_$normalizedTitle"
        } else {
            "direct_${parsed.packageName}_$normalizedTitle"
        }

        /* 1. Resolve or create parent conversation */
        var conversation = database.conversationDao().findByKey(conversationKey)
        if (conversation == null) {
            conversation = ConversationEntity(
                id                   = UUID.randomUUID().toString(),
                conversationKey      = conversationKey,
                chatTitle            = parsed.chatTitle,
                isGroup              = parsed.isGroup,
                unreadCount          = 1,
                lastMessageTimestamp = parsed.timestamp,
                deletedCount         = if (parsed.isDeletion) 1 else 0,
            )
            database.conversationDao().insert(conversation)
            Log.i(TAG, "Created conversation: key=$conversationKey, title=${parsed.chatTitle}")
        } else {
            database.conversationDao().update(
                conversation.copy(
                    chatTitle            = parsed.chatTitle,
                    lastMessageTimestamp = maxOf(conversation.lastMessageTimestamp, parsed.timestamp),
                    unreadCount          = conversation.unreadCount + 1,
                    deletedCount         = if (parsed.isDeletion) conversation.deletedCount + 1 else conversation.deletedCount,
                )
            )
        }

        /* 2. Deletion signal processing */
        if (parsed.isDeletion) {
            var existing = database.messageDao()
                .findRecentBySender(conversation.id, parsed.senderName, parsed.timestamp)

            if (existing == null) {
                existing = database.messageDao()
                    .findRecentInConversation(conversation.id, parsed.timestamp)
            }

            if (existing != null) {
                database.messageDao().update(existing.copy(isDeletedBySender = true))
                Log.i(TAG, "Marked message as deleted: id=${existing.id}, sender=${existing.senderName}")
                broadcastNewMessage(existing.senderName, existing.messageText, conversation.id, true, parsed.timestamp)
                return
            } else {
                Log.d(TAG, "Deletion signal received but no prior matching message in 72h window.")
            }
        }

        /* 3. Standard message insertion */
        if (!parsed.isDeletion && !parsed.messageText.isNullOrBlank()) {
            val text = parsed.messageText
            val rawSignature = "${conversation.id}|${parsed.senderName}|${parsed.timestamp}|$text"
            val sha256Signature = computeSha256(rawSignature)

            val message = MessageEntity(
                id                = UUID.randomUUID().toString(),
                conversationId    = conversation.id,
                senderName        = parsed.senderName,
                messageText       = text,
                notificationId    = parsed.notificationId,
                timestamp         = parsed.timestamp,
                isDeletedBySender = false,
                isEdited          = false,
                mediaType         = null,
                mediaPath         = null,
                hashSignature     = sha256Signature,
                isPurged          = false,
                purgedAt          = null,
            )
            database.messageDao().insert(message)
            Log.i(TAG, "Persisted message: chat='${parsed.chatTitle}', sender='${parsed.senderName}'")
            broadcastNewMessage(parsed.senderName, text, conversation.id, false, parsed.timestamp)
        }
    }

    private fun computeSha256(input: String): String {
        return try {
            val md = MessageDigest.getInstance("SHA-256")
            val digest = md.digest(input.toByteArray(Charsets.UTF_8))
            digest.joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
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
