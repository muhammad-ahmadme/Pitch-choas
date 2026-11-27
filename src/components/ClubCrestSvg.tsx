import React from 'react';
import { getCrestById } from '../game/catalog';
import { CupSpec } from '../game/types';

export const ClubCrestSvg: React.FC<{
  crestId: string;
  sizeClass?: string;
  className?: string;
}> = ({ crestId, sizeClass = 'w-11 h-11', className = '' }) => {
  const crest = getCrestById(crestId);

  return (
    <svg
      viewBox="0 0 64 64"
      className={`${sizeClass} shrink-0 drop-shadow-md ${className}`}
      aria-label={crest.name}
    >
      <defs>
        <linearGradient id={`grad-${crest.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={crest.primary} />
          <stop offset="100%" stopColor={crest.secondary} />
        </linearGradient>
      </defs>

      {crest.shape === 'shield' && (
        <>
          <path
            d="M12 10 H52 V30 C52 44 41 53 32 58 C23 53 12 44 12 30 Z"
            fill={`url(#grad-${crest.id})`}
            stroke={crest.accent}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M32 10 V58"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="2"
          />
          <polygon
            points="32,19 35.5,27 44,27.8 37.5,33.4 39.5,42 32,37.2 24.5,42 26.5,33.4 20,27.8 28.5,27"
            fill={crest.accent}
          />
        </>
      )}

      {crest.shape === 'diamond' && (
        <>
          <polygon
            points="32,6 56,32 32,58 8,32"
            fill={`url(#grad-${crest.id})`}
            stroke={crest.accent}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <polygon
            points="32,14 48,32 32,50 16,32"
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="2"
          />
          <path
            d="M25 26 L32 19 L39 26 L35 42 L32 37 L29 42 Z"
            fill={crest.accent}
          />
        </>
      )}

      {crest.shape === 'hex' && (
        <>
          <polygon
            points="32,6 54,18 54,46 32,58 10,46 10,18"
            fill={`url(#grad-${crest.id})`}
            stroke={crest.accent}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle
            cx="32"
            cy="32"
            r="12"
            fill="none"
            stroke={crest.accent}
            strokeWidth="2.6"
          />
          <circle cx="32" cy="32" r="5" fill={crest.accent} />
        </>
      )}

      {crest.shape === 'crown' && (
        <>
          <path
            d="M12 16 H52 V34 C52 46 41 54 32 58 C23 54 12 46 12 34 Z"
            fill={`url(#grad-${crest.id})`}
            stroke={crest.accent}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M18 39 L17 24 L26 31 L32 20 L38 31 L47 24 L46 39 Z"
            fill={crest.accent}
          />
          <rect x="19" y="42" width="26" height="4" rx="2" fill={crest.accent} />
        </>
      )}
    </svg>
  );
};

export const TROPHY_PALETTE: Record<
  CupSpec['trophyTier'],
  { fill: string; stroke: string; label: string }
> = {
  bronze: { fill: '#d97706', stroke: '#fde68a', label: 'Bronze Tier' },
  silver: { fill: '#94a3b8', stroke: '#f8fafc', label: 'Silver Tier' },
  gold: { fill: '#fbbf24', stroke: '#fef9c3', label: 'Gold Tier' },
  diamond: { fill: '#38bdf8', stroke: '#e0f2fe', label: 'Diamond Tier' },
};

export const TrophyBadgeSvg: React.FC<{
  tier: CupSpec['trophyTier'];
  earned: boolean;
  sizeClass?: string;
}> = ({ tier, earned, sizeClass = 'w-12 h-12' }) => {
  const pal = TROPHY_PALETTE[tier];
  return (
    <svg
      viewBox="0 0 64 64"
      className={`${sizeClass} shrink-0 ${earned ? 'drop-shadow-md' : 'opacity-35 grayscale'}`}
      aria-hidden="true"
    >
      <path
        d="M18 12 H46 V24 C46 34 39 40 32 42 C25 40 18 34 18 24 Z"
        fill={pal.fill}
        stroke={pal.stroke}
        strokeWidth="2.5"
      />
      <path
        d="M18 16 H10 C10 26 14 30 18 30 M46 16 H54 C54 26 50 30 46 30"
        fill="none"
        stroke={pal.stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M23 17 H27 V27 C27 31 24 34 23 34"
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="29" y="41" width="6" height="9" fill={pal.fill} />
      <rect
        x="20"
        y="50"
        width="24"
        height="7"
        rx="2"
        fill="#1e293b"
        stroke={pal.stroke}
        strokeWidth="2"
      />
    </svg>
  );
};
