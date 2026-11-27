import React from 'react';
import { motion } from 'motion/react';
import { Coins, Flame, Globe, Shield, Sparkles, Trophy } from 'lucide-react';
import { getDivisionInfo } from '../game/catalog';
import { GamePhase, HudSnapshot, PlayMode, TeamSide } from '../game/types';
import { DeviceMode } from '../hooks/useDeviceMode';
import { ClubCrestSvg } from './ClubCrestSvg';

export interface CareerMatchOutcome {
  coinsEarned: number;
  xpEarned: number;
  cleanSheetBonus: boolean;
  winStreak: number;
  clubXpAfter: number;
  cupName?: string;
  stageName?: string;
  hasNextStage: boolean;
  isCupChampion: boolean;
  trophyAwarded: boolean;
  unlockedKitName?: string;
  unlockedPlayerName?: string;
}

interface ModalOverlaysProps {
  phase: GamePhase;
  mode: PlayMode;
  deviceMode: DeviceMode;
  hud: HudSnapshot;
  blueCrestId: string;
  blueClubLabel: string;
  redCrestId: string;
  careerOutcome: CareerMatchOutcome | null;
  onlineMySide?: TeamSide | null;
  onlineRematchStatus?: { blueReady: boolean; redReady: boolean };
  onlineDisconnectReason?: string | null;
  onResume: () => void;
  onRestart: () => void;
  onNextCupStage: () => void;
  onOpenCareerHub: () => void;
  onOnlineRematch?: () => void;
  onOpenOnlineLobby?: () => void;
  onMainMenu: () => void;
}

