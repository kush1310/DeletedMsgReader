package com.noticatch.app

import android.os.Bundle
import android.view.WindowManager
import com.getcapacitor.BridgeActivity
import com.noticatch.app.plugin.MessageBridgePlugin

/**
 * MainActivity
 *
 * Entry point activity for NotiCatch hosting Capacitor's React WebView.
 * Applies window security and registers native plugin bridges.
 */
class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(MessageBridgePlugin::class.java)
        super.onCreate(savedInstanceState)
        applyScreenSecureFlag()
    }

    override fun onResume() {
        super.onResume()
        applyScreenSecureFlag()
    }

    /**
     * applyScreenSecureFlag
     *
     * Dynamically sets or clears FLAG_SECURE to protect user privacy.
     */
    fun applyScreenSecureFlag() {
        val secureEnabled = getSharedPreferences("noticatch_prefs", MODE_PRIVATE)
            .getBoolean("screen_secure_enabled", true)

        runOnUiThread {
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
}
