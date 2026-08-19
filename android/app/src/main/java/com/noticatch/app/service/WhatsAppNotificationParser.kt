package com.noticatch.app.service

import android.app.Notification
import android.app.Person
import android.os.Build
import android.os.Bundle
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * WhatsAppNotificationParser
 *
 * Decoupled, pure-Kotlin notification extraction and heuristic parsing engine.
 * Isolates parsing logic from Android service bindings to enable deterministic unit testing.
 *
 * Features:
 *   - Android 10-15 MessagingStyle multi-message bundle array extraction
 *   - Multilingual deletion detection across 25+ language variants
 *   - Automated OTP and broadcast spam classification
 *   - Group vs 1-on-1 chat classification and key normalization
 */
object WhatsAppNotificationParser {

    private const val TAG = "WhatsAppParser"
    const val WHATSAPP_PKG = "com.whatsapp"
    const val WHATSAPP_BUSINESS_PKG = "com.whatsapp.w4b"

    /** Parsed message entity ready for database persistence. */
    data class ParsedMessage(
        val packageName:    String,
        val chatTitle:      String,
        val senderName:     String,
        val messageText:    String?,
        val notificationId: Int,
        val timestamp:      Long,
        val isDeletion:     Boolean,
        val isGroup:        Boolean,
        val isSpamOtp:      Boolean,
    )

    /** Multilingual deletion signal regex heuristic catalog (25+ languages). */
    private val DELETION_PATTERNS = listOf(
        Regex("this message was deleted",               RegexOption.IGNORE_CASE),
        Regex("you deleted this message",               RegexOption.IGNORE_CASE),
        Regex("message deleted",                        RegexOption.IGNORE_CASE),
        Regex("deleted this message",                   RegexOption.IGNORE_CASE),
        Regex("deleted a message",                      RegexOption.IGNORE_CASE),
        Regex("esta mensagem foi apagada",              RegexOption.IGNORE_CASE),
        Regex("este mensaje fue eliminado",             RegexOption.IGNORE_CASE),
        Regex("ce message a été supprimé",              RegexOption.IGNORE_CASE),
        Regex("diese nachricht wurde gelöscht",         RegexOption.IGNORE_CASE),
        Regex("questa messaggio è stato eliminato",     RegexOption.IGNORE_CASE),
        Regex("dit bericht is verwijderd",              RegexOption.IGNORE_CASE),
        Regex("wiadomość została usunięta",             RegexOption.IGNORE_CASE),
        Regex("bu mesaj silindi",                       RegexOption.IGNORE_CASE),
        Regex("pesan ini telah dihapus",                RegexOption.IGNORE_CASE),
        Regex("tin nhắn này đã bị xóa",                 RegexOption.IGNORE_CASE),
        Regex("ข้อความนี้ถูกลบแล้ว"),
        Regex("यह संदेश हटा दिया गया"),
        Regex("આ સંદેશ કાઢી નાખવામાં આવ્યો છે"),
        Regex("இந்த செய்தி நீக்கப்பட்டது"),
        Regex("ఈ సందేశం తొలగించబడింది"),
        Regex("ಈ ಸಂದೇಶವನ್ನು ಅಳಿಸಲಾಗಿದೆ"),
        Regex("ഈ സന്ദേശം ഇല്ലാതാക്കി"),
        Regex("تم حذف هذه الرسالة"),
        Regex("پیام حذف شد"),
        Regex("这个消息已被删除"),
        Regex("這個訊息已被刪除"),
        Regex("このメッセージは削除されました"),
        Regex("이 메시지는 삭제되었습니다"),
    )

    /** OTP & transactional automated broadcast filter patterns. */
    private val OTP_PATTERNS = listOf(
        Regex("\\b\\d{4,8}\\b.*\\b(code|otp|passcode|pin)\\b", RegexOption.IGNORE_CASE),
        Regex("\\bverification code\\b",                       RegexOption.IGNORE_CASE),
        Regex("\\bone[\\s-]?time[\\s-]?password\\b",           RegexOption.IGNORE_CASE),
        Regex("\\bdo not share\\b.*\\b(code|otp)\\b",          RegexOption.IGNORE_CASE),
    )

    /**
     * isWhatsAppNotification
     *
     * Validates whether the incoming notification originates from official WhatsApp packages.
     */
    fun isWhatsAppNotification(packageName: String?): Boolean {
        return packageName == WHATSAPP_PKG || packageName == WHATSAPP_BUSINESS_PKG
    }

