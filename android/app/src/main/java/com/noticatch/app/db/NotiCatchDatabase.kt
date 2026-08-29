package com.noticatch.app.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase

/**
 * NotiCatchDatabase
 *
 * High-performance Room Database singleton for NotiCatch.
 * Configured with Write-Ahead Logging (WAL), 256MB memory-mapped I/O,
 * 8MB dedicated page cache, secure deletion, and auto-checkpointing.
 */
@Database(
    entities = [MessageEntity::class, ConversationEntity::class],
    version  = 1,
    exportSchema = false,
)
abstract class NotiCatchDatabase : RoomDatabase() {

    abstract fun messageDao():      MessageDao
    abstract fun conversationDao(): ConversationDao

    companion object {
        @Volatile
        private var instance: NotiCatchDatabase? = null

        /**
         * getInstance
         *
         * Returns the singleton database instance configured with WAL mode and optimized PRAGMAs.
         */
        fun getInstance(context: Context): NotiCatchDatabase {
            return instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    NotiCatchDatabase::class.java,
                    "noticatch.db",
                )
                .setJournalMode(JournalMode.WRITE_AHEAD_LOGGING)
                .fallbackToDestructiveMigration()
                .addCallback(object : Callback() {
                    override fun onOpen(db: SupportSQLiteDatabase) {
                        super.onOpen(db)
                        try {
                            db.execSQL("PRAGMA foreign_keys = ON;")
                            db.execSQL("PRAGMA synchronous = NORMAL;")
                            db.execSQL("PRAGMA temp_store = MEMORY;")
                            db.execSQL("PRAGMA mmap_size = 268435456;") // 256MB memory-mapped I/O
                            db.execSQL("PRAGMA cache_size = -8000;")     // 8MB dedicated page cache
                            db.execSQL("PRAGMA busy_timeout = 5000;")    // 5000ms busy retry timeout
                            db.execSQL("PRAGMA wal_autocheckpoint = 1000;") // Checkpoint every 1000 pages
                            /* MASVS-STORAGE-2: Overwrite deleted data pages with zeroes
                               to prevent forensic recovery of deleted messages */
                            db.execSQL("PRAGMA secure_delete = ON;")
                            /* Bound WAL file growth to 8MB to prevent disk exhaustion */
                            db.execSQL("PRAGMA journal_size_limit = 8388608;")
                            db.execSQL("PRAGMA optimize;")               // Dynamic query-planner index optimization
                        } catch (e: Exception) {
                            android.util.Log.w("NotiCatchDB", "Non-fatal SQLite PRAGMA initialization warning: ${e.message}")
                        }
                    }
                })
                .build()
                .also { instance = it }
            }
        }
    }
}
