/**
 * InactivityLockService.ts
 *
 * Real-time user inactivity tracking and automated session locking service.
 * Continuously measures elapsed time between user input events and forces
 * re-authentication once the persisted timeout threshold has expired.
 *
 * Features:
 *   1. Active 1000ms heartbeat interval.
 *   2. Global interaction event capture (pointer, touch, keydown, scroll).
 *   3. Background-to-foreground elapsed duration calculation via Capacitor App.
 */

import { App as CapApp } from '@capacitor/app';
import { loadAppSettings } from '@/services/NativeBridgeService';

type LockCallback = () => void;

class InactivityLockManager {
  private lastActivityTimestamp: number = Date.now();
  private backgroundedTimestamp: number | null = null;
  private heartbeatTimerId: ReturnType<typeof setInterval> | null = null;
  private lockListeners: Set<LockCallback> = new Set();
  private isListeningToInputs = false;

  /**
   * Registers a listener callback invoked when inactivity threshold is reached.
   */
  public onLockRequired(callback: LockCallback): () => void {
    this.lockListeners.add(callback);
    return () => {
      this.lockListeners.delete(callback);
    };
  }

  /**
   * Records a user interaction event to refresh the active session lease.
   */
  public recordUserActivity(): void {
    this.lastActivityTimestamp = Date.now();
    try {
      sessionStorage.setItem('session_last_active', String(this.lastActivityTimestamp));
      localStorage.setItem('noticatch_last_active', String(this.lastActivityTimestamp));
    } catch {}
  }

  /**
   * Starts the inactivity monitoring engine and attaches global event listeners.
   */
  public initialize(): void {
    this.recordUserActivity();

    if (!this.isListeningToInputs) {
      const handleInput = () => this.recordUserActivity();
      window.addEventListener('pointerdown', handleInput, { passive: true });
      window.addEventListener('pointermove', handleInput, { passive: true });
      window.addEventListener('touchstart',  handleInput, { passive: true });
      window.addEventListener('keydown',     handleInput, { passive: true });
      window.addEventListener('scroll',      handleInput, { passive: true });
      window.addEventListener('click',       handleInput, { passive: true });
      this.isListeningToInputs = true;
    }

    /* Track Capacitor App background and foreground lifecycle */
    CapApp.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive) {
        this.backgroundedTimestamp = Date.now();
      } else {
        if (this.backgroundedTimestamp) {
          const elapsedInBackground = Date.now() - this.backgroundedTimestamp;
          this.backgroundedTimestamp = null;
          await this.evaluateInactivity(elapsedInBackground);
        }
      }
    }).catch(() => {});

    /* Heartbeat interval checking every 2000ms */
    if (!this.heartbeatTimerId) {
      this.heartbeatTimerId = setInterval(() => {
        const elapsedSinceActive = Date.now() - this.lastActivityTimestamp;
        this.evaluateInactivity(elapsedSinceActive);
      }, 2000);
    }
  }

  /**
   * Compares elapsed time against persisted settings timeout.
   */
  private async evaluateInactivity(elapsedMs: number): Promise<void> {
    const sessionStart = sessionStorage.getItem('session_start') || localStorage.getItem('noticatch_session_start');
    if (!sessionStart) return; /* Already locked or logged out */

    const settings = await loadAppSettings();
    if (!settings || settings.sessionTimeoutSeconds === 0) return; /* "Never" */

    const thresholdMs = settings.sessionTimeoutSeconds * 1000;
    if (elapsedMs >= thresholdMs) {
      this.triggerLock();
    }
  }

  /**
   * Invalidates active session tokens and notifies all registered guards.
   */
  public triggerLock(): void {
    try {
      sessionStorage.removeItem('session_start');
      sessionStorage.removeItem('session_last_active');
      localStorage.removeItem('noticatch_session_start');
      localStorage.removeItem('noticatch_last_active');
    } catch {}
    this.lockListeners.forEach(listener => {
      try {
        listener();
      } catch (err) {
        console.error('Error during lock listener dispatch:', err);
      }
    });
  }

  /**
   * Cleans up running intervals.
   */
  public destroy(): void {
    if (this.heartbeatTimerId) {
      clearInterval(this.heartbeatTimerId);
      this.heartbeatTimerId = null;
    }
  }
}

export const inactivityLockService = new InactivityLockManager();
