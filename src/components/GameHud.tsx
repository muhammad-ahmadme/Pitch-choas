import React from 'react';
import { ChevronLeft, ChevronRight, Pause, Volume2, VolumeX, Zap } from 'lucide-react';
import { GamePhase, HudSnapshot, PlayMode, TeamSide } from '../game/types';
import { DeviceMode } from '../hooks/useDeviceMode';
import { ClubCrestSvg } from './ClubCrestSvg';

export type TouchAction = 'kick' | 'left' | 'right' | 'ability';

interface GameHudProps {
  phase: GamePhase;
  mode: PlayMode;
  deviceMode: DeviceMode;
  targetScore: number;
  hud: HudSnapshot;
  muted: boolean;
  blueCrestId: string;
  blueClubLabel: string;
  redCrestId: string;
  onlineMySide?: TeamSide | null;
  pingMs?: number | null;
  onPause: () => void;
  onToggleMute: () => void;
  onTouchControl: (team: 'blue' | 'red', action: TouchAction, active: boolean) => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  phase,
  mode,
  deviceMode,
  targetScore,
  hud,
  muted,
  blueCrestId,
  blueClubLabel,
  redCrestId,
  onlineMySide,
  pingMs,
  onPause,
  onToggleMute,
  onTouchControl,
}) => {
  const bindTouchButton = (team: 'blue' | 'red', action: TouchAction) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      onTouchControl(team, action, true);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      onTouchControl(team, action, false);
    },
    onPointerCancel: () => onTouchControl(team, action, false),
    onLostPointerCapture: () => onTouchControl(team, action, false),
  });

  const blueReady = hud.blueAbilityCharge >= 100;
  const redReady = hud.redAbilityCharge >= 100;
  const myOnlineIsRed = mode === 'online' && onlineMySide === 'red';
  const myAbilityName = myOnlineIsRed ? hud.redAbilityName : hud.blueAbilityName;
  const myAbilityCharge = myOnlineIsRed ? hud.redAbilityCharge : hud.blueAbilityCharge;
  const myAbilityReady = myAbilityCharge >= 100;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-4 md:p-5">
      {/* Top Broadcast Scoreboard Strip */}
      <div className="flex items-start justify-between gap-4">
        <div className="hidden sm:flex flex-col text-xs font-medium text-slate-300/90 tabular-nums pt-1">
          <div className="flex items-center gap-2">
            <span>Round {hud.roundNumber}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className={hud.isMatchPoint ? 'text-amber-300 font-bold' : ''}>
              {hud.isMatchPoint ? 'Match Point' : `First to ${targetScore}`}
            </span>
            {mode === 'online' && pingMs !== null && pingMs !== undefined && (
              <>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span className="text-emerald-300 font-semibold">{pingMs} ms</span>
              </>
            )}
          </div>
          <div className="text-[11px] text-sky-300/80 mt-0.5 truncate max-w-[190px]">
            {mode === 'online' && onlineMySide === 'blue' ? '(YOU) ' : ''}
            {hud.blueLineupNames}
          </div>
        </div>

        <div className="mx-auto flex flex-col items-center">
          {/* Broadcast Skewed Scoreboard with Club Crests & Overdrive Bars */}
          <div className="bg-slate-950/92 border border-slate-700/80 rounded-lg overflow-hidden shadow-xl">
            <div className="flex items-center">
              <div className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 bg-gradient-to-r from-sky-700 to-sky-600 text-white font-display font-extrabold text-base sm:text-lg tracking-wider max-w-[140px]">
                <ClubCrestSvg crestId={blueCrestId} sizeClass="w-5 h-5" />
                <span className="truncate uppercase">
                  {mode === '2P' ? 'BLUE' : blueClubLabel}
                </span>
              </div>
              <div className="px-3.5 sm:px-4 py-1 text-slate-50 font-display font-extrabold text-3xl tabular-nums leading-none">
                {hud.blueScore}
              </div>
              <div className="text-slate-500 font-display font-bold text-xl px-0.5">–</div>
              <div className="px-3.5 sm:px-4 py-1 text-slate-50 font-display font-extrabold text-3xl tabular-nums leading-none">
                {hud.redScore}
              </div>
              <div className="flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 bg-gradient-to-l from-rose-700 to-rose-600 text-white font-display font-extrabold text-base sm:text-lg tracking-wider max-w-[145px]">
                <span className="truncate uppercase">{hud.opponentLabel}</span>
                <ClubCrestSvg crestId={redCrestId} sizeClass="w-5 h-5" />
              </div>
            </div>

            {/* Dual slim Overdrive Charge Bars */}
            <div className="grid grid-cols-2 h-1.5 bg-slate-900">
              <div className="flex justify-end bg-slate-900">
                <div
                  style={{ width: `${hud.blueOverdrive}%` }}
                  className={`h-full transition-all duration-100 ${
                    hud.blueOverdrive >= 100 ? 'bg-amber-400' : 'bg-sky-400'
                  }`}
                />
              </div>
              <div className="flex justify-start bg-slate-900 border-l border-slate-800">
                <div
                  style={{ width: `${hud.redOverdrive}%` }}
                  className={`h-full transition-all duration-100 ${
                    hud.redOverdrive >= 100 ? 'bg-amber-400' : 'bg-rose-400'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-200/90 drop-shadow">
            <span>{hud.mutator.name}</span>
            {hud.activePowerup ? (
              <>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="text-amber-300 tabular-nums">
                  {hud.activePowerup.label} ({Math.ceil(hud.activePowerup.remaining)}s)
                </span>
              </>
            ) : (
              <>
                <span aria-hidden="true" className="text-slate-400">·</span>
                <span className="text-slate-300/85 font-medium">{hud.mutator.tagline}</span>
              </>
            )}
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="hidden md:block text-right text-[11px] font-medium text-rose-300/80 mr-1 max-w-[175px] truncate">
            {mode === 'online' && onlineMySide === 'red' ? '(YOU) ' : ''}
            {hud.redLineupNames}
          </div>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-950/85 border border-slate-800 text-slate-200 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onPause}
            aria-label="Pause match"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-950/85 border border-slate-800 text-slate-200 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Goal Celebration Banner */}
      {phase === 'GOAL_CELEBRATION' && hud.lastScorer && (
        <div className="my-auto mx-auto text-center">
          <div className="bg-slate-950/94 border-2 border-amber-400/60 rounded-xl px-8 py-5 shadow-2xl">
            <div
              className={`font-display font-extrabold italic text-5xl md:text-6xl tracking-wide leading-none ${
                hud.lastGoalPoints > 1
                  ? 'text-amber-300'
                  : hud.lastScorer === 'blue'
                    ? 'text-sky-400'
                    : 'text-rose-400'
              }`}
            >
              {hud.goalTypeLabel}
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-200 tabular-nums">
              {hud.lastScorer === 'blue' ? blueClubLabel : hud.opponentLabel} scores
              {hud.lastGoalSpeedKmh > 0 && (
                <>
                  <span aria-hidden="true" className="mx-2 text-slate-500">·</span>
                  <span className="text-amber-300">{hud.lastGoalSpeedKmh} km/h</span>
                </>
              )}
              {hud.blueScore < targetScore && hud.redScore < targetScore && (
                <>
                  <span aria-hidden="true" className="mx-2 text-slate-500">·</span>
                  <span className="text-sky-300">Next: {hud.nextMutator.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Adaptive Bottom Controls & Power-Up Triggers */}
      {deviceMode === 'mobile' ? (
        <div className="flex items-end justify-between gap-2">
          <div className="pointer-events-auto flex items-center gap-1.5 touch-none">
            <button
              type="button"
              aria-label="Blue move backward"
              {...bindTouchButton('blue', 'left')}
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-950/80 border border-sky-400/45 text-sky-300 active:bg-sky-600 active:text-white active:scale-95 transition-transform select-none touch-none"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              aria-label="Blue move forward"
              {...bindTouchButton('blue', 'right')}
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-950/80 border border-sky-400/45 text-sky-300 active:bg-sky-600 active:text-white active:scale-95 transition-transform select-none touch-none"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            {mode === '2P' && (
              <>
                <button
                  type="button"
                  {...bindTouchButton('blue', 'kick')}
                  className="inline-flex items-center justify-center h-12 px-3.5 rounded-xl bg-sky-600/90 border border-sky-300/60 text-white font-display font-bold text-lg tracking-wide active:scale-95 transition-transform select-none touch-none"
                >
                  KICK
                </button>
                <button
                  type="button"
                  aria-label={`Blue Power-Up: ${hud.blueAbilityName}`}
                  {...bindTouchButton('blue', 'ability')}
                  className={`inline-flex items-center justify-center gap-1 h-12 px-2.5 rounded-xl border font-display font-bold text-sm tracking-wide active:scale-95 transition-transform select-none touch-none tabular-nums ${
                    blueReady
                      ? 'bg-amber-400 border-amber-200 text-slate-950'
                      : 'bg-slate-950/80 border-slate-700 text-slate-400'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>{hud.blueAbilityCharge}%</span>
                </button>
              </>
            )}
          </div>

          {mode === '2P' ? (
            <div className="pointer-events-auto flex items-center gap-1.5 touch-none">
              <button
                type="button"
                aria-label={`Red Power-Up: ${hud.redAbilityName}`}
                {...bindTouchButton('red', 'ability')}
                className={`inline-flex items-center justify-center gap-1 h-12 px-2.5 rounded-xl border font-display font-bold text-sm tracking-wide active:scale-95 transition-transform select-none touch-none tabular-nums ${
                  redReady
                    ? 'bg-amber-400 border-amber-200 text-slate-950'
                    : 'bg-slate-950/80 border-slate-700 text-slate-400'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>{hud.redAbilityCharge}%</span>
              </button>
              <button
                type="button"
                {...bindTouchButton('red', 'kick')}
                className="inline-flex items-center justify-center h-12 px-3.5 rounded-xl bg-rose-600/90 border border-rose-300/60 text-white font-display font-bold text-lg tracking-wide active:scale-95 transition-transform select-none touch-none"
              >
                KICK
              </button>
              <button
                type="button"
                aria-label="Red move forward"
                {...bindTouchButton('red', 'left')}
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-950/80 border border-rose-400/45 text-rose-300 active:bg-rose-600 active:text-white active:scale-95 transition-transform select-none touch-none"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                aria-label="Red move backward"
                {...bindTouchButton('red', 'right')}
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-950/80 border border-rose-400/45 text-rose-300 active:bg-rose-600 active:text-white active:scale-95 transition-transform select-none touch-none"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <div className="pointer-events-auto flex items-center gap-2 touch-none">
              <button
                type="button"
                aria-label={`Activate Power-Up: ${myAbilityName}`}
                {...bindTouchButton('blue', 'ability')}
                className={`inline-flex items-center justify-center gap-1.5 h-14 px-4 rounded-xl border font-display font-bold text-base tracking-wide active:scale-95 transition-transform select-none touch-none tabular-nums ${
                  myAbilityReady
                    ? 'bg-amber-400 border-amber-200 text-slate-950'
                    : 'bg-slate-950/80 border-slate-700 text-slate-300'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>{myAbilityReady ? myAbilityName : `${myAbilityCharge}%`}</span>
              </button>
              <button
                type="button"
                {...bindTouchButton('blue', 'kick')}
                className="inline-flex items-center justify-center h-14 px-6 rounded-xl bg-sky-600/90 border border-sky-300/60 text-white font-display font-bold text-xl tracking-wide active:scale-95 transition-transform select-none touch-none"
              >
                JUMP / KICK
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs font-medium text-slate-300/85 tabular-nums">
          <div className="flex items-center gap-2.5">
            <span>
              {mode === '2P'
                ? 'Blue: A / D Move · W Kick'
                : 'Move: A / D or ← / → · Kick: W / Space / ↑'}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className={myAbilityReady ? 'text-amber-300 font-bold' : 'text-sky-300/80'}>
              {mode === '2P' ? '[S]' : '[S/E/↓]'} {myAbilityName} ({myAbilityCharge}%)
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            {mode === '2P' ? (
              <>
                <span className={redReady ? 'text-amber-300 font-bold' : 'text-rose-300/80'}>
                  [↓] {hud.redAbilityName} ({hud.redAbilityCharge}%)
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>Red: ← / → Move · ↑ Kick</span>
              </>
            ) : (
              <span className="text-rose-300/80">
                {mode === 'online'
                  ? onlineMySide === 'red'
                    ? `${blueClubLabel} Power-Up: ${hud.blueAbilityName} (${hud.blueAbilityCharge}%)`
                    : `${hud.opponentLabel} Power-Up: ${hud.redAbilityName} (${hud.redAbilityCharge}%)`
                  : `${hud.opponentLabel} Power-Up: ${hud.redAbilityName} (${hud.redAbilityCharge}%)`}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
