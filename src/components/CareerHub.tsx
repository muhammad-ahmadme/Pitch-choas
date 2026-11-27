import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowUpCircle,
  Award,
  Check,
  Cloud,
  Coins,
  Flame,
  Globe,
  Lock,
  LogIn,
  LogOut,
  Shield,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import {
  ACHIEVEMENTS_CATALOG,
  CRESTS_CATALOG,
  CUPS_CATALOG,
  KITS_CATALOG,
  PLAYERS_CATALOG,
  applyPlayerUpgrades,
  getAchievementCurrentValue,
  getDivisionInfo,
  getKitById,
  getPlayerById,
} from '../game/catalog';
import { MUTATORS } from '../game/mutators';
import {
  AchievementSpec,
  CareerProfile,
  KitSpec,
  LeaderboardEntry,
  PlayerProfile,
} from '../game/types';
import { User } from '../lib/firebase';
import { ClubCrestSvg, TROPHY_PALETTE, TrophyBadgeSvg } from './ClubCrestSvg';

interface CareerHubProps {
  profile: CareerProfile;
  authUser: User | null;
  authBusy: boolean;
  cloudSyncing: boolean;
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  onBack: () => void;
  onStartCupStage: (cupId: string, stageIndex: number) => void;
  onUnlockPlayer: (player: PlayerProfile) => void;
  onEquipPlayer: (player: PlayerProfile) => void;
  onUpgradePlayerStat: (playerId: string, stat: 'speed' | 'jump' | 'kick') => void;
  onSetPowerupRole: (role: 'striker' | 'keeper') => void;
  onUnlockKit: (kit: KitSpec) => void;
  onEquipKit: (kitId: string) => void;
  onUpdateClubIdentity: (clubName: string, crestId: string) => void;
  onClaimAchievement: (achievement: AchievementSpec) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

type HubTab = 'cups' | 'squad' | 'kits' | 'milestones' | 'leaderboard';

const KitPreviewSvg: React.FC<{ kit: KitSpec }> = ({ kit }) => (
  <svg viewBox="0 0 72 72" className="w-14 h-14 shrink-0" aria-hidden="true">
    <path
      d="M22 14 L10 22 L15 34 L22 30 V52 H50 V30 L57 34 L62 22 L50 14 L42 18 C38 20 34 20 30 18 Z"
      fill={kit.primary}
      stroke="#0f172a"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path d="M22 14 L22 52 H29 V17 Z" fill={kit.secondary} />
    <path d="M30 18 Q36 22 42 18" fill="none" stroke={kit.trim} strokeWidth="3" />
    <rect x="23" y="54" width="26" height="10" rx="2" fill={kit.shorts} stroke="#0f172a" strokeWidth="2" />
    <circle cx="56" cy="59" r="5" fill={kit.boot} stroke="#0f172a" strokeWidth="1.5" />
  </svg>
);

const PlayerBustSvg: React.FC<{ player: PlayerProfile; kit: KitSpec }> = ({ player, kit }) => (
  <svg viewBox="0 0 64 64" className="w-12 h-12 shrink-0" aria-hidden="true">
    <rect x="14" y="42" width="36" height="18" rx="6" fill={kit.primary} stroke="#0f172a" strokeWidth="2" />
    <rect x="14" y="42" width="10" height="18" rx="3" fill={kit.secondary} />
    {player.hairStyle === 'afro' && (
      <circle cx="32" cy="24" r="18" fill={player.hairColor} />
    )}
    <circle cx="32" cy="26" r="14" fill={player.skinColor} stroke="#0f172a" strokeWidth="2" />
    {player.hairStyle === 'spiky' && (
      <path d="M18 20 L22 9 L29 16 L34 7 L40 16 L46 11 L46 21 Z" fill={player.hairColor} />
    )}
    {player.hairStyle === 'mohawk' && (
      <rect x="29" y="6" width="6" height="13" rx="2" fill={player.hairColor} />
    )}
    {player.hairStyle === 'crown' && (
      <path d="M21 15 L19 5 L27 11 L32 3 L37 11 L45 5 L43 15 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="1.5" />
    )}
    {(player.hairStyle === 'classic' || player.hairStyle === 'afro') && (
      <path d="M18 22 A14 14 0 0 1 46 22 Z" fill={player.hairColor} />
    )}
    {player.hairStyle === 'visor' ? (
      <rect x="20" y="21" width="24" height="6" rx="2" fill="#38bdf8" />
    ) : (
      <>
        <rect x="18" y="19" width="28" height="3.5" fill={kit.trim} />
        <circle cx="27" cy="27" r="2.2" fill="#0f172a" />
        <circle cx="37" cy="27" r="2.2" fill="#0f172a" />
      </>
    )}
  </svg>
);

export const CareerHub: React.FC<CareerHubProps> = ({
  profile,
  authUser,
  authBusy,
  cloudSyncing,
  leaderboard,
  leaderboardLoading,
  onBack,
  onStartCupStage,
  onUnlockPlayer,
  onEquipPlayer,
  onUpgradePlayerStat,
  onSetPowerupRole,
  onUnlockKit,
  onEquipKit,
  onUpdateClubIdentity,
  onClaimAchievement,
  onSignIn,
  onSignOut,
}) => {
  const [tab, setTab] = useState<HubTab>('cups');
  const [backdropFailed, setBackdropFailed] = useState(false);
  const [clubDraft, setClubDraft] = useState(profile.clubName);
  const [savedNotice, setSavedNotice] = useState(false);

  const equippedStriker = getPlayerById(profile.selectedStrikerId);
  const equippedKeeper = getPlayerById(profile.selectedKeeperId);
  const equippedKit = getKitById(profile.selectedKitId);
  const divInfo = getDivisionInfo(profile.clubXp);

  const claimableCount = ACHIEVEMENTS_CATALOG.filter(
    (ach) =>
      !profile.claimedAchievementIds.includes(ach.id) &&
      getAchievementCurrentValue(ach, profile) >= ach.target
  ).length;

  const handleSaveClubName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = clubDraft.trim().slice(0, 36);
    if (!cleaned) return;
    onUpdateClubIdentity(cleaned, profile.crestId);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {!backdropFailed && (
        <img
          src="/src/assets/images/career_locker_backdrop_1795773032283.jpg"
          alt="Club championship locker room"
          referrerPolicy="no-referrer"
          onError={() => setBackdropFailed(true)}
          className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-20"
        />
      )}

      {/* Top Club Header */}
      <header className="relative z-10 shrink-0 border-b border-slate-800/90 bg-slate-950/90 px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-semibold text-slate-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Menu</span>
            </button>

            <ClubCrestSvg crestId={profile.crestId} sizeClass="w-12 h-12" />

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display font-extrabold italic text-2xl sm:text-3xl tracking-wide text-white leading-none">
                  {profile.clubName.toUpperCase()}
                </h1>
                <span className="text-xs font-bold text-sky-300 tabular-nums">
                  {divInfo.division} · Lv {divInfo.level}
                </span>
              </div>

              <div className="mt-1.5 flex items-center gap-3 max-w-xs">
                <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${divInfo.progressPct}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-amber-300"
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                  {divInfo.xpIntoLevel}/{divInfo.xpPerLevel} XP
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400 font-medium">
                <span>
                  Squad: <strong className="text-sky-300">{equippedKeeper.nickname}</strong> &amp;{' '}
                  <strong className="text-sky-300">{equippedStriker.nickname}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Power-Up:{' '}
                  <strong className="text-amber-300">
                    {profile.selectedPowerupRole === 'keeper'
                      ? equippedKeeper.abilityName
                      : equippedStriker.abilityName}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Kit: <strong className="text-emerald-300">{equippedKit.name}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3.5 text-xs sm:text-sm font-semibold tabular-nums">
            <div className="flex items-center gap-1.5 text-amber-300">
              <Coins className="w-4 h-4" />
              <span>{profile.coins}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sky-300">
              <Trophy className="w-4 h-4" />
              <span>
                {profile.earnedTrophyIds.length}/{CUPS_CATALOG.length}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-slate-300">
              <span>
                {profile.careerWins}W–{profile.careerLosses}L
              </span>
            </div>
            {profile.bestWinStreak > 0 && (
              <div className="hidden md:flex items-center gap-1 text-orange-300">
                <Flame className="w-4 h-4" />
                <span>{profile.bestWinStreak} Best</span>
              </div>
            )}

            {authUser ? (
              <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-emerald-500/40 px-2.5 py-1.5 text-xs">
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-200 max-w-[110px] truncate">
                  {cloudSyncing ? 'Saving…' : authUser.displayName || 'Synced'}
                </span>
                <button
                  type="button"
                  onClick={onSignOut}
                  disabled={authBusy}
                  aria-label="Sign out"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                disabled={authBusy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{authBusy ? 'Signing In…' : 'Sync with Google'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-6xl mx-auto mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('cups')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              tab === 'cups'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            Trophy Cups ({profile.earnedTrophyIds.length}/{CUPS_CATALOG.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('squad')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              tab === 'squad'
                ? 'bg-sky-500 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            Squad &amp; Training ({profile.unlockedPlayerIds.length}/{PLAYERS_CATALOG.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('kits')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              tab === 'kits'
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            Kits &amp; Crest ({profile.unlockedKitIds.length}/{KITS_CATALOG.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('milestones')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              tab === 'milestones'
                ? 'bg-violet-400 text-slate-950'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Milestones</span>
            {claimableCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[11px] font-extrabold tabular-nums">
                {claimableCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('leaderboard')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
              tab === 'leaderboard'
                ? 'bg-rose-500 text-white'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Global Rankings</span>
          </button>
        </div>
      </header>

      {/* Scrollable Hub Body */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {tab === 'cups' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-5"
            >
              {CUPS_CATALOG.map((cup) => {
                const isEarned = profile.earnedTrophyIds.includes(cup.id);
                const isActive = profile.activeCupId === cup.id;
                const stageIdx = isActive
                  ? Math.min(profile.activeCupStage, cup.stages.length - 1)
                  : 0;
                const nextStage = cup.stages[stageIdx];
                const rewardKit = cup.unlockKitId ? getKitById(cup.unlockKitId) : null;
                const rewardPlayer = cup.unlockPlayerId
                  ? getPlayerById(cup.unlockPlayerId)
                  : null;

                return (
                  <div
                    key={cup.id}
                    className={`rounded-xl border p-5 flex flex-col justify-between bg-slate-900/92 shadow-xl ${
                      isActive
                        ? 'border-amber-400/75'
                        : isEarned
                          ? 'border-emerald-500/45'
                          : 'border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <TrophyBadgeSvg tier={cup.trophyTier} earned={isEarned} />
                          <div>
                            <div className="text-xs font-semibold text-amber-300">
                              {TROPHY_PALETTE[cup.trophyTier].label}
                              {isEarned ? ' · Trophy Won' : ''}
                            </div>
                            <h2 className="font-display font-extrabold text-2xl text-white tracking-wide">
                              {cup.name}
                            </h2>
                            <p className="text-xs text-slate-400">{cup.subtitle}</p>
                          </div>
                        </div>
                      </div>

                      {/* Stage Bracket */}
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {cup.stages.map((st, idx) => {
                          const completed = isActive && idx < stageIdx;
                          const current = isActive && idx === stageIdx;
                          const mutatorName = st.mutatorId
                            ? MUTATORS[st.mutatorId].name
                            : 'Random Arena';
                          return (
                            <div
                              key={st.stageName}
                              className={`rounded-lg border p-2 text-xs ${
                                current
                                  ? 'border-amber-400 bg-amber-400/12 text-white'
                                  : completed
                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                                    : 'border-slate-800 bg-slate-950/70 text-slate-400'
                              }`}
                            >
                              <div className="font-semibold truncate">{st.stageName}</div>
                              <div className="truncate text-[11px] opacity-90">{st.opponentName}</div>
                              <div className="truncate text-[10px] opacity-70 mt-0.5">{mutatorName}</div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                        <span className="text-amber-300 font-semibold tabular-nums">
                          Champion Prize: +{cup.rewardCoins} Coins
                        </span>
                        {rewardKit && <span>Unlocks Kit: {rewardKit.name}</span>}
                        {rewardPlayer && <span>Unlocks Player: {rewardPlayer.name}</span>}
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                      <div className="text-xs text-slate-300">
                        {isActive ? (
                          <span>
                            Next: <strong className="text-white">{nextStage.stageName}</strong> vs{' '}
                            <strong className="text-rose-300">{nextStage.opponentName}</strong> · First to{' '}
                            {nextStage.targetScore}
                          </span>
                        ) : (
                          <span>
                            Opener: <strong className="text-white">{cup.stages[0].opponentName}</strong> ·{' '}
                            {cup.stages.length} Matches
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onStartCupStage(cup.id, stageIdx)}
                        className="px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-extrabold italic text-lg tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {isActive ? 'CONTINUE CUP' : isEarned ? 'REPLAY CUP' : 'ENTER CUP'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {tab === 'squad' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3">
                <div className="text-xs sm:text-sm text-slate-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    Select Power-Up Captain and train unlocked players (up to Lv 5 per attribute):
                  </span>
                </div>
                <div className="inline-flex p-1 rounded-lg bg-slate-950 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => onSetPowerupRole('striker')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                      profile.selectedPowerupRole !== 'keeper'
                        ? 'bg-sky-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Striker: {equippedStriker.abilityName}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetPowerupRole('keeper')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                      profile.selectedPowerupRole === 'keeper'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Keeper: {equippedKeeper.abilityName}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PLAYERS_CATALOG.map((basePlayer) => {
                  const unlocked = profile.unlockedPlayerIds.includes(basePlayer.id);
                  const isEquipped =
                    basePlayer.role === 'striker'
                      ? profile.selectedStrikerId === basePlayer.id
                      : profile.selectedKeeperId === basePlayer.id;
                  const canAfford = profile.coins >= basePlayer.cost;
                  const up = profile.playerUpgrades[basePlayer.id] ?? {
                    speed: 0,
                    jump: 0,
                    kick: 0,
                  };
                  const effective = applyPlayerUpgrades(basePlayer, profile.playerUpgrades);

                  const statRows: Array<{
                    key: 'speed' | 'jump' | 'kick';
                    label: string;
                    val: number;
                    lvl: number;
                  }> = [
                    {
                      key: 'speed',
                      label: 'Speed',
                      val: Math.round(effective.speedMult * 100),
                      lvl: up.speed,
                    },
                    {
                      key: 'jump',
                      label: 'Jump',
                      val: Math.round(effective.jumpMult * 100),
                      lvl: up.jump,
                    },
                    {
                      key: 'kick',
                      label: 'Kick',
                      val: Math.round(effective.kickMult * 100),
                      lvl: up.kick,
                    },
                  ];

                  return (
                    <div
                      key={basePlayer.id}
                      className={`rounded-xl border p-4 bg-slate-900/92 flex flex-col justify-between ${
                        isEquipped ? 'border-sky-400' : 'border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <PlayerBustSvg player={basePlayer} kit={equippedKit} />
                            <div>
                              <div className="text-xs font-semibold text-slate-400">
                                #{basePlayer.number} ·{' '}
                                {basePlayer.role === 'striker' ? 'Striker' : 'Goalkeeper'}
                              </div>
                              <h3 className="font-display font-extrabold text-xl text-white tracking-wide leading-tight">
                                {basePlayer.name}
                              </h3>
                              <div className="text-xs font-semibold text-sky-300">
                                &ldquo;{basePlayer.nickname}&rdquo;
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Stats + Training Controls */}
                        <div className="mt-3.5 grid grid-cols-3 gap-2 text-xs tabular-nums">
                          {statRows.map((s) => {
                            const trainCost = 60 + s.lvl * 45;
                            const maxed = s.lvl >= 5;
                            const canTrain = unlocked && !maxed && profile.coins >= trainCost;
                            return (
                              <div
                                key={s.key}
                                className="bg-slate-950/80 rounded-lg p-2 border border-slate-800/90 flex flex-col justify-between"
                              >
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                  <span>{s.label}</span>
                                  <span className="text-sky-300">Lv{s.lvl}</span>
                                </div>
                                <div className="font-bold text-sm text-white mt-0.5">{s.val}</div>
                                {unlocked && (
                                  <button
                                    type="button"
                                    disabled={!canTrain}
                                    onClick={() => onUpgradePlayerStat(basePlayer.id, s.key)}
                                    className={`mt-1.5 w-full py-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 transition-colors ${
                                      maxed
                                        ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                                        : canTrain
                                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    }`}
                                  >
                                    {maxed ? (
                                      <span>MAX</span>
                                    ) : (
                                      <>
                                        <ArrowUpCircle className="w-3 h-3" />
                                        <span>{trainCost}</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Signature Ability */}
                        <div className="mt-3 rounded-lg bg-slate-950/80 border border-slate-800 p-2.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                            {basePlayer.role === 'striker' ? (
                              <Sparkles className="w-3.5 h-3.5" />
                            ) : (
                              <Shield className="w-3.5 h-3.5" />
                            )}
                            <span>{basePlayer.abilityName}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-300 leading-snug">
                            {basePlayer.abilityDesc}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        {unlocked ? (
                          <button
                            type="button"
                            disabled={isEquipped}
                            onClick={() => onEquipPlayer(basePlayer)}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                              isEquipped
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50 cursor-default'
                                : 'bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-white cursor-pointer'
                            }`}
                          >
                            {isEquipped ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>
                                  Equipped {basePlayer.role === 'striker' ? 'Striker' : 'Keeper'}
                                </span>
                              </>
                            ) : (
                              <span>
                                Equip as {basePlayer.role === 'striker' ? 'Striker' : 'Keeper'}
                              </span>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => onUnlockPlayer(basePlayer)}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors tabular-nums ${
                              canAfford
                                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                                : 'bg-slate-800/70 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Sign Player · {basePlayer.cost} Coins</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {tab === 'kits' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Club Identity & Crest Selector */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/92 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display font-extrabold text-2xl text-white tracking-wide">
                      CLUB IDENTITY &amp; CREST
                    </h2>
                    <p className="text-xs text-slate-400">
                      {profile.hasCustomizedClubName
                        ? 'Official club name is permanently locked. You can still switch your club crest badge below anytime!'
                        : 'Customize your club name and badge shown on match scoreboards and global rankings.'}
                    </p>
                  </div>
                  {profile.hasCustomizedClubName ? (
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border-2 border-slate-700 text-sm shadow-inner">
                      <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-display font-extrabold italic text-white tracking-wide">
                        {profile.clubName}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                        Official · Locked
                      </span>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveClubName} className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={36}
                        value={clubDraft}
                        onChange={(e) => setClubDraft(e.target.value)}
                        placeholder="Club Name"
                        aria-label="Club name"
                        className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400 w-48 sm:w-56"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {savedNotice ? 'Saved!' : 'Save Name'}
                      </button>
                    </form>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {CRESTS_CATALOG.map((crest) => {
                    const selected = profile.crestId === crest.id;
                    return (
                      <button
                        key={crest.id}
                        type="button"
                        onClick={() => onUpdateClubIdentity(profile.clubName, crest.id)}
                        className={`rounded-xl border p-3 flex flex-col items-center gap-2 transition-colors cursor-pointer ${
                          selected
                            ? 'border-amber-400 bg-amber-400/10'
                            : 'border-slate-800 bg-slate-950/70 hover:border-slate-600'
                        }`}
                      >
                        <ClubCrestSvg crestId={crest.id} sizeClass="w-11 h-11" />
                        <span className="text-xs font-semibold text-white text-center">
                          {crest.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Match Kits Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {KITS_CATALOG.map((kit) => {
                  const unlocked = profile.unlockedKitIds.includes(kit.id);
                  const equipped = profile.selectedKitId === kit.id;
                  const canAfford = profile.coins >= kit.cost;

                  return (
                    <div
                      key={kit.id}
                      className={`rounded-xl border p-4 bg-slate-900/92 flex flex-col justify-between ${
                        equipped ? 'border-emerald-400' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <KitPreviewSvg kit={kit} />
                        <div>
                          <h3 className="font-display font-extrabold text-xl text-white tracking-wide">
                            {kit.name}
                          </h3>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span
                              className="w-3.5 h-3.5 rounded-sm border border-slate-700"
                              style={{ backgroundColor: kit.primary }}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-sm border border-slate-700"
                              style={{ backgroundColor: kit.secondary }}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-sm border border-slate-700"
                              style={{ backgroundColor: kit.trim }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        {unlocked ? (
                          <button
                            type="button"
                            disabled={equipped}
                            onClick={() => onEquipKit(kit.id)}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                              equipped
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 cursor-default'
                                : 'bg-slate-800 hover:bg-emerald-400 hover:text-slate-950 text-white cursor-pointer'
                            }`}
                          >
                            {equipped ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Equipped Kit</span>
                              </>
                            ) : (
                              <span>Wear Kit</span>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => onUnlockKit(kit)}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors tabular-nums ${
                              canAfford
                                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                                : 'bg-slate-800/70 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Unlock Kit · {kit.cost} Coins</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {tab === 'milestones' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {ACHIEVEMENTS_CATALOG.map((ach) => {
                const current = getAchievementCurrentValue(ach, profile);
                const claimed = profile.claimedAchievementIds.includes(ach.id);
                const ready = !claimed && current >= ach.target;
                const pct = Math.min(100, Math.round((current / ach.target) * 100));

                return (
                  <div
                    key={ach.id}
                    className={`rounded-xl border p-5 bg-slate-900/92 flex flex-col justify-between ${
                      ready
                        ? 'border-amber-400'
                        : claimed
                          ? 'border-emerald-500/40'
                          : 'border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display font-extrabold text-2xl text-white tracking-wide">
                            {ach.title}
                          </h3>
                          <p className="text-xs text-slate-300 mt-0.5">{ach.description}</p>
                        </div>
                        <div className="text-right text-xs font-bold text-amber-300 tabular-nums shrink-0">
                          +{ach.rewardCoins} Coins
                          <div className="text-sky-300">+{ach.rewardXp} XP</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-xs font-semibold text-slate-400 tabular-nums mb-1">
                          <span>Progress</span>
                          <span>
                            {Math.min(current, ach.target)} / {ach.target}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                          <div
                            style={{ width: `${pct}%` }}
                            className={`h-full rounded-full ${
                              claimed ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      {claimed ? (
                        <div className="w-full py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>Milestone Claimed</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!ready}
                          onClick={() => onClaimAchievement(ach)}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                            ready
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer'
                              : 'bg-slate-800/70 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {ready ? 'Claim Reward' : 'In Progress'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {tab === 'leaderboard' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-slate-800 bg-slate-900/92 p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-white tracking-wide">
                    GLOBAL CLUB RANKINGS
                  </h2>
                  <p className="text-xs text-slate-400">
                    Top clubs synced via Firebase Cloud Career by Division XP &amp; Trophies.
                  </p>
                </div>

                {!authUser && (
                  <button
                    type="button"
                    onClick={onSignIn}
                    disabled={authBusy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign in with Google to Post Your Club</span>
                  </button>
                )}
              </div>

              {!authUser ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-8 text-center space-y-3">
                  <Globe className="w-10 h-10 text-sky-400 mx-auto" />
                  <h3 className="font-display font-extrabold text-2xl text-white">
                    CONNECT YOUR GOOGLE ACCOUNT
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                    Sign in to save your squad, unlocked kits, player training upgrades, and trophies to the cloud and compete on the Global Club Leaderboard.
                  </p>
                </div>
              ) : leaderboardLoading ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  Loading global club standings…
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  No clubs ranked yet. Play a Career match to publish your club!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm tabular-nums">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs">
                        <th className="py-2.5 pr-3">Rank</th>
                        <th className="py-2.5 px-3">Club</th>
                        <th className="py-2.5 px-3">Manager</th>
                        <th className="py-2.5 px-3 text-right">Cups</th>
                        <th className="py-2.5 px-3 text-right">Wins</th>
                        <th className="py-2.5 px-3 text-right">Top Shot</th>
                        <th className="py-2.5 pl-3 text-right">Club XP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {leaderboard.map((entry, idx) => {
                        const isSelf = authUser?.uid === entry.ownerUid;
                        return (
                          <tr
                            key={entry.ownerUid}
                            className={isSelf ? 'bg-sky-500/12 text-white' : 'text-slate-200'}
                          >
                            <td className="py-3 pr-3 font-display font-extrabold text-lg text-amber-300">
                              #{idx + 1}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <ClubCrestSvg crestId={entry.crestId} sizeClass="w-7 h-7" />
                                <span className="font-bold">
                                  {entry.clubName}
                                  {isSelf ? ' (You)' : ''}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-300">{entry.managerName}</td>
                            <td className="py-3 px-3 text-right font-semibold text-sky-300">
                              {entry.trophiesCount}
                            </td>
                            <td className="py-3 px-3 text-right">{entry.careerWins}</td>
                            <td className="py-3 px-3 text-right text-amber-300">
                              {entry.fastestShotKmh} km/h
                            </td>
                            <td className="py-3 pl-3 text-right font-bold text-white">
                              {entry.clubXp}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
