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
 * All queries are 100% parameterized — zero raw string concatenation.
 */
@Dao
interface ConversationDao {

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insert(entity: ConversationEntity)

    @Update
    suspend fun update(entity: ConversationEntity)

    @Query("SELECT * FROM conversations WHERE id = :id LIMIT 1")
    suspend fun findById(id: String): ConversationEntity?

    @Query("SELECT * FROM conversations WHERE conversationKey = :key LIMIT 1")
    suspend fun findByKey(key: String): ConversationEntity?

    @Query("SELECT * FROM conversations WHERE LOWER(TRIM(chatTitle)) = LOWER(TRIM(:title)) LIMIT 1")
    suspend fun findByTitle(title: String): ConversationEntity?

    @Query("SELECT * FROM conversations WHERE LOWER(TRIM(chatTitle)) = LOWER(TRIM(:title))")
    suspend fun findAllByTitle(title: String): List<ConversationEntity>

    @Query("SELECT * FROM conversations ORDER BY lastMessageTimestamp DESC")
    suspend fun getAll(): List<ConversationEntity>

    @Query("UPDATE conversations SET unreadCount = 0 WHERE id = :id")
    suspend fun markAsRead(id: String)

    @Query("DELETE FROM conversations WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("DELETE FROM conversations")
    suspend fun deleteAll()
}
