/**
 * ErrorLogsPage.tsx — Dedicated Runtime Diagnostics & Exception Hub
 *
 * Captures, formats, and displays real-time runtime exceptions, listener disconnections,
 * database warnings, and parsing errors within SpectralVault.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Terminal,
  Search,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import type { DiagnosticLog } from '@/types';
import { getDiagnosticLogsNative, clearDiagnosticLogsNative } from '@/services/NativeBridgeService';
import { HapticService } from '@/services/HapticService';
import { ConfirmationModal } from '@/components/common';

export const ErrorLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getDiagnosticLogsNative({
        level: selectedLevel === 'ALL' ? undefined : selectedLevel,
        query: searchQuery.trim() || undefined,
        limit: 200,
      });
      setLogs(data);
    } catch {
      /* Fallback */
    } finally {
      setIsLoading(false);
    }
  }, [selectedLevel, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleClearLogs = async () => {
    HapticService.warning();
    await clearDiagnosticLogsNative();
    setIsClearModalOpen(false);
    setLogs([]);
  };

  const handleCopyTrace = (id: string, text: string) => {
    HapticService.tap();
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (selectedLevel !== 'ALL' && l.level !== selectedLevel) return false;
      return true;
    });
  }, [logs, selectedLevel]);

  const errorCount = useMemo(() => logs.filter((l) => l.level === 'ERROR' || l.level === 'CRITICAL').length, [logs]);
  const warnCount = useMemo(() => logs.filter((l) => l.level === 'WARN').length, [logs]);

  return (
    <div className="flex flex-col min-h-screen pb-28 pt-safe bg-surface text-on-surface">
      {/* Top App Bar */}
      <header className="px-4 pt-3 pb-2 border-b border-outline-variant bg-surface sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border"
              style={{
                background: errorCount > 0 ? 'var(--md-sys-color-error-container)' : 'var(--md-sys-color-primary-container)',
                borderColor: errorCount > 0 ? 'var(--md-sys-color-error)' : 'var(--md-sys-color-primary)',
              }}
            >
              <Terminal className={`w-5 h-5 ${errorCount > 0 ? 'text-error' : 'text-primary'}`} />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-on-surface tracking-tight leading-none">
                Error Diagnostics Hub
              </h1>
              <p className="text-2xs text-on-surface-variant font-medium mt-0.5">
                Runtime Exceptions & System Trace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                HapticService.tap();
                fetchLogs();
              }}
              className="p-2 rounded-xl border border-outline-variant hover:bg-surface-container active:scale-95 transition-all text-on-surface-variant"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                HapticService.warning();
                setIsClearModalOpen(true);
              }}
              className="p-2 rounded-xl border border-error-container text-error hover:bg-error-container/20 active:scale-95 transition-all"
              title="Clear Diagnostic Logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Severity Metrics Bar */}
        <div className="grid grid-cols-3 gap-2 py-1">
          <div className="p-2 rounded-xl bg-surface-container-low border border-outline-variant flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <div>
              <span className="text-2xs text-on-surface-muted block font-medium">Total Logs</span>
              <span className="text-xs font-bold text-on-surface">{logs.length}</span>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-surface-container-low border border-outline-variant flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <div>
              <span className="text-2xs text-on-surface-muted block font-medium">Warnings</span>
              <span className="text-xs font-bold text-amber-500">{warnCount}</span>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-surface-container-low border border-outline-variant flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-error" />
            <div>
              <span className="text-2xs text-on-surface-muted block font-medium">Errors</span>
              <span className="text-xs font-bold text-error">{errorCount}</span>
            </div>
          </div>
        </div>

        {/* Search & Level Filter */}
        <div className="mt-2 flex flex-col gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-on-surface-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search diagnostic messages, tags, or stack traces..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-muted"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(['ALL', 'ERROR', 'WARN', 'INFO'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => {
                  HapticService.tap();
                  setSelectedLevel(lvl);
                }}
                className={`px-3 py-1 rounded-lg text-2xs font-bold border whitespace-nowrap transition-all ${
                  selectedLevel === lvl
                    ? 'bg-primary text-on-primary border-primary shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant border-outline-variant'
                }`}
              >
                {lvl === 'ALL' ? 'All Severities' : lvl}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Log Feed */}
      <main className="px-3 py-3 flex flex-col gap-2">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-outline-variant rounded-2xl bg-surface-container-low mt-6">
            <ShieldCheck className="w-8 h-8 text-primary opacity-80" />
            <p className="text-sm font-bold text-on-surface">Zero Diagnostic Faults</p>
            <p className="text-xs text-on-surface-variant max-w-xs">
              The application engine, Room SQLite database, and NotificationListenerService are operating cleanly.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            const isError = log.level === 'ERROR' || log.level === 'CRITICAL';
            const isWarn = log.level === 'WARN';

            return (
              <article
                key={log.id}
                className="p-3 rounded-2xl border bg-surface-container border-outline-variant shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded-md text-2xs font-black uppercase tracking-wider border"
                      style={{
                        background: isError
                          ? 'var(--md-sys-color-error-container)'
                          : isWarn
                          ? 'var(--md-sys-color-tertiary-container)'
                          : 'var(--md-sys-color-surface-container-high)',
                        color: isError
                          ? 'var(--md-sys-color-error)'
                          : isWarn
                          ? 'var(--md-sys-color-on-tertiary-container)'
                          : 'var(--md-sys-color-on-surface-variant)',
                        borderColor: 'var(--md-sys-color-outline-variant)',
                      }}
                    >
                      {log.level}
                    </span>

                    <span className="text-2xs font-bold text-primary bg-primary-container px-2 py-0.5 rounded-md border border-primary/20">
                      {log.tag}
                    </span>

                    <span className="text-2xs text-on-surface-muted font-medium">
                      {timeStr}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyTrace(log.id, `${log.tag} [${log.level}]: ${log.message}\n${log.stackTrace || ''}`)}
                    className="p-1 rounded text-on-surface-variant hover:text-on-surface active:scale-90 transition-all"
                    title="Copy Trace"
                  >
                    {copiedId === log.id ? (
                      <Check className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <p className="text-xs font-semibold text-on-surface leading-relaxed break-words">
                  {log.message}
                </p>

                {log.stackTrace && (
                  <div className="mt-2 pt-2 border-t border-outline-variant">
                    <button
                      type="button"
                      onClick={() => {
                        HapticService.tap();
                        setExpandedLogId(isExpanded ? null : log.id);
                      }}
                      className="w-full flex items-center justify-between text-2xs font-bold text-primary active:opacity-80 transition-all"
                    >
                      <span>{isExpanded ? 'Hide Stack Trace' : 'View Exception Stack Trace'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 p-2.5 rounded-xl bg-black/90 text-rose-300 font-mono text-2xs overflow-x-auto leading-relaxed border border-rose-900/40">
                        <pre className="whitespace-pre-wrap break-all">{log.stackTrace}</pre>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>

      <ConfirmationModal
        isOpen={isClearModalOpen}
        title="Clear Diagnostic Log History?"
        description="This will erase all runtime exception traces and diagnostic events. Existing message records will remain intact."
        confirmLabel="Clear Logs"
        isDangerous={true}
        confirmVariant="danger"
        onConfirm={handleClearLogs}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  );
};
