/**
 * HapticService — NotiCatch Haptic Feedback Engine
 *
 * Provides a centralized, intensity-aware haptic feedback system for the
 * entire NotiCatch application. Bridges the React layer to the Android
 * HapticFeedbackConstants API via the Capacitor plugin layer.
 *
 * Intensity Levels (user-configurable, stored in AppSettings):
 *   0 — Silent:    No haptic at all. Useful for silent environments.
 *   1 — Light:     Very subtle, keyboard-style taps.
 *   2 — Standard:  Default system haptic (medium confirmation feel).
 *   3 — Strong:    Heavier confirmation pulses.
 *   4 — Maximum:   Full vibration for critical actions (panic wipe, errors).
 *
 * All interaction types map to the correct intensity tier automatically
 * based on the user's configured level. If the native plugin is unavailable
 * (web preview), falls back to the Web Vibration API as a graceful degradation.
 *
 * Usage:
 *   import { HapticService } from '@/services/HapticService';
 *   HapticService.tap();        // light tap — keyboard, chip selection
 *   HapticService.selection();  // filter pill change, toggle change
 *   HapticService.impact();     // significant action confirmation
 *   HapticService.longPress();  // long-press menu trigger
 *   HapticService.success();    // operation confirmed
 *   HapticService.error();      // error state notification
 *   HapticService.warning();    // caution feedback
 */

/**
 * HapticIntensityLevel
 *
 * Type representing the 5-tier haptic intensity scale (0–4).
 * 0 = off, 4 = maximum.
 */
export type HapticIntensityLevel = 0 | 1 | 2 | 3 | 4;

/**
 * HapticEvent
 *
 * Categorized event types that map to distinct patterns at each intensity level.
 */
export type HapticEvent =
  | 'tap'
  | 'selection'
  | 'impact'
  | 'longPress'
  | 'success'
  | 'error'
  | 'warning'
  | 'navigate'
  | 'delete'
  | 'toggle'
  | 'sliderChange'
  | 'panStart'
  | 'panEnd';

/** Local storage key for persisting haptic intensity level */
const HAPTIC_LEVEL_STORAGE_KEY = 'noticatch_haptic_level';

/** Default intensity level on first launch */
const DEFAULT_HAPTIC_LEVEL: HapticIntensityLevel = 2;

/**
 * Vibration pattern matrix — [lightVibrationMs, standardMs, strongMs, maximumMs]
 * Indexed by intensity level 1–4 (0 = silent).
 *
 * Patterns chosen to match Android HapticFeedbackConstants semantics:
 * - VIRTUAL_KEY, KEYBOARD_TAP, LONG_PRESS, CONFIRM, REJECT
 */
const VIBRATION_PATTERNS: Record<HapticEvent, [number, number, number, number]> = {
  tap:          [5,  10, 15, 25],
  selection:    [6,  12, 18, 28],
  impact:       [8,  16, 28, 50],
  longPress:    [12, 24, 40, 70],
  success:      [8,  18, 30, 50],
  error:        [20, 40, 80, [30, 50, 30].reduce((a, b) => a + b)],
  warning:      [10, 20, 36, 60],
  navigate:     [4,  8,  12, 18],
  delete:       [15, 30, 55, 90],
  toggle:       [5,  10, 16, 26],
  sliderChange: [3,  6,  9,  14],
  panStart:     [6,  12, 20, 32],
  panEnd:       [8,  16, 26, 42],
};

/**
 * Error vibration pattern uses a double-pulse for levels 3–4.
 */
const ERROR_DOUBLE_PULSE: Record<HapticIntensityLevel, number | number[]> = {
  0: 0,
  1: 20,
  2: 40,
  3: [30, 50, 30],
  4: [50, 80, 50],
};

/**
 * HapticService
 *
 * Singleton-style service class managing haptic intensity state and providing
 * typed feedback methods for every interaction type in the application.
 */
