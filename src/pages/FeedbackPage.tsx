/**
 * FeedbackPage
 *
 * Diagnostics report and user feedback submission page for NotiCatch.
 * Styled in clean Signal aesthetic with crisp white card surfaces.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, CheckCircle2, Bug, Cpu } from 'lucide-react';
import { TopAppBar, IconButton } from '@/components/navigation';
import { ToggleSwitch } from '@/components/common';
import { sanitizeTextInput } from '@/services/SecurityService';

export function FeedbackPage() {
  const navigate = useNavigate();

  const [rating,         setRating]         = useState(0);
  const [hoverRating,    setHoverRating]    = useState(0);
  const [feedbackText,   setFeedbackText]   = useState('');
  const [includeDiag,    setIncludeDiag]    = useState(false);
  const [errors,         setErrors]         = useState<Record<string, string>>({});
  const [submitted,      setSubmitted]      = useState(false);

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    const newErrors: Record<string, string> = {};

    if (rating === 0) {
      newErrors.rating = 'Please select a star rating.';
    }
    const sanitizedText = sanitizeTextInput(feedbackText, 1000);
    if (sanitizedText.length > 0 && sanitizedText.length < 5) {
      newErrors.feedback = 'Feedback must be at least 5 characters if provided.';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-white text-[#111827]">
        <TopAppBar
          title="Feedback"
          leading={
            <IconButton
              id="feedback-back-button"
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
            <h2 className="text-lg font-bold text-[#111827]">Thank You!</h2>
            <p className="text-xs text-[#6B7280] leading-relaxed font-medium">
              Your feedback helps enhance NotiCatch reliability and message retention capabilities.
            </p>
          </div>
          <button
            id="feedback-done-button"
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
        title="Feedback & Diagnostics"
        subtitle="Help us refine NotiCatch"
        leading={
          <IconButton
            id="feedback-back-button"
            icon={<ArrowLeft className="w-5 h-5 text-[#111827]" strokeWidth={2.2} />}
            label="Go back"
            onClick={() => navigate(-1)}
          />
        }
      />

      <div className="flex-1 overflow-y-auto pt-16 pb-8 px-4">
        <form onSubmit={handleSubmit} className="py-2 space-y-4 max-w-lg mx-auto animate-slide-up">

          {/* Star rating */}
          <div className="p-5 space-y-4 rounded-2xl border border-[#E5E7EB] bg-white shadow-xs">
            <div className="text-center">
              <p className="text-sm font-bold text-[#111827] mb-1">Rate your experience</p>
              <p className="text-xs text-[#6B7280] font-medium">
                {hoverRating > 0 ? ratingLabels[hoverRating] : rating > 0 ? ratingLabels[rating] : 'Tap a star to rate'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              {[1, 2, 3, 4, 5].map(star => {
                const filled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    id={`star-rating-button-${star}`}
                    type="button"
                    onClick={() => { setRating(star); setErrors(prev => ({ ...prev, rating: '' })); }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-125 active:scale-95"
                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        filled ? 'text-amber-500 fill-amber-500' : 'text-[#D1D5DB]'
                      }`}
                      strokeWidth={1.5}
                    />
                  </button>
                );
              })}
            </div>
            {errors.rating && <p className="text-xs text-rose-600 font-semibold text-center" role="alert">{errors.rating}</p>}
          </div>

          {/* Feedback text */}
          <div className="p-5 space-y-3 rounded-2xl border border-[#E5E7EB] bg-white shadow-xs">
            <label htmlFor="feedback-text" className="text-xs font-semibold text-[#6B7280]">
              Detailed feedback (optional)
            </label>
            <textarea
              id="feedback-text"
              value={feedbackText}
              onChange={event => { setFeedbackText(event.target.value); setErrors(prev => ({ ...prev, feedback: '' })); }}
              placeholder="What can we improve? Any issues with notification capturing?"
              rows={4}
              maxLength={1000}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] text-xs font-medium text-[#111827] focus:outline-none focus:border-[#2C6BED] focus:bg-white resize-none transition-all"
            />
            {errors.feedback && <p className="text-xs text-rose-600 font-semibold" role="alert">{errors.feedback}</p>}
          </div>

          {/* Include anonymous diagnostics */}
          <div className="p-4 rounded-2xl border border-[#E5E7EB] bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[#2C6BED] shrink-0 border border-[#DBEAFE]" style={{ background: '#EEF2FF' }}>
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#111827]">Include local system diagnostics</p>
                  <p className="text-2xs text-[#6B7280] font-medium">Anonymous environment data</p>
                </div>
              </div>
              <ToggleSwitch
                id="feedback-diag-toggle"
                checked={includeDiag}
                onChange={setIncludeDiag}
                label="Include anonymous system diagnostics"
              />
            </div>

            {includeDiag && (
              <div className="pt-2 border-t border-[#E5E7EB] space-y-2 animate-slide-down">
                <div className="flex items-center gap-1.5 text-2xs text-[#6B7280]">
                  <Bug className="w-3 h-3 text-[#2C6BED]" />
                  <span className="text-xs font-bold text-[#111827]">Diagnostic payload preview</span>
                </div>
                <div className="rounded-xl p-3 font-mono text-2xs text-[#4B5563] border border-[#E5E7EB] bg-[#F8F9FA] space-y-0.5">
                  <p>app: NotiCatch v1.6.3</p>
                  <p>target_pkg: com.whatsapp</p>
                  <p>listener_service: ACTIVE</p>
                  <p>battery_saver_exemption: GRANTED</p>
                  <p>os: Android (Offline Sandbox)</p>
                </div>
              </div>
            )}
          </div>

          <button
            id="feedback-submit-button"
            type="submit"
            className="w-full py-3.5 rounded-2xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            style={{ background: '#2C6BED' }}
          >
            <span>Submit Feedback</span>
          </button>
        </form>
      </div>
    </div>
  );
}
