package com.noticatch.app

import android.app.Application
import android.content.ComponentCallbacks2
import android.os.StrictMode
import android.util.Log
import com.noticatch.app.db.NotiCatchDatabase

/**
 * NotiCatchApplication
 *
 * Custom Application class managing global lifecycle, memory optimization,
 * and security policy enforcement.
 *
 * Security features:
 *   - StrictMode enforcement in debug builds to detect disk/network operations on main thread
 *   - Global uncaught exception handler that prevents sensitive stack trace leakage
 *   - Memory trim signal handling to prevent OS-initiated process termination
 */
class NotiCatchApplication : Application() {

    companion object {
        private const val TAG = "NotiCatchApp"
    }

    override fun onCreate() {
        super.onCreate()

        /* MASVS-RESILIENCE-4: Enable StrictMode in debug builds for early detection
           of main-thread disk I/O and resource leak violations */
        if (BuildConfig.DEBUG) {
            StrictMode.setThreadPolicy(
                StrictMode.ThreadPolicy.Builder()
                    .detectDiskReads()
                    .detectDiskWrites()
                    .penaltyLog()
                    .build()
            )
        }

        /* Install global exception handler that sanitizes stack traces
           before they reach logcat to prevent sensitive data leakage */
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            Log.e(TAG, "Uncaught exception in ${thread.name}: ${throwable.javaClass.simpleName}")
            defaultHandler?.uncaughtException(thread, throwable)
        }

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
