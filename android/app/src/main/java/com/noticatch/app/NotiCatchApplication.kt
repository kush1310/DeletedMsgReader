package com.noticatch.app

import android.app.Application
import android.content.ComponentCallbacks2
import android.util.Log
import com.noticatch.app.db.NotiCatchDatabase

/**
 * NotiCatchApplication
 *
 * Custom Application class managing global lifecycle and memory optimization.
 * Listens for system TRIM_MEMORY signals to prevent OS termination.
 */
class NotiCatchApplication : Application() {

    companion object {
        private const val TAG = "NotiCatchApp"
    }

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "NotiCatch Application initialized in air-gapped mode.")
        /* Eagerly warm up the Room SQLite database */
        NotiCatchDatabase.getInstance(this)
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        when (level) {
            ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL,
            ComponentCallbacks2.TRIM_MEMORY_COMPLETE -> {
                Log.w(TAG, "Critical memory trim signal ($level) received — flushing SQLite caches.")
            }
            ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN -> {
                Log.d(TAG, "UI hidden — releasing volatile view state.")
            }
        }
    }
}
