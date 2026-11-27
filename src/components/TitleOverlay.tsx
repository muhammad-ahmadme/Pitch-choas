import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Cloud,
  Coins,
  Cpu,
  Flame,
  Globe,
  LogIn,
  LogOut,
  Play,
  Shield,
  Shuffle,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  CUPS_CATALOG,
  getCupById,
  getDivisionInfo,
  getKitById,
  getPlayerById,
} from '../game/catalog';
import {
  CareerProfile,
  CpuDifficulty,
  MatchConfig,
  PlayMode,
  TwistMode,
} from '../game/types';
import { DeviceMode } from '../hooks/useDeviceMode';
import { User } from '../lib/firebase';
import { ClubCrestSvg } from './ClubCrestSvg';
import { PlayerAvatarSvg } from './PlayerAvatarSvg';

interface TitleOverlayProps {
  config: MatchConfig;
  profile: CareerProfile;
  deviceMode: DeviceMode;
  muted: boolean;
  authUser: User | null;
  authBusy: boolean;
  cloudSyncing: boolean;
  authError: string | null;
  onChangeConfig: (next: MatchConfig) => void;
  onStart: () => void;
  onOpenCareerHub: () => void;
  onOpenOnlineLobby: () => void;
  onOpenCelestialModal: () => void;
  onToggleMute: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  config,
  profile,
  deviceMode,
  muted,
  authUser,
  authBusy,
  cloudSyncing,
  authError,
  onChangeConfig,
  onStart,
  onOpenCareerHub,
  onOpenOnlineLobby,
  onOpenCelestialModal,
  onToggleMute,
  onSignIn,
  onSignOut,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  const updateMode = (mode: PlayMode) => onChangeConfig({ ...config, mode });
  const updateDifficulty = (difficulty: CpuDifficulty) =>
    onChangeConfig({ ...config, difficulty });
  const updateTwist = (twistMode: TwistMode) =>
    onChangeConfig({ ...config, twistMode });
  const updateTarget = (targetScore: 3 | 5 | 7) =>
    onChangeConfig({ ...config, targetScore });

  const equippedStriker = getPlayerById(profile.selectedStrikerId);
  const equippedKeeper = getPlayerById(profile.selectedKeeperId);
  const equippedKit = getKitById(profile.selectedKitId);
  const activeAbility =
    profile.selectedPowerupRole === 'keeper' ? equippedKeeper : equippedStriker;
  const activeCup = profile.activeCupId ? getCupById(profile.activeCupId) : null;
  const nextCup = activeCup ?? CUPS_CATALOG[0];
  const nextStage =
    nextCup.stages[activeCup ? profile.activeCupStage : 0] ?? nextCup.stages[0];
  const divInfo = getDivisionInfo(profile.clubXp);

  // Opponent stage preview
  const previewOpponentKit =
    config.mode === 'career'
      ? getKitById(nextStage.opponentKitId)
      : config.mode === '2P'
        ? getKitById('sunset_coral')
        : getKitById('crimson_united');
  const previewOpponentStriker =
    config.mode === 'career'
      ? getPlayerById(nextStage.opponentStrikerId)
      : config.mode === '2P'
        ? getPlayerById('diego_sky')
        : getPlayerById('axel_blaze');
  const previewOpponentKeeper =
    config.mode === 'career'
      ? getPlayerById(nextStage.opponentKeeperId)
      : config.mode === '2P'
        ? getPlayerById('elena_shield')
        : getPlayerById('giga_petrov');

  const stageTitle =
    config.mode === 'career'
      ? activeCup
        ? `${activeCup.name} · ${nextStage.stageName}`
        : `${nextCup.name} · Kickoff`
      : config.mode === 'online'
        ? 'Global Online Arena · Ranked'
        : config.mode === '2P'
          ? '2P Mystery Shuffle'
          : `Quick Match · ${config.difficulty.toUpperCase()} CPU`;

  const rivalLabel =
    config.mode === 'career'
      ? nextStage.opponentName
      : config.mode === 'online'
        ? 'World Challenger'
        : config.mode === '2P'
          ? 'Red Challenger'
          : `CPU (${config.difficulty.toUpperCase()})`;

