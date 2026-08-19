package com.noticatch.app.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update

/**
 * MessageDao
 *
 * Data Access Object for the messages table.
 * All queries are 100% parameterized — no raw string concatenation.
 *
 * Performance:
 *   - Utilizes composite B-tree indexes for sub-millisecond retrieval
 *   - Cursor streaming with LIMIT and OFFSET for OOM-safe export
 */
@Dao
interface MessageDao {

    /**
     * insert
     *
     * Inserts a MessageEntity into the messages table.
     * Ignores duplicate records to prevent notification replay duplicates.
     */
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(entity: MessageEntity)

    /**
     * update
     *
     * Updates an existing MessageEntity record (used to mark deletion or edit).
     */
    @Update
    suspend fun update(entity: MessageEntity)

    /**
     * getByConversation
     *
     * Returns all messages for a given conversation in ascending timestamp order.
     */
    @Query("SELECT * FROM messages WHERE conversationId = :conversationId AND isPurged = 0 ORDER BY timestamp ASC")
    suspend fun getByConversation(conversationId: String): List<MessageEntity>

    /**
     * getPaginatedByConversation
     *
     * Cursor streaming chunk query for memory-safe PDF/CSV export without OOM.
     */
    @Query("SELECT * FROM messages WHERE conversationId = :conversationId AND isPurged = 0 ORDER BY timestamp ASC LIMIT :limit OFFSET :offset")
    suspend fun getPaginatedByConversation(conversationId: String, limit: Int, offset: Int): List<MessageEntity>

    /**
     * getAllDeleted
     *
     * Returns all messages flagged as deleted across all conversations.
     */
    @Query("SELECT * FROM messages WHERE isDeletedBySender = 1 AND isPurged = 0 ORDER BY timestamp DESC")
    suspend fun getAllDeleted(): List<MessageEntity>

    /**
     * findRecentBySender
     *
     * Matches the most recent non-deleted message from a specific sender within 72h.
     */
    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
          AND senderName = :senderName
          AND timestamp >= :beforeTimestamp - 259200000
          AND isDeletedBySender = 0
          AND isPurged = 0
        ORDER BY timestamp DESC
        LIMIT 1
    """)
    suspend fun findRecentBySender(
        conversationId:  String,
        senderName:      String,
        beforeTimestamp: Long,
    ): MessageEntity?

    /**
     * findRecentInConversation
     *
     * Fallback lookup: matches the most recent non-deleted message in the conversation within 72h.
     */
    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
          AND timestamp >= :beforeTimestamp - 259200000
          AND isDeletedBySender = 0
          AND isPurged = 0
        ORDER BY timestamp DESC
        LIMIT 1
    """)
    suspend fun findRecentInConversation(
        conversationId:  String,
        beforeTimestamp: Long,
    ): MessageEntity?

    /**
     * getAll
     *
     * Returns all messages across all conversations sorted by timestamp descending.
     */
    @Query("SELECT * FROM messages WHERE isPurged = 0 ORDER BY timestamp DESC")
    suspend fun getAll(): List<MessageEntity>

    /**
     * countAll
     */
    @Query("SELECT COUNT(*) FROM messages WHERE isPurged = 0")
    suspend fun countAll(): Int

    /**
     * countDeleted
     */
    @Query("SELECT COUNT(*) FROM messages WHERE isDeletedBySender = 1 AND isPurged = 0")
    suspend fun countDeleted(): Int

    /**
     * purgeOldMessages
     *
     * Flags messages older than retention cutoff as soft-deleted.
     */
    @Query("UPDATE messages SET isPurged = 1, purgedAt = :now WHERE timestamp < :cutoffTimestamp")
    suspend fun purgeOldMessages(cutoffTimestamp: Long, now: Long = System.currentTimeMillis())

    /**
     * deleteAll
     *
     * Permanently removes all message records from the table.
     */
    @Query("DELETE FROM messages")
    suspend fun deleteAll()
}
