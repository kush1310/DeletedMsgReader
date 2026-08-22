/**
 * ProfilePage.tsx
 *
 * User Profile and Custom Instructions sub-page for NotiCatch.
 * Styled with Material 3 semantic tokens, standalone theme support, and haptics.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, CheckCircle2 } from 'lucide-react';
import { TopAppBar, IconButton } from '@/components/navigation';
import { ConfirmationModal } from '@/components/common';
import { executePanicWipe } from '@/services/NativeBridgeService';
import { HapticService } from '@/services/HapticService';

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
    HapticService.success();
    localStorage.setItem('noticatch_user_fullname', fullName);
    localStorage.setItem('noticatch_user_callname', callName);
    showToast('Profile updated successfully');
  }

  function handleSavePreferences(): void {
    HapticService.success();
    localStorage.setItem('noticatch_user_preferences', customPreferences);
    showToast('Preferences saved successfully');
  }

  async function handleDeleteAccount(): Promise<void> {
    HapticService.deleteAction();
    setIsDeleting(true);
    await executePanicWipe();
    setIsDeleting(false);
    setShowDeleteModal(false);
    navigate('/setup', { replace: true });
  }

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{
        background: 'var(--md-sys-color-background)',
        color: 'var(--md-sys-color-on-surface)',
      }}
    >
      <TopAppBar
        title="Profile"
        subtitle="User Details & Preferences"
        leading={
          <IconButton
            id="profile-back-button"
            icon={<ArrowLeft className="w-5 h-5" style={{ color: 'var(--md-sys-color-on-surface)' }} strokeWidth={2} />}
            label="Back"
            onClick={() => {
              HapticService.navigate();
              navigate(-1);
            }}
          />
        }
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className="fixed top-16 left-4 right-4 z-50 p-3 rounded-2xl text-xs font-bold text-center shadow-lg animate-slide-down flex items-center justify-center gap-2"
          style={{
            background: 'var(--md-sys-color-primary)',
            color: 'var(--md-sys-color-on-primary)',
          }}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Form Body */}
      <main className="flex-1 pt-20 pb-12 px-5 max-w-lg mx-auto w-full space-y-6 animate-slide-up">
        {/* Profile Inputs */}
        <div
          className="p-5 space-y-4 rounded-2xl border shadow-xs"
          style={{
            background: 'var(--md-sys-color-surface)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <div className="space-y-1.5">
            <label
              htmlFor="profile-full-name"
              className="text-xs font-semibold block"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              Full name
            </label>
            <input
              id="profile-full-name"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none transition-all"
              style={{
                background: 'var(--md-sys-color-surface-container)',
                borderColor: 'var(--md-sys-color-outline-variant)',
                color: 'var(--md-sys-color-on-surface)',
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="profile-call-name"
              className="text-xs font-semibold block"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              What should we call you?
            </label>
            <input
              id="profile-call-name"
              type="text"
              value={callName}
              onChange={e => setCallName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none transition-all"
              style={{
                background: 'var(--md-sys-color-surface-container)',
                borderColor: 'var(--md-sys-color-outline-variant)',
                color: 'var(--md-sys-color-on-surface)',
              }}
            />
          </div>

          <button
            type="button"
            id="update-profile-button"
            onClick={handleUpdateProfile}
            className="btn-primary w-full text-xs font-bold min-h-[44px]"
          >
            Update Profile
          </button>
        </div>

        {/* Custom Instructions / Preferences */}
        <div
          className="p-5 space-y-3 rounded-2xl border shadow-xs"
          style={{
            background: 'var(--md-sys-color-surface)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <h2 className="text-sm font-bold leading-snug" style={{ color: 'var(--md-sys-color-on-surface)' }}>
            Personal instructions and domain mandate
          </h2>
          <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
            Your preferences will apply across the system.
          </p>

          <textarea
            id="profile-custom-preferences"
            rows={6}
            value={customPreferences}
            onChange={e => setCustomPreferences(e.target.value)}
            className="w-full p-4 rounded-2xl border text-xs font-medium leading-relaxed resize-none focus:outline-none transition-all"
            style={{
              background: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
              color: 'var(--md-sys-color-on-surface)',
            }}
          />

          <button
            type="button"
            id="save-preferences-button"
            onClick={handleSavePreferences}
            className="btn-primary w-full text-xs font-bold min-h-[44px]"
          >
            Save Preferences
          </button>
        </div>

        {/* Account Actions */}
        <div
          className="pt-4 border-t space-y-2"
          style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
        >
          <h3 className="text-xs font-semibold" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
            Account Actions
          </h3>

          <button
            type="button"
            id="delete-account-trigger"
            onClick={() => {
              HapticService.warning();
              setShowDeleteModal(true);
            }}
            className="flex items-center gap-3 text-sm font-semibold transition-colors py-2"
            style={{ color: 'var(--md-sys-color-error)' }}
          >
            <Trash2 className="w-4 h-4" strokeWidth={2} />
            <span>Delete Account & Wipe Vault</span>
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
