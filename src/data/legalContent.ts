/**
 * Legal Content & Privacy Documents
 *
 * Exhaustive legal documentation for SpectralVault establishing complete air-gapped
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
  summary: 'SpectralVault operates on a strict 100% offline, zero-network architecture. We do not collect, transmit, store, or sell any of your messages, notifications, metadata, or device information.',
  sections: [
    {
      heading: '1. Strict Air-Gapped Zero-Egress Architecture',
      content: 'SpectralVault does not request or possess the Android Internet permission (android.permission.INTERNET is completely absent from the AndroidManifest.xml). The application is architecturally, cryptographically, and physically incapable of opening network sockets, transmitting data to cloud servers, third parties, telemetry endpoints, or external databases.',
    },
    {
      heading: '2. Local Notification Interception Mechanism',
      content: 'When you grant Android Notification Access (NotificationListenerService), SpectralVault processes incoming WhatsApp status bar notifications strictly in-memory on your local device. The extracted metadata (sender name, chat title, message body, timestamp, media indicators) is saved exclusively to your local device SQLite Room database with Write-Ahead Logging (WAL).',
    },
    {
      heading: '3. Zero Analytics, Tracking, and Third-Party SDKs',
      content: 'SpectralVault is built with zero advertising trackers, analytics SDKs, telemetry beacons, crash reporting daemons, or remote configuration tools. No device identifiers, IP addresses, Google Advertising IDs (GAID), or hardware serial numbers are ever collected, read, or shared.',
    },
    {
      heading: '4. Hardware-Backed Keystore & Local Database Protection',
      content: 'All locally archived messages and metadata reside in private application sandbox storage accessible only by SpectralVault via Android user ID (UID) isolation. Database integrity is verified using SHA-256 Merkle tree signatures computed via the on-device Web Crypto API.',
    },
    {
      heading: '5. Native Device Screen Lock & Authentication',
      content: 'Authentication is enforced via Android Keyguard and BiometricPrompt APIs (Device PIN, Pattern, Password, Fingerprint, or Face Unlock). Your credentials are verified entirely by the Android OS Trusted Execution Environment (TEE) and Secure Element (SE). SpectralVault never receives, stores, or sees your plaintext screen pass or biometric vectors.',
    },
    {
      heading: '6. Screen Capture & Recording Prevention (FLAG_SECURE)',
      content: 'When Screen Capture Protection is active, SpectralVault applies WindowManager.LayoutParams.FLAG_SECURE to the Android window surface. This blocks screenshots, screen mirroring, screen recording utilities, and recent app switcher previews, protecting your sensitive recovered messages from local spyware or accidental visual leakage.',
    },
    {
      heading: '7. Data Retention, Auto-Purge, and Local Export',
      content: 'Captured messages remain on your device indefinitely until you choose to delete them. You maintain complete sovereignty over your data with 1-tap local PDF and CSV export capabilities. Exported documents are generated on-device and saved directly to your local storage without cloud mediation.',
    },
    {
      heading: '8. 1-Tap Panic Wipe & Cryptographic Shredding',
      content: 'SpectralVault includes an instant Panic Wipe function in Settings. Triggering a Panic Wipe immediately executes SQL DROP/DELETE commands on all Room database tables, clears SharedPreferences, resets active authentication keys, and invalidates session tokens, guaranteeing non-recoverable erasure.',
    },
    {
      heading: '9. Third-Party Trademarks & Non-Affiliation',
      content: 'SpectralVault is an independent utility and is not affiliated, associated, authorized, endorsed by, or in any way officially connected with WhatsApp LLC, Meta Platforms, Inc., Signal Messenger LLC, or any of their subsidiaries. All product names, logos, and brands are property of their respective owners.',
    },
    {
      heading: '10. User Control & Policy Amendments',
      content: 'Any updates to this Privacy Policy will be reflected locally within the application upon software update. Because SpectralVault possesses no internet connection, policy updates are delivered strictly via application package updates without remote tracking.',
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  title: 'Terms of Service',
  lastUpdated: 'August 2026',
  summary: 'By using SpectralVault, you agree to utilize the application for personal backup, notification auditing, and message recovery in compliance with applicable local privacy laws.',
  sections: [
    {
      heading: '1. Personal Use License & Scope',
      content: 'SpectralVault grants you a revocable, non-exclusive, non-transferable, limited license to download, install, and use the application solely for your personal, non-commercial notification auditing and message backup on Android devices owned or controlled by you.',
    },
    {
      heading: '2. User Legal Responsibility & Consent',
      content: 'You agree to use SpectralVault in strict compliance with all applicable local, national, and international laws, including data privacy and electronic communications regulations. You are solely responsible for ensuring that your capture and archiving of notifications complies with applicable consent laws and privacy standards in your jurisdiction.',
    },
    {
      heading: '3. Operating System Dependencies & Service Availability',
      content: 'SpectralVault relies on Android system NotificationListenerService APIs. Continuous background capture requires appropriate device configuration, including Notification Access, Battery Optimization Exemption, and OEM Autostart permissions. SpectralVault cannot be held liable for missed notifications caused by aggressive OEM task killers, battery-saver modes, or system reboots.',
    },
    {
      heading: '4. WhatsApp & Platform Independence',
      content: 'SpectralVault operates independently by reading public status bar notification objects presented by the Android operating system. SpectralVault does not reverse engineer WhatsApp protocols, access WhatsApp internal databases, or bypass end-to-end encryption. Message recovery is limited strictly to messages that generated a status bar notification prior to sender deletion.',
    },
    {
      heading: '5. Absolute Local Data Sovereignty',
      content: 'Because SpectralVault is completely air-gapped with zero internet connectivity, you bear exclusive responsibility for backing up, securing, and managing the communications stored in your local database. Lost device access or forgotten device screen pass credentials cannot be recovered remotely by the developers.',
    },
    {
      heading: '6. Limitation of Liability',
      content: 'In no event shall the developers or contributors of SpectralVault be liable for any direct, indirect, incidental, special, exemplary, or consequential damages (including, but not limited to, loss of data, unauthorized device access, or business interruption) arising out of the use or inability to use this software.',
    },
    {
      heading: '7. Disclaimer of Warranties',
      content: 'SpectralVault is provided on an "AS IS" and "AS AVAILABLE" basis, without warranties of any kind, either express or implied, including, but not limited to, warranties of merchantability, fitness for a particular purpose, or non-infringement.',
    },
    {
      heading: '8. Prohibited Uses',
      content: 'You agree not to use SpectralVault for unlawful surveillance, harassment, stalking, or interception of communications belonging to third parties without authorization. The software is strictly designed for personal notification management and data preservation.',
    },
    {
      heading: '9. Termination & Revocation',
      content: 'You may terminate your agreement with these Terms at any time by uninstalling SpectralVault and utilizing the Panic Wipe feature to permanently erase all locally stored data.',
    },
    {
      heading: '10. Governing Terms & Inquiries',
      content: 'For technical inquiries or bug reports regarding SpectralVault, please reach out via GitHub at https://github.com/kush1310/DeletedMsgReader or contact developer support at kushshah.ce@gmail.com.',
    },
  ],
};
