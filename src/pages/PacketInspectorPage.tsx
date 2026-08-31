/**
 * PacketInspectorPage.tsx — Wireshark-Style Deep Notification Packet Inspector
 *
 * Provides granular, time-partitioned telemetry dissection for all intercepted
 * Android status bar notification packets in SpectralVault.
 *
 * Features:
 *   - 2-hour time slot bucket navigation (12:00 AM - 02:00 AM, 02:00 AM - 04:00 AM, etc.)
 *   - Deep header inspection: package origin, channel ID, notification ID, post timestamps
 *   - Full JSON extras bundle tree viewer with copyable fields
 *   - Filter pills: All, Revocations (Deleted), Self Replies, Regular
 *   - High-speed fuzzy search across titles, texts, senders, and bundle keys
 *   - Zero network egress — 100% local air-gapped diagnostics
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  Search,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  Layers,
} from 'lucide-react';
import type { NotificationPacket } from '@/types';
import {
  getNotificationPacketsNative,
  getNotificationTimeSlotsNative,
  clearDiagnosticLogsNative,
} from '@/services/NativeBridgeService';
import { HapticService } from '@/services/HapticService';
import { ConfirmationModal } from '@/components/common';

export const PacketInspectorPage: React.FC = () => {
  const [packets, setPackets] = useState<NotificationPacket[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'revocation' | 'self' | 'incoming'>('all');
  const [expandedPacketId, setExpandedPacketId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);

  const fetchTelemetry = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allSlots, rawPackets] = await Promise.all([
        getNotificationTimeSlotsNative(),
        getNotificationPacketsNative({
          timeSlot: selectedSlot === 'ALL' ? undefined : selectedSlot,
          query: searchQuery.trim() || undefined,
          limit: 300,
        }),
      ]);
      setTimeSlots(allSlots);
      setPackets(rawPackets);
    } catch {
      /* Fallback */
    } finally {
      setIsLoading(false);
    }
  }, [selectedSlot, searchQuery]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  const handleClearLogs = async () => {
    HapticService.warning();
    await clearDiagnosticLogsNative();
    setIsClearModalOpen(false);
    setPackets([]);
    setTimeSlots([]);
  };

  const handleCopyPayload = (id: string, text: string) => {
    HapticService.tap();
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const filteredPackets = useMemo(() => {
    return packets.filter((p) => {
      if (filterType === 'revocation' && !p.isRevocation) return false;
      if (filterType === 'self' && !p.isSelfReply) return false;
      if (filterType === 'incoming' && (p.isRevocation || p.isSelfReply)) return false;
      return true;
    });
  }, [packets, filterType]);

  return (
    <div className="flex flex-col min-h-screen pb-28 pt-safe bg-surface text-on-surface">
      {/* Top Header */}
      <header className="px-4 pt-3 pb-2 border-b border-outline-variant bg-surface sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center border"
              style={{
                background: 'var(--md-sys-color-primary-container)',
                borderColor: 'var(--md-sys-color-primary)',
              }}
            >
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-on-surface tracking-tight leading-none">
                Packet Inspector
              </h1>
              <p className="text-2xs text-on-surface-variant font-medium mt-0.5">
                Wireshark-Style Notification Telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                HapticService.tap();
                fetchTelemetry();
              }}
              className="p-2 rounded-xl border border-outline-variant hover:bg-surface-container active:scale-95 transition-all text-on-surface-variant"
              title="Refresh Packet Stream"
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
              title="Purge Telemetry Buffer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2-Hour Time Slot Horizontal Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => {
              HapticService.tap();
              setSelectedSlot('ALL');
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
              selectedSlot === 'ALL'
                ? 'bg-primary text-on-primary border-primary shadow-sm'
                : 'bg-surface-container text-on-surface-variant border-outline-variant'
            }`}
          >
            All Slots ({packets.length})
          </button>
          {timeSlots.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => {
                HapticService.tap();
                setSelectedSlot(slot);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1 ${
                selectedSlot === slot
                  ? 'bg-primary text-on-primary border-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant border-outline-variant'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>{slot}</span>
            </button>
          ))}
        </div>

        {/* Search Bar & Filter Types */}
        <div className="mt-2.5 flex flex-col gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-on-surface-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search packet headers, titles, raw texts, senders..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-muted"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'all', label: 'All Packets' },
                { id: 'incoming', label: 'Incoming' },
                { id: 'revocation', label: 'Revocations (Deleted)' },
                { id: 'self', label: 'Self Replies' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  HapticService.tap();
                  setFilterType(f.id);
                }}
                className={`px-2.5 py-0.5 rounded-lg text-2xs font-bold border whitespace-nowrap transition-all ${
                  filterType === f.id
                    ? 'bg-secondary-container text-on-secondary-container border-secondary'
                    : 'bg-surface-container-low text-on-surface-variant border-outline-variant'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Packet Stream List */}
      <main className="px-3 py-3 flex flex-col gap-2.5">
        {filteredPackets.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2 border border-dashed border-outline-variant rounded-2xl bg-surface-container-low mt-6">
            <Cpu className="w-8 h-8 text-on-surface-muted opacity-60" />
            <p className="text-sm font-bold text-on-surface">No Packets In Selected Window</p>
            <p className="text-xs text-on-surface-variant max-w-xs">
              Incoming WhatsApp and status-bar notification frames will stream here automatically.
            </p>
          </div>
        ) : (
          filteredPackets.map((pkt) => {
            const isExpanded = expandedPacketId === pkt.id;
            const timeStr = new Date(pkt.postTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <article
                key={pkt.id}
                className="p-3 rounded-2xl border bg-surface-container border-outline-variant shadow-sm transition-all"
              >
                {/* Packet Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded-md text-2xs font-black tracking-wider uppercase border"
                      style={{
                        background: pkt.isRevocation
                          ? 'var(--md-sys-color-tertiary-container)'
                          : pkt.isSelfReply
                          ? 'var(--md-sys-color-secondary-container)'
                          : 'var(--md-sys-color-primary-container)',
                        color: pkt.isRevocation
                          ? 'var(--md-sys-color-on-tertiary-container)'
                          : pkt.isSelfReply
                          ? 'var(--md-sys-color-on-secondary-container)'
                          : 'var(--md-sys-color-on-primary-container)',
                        borderColor: 'var(--md-sys-color-outline-variant)',
                      }}
                    >
                      {pkt.isRevocation ? 'REVOCATION' : pkt.isSelfReply ? 'SELF-REPLY' : 'INCOMING'}
                    </span>

                    <span className="text-2xs font-mono text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded">
                      ID #{pkt.notificationId}
                    </span>

                    <span className="text-2xs text-on-surface-muted font-medium">
                      {pkt.timeSlot} &middot; {timeStr}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyPayload(pkt.id, pkt.extrasJson)}
                    className="p-1 rounded text-on-surface-variant hover:text-on-surface active:scale-90 transition-all"
                    title="Copy Raw JSON"
                  >
                    {copiedKey === pkt.id ? (
                      <Check className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Packet Key Identifiers */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div className="p-2 rounded-xl bg-surface-container-low border border-outline-variant">
                    <span className="text-2xs font-bold text-on-surface-muted block uppercase">
                      Sender / Title
                    </span>
                    <span className="font-semibold text-on-surface truncate block">
                      {pkt.parsedSender || pkt.rawTitle || 'Unknown'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-surface-container-low border border-outline-variant">
                    <span className="text-2xs font-bold text-on-surface-muted block uppercase">
                      Channel / Group
                    </span>
                    <span className="font-semibold text-on-surface truncate block">
                      {pkt.parsedChatTitle || pkt.channelId || 'Direct / General'}
                    </span>
                  </div>
                </div>

                {/* Raw Body Content */}
                {pkt.rawText && (
                  <div className="p-2 rounded-xl bg-surface-container-high/60 border border-outline-variant text-xs text-on-surface mb-2 font-mono break-all leading-relaxed">
                    {pkt.rawText}
                  </div>
                )}

                {/* Expandable JSON Tree Inspection */}
                <button
                  type="button"
                  onClick={() => {
                    HapticService.tap();
                    setExpandedPacketId(isExpanded ? null : pkt.id);
                  }}
                  className="w-full flex items-center justify-between pt-2 border-t border-outline-variant text-2xs font-bold text-primary active:opacity-80 transition-all"
                >
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {isExpanded ? 'Hide Raw Extras Bundle' : 'Inspect Extras JSON Tree'}
                  </span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {isExpanded && (
                  <div className="mt-2 p-2.5 rounded-xl bg-black/90 text-emerald-400 font-mono text-2xs overflow-x-auto leading-relaxed border border-emerald-900/40">
                    <pre className="whitespace-pre-wrap break-all">{pkt.extrasJson || '{}'}</pre>
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>

      <ConfirmationModal
        isOpen={isClearModalOpen}
        title="Purge Telemetry Buffer?"
        description="This will clear all in-memory and persisted notification packet frames and diagnostic traces. Message records will remain safe."
        confirmLabel="Purge Buffer"
        isDangerous={true}
        confirmVariant="danger"
        onConfirm={handleClearLogs}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  );
};
