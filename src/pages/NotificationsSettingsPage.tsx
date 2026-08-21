/**
 * NotificationsSettingsPage.tsx
 *
 * Notifications preferences sub-page for NotiCatch.
 * Styled to precisely match Anthropic Claude's mobile Notifications settings screen.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, ClipboardList, Mail } from 'lucide-react';
import { ToggleSwitch } from '@/components/common';

export function NotificationsSettingsPage() {
  const navigate = useNavigate();

  const [chatResponses, setChatResponses] = useState(
    () => localStorage.getItem('notif_chat_responses') !== 'false'
  );
  const [dispatchMessages, setDispatchMessages] = useState(
    () => localStorage.getItem('notif_dispatch_messages') === 'true'
  );
  const [productUpdates, setProductUpdates] = useState(
    () => localStorage.getItem('notif_product_updates') === 'true'
  );

  function handleToggleChatResponses(val: boolean): void {
    setChatResponses(val);
    localStorage.setItem('notif_chat_responses', String(val));
  }

  function handleToggleDispatch(val: boolean): void {
    setDispatchMessages(val);
    localStorage.setItem('notif_dispatch_messages', String(val));
  }

  function handleToggleUpdates(val: boolean): void {
    setProductUpdates(val);
    localStorage.setItem('notif_product_updates', String(val));
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F5] text-content-primary">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E8E4D8] pt-safe">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            type="button"
            id="notifications-back-button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-content-primary hover:bg-surface-850 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          </button>
          <h1 className="text-lg font-bold text-content-primary tracking-tight">
            Notifications
          </h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-20 pb-12 px-5 max-w-lg mx-auto w-full animate-slide-up">
        <div className="card bg-white rounded-3xl p-4 shadow-card border border-[#E8E4D8] space-y-4">
          {/* Chat responses */}
          <div className="flex items-start justify-between gap-3 p-2">
            <div className="flex items-start gap-3.5">
              <MessageSquare className="w-5 h-5 text-content-secondary mt-0.5" strokeWidth={2} />
              <div>
                <h3 className="text-sm font-semibold text-content-primary">
                  Chat responses
                </h3>
              </div>
            </div>
            <ToggleSwitch
              id="toggle-chat-responses"
              checked={chatResponses}
              onChange={handleToggleChatResponses}
            />
          </div>

          <div className="border-t border-surface-700" />

          {/* Dispatch messages */}
          <div className="flex items-start justify-between gap-3 p-2">
            <div className="flex items-start gap-3.5">
              <ClipboardList className="w-5 h-5 text-content-secondary mt-0.5" strokeWidth={2} />
              <div>
                <h3 className="text-sm font-semibold text-content-primary">
                  Dispatch messages
                </h3>
                <p className="text-xs text-content-muted mt-0.5 leading-relaxed font-medium">
                  Get notified when Claude messages you in Dispatch
                </p>
              </div>
            </div>
            <ToggleSwitch
              id="toggle-dispatch-messages"
              checked={dispatchMessages}
              onChange={handleToggleDispatch}
            />
          </div>

          <div className="border-t border-surface-700" />

          {/* Product updates */}
          <div className="flex items-start justify-between gap-3 p-2">
            <div className="flex items-start gap-3.5">
              <Mail className="w-5 h-5 text-content-secondary mt-0.5" strokeWidth={2} />
              <div>
                <h3 className="text-sm font-semibold text-content-primary">
                  Product updates
                </h3>
                <p className="text-xs text-content-muted mt-0.5 leading-relaxed font-medium">
                  Get notified about new features, tips, and occasional promotions
                </p>
              </div>
            </div>
            <ToggleSwitch
              id="toggle-product-updates"
              checked={productUpdates}
              onChange={handleToggleUpdates}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
