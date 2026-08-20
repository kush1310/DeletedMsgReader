/**
 * Legal Content & Privacy Documents
 *
 * Exhaustive legal documentation for NotiCatch establishing complete air-gapped
 * on-device isolation, zero cloud data transfer, and user data ownership.
 */

export interface LegalDocument {
  readonly title: string;
  readonly lastUpdated: string;
  readonly summary: string;
  readonly sections: ReadonlyArray<{
    readonly heading: string;
    readonly content: string;
  }>;
}

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  lastUpdated: 'August 2026',
  summary: 'NotiCatch operates on a strict 100% offline, zero-network architecture. We do not collect, transmit, store, or sell any of your messages, notifications, metadata, or device information.',
  sections: [
    {
      heading: '1. Complete Air-Gapped Isolation',
      content: 'NotiCatch does not possess Android Internet permissions (android.permission.INTERNET is completely absent from the application manifest). The application is cryptographically and architecturally incapable of transmitting data to external servers, cloud providers, or third parties.',
    },
    {
      heading: '2. Local Notification Capture',
      content: 'When you grant Android Notification Access, NotiCatch reads incoming status bar notifications locally on your device to archive messages and capture deleted message events. This data is written exclusively into a private, hardware-encrypted SQLite database on your device filesystem.',
    },
    {
      heading: '3. No Analytics or Tracking SDKs',
      content: 'NotiCatch contains zero analytics trackers, advertising identifiers, telemetry beacons, or crash-reporting libraries. All operations, searching, and diff calculations execute purely within local device memory (RAM) and on-device storage.',
    },
    {
      heading: '4. Biometric & Master PIN Security',
      content: 'Your authentication credentials (Master PIN and Biometric keys) are verified using Android BiometricPrompt and local cryptographic keychains. Your PIN is never sent anywhere because no network layer exists.',
    },
    {
      heading: '5. Data Control & Instant Wipe',
      content: 'You have complete sovereignty over your data. You may export individual chat histories to PDF or CSV at any time, or execute a permanent 1-tap Panic Wipe from Settings, which zero-fills and purges all database tables instantly.',
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  title: 'Terms of Service',
  lastUpdated: 'August 2026',
  summary: 'By using NotiCatch, you agree to utilize the application for personal backup and notification management in compliance with applicable local privacy laws.',
  sections: [
    {
      heading: '1. Personal Use License',
      content: 'NotiCatch is provided as a local device utility for personal notification management and message recovery. You are granted a personal, non-exclusive, non-transferable license to use the app on your Android device.',
    },
    {
      heading: '2. User Responsibility & Compliance',
      content: 'You agree to use NotiCatch responsibly and in accordance with all local privacy laws, data protection regulations, and third-party platform terms. You remain solely responsible for the retention and export of communications captured on your personal device.',
    },
    {
      heading: '3. Operating System Dependencies',
      content: 'NotiCatch relies on Android NotificationListenerService APIs. Background message capture requires proper configuration of Android system settings (Notification Access, Battery Optimization Exemption, and OEM Autostart permissions). NotiCatch is not liable for notification misses caused by operating system task killers or device reboots where autostart was disabled.',
    },
    {
      heading: '4. Disclaimer of Warranties',
      content: 'NotiCatch is provided "as is" without warranty of any kind. While engineered for high reliability and data integrity, we do not warrant that notification capture will be uninterrupted in extreme low-memory or power-saving states enforced by device hardware manufacturers.',
    },
  ],
};
