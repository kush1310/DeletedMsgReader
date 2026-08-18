package com.noticatch.app.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update

/**
 * ConversationDao
 *
 * Data Access Object for the conversations table.
 * All queries are parameterized — no raw string concatenation.
 */
@Dao
interface ConversationDao {

    /**
     * insert
     *
     * Inserts a ConversationEntity. Ignores conflicts on conversationKey
     * uniqueness constraint — use update() for existing records.
     *
     * @param  entity  - New ConversationEntity to persist.
     */
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(entity: ConversationEntity)

    /**
     * update
     *
     * Updates an existing ConversationEntity (e.g. unreadCount increment).
     *
     * @param  entity  - ConversationEntity with updated field values.
     */
    @Update
    suspend fun update(entity: ConversationEntity)

    /**
     * findByKey
     *
     * Retrieves a conversation by its unique conversation key.
     * Returns null if no matching conversation exists yet.
     *
     * @param  key  - Conversation key string (groupKey or package_senderName).
     * @returns     - ConversationEntity or null.
     */
    @Query("SELECT * FROM conversations WHERE conversationKey = :key LIMIT 1")
    suspend fun findByKey(key: String): ConversationEntity?

    /**
     * getAll
     *
     * Returns all conversations sorted by lastMessageTimestamp descending.
     * Production equivalent: SELECT * FROM conversations ORDER BY last_message_timestamp DESC
     *
     * @returns - List of ConversationEntity sorted most-recent-first.
     */
    @Query("SELECT * FROM conversations ORDER BY lastMessageTimestamp DESC")
    suspend fun getAll(): List<ConversationEntity>

    /**
     * deleteAll
     *
     * Permanently removes all conversation records.
     * Called only from the Wipe All Data confirmed user action.
     */
    @Query("DELETE FROM conversations")
    suspend fun deleteAll()
}
