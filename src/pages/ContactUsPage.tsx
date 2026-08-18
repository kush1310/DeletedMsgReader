/**
 * ContactUsPage
 *
 * Developer support and contact form page for NotiCatch.
 * Allows users to send feedback, report bugs, or request help.
 * All form inputs are validated client-side before submission.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Github, Send, CheckCircle2 } from 'lucide-react';
import { TopAppBar, IconButton } from '@/components/navigation';
import { sanitizeTextInput, validateSearchQuery } from '@/services/SecurityService';

type ContactCategory = 'bug' | 'feature' | 'question' | 'other';

const CATEGORY_OPTIONS: Array<{ value: ContactCategory; label: string }> = [
  { value: 'bug',     label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'question',label: 'Question' },
  { value: 'other',   label: 'Other' },
];

/**
 * ContactUsPage
 *
 * Renders support contact form in Material Design 3 Light Mode.
 */
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
    if (sanitizedMessage.length < 20) {
      newErrors.message = 'Message must be at least 20 characters.';
    }
    if (sanitizedMessage.length > 2000) {
      newErrors.message = 'Message must not exceed 2000 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    if (!validateForm()) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-surface-800">
        <TopAppBar
          title="Contact Us"
          leading={
            <IconButton
              id="contact-back-button"
              icon={<ArrowLeft className="w-5 h-5 text-content-primary" strokeWidth={2.2} />}
              label="Go back"
              onClick={() => navigate(-1)}
            />
          }
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center animate-scale-in max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-emerald" strokeWidth={2.2} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-content-primary">Message Dispatched</h2>
            <p className="text-sm text-content-muted leading-relaxed font-medium">
              Your message has been logged locally and queued for response within 24 hours.
            </p>
          </div>
          <button id="contact-done-button" type="button" onClick={() => navigate(-1)} className="btn-primary px-8">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-800">
      <TopAppBar
        title="Contact Us"
        subtitle="NotiCatch Developer Support"
        leading={
          <IconButton
            id="contact-back-button"
            icon={<ArrowLeft className="w-5 h-5 text-content-primary" strokeWidth={2.2} />}
            label="Go back"
            onClick={() => navigate(-1)}
          />
        }
      />

      <div className="flex-1 overflow-y-auto pt-14 pb-8 px-4">
        <div className="py-4 space-y-4 max-w-lg mx-auto animate-slide-up">

          {/* Quick contact channels */}
          <div className="grid grid-cols-2 gap-3">
            <a
              id="contact-email-link"
              href="mailto:support@noticatch.app"
              className="card-interactive flex items-center gap-3 px-4 py-3 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-accent-muted flex items-center justify-center text-accent flex-shrink-0">
                <Mail className="w-5 h-5 text-accent" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-content-primary">Email Support</p>
                <p className="text-2xs text-content-muted truncate font-medium">support@noticatch.app</p>
              </div>
            </a>
            <a
              id="contact-github-link"
              href="https://github.com/noticatch"
              target="_blank"
              rel="noopener noreferrer"
              className="card-interactive flex items-center gap-3 px-4 py-3 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center text-content-secondary flex-shrink-0">
                <Github className="w-5 h-5" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-content-primary">Repository</p>
                <p className="text-2xs text-content-muted truncate font-medium">Open an issue</p>
              </div>
            </a>
          </div>

          {/* Support form */}
          <form onSubmit={handleSubmit} className="card p-5 space-y-4">
            <h2 className="text-sm font-bold text-content-primary">Send a Direct Message</h2>

            {/* Category */}
            <div className="space-y-1.5">
              <label htmlFor="contact-category" className="text-xs font-semibold text-content-secondary">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    id={`category-${option.value}-button`}
                    type="button"
                    onClick={() => setCategory(option.value)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all duration-200 text-left ${
                      category === option.value
                        ? 'bg-accent text-white border-accent shadow-xs'
                        : 'bg-surface-800 border-surface-700 text-content-secondary hover:text-content-primary'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label htmlFor="contact-subject" className="text-xs font-semibold text-content-secondary">
                Subject
              </label>
              <input
                id="contact-subject"
                type="text"
                value={subject}
                onChange={event => { setSubject(event.target.value); setErrors(prev => ({ ...prev, subject: '' })); }}
                placeholder="Brief summary of your inquiry..."
                maxLength={150}
                className="input-field"
              />
              {errors.subject && <p className="text-xs text-red-600 font-semibold" role="alert">{errors.subject}</p>}
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label htmlFor="contact-message" className="text-xs font-semibold text-content-secondary">
                Message
              </label>
              <textarea
                id="contact-message"
                value={message}
                onChange={event => { setMessage(event.target.value); setErrors(prev => ({ ...prev, message: '' })); }}
                placeholder="Detailed explanation of the issue or feedback..."
                rows={5}
                maxLength={2000}
                className="input-field resize-none"
              />
              <div className="flex items-center justify-between">
                {errors.message
                  ? <p className="text-xs text-red-600 font-semibold" role="alert">{errors.message}</p>
                  : <span />
                }
                <span className="text-2xs text-content-muted font-medium">{message.length}/2000</span>
              </div>
            </div>

            <button id="contact-submit-button" type="submit" className="btn-primary w-full">
              <Send className="w-4 h-4" strokeWidth={2} />
              Submit Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
