/**
 * ContactUsPage
 *
 * Developer support and contact form page for NotiCatch.
 * Styled in clean Signal aesthetic with crisp white card surfaces and blue accent.
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
    if (!validateForm()) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-white text-[#111827]">
        <TopAppBar
          title="Contact Us"
          leading={
            <IconButton
              id="contact-back-button"
              icon={<ArrowLeft className="w-5 h-5 text-[#111827]" strokeWidth={2.2} />}
              label="Go back"
              onClick={() => navigate(-1)}
            />
          }
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center animate-scale-in max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" strokeWidth={2.2} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-[#111827]">Message Logged</h2>
            <p className="text-xs text-[#6B7280] leading-relaxed font-medium">
              Your feedback has been recorded locally on your device.
            </p>
          </div>
          <button
            id="contact-done-button"
            type="button"
            onClick={() => navigate(-1)}
            className="w-full py-3 rounded-2xl text-white font-bold text-xs shadow-xs"
            style={{ background: '#2C6BED' }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white text-[#111827]">
      <TopAppBar
        title="Contact Us"
        subtitle="NotiCatch Developer Support"
        leading={
          <IconButton
            id="contact-back-button"
            icon={<ArrowLeft className="w-5 h-5 text-[#111827]" strokeWidth={2.2} />}
            label="Go back"
            onClick={() => navigate(-1)}
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
              className="flex items-center gap-3 px-4 py-3 text-left rounded-2xl border border-[#E5E7EB] bg-white shadow-xs hover:border-[#2C6BED] transition-colors"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#2C6BED] shrink-0 border border-[#DBEAFE]" style={{ background: '#EEF2FF' }}>
                <Mail className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#111827]">Email Support</p>
                <p className="text-2xs text-[#6B7280] truncate font-medium">kushshah.ce@gmail.com</p>
              </div>
            </a>
            <a
              id="contact-github-link"
              href="https://github.com/kush1310/DeletedMsgReader"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 text-left rounded-2xl border border-[#E5E7EB] bg-white shadow-xs hover:border-[#2C6BED] transition-colors"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#111827] shrink-0 border border-[#E5E7EB]" style={{ background: '#F8F9FA' }}>
                <Github className="w-4 h-4" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#111827]">Repository</p>
                <p className="text-2xs text-[#6B7280] truncate font-medium">Open an issue</p>
              </div>
            </a>
          </div>

          {/* Support form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4 rounded-2xl border border-[#E5E7EB] bg-white shadow-xs">
            <h2 className="text-sm font-bold text-[#111827]">Send a Direct Message</h2>

            {/* Category */}
            <div className="space-y-1.5">
              <label htmlFor="contact-category" className="text-xs font-semibold text-[#6B7280]">
                Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    id={`category-${option.value}-button`}
                    type="button"
                    onClick={() => setCategory(option.value)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-left ${
                      category === option.value
                        ? 'border-[#2C6BED] text-[#2C6BED] bg-[#EEF2FF]'
                        : 'border-[#E5E7EB] text-[#6B7280] bg-[#F8F9FA] hover:text-[#111827]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label htmlFor="contact-subject" className="text-xs font-semibold text-[#6B7280]">
                Subject
              </label>
              <input
                id="contact-subject"
                type="text"
                value={subject}
                onChange={event => { setSubject(event.target.value); setErrors(prev => ({ ...prev, subject: '' })); }}
                placeholder="Brief summary of your inquiry..."
                maxLength={150}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#111827] focus:outline-none focus:border-[#2C6BED] focus:bg-white transition-all"
              />
              {errors.subject && <p className="text-xs text-rose-600 font-semibold" role="alert">{errors.subject}</p>}
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label htmlFor="contact-message" className="text-xs font-semibold text-[#6B7280]">
                Message
              </label>
              <textarea
                id="contact-message"
                value={message}
                onChange={event => { setMessage(event.target.value); setErrors(prev => ({ ...prev, message: '' })); }}
                placeholder="Detailed explanation of the issue or feedback..."
                rows={5}
                maxLength={2000}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#111827] focus:outline-none focus:border-[#2C6BED] focus:bg-white resize-none transition-all"
              />
              <div className="flex items-center justify-between">
                {errors.message
                  ? <p className="text-xs text-rose-600 font-semibold" role="alert">{errors.message}</p>
                  : <span />
                }
                <span className="text-2xs text-[#6B7280] font-medium">{message.length}/2000</span>
              </div>
            </div>

            <button
              id="contact-submit-button"
              type="submit"
              className="w-full py-3 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              style={{ background: '#2C6BED' }}
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
