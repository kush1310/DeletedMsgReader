package com.noticatch.app

import android.content.ComponentCallbacks2
import android.os.Bundle
import android.view.WindowManager
import android.webkit.WebSettings
import com.getcapacitor.BridgeActivity
import com.noticatch.app.plugin.MessageBridgePlugin

/**
 * MainActivity
 *
 * Entry point activity for NotiCatch hosting Capacitor's React WebView.
 * Applies window security, registers native plugin bridges, configures
 * sandbox security settings on the WebView, and handles OS memory trim signals.
 */
class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(MessageBridgePlugin::class.java)
        super.onCreate(savedInstanceState)
        configureWebViewSandbox()
        applyScreenSecureFlag()
    }

    override fun onResume() {
        super.onResume()
        applyScreenSecureFlag()
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        if (level >= ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN) {
            /* Suggest ART GC and clear transient memory when app UI is hidden */
            System.gc()
        }
    }

    private fun configureWebViewSandbox() {
        try {
            bridge?.webView?.settings?.apply {
                cacheMode = WebSettings.LOAD_DEFAULT
                setGeolocationEnabled(false)
                allowFileAccess = false
                allowContentAccess = false
            }
        } catch (_: Exception) {}
    }

    /**
     * applyScreenSecureFlag
     *
     * Dynamically sets or clears FLAG_SECURE to protect user privacy from screen scraping
     * and task switcher snapshot leaks.
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
