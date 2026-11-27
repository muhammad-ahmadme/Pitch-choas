import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Zap } from 'lucide-react';
import { getCupById, getKitById, getPlayerById } from '../game/catalog';
import { MUTATORS } from '../game/mutators';
import { CareerProfile, MatchConfig } from '../game/types';
import { ClubCrestSvg } from './ClubCrestSvg';
import { PlayerAvatarSvg } from './PlayerAvatarSvg';

interface MatchLoadingScreenProps {
  config: MatchConfig;
  profile: CareerProfile;
  fixedMutatorId?: keyof typeof MUTATORS;
  blueTeamLabel?: string;
  blueTeamCrestId?: string;
  onReady: () => void;
}

export const MatchLoadingScreen: React.FC<MatchLoadingScreenProps> = ({
  config,
  profile,
  fixedMutatorId,
  blueTeamLabel,
  blueTeamCrestId,
  onReady,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 1150;
    let rafId = 0;

    const tick = (now: number) => {
      const pct = Math.min(100, ((now - start) / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        onReady();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onReady]);

  const blueKit = config.blueKit ?? getKitById(profile.selectedKitId);
  const redKit = config.redKit ?? getKitById('crimson_united');
  const blueStriker = config.blueLineup?.striker ?? getPlayerById(profile.selectedStrikerId);
  const blueKeeper = config.blueLineup?.keeper ?? getPlayerById(profile.selectedKeeperId);
  const redStriker = config.redLineup?.striker ?? getPlayerById('axel_blaze');
  const redKeeper = config.redLineup?.keeper ?? getPlayerById('giga_petrov');

  const blueLabel =
    blueTeamLabel ?? (config.mode === '2P' ? 'BLUE SQUAD' : profile.clubName);
  const blueCrest = blueTeamCrestId ?? profile.crestId;
  const redLabel =
    config.mode === '2P'
      ? 'RED SQUAD'
      : config.opponentName ?? `CPU (${config.difficulty.toUpperCase()})`;

  const cupInfo =
    config.mode === 'career' && config.cupId ? getCupById(config.cupId) : null;
  const stageInfo =
    cupInfo && typeof config.cupStageIndex === 'number'
      ? cupInfo.stages[config.cupStageIndex]
      : null;

  const arenaLabel = fixedMutatorId
    ? MUTATORS[fixedMutatorId].name
    : config.twistMode === 'classic'
      ? MUTATORS.classic_turf.name
      : 'Randomized Chaos Arenas';

  const statusText =
    progress < 35
      ? 'PUMPING MATCH BALL...'
      : progress < 72
        ? 'LACING BOOTS & POWER-UPS...'
        : 'STADIUM FLOODLIGHTS MAX — KICKOFF!';

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between bg-slate-950 text-slate-100 overflow-y-auto p-4 sm:p-8 select-none">
      {/* Diagonal Arcade Sky vs Crimson Stadium Split */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,#082f49_0%,#0f172a_48%,#4c0519_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_30%,rgba(56,189,248,0.28),transparent_48%),radial-gradient(circle_at_78%_30%,rgba(244,63,94,0.28),transparent_48%)]"
      />

      {/* Top Competition Banner */}
      <div className="relative z-10 max-w-5xl w-full mx-auto flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-widest text-amber-300">
            {cupInfo
              ? `${cupInfo.name} · ${stageInfo?.stageName ?? 'Cup Tie'}`
              : config.mode === 'online'
                ? 'Global Online Match'
                : config.mode === '2P'
                  ? 'Local 2P Clash'
                  : 'Exhibition Showdown'}
          </div>
          <h2 className="font-display font-extrabold italic text-3xl sm:text-4xl tracking-wide text-white drop-shadow-[0_3px_0_rgba(2,6,23,0.9)]">
            MATCHUP TUNNEL
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-200 tabular-nums">
          <span>{arenaLabel}</span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span className="text-amber-300">First to {config.targetScore}</span>
        </div>
      </div>

      {/* Center High-Energy Face-Off */}
      <div className="relative z-10 max-w-5xl w-full mx-auto my-auto grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-6 py-4">
        {/* BLUE TEAM CORNER */}
        <motion.div
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="rounded-2xl border-2 border-sky-400/60 border-b-4 border-b-sky-800 bg-slate-950/80 p-4 sm:p-5 shadow-[0_12px_36px_rgba(14,165,233,0.25)]"
        >
          <div className="flex items-center gap-3 mb-3">
            <ClubCrestSvg crestId={blueCrest} sizeClass="w-12 h-12" />
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-sky-400">
                Home · Blue{config.mode === 'online' && config.onlineMySide === 'blue' ? ' (YOU)' : ''}
              </div>
              <div className="font-display font-extrabold italic text-2xl sm:text-3xl text-white leading-none truncate">
                {blueLabel}
              </div>
            </div>
          </div>

          <div className="flex items-end justify-center gap-1 pt-2 border-t border-sky-500/20">
            <PlayerAvatarSvg
              player={blueKeeper}
              kit={blueKit}
              facing="right"
              sizeClass="w-20 h-24 sm:w-24 sm:h-28"
            />
            <PlayerAvatarSvg
              player={blueStriker}
              kit={blueKit}
              facing="right"
              sizeClass="w-24 h-28 sm:w-28 sm:h-32"
            />
          </div>

          <div className="mt-2 text-center text-xs font-extrabold uppercase tracking-wide text-sky-200">
            {config.mode === '2P'
              ? 'Shuffling Players & Kit…'
              : `${blueKeeper.nickname} & ${blueStriker.nickname}`}
          </div>
        </motion.div>

        {/* CENTER VS CREST */}
        <div className="flex flex-col items-center justify-center py-1">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-full border-4 border-amber-400 bg-slate-950 flex items-center justify-center shadow-[0_0_28px_rgba(251,191,36,0.45)]"
          >
            <svg viewBox="0 0 40 40" className="w-10 h-10" aria-hidden="true">
              <circle cx="20" cy="20" r="17" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.2" />
              <polygon points="20,12 26,17 24,25 16,25 14,17" fill="#0f172a" />
              <path
                d="M20 3 V12 M34 15 L26 17 M29 33 L24 25 M11 33 L16 25 M6 15 L14 17"
                stroke="#0f172a"
                strokeWidth="2"
              />
            </svg>
          </motion.div>
          <div className="-skew-x-6 -mt-2 px-4 py-1 rounded-lg bg-amber-400 border-2 border-amber-100 border-b-4 border-b-amber-700 font-display font-extrabold italic text-2xl text-slate-950 shadow-lg">
            <span className="inline-block skew-x-6">VS</span>
          </div>
        </div>

        {/* RED TEAM CORNER */}
        <motion.div
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="rounded-2xl border-2 border-rose-400/60 border-b-4 border-b-rose-900 bg-slate-950/80 p-4 sm:p-5 shadow-[0_12px_36px_rgba(244,63,94,0.25)]"
        >
          <div className="flex flex-row-reverse items-center gap-3 mb-3 text-right">
            <ClubCrestSvg
              crestId={config.opponentCrestId ?? 'crimson_fang'}
              sizeClass="w-12 h-12"
            />
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-rose-400">
                Away · Red
              </div>
              <div className="font-display font-extrabold italic text-2xl sm:text-3xl text-white leading-none truncate">
                {redLabel}
              </div>
            </div>
          </div>

          <div className="flex items-end justify-center gap-1 pt-2 border-t border-rose-500/20">
            <PlayerAvatarSvg
              player={redStriker}
              kit={redKit}
              facing="left"
              sizeClass="w-24 h-28 sm:w-28 sm:h-32"
            />
            <PlayerAvatarSvg
              player={redKeeper}
              kit={redKit}
              facing="left"
              sizeClass="w-20 h-24 sm:w-24 sm:h-28"
            />
          </div>

          <div className="mt-2 text-center text-xs font-extrabold uppercase tracking-wide text-rose-200">
            {config.mode === '2P'
              ? 'Shuffling Players & Kit…'
              : `${redStriker.nickname} & ${redKeeper.nickname}`}
          </div>
        </motion.div>
      </div>

      {/* Bottom Beveled Stadium Kickoff Bar */}
      <div className="relative z-10 max-w-5xl w-full mx-auto space-y-2.5">
        <div className="flex items-center justify-between text-xs sm:text-sm font-extrabold uppercase tracking-wider tabular-nums">
          <span className="text-sky-300 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-300 shrink-0" />
            {statusText}
          </span>
          <span className="text-amber-300">{Math.round(progress)}%</span>
        </div>

        <div className="h-4 w-full rounded-xl bg-slate-950 border-2 border-slate-700 overflow-hidden p-0.5">
          <div
            style={{ width: `${progress}%` }}
            className="h-full rounded-lg bg-gradient-to-r from-sky-400 via-amber-300 to-emerald-400 transition-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Developed by OminX Game Studios &amp; Muhammad Ahmad
          </div>
          <button
            type="button"
            onClick={onReady}
            className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:translate-y-0.5 border-b-4 border-amber-700 text-xs font-extrabold uppercase tracking-wider text-slate-950 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            Skip to Kickoff!
          </button>
        </div>
      </div>
    </div>
  );
};
