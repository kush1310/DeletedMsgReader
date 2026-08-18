package com.noticatch.app.plugin

import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.text.TextUtils
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
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
import java.io.FileWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * MessageBridgePlugin
 *
 * Capacitor plugin exposing native Android capabilities to the TypeScript/React layer.
 * All plugin methods are non-blocking — they delegate to coroutines or callbacks
 * and resolve/reject the PluginCall asynchronously.
 *
 * Methods exposed to JS:
 *   - openNotificationSettings
 *   - isNotificationListenerEnabled
 *   - authenticateBiometric
 *   - requestBatteryExemption
 *   - getConversations
 *   - getMessages
 *   - wipeAllData
 *   - exportChatAsCSV
 *   - setSpamFilter
 */
@CapacitorPlugin(name = "MessageBridge")
class MessageBridgePlugin : Plugin() {

    private val pluginScope = CoroutineScope(Dispatchers.IO)

    /**
     * openNotificationSettings
     *
     * Opens the Android system notification listener settings panel.
     * The user must manually enable NotiCatch in this system list.
     *
     * @returns - JSObject { opened: true }
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
     *
     * @returns - JSObject { enabled: boolean }
     */
    @PluginMethod
    fun isNotificationListenerEnabled(call: PluginCall) {
        val packageName    = context.packageName
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
     * Supports fingerprint, face, and device credential fallback.
     * Resolves with { success: true } on acceptance or
     * { success: false, error: "..." } on failure or cancellation.
     *
     * @param  title     - Title text for the biometric dialog.
     * @param  subtitle  - Subtitle text for the biometric dialog.
     * @returns          - JSObject { success: boolean, error: string | null }
     */
    @PluginMethod
    fun authenticateBiometric(call: PluginCall) {
        val promptTitle    = call.getString("title",    "Unlock NotiCatch") ?: "Unlock NotiCatch"
        val promptSubtitle = call.getString("subtitle", "Use biometrics")   ?: "Use biometrics"

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
                    /* Single attempt failure — do not resolve yet; user may retry */
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
     * requestBatteryExemption
     *
     * Fires the ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS intent
     * to exempt NotiCatch from Android Doze mode restrictions.
     *
     * @returns - JSObject { requested: true }
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
     *
     * @returns - JSObject { conversations: JSArray of conversation objects }
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
     *
     * @param  conversationId  - UUID of the target conversation.
     * @returns                - JSObject { messages: JSArray of message objects }
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
     *
     * @returns - JSObject { messages: JSArray of deleted message objects }
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
     * Also clears EncryptedSharedPreferences session state.
     * This action is irreversible. Called only after user types "WIPE" in confirmation.
     *
     * @returns - JSObject { wiped: true }
     */
    @PluginMethod
    fun wipeAllData(call: PluginCall) {
        pluginScope.launch {
            val db = NotiCatchDatabase.getInstance(context)
            db.messageDao().deleteAll()
            db.conversationDao().deleteAll()

            context.getSharedPreferences(
                NotificationListener.PREFS_NAME,
                android.content.Context.MODE_PRIVATE
            ).edit().clear().apply()

            withContext(Dispatchers.Main) {
                val result = JSObject()
                result.put("wiped", true)
                call.resolve(result)
            }
        }
    }

    /**
     * exportChatAsCSV
     *
     * Queries all messages for a specific conversationId and writes them
     * to a CSV file in the app's external files directory.
     * Returns the file path for use with a share intent or direct user access.
     *
     * CSV format: Timestamp, Sender, Message, Deleted, Edited
     *
     * @param  conversationId  - UUID of the conversation to export.
     * @param  chatTitle       - Human-readable chat name for the filename.
     * @returns                - JSObject { filePath: string, rowCount: number }
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

            val dateFormat   = SimpleDateFormat("yyyy-MM-dd_HH-mm", Locale.getDefault())
            val exportDir    = context.getExternalFilesDir("exports") ?: context.filesDir
            val fileName     = "NotiCatch_${safeTitle}_${dateFormat.format(Date())}.csv"
            val outputFile   = File(exportDir, fileName)

            FileWriter(outputFile).use { writer ->
                writer.appendLine("Timestamp,Sender,Message,Deleted,Edited")
                for (m in messages) {
                    val ts      = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
                        .format(Date(m.timestamp))
                    val sender  = m.senderName.replace("\"", "\"\"")
                    val text    = (m.messageText ?: "").replace("\"", "\"\"")
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
     *
     * @param  enabled  - Boolean; true to suppress OTP/spam messages.
     * @returns         - JSObject { updated: true }
     */
    @PluginMethod
    fun setSpamFilter(call: PluginCall) {
        val enabled = call.getBoolean("enabled", true) ?: true
        context.getSharedPreferences(NotificationListener.PREFS_NAME, android.content.Context.MODE_PRIVATE)
            .edit()
            .putBoolean(NotificationListener.PREF_SPAM_FILTER, enabled)
            .apply()

        val result = JSObject()
        result.put("updated", true)
        call.resolve(result)
    }
}
