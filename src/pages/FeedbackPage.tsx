/**
 * FeedbackPage
 *
 * Diagnostics report and user feedback submission page for NotiCatch.
 * Styled with Material 3 semantic tokens, standalone theme support, and haptics.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, CheckCircle2, Bug, Cpu } from 'lucide-react';
import { TopAppBar, IconButton } from '@/components/navigation';
import { ToggleSwitch } from '@/components/common';
import { sanitizeTextInput } from '@/services/SecurityService';
import { HapticService } from '@/services/HapticService';

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
      HapticService.error();
    }
    const sanitizedText = sanitizeTextInput(feedbackText, 1000);
    if (sanitizedText.length > 0 && sanitizedText.length < 5) {
      newErrors.feedback = 'Feedback must be at least 5 characters if provided.';
      HapticService.error();
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

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
          title="Feedback"
          leading={
            <IconButton
              id="feedback-back-button"
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
            <h2 className="text-lg font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Thank You!</h2>
            <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
              Your feedback helps enhance NotiCatch reliability and message retention capabilities.
            </p>
          </div>
          <button
            id="feedback-done-button"
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
        title="Feedback & Diagnostics"
        subtitle="Help us refine NotiCatch"
        leading={
          <IconButton
            id="feedback-back-button"
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
        <form onSubmit={handleSubmit} className="py-2 space-y-4 max-w-lg mx-auto animate-slide-up">

          {/* Star rating */}
          <div
            className="p-5 space-y-4 rounded-2xl border shadow-xs"
            style={{
              background: 'var(--md-sys-color-surface)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <div className="text-center">
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--md-sys-color-on-surface)' }}>Rate your experience</p>
              <p className="text-xs font-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
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
                    onClick={() => {
                      HapticService.selection();
                      setRating(star);
                      setErrors(prev => ({ ...prev, rating: '' }));
                    }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-125 active:scale-95 touch-manipulation"
                    aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        filled ? 'text-amber-500 fill-amber-500' : 'opacity-40'
                      }`}
                      style={{ color: filled ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-outline)' }}
                      strokeWidth={1.5}
                    />
                  </button>
                );
              })}
            </div>
            {errors.rating && (
              <p className="text-xs font-semibold text-center" style={{ color: 'var(--md-sys-color-error)' }} role="alert">
                {errors.rating}
              </p>
            )}
          </div>

          {/* Feedback text */}
          <div
            className="p-5 space-y-3 rounded-2xl border shadow-xs"
            style={{
              background: 'var(--md-sys-color-surface)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <label
              htmlFor="feedback-text"
              className="text-xs font-semibold block"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              Detailed feedback (optional)
            </label>
            <textarea
              id="feedback-text"
              value={feedbackText}
              onChange={event => { setFeedbackText(event.target.value); setErrors(prev => ({ ...prev, feedback: '' })); }}
              placeholder="What can we improve? Any issues with notification capturing?"
              rows={4}
              maxLength={1000}
              className="w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium focus:outline-none resize-none transition-all"
              style={{
                background: 'var(--md-sys-color-surface-container)',
                borderColor: 'var(--md-sys-color-outline-variant)',
                color: 'var(--md-sys-color-on-surface)',
              }}
            />
            {errors.feedback && (
              <p className="text-xs font-semibold" style={{ color: 'var(--md-sys-color-error)' }} role="alert">
                {errors.feedback}
              </p>
            )}
          </div>

          {/* Include anonymous diagnostics */}
          <div
            className="p-4 rounded-2xl border shadow-xs space-y-3"
            style={{
              background: 'var(--md-sys-color-surface)',
              borderColor: 'var(--md-sys-color-outline-variant)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{
                    background: 'var(--md-sys-color-primary-container)',
                    borderColor: 'var(--md-sys-color-outline-variant)',
                    color: 'var(--md-sys-color-primary)',
                  }}
                >
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Include local system diagnostics</p>
                  <p className="text-2xs font-medium" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Anonymous environment data</p>
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
              <div
                className="pt-2 border-t space-y-2 animate-slide-down"
                style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
              >
                <div className="flex items-center gap-1.5 text-2xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                  <Bug className="w-3 h-3" style={{ color: 'var(--md-sys-color-primary)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Diagnostic payload preview</span>
                </div>
                <div
                  className="rounded-xl p-3 font-mono text-2xs border space-y-0.5"
                  style={{
                    background: 'var(--md-sys-color-surface-container)',
                    borderColor: 'var(--md-sys-color-outline-variant)',
                    color: 'var(--md-sys-color-on-surface-variant)',
                  }}
                >
                  <p>app: NotiCatch v2.0.2</p>
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
            className="btn-primary w-full text-xs font-bold flex items-center justify-center gap-2 min-h-[48px]"
          >
            <span>Submit Feedback</span>
          </button>
        </form>
      </div>
    </div>
  );
}
