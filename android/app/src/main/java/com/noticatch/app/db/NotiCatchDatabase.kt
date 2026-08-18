package com.noticatch.app.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

/**
 * NotiCatchDatabase
 *
 * Room Database singleton for NotiCatch.
 * Version 1: initial schema with messages and conversations tables.
 *
 * Security: database file is stored in app-private internal storage.
 * For production hardening, SQLCipher integration can be added by
 * replacing the Room builder with SupportFactory from net.zetetic:android-database-sqlcipher.
 *
 * DBMS: Room provides compile-time SQL verification, preventing
 * runtime SQL injection through parameterized query enforcement.
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
         * Returns the singleton database instance using double-checked locking.
         * Creates the database on first access. Thread-safe via synchronized block.
         *
         * @param  context  - Application context for database file location.
         * @returns         - Singleton NotiCatchDatabase instance.
         */
        fun getInstance(context: Context): NotiCatchDatabase {
            return instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    NotiCatchDatabase::class.java,
                    "noticatch.db",
                )
                .fallbackToDestructiveMigration()
                .build()
                .also { instance = it }
            }
        }
    }
}
