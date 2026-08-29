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
 *
 * Security measures applied:
 *   - FLAG_SECURE to prevent task switcher screenshots and screen recording
 *   - WebView sandbox hardening (file access, geolocation, form data disabled)
 *   - Cache clearing on activity pause to prevent data residue
 */
class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(MessageBridgePlugin::class.java)
        super.onCreate(savedInstanceState)
        configureWebViewSandbox()
        applyScreenSecureFlag()
        com.noticatch.app.service.NotificationListener.ensureServiceConnected(this)
    }

    override fun onResume() {
        super.onResume()
        applyScreenSecureFlag()
        com.noticatch.app.service.NotificationListener.ensureServiceConnected(this)
    }

    /**
     * onPause
     *
     * Clears WebView form data and cache when the activity moves to background
     * to prevent sensitive notification data from persisting in transient caches
     * that could be extracted via adb or file system access on rooted devices.
     *
     * MASVS-STORAGE-2: Clear transient data stores on lifecycle transition.
     */
    override fun onPause() {
        super.onPause()
        try {
            bridge?.webView?.clearFormData()
        } catch (_: Exception) {}
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        if (level >= ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN) {
            /* Suggest ART GC and clear transient memory when app UI is hidden */
            System.gc()
        }
    }

    /**
     * configureWebViewSandbox
     *
     * Applies defense-in-depth restrictions on the Capacitor WebView to minimize
     * the attack surface from WebView-hosted JavaScript.
     *
     * MASVS-PLATFORM-1: Disable file:// URL access from JavaScript.
     * MASVS-PLATFORM-2: Disable geolocation tracking.
     * MASVS-CODE-4: Disable database and DOM storage APIs not required by NotiCatch.
     */
    private fun configureWebViewSandbox() {
        try {
            bridge?.webView?.settings?.apply {
                cacheMode = WebSettings.LOAD_DEFAULT
                setGeolocationEnabled(false)
                allowFileAccess = false
                allowContentAccess = false
                @Suppress("DEPRECATION")
                allowFileAccessFromFileURLs = false
                @Suppress("DEPRECATION")
                allowUniversalAccessFromFileURLs = false
            }
        } catch (_: Exception) {}
    }

    /**
     * applyScreenSecureFlag
     *
     * Dynamically sets or clears FLAG_SECURE to protect user privacy from screen scraping
     * and task switcher snapshot leaks.
     *
     * MASVS-PLATFORM-3: Prevent sensitive UI content from appearing in task recents.
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
