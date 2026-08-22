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
 * All queries are 100% parameterized — zero raw string concatenation.
 *
 * Performance:
 *   - Utilizes composite B-tree indexes for sub-millisecond retrieval
 *   - Sliding-window deduplication filter
 */
@Dao
interface MessageDao {

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(entity: MessageEntity)

    @Update
    suspend fun update(entity: MessageEntity)

    @Query("SELECT * FROM messages WHERE conversationId = :conversationId AND isPurged = 0 ORDER BY timestamp ASC")
    suspend fun getByConversation(conversationId: String): List<MessageEntity>

    @Query("SELECT * FROM messages WHERE conversationId = :conversationId AND isPurged = 0 ORDER BY timestamp ASC LIMIT :limit OFFSET :offset")
    suspend fun getPaginatedByConversation(conversationId: String, limit: Int, offset: Int): List<MessageEntity>

    @Query("SELECT * FROM messages WHERE isDeletedBySender = 1 AND isPurged = 0 ORDER BY timestamp DESC")
    suspend fun getAllDeleted(): List<MessageEntity>

    @Query("SELECT * FROM messages WHERE isEdited = 1 AND isPurged = 0 ORDER BY editedAt DESC")
    suspend fun getAllEdited(): List<MessageEntity>

    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
          AND messageText = :text
          AND timestamp >= :minTimestamp
          AND timestamp <= :maxTimestamp
          AND isPurged = 0
        LIMIT 1
    """)
    suspend fun findDuplicate(
        conversationId: String,
        text:           String,
        minTimestamp:   Long,
        maxTimestamp:   Long,
    ): MessageEntity?

    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
          AND (
            (senderName = :senderName AND messageText = :text AND timestamp >= :minTimestamp AND timestamp <= :maxTimestamp)
            OR
            (messageText = :text AND timestamp >= :minTimestamp AND timestamp <= :maxTimestamp)
          )
          AND isPurged = 0
        LIMIT 1
    """)
    suspend fun findDuplicateWithSender(
        conversationId: String,
        senderName:     String,
        text:           String,
        minTimestamp:   Long,
        maxTimestamp:   Long,
    ): MessageEntity?

    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
          AND senderName = :senderName
          AND timestamp >= :beforeTimestamp - 604800000
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

    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
          AND timestamp >= :beforeTimestamp - 604800000
          AND isDeletedBySender = 0
          AND isPurged = 0
        ORDER BY timestamp DESC
        LIMIT 1
    """)
    suspend fun findRecentInConversation(
        conversationId:  String,
        beforeTimestamp: Long,
    ): MessageEntity?

    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
          AND senderName = :senderName
          AND timestamp >= :beforeTimestamp - 900000
          AND isDeletedBySender = 0
          AND isPurged = 0
        ORDER BY timestamp DESC
        LIMIT 1
    """)
    suspend fun findRecentForEdit(
        conversationId:  String,
        senderName:      String,
        beforeTimestamp: Long,
    ): MessageEntity?

    @Query("SELECT * FROM messages WHERE isPurged = 0 ORDER BY timestamp DESC")
    suspend fun getAll(): List<MessageEntity>

    @Query("SELECT COUNT(*) FROM messages WHERE isPurged = 0")
    suspend fun countAll(): Int

    @Query("SELECT COUNT(*) FROM messages WHERE isDeletedBySender = 1 AND isPurged = 0")
    suspend fun countDeleted(): Int

    @Query("UPDATE messages SET isPurged = 1, purgedAt = :now WHERE timestamp < :cutoffTimestamp")
    suspend fun purgeOldMessages(cutoffTimestamp: Long, now: Long = System.currentTimeMillis())

    @Query("DELETE FROM messages WHERE conversationId = :conversationId")
    suspend fun deleteByConversation(conversationId: String)

    @Query("DELETE FROM messages")
    suspend fun deleteAll()
}
