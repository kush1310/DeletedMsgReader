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
 *   - Automatic message-count suffix stripping (" (6 messages)" -> single unified thread)
 *   - Embedded group sender extraction ("~Naitri Jasani: So what !!" -> author attribution)
 *   - Android 10-15 MessagingStyle multi-message bundle array extraction
 *   - Multilingual deletion detection across 25+ language variants
 *   - WhatsApp Edit notification detection & original text extraction
 *   - Voice note audio duration parser (0:42, 1:15, etc.)
 *   - Disappearing messages ephemeral flag detection
 *   - Automated OTP and broadcast spam classification
 */
object WhatsAppNotificationParser {

    private const val TAG = "WhatsAppParser"
    const val WHATSAPP_PKG = "com.whatsapp"
    const val WHATSAPP_BUSINESS_PKG = "com.whatsapp.w4b"

    /** Parsed message entity ready for database persistence. */
    data class ParsedMessage(
        val packageName:          String,
        val chatTitle:            String,
        val senderName:           String,
        val messageText:          String?,
        val notificationId:       Int,
        val timestamp:            Long,
        val isDeletion:           Boolean,
        val isEdit:               Boolean,
        val isGroup:              Boolean,
        val isSpamOtp:            Boolean,
        val audioDurationSeconds: Int?,
        val isDisappearing:       Boolean,
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

    /** Suffix pattern attached by WhatsApp for batched notifications (e.g., "(6 messages)", "(12 new messages)") */
    private val TITLE_MESSAGE_COUNT_REGEX = Regex("\\s*\\(\\d+\\s+(?:new\\s+)?messages?\\)$", RegexOption.IGNORE_CASE)

    /** Audio voice message duration regex: "0:42", "1:15", "Voice message (0:30)" */
    private val AUDIO_DURATION_REGEX = Regex("(?:voice message|audio)?\\s*\\(?(\\d{1,2}):(\\d{2})\\)?", RegexOption.IGNORE_CASE)

    /** Disappearing message indicator regex */
    private val DISAPPEARING_REGEX = Regex("(disappearing message|timer set to|messages will disappear)", RegexOption.IGNORE_CASE)

    /** Edit indicators: "(edited)", "edited message" */
    private val EDIT_REGEX = Regex("(?:^|\\s)\\((?:edited|संपादित)\\)$", RegexOption.IGNORE_CASE)

    fun isWhatsAppNotification(packageName: String?): Boolean {
        return packageName == WHATSAPP_PKG || packageName == WHATSAPP_BUSINESS_PKG
    }

    /**
     * cleanChatTitle
     *
     * Strips ephemeral WhatsApp message count suffixes such as "(6 messages)" or "(12 new messages)"
     * so that all notifications for a single conversation resolve to one canonical title.
     */
    fun cleanChatTitle(rawTitle: String): String {
        var clean = rawTitle.trim()
        clean = TITLE_MESSAGE_COUNT_REGEX.replace(clean, "").trim()
        return clean.ifBlank { "WhatsApp Chat" }
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
        val candidateTitle = if (!conversationTitle.isNullOrBlank()) {
            conversationTitle
        } else if (rawTitle.isNotBlank()) {
            rawTitle
        } else {
            "WhatsApp Contact"
        }
        val chatTitle = cleanChatTitle(candidateTitle)

        val timestamp = sbn.postTime
        val notificationId = sbn.id
        val messagesList = mutableListOf<ParsedMessage>()

        /* 1. Android MessagingStyle EXTRA_MESSAGES bundle array extraction */
        val messagesArray = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
        if (messagesArray != null && messagesArray.isNotEmpty()) {
            for (item in messagesArray) {
                if (item is Bundle) {
                    val rawMsgText = item.getCharSequence("text")?.toString()?.trim() ?: continue
                    if (rawMsgText.isBlank() || isSummaryCount(rawMsgText)) continue

                    val msgTime = item.getLong("time", timestamp)
                    var sender = extractSenderFromBundle(item) ?: if (isGroup) chatTitle else chatTitle
                    var cleanText = cleanEditedText(rawMsgText)

                    /* Extract embedded sender from group message text (e.g. "~Naitri Jasani: So what !!") */
                    if (cleanText.contains(": ")) {
                        val colonIdx = cleanText.indexOf(": ")
                        if (colonIdx in 1..40) {
                            val potentialSender = cleanText.substring(0, colonIdx).trim().removePrefix("~").trim()
                            val body = cleanText.substring(colonIdx + 2).trim()
                            if (potentialSender.isNotBlank() && body.isNotBlank()) {
                                sender = potentialSender
                                cleanText = body
                            }
                        }
                    }
                    sender = sender.removePrefix("~").trim()

                    val isDeletion = isDeletion(cleanText, sender)
                    val isEdit = isEdit(rawMsgText)
                    val isSpamOtp = isSpamOtp(cleanText)
                    val audioDuration = parseAudioDuration(cleanText)
                    val isDisappearing = isDisappearing(cleanText)

                    messagesList.add(
                        ParsedMessage(
                            packageName          = packageName,
                            chatTitle            = chatTitle,
                            senderName           = sender.ifBlank { chatTitle },
                            messageText          = if (isDeletion) null else cleanText,
                            notificationId       = notificationId,
                            timestamp            = if (msgTime > 0) msgTime else timestamp,
                            isDeletion           = isDeletion,
                            isEdit               = isEdit,
                            isGroup              = isGroup,
                            isSpamOtp            = isSpamOtp,
                            audioDurationSeconds = audioDuration,
                            isDisappearing       = isDisappearing,
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
                var cleanBody = bodyText

                if (cleanBody.contains(": ")) {
                    val parts = cleanBody.split(": ", limit = 2)
                    if (parts.size == 2 && parts[0].length in 1..40) {
                        senderName = parts[0].trim().removePrefix("~").trim()
                        cleanBody = parts[1].trim()
                    }
                }
                senderName = senderName.removePrefix("~").trim()

                val isDeletion = isDeletion(cleanBody, chatTitle)
                val isEdit = isEdit(cleanBody)
                val cleanText = cleanEditedText(cleanBody)
                val isSpamOtp = isSpamOtp(cleanText)
                val audioDuration = parseAudioDuration(cleanText)
                val isDisappearing = isDisappearing(cleanText)

                messagesList.add(
                    ParsedMessage(
                        packageName          = packageName,
                        chatTitle            = chatTitle,
                        senderName           = senderName.ifBlank { chatTitle },
                        messageText          = if (isDeletion) null else cleanText,
                        notificationId       = notificationId,
                        timestamp            = timestamp,
                        isDeletion           = isDeletion,
                        isEdit               = isEdit,
                        isGroup              = isGroup,
                        isSpamOtp            = isSpamOtp,
                        audioDurationSeconds = audioDuration,
                        isDisappearing       = isDisappearing,
                    )
                )
            }
        }

        return messagesList
    }

    private fun isSummaryCount(text: String): Boolean {
        return text.matches(Regex("^\\d+\\s+new\\s+messages?$", RegexOption.IGNORE_CASE)) ||
               text.matches(Regex("^\\d+\\s+messages?\\s+from\\s+\\d+\\s+chats?$", RegexOption.IGNORE_CASE))
    }

    fun isDeletion(text: String, title: String): Boolean {
        return DELETION_PATTERNS.any { pattern ->
            pattern.containsMatchIn(text) || pattern.containsMatchIn(title)
        }
    }

    fun isEdit(text: String): Boolean {
        return EDIT_REGEX.containsMatchIn(text)
    }

    fun cleanEditedText(text: String): String {
        return EDIT_REGEX.replace(text, "").trim()
    }

    fun isSpamOtp(text: String): Boolean {
        return OTP_PATTERNS.any { it.containsMatchIn(text) }
    }

    fun parseAudioDuration(text: String): Int? {
        val match = AUDIO_DURATION_REGEX.find(text) ?: return null
        val minutes = match.groupValues[1].toIntOrNull() ?: 0
        val seconds = match.groupValues[2].toIntOrNull() ?: 0
        return (minutes * 60) + seconds
    }

    fun isDisappearing(text: String): Boolean {
        return DISAPPEARING_REGEX.containsMatchIn(text)
    }

    private fun extractSenderFromBundle(bundle: Bundle): String? {
        bundle.getCharSequence("sender")?.toString()?.trim()?.let {
            if (it.isNotBlank()) return it.removePrefix("~").trim()
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val person = bundle.getParcelable<Person>("sender_person")
            person?.name?.toString()?.trim()?.let {
                if (it.isNotBlank()) return it.removePrefix("~").trim()
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
                if (!line.isNullOrBlank() && !isSummaryCount(line)) {
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