class HapticServiceClass {
  private _currentLevel: HapticIntensityLevel;
  private _hasNativeVibration: boolean;
  private _capacitorHaptics: unknown | null = null;

  constructor() {
    /* Load persisted level from storage, fallback to default */
    const stored = localStorage.getItem(HAPTIC_LEVEL_STORAGE_KEY);
    const parsed = stored !== null ? parseInt(stored, 10) : DEFAULT_HAPTIC_LEVEL;
    this._currentLevel = this.clampLevel(parsed);

    /* Detect Web Vibration API */
    this._hasNativeVibration = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

    /* Attempt to load Capacitor Haptics plugin lazily */
    this.loadCapacitorHaptics();
  }

  /**
   * loadCapacitorHaptics
   *
   * Attempts to dynamically import the @capacitor/haptics plugin.
   * Silently fails on web — Web Vibration API is the fallback.
   */
  private async loadCapacitorHaptics(): Promise<void> {
    try {
      const module = await import('@capacitor/haptics');
      this._capacitorHaptics = module.Haptics;
    } catch {
      /* Plugin unavailable — will use Web Vibration API fallback */
    }
  }

  /**
   * clampLevel
   *
   * Validates and clamps a numeric value to the valid HapticIntensityLevel range (0–4).
   *
   * @param  value - Raw numeric value from storage or user input.
   * @returns      - Clamped value as HapticIntensityLevel.
   */
  private clampLevel(value: number): HapticIntensityLevel {
    if (isNaN(value)) return DEFAULT_HAPTIC_LEVEL;
    return Math.max(0, Math.min(4, Math.round(value))) as HapticIntensityLevel;
  }

  /**
   * getLevel
   *
   * Returns the currently active haptic intensity level.
   *
   * @returns HapticIntensityLevel (0–4).
   */
  get level(): HapticIntensityLevel {
    return this._currentLevel;
  }

  /**
   * setLevel
   *
   * Updates the haptic intensity level and persists it to localStorage.
   * Immediately fires a confirmation pulse at the new level so the user
   * can feel the difference when adjusting the slider.
   *
   * @param level - New intensity level (0–4).
   */
  setLevel(level: HapticIntensityLevel): void {
    this._currentLevel = this.clampLevel(level);
    localStorage.setItem(HAPTIC_LEVEL_STORAGE_KEY, String(this._currentLevel));
    /* Confirmation pulse — let user feel the change */
    if (this._currentLevel > 0) {
      this.fire('selection');
    }
  }

  /**
   * fire
   *
   * Core dispatch method. Resolves the vibration pattern for the given event
   * at the current intensity level and triggers the appropriate platform API.
   *
   * On Android (via Capacitor Haptics): uses ImpactStyle or VibrationNotificationType.
   * On web (fallback): uses navigator.vibrate().
   *
   * @param event - The HapticEvent type to fire.
   */
  private async fire(event: HapticEvent): Promise<void> {
    if (this._currentLevel === 0) return;

    /* Try Capacitor Haptics first (Android native — best quality) */
    if (this._capacitorHaptics) {
      try {
        const haptics = this._capacitorHaptics as {
          impact: (options: { style: string }) => Promise<void>;
          notification: (options: { type: string }) => Promise<void>;
          vibrate: (options: { duration: number }) => Promise<void>;
        };

        switch (event) {
          case 'tap':
          case 'navigate':
          case 'sliderChange':
            await haptics.impact({
              style: this._currentLevel <= 1 ? 'Light' : this._currentLevel <= 2 ? 'Light' : 'Medium',
            });
            break;

          case 'selection':
          case 'toggle':
          case 'panStart':
          case 'panEnd':
            await haptics.impact({
              style: this._currentLevel <= 2 ? 'Light' : 'Medium',
            });
            break;

          case 'impact':
            await haptics.impact({
              style: this._currentLevel <= 2 ? 'Medium' : 'Heavy',
            });
            break;

          case 'longPress':
            await haptics.impact({
              style: this._currentLevel <= 1 ? 'Light' : this._currentLevel <= 2 ? 'Medium' : 'Heavy',
            });
            break;

          case 'success':
            await haptics.notification({ type: 'SUCCESS' });
            break;

          case 'warning':
            await haptics.notification({ type: 'WARNING' });
            break;

          case 'error':
            await haptics.notification({ type: 'ERROR' });
            break;

          case 'delete':
            if (this._currentLevel >= 3) {
              await haptics.impact({ style: 'Heavy' });
            } else {
              await haptics.impact({ style: 'Medium' });
            }
            break;

          default:
            await haptics.impact({ style: 'Light' });
        }
        return;
      } catch {
        /* Capacitor call failed — fall through to Web Vibration API */
      }
    }

    /* Fallback: Web Vibration API */
    if (!this._hasNativeVibration) return;

    const levelIndex = this._currentLevel - 1; /* 0-indexed into pattern arrays */

    try {
      if (event === 'error' && this._currentLevel >= 3) {
        const pattern = ERROR_DOUBLE_PULSE[this._currentLevel];
        if (Array.isArray(pattern)) {
          navigator.vibrate(pattern);
        } else {
          navigator.vibrate(pattern);
        }
        return;
      }

      const pattern = VIBRATION_PATTERNS[event];
      const durationMs = pattern[levelIndex];
      if (durationMs > 0) {
        navigator.vibrate(durationMs);
      }
    } catch {
      /* Vibration not permitted or not available */
    }
  }

