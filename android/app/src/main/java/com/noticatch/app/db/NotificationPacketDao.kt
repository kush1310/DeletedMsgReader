package com.noticatch.app.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

/**
 * NotificationPacketDao
 *
 * Data Access Object for querying and aggregating deep notification telemetry packets.
 */
@Dao
interface NotificationPacketDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(packet: NotificationPacketEntity)

    @Query("SELECT * FROM notification_packets ORDER BY postTime DESC LIMIT :limit OFFSET :offset")
    suspend fun getAll(limit: Int = 200, offset: Int = 0): List<NotificationPacketEntity>

    @Query("SELECT * FROM notification_packets WHERE timeSlot = :slot ORDER BY postTime DESC")
    suspend fun getByTimeSlot(slot: String): List<NotificationPacketEntity>

    @Query("SELECT DISTINCT timeSlot FROM notification_packets ORDER BY postTime DESC LIMIT 50")
    suspend fun getDistinctTimeSlots(): List<String>

    @Query("""
        SELECT * FROM notification_packets 
        WHERE rawTitle LIKE '%' || :query || '%' 
           OR rawText LIKE '%' || :query || '%'
           OR parsedSender LIKE '%' || :query || '%'
           OR parsedChatTitle LIKE '%' || :query || '%'
        ORDER BY postTime DESC LIMIT 100
    """)
    suspend fun searchPackets(query: String): List<NotificationPacketEntity>

    @Query("DELETE FROM notification_packets")
    suspend fun clearAll()

    @Query("SELECT COUNT(*) FROM notification_packets")
    suspend fun count(): Int
}