  return (
    <div className="absolute inset-0 z-10 overflow-hidden bg-gradient-to-br from-sky-950 via-slate-950 to-emerald-950 select-none">
      {!imgFailed && (
        <img
          src="/src/assets/images/stadium_title_backdrop_1795703448365.jpg"
          alt="Floodlit championship soccer stadium at night"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02]"
        />
      )}

      {/* Floodlight & Arcade Turf Vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_15%,rgba(14,165,233,0.28),transparent_48%),radial-gradient(ellipse_at_85%_20%,rgba(251,191,36,0.20),transparent_45%),linear-gradient(105deg,rgba(2,6,23,0.92)_0%,rgba(2,6,23,0.78)_52%,rgba(2,6,23,0.68)_100%)]"
      />

      <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 sm:p-6 lg:px-10 lg:py-7 overflow-y-auto">
        {/* Top Arcade Status Strip */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onOpenCareerHub}
              className="group flex items-center gap-2.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 border-2 border-sky-400/50 border-b-4 border-b-sky-600 px-3 py-1.5 transition-transform active:translate-y-0.5 cursor-pointer shadow-lg"
            >
              <ClubCrestSvg crestId={profile.crestId} sizeClass="w-9 h-9" />
              <div className="text-left">
                <div className="font-display font-extrabold italic text-base tracking-wide text-white leading-none truncate max-w-[150px] group-hover:text-amber-300 transition-colors">
                  {profile.clubName}
                </div>
                <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider tabular-nums mt-0.5">
                  {divInfo.division} · LV {divInfo.level}
                </div>
              </div>
            </button>