    /**
     * parse
     *
     * Processes a StatusBarNotification and returns all extracted messages.
     * Handles MessagingStyle arrays containing multiple bundled messages.
     */
    fun parse(sbn: StatusBarNotification): List<ParsedMessage> {
        val packageName = sbn.packageName ?: return emptyList()
        if (!isWhatsAppNotification(packageName)) return emptyList()

        val notification: Notification = sbn.notification ?: return emptyList()
        val extras: Bundle = notification.extras ?: return emptyList()

        val isGroupExplicit = extras.getBoolean(Notification.EXTRA_IS_GROUP_CONVERSATION, false)
        val conversationTitle = extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString()?.trim()
        val isGroup = isGroupExplicit || (!conversationTitle.isNullOrBlank())

        val rawTitle = extractTitle(extras)
        val chatTitle = if (!conversationTitle.isNullOrBlank()) {
            conversationTitle
        } else if (rawTitle.isNotBlank()) {
            rawTitle
        } else {
            "WhatsApp Contact"
        }

        val timestamp = sbn.postTime
        val notificationId = sbn.id
        val messagesList = mutableListOf<ParsedMessage>()

        /* 1. Android MessagingStyle EXTRA_MESSAGES bundle array extraction */
        val messagesArray = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
        if (messagesArray != null && messagesArray.isNotEmpty()) {
            for (item in messagesArray) {
                if (item is Bundle) {
                    val msgText = item.getCharSequence("text")?.toString()?.trim() ?: continue
                    if (msgText.isBlank() || isSummaryCount(msgText)) continue

                    val msgTime = item.getLong("time", timestamp)
                    val sender = extractSenderFromBundle(item) ?: if (isGroup) chatTitle else chatTitle
                    val isDeletion = isDeletion(msgText, sender)
                    val isSpamOtp = isSpamOtp(msgText)

                    messagesList.add(
                        ParsedMessage(
                            packageName    = packageName,
                            chatTitle      = chatTitle,
                            senderName     = sender,
                            messageText    = if (isDeletion) null else msgText,
                            notificationId = notificationId,
                            timestamp      = if (msgTime > 0) msgTime else timestamp,
                            isDeletion     = isDeletion,
                            isGroup        = isGroup,
                            isSpamOtp      = isSpamOtp,
                        )
                    )
                }
            }
        }

        /* 2. Fallback to standard BigText/Text extraction if no MessagingStyle bundles found */
        if (messagesList.isEmpty()) {
            val bodyText = extractBodyText(extras)
            if (bodyText.isNotBlank() && !isSummaryCount(bodyText)) {
                var senderName = chatTitle
                var cleanText = bodyText

                if (isGroup && bodyText.contains(": ")) {
                    val parts = bodyText.split(": ", limit = 2)
                    if (parts.size == 2 && parts[0].length < 40) {
                        senderName = parts[0].trim()
                        cleanText = parts[1].trim()
                    }
                }

                val isDeletion = isDeletion(cleanText, chatTitle)
                val isSpamOtp = isSpamOtp(cleanText)

                messagesList.add(
                    ParsedMessage(
                        packageName    = packageName,
                        chatTitle      = chatTitle,
                        senderName     = senderName,
                        messageText    = if (isDeletion) null else cleanText,
                        notificationId = notificationId,
                        timestamp      = timestamp,
                        isDeletion     = isDeletion,
                        isGroup        = isGroup,
                        isSpamOtp      = isSpamOtp,
                    )
                )
            }
        }

        return messagesList
    }

    private fun isSummaryCount(text: String): Boolean {
        return text.matches(Regex("^\\d+\\s+new\\s+messages?$", RegexOption.IGNORE_CASE))
    }

    fun isDeletion(text: String, title: String): Boolean {
        return DELETION_PATTERNS.any { pattern ->
            pattern.containsMatchIn(text) || pattern.containsMatchIn(title)
        }
    }

    fun isSpamOtp(text: String): Boolean {
        return OTP_PATTERNS.any { it.containsMatchIn(text) }
    }

    private fun extractSenderFromBundle(bundle: Bundle): String? {
        bundle.getCharSequence("sender")?.toString()?.trim()?.let {
            if (it.isNotBlank()) return it
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val person = bundle.getParcelable<Person>("sender_person")
            person?.name?.toString()?.trim()?.let {
                if (it.isNotBlank()) return it
            }
        }
        return null
    }

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

    private fun extractBodyText(extras: Bundle): String {
        extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim()?.let {
            if (it.isNotBlank()) return it
        }

        val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
        if (textLines != null && textLines.isNotEmpty()) {
            for (i in textLines.indices.reversed()) {
                val line = textLines[i]?.toString()?.trim()
                if (!line.isNullOrBlank()) {
                    return line
                }
            }
        }

        extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim()?.let {
            if (it.isNotBlank()) return it
        }

        return ""
    }
}
