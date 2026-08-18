package com.noticatch.app

import android.os.Bundle
import android.view.WindowManager
import com.getcapacitor.BridgeActivity
import com.noticatch.app.plugin.MessageBridgePlugin

/**
 * MainActivity
 *
 * Entry point activity for NotiCatch. Extends Capacitor's BridgeActivity
 * to host the React WebView and register native plugins.
 *
 * FLAG_SECURE is applied conditionally based on user's screen protection
 * preference to block screenshots and task switcher previews.
 */
class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        /* Register Capacitor plugin before super.onCreate() */
        registerPlugin(MessageBridgePlugin::class.java)
        super.onCreate(savedInstanceState)
        applyScreenSecureFlag()
    }

    /**
     * applyScreenSecureFlag
     *
     * Reads the screen_secure preference and applies or clears FLAG_SECURE.
     * FLAG_SECURE prevents Android's recent apps thumbnail from exposing
     * message content and blocks system-level screenshot capture.
     *
     * @validates  - Reads from app SharedPreferences; defaults to secure (true).
     */
    private fun applyScreenSecureFlag() {
        val secureEnabled = getSharedPreferences("noticatch_prefs", MODE_PRIVATE)
            .getBoolean("screen_secure_enabled", true)

        if (secureEnabled) {
            window.setFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE,
            )
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
    }
}
