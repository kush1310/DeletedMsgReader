package com.noticatch.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.noticatch.app.service.NotificationListener

/**
 * BootReceiver
 *
 * System broadcast receiver triggered on:
 *   - android.intent.action.BOOT_COMPLETED (Device reboot)
 *   - android.intent.action.MY_PACKAGE_REPLACED (App update)
 *   - android.intent.action.USER_PRESENT (Device unlocked by user)
 *   - android.intent.action.QUICKBOOT_POWERON (Fast boot / OEM wake)
 *   - android.intent.action.ACTION_POWER_CONNECTED (Charger connected)
 *
 * Re-binds and kickstarts the NotificationListenerService to ensure zero dropped messages
 * after reboots or OS background process cleanup.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "NotiCatchBootReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        val action = intent.action ?: return

        Log.i(TAG, "Received system broadcast action: $action — verifying NotificationListener connection")
        try {
            NotificationListener.ensureServiceConnected(context)
        } catch (e: Throwable) {
            Log.w(TAG, "Non-fatal error while verifying listener connection: ${e.message}")
        }
    }
}
