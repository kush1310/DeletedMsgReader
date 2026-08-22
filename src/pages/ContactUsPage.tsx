/**
 * ContactUsPage
 *
 * Developer support and contact form page for NotiCatch.
 * Styled with Material 3 semantic tokens, standalone theme support, and haptic feedback.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Github, Send, CheckCircle2 } from 'lucide-react';
import { TopAppBar, IconButton } from '@/components/navigation';
import { sanitizeTextInput, validateSearchQuery } from '@/services/SecurityService';
import { HapticService } from '@/services/HapticService';

type ContactCategory = 'bug' | 'feature' | 'question' | 'other';

const CATEGORY_OPTIONS: Array<{ value: ContactCategory; label: string }> = [
  { value: 'bug',     label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'question',label: 'Question' },
  { value: 'other',   label: 'Other' },
];

export function ContactUsPage() {
  const navigate = useNavigate();

  const [category, setCategory] = useState<ContactCategory>('bug');
  const [subject,  setSubject]  = useState('');
  const [message,  setMessage]  = useState('');
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    const sanitizedSubject = sanitizeTextInput(subject, 150);
    const sanitizedMessage = sanitizeTextInput(message, 2000);

    if (!validateSearchQuery(sanitizedSubject)) {
      newErrors.subject = 'Subject is required (max 150 characters).';
    }
    if (sanitizedMessage.length < 10) {
      newErrors.message = 'Message must be at least 10 characters.';
    }
    if (sanitizedMessage.length > 2000) {
      newErrors.message = 'Message must not exceed 2000 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    if (!validateForm()) {
      HapticService.error();
      return;
    }
    HapticService.success();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{
          background: 'var(--md-sys-color-background)',
          color: 'var(--md-sys-color-on-surface)',
        }}
      >
        <TopAppBar
          title="Contact Us"
          leading={
            <IconButton
              id="contact-back-button"
              icon={<ArrowLeft className="w-5 h-5" style={{ color: 'var(--md-sys-color-on-surface)' }} strokeWidth={2.2} />}
              label="Go back"
              onClick={() => {
                HapticService.navigate();
                navigate(-1);
              }}
            />
          }
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center animate-scale-in max-w-sm mx-auto">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xs border"
            style={{
              background: 'var(--md-sys-color-success-container)',
              borderColor: 'var(--md-sys-color-success-border)',
              color: 'var(--md-sys-color-success)',
            }}
          >
            <CheckCircle2 className="w-8 h-8" strokeWidth={2.2} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Message Logged</h2>
            <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
              Your feedback has been recorded locally on your device.
            </p>
          </div>
          <button
            id="contact-done-button"
            type="button"
            onClick={() => {
              HapticService.navigate();
              navigate(-1);
            }}
            className="btn-primary w-full text-xs font-bold"
          >
            Done
          </button>
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
        title="Contact Us"
        subtitle="NotiCatch Developer Support"
        leading={
          <IconButton
            id="contact-back-button"
            icon={<ArrowLeft className="w-5 h-5" style={{ color: 'var(--md-sys-color-on-surface)' }} strokeWidth={2.2} />}
            label="Go back"
            onClick={() => {
              HapticService.navigate();
              navigate(-1);
            }}
          />
        }
      />

      <div className="flex-1 overflow-y-auto pt-16 pb-8 px-4">
        <div className="py-2 space-y-4 max-w-lg mx-auto animate-slide-up">

          {/* Quick contact channels */}
          <div className="grid grid-cols-2 gap-3">
            <a
              id="contact-email-link"
              href="mailto:kushshah.ce@gmail.com"
              onClick={() => HapticService.tap()}
              className="flex items-center gap-3 px-4 py-3 text-left rounded-2xl border shadow-xs transition-colors"
              style={{
                background: 'var(--md-sys-color-surface)',
                borderColor: 'var(--md-sys-color-outline-variant)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                style={{
                  background: 'var(--md-sys-color-primary-container)',
                  borderColor: 'var(--md-sys-color-outline-variant)',
                  color: 'var(--md-sys-color-primary)',
                }}
              >
                <Mail className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Email Support</p>
                <p className="text-2xs truncate font-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                  kushshah.ce@gmail.com
                </p>
              </div>
            </a>
            <a
              id="contact-github-link"
              href="https://github.com/kush1310/DeletedMsgReader"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => HapticService.tap()}
              className="flex items-center gap-3 px-4 py-3 text-left rounded-2xl border shadow-xs transition-colors"
              style={{
                background: 'var(--md-sys-color-surface)',
                borderColor: 'var(--md-sys-color-outline-variant)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                style={{
                  background: 'var(--md-sys-color-surface-container)',
                  borderColor: 'var(--md-sys-color-outline-variant)',
                  color: 'var(--md-sys-color-on-surface)',
                }}
              >
                <Github className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Repository</p>
                <p className="text-2xs truncate font-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                  Open an issue
                </p>
              </div>
            </a>
          </div>

          {/* Support form */}
          <form
            onSubmit={handleSubmit}
            className="p-5 space-y-4 rounded-2xl border shadow-xs"
            style={{
              background: 'var(--md-sys-color-surface)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <h2 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Send a Direct Message</h2>

            {/* Category */}
            <div className="space-y-1.5">
              <label
                htmlFor="contact-category"
                className="text-xs font-semibold block"
                style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
              >
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    id={`category-${option.value}-button`}
                    type="button"
                    onClick={() => {
                      HapticService.selection();
                      setCategory(option.value);
                    }}
                    className="py-2 px-3 rounded-xl text-xs font-bold border transition-all text-left min-h-[40px]"
                    style={{
                      background: category === option.value
                        ? 'var(--md-sys-color-primary-container)'
                        : 'var(--md-sys-color-surface-container)',
                      color: category === option.value
                        ? 'var(--md-sys-color-on-primary-container)'
                        : 'var(--md-sys-color-on-surface-variant)',
                      borderColor: category === option.value
                        ? 'var(--md-sys-color-primary)'
                        : 'var(--md-sys-color-outline-variant)',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label
                htmlFor="contact-subject"
                className="text-xs font-semibold block"
                style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
              >
                Subject
              </label>
              <input
                id="contact-subject"
                type="text"
                value={subject}
                onChange={event => { setSubject(event.target.value); setErrors(prev => ({ ...prev, subject: '' })); }}
                placeholder="Brief summary of your inquiry..."
                maxLength={150}
                className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-none transition-all"
                style={{
                  background: 'var(--md-sys-color-surface-container)',
                  borderColor: 'var(--md-sys-color-outline-variant)',
                  color: 'var(--md-sys-color-on-surface)',
                }}
              />
              {errors.subject && (
                <p className="text-xs font-semibold" style={{ color: 'var(--md-sys-color-error)' }} role="alert">
                  {errors.subject}
                </p>
              )}
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label
                htmlFor="contact-message"
                className="text-xs font-semibold block"
                style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
              >
                Message
              </label>
              <textarea
                id="contact-message"
                value={message}
                onChange={event => { setMessage(event.target.value); setErrors(prev => ({ ...prev, message: '' })); }}
                placeholder="Detailed explanation of the issue or feedback..."
                rows={5}
                maxLength={2000}
                className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-none resize-none transition-all"
                style={{
                  background: 'var(--md-sys-color-surface-container)',
                  borderColor: 'var(--md-sys-color-outline-variant)',
                  color: 'var(--md-sys-color-on-surface)',
                }}
              />
              <div className="flex items-center justify-between">
                {errors.message ? (
                  <p className="text-xs font-semibold" style={{ color: 'var(--md-sys-color-error)' }} role="alert">
                    {errors.message}
                  </p>
                ) : (
                  <span />
                )}
                <span className="text-2xs font-medium" style={{ color: 'var(--md-sys-color-on-surface-muted)' }}>
                  {message.length}/2000
                </span>
              </div>
            </div>

            <button
              id="contact-submit-button"
              type="submit"
              className="btn-primary w-full text-xs font-bold flex items-center justify-center gap-2 min-h-[48px]"
            >
              <Send className="w-4 h-4" strokeWidth={2} />
              <span>Submit Message</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
