import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Clock,
  Coins,
  Cpu,
  Globe,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from 'lucide-react';
import { CareerProfile, MatchConfig, CpuDifficulty } from '../game/types';
import { getKitById, getPlayerById } from '../game/catalog';
import { ClubCrestSvg } from './ClubCrestSvg';

interface CelestialGamemodeModalProps {
  profile: CareerProfile;
  config: MatchConfig;
  onClose: () => void;
  onLaunch1P: (difficulty: CpuDifficulty) => void;
  onLaunchOnline: () => void;
}

export const CelestialGamemodeModal: React.FC<CelestialGamemodeModalProps> = ({
  profile,
  onClose,
  onLaunch1P,
  onLaunchOnline,
}) => {
  const [difficulty, setDifficulty] = useState<CpuDifficulty>('pro');
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 60, hours: 23, minutes: 59, seconds: 59 });

  // Countdown timer for 2 months / starting tomorrow night simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return { days: 60, hours: 0, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const equippedKit = getKitById(profile.selectedKitId);
  const equippedStriker = getPlayerById(profile.selectedStrikerId);
  const equippedKeeper = getPlayerById(profile.selectedKeeperId);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.35),transparent_60%),linear-gradient(to_bottom,#020617,#090d1f,#020617)] text-slate-100 overflow-y-auto p-4 sm:p-6 md:p-8 select-none">
      <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col gap-6">
        {/* Top Header Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 border-b-4 border-b-slate-950 text-xs font-extrabold uppercase tracking-wider text-slate-100 transition-all active:translate-y-0.5 cursor-pointer whitespace-nowrap shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Main Menu</span>
          </button>

          <div className="flex items-center gap-2.5 rounded-xl bg-indigo-950/90 border-2 border-indigo-400/50 px-4 py-2">
            <Sparkles className="w-5 h-5 text-indigo-300 animate-spin" />
            <span className="font-display font-extrabold italic text-base text-indigo-200 tracking-wide uppercase">
              Limited Time Celestial Event · Lunar Low-G
            </span>
          </div>
        </div>

        {/* Hero Showcase Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative rounded-3xl border-2 border-indigo-400/60 border-b-8 border-b-indigo-950 bg-gradient-to-br from-indigo-950/90 via-slate-950/95 to-purple-950/90 p-6 sm:p-8 overflow-hidden shadow-[0_20px_60px_rgba(79,70,229,0.35)]"
        >
          <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400 text-indigo-200 font-extrabold text-xs uppercase tracking-widest">
                <Rocket className="w-4 h-4" />
                Exclusive 2-Month Event · Timer Starts Tomorrow Night
              </div>

              <h1 className="font-display font-extrabold italic text-4xl sm:text-6xl tracking-tight text-white leading-[0.95] drop-shadow-[0_4px_0_rgba(2,6,23,0.95)]">
                LUNAR <span className="text-indigo-400">LOW-G</span> DOME
              </h1>

              <p className="text-sm font-semibold text-slate-300 leading-relaxed max-w-xl">
                Experience zero-gravity physics, massive floating headers, and hyper-charged projectile shots in the lunar atmosphere. Playable immediately in Quick Single Player and Global Multiplayer with exclusive rewards!
              </p>

              {/* Countdown Timer Widget */}
              <div className="grid grid-cols-4 gap-2 max-w-md pt-2">
                <div className="rounded-xl bg-slate-950/80 border border-indigo-500/40 p-2.5 text-center">
                  <div className="font-display font-extrabold text-2xl text-indigo-300 tabular-nums">
                    {timeLeft.days}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Days</div>
                </div>
                <div className="rounded-xl bg-slate-950/80 border border-indigo-500/40 p-2.5 text-center">
                  <div className="font-display font-extrabold text-2xl text-indigo-300 tabular-nums">
                    {timeLeft.hours}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hours</div>
                </div>
                <div className="rounded-xl bg-slate-950/80 border border-indigo-500/40 p-2.5 text-center">
                  <div className="font-display font-extrabold text-2xl text-indigo-300 tabular-nums">
                    {timeLeft.minutes}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mins</div>
                </div>
                <div className="rounded-xl bg-slate-950/80 border border-indigo-500/40 p-2.5 text-center">
                  <div className="font-display font-extrabold text-2xl text-indigo-300 tabular-nums">
                    {timeLeft.seconds}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Secs</div>
                </div>
              </div>
            </div>

            {/* Reward & Readiness Badge */}
            <div className="rounded-2xl bg-slate-950/90 border-2 border-indigo-500/40 p-5 flex flex-col gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center shrink-0">
                  <Coins className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <div className="font-display font-extrabold italic text-lg text-white">
                    Global Rewards Active
                  </div>
                  <div className="text-xs font-semibold text-slate-300">
                    Online &amp; 1P matches award 2x XP &amp; Bonus Lunar Coins!
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-2 text-xs font-bold text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Gravity Multiplier:</span>
                  <span className="text-indigo-300">0.35x (Ultra Low-G)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Ball Bounciness:</span>
                  <span className="text-indigo-300">1.45x (Super Elastic)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Matchmaking Status:</span>
                  <span className="text-emerald-400">Ready &amp; Online</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Match Launch Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto">
          {/* Quick Single Player Card */}
          <div className="rounded-2xl border-2 border-sky-400/50 border-b-6 border-b-sky-900 bg-slate-900/90 p-6 flex flex-col justify-between gap-5 shadow-2xl">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex items-center gap-2 text-sky-400 font-display font-extrabold italic text-xl">
                  <Cpu className="w-6 h-6" />
                  <span>QUICK SINGLE PLAYER</span>
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider bg-sky-950 text-sky-300 px-2 py-1 rounded">
                  vs Smart AI
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-300 mb-4">
                Test your low-gravity aerial skills against our advanced heuristic CPU engine.
              </p>

              {/* Difficulty Selector */}
              <div className="flex items-center gap-1 bg-slate-950 border-2 border-slate-800 rounded-xl p-1 mb-4">
                {(['casual', 'pro', 'chaos'] as CpuDifficulty[]).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`flex-1 py-2 rounded-lg font-display font-extrabold italic text-sm uppercase tracking-wide transition-all cursor-pointer ${
                      difficulty === diff
                        ? 'bg-sky-400 text-slate-950 border-b-2 border-sky-700'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onLaunch1P(difficulty)}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-sky-400 to-sky-500 hover:brightness-105 active:translate-y-1 border-2 border-sky-200 border-b-6 border-b-sky-800 text-slate-950 font-display font-extrabold italic text-2xl tracking-wide transition-all cursor-pointer shadow-lg"
            >
              LAUNCH 1P LUNAR MATCH!
            </button>
          </div>

          {/* Global Multiplayer Card */}
          <div className="rounded-2xl border-2 border-emerald-400/50 border-b-6 border-b-emerald-900 bg-slate-900/90 p-6 flex flex-col justify-between gap-5 shadow-2xl">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="inline-flex items-center gap-2 text-emerald-400 font-display font-extrabold italic text-xl">
                  <Globe className="w-6 h-6" />
                  <span>GLOBAL MULTIPLAYER</span>
                </div>
                <span className="text-xs font-extrabold uppercase tracking-wider bg-emerald-950 text-emerald-300 px-2 py-1 rounded">
                  Count Towards Rewards
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-300 mb-4">
                Challenge players worldwide in real-time authoritative WebSockets match rooms. Every win counts towards your global rank &amp; rewards!
              </p>

              <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 mb-4 flex items-center gap-3">
                <ClubCrestSvg crestId={profile.crestId} sizeClass="w-9 h-9" />
                <div className="min-w-0">
                  <div className="font-display font-extrabold italic text-sm text-white truncate">
                    {profile.clubName}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-300">
                    {equippedStriker.nickname} &amp; {equippedKeeper.nickname} Ready
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLaunchOnline}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 hover:brightness-105 active:translate-y-1 border-2 border-emerald-200 border-b-6 border-b-emerald-800 text-slate-950 font-display font-extrabold italic text-2xl tracking-wide transition-all cursor-pointer shadow-lg"
            >
              ENTER GLOBAL ONLINE ARENA!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
