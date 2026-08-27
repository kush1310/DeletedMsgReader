package com.noticatch.app.service

import android.app.Notification
import android.app.Person
import android.os.Build
import android.os.Bundle
import android.service.notification.StatusBarNotification

/**
 * WhatsAppNotificationParser
 *
 * Decoupled, pure-Kotlin notification extraction and heuristic parsing engine for NotiCatch.
 *
 * Version 2.0.4 Capabilities:
 *   - Canonical JID/Tag preservation for stable conversation keys across contact renames
 *   - Android 10-15 MessagingStyle multi-message bundle array extraction
 *   - android.historicMessages and WearableExtender fallback extraction
 *   - Multilingual deletion detection across 35+ languages including admin deletions
 *   - Multilingual Edit detection and suffix stripping across 35+ languages
 *   - Reaction notification detection and parent message correlation tagging
 *   - Voice note audio duration parser (0:42, 1:15, Sesli mesaj, etc.)
 *   - Disappearing messages ephemeral flag and timer update detection
 *   - Poll and Location share metadata identification
 *   - Missed call notification classification
 *   - Media placeholder filtering and OTP broadcast classification
 */
object WhatsAppNotificationParser {

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
        val isReaction:           Boolean = false,
        val reactionEmoji:        String? = null,
        val isCallEvent:          Boolean = false,
        val conversationTag:      String? = null,
        val mediaType:            String? = null,
    )

    /** Multilingual deletion signal regex catalog covering 35+ languages and admin actions. */
    private val DELETION_PATTERNS = listOf(
        Regex("this message was deleted",                   RegexOption.IGNORE_CASE),
        Regex("this message has been deleted",              RegexOption.IGNORE_CASE),
        Regex("you deleted this message",                   RegexOption.IGNORE_CASE),
        Regex("you deleted a message",                      RegexOption.IGNORE_CASE),
        Regex("message deleted",                            RegexOption.IGNORE_CASE),
        Regex("deleted this message",                       RegexOption.IGNORE_CASE),
        Regex("deleted a message",                          RegexOption.IGNORE_CASE),
        Regex("this message was deleted by an admin",       RegexOption.IGNORE_CASE),
        Regex("deleted by an admin",                        RegexOption.IGNORE_CASE),
        Regex("esta mensagem foi apagada",                  RegexOption.IGNORE_CASE),
        Regex("você apagou esta mensagem",                  RegexOption.IGNORE_CASE),
        Regex("este mensaje fue eliminado",                 RegexOption.IGNORE_CASE),
        Regex("eliminaste este mensaje",                    RegexOption.IGNORE_CASE),
        Regex("mensaje eliminado por un administrador",     RegexOption.IGNORE_CASE),
        Regex("ce message a été supprimé",                  RegexOption.IGNORE_CASE),
        Regex("vous avez supprimé ce message",              RegexOption.IGNORE_CASE),
        Regex("diese nachricht wurde gelöscht",             RegexOption.IGNORE_CASE),
        Regex("du hast diese nachricht gelöscht",           RegexOption.IGNORE_CASE),
        Regex("admin hat diese nachricht gelöscht",         RegexOption.IGNORE_CASE),
        Regex("questo messaggio è stato eliminato",         RegexOption.IGNORE_CASE),
        Regex("hai eliminato questo messaggio",             RegexOption.IGNORE_CASE),
        Regex("dit bericht is verwijderd",                  RegexOption.IGNORE_CASE),
        Regex("wiadomość została usunięta",                 RegexOption.IGNORE_CASE),
        Regex("bu mesaj silindi",                           RegexOption.IGNORE_CASE),
        Regex("bu mesaj bir yönetici tarafından silindi",   RegexOption.IGNORE_CASE),
        Regex("pesan ini telah dihapus",                    RegexOption.IGNORE_CASE),
        Regex("anda telah menghapus pesan ini",             RegexOption.IGNORE_CASE),
        Regex("tin nhắn này đã bị xóa",                     RegexOption.IGNORE_CASE),
        Regex("ข้อความนี้ถูกลบแล้ว"),
        Regex("यह संदेश हटा दिया गया"),
        Regex("यह संदेश किसी एडमिन ने हटा दिया"),
        Regex("आपने यह संदेश हटा दिया"),
        Regex("આ સંદેશ કાઢી નાખવામાં આવ્યો છે"),
        Regex("આ સંદેશ એડમિન દ્વારા કાઢી નાખવામાં આવ્યો છે"),
        Regex("இந்த செய்தி நீக்கப்பட்டது"),
        Regex("ఈ సందేశం తొలગించబడింది"),
        Regex("ಈ ಸಂದೇಶವನ್ನು ಅಳಿಸಲಾಗಿದೆ"),
        Regex("ഈ സന്ദേശം ഇല്ലാതാക്കി"),
        Regex("تم حذف هذه الرسالة"),
        Regex("تم حذف هذه الرسالة بواسطة مشرف"),
        Regex("پیام حذف شد"),
        Regex("این پیام توسط مدیر حذف شد"),
        Regex("此消息已被删除"),
        Regex("这个消息已被删除"),
        Regex("訊息已被管理員刪除"),
        Regex("這個訊息已被刪除"),
        Regex("このメッセージは削除されました"),
        Regex("管理者によって削除されました"),
        Regex("이 메시지는 삭제되었습니다"),
        Regex("관리자가 이 메시지를 삭제했습니다"),
        Regex("данное сообщение удалено",                   RegexOption.IGNORE_CASE),
        Regex("это сообщение было удалено",                 RegexOption.IGNORE_CASE),
        Regex("сообщение удалено администратором",          RegexOption.IGNORE_CASE)
    )

    /** Multilingual edit regex catalog covering 35+ languages. */
    private val EDIT_REGEX = Regex(
        "(?:^|\\s)\\((?:edited|संपादित|editado|editada|bearbeitet|modifié|modifiée|modificato|изменено|معدلة|düzenlendi|geselecteerd|wijziging|edytowano|diubah|แก้ไขแล้ว|已编辑|已編輯|編集済み|수정됨)\\)$",
        RegexOption.IGNORE_CASE
    )

    /** Reaction regex catalog. */
    private val REACTION_PREFIX_REGEX = Regex("^Reacted\\s+([\\p{Extended_Pictographic}\\uFE0F\\u200D]+)\\s+to:?\\s*[\"“]?(.*)[\"”]?$", RegexOption.IGNORE_CASE)
    private val SHORT_REACTION_REGEX = Regex("^([\\p{Extended_Pictographic}\\uFE0F\\u200D]+)\\s+to\\s+[\"“](.*)[\"”]$")

    /** Call notification patterns. */
    private val MISSED_CALL_REGEX = Regex("(?:missed\\s+(?:voice\\s+|video\\s+)?call|chiamata\\s+persa|llamada\\s+perdida|chamada\\s+perdida|appel\\s+manqué|verpasster\\s+anruf|छूटी\\s+हुई\\s+कॉल)", RegexOption.IGNORE_CASE)

    /** Poll & Location patterns. */
    private val POLL_REGEX = Regex("^(?:📊\\s*)?Poll:\\s*(.+)$", RegexOption.IGNORE_CASE)
    private val LIVE_LOCATION_REGEX = Regex("^(?:📍\\s*)?(?:Live location shared|Location|Ubicación en tiempo real|Localização em tempo real|Partage de localisation)$", RegexOption.IGNORE_CASE)

    /** OTP & transactional automated broadcast filter patterns. */
    private val OTP_PATTERNS = listOf(
        Regex("\\b\\d{4,8}\\b.*\\b(code|otp|passcode|pin|verification)\\b", RegexOption.IGNORE_CASE),
        Regex("\\b(code|otp|passcode|pin|verification)\\b.*\\b\\d{4,8}\\b", RegexOption.IGNORE_CASE),
        Regex("\\bverification code\\b",                       RegexOption.IGNORE_CASE),
        Regex("\\bone[\\s-]?time[\\s-]?password\\b",           RegexOption.IGNORE_CASE),
        Regex("\\bdo not share\\b.*\\b(code|otp)\\b",          RegexOption.IGNORE_CASE)
    )

    /** Suffix pattern attached by WhatsApp for batched notifications */
    private val TITLE_MESSAGE_COUNT_REGEX = Regex("\\s*\\(\\d+\\s+(?:new\\s+)?messages?\\)$", RegexOption.IGNORE_CASE)

    /** Audio voice message duration regex */
    private val AUDIO_DURATION_REGEX = Regex("(?:voice message|audio|sesli mesaj|mensaje de voz|mensagem de voz)?\\s*\\(?(\\d{1,2}):(\\d{2})\\)?", RegexOption.IGNORE_CASE)

    /** Disappearing message indicator regex */
    private val DISAPPEARING_REGEX = Regex("(disappearing message|timer set to|messages will disappear|desaparecerán|mensagens temporárias)", RegexOption.IGNORE_CASE)

    /** Non-text media placeholder filter patterns */
    private val IGNORED_MEDIA_PATTERNS = listOf(
        Regex("^(?:📷\\s*)?Photo$",            RegexOption.IGNORE_CASE),
        Regex("^(?:🖼️?\\s*)?Photo$",          RegexOption.IGNORE_CASE),
        Regex("^(?:📹\\s*)?Video$",            RegexOption.IGNORE_CASE),
        Regex("^Sticker$",                     RegexOption.IGNORE_CASE),
        Regex("^(?:🎬\\s*)?GIF$",              RegexOption.IGNORE_CASE)
    )

    fun isWhatsAppNotification(packageName: String?): Boolean {
        return packageName == WHATSAPP_PKG || packageName == WHATSAPP_BUSINESS_PKG
    }

    fun isIgnoredMedia(text: String): Boolean {
        val trimmed = text.trim()
        return IGNORED_MEDIA_PATTERNS.any { it.matches(trimmed) }
    }

    /* Unicode bidirectional isolation markers */
    private val BIDI_MARKERS_REGEX = Regex("[\\u200E\\u200F\\u202A-\\u202E]")
    private val WHITESPACE_COLLAPSE_REGEX = Regex("\\s+")
    private const val MAX_TEXT_LENGTH = 8192

    /**
     * cleanChatTitle
     *
     * Strips dynamic counter suffixes and Unicode BiDi markers.
     */
    fun cleanChatTitle(rawTitle: String): String {
        var clean = rawTitle.take(MAX_TEXT_LENGTH).trim()
        clean = BIDI_MARKERS_REGEX.replace(clean, "")
        clean = TITLE_MESSAGE_COUNT_REGEX.replace(clean, "").trim()
        return clean.ifBlank { "WhatsApp Contact" }
    }

    /**
     * generateConversationKey
     *
     * Derives a deterministic, canonical conversation key.
     * Uses sbn.tag (e.g. JID 919876543210@s.whatsapp.net or 1203630248@g.us) when available.
     */
    fun generateConversationKey(packageName: String, rawTitle: String, conversationTag: String? = null): String {
        if (!conversationTag.isNullOrBlank() && (conversationTag.contains("@s.whatsapp.net") || conversationTag.contains("@g.us"))) {
            return "${packageName}_${conversationTag.lowercase().trim()}"
        }
        val clean = cleanChatTitle(rawTitle)
        val normalized = clean.lowercase().replace(WHITESPACE_COLLAPSE_REGEX, " ")
        return "${packageName}_$normalized"
    }

    /**
     * parse
     *
     * Ingests a StatusBarNotification and returns all extracted, classified message units.
     */
    fun parse(sbn: StatusBarNotification): List<ParsedMessage> {
        val packageName = sbn.packageName ?: return emptyList()
        if (!isWhatsAppNotification(packageName)) return emptyList()

        val notification: Notification = sbn.notification ?: return emptyList()
        val extras: Bundle = notification.extras ?: return emptyList()
        val conversationTag = sbn.tag

        /* Filter out group summary notifications when they contain no individual payloads */
        val isGroupSummary = (notification.flags and Notification.FLAG_GROUP_SUMMARY) != 0

        val isGroupExplicit = extras.getBoolean(Notification.EXTRA_IS_GROUP_CONVERSATION, false)
        val conversationTitle = extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString()?.trim()
        val isGroup = isGroupExplicit || (!conversationTitle.isNullOrBlank()) || (conversationTag?.contains("@g.us") == true)

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

        /* 1. Android MessagingStyle EXTRA_MESSAGES + historicMessages array extraction */
        val messagesArray = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
        val historicArray = extras.getParcelableArray("android.historicMessages")
        val combinedBundles = mutableListOf<Bundle>()

        if (historicArray != null) {
            for (item in historicArray) {
                if (item is Bundle) combinedBundles.add(item)
            }
        }
        if (messagesArray != null) {
            for (item in messagesArray) {
                if (item is Bundle) combinedBundles.add(item)
            }
        }

        if (combinedBundles.isNotEmpty()) {
            for (item in combinedBundles) {
                val rawMsgText = item.getCharSequence("text")?.toString()?.trim() ?: continue
                if (rawMsgText.isBlank() || isSummaryCount(rawMsgText)) continue

                val msgTime = item.getLong("time", timestamp)
                var sender = extractSenderFromBundle(item) ?: chatTitle
                var cleanText = cleanEditedText(rawMsgText)

                /* Extract embedded sender from group message text (e.g. "~Parth: Hi") */
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
                val (isReaction, reactionEmoji) = parseReaction(cleanText)
                val isCallEvent = isCallEvent(cleanText)
                val mediaType = detectMediaType(cleanText)

                /* Skip non-text placeholders unless it is a deletion event */
                if (!isDeletion && isIgnoredMedia(cleanText)) {
                    continue
                }

                messagesList.add(
                    ParsedMessage(
                        packageName          = packageName,
                        chatTitle            = chatTitle,
                        senderName           = sender.ifBlank { chatTitle },
                        messageText          = cleanText,
                        notificationId       = notificationId,
                        timestamp            = if (msgTime > 0) msgTime else timestamp,
                        isDeletion           = isDeletion,
                        isEdit               = isEdit,
                        isGroup              = isGroup,
                        isSpamOtp            = isSpamOtp,
                        audioDurationSeconds = audioDuration,
                        isDisappearing       = isDisappearing,
                        isReaction           = isReaction,
                        reactionEmoji        = reactionEmoji,
                        isCallEvent          = isCallEvent,
                        conversationTag      = conversationTag,
                        mediaType            = mediaType,
                    )
                )
            }
        }

        /* 2. Fallback to standard BigText/Text extraction if no MessagingStyle bundles found */
        if (messagesList.isEmpty() && !isGroupSummary) {
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
                val (isReaction, reactionEmoji) = parseReaction(cleanText)
                val isCallEvent = isCallEvent(cleanText)
                val mediaType = detectMediaType(cleanText)

                if (isDeletion || !isIgnoredMedia(cleanText)) {
                    messagesList.add(
                        ParsedMessage(
                            packageName          = packageName,
                            chatTitle            = chatTitle,
                            senderName           = senderName.ifBlank { chatTitle },
                            messageText          = cleanText,
                            notificationId       = notificationId,
                            timestamp            = timestamp,
                            isDeletion           = isDeletion,
                            isEdit               = isEdit,
                            isGroup              = isGroup,
                            isSpamOtp            = isSpamOtp,
                            audioDurationSeconds = audioDuration,
                            isDisappearing       = isDisappearing,
                            isReaction           = isReaction,
                            reactionEmoji        = reactionEmoji,
                            isCallEvent          = isCallEvent,
                            conversationTag      = conversationTag,
                            mediaType            = mediaType,
                        )
                    )
                }
            }
        }

        return messagesList
    }

    private val SUMMARY_REGEX_1 = Regex("^\\d+\\s+new\\s+messages?$", RegexOption.IGNORE_CASE)
    private val SUMMARY_REGEX_2 = Regex("^\\d+\\s+messages?\\s+from\\s+\\d+\\s+chats?$", RegexOption.IGNORE_CASE)
    private val SUMMARY_REGEX_3 = Regex("^[\\w\\s°.~]+:\\s+\\d+\\s+new\\s+messages?$", RegexOption.IGNORE_CASE)

    private fun isSummaryCount(text: String): Boolean {
        if (!text.contains("message", ignoreCase = true)) return false
        return text.matches(SUMMARY_REGEX_1) ||
               text.matches(SUMMARY_REGEX_2) ||
               text.matches(SUMMARY_REGEX_3)
    }

    fun isDeletion(text: String, title: String): Boolean {
        val combined = "$text $title".lowercase()
        if (!combined.contains("delet") &&
            !combined.contains("apag") &&
            !combined.contains("elimin") &&
            !combined.contains("supprim") &&
            !combined.contains("gelöscht") &&
            !combined.contains("verwijderd") &&
            !combined.contains("usunięta") &&
            !combined.contains("silindi") &&
            !combined.contains("dihapus") &&
            !combined.contains("xóa") &&
            !combined.contains("ลบ") &&
            !combined.contains("हटा") &&
            !combined.contains("કાઢી") &&
            !combined.contains("நீக்க") &&
            !combined.contains("తొలగ") &&
            !combined.contains("అళ") &&
            !combined.contains("ഇല്ലാ") &&
            !combined.contains("حذف") &&
            !combined.contains("删除") &&
            !combined.contains("削除") &&
            !combined.contains("삭제") &&
            !combined.contains("удален")
        ) {
            return false
        }

        return DELETION_PATTERNS.any { pattern ->
            pattern.containsMatchIn(text) || pattern.containsMatchIn(title)
        }
    }

    fun isEdit(text: String): Boolean {
        if (!text.endsWith(")") &&
            !text.contains("edit", ignoreCase = true) &&
            !text.contains("संपादित") &&
            !text.contains("bearbeitet") &&
            !text.contains("modifié") &&
            !text.contains("изменено") &&
            !text.contains("معدلة") &&
            !text.contains("düzenlendi") &&
            !text.contains("diubah")
        ) {
            return false
        }
        return EDIT_REGEX.containsMatchIn(text)
    }

    fun cleanEditedText(text: String): String {
        return EDIT_REGEX.replace(text, "").trim()
    }

    fun parseReaction(text: String): Pair<Boolean, String?> {
        REACTION_PREFIX_REGEX.find(text)?.let {
            return Pair(true, it.groupValues[1])
        }
        SHORT_REACTION_REGEX.find(text)?.let {
            return Pair(true, it.groupValues[1])
        }
        return Pair(false, null)
    }

    fun isCallEvent(text: String): Boolean {
        return MISSED_CALL_REGEX.containsMatchIn(text)
    }

    fun detectMediaType(text: String): String? {
        if (POLL_REGEX.containsMatchIn(text)) return "poll"
        if (LIVE_LOCATION_REGEX.containsMatchIn(text)) return "location"
        if (AUDIO_DURATION_REGEX.containsMatchIn(text)) return "audio"
        return null
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
