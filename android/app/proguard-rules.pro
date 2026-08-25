# ============================================================
# NotiCatch — ProGuard / R8 Keep Rules
# ============================================================
# Ensures Room, Capacitor, BiometricPrompt, and Kotlin Coroutines
# survive R8 code shrinking and obfuscation in release builds.
# ============================================================

# --------------------------------------------------
# Room Database: Keep all @Entity and @Dao annotated classes
# --------------------------------------------------
-keep class com.noticatch.app.db.** { *; }
-keep class * extends androidx.room.RoomDatabase { *; }
-keepclassmembers class * {
    @androidx.room.* <methods>;
}

# --------------------------------------------------
# Capacitor Plugin: Keep @PluginMethod annotated methods
# --------------------------------------------------
-keep class com.noticatch.app.plugin.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
}
-keep class com.getcapacitor.** { *; }

# --------------------------------------------------
# BiometricPrompt / AndroidX: Keep callback classes
# --------------------------------------------------
-keep class androidx.biometric.** { *; }
-keep class androidx.fragment.** { *; }

# --------------------------------------------------
# Kotlin Coroutines and Serialization
# --------------------------------------------------
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}
-dontwarn kotlinx.coroutines.**

# --------------------------------------------------
# NotificationListenerService: Preserve service binding
# --------------------------------------------------
-keep class com.noticatch.app.service.** { *; }

# --------------------------------------------------
# Application class
# --------------------------------------------------
-keep class com.noticatch.app.NotiCatchApplication { *; }
-keep class com.noticatch.app.MainActivity { *; }

# --------------------------------------------------
# Strip debug and verbose logging from release builds
# (MASVS-CODE-2: Prevent sensitive data leakage via logcat)
# --------------------------------------------------
-assumenosideeffects class android.util.Log {
    public static int d(...);
    public static int v(...);
}

# --------------------------------------------------
# Preserve line numbers for crash reporting
# --------------------------------------------------
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# --------------------------------------------------
# Suppress common R8 warnings for libraries
# --------------------------------------------------
-dontwarn com.google.android.gms.**
-dontwarn org.apache.**
