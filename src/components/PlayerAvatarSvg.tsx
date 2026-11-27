import React from 'react';
import { KitSpec, PlayerProfile } from '../game/types';

interface PlayerAvatarSvgProps {
  player: PlayerProfile;
  kit: KitSpec;
  facing?: 'right' | 'left';
  sizeClass?: string;
}

export const PlayerAvatarSvg: React.FC<PlayerAvatarSvgProps> = ({
  player,
  kit,
  facing = 'right',
  sizeClass = 'w-20 h-24',
}) => {
  const dir = facing === 'right' ? 1 : -1;
  const headR = 23 * Math.min(1.16, Math.max(0.92, player.headScaleMult));

  return (
    <svg
      viewBox="0 0 110 126"
      className={`${sizeClass} shrink-0 drop-shadow-[0_6px_10px_rgba(2,6,23,0.7)]`}
      role="img"
      aria-label={`${player.name} in ${kit.name}`}
    >
      <g transform={`translate(55, 64) scale(${dir}, 1)`}>
        {/* Ground contact shadow */}
        <ellipse cx="0" cy="54" rx="28" ry="6" fill="rgba(2, 6, 23, 0.55)" />

        {/* Back leg + boot */}
        <path
          d="M-8 25 L-13 47"
          stroke={kit.shorts}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <rect
          x="-20"
          y="44"
          width="17"
          height="9"
          rx="4.5"
          fill={kit.boot}
          stroke="#020617"
          strokeWidth="2"
        />

        {/* Front kicking leg + boot */}
        <path
          d="M8 25 L16 44"
          stroke={kit.shorts}
          strokeWidth="9.5"
          strokeLinecap="round"
        />
        <rect
          x="8"
          y="41"
          width="20"
          height="10"
          rx="5"
          fill={kit.boot}
          stroke="#020617"
          strokeWidth="2"
        />

        {/* Jersey torso */}
        <path
          d="M-21 -2 Q0 -7 21 -2 L18 28 L-18 28 Z"
          fill={kit.primary}
          stroke="#020617"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        {/* Diagonal / center trim stripe */}
        <path
          d="M-11 -3 L1 -3 L-6 27 L-15 27 Z"
          fill={kit.secondary}
          opacity="0.92"
        />
        <rect x="-18" y="21" width="36" height="5" fill={kit.trim} opacity="0.95" />

        {/* Jersey number */}
        <g transform={`scale(${dir}, 1)`}>
          <text
            x="2"
            y="16"
            textAnchor="middle"
            fill="#f8fafc"
            stroke="#020617"
            strokeWidth="2"
            paintOrder="stroke"
            fontFamily="'Barlow Condensed', sans-serif"
            fontWeight="800"
            fontSize="16"
          >
            {player.number}
          </text>
        </g>

        {/* Big arcade head */}
        <circle
          cx="2"
          cy="-25"
          r={headR}
          fill={player.skinColor}
          stroke="#020617"
          strokeWidth="2.8"
        />

        {/* Hair / Headgear */}
        {player.hairStyle === 'classic' && (
          <path
            d={`M${2 - headR * 0.92} -29 Q2 ${-28 - headR * 1.1} ${2 + headR * 0.95} -31 Q2 ${-26 - headR * 0.55} ${2 - headR * 0.92} -29 Z`}
            fill={player.hairColor}
            stroke="#020617"
            strokeWidth="2"
          />
        )}

        {player.hairStyle === 'spiky' && (
          <path
            d="M-21 -30 L-19 -48 L-8 -40 L0 -54 L9 -41 L21 -50 L24 -31 Q4 -36 -21 -30 Z"
            fill={player.hairColor}
            stroke="#020617"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}

        {player.hairStyle === 'mohawk' && (
          <path
            d="M-8 -41 L-10 -57 L4 -54 L14 -58 L11 -40 Z"
            fill={player.hairColor}
            stroke="#020617"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}

        {player.hairStyle === 'afro' && (
          <circle
            cx="-1"
            cy="-36"
            r={headR * 1.05}
            fill={player.hairColor}
            stroke="#020617"
            strokeWidth="2.2"
          />
        )}

        {player.hairStyle === 'visor' && (
          <>
            <path
              d="M-19 -33 Q2 -48 23 -33 L21 -27 L-19 -27 Z"
              fill={player.hairColor}
              stroke="#020617"
              strokeWidth="2"
            />
            <rect
              x="2"
              y="-31"
              width="22"
              height="9"
              rx="4.5"
              fill="#38bdf8"
              stroke="#020617"
              strokeWidth="2"
            />
            <line
              x1="6"
              y1="-28"
              x2="20"
              y2="-28"
              stroke="#e0f2fe"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        )}

        {player.hairStyle === 'crown' && (
          <>
            <path
              d="M-18 -33 Q2 -48 22 -33 Z"
              fill={player.hairColor}
              stroke="#020617"
              strokeWidth="2"
            />
            <path
              d="M-14 -39 L-16 -55 L-5 -47 L2 -58 L9 -47 L20 -55 L17 -39 Z"
              fill="#fbbf24"
              stroke="#020617"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Expressive eyes (unless covered by visor) */}
        {player.hairStyle !== 'visor' && (
          <>
            <ellipse cx="11" cy="-26" rx="4" ry="4.8" fill="#ffffff" />
            <circle cx="12.5" cy="-26" r="2.2" fill="#020617" />
            <circle cx="13.2" cy="-27.2" r="0.9" fill="#ffffff" />
          </>
        )}

        {/* Confident smirk */}
        <path
          d="M7 -15 Q13 -12 18 -16"
          fill="none"
          stroke="#020617"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Keeper gloves accent if keeper */}
        {player.role === 'keeper' && (
          <circle
            cx="19"
            cy="14"
            r="6.5"
            fill={kit.trim}
            stroke="#020617"
            strokeWidth="2"
          />
        )}
      </g>
    </svg>
  );
};
