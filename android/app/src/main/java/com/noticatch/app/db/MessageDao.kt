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
     * within a 72-hour sliding window before the deletion timestamp.
     * Matches WhatsApp's "Delete for Everyone" protocol ceiling (~60 hours).
     *
     * @param  conversationId  - Parent conversation UUID.
     * @param  senderName      - Display name of the sender.
     * @param  beforeTimestamp - Deletion event timestamp; search range is -259200000ms (72h).
     * @returns                - Most recent matching MessageEntity or null.
     */
    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
          AND senderName = :senderName
          AND timestamp >= :beforeTimestamp - 259200000
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
     * findRecentInConversation
     *
     * Fallback lookup: matches the most recent non-deleted message in the conversation
     * within the 72-hour window when senderName varies between individual messages and group summaries.
     *
     * @param  conversationId  - Parent conversation UUID.
     * @param  beforeTimestamp - Deletion event timestamp.
     * @returns                - Most recent active MessageEntity or null.
     */
    @Query("""
        SELECT * FROM messages
        WHERE conversationId = :conversationId
          AND timestamp >= :beforeTimestamp - 259200000
          AND isDeletedBySender = 0
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