export const ModalOverlays: React.FC<ModalOverlaysProps> = ({
  phase,
  mode,
  deviceMode,
  hud,
  blueCrestId,
  blueClubLabel,
  redCrestId,
  careerOutcome,
  onlineMySide,
  onlineRematchStatus,
  onlineDisconnectReason,
  onResume,
  onRestart,
  onNextCupStage,
  onOpenCareerHub,
  onOnlineRematch,
  onOpenOnlineLobby,
  onMainMenu,
}) => {
  if (phase !== 'PAUSED' && phase !== 'GAME_OVER') return null;

  const isGameOver = phase === 'GAME_OVER';
  const blueWon = hud.winner === 'blue';
  const myOnlineWon = mode === 'online' && onlineMySide ? hud.winner === onlineMySide : blueWon;
  const winnerLabel = blueWon
    ? careerOutcome?.isCupChampion
      ? `${careerOutcome.cupName} Champions!`
      : mode === '2P'
        ? 'Blue Team Wins'
        : `${blueClubLabel} Wins`
    : mode === '2P'
      ? 'Red Team Wins'
      : `${hud.opponentLabel} Wins`;

  const myRematchReady =
    onlineMySide === 'red' ? onlineRematchStatus?.redReady : onlineRematchStatus?.blueReady;
  const oppRematchReady =
    onlineMySide === 'red' ? onlineRematchStatus?.blueReady : onlineRematchStatus?.redReady;

  const divInfo = careerOutcome ? getDivisionInfo(careerOutcome.clubXpAfter) : null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center p-4 sm:p-6 bg-slate-950/82">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="w-full max-w-md max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700/80 p-5 sm:p-6 md:p-7 shadow-2xl"
      >
        {isGameOver ? (
          <>
            <div className="text-xs font-semibold text-slate-400 mb-1">
              {mode === 'career' && careerOutcome?.cupName
                ? `${careerOutcome.cupName} · ${careerOutcome.stageName}`
                : `Full Time · Round ${hud.roundNumber}`}
            </div>
            <h2
              className={`font-display font-extrabold italic text-3xl sm:text-4xl tracking-wide leading-tight ${
                careerOutcome?.isCupChampion && blueWon
                  ? 'text-amber-300'
                  : mode === 'online'
                    ? myOnlineWon
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                    : blueWon
                      ? 'text-sky-400'
                      : 'text-rose-400'
              }`}
            >
              {mode === 'online'
                ? myOnlineWon
                  ? 'VICTORY! (+55 COINS)'
                  : winnerLabel
                : winnerLabel}
            </h2>
            {mode === 'online' && onlineDisconnectReason && (
              <div className="mt-2 rounded-lg border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">
                {onlineDisconnectReason}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between py-3.5 px-5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-2.5 text-left">
                <ClubCrestSvg crestId={blueCrestId} sizeClass="w-9 h-9" />
                <div>
                  <div className="text-[11px] font-semibold text-sky-400 truncate max-w-[95px]">
                    {mode === '2P' ? 'Blue' : blueClubLabel}
                  </div>
                  <div className="font-display font-extrabold text-3xl text-white tabular-nums leading-none">
                    {hud.blueScore}
                  </div>
                </div>
              </div>
              <div className="font-display font-bold text-2xl text-slate-500">–</div>
              <div className="flex items-center gap-2.5 text-right">
                <div>
                  <div className="text-[11px] font-semibold text-rose-400 truncate max-w-[100px]">
                    {hud.opponentLabel}
                  </div>
                  <div className="font-display font-extrabold text-3xl text-white tabular-nums leading-none">
                    {hud.redScore}
                  </div>
                </div>
                <ClubCrestSvg crestId={redCrestId} sizeClass="w-9 h-9" />
              </div>
            </div>

            {careerOutcome && (careerOutcome.coinsEarned > 0 || careerOutcome.xpEarned > 0) && (
              <div className="mt-4 rounded-xl bg-amber-400/10 border border-amber-400/35 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between text-sm font-bold text-amber-300 tabular-nums">
                  <span className="inline-flex items-center gap-1.5">
                    <Coins className="w-4 h-4" />
                    Club Rewards
                  </span>
                  <span>
                    +{careerOutcome.coinsEarned} Coins · +{careerOutcome.xpEarned} XP
                  </span>
                </div>

                {divInfo && (
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 tabular-nums mb-1">
                      <span>
                        {divInfo.division} · Lv {divInfo.level}
                      </span>
                      <span>
                        {divInfo.xpIntoLevel}/{divInfo.xpPerLevel} XP
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
                      <div
                        style={{ width: `${divInfo.progressPct}%` }}
                        className="h-full rounded-full bg-sky-400"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  {careerOutcome.cleanSheetBonus && (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                      <Shield className="w-3.5 h-3.5" />
                      Clean Sheet Bonus
                    </span>
                  )}
                  {careerOutcome.winStreak > 1 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-orange-300 tabular-nums">
                      <Flame className="w-3.5 h-3.5" />
                      {careerOutcome.winStreak} Match Streak
                    </span>
                  )}
                </div>

                {careerOutcome.trophyAwarded && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Cup Trophy Added to Club Cabinet!</span>
                  </div>
                )}
                {careerOutcome.unlockedKitName && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>
                      Unlocked Kit: <strong className="text-white">{careerOutcome.unlockedKitName}</strong>
                    </span>
                  </div>
                )}
                {careerOutcome.unlockedPlayerName && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-200">
                    <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                    <span>
                      Signed Free Agent:{' '}
                      <strong className="text-sky-300">{careerOutcome.unlockedPlayerName}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 py-2.5 text-sm border-b border-slate-800">
              <div className="flex justify-between text-slate-300">
                <span>Blue Shots</span>
                <span className="font-semibold text-white tabular-nums">{hud.stats.blueShots}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>{mode === '2P' || mode === 'online' ? 'Red Shots' : 'CPU Shots'}</span>
                <span className="font-semibold text-white tabular-nums">{hud.stats.redShots}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Fastest Shot</span>
                <span className="font-semibold text-amber-400 tabular-nums">
                  {hud.stats.fastestShotKmh} km/h
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Crossbar Hits</span>
                <span className="font-semibold text-white tabular-nums">{hud.stats.crossbarHits}</span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              {mode === 'online' ? (
                <>
                  {!onlineDisconnectReason && onOnlineRematch && (
                    <button
                      type="button"
                      disabled={Boolean(myRematchReady)}
                      onClick={onOnlineRematch}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-400 hover:bg-emerald-300 disabled:opacity-70 text-slate-950 font-bold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {myRematchReady
                        ? 'Waiting for Opponent…'
                        : oppRematchReady
                          ? 'Accept Rematch!'
                          : 'Rematch'}
                    </button>
                  )}
                  {onOpenOnlineLobby && (
                    <button
                      type="button"
                      onClick={onOpenOnlineLobby}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Online Lobby</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onMainMenu}
                    className="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Main Menu
                  </button>
                </>
              ) : mode === 'career' ? (
                <>
                  {blueWon && careerOutcome?.hasNextStage ? (
                    <button
                      type="button"
                      onClick={onNextCupStage}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Next Cup Match
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenCareerHub}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Career HQ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onMainMenu}
                    className="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Main Menu
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onRestart}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {mode === '2P' ? 'Shuffle & Rematch' : 'Play Again'}
                  </button>
                  <button
                    type="button"
                    onClick={onMainMenu}
                    className="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Main Menu
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="text-xs font-semibold text-slate-400 mb-1">
              {hud.mutator.name} · Round {hud.roundNumber}
            </div>
            <h2 className="font-display font-extrabold text-3xl text-white tracking-wide">
              {mode === 'online' ? 'Global Match Live' : 'Match Paused'}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              {mode === 'online'
                ? 'Global matches run live on the server and cannot be paused for your opponent.'
                : deviceMode === 'mobile'
                  ? mode === '2P'
                    ? 'Left joystick controls Blue (move, kick & power-up). Right joystick controls Red.'
                    : 'Use the bottom-left joystick to move, and bottom-right buttons to jump/kick and activate Power-Ups.'
                  : mode === '2P'
                    ? 'Blue: A / D Move, W Kick, S Power-Up. Red: ← / → Move, ↑ Kick, ↓ Power-Up.'
                    : 'Move: A / D or ← / →. Jump & Kick: W / Space / ↑. Activate Power-Up: S / E / ↓.'}
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onResume}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
              >
                {mode === 'online' ? 'Return to Pitch' : 'Resume Match'}
              </button>
              {mode === 'online' ? (
                onOpenOnlineLobby && (
                  <button
                    type="button"
                    onClick={onOpenOnlineLobby}
                    className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition-colors cursor-pointer"
                  >
                    Leave Match to Online Lobby
                  </button>
                )
              ) : mode === 'career' ? (
                <button
                  type="button"
                  onClick={onOpenCareerHub}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition-colors cursor-pointer"
                >
                  Abandon to Career HQ
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRestart}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition-colors cursor-pointer"
                >
                  {mode === '2P' ? 'Shuffle & Restart' : 'Restart Match'}
                </button>
              )}
              <button
                type="button"
                onClick={onMainMenu}
                className="w-full py-2.5 px-4 rounded-lg bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition-colors cursor-pointer"
              >
                Main Menu
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
