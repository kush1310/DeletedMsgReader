/**
 * SideNavigationDrawer.tsx
 *
 * Slide-in navigation drawer precisely matching Anthropic Claude's mobile design.
 * Features "+ New chat" in terracotta, category links, recent conversation history,
 * and user profile bar with avatar initials and direct settings gear link.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  FolderKanban,
  Shapes,
  Plus,
  Settings,
  X,
} from 'lucide-react';
import { getConversations } from '@/services/NativeBridgeService';
import type { Conversation } from '@/types';

interface SideNavigationDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function SideNavigationDrawer({ isOpen, onClose }: SideNavigationDrawerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [recentChats, setRecentChats] = useState<Conversation[]>([]);

  useEffect(() => {
    if (isOpen) {
      getConversations().then(data => {
        setRecentChats(data.slice(0, 10));
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleNavigate(path: string): void {
    navigate(path);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Body */}
      <aside
        id="side-navigation-drawer"
        className="relative z-50 w-72 max-w-[85vw] h-full bg-[#FAF9F5] flex flex-col justify-between p-4 shadow-card-lg border-r border-[#E8E4D8] animate-slide-right select-none"
      >
        <div className="flex flex-col gap-4 overflow-y-auto pt-safe pb-4">
          {/* Header */}
          <div className="flex items-center justify-between pt-2 px-2">
            <span className="font-serif text-2xl font-bold text-content-primary tracking-tight">
              Claude
            </span>
            <button
              type="button"
              id="close-drawer-button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-content-muted hover:text-content-primary"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Primary Action: New chat */}
          <div className="px-1 pt-1">
            <button
              type="button"
              id="drawer-new-chat-button"
              onClick={() => handleNavigate('/chats')}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-accent font-semibold text-sm hover:bg-surface-850 transition-colors"
            >
              <Plus className="w-4 h-4 text-accent" strokeWidth={2.5} />
              <span>New chat</span>
            </button>
          </div>

          {/* Core Categories */}
          <div className="space-y-0.5 px-1">
            <button
              type="button"
              id="drawer-chats-link"
              onClick={() => handleNavigate('/chats')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                location.pathname === '/chats'
                  ? 'bg-surface-750 text-content-primary font-bold'
                  : 'text-content-primary hover:bg-surface-850'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-content-secondary" strokeWidth={2} />
              <span>Chats</span>
            </button>

            <button
              type="button"
              id="drawer-projects-link"
              onClick={() => handleNavigate('/chats')}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-content-primary hover:bg-surface-850 transition-colors"
            >
              <FolderKanban className="w-4 h-4 text-content-secondary" strokeWidth={2} />
              <span>Projects</span>
            </button>

            <button
              type="button"
              id="drawer-artifacts-link"
              onClick={() => handleNavigate('/deleted')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                location.pathname === '/deleted'
                  ? 'bg-surface-750 text-content-primary font-bold'
                  : 'text-content-primary hover:bg-surface-850'
              }`}
            >
              <Shapes className="w-4 h-4 text-content-secondary" strokeWidth={2} />
              <span>Artifacts</span>
            </button>
          </div>

          {/* Recents Section */}
          <div className="pt-2 px-1">
            <h4 className="text-xs font-semibold text-content-muted px-3.5 mb-1.5">
              Recents
            </h4>
            <div className="space-y-0.5">
              {recentChats.length > 0 ? (
                recentChats.map(chat => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => handleNavigate(`/chats/${chat.id}`)}
                    className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium text-content-primary hover:bg-surface-850 truncate transition-colors block"
                  >
                    {chat.chatTitle}
                  </button>
                ))
              ) : (
                <p className="text-2xs text-content-muted px-3.5 py-1 italic">
                  No recent conversations
                </p>
              )}
            </div>
          </div>
        </div>

        {/* User Profile Bar (Bottom Footer) */}
        <div className="pt-3 pb-safe border-t border-[#E8E4D8] flex items-center justify-between px-2">
          <button
            type="button"
            id="drawer-profile-button"
            onClick={() => handleNavigate('/settings/profile')}
            className="flex items-center gap-3 text-left flex-1 min-w-0"
          >
            <div className="w-8 h-8 rounded-full bg-[#E06C48] text-white flex items-center justify-center font-bold text-xs shadow-warm-sm flex-shrink-0">
              KA
            </div>
            <span className="text-sm font-semibold text-content-primary truncate">
              Mr. Kush.
            </span>
          </button>

          <button
            type="button"
            id="drawer-settings-gear-button"
            onClick={() => handleNavigate('/settings')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-content-secondary hover:text-content-primary hover:bg-surface-850 transition-colors flex-shrink-0"
          >
            <Settings className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </aside>
    </div>
  );
}
