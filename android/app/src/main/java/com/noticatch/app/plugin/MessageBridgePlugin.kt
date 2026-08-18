package com.noticatch.app.plugin

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.view.WindowManager
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.noticatch.app.db.NotiCatchDatabase
import com.noticatch.app.service.NotificationListener
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * MessageBridgePlugin
 *
 * Capacitor plugin exposing native Android capabilities to the TypeScript/React layer.
 * All plugin methods are non-blocking and delegate asynchronously.
 *
 * Includes an internal BroadcastReceiver that listens for NotificationListener.ACTION_NEW_MESSAGE
 * and dispatches a 'noticatch:new-message' CustomEvent directly to the React WebView DOM.
 */
@CapacitorPlugin(name = "MessageBridge")
class MessageBridgePlugin : Plugin() {

    private val pluginScope = CoroutineScope(Dispatchers.IO)

    private val messageReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == NotificationListener.ACTION_NEW_MESSAGE) {
                activity?.runOnUiThread {
                    bridge?.webView?.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('noticatch:new-message'));",
                        null
                    )
                }
            }
        }
    }

    override fun load() {
        super.load()
        val filter = IntentFilter(NotificationListener.ACTION_NEW_MESSAGE)
        LocalBroadcastManager.getInstance(context).registerReceiver(messageReceiver, filter)
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        LocalBroadcastManager.getInstance(context).unregisterReceiver(messageReceiver)
    }

    /**
     * openNotificationSettings
     *
     * Opens the Android system notification listener settings panel.
     */
    @PluginMethod
    fun openNotificationSettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        activity.startActivity(intent)
        val result = JSObject()
        result.put("opened", true)
        call.resolve(result)
    }

    /**
     * isNotificationListenerEnabled
     *
     * Checks whether NotiCatch's NotificationListenerService is currently
     * enabled in Android system notification access settings.
     */
    @PluginMethod
    fun isNotificationListenerEnabled(call: PluginCall) {
        val packageName     = context.packageName
        val enabledPackages = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners",
        ) ?: ""
        val enabled = enabledPackages.contains(packageName)
        val result  = JSObject()
        result.put("enabled", enabled)
        call.resolve(result)
    }

    /**
     * authenticateBiometric
     *
     * Invokes the Android BiometricPrompt to authenticate the user.
     */
    @PluginMethod
    fun authenticateBiometric(call: PluginCall) {
        val promptTitle    = call.getString("title",    "Unlock NotiCatch") ?: "Unlock NotiCatch"
        val promptSubtitle = call.getString("subtitle", "Use device fingerprint to unlock") ?: "Use device fingerprint to unlock"

        val executor = ContextCompat.getMainExecutor(context)

        val biometricPrompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    val response = JSObject()
                    response.put("success", true)
                    response.put("error",   null)
                    call.resolve(response)
                }

                override fun onAuthenticationFailed() {
                    /* Single attempt failure — user may retry */
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    val response = JSObject()
                    response.put("success", false)
                    response.put("error",   errString.toString())
                    call.resolve(response)
                }
            }
        )

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(promptTitle)
            .setSubtitle(promptSubtitle)
            .setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG or
                BiometricManager.Authenticators.DEVICE_CREDENTIAL
            )
            .build()

        activity.runOnUiThread { biometricPrompt.authenticate(promptInfo) }
    }

    /**
     * setScreenSecure
     *
     * Dynamically enables or disables FLAG_SECURE on the Android window
     * to prevent or allow screenshot capture and task switcher previews.
     */
    @PluginMethod
    fun setScreenSecure(call: PluginCall) {
        val enabled = call.getBoolean("enabled", true) ?: true

        context.getSharedPreferences(NotificationListener.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean("screen_secure_enabled", enabled)
            .apply()

        activity?.runOnUiThread {
            if (enabled) {
                activity?.window?.setFlags(
                    WindowManager.LayoutParams.FLAG_SECURE,
                    WindowManager.LayoutParams.FLAG_SECURE
                )
            } else {
                activity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
            }
        }

        val result = JSObject()
        result.put("updated", true)
        call.resolve(result)
    }

    /**
     * setSessionTimeout
     *
     * Persists the session timeout value to native SharedPreferences.
     */
    @PluginMethod
    fun setSessionTimeout(call: PluginCall) {
        val timeoutSeconds = call.getInt("timeoutSeconds", 300) ?: 300

        context.getSharedPreferences(NotificationListener.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putInt("session_timeout_seconds", timeoutSeconds)
            .apply()

        val result = JSObject()
        result.put("updated", true)
        call.resolve(result)
    }

    /**
     * requestBatteryExemption
     *
     * Fires ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS intent.
     */
    @PluginMethod
    fun requestBatteryExemption(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(
                android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
            ).apply {
                data  = android.net.Uri.parse("package:${context.packageName}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            activity.startActivity(intent)
        }
        val result = JSObject()
        result.put("requested", true)
        call.resolve(result)
    }

    /**
     * getConversations
     *
     * Queries Room DB for all conversations sorted by lastMessageTimestamp DESC.
     */
    @PluginMethod
    fun getConversations(call: PluginCall) {
        pluginScope.launch {
            val conversations = NotiCatchDatabase.getInstance(context)
                .conversationDao()
                .getAll()

            val array = JSArray()
            for (c in conversations) {
                val obj = JSObject()
                obj.put("id",                   c.id)
                obj.put("contactId",            c.id)
                obj.put("chatTitle",            c.chatTitle)
                obj.put("isGroup",              c.isGroup)
                obj.put("unreadCount",          c.unreadCount)
                obj.put("lastMessageTimestamp", c.lastMessageTimestamp)
                obj.put("deletedCount",         c.deletedCount)
                array.put(obj)
            }

            withContext(Dispatchers.Main) {
                val result = JSObject()
                result.put("conversations", array)
                call.resolve(result)
            }
        }
    }

    /**
     * getMessages
     *
     * Queries Room DB for all messages within a given conversationId.
     */
    @PluginMethod
    fun getMessages(call: PluginCall) {
        val conversationId = call.getString("conversationId") ?: run {
            call.reject("conversationId is required")
            return
        }

        pluginScope.launch {
            val messages = NotiCatchDatabase.getInstance(context)
                .messageDao()
                .getByConversation(conversationId)

            val array = JSArray()
            for (m in messages) {
                val obj = JSObject()
                obj.put("id",                m.id)
                obj.put("conversationId",    m.conversationId)
                obj.put("senderName",        m.senderName)
                obj.put("messageText",       m.messageText)
                obj.put("notificationId",    m.notificationId)
                obj.put("timestamp",         m.timestamp)
                obj.put("isDeletedBySender", m.isDeletedBySender)
                obj.put("isEdited",          m.isEdited)
                obj.put("mediaType",         m.mediaType)
                obj.put("mediaPath",         m.mediaPath)
                obj.put("hashSignature",     m.hashSignature)
                array.put(obj)
            }

            withContext(Dispatchers.Main) {
                val result = JSObject()
                result.put("messages", array)
                call.resolve(result)
            }
        }
    }

    /**
     * getDeletedMessages
     *
     * Queries Room DB for all messages with isDeletedBySender = true
     * across all conversations, sorted by timestamp DESC.
     */
    @PluginMethod
    fun getDeletedMessages(call: PluginCall) {
        pluginScope.launch {
            val messages = NotiCatchDatabase.getInstance(context)
                .messageDao()
                .getAllDeleted()

            val array = JSArray()
            for (m in messages) {
                val obj = JSObject()
                obj.put("id",                m.id)
                obj.put("conversationId",    m.conversationId)
                obj.put("senderName",        m.senderName)
                obj.put("messageText",       m.messageText)
                obj.put("notificationId",    m.notificationId)
                obj.put("timestamp",         m.timestamp)
                obj.put("isDeletedBySender", m.isDeletedBySender)
                obj.put("isEdited",          m.isEdited)
                obj.put("mediaType",         m.mediaType)
                obj.put("mediaPath",         m.mediaPath)
                obj.put("hashSignature",     m.hashSignature)
                array.put(obj)
            }

            withContext(Dispatchers.Main) {
                val result = JSObject()
                result.put("messages", array)
                call.resolve(result)
            }
        }
    }

    /**
     * wipeAllData
     *
     * Permanently deletes all message and conversation records from Room DB.
     */
    @PluginMethod
    fun wipeAllData(call: PluginCall) {
        pluginScope.launch {
            val db = NotiCatchDatabase.getInstance(context)
            db.messageDao().deleteAll()
            db.conversationDao().deleteAll()

            context.getSharedPreferences(
                NotificationListener.PREFS_NAME,
                Context.MODE_PRIVATE
            ).edit().clear().apply()

            withContext(Dispatchers.Main) {
                val result = JSObject()
                result.put("wiped", true)
                call.resolve(result)
            }
        }
    }

    /**
     * exportChatAsPDF
     *
     * Generates a multi-page PDF document for a specific chat conversation
     * using Android's native PdfDocument API and triggers an Intent to view/share.
     */
    @PluginMethod
    fun exportChatAsPDF(call: PluginCall) {
        val conversationId = call.getString("conversationId") ?: run {
            call.reject("conversationId is required")
            return
        }
        val chatTitle = call.getString("chatTitle") ?: "chat"
        val safeTitle = chatTitle.replace(Regex("[^a-zA-Z0-9_\\- ]"), "_").take(40)

        pluginScope.launch {
            val messages = NotiCatchDatabase.getInstance(context)
                .messageDao()
                .getByConversation(conversationId)

            val exportDir  = context.getExternalFilesDir("exports") ?: context.filesDir
            val dateFormat = SimpleDateFormat("yyyy-MM-dd_HH-mm", Locale.getDefault())
            val pdfFile    = File(exportDir, "NotiCatch_${safeTitle}_${dateFormat.format(Date())}.pdf")

            val pdfDocument = PdfDocument()
            val pageWidth   = 595 // Standard A4 width at 72dpi
            val pageHeight  = 842 // Standard A4 height at 72dpi
            var pageNumber  = 1

            var currentY = 50f
            var pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
            var page = pdfDocument.startPage(pageInfo)
            var canvas = page.canvas

            val titlePaint = Paint().apply {
                color = Color.rgb(20, 20, 20)
                textSize = 16f
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                isAntiAlias = true
            }

            val subtitlePaint = Paint().apply {
                color = Color.rgb(100, 100, 100)
                textSize = 10f
                typeface = Typeface.DEFAULT
                isAntiAlias = true
            }

            val textPaint = Paint().apply {
                color = Color.rgb(30, 30, 30)
                textSize = 10f
                typeface = Typeface.DEFAULT
                isAntiAlias = true
            }

            val deletedBadgePaint = Paint().apply {
                color = Color.rgb(180, 40, 40)
                textSize = 9f
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                isAntiAlias = true
            }

            val linePaint = Paint().apply {
                color = Color.rgb(220, 220, 220)
                strokeWidth = 1f
            }

            // Draw Header
            canvas.drawText("NotiCatch — WhatsApp Chat Archive", 40f, currentY, titlePaint)
            currentY += 20f
            canvas.drawText("Conversation: $chatTitle | Exported: ${SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(Date())}", 40f, currentY, subtitlePaint)
            currentY += 15f
            canvas.drawLine(40f, currentY, pageWidth - 40f, currentY, linePaint)
            currentY += 25f

            val timeFormat = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault())

            for (m in messages) {
                if (currentY > pageHeight - 60f) {
                    pdfDocument.finishPage(page)
                    pageNumber++
                    pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
                    page = pdfDocument.startPage(pageInfo)
                    canvas = page.canvas
                    currentY = 50f
                }

                val timeStr = timeFormat.format(Date(m.timestamp))
                val senderHeader = "[ $timeStr ] ${m.senderName}"
                canvas.drawText(senderHeader, 40f, currentY, subtitlePaint)

                if (m.isDeletedBySender) {
                    canvas.drawText("[ DELETED BY SENDER ]", pageWidth - 160f, currentY, deletedBadgePaint)
                }

                currentY += 14f
                val body = m.messageText ?: "(Media Attachment)"
                // Truncate or wrap line
                val maxCharsPerLine = 75
                val lines = body.chunked(maxCharsPerLine)
                for (line in lines) {
                    if (currentY > pageHeight - 40f) {
                        pdfDocument.finishPage(page)
                        pageNumber++
                        pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, pageNumber).create()
                        page = pdfDocument.startPage(pageInfo)
                        canvas = page.canvas
                        currentY = 50f
                    }
                    canvas.drawText(line, 50f, currentY, textPaint)
                    currentY += 14f
                }
                currentY += 8f
            }

            pdfDocument.finishPage(page)

            FileOutputStream(pdfFile).use { out ->
                pdfDocument.writeTo(out)
            }
            pdfDocument.close()

            // Open Android Share/View Sheet
            try {
                val uri: Uri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    pdfFile
                )
                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "application/pdf"
                    putExtra(Intent.EXTRA_STREAM, uri)
                    putExtra(Intent.EXTRA_SUBJECT, "NotiCatch Archive: $chatTitle")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                activity.startActivity(Intent.createChooser(shareIntent, "Share Chat PDF"))
            } catch (_: Exception) {
                // Non-critical if share dialog fails
            }

            withContext(Dispatchers.Main) {
                val result = JSObject()
                result.put("filePath", pdfFile.absolutePath)
                result.put("rowCount", messages.size)
                call.resolve(result)
            }
        }
    }

    /**
     * exportChatAsCSV
     *
     * Queries all messages for a specific conversationId and writes them
     * to a CSV file in the app's external files directory.
     */
    @PluginMethod
    fun exportChatAsCSV(call: PluginCall) {
        val conversationId = call.getString("conversationId") ?: run {
            call.reject("conversationId is required")
            return
        }
        val chatTitle = call.getString("chatTitle") ?: "chat"
        val safeTitle = chatTitle.replace(Regex("[^a-zA-Z0-9_\\- ]"), "_").take(40)

        pluginScope.launch {
            val messages = NotiCatchDatabase.getInstance(context)
                .messageDao()
                .getByConversation(conversationId)

            val dateFormat = SimpleDateFormat("yyyy-MM-dd_HH-mm", Locale.getDefault())
            val exportDir  = context.getExternalFilesDir("exports") ?: context.filesDir
            val outputFile = File(exportDir, "NotiCatch_${safeTitle}_${dateFormat.format(Date())}.csv")

            FileWriter(outputFile).use { writer ->
                writer.appendLine("Timestamp,Sender,Message,Deleted,Edited")
                for (m in messages) {
                    val ts     = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
                        .format(Date(m.timestamp))
                    val sender = m.senderName.replace("\"", "\"\"")
                    val text   = (m.messageText ?: "").replace("\"", "\"\"")
                    writer.appendLine("\"$ts\",\"$sender\",\"$text\",${m.isDeletedBySender},${m.isEdited}")
                }
            }

            withContext(Dispatchers.Main) {
                val result = JSObject()
                result.put("filePath", outputFile.absolutePath)
                result.put("rowCount", messages.size)
                call.resolve(result)
            }
        }
    }

    /**
     * setSpamFilter
     *
     * Updates the spam filter preference flag that NotificationListener
     * reads before persisting OTP/spam classified notifications.
     */
    @PluginMethod
    fun setSpamFilter(call: PluginCall) {
        val enabled = call.getBoolean("enabled", true) ?: true
        context.getSharedPreferences(NotificationListener.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(NotificationListener.PREF_SPAM_FILTER, enabled)
            .apply()

        val result = JSObject()
        result.put("updated", true)
        call.resolve(result)
    }
}
