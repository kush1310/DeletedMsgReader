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
 * All queries are parameterized — no raw string concatenation.
 *
 * DBMS Security: OnConflictStrategy.IGNORE prevents duplicate
 * insertion when the same notificationId is processed more than once.
 */
@Dao
interface MessageDao {

    /**
     * insert
     *
     * Inserts a MessageEntity into the messages table.
     * Ignores duplicate records to prevent notification replay duplicates.
     *
     * @param  entity  - Fully constructed MessageEntity with valid UUIDs.
     */
    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(entity: MessageEntity)

    /**
     * update
     *
     * Updates an existing MessageEntity record (used to mark deletion).
     *
     * @param  entity  - MessageEntity with updated fields.
     */
    @Update
    suspend fun update(entity: MessageEntity)

    /**
     * getByConversation
     *
     * Returns all messages for a given conversation in ascending timestamp order.
     * Production equivalent: SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC
     *
     * @param  conversationId  - UUID of the parent conversation.
     * @returns                - List of MessageEntity in chronological order.
     */
    @Query("SELECT * FROM messages WHERE conversationId = :conversationId ORDER BY timestamp ASC")
    suspend fun getByConversation(conversationId: String): List<MessageEntity>

    /**
     * getAllDeleted
     *
     * Returns all messages flagged as deleted across all conversations,
     * sorted by timestamp descending (most recently deleted first).
     *
     * @returns - List of deleted MessageEntity records.
     */
    @Query("SELECT * FROM messages WHERE isDeletedBySender = 1 ORDER BY timestamp DESC")
    suspend fun getAllDeleted(): List<MessageEntity>

    /**
     * findRecentBySender
     *
     * Searches for a message from a specific sender in a conversation
     * within a 2-minute window before the deletion timestamp.
     * Used to match deletion signals to their original captured message.
     *
     * @param  conversationId  - Parent conversation UUID.
     * @param  senderName      - Display name of the sender.
     * @param  beforeTimestamp - Deletion event timestamp; search range is -120000ms.
     * @returns                - Most recent matching MessageEntity or null.
     */
    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
          AND senderName = :senderName
          AND timestamp >= :beforeTimestamp - 120000
          AND isDeletedBySender = 0
        ORDER BY timestamp DESC
        LIMIT 1
    """)
    suspend fun findRecentBySender(
        conversationId:  String,
        senderName:      String,
        beforeTimestamp: Long,
    ): MessageEntity?

    /**
     * getAll
     *
     * Returns all messages across all conversations sorted by timestamp descending.
     * Used for export and statistics computation.
     *
     * @returns - Complete list of all MessageEntity records.
     */
    @Query("SELECT * FROM messages ORDER BY timestamp DESC")
    suspend fun getAll(): List<MessageEntity>

    /**
     * deleteAll
     *
     * Permanently removes all message records from the table.
     * Called only from the Wipe All Data confirmed user action.
     */
    @Query("DELETE FROM messages")
    suspend fun deleteAll()
}
