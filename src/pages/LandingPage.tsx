/**
 * LandingPage (Dashboard)
 *
 * Primary overview screen displaying aggregate statistics for NotiCatch.
 * Styled with Material 3 semantic tokens, standalone theme support, and haptics.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Trash2,
  Users,
  HardDrive,
  Radio,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { TopAppBar, IconButton, AppBrand } from '@/components/navigation';
import { Avatar, ThreeSecurityCanvas, LoadingSpinner } from '@/components/common';
import {
  getConversations,
  getDeletedMessages,
} from '@/services/NativeBridgeService';
import { HapticService } from '@/services/HapticService';
import type { Conversation, Message } from '@/types';

interface StatCardProps {
  readonly label:   string;
  readonly value:   string | number;
  readonly icon:    React.ReactNode;
  readonly accent?: boolean;
  readonly id:      string;
}

function StatCard({ label, value, icon, accent = false, id }: StatCardProps) {
  return (
    <div
      id={id}
      className="p-4 rounded-2xl border flex flex-col gap-1 shadow-xs animate-fade-in"
      style={{
        background: 'var(--md-sys-color-surface)',
        borderColor: 'var(--md-sys-color-outline-variant)',
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-1 border"
        style={{
          background: accent
            ? 'var(--md-sys-color-tertiary-container)'
            : 'var(--md-sys-color-primary-container)',
          borderColor: accent
            ? 'var(--md-sys-color-tertiary-border)'
            : 'var(--md-sys-color-outline-variant)',
          color: accent
            ? 'var(--md-sys-color-tertiary)'
            : 'var(--md-sys-color-primary)',
        }}
      >
        {icon}
      </div>
      <span
        className="text-2xl font-bold tabular-nums leading-tight tracking-tight"
        style={{
          color: accent
            ? 'var(--md-sys-color-tertiary)'
            : 'var(--md-sys-color-on-surface)',
        }}
      >
        {value}
      </span>
      <span
        className="text-2xs font-semibold leading-tight"
        style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
      >
        {label}
      </span>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();

  const [conversations,   setConversations]   = useState<Conversation[]>([]);
  const [deletedMessages, setDeletedMessages] = useState<Message[]>([]);
  const [isLoading,       setIsLoading]       = useState(true);

  const loadDashboardData = useCallback(async (): Promise<void> => {
    const [convs, deleted] = await Promise.all([
      getConversations(),
      getDeletedMessages(),
    ]);
    setConversations(convs);
    setDeletedMessages(deleted);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    function handleNewMessage(): void {
      loadDashboardData();
    }
    window.addEventListener('noticatch:new-message', handleNewMessage);
    return () => window.removeEventListener('noticatch:new-message', handleNewMessage);
  }, [loadDashboardData]);

  const recentWithDeleted = useMemo(
    () => conversations.filter(conv => conv.deletedCount > 0).slice(0, 3),
    [conversations],
  );

  const totalCapturedCount = useMemo(() => {
    const unreadSum = conversations.reduce((acc, c) => acc + c.unreadCount, 0);
    return Math.max(unreadSum, deletedMessages.length);
  }, [conversations, deletedMessages]);

  const estimatedStorageBytes = useMemo(() => {
    return (totalCapturedCount + deletedMessages.length) * 512;
  }, [totalCapturedCount, deletedMessages]);

  function formatStorageSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (isLoading) {
    return (
      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{
          background: 'var(--md-sys-color-background)',
          color: 'var(--md-sys-color-on-surface)',
        }}
      >
        <TopAppBar title="Dashboard" />
        <div className="pt-14 flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        background: 'var(--md-sys-color-background)',
        color: 'var(--md-sys-color-on-surface)',
      }}
    >
      <TopAppBar
        title="Dashboard"
        subtitle="Private Notification Vault"
        trailing={
          <IconButton
            id="landing-chats-nav-button"
            icon={<TrendingUp className="w-4 h-4" style={{ color: 'var(--md-sys-color-primary)' }} strokeWidth={2.2} />}
            label="View chats"
            onClick={() => {
              HapticService.navigate();
              navigate('/chats');
            }}
          />
        }
      />

      <div className="flex-1 overflow-y-auto pt-14 pb-20">
        {/* Active service banner with 3D Canvas */}
        <div className="px-4 pt-4 pb-2 animate-fade-in">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-xs"
            style={{
              background: 'var(--md-sys-color-success-container)',
              borderColor: 'var(--md-sys-color-success-border)',
            }}
          >
            <div className="relative flex-shrink-0">
              <ThreeSecurityCanvas size={40} active={true} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold" style={{ color: 'var(--md-sys-color-on-success-container)' }}>
                Notification Listener Active
              </p>
              <p className="text-2xs font-medium" style={{ color: 'var(--md-sys-color-on-success-container)' }}>
                Real-time local message capture active
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Radio className="w-4 h-4 animate-pulse" style={{ color: 'var(--md-sys-color-success)' }} strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Welcome header */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <AppBrand className="mb-0.5" />
            <p
              className="text-xs font-medium"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              {deletedMessages.length > 0
                ? `${deletedMessages.length} deleted message${deletedMessages.length > 1 ? 's' : ''} recovered & preserved`
                : 'Monitoring incoming message alerts'}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="px-4 pb-2">
          <div className="grid grid-cols-2 gap-3.5">
            <StatCard
              id="stat-captured"
              icon={<MessageCircle className="w-4 h-4" strokeWidth={2} />}
              label="Messages Captured"
              value={totalCapturedCount}
            />
            <StatCard
              id="stat-deleted"
              icon={<Trash2 className="w-4 h-4" strokeWidth={2} />}
              label="Deleted Recovered"
              value={deletedMessages.length}
              accent
            />
            <StatCard
              id="stat-conversations"
              icon={<Users className="w-4 h-4" strokeWidth={2} />}
              label="Conversations"
              value={conversations.length}
            />
            <StatCard
              id="stat-storage"
              icon={<HardDrive className="w-4 h-4" strokeWidth={2} />}
              label="Storage Used"
              value={formatStorageSize(estimatedStorageBytes)}
            />
          </div>
        </div>

        {/* Recent deleted messages section */}
        {recentWithDeleted.length > 0 && (
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                Recent Deleted Messages
              </h2>
              <button
                id="view-all-deleted-button"
                type="button"
                onClick={() => {
                  HapticService.navigate();
                  navigate('/deleted');
                }}
                className="text-xs hover:underline transition-colors font-bold flex items-center gap-0.5"
                style={{ color: 'var(--md-sys-color-primary)' }}
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.2} />
              </button>
            </div>

            <div
              className="rounded-2xl border overflow-hidden divide-y shadow-xs"
              style={{
                background: 'var(--md-sys-color-surface)',
                borderColor: 'var(--md-sys-color-outline-variant)',
              }}
            >
              {recentWithDeleted.map((conv, index) => (
                <button
                  key={conv.id}
                  id={`landing-conv-${conv.id}`}
                  type="button"
                  onClick={() => {
                    HapticService.navigate();
                    navigate(`/chats/${conv.id}`);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors animate-slide-up"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    background: 'var(--md-sys-color-surface)',
                  }}
                >
                  <Avatar name={conv.chatTitle} isGroup={conv.isGroup} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold truncate" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                      {conv.chatTitle}
                    </p>
                    <p className="text-2xs font-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                      {conv.deletedCount} deleted message{conv.deletedCount > 1 ? 's' : ''} recovered
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="min-w-5 h-5 px-1.5 rounded-full border flex items-center justify-center text-2xs font-bold shadow-xs"
                      style={{
                        background: 'var(--md-sys-color-tertiary-container)',
                        color: 'var(--md-sys-color-on-tertiary-container)',
                        borderColor: 'var(--md-sys-color-tertiary-border)',
                      }}
                    >
                      {conv.deletedCount}
                    </span>
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--md-sys-color-on-surface-muted)' }} strokeWidth={2} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty deleted state */}
        {recentWithDeleted.length === 0 && (
          <div className="px-4 pt-4">
            <div
              className="flex flex-col items-center gap-3 py-10 text-center animate-fade-in rounded-2xl border shadow-xs"
              style={{
                background: 'var(--md-sys-color-surface)',
                borderColor: 'var(--md-sys-color-outline-variant)',
              }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center border"
                style={{
                  background: 'var(--md-sys-color-surface-container)',
                  borderColor: 'var(--md-sys-color-outline-variant)',
                  color: 'var(--md-sys-color-on-surface-muted)',
                }}
              >
                <Trash2 className="w-5 h-5" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>No deleted messages yet</p>
                <p className="text-xs mt-1 max-w-[240px] font-medium leading-relaxed" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                  NotiCatch will capture and highlight deleted messages automatically as they arrive.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
