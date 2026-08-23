/**
 * HapticService — NotiCatch Haptic Feedback Engine
 *
 * Provides a centralized, intensity-aware haptic feedback system for the
 * entire NotiCatch application. Bridges the React layer to the Android
 * HapticFeedbackConstants and Vibrator API via Capacitor.
 *
 * Intensity Levels (user-configurable, stored in AppSettings):
 *   0 — Silent:    No haptic at all.
 *   1 — Light:     Subtle 15ms tactile pulse.
 *   2 — Standard:  Crisp 35ms medium confirmation pulse.
 *   3 — Strong:    Heavy 80ms solid vibration.
 *   4 — Maximum:   Double 150ms full vibration.
 */

export type HapticIntensityLevel = 0 | 1 | 2 | 3 | 4;

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

const HAPTIC_LEVEL_STORAGE_KEY = 'noticatch_haptic_level';
const DEFAULT_HAPTIC_LEVEL: HapticIntensityLevel = 2;

/** Duration in milliseconds for each intensity level [Light, Standard, Strong, Maximum] */
const LEVEL_BASE_DURATIONS: [number, number, number, number] = [15, 35, 80, 150];

const VIBRATION_PATTERNS: Record<HapticEvent, [number, number, number, number]> = {
  tap:          [12, 30,  70, 130],
  selection:    [15, 35,  80, 150],
  impact:       [20, 45, 100, 180],
  longPress:    [25, 60, 120, 220],
  success:      [15, 40,  90, 160],
  error:        [30, 70, 140, 250],
  warning:      [20, 50, 100, 180],
  navigate:     [10, 25,  60, 110],
  delete:       [30, 80, 150, 260],
  toggle:       [15, 35,  75, 140],
  sliderChange: [10, 20,  50, 100],
  panStart:     [12, 30,  70, 130],
  panEnd:       [15, 35,  80, 150],
};

class HapticServiceClass {
  private _currentLevel: HapticIntensityLevel;
  private _hasNativeVibration: boolean;
  private _capacitorHaptics: unknown | null = null;

  constructor() {
    const stored = localStorage.getItem(HAPTIC_LEVEL_STORAGE_KEY);
    const parsed = stored !== null ? parseInt(stored, 10) : DEFAULT_HAPTIC_LEVEL;
    this._currentLevel = this.clampLevel(parsed);
    this._hasNativeVibration = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
    this.loadCapacitorHaptics();
  }

  private async loadCapacitorHaptics(): Promise<void> {
    try {
      const module = await import('@capacitor/haptics');
      this._capacitorHaptics = module.Haptics;
    } catch {
      /* Fallback to Web Vibration API */
    }
  }

  private clampLevel(value: number): HapticIntensityLevel {
    if (isNaN(value)) return DEFAULT_HAPTIC_LEVEL;
    return Math.max(0, Math.min(4, Math.round(value))) as HapticIntensityLevel;
  }

  get level(): HapticIntensityLevel {
    return this._currentLevel;
  }

  /**
   * setLevel
   *
   * Updates the active haptic intensity level, persists to localStorage,
   * and fires a live tactile sample so the user immediately feels the change.
   */
  setLevel(level: HapticIntensityLevel): void {
    this._currentLevel = this.clampLevel(level);
    localStorage.setItem(HAPTIC_LEVEL_STORAGE_KEY, String(this._currentLevel));
    if (this._currentLevel > 0) {
      void this.previewLevel(this._currentLevel);
    }
  }

  /**
   * previewLevel
   *
   * Fires a sample vibration matching the requested intensity level.
   */
  async previewLevel(level: HapticIntensityLevel): Promise<void> {
    if (level === 0) return;
    const duration = LEVEL_BASE_DURATIONS[level - 1];

    if (this._capacitorHaptics) {
      try {
        const haptics = this._capacitorHaptics as {
          vibrate: (options: { duration: number }) => Promise<void>;
          impact: (options: { style: string }) => Promise<void>;
        };
        const style = level === 1 ? 'Light' : level === 2 ? 'Medium' : 'Heavy';
        await haptics.impact({ style });
        await haptics.vibrate({ duration });
        return;
      } catch {}
    }

    if (this._hasNativeVibration) {
      try {
        if (level === 4) {
          navigator.vibrate([80, 40, 80]);
        } else {
          navigator.vibrate(duration);
        }
      } catch {}
    }
  }

  private async fire(event: HapticEvent): Promise<void> {
    if (this._currentLevel === 0) return;

    const levelIndex = this._currentLevel - 1;
    const durationMs = VIBRATION_PATTERNS[event][levelIndex];

    if (this._capacitorHaptics) {
      try {
        const haptics = this._capacitorHaptics as {
          impact: (options: { style: string }) => Promise<void>;
          notification: (options: { type: string }) => Promise<void>;
          vibrate: (options: { duration: number }) => Promise<void>;
        };

        if (event === 'success') {
          await haptics.notification({ type: 'SUCCESS' });
        } else if (event === 'error') {
          await haptics.notification({ type: 'ERROR' });
        } else if (event === 'warning') {
          await haptics.notification({ type: 'WARNING' });
        } else {
          const style = this._currentLevel === 1 ? 'Light' : this._currentLevel === 2 ? 'Medium' : 'Heavy';
          await haptics.impact({ style });
        }

        /* Augment with physical duration scaling for true intensity differentiation */
        await haptics.vibrate({ duration: durationMs });
        return;
      } catch {}
    }

    if (this._hasNativeVibration) {
      try {
        if (event === 'error' && this._currentLevel >= 3) {
          navigator.vibrate([60, 40, 60]);
        } else if (this._currentLevel === 4) {
          navigator.vibrate([durationMs * 0.6, 30, durationMs * 0.4]);
        } else {
          navigator.vibrate(durationMs);
        }
      } catch {}
    }
  }

  tap(): void          { void this.fire('tap'); }
  selection(): void    { void this.fire('selection'); }
  impact(): void       { void this.fire('impact'); }
  longPress(): void    { void this.fire('longPress'); }
  success(): void      { void this.fire('success'); }
  error(): void        { void this.fire('error'); }
  warning(): void      { void this.fire('warning'); }
  navigate(): void     { void this.fire('navigate'); }
  deleteAction(): void { void this.fire('delete'); }
  toggle(): void       { void this.fire('toggle'); }
  sliderChange(): void { void this.fire('sliderChange'); }
  panStart(): void     { void this.fire('panStart'); }
  panEnd(): void       { void this.fire('panEnd'); }
}

export const HapticService = new HapticServiceClass();
