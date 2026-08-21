/**
 * LandingPage (Dashboard)
 *
 * Primary overview screen displaying aggregate statistics for NotiCatch.
 * Styled in Anthropic Claude warm editorial aesthetic.
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
    <div id={id} className="card p-4 flex flex-col gap-1 shadow-card animate-fade-in">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1 border ${accent ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-surface-850 text-accent border-surface-700'}`}>
        {icon}
      </div>
      <span className={`text-2xl font-bold tabular-nums leading-tight tracking-tight ${accent ? 'text-accent' : 'text-content-primary'}`}>
        {value}
      </span>
      <span className="text-2xs text-content-muted font-semibold leading-tight">{label}</span>
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
      <div className="flex flex-col h-screen overflow-hidden bg-canvas">
        <TopAppBar title="Dashboard" />
        <div className="pt-14 flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-canvas">
      <TopAppBar
        title="Dashboard"
        subtitle="Private Notification Vault"
        trailing={
          <IconButton
            id="landing-chats-nav-button"
            icon={<TrendingUp className="w-4 h-4 text-accent" strokeWidth={2.2} />}
            label="View chats"
            onClick={() => navigate('/chats')}
          />
        }
      />

      <div className="flex-1 overflow-y-auto pt-14 pb-20">
        {/* Active service banner with 3D Canvas */}
        <div className="px-4 pt-4 pb-2 animate-fade-in">
          <div className="card flex items-center gap-3 px-4 py-3 border-emerald-300 bg-emerald-50/50 shadow-xs">
            <div className="relative flex-shrink-0">
              <ThreeSecurityCanvas size={40} active={true} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-950">Notification Listener Active</p>
              <p className="text-2xs text-emerald-800 font-medium">Real-time local message capture active</p>
            </div>
            <div className="flex items-center gap-1">
              <Radio className="w-4 h-4 text-emerald-700 animate-pulse" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Welcome header */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <AppBrand className="mb-0.5" />
            <p className="text-content-muted text-xs font-medium">
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
              <h2 className="text-sm font-bold text-content-primary">Recent Deleted Messages</h2>
              <button
                id="view-all-deleted-button"
                type="button"
                onClick={() => navigate('/deleted')}
                className="text-xs text-accent hover:underline transition-colors font-bold flex items-center gap-0.5"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.2} />
              </button>
            </div>

            <div className="card overflow-hidden divide-y divide-surface-700 shadow-card">
              {recentWithDeleted.map((conv, index) => (
                <button
                  key={conv.id}
                  id={`landing-conv-${conv.id}`}
                  type="button"
                  onClick={() => navigate(`/chats/${conv.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-850 active:bg-surface-750 transition-colors animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Avatar name={conv.chatTitle} isGroup={conv.isGroup} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-content-primary truncate">{conv.chatTitle}</p>
                    <p className="text-2xs text-content-muted font-medium">
                      {conv.deletedCount} deleted message{conv.deletedCount > 1 ? 's' : ''} recovered
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 text-2xs font-bold shadow-xs">
                      {conv.deletedCount}
                    </span>
                    <ChevronRight className="w-4 h-4 text-content-muted" strokeWidth={2} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty deleted state */}
        {recentWithDeleted.length === 0 && (
          <div className="px-4 pt-4">
            <div className="card flex flex-col items-center gap-3 py-10 text-center animate-fade-in shadow-card">
              <div className="w-11 h-11 rounded-2xl bg-surface-850 flex items-center justify-center border border-surface-700 text-content-muted">
                <Trash2 className="w-5 h-5" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-bold text-content-primary">No deleted messages yet</p>
                <p className="text-xs text-content-muted mt-1 max-w-[240px] font-medium leading-relaxed">
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
