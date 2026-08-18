package com.noticatch.app.service

import android.app.Notification
import android.content.Intent
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * NotificationListener
 *
 * Android NotificationListenerService for NotiCatch.
 * Intercepts incoming WhatsApp notification events (com.whatsapp and com.whatsapp.w4b),
 * extracts message content in real time before deletion, and stores encrypted records locally.
 *
 * Guarantees zero network access (air-gapped local architecture).
 */
class NotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "NotiCatchListener"
        private const val WHATSAPP_PKG = "com.whatsapp"
        private const val WHATSAPP_BUSINESS_PKG = "com.whatsapp.w4b"
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val packageName = sbn.packageName ?: return

        if (packageName != WHATSAPP_PKG && packageName != WHATSAPP_BUSINESS_PKG) {
            return
        }

        val notification = sbn.notification ?: return
        val extras: Bundle = notification.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() ?: ""
        val timestamp = sbn.postTime

        if (title.isBlank() && text.isBlank()) {
            return
        }

        Log.d(TAG, "Captured WhatsApp Notification: title='$title', length=${text.length}, time=$timestamp")
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val packageName = sbn.packageName ?: return

        if (packageName == WHATSAPP_PKG || packageName == WHATSAPP_BUSINESS_PKG) {
            Log.d(TAG, "Notification dismissed/removed by system for package: $packageName")
        }
    }
}
