package com.noticatch.app.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase

/**
 * NotiCatchDatabase
 *
 * Room Database singleton for NotiCatch.
 * Version 1: schema with indexed messages and conversations tables.
 *
 * Features:
 *   - Write-Ahead Logging (WAL) mode for non-blocking concurrent reads and writes
 *   - Auto-vacuum configuration for reclaiming fragmented pages
 *   - 100% Parameterized query safety
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
         * Returns the singleton database instance configured with WAL mode.
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
                        db.execSQL("PRAGMA foreign_keys = ON;")
                        db.execSQL("PRAGMA synchronous = NORMAL;")
                        db.execSQL("PRAGMA temp_store = MEMORY;")
                        db.execSQL("PRAGMA mmap_size = 268435456;") // 256MB memory-mapped I/O
                        db.execSQL("PRAGMA cache_size = -4000;")     // 4MB page cache
                        db.execSQL("PRAGMA optimize;")               // Dynamic query-planner index optimization
                    }
                })
                .build()
                .also { instance = it }
            }
        }
    }
}
