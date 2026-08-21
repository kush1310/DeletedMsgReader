/**
 * ProfilePage.tsx
 *
 * User Profile and Custom Instructions sub-page for NotiCatch.
 * Styled to precisely match Anthropic Claude's mobile Profile screen.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, CheckCircle2 } from 'lucide-react';
import { ConfirmationModal } from '@/components/common';
import { executePanicWipe } from '@/services/NativeBridgeService';

export function ProfilePage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(
    () => localStorage.getItem('noticatch_user_fullname') || 'Kush Amit Shah'
  );
  const [callName, setCallName] = useState(
    () => localStorage.getItem('noticatch_user_callname') || 'Mr. Kush.'
  );
  const [customPreferences, setCustomPreferences] = useState(
    () =>
      localStorage.getItem('noticatch_user_preferences') ||
      'IDENTITY & DOMAIN COVERAGE:\nI am a Computer Engineering student. Every response must cover all relevant CS domains where applicable: Software Engineering, DBMS, Computer Networks, Operating Systems, Cybersecurity, Cryptography, Machine Learning.'
  );

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  function showToast(msg: string): void {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  function handleUpdateProfile(): void {
    localStorage.setItem('noticatch_user_fullname', fullName);
    localStorage.setItem('noticatch_user_callname', callName);
    showToast('Profile updated successfully');
  }

  function handleSavePreferences(): void {
    localStorage.setItem('noticatch_user_preferences', customPreferences);
    showToast('Preferences saved successfully');
  }

  async function handleDeleteAccount(): Promise<void> {
    setIsDeleting(true);
    await executePanicWipe();
    setIsDeleting(false);
    setShowDeleteModal(false);
    navigate('/setup', { replace: true });
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F5] text-content-primary">
      {/* Top App Bar */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E8E4D8] pt-safe">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            type="button"
            id="profile-back-button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-content-primary hover:bg-surface-850 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2} />
          </button>
          <h1 className="text-lg font-bold text-content-primary tracking-tight">
            Profile
          </h1>
          <div className="w-9" />
        </div>
      </header>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-16 left-4 right-4 z-50 p-3 rounded-2xl bg-accent text-white text-xs font-bold text-center shadow-warm-md animate-slide-down flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Form Body */}
      <main className="flex-1 pt-20 pb-12 px-5 max-w-lg mx-auto w-full space-y-6 animate-slide-up">
        {/* Profile Inputs */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="profile-full-name" className="text-sm font-semibold text-content-primary">
              Full name
            </label>
            <input
              id="profile-full-name"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E8E4D8] text-sm text-content-primary font-medium focus:outline-none focus:border-accent shadow-card"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-call-name" className="text-sm font-semibold text-content-primary">
              What should we call you?
            </label>
            <input
              id="profile-call-name"
              type="text"
              value={callName}
              onChange={e => setCallName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E8E4D8] text-sm text-content-primary font-medium focus:outline-none focus:border-accent shadow-card"
            />
          </div>

          <button
            type="button"
            id="update-profile-button"
            onClick={handleUpdateProfile}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#9C9488] hover:bg-[#8A8276] text-white font-semibold text-sm shadow-card transition-all active:scale-[0.98]"
          >
            Update Profile
          </button>
        </div>

        {/* Custom Instructions / Preferences */}
        <div className="space-y-2 pt-2">
          <h2 className="text-sm font-bold text-content-primary leading-snug">
            What personal preferences should Claude consider in responses?
          </h2>
          <p className="text-xs text-content-muted leading-relaxed font-medium">
            Your preferences will apply to all conversations.
          </p>

          <textarea
            id="profile-custom-preferences"
            rows={7}
            value={customPreferences}
            onChange={e => setCustomPreferences(e.target.value)}
            className="w-full p-4 rounded-2xl bg-white border border-[#E8E4D8] text-xs text-content-primary font-medium leading-relaxed resize-none focus:outline-none focus:border-accent shadow-card"
          />

          <button
            type="button"
            id="save-preferences-button"
            onClick={handleSavePreferences}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#9C9488] hover:bg-[#8A8276] text-white font-semibold text-sm shadow-card transition-all active:scale-[0.98]"
          >
            Save Preferences
          </button>
        </div>

        {/* Account Actions */}
        <div className="pt-6 border-t border-[#E8E4D8] space-y-3">
          <h3 className="text-xs font-semibold text-content-muted">
            Account Actions
          </h3>

          <button
            type="button"
            id="delete-account-trigger"
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-3 text-sm font-semibold text-rose-600 hover:text-rose-700 transition-colors py-1"
          >
            <Trash2 className="w-4 h-4 text-rose-600" strokeWidth={2} />
            <span>Delete Account</span>
          </button>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Delete Account & Wipe Vault"
        description="Are you sure you want to delete your account? All encrypted messages, preferences, and session tokens will be permanently erased."
        confirmLabel="Delete Everything"
        cancelLabel="Cancel"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
