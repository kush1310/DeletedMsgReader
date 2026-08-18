/**
 * FeedbackPage
 *
 * Diagnostics report and user feedback submission page for NotiCatch.
 * Allows the user to rate the application experience (1–5 stars),
 * describe any issues, and optionally attach anonymized diagnostic information.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, CheckCircle2, Bug, Cpu } from 'lucide-react';
import { TopAppBar, IconButton } from '@/components/navigation';
import { ToggleSwitch } from '@/components/common';
import { sanitizeTextInput } from '@/services/SecurityService';

/**
 * FeedbackPage
 *
 * Renders a 5-star rating widget and feedback form in Material Design 3 Light Mode.
 */
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
    if (sanitizedText.length > 0 && sanitizedText.length < 10) {
      newErrors.feedback = 'Feedback must be at least 10 characters if provided.';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-surface-800">
        <TopAppBar
          title="Feedback"
          leading={
            <IconButton
              id="feedback-back-button"
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
            <h2 className="text-lg font-bold text-content-primary">Thank You!</h2>
            <p className="text-sm text-content-muted leading-relaxed font-medium">
              Your feedback helps enhance NotiCatch reliability and message retention capabilities.
            </p>
          </div>
          <button id="feedback-done-button" type="button" onClick={() => navigate(-1)} className="btn-primary px-8">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-800">
      <TopAppBar
        title="Feedback & Diagnostics"
        subtitle="Help us refine NotiCatch"
        leading={
          <IconButton
            id="feedback-back-button"
            icon={<ArrowLeft className="w-5 h-5 text-content-primary" strokeWidth={2.2} />}
            label="Go back"
            onClick={() => navigate(-1)}
          />
        }
      />

      <div className="flex-1 overflow-y-auto pt-14 pb-8 px-4">
        <form onSubmit={handleSubmit} className="py-4 space-y-4 max-w-lg mx-auto animate-slide-up">

          {/* Star rating */}
          <div className="card p-5 space-y-4">
            <div className="text-center">
              <p className="text-sm font-bold text-content-primary mb-1">Rate your experience</p>
              <p className="text-xs text-content-muted font-medium">
                {hoverRating > 0 ? ratingLabels[hoverRating] : rating > 0 ? ratingLabels[rating] : 'Tap a star to rate'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  id={`star-${star}-button`}
                  type="button"
                  onClick={() => { setRating(star); setErrors(prev => ({ ...prev, rating: '' })); }}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-all duration-150 active:scale-90 p-1"
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`w-9 h-9 transition-all duration-150 ${
                      star <= (hoverRating || rating)
                        ? 'text-amber-500 fill-amber-400'
                        : 'text-surface-600'
                    }`}
                    strokeWidth={1.8}
                  />
                </button>
              ))}
            </div>
            {errors.rating && <p className="text-xs text-red-600 font-semibold text-center" role="alert">{errors.rating}</p>}
          </div>

          {/* Feedback text */}
          <div className="card p-5 space-y-3">
            <label htmlFor="feedback-text" className="text-sm font-bold text-content-primary block">
              Additional Feedback
              <span className="text-content-muted font-normal ml-1 text-xs">(optional)</span>
            </label>
            <textarea
              id="feedback-text"
              value={feedbackText}
              onChange={event => { setFeedbackText(event.target.value); setErrors(prev => ({ ...prev, feedback: '' })); }}
              placeholder="Describe what features you like or issues you encountered..."
              rows={4}
              maxLength={1000}
              className="input-field resize-none"
            />
            <div className="flex items-center justify-between">
              {errors.feedback
                ? <p className="text-xs text-red-600 font-semibold" role="alert">{errors.feedback}</p>
                : <span />
              }
              <span className="text-2xs text-content-muted font-medium">{feedbackText.length}/1000</span>
            </div>
          </div>

          {/* Diagnostic info toggle */}
          <div className="card-interactive flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl bg-surface-800 flex items-center justify-center text-accent flex-shrink-0">
              <Cpu className="w-5 h-5 text-accent" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-content-primary">Include Diagnostic Info</p>
              <p className="text-xs text-content-muted mt-0.5 font-medium">OS version, notification count — no message text</p>
            </div>
            <ToggleSwitch
              id="diagnostic-info-toggle"
              label="Include diagnostic info"
              checked={includeDiag}
              onChange={setIncludeDiag}
            />
          </div>

          {includeDiag && (
            <div className="card p-4 space-y-2 border-surface-700 bg-surface-850 animate-slide-up">
              <div className="flex items-center gap-2 text-content-secondary">
                <Bug className="w-4 h-4 text-accent" strokeWidth={2} />
                <span className="text-xs font-bold">Diagnostic payload preview</span>
              </div>
              <div className="bg-surface-900 rounded-xl p-3 font-mono text-2xs text-content-secondary border border-surface-700 space-y-0.5">
                <p>app: NotiCatch v1.0.0</p>
                <p>target_pkg: com.whatsapp</p>
                <p>listener_service: ACTIVE</p>
                <p>battery_saver_exemption: GRANTED</p>
                <p>local_sqlite_cipher: ACTIVE</p>
              </div>
            </div>
          )}

          <button id="feedback-submit-button" type="submit" className="btn-primary w-full">
            Submit Feedback
          </button>
        </form>
      </div>
    </div>
  );
}
