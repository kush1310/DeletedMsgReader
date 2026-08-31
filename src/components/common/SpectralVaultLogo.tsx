import React from 'react';

interface SpectralVaultLogoProps {
  readonly size?: number;
  readonly className?: string;
  readonly glow?: boolean;
}

/**
 * SpectralVaultLogo
 *
 * Vector-rendered brand icon combining a geometric titanium vault shield
 * with resonant spectral wavelength telemetry lines, symbolizing air-gapped
 * security, forensic retention, and deleted message recovery.
 */
export const SpectralVaultLogo: React.FC<SpectralVaultLogoProps> = ({
  size = 32,
  className = '',
  glow = true,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 ${className}`}
      style={{
        filter: glow ? 'drop-shadow(0 2px 8px rgba(0, 168, 132, 0.35))' : undefined,
      }}
    >
      {/* Outer Hexagonal Shield Boundary */}
      <path
        d="M24 4L40 10V22C40 32.5 33.2 42.1 24 45C14.8 42.1 8 32.5 8 22V10L24 4Z"
        fill="url(#spectral_gradient_base)"
        stroke="url(#spectral_gradient_stroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Internal Vault Safe Key Core */}
      <circle
        cx="24"
        cy="22"
        r="7.5"
        fill="#0B1519"
        stroke="url(#spectral_glow)"
        strokeWidth="1.8"
      />

      {/* Spectral Frequency Waveform */}
      <path
        d="M19 22H21.5L23 18L25 26L26.5 22H29"
        stroke="#25D366"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Lower Forensic Node Pulse */}
      <circle cx="24" cy="35" r="2.2" fill="#00A884" />
      <path
        d="M24 29.5V32.8"
        stroke="#00A884"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <defs>
        <linearGradient
          id="spectral_gradient_base"
          x1="8"
          y1="4"
          x2="40"
          y2="45"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#111B21" />
          <stop offset="1" stopColor="#0B141A" />
        </linearGradient>

        <linearGradient
          id="spectral_gradient_stroke"
          x1="8"
          y1="4"
          x2="40"
          y2="45"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#00A884" />
          <stop offset="0.5" stopColor="#25D366" />
          <stop offset="1" stopColor="#005C4B" />
        </linearGradient>

        <linearGradient
          id="spectral_glow"
          x1="16.5"
          y1="14.5"
          x2="31.5"
          y2="29.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#25D366" />
          <stop offset="1" stopColor="#00A884" />
        </linearGradient>
      </defs>
    </svg>
  );
};
