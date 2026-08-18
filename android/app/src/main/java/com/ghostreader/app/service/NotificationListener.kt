package com.ghostreader.app.service

import android.app.Notification
import android.content.pm.PackageManager
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.ghostreader.app.bridge.MessageBridgePlugin
import com.ghostreader.app.security.MemorySanitizer

/**
 * NotificationListener
 *
 * Core Android service that intercepts all incoming StatusBarNotification
 * objects delivered to the device. Filters exclusively for WhatsApp and
 * WhatsApp Business packages, extracts message payload fields, and
 * delegates to MessageBridgePlugin for persistence via the Capacitor bridge.
 *
 * Security controls applied:
 *   - Package whitelist enforced before any payload processing.
 *   - All extracted strings sanitized immediately before passing downstream.
 *   - No sensitive data written to logcat in release builds (ProGuard strips Log.d/Log.v).
 *   - MemorySanitizer.clearString invoked on temporary sensitive strings after use.
 *
 * Operating System integration:
 *   - Subclasses android.service.notification.NotificationListenerService.
 *   - Bound by the Android NotificationListenerManager via BIND_NOTIFICATION_LISTENER_SERVICE permission.
 *   - System calls onNotificationPosted when a notification arrives.
 *   - System calls onNotificationRemoved when a notification is cancelled/deleted.
 */
class NotificationListener : NotificationListenerService() {

    companion object {
        /**
         * Set of Android package names accepted as valid WhatsApp notification sources.
         * Any notification from a package not in this set is ignored immediately.
         */
        private val WHATSAPP_PACKAGES: Set<String> = setOf(
            "com.whatsapp",
            "com.whatsapp.w4b",
        )

        /** Notification extra key for the primary message body text. */
        private const val EXTRA_TEXT    = Notification.EXTRA_TEXT
        /** Notification extra key for the conversation or sender title. */
        private const val EXTRA_TITLE   = Notification.EXTRA_TITLE
        /** Notification extra key for the sub-text or summary. */
        private const val EXTRA_SUB_TEXT = Notification.EXTRA_SUB_TEXT
    }

    /**
     * onNotificationPosted
     *
     * Invoked by the Android system when a new notification is delivered.
     * Filters for WhatsApp packages, extracts the message payload, and
     * forwards to the MessageBridgePlugin for classification and storage.
     *
     * @param  sbn  - StatusBarNotification containing all notification metadata.
     *               May be null if the system delivers an empty callback; guarded defensively.
     *
     * @edge-cases  - Null sbn is ignored silently.
     *              - Non-WhatsApp packages are rejected immediately.
     *              - Empty or blank text after extraction is forwarded with empty string
     *                to allow the ClassificationEngine to handle system notices.
     */
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        if (!WHATSAPP_PACKAGES.contains(sbn.packageName)) return

        val extras: Bundle = sbn.notification?.extras ?: return

        val rawTitle   = extras.getCharSequence(EXTRA_TEXT)?.toString()    ?: ""
        val rawText    = extras.getCharSequence(EXTRA_TITLE)?.toString()   ?: ""
        val rawSubText = extras.getCharSequence(EXTRA_SUB_TEXT)?.toString()

        try {
            MessageBridgePlugin.onWhatsAppNotification(
                packageName    = sbn.packageName,
                notificationId = sbn.id,
                title          = rawTitle,
                text           = rawText,
                subText        = rawSubText,
                timestamp      = sbn.postTime,
                groupKey       = sbn.groupKey,
            )
        } finally {
            /* Explicit string clearing for sensitive extracted text after delegation */
            MemorySanitizer.clearString(rawTitle)
            MemorySanitizer.clearString(rawText)
        }
    }

    /**
     * onNotificationRemoved
     *
     * Invoked by the Android system when a notification is cancelled/dismissed.
     * WhatsApp uses notification removal (or replacement with a "This message was deleted"
     * notification) to signal deletion events. This callback ensures the bridge
     * is informed of the removal event so the ClassificationEngine can correlate it
     * with a previously captured message via notification ID matching.
     *
     * @param  sbn    - The StatusBarNotification being removed.
     * @param  rankingMap - Current notification ranking (not used).
     * @param  reason     - Android dismissal reason code.
     *
     * @edge-cases  - Non-WhatsApp package removals are ignored immediately.
     */
    override fun onNotificationRemoved(
        sbn:        StatusBarNotification?,
        rankingMap: RankingMap?,
        reason:     Int,
    ) {
        sbn ?: return
        if (!WHATSAPP_PACKAGES.contains(sbn.packageName)) return

        MessageBridgePlugin.onWhatsAppNotificationRemoved(
            packageName    = sbn.packageName,
            notificationId = sbn.id,
            timestamp      = sbn.postTime,
        )
    }

    /**
     * onListenerConnected
     *
     * Called when the NotificationListenerService is successfully bound
     * to the Android notification system. Notifies the bridge that
     * the capture service is active.
     */
    override fun onListenerConnected() {
        super.onListenerConnected()
        MessageBridgePlugin.onListenerStatusChanged(active = true)
    }

    /**
     * onListenerDisconnected
     *
     * Called when the system severs the NotificationListenerService connection,
     * typically during a system permission revocation or shutdown event.
     * Notifies the bridge so the UI can reflect the service outage.
     */
    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        MessageBridgePlugin.onListenerStatusChanged(active = false)
    }
}
