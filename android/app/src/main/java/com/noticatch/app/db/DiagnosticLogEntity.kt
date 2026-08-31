package com.noticatch.app.db

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Index

/**
 * DiagnosticLogEntity
 *
 * Runtime error and diagnostic event log for SpectralVault.
 * Captures all runtime exceptions, warnings, listener rebinds, and parsing events.
 */
@Entity(
    tableName = "diagnostic_logs",
    indices = [
        Index(value = ["timestamp"]),
        Index(value = ["level", "timestamp"])
    ]
)
data class DiagnosticLogEntity(
    @PrimaryKey val id:   String,
    val level:            String, // "INFO", "WARN", "ERROR", "CRITICAL"
    val tag:              String,
    val message:          String,
    val stackTrace:       String?,
    val timestamp:        Long,
)
