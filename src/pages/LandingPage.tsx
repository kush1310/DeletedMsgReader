/**
 * LandingPage (Dashboard)
 *
 * Primary overview screen displaying aggregate statistics for the
 * NotiCatch application: total messages captured, deleted messages
 * recovered, active conversations, and storage usage.
 *
 * Enhanced with Three.js 3D security node, neumorphic cards, and Outfit typography.
 */

import { useMemo } from 'react';
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
import { Avatar, ThreeSecurityCanvas } from '@/components/common';
import { getAppStats, getAllConversations } from '@/services/DatabaseService';
import type { AppStats, Conversation } from '@/types';

interface StatCardProps {
  readonly label:   string;
  readonly value:   string | number;
  readonly icon:    React.ReactNode;
  readonly accent?: boolean;
  readonly id:      string;
}

/**
 * StatCard
 *
 * Individual metric display card with neumorphic relief.
 */
function StatCard({ label, value, icon, accent = false, id }: StatCardProps) {
  return (
    <div id={id} className="stat-card animate-fade-in">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-1 shadow-skeuo-chip border border-white/80 ${accent ? 'bg-amber-100 text-amber-800' : 'bg-surface-800 text-accent'}`}>
        {icon}
      </div>
      <span className={`text-2xl font-extrabold tabular-nums leading-tight tracking-tight ${accent ? 'text-amber-800' : 'text-content-primary'}`}>
        {value}
      </span>
      <span className="text-xs text-content-muted font-bold leading-tight">{label}</span>
    </div>
  );
}

/**
 * LandingPage
 *
 * Renders the application dashboard in Neumorphic Light Mode.
 */
export function LandingPage() {
  const navigate = useNavigate();

  const stats: AppStats        = useMemo(() => getAppStats(),        []);
  const conversations: Conversation[] = useMemo(() => getAllConversations(), []);

  const recentWithDeleted = conversations.filter(conv => conv.deletedCount > 0).slice(0, 3);

  function formatStorageSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-800">
      <TopAppBar
        title="NotiCatch"
        subtitle="WhatsApp Notification Saver"
        trailing={
          <IconButton
            id="landing-settings-button"
            icon={<TrendingUp className="w-5 h-5 text-accent" strokeWidth={2.2} />}
            label="View statistics"
            onClick={() => {}}
          />
        }
      />

      <div className="flex-1 overflow-y-auto pt-14 pb-20">
        {/* Active service banner with 3D Canvas */}
        <div className="px-4 pt-4 pb-2 animate-fade-in">
          <div className="card-neu flex items-center gap-3 px-4 py-3 border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100/50">
            <div className="relative flex-shrink-0">
              <ThreeSecurityCanvas size={42} active={true} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-emerald-950">Notification Listener Active</p>
              <p className="text-2xs text-emerald-800 font-semibold">Real-time local WhatsApp capture active</p>
            </div>
            <div className="flex items-center gap-1">
              <Radio className="w-4 h-4 text-emerald-700 animate-pulse-soft" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Welcome header */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <AppBrand className="mb-0.5" />
            <p className="text-content-muted text-xs font-bold">
              {stats.totalDeletedRecovered > 0
                ? `${stats.totalDeletedRecovered} deleted message${stats.totalDeletedRecovered > 1 ? 's' : ''} captured & preserved`
                : 'Monitoring incoming WhatsApp alerts'}
            </p>
          </div>
        </div>

        {/* Stats grid with Neumorphic elevation */}
        <div className="px-4 pb-2">
          <div className="grid grid-cols-2 gap-3.5">
            <StatCard
              id="stat-captured"
              icon={<MessageCircle className="w-5 h-5" strokeWidth={2.2} />}
              label="Messages Captured"
              value={stats.totalMessagesCaputred}
            />
            <StatCard
              id="stat-deleted"
              icon={<Trash2 className="w-5 h-5" strokeWidth={2.2} />}
              label="Deleted Recovered"
              value={stats.totalDeletedRecovered}
              accent
            />
            <StatCard
              id="stat-conversations"
              icon={<Users className="w-5 h-5" strokeWidth={2.2} />}
              label="Conversations"
              value={stats.totalConversations}
            />
            <StatCard
              id="stat-storage"
              icon={<HardDrive className="w-5 h-5" strokeWidth={2.2} />}
              label="Storage Used"
              value={formatStorageSize(stats.storageSizeBytes)}
            />
          </div>
        </div>

        {/* Recent deleted messages section */}
        {recentWithDeleted.length > 0 && (
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-extrabold text-content-primary">Recent Deleted Messages</h2>
              <button
                id="view-all-deleted-button"
                type="button"
                onClick={() => navigate('/deleted')}
                className="text-xs text-accent hover:underline transition-colors font-extrabold flex items-center gap-0.5"
              >
                View all
                <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>

            <div className="space-y-2.5">
              {recentWithDeleted.map((conv, index) => (
                <button
                  key={conv.id}
                  id={`landing-conv-${conv.id}`}
                  type="button"
                  onClick={() => navigate(`/chats/${conv.id}`)}
                  className="card-interactive w-full flex items-center gap-3 px-4 py-3.5 text-left animate-slide-up"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <Avatar name={conv.chatTitle} isGroup={conv.isGroup} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-content-primary truncate">{conv.chatTitle}</p>
                    <p className="text-xs text-content-muted font-semibold">
                      {conv.deletedCount} deleted message{conv.deletedCount > 1 ? 's' : ''} recovered
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="w-5.5 h-5.5 px-1 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 text-2xs font-extrabold shadow-skeuo-chip">
                      {conv.deletedCount}
                    </span>
                    <ChevronRight className="w-4 h-4 text-content-muted" strokeWidth={2.2} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty deleted state */}
        {recentWithDeleted.length === 0 && (
          <div className="px-4 pt-4">
            <div className="card-neu flex flex-col items-center gap-3 py-10 text-center animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-surface-800 flex items-center justify-center shadow-skeuo-chip border border-white">
                <Trash2 className="w-6 h-6 text-content-muted" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-sm font-bold text-content-primary">No deleted messages yet</p>
                <p className="text-xs text-content-muted mt-1 max-w-[240px] font-semibold leading-relaxed">
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