  /* ── Public Interaction Methods ──────────────────────────────────── */

  /**
   * tap
   *
   * Very light tap feedback — suitable for keyboard keys, chip selection,
   * and any micro-interaction where a subtle response is needed.
   */
  tap(): void { void this.fire('tap'); }

  /**
   * selection
   *
   * Selection-changed feedback — filter pills, radio options, sort mode change.
   */
  selection(): void { void this.fire('selection'); }

  /**
   * impact
   *
   * Medium impact — significant action confirmation such as navigation
   * between major screens, submitting a form, or completing an export.
   */
  impact(): void { void this.fire('impact'); }

  /**
   * longPress
   *
   * Long-press trigger — fires when the long-press threshold is crossed
   * to confirm the gesture has been registered before showing the action sheet.
   */
  longPress(): void { void this.fire('longPress'); }

  /**
   * success
   *
   * Success notification pattern — used for completed operations:
   * mark-as-read, export success, authentication success.
   */
  success(): void { void this.fire('success'); }

  /**
   * error
   *
   * Error notification pattern — authentication failure, validation error.
   * At levels 3–4, a double-pulse is fired to emphasize the error state.
   */
  error(): void { void this.fire('error'); }

  /**
   * warning
   *
   * Warning notification — permission banner interaction, caution prompts.
   */
  warning(): void { void this.fire('warning'); }

  /**
   * navigate
   *
   * Very light tap for navigation tab changes and back-button presses.
   */
  navigate(): void { void this.fire('navigate'); }

  /**
   * deleteAction
   *
   * Strongest non-error haptic — confirms a destructive deletion operation.
   * Heavier at levels 3–4 to communicate irreversibility.
   */
  deleteAction(): void { void this.fire('delete'); }

  /**
   * toggle
   *
   * Toggle switch change — medium-light click feel.
   */
  toggle(): void { void this.fire('toggle'); }

  /**
   * sliderChange
   *
   * Extremely subtle tick feedback as slider value crosses integer thresholds.
   * Intended for the haptic intensity slider itself.
   */
  sliderChange(): void { void this.fire('sliderChange'); }

  /**
   * panStart / panEnd
   *
   * Gesture boundary feedback for swipe-to-dismiss or pull-to-refresh.
   */
  panStart(): void { void this.fire('panStart'); }
  panEnd():   void { void this.fire('panEnd'); }
}

/** Singleton instance — import and use directly */
export const HapticService = new HapticServiceClass();
