package com.noticatch.app.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query

/**
 * DiagnosticLogDao
 *
 * Data Access Object for persisting and querying runtime diagnostic logs and errors.
 */
@Dao
interface DiagnosticLogDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(log: DiagnosticLogEntity)

    @Query("SELECT * FROM diagnostic_logs ORDER BY timestamp DESC LIMIT :limit OFFSET :offset")
    suspend fun getAll(limit: Int = 200, offset: Int = 0): List<DiagnosticLogEntity>

    @Query("SELECT * FROM diagnostic_logs WHERE level = :level ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getByLevel(level: String, limit: Int = 100): List<DiagnosticLogEntity>

    @Query("""
        SELECT * FROM diagnostic_logs 
        WHERE message LIKE '%' || :query || '%' 
           OR tag LIKE '%' || :query || '%'
        ORDER BY timestamp DESC LIMIT 100
    """)
    suspend fun searchLogs(query: String): List<DiagnosticLogEntity>

    @Query("DELETE FROM diagnostic_logs")
    suspend fun clearAll()

    @Query("SELECT COUNT(*) FROM diagnostic_logs")
    suspend fun count(): Int
}