            <div className="flex flex-wrap items-center gap-3 text-xs font-extrabold uppercase tracking-wide text-slate-200 tabular-nums">
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <Coins className="w-4 h-4 shrink-0" />
                {profile.coins}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="inline-flex items-center gap-1.5 text-sky-300">
                <Trophy className="w-4 h-4 shrink-0" />
                {profile.earnedTrophyIds.length}/{CUPS_CATALOG.length} CUPS
              </span>
              {profile.winStreak > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="inline-flex items-center gap-1.5 text-orange-300">
                    <Flame className="w-4 h-4 shrink-0" />
                    {profile.winStreak} STREAK
                  </span>
                </>
              )}
              <span aria-hidden="true" className="hidden md:inline text-slate-600">·</span>
              <span className="hidden md:inline text-slate-400 font-semibold">
                {deviceMode === 'mobile' ? 'Touch Pad' : 'Keyboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {authUser ? (
              <div className="flex items-center gap-2 rounded-xl bg-slate-900/95 border-2 border-emerald-500/50 border-b-4 border-b-emerald-700 px-3 py-1.5 text-xs">
                <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold text-white max-w-[125px] truncate">
                  {cloudSyncing ? 'Saving…' : authUser.displayName || 'Cloud Club'}
                </span>
                <button
                  type="button"
                  onClick={onSignOut}
                  disabled={authBusy}
                  aria-label="Sign out"
                  className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3 h-3" />
                  <span className="hidden sm:inline">Out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                disabled={authBusy}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 disabled:opacity-60 border-b-4 border-sky-700 active:translate-y-0.5 text-slate-950 font-extrabold text-xs uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-lg"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{authBusy ? 'Signing In…' : 'Cloud Save'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900/95 border-2 border-slate-700 border-b-4 border-b-slate-950 text-slate-100 hover:bg-slate-800 hover:border-amber-400/60 transition-colors cursor-pointer shrink-0"
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {authError && (
          <div className="mt-2 max-w-md rounded-xl border-2 border-rose-500/60 bg-rose-950/85 px-3.5 py-2 text-xs font-semibold text-rose-100">
            {authError}
          </div>
        )}

        {/* Main Arcade Showcase Grid */}
        <div className="my-auto py-4 grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] items-center gap-6 lg:gap-10 max-w-6xl w-full mx-auto">
          {/* LEFT STAGE: Arcade Logo, Mode Select Tiles, Rule Chips & Giant Kick Off CTA */}
          <motion.div
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="space-y-5"
          >
            {/* Dynamic Arcade Wordmark Crest */}
            <div className="flex items-center gap-4">
              <div className="-skew-x-6 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 border-2 border-amber-100 border-b-4 border-b-orange-700 flex items-center justify-center shadow-[0_8px_24px_rgba(251,191,36,0.35)] shrink-0">
                <svg viewBox="0 0 48 48" className="w-11 h-11 skew-x-6" aria-hidden="true">
                  <circle cx="24" cy="24" r="19" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />
                  <polygon points="24,14 31,20 28,29 20,29 17,20" fill="#0f172a" />
                  <path
                    d="M24 5 V14 M41 18 L31 20 M35 39 L28 29 M13 39 L20 29 M7 18 L17 20"
                    stroke="#0f172a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div>
                <h1 className="font-display font-extrabold italic text-5xl sm:text-6xl tracking-tight leading-[0.9] text-white drop-shadow-[0_4px_0_rgba(2,6,23,0.95)]">
                  PITCH <span className="text-amber-400">CHAOS</span>
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm font-bold uppercase tracking-widest text-sky-300">
                  2v2 Arcade Soccer · Cups, Power-Ups &amp; Couch Duels
                </p>
              </div>
            </div>

            {/* Limited Time Celestial Lunar Low-G Gamemode Banner */}
            <div className="rounded-xl bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 border-2 border-indigo-400/70 border-b-4 border-b-indigo-950 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/25 border border-indigo-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
                </div>
                <div>
                  <div className="font-display font-extrabold italic text-sm text-indigo-200 tracking-wide">
                    CELESTIAL GAMEMODE: LUNAR LOW-G (2 MONTHS · STARTS TOMORROW NIGHT)
                  </div>
                  <div className="text-[11px] font-bold text-slate-300">
                    Ready to play immediately! · Quick Single Player &amp; Global Multiplayer Rewards Active
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenCelestialModal}
                  className="px-4 py-2.5 rounded-lg font-display font-extrabold italic text-xs uppercase tracking-wider bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white border-2 border-indigo-200 border-b-4 border-b-indigo-950 transition-all cursor-pointer whitespace-nowrap shadow-lg animate-bounce"
                >
                  ✨ Open Celestial Hub
                </button>
              </div>
            </div>

            {/* 4 Chunky Beveled Game Mode Cards */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => updateMode('career')}
                className={`group relative rounded-xl p-3 sm:p-3.5 text-left transition-all cursor-pointer border-2 border-b-4 active:translate-y-0.5 ${
                  config.mode === 'career'
                    ? 'bg-gradient-to-br from-amber-300 to-amber-500 border-amber-100 border-b-amber-700 text-slate-950 shadow-[0_8px_24px_rgba(251,191,36,0.35)]'
                    : 'bg-slate-900/90 hover:bg-slate-800/95 border-slate-700 border-b-slate-950 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <Trophy
                    className={`w-5 h-5 shrink-0 ${
                      config.mode === 'career' ? 'text-slate-950' : 'text-amber-400'
                    }`}
                  />
                  {config.mode === 'career' && (
                    <span className="font-display font-extrabold text-[11px] uppercase tracking-wider bg-slate-950/15 px-1.5 py-0.5 rounded">
                      1P
                    </span>
                  )}
                </div>
                <div className="font-display font-extrabold italic text-lg sm:text-xl leading-none tracking-wide">
                  CAREER CUP
                </div>
                <div
                  className={`mt-1 text-[11px] font-bold leading-tight ${
                    config.mode === 'career' ? 'text-slate-900/90' : 'text-slate-400'
                  }`}
                >
                  Win Trophies &amp; Squad
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateMode('1P')}
                className={`group relative rounded-xl p-3 sm:p-3.5 text-left transition-all cursor-pointer border-2 border-b-4 active:translate-y-0.5 ${
                  config.mode === '1P'
                    ? 'bg-gradient-to-br from-sky-300 to-sky-500 border-sky-100 border-b-sky-800 text-slate-950 shadow-[0_8px_24px_rgba(14,165,233,0.35)]'
                    : 'bg-slate-900/90 hover:bg-slate-800/95 border-slate-700 border-b-slate-950 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <Cpu
                    className={`w-5 h-5 shrink-0 ${
                      config.mode === '1P' ? 'text-slate-950' : 'text-sky-400'
                    }`}
                  />
                  {config.mode === '1P' && (
                    <span className="font-display font-extrabold text-[11px] uppercase tracking-wider bg-slate-950/15 px-1.5 py-0.5 rounded">
                      1P
                    </span>
                  )}
                </div>
                <div className="font-display font-extrabold italic text-lg sm:text-xl leading-[0.95] tracking-wide">
                  QUICK SINGLE PLAYER
                </div>
                <div
                  className={`mt-1 text-[11px] font-bold leading-tight ${
                    config.mode === '1P' ? 'text-slate-900/90' : 'text-slate-400'
                  }`}
                >
                  vs CPU Exhibition
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateMode('online')}
                className={`group relative rounded-xl p-3 sm:p-3.5 text-left transition-all cursor-pointer border-2 border-b-4 active:translate-y-0.5 ${
                  config.mode === 'online'
                    ? 'bg-gradient-to-br from-emerald-300 to-emerald-500 border-emerald-100 border-b-emerald-800 text-slate-950 shadow-[0_8px_24px_rgba(16,185,129,0.38)]'
                    : 'bg-slate-900/90 hover:bg-slate-800/95 border-slate-700 border-b-slate-950 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <Globe
                    className={`w-5 h-5 shrink-0 ${
                      config.mode === 'online' ? 'text-slate-950' : 'text-emerald-400'
                    }`}
                  />
                  {config.mode === 'online' && (
                    <span className="font-display font-extrabold text-[11px] uppercase tracking-wider bg-slate-950/15 px-1.5 py-0.5 rounded">
                      WORLD
                    </span>
                  )}
                </div>
                <div className="font-display font-extrabold italic text-lg sm:text-xl leading-none tracking-wide">
                  GLOBAL ONLINE
                </div>
                <div
                  className={`mt-1 text-[11px] font-bold leading-tight ${
                    config.mode === 'online' ? 'text-slate-900/90' : 'text-slate-400'
                  }`}
                >
                  Live Matchmaking &amp; Rooms
                </div>
              </button>

              <button
                type="button"
                onClick={() => updateMode('2P')}
                className={`group relative rounded-xl p-3 sm:p-3.5 text-left transition-all cursor-pointer border-2 border-b-4 active:translate-y-0.5 ${
                  config.mode === '2P'
                    ? 'bg-gradient-to-br from-rose-400 to-rose-600 border-rose-200 border-b-rose-900 text-white shadow-[0_8px_24px_rgba(244,63,94,0.38)]'
                    : 'bg-slate-900/90 hover:bg-slate-800/95 border-slate-700 border-b-slate-950 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <Users
                    className={`w-5 h-5 shrink-0 ${
                      config.mode === '2P' ? 'text-white' : 'text-rose-400'
                    }`}
                  />
                  {config.mode === '2P' && (
                    <span className="font-display font-extrabold text-[11px] uppercase tracking-wider bg-slate-950/30 px-1.5 py-0.5 rounded">
                      2P
                    </span>
                  )}
                </div>
                <div className="font-display font-extrabold italic text-lg sm:text-xl leading-none tracking-wide">
                  2P FRIEND
                </div>
                <div
                  className={`mt-1 text-[11px] font-bold leading-tight ${
                    config.mode === '2P' ? 'text-rose-50' : 'text-slate-400'
                  }`}
                >
                  Same-Device Duel
                </div>
              </button>
            </div>

            {/* Arcade Quick-Play Rule Chips (NO corporate form rows) */}
            {config.mode !== 'career' ? (
              <div className="flex flex-wrap items-center gap-3 pt-0.5">
                {config.mode === '1P' && (
                  <div className="flex items-center gap-1 bg-slate-950/85 border-2 border-slate-800 rounded-xl p-1">
                    {(['casual', 'pro', 'chaos'] as CpuDifficulty[]).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => updateDifficulty(diff)}
                        className={`px-3 py-1.5 rounded-lg font-display font-extrabold italic text-sm uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          config.difficulty === diff
                            ? diff === 'chaos'
                              ? 'bg-rose-500 text-white border-b-2 border-rose-800'
                              : 'bg-sky-400 text-slate-950 border-b-2 border-sky-700'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {diff} AI
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1 bg-slate-950/85 border-2 border-slate-800 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => updateTwist('random')}
                    className={`px-3 py-1.5 rounded-lg font-display font-extrabold italic text-sm uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      config.twistMode === 'random'
                        ? 'bg-amber-400 text-slate-950 border-b-2 border-amber-700'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Chaos Arenas
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTwist('classic')}
                    className={`px-3 py-1.5 rounded-lg font-display font-extrabold italic text-sm uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      config.twistMode === 'classic'
                        ? 'bg-emerald-400 text-slate-950 border-b-2 border-emerald-700'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Classic Turf
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-slate-950/85 border-2 border-slate-800 rounded-xl p-1">
                  {([3, 5, 7] as const).map((goals) => (
                    <button
                      key={goals}
                      type="button"
                      onClick={() => updateTarget(goals)}
                      className={`px-3 py-1.5 rounded-lg font-display font-extrabold italic text-sm uppercase tracking-wide tabular-nums transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        config.targetScore === goals
                          ? 'bg-white text-slate-950 border-b-2 border-slate-400'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {goals}G
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-amber-200/95">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  6 Trophy Cups · Upgrade Stats, Unlock Legends &amp; Climb Global Ranks
                </span>
              </div>
            )}

            {/* Dominant Beveled Arcade Play CTA */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {config.mode === 'career' ? (
                <button
                  type="button"
                  onClick={onOpenCareerHub}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 hover:brightness-105 active:translate-y-1 border-2 border-amber-100 border-b-[6px] border-b-amber-700 text-slate-950 font-display font-extrabold italic text-3xl tracking-wide transition-all focus-visible:outline-2 focus-visible:outline-white whitespace-nowrap shrink-0 cursor-pointer shadow-[0_12px_32px_rgba(251,191,36,0.38)]"
                >
                  <Trophy className="w-7 h-7 shrink-0" />
                  <span>PLAY CAREER HQ!</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onStart}
                    className={`inline-flex items-center gap-3 px-8 py-4 rounded-xl hover:brightness-105 active:translate-y-1 border-2 border-b-[6px] text-slate-950 font-display font-extrabold italic text-3xl tracking-wide transition-all focus-visible:outline-2 focus-visible:outline-white whitespace-nowrap shrink-0 cursor-pointer ${
                      config.mode === 'online'
                        ? 'bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-500 border-emerald-100 border-b-emerald-800 shadow-[0_12px_32px_rgba(16,185,129,0.38)]'
                        : 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 border-amber-100 border-b-amber-700 shadow-[0_12px_32px_rgba(251,191,36,0.38)]'
                    }`}
                  >
                    {config.mode === 'online' ? (
                      <Globe className="w-7 h-7 shrink-0" />
                    ) : config.mode === '2P' ? (
                      <Shuffle className="w-7 h-7 shrink-0" />
                    ) : (
                      <Play className="w-7 h-7 fill-slate-950 shrink-0" />
                    )}
                    <span>
                      {config.mode === 'online'
                        ? 'ENTER ONLINE ARENA!'
                        : config.mode === '2P'
                          ? 'SHUFFLE & PLAY!'
                          : 'KICK OFF!'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenCareerHub}
                    className="inline-flex items-center gap-2 px-5 py-4 rounded-xl bg-slate-900/95 hover:bg-slate-800 active:translate-y-0.5 border-2 border-slate-600 border-b-[5px] border-b-slate-950 text-white font-display font-extrabold italic text-xl tracking-wide transition-all whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Shield className="w-5 h-5 text-sky-400 shrink-0" />
                    <span>LOCKER &amp; CUPS</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>

          {/* RIGHT STAGE: Live Arcade Matchup & Character Stage */}
          <motion.div
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative rounded-2xl border-2 border-sky-400/35 border-b-4 border-b-slate-950 bg-slate-950/88 overflow-hidden shadow-[0_20px_50px_rgba(2,6,23,0.8)]"
          >
            {/* Diagonal Stadium Split Stage */}
            <div className="relative px-5 pt-4 pb-3 bg-[linear-gradient(120deg,rgba(14,165,233,0.28)_0%,rgba(15,23,42,0.92)_48%,rgba(244,63,94,0.28)_100%)] border-b-2 border-slate-800/90">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-display font-extrabold italic text-sm uppercase tracking-wider text-amber-300">
                  {stageTitle}
                </span>
                <button
                  type="button"
                  onClick={onOpenCareerHub}
                  className="text-xs font-extrabold uppercase tracking-wider text-sky-300 hover:text-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Change Squad →
                </button>
              </div>

              {/* Face-Off Character Stage */}
              <div className="relative grid grid-cols-[1fr_auto_1fr] items-end gap-2 pt-2 pb-1">
                {/* Blue Squad Athletes */}
                <div className="flex flex-col items-center">
                  <div className="flex items-end -space-x-4">
                    <PlayerAvatarSvg
                      player={equippedKeeper}
                      kit={equippedKit}
                      facing="right"
                      sizeClass="w-16 h-20 sm:w-20 sm:h-24"
                    />
                    <PlayerAvatarSvg
                      player={equippedStriker}
                      kit={equippedKit}
                      facing="right"
                      sizeClass="w-20 h-24 sm:w-24 sm:h-28"
                    />
                  </div>
                  <div className="mt-1.5 text-center">
                    <div className="font-display font-extrabold italic text-lg text-sky-300 leading-none truncate max-w-[140px]">
                      {config.mode === '2P' ? 'BLUE DUO' : profile.clubName}
                    </div>
                    <div className="text-[11px] font-bold text-slate-300 mt-0.5">
                      {config.mode === '2P'
                        ? 'Randomly Shuffled'
                        : `${equippedKeeper.nickname} & ${equippedStriker.nickname}`}
                    </div>
                  </div>
                </div>

                {/* Center Arcade VS Emblem */}
                <div className="flex flex-col items-center justify-center pb-8">
                  <div className="-skew-x-6 px-3 py-1 rounded-lg bg-amber-400 border-2 border-amber-100 border-b-4 border-b-amber-700 text-slate-950 font-display font-extrabold italic text-2xl leading-none shadow-lg">
                    <span className="inline-block skew-x-6">VS</span>
                  </div>
                </div>

                {/* Red Rival Athletes */}
                <div className="flex flex-col items-center">
                  <div className="flex items-end -space-x-4">
                    <PlayerAvatarSvg
                      player={previewOpponentStriker}
                      kit={previewOpponentKit}
                      facing="left"
                      sizeClass="w-20 h-24 sm:w-24 sm:h-28"
                    />
                    <PlayerAvatarSvg
                      player={previewOpponentKeeper}
                      kit={previewOpponentKit}
                      facing="left"
                      sizeClass="w-16 h-20 sm:w-20 sm:h-24"
                    />
                  </div>
                  <div className="mt-1.5 text-center">
                    <div className="font-display font-extrabold italic text-lg text-rose-400 leading-none truncate max-w-[140px]">
                      {rivalLabel}
                    </div>
                    <div className="text-[11px] font-bold text-slate-300 mt-0.5">
                      {config.mode === '2P'
                        ? 'Randomly Shuffled'
                        : config.mode === 'online'
                          ? 'Real-Time Opponent'
                          : `${previewOpponentStriker.nickname} & ${previewOpponentKeeper.nickname}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Turf Stripe Accent & Active Loadout Readout */}
            <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-lime-400 to-emerald-500" />

            <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-slate-950/95">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-amber-400/15 border border-amber-400/50 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300">
                    {config.mode === '2P' ? 'Match Chaos Twist' : 'Active Power-Up'}
                  </div>
                  <div className="font-display font-extrabold italic text-base text-white truncate">
                    {config.mode === '2P'
                      ? 'Random Kits & Abilities Every Kickoff'
                      : `${activeAbility.abilityName} (${equippedKit.name})`}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="w-4 h-4 rounded-sm border border-white/30"
                  style={{ backgroundColor: equippedKit.primary }}
                  title={equippedKit.name}
                />
                <span
                  className="w-4 h-4 rounded-sm border border-white/30"
                  style={{ backgroundColor: equippedKit.secondary }}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Adaptive Arcade Controls Strip */}
        <footer className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-300">
          <span>
            {deviceMode === 'mobile'
              ? config.mode === '2P'
                ? 'TOUCH: Left Pad Blue ◀ ▶ Kick & Power · Right Pad Red ◀ ▶ Kick & Power'
                : 'TOUCH: Left Pad Move ◀ ▶ · Right Pad Jump/Kick & Power-Up'
              : config.mode === '2P'
                ? 'BLUE: A/D Move · W Kick · S Power  |  RED: ◀/▶ Move · ▲ Kick · ▼ Power  |  P Pause'
                : 'MOVE: A/D or ◀/▶ · KICK: W / Space / ▲ · POWER-UP: S / E / ▼ · P Pause · M Mute'}
          </span>
          {deviceMode === 'pc' && config.mode !== 'career' && (
            <span className="text-amber-300 uppercase tracking-wider">
              Enter / Space to Kick Off
            </span>
          )}
        </footer>
      </div>
    </div>
  );
};
