import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CareerHub } from './components/CareerHub';
import { GameCanvas, TouchControlState } from './components/GameCanvas';
import { GameHud, TouchAction } from './components/GameHud';
import { MatchLoadingScreen } from './components/MatchLoadingScreen';
import { CareerMatchOutcome, ModalOverlays } from './components/ModalOverlays';
import { OnlineLobbyModal } from './components/OnlineLobbyModal';
import { CelestialGamemodeModal } from './components/CelestialGamemodeModal';
import { ClubNamePromptModal } from './components/ClubNamePromptModal';
import { TitleOverlay } from './components/TitleOverlay';
import { soundEngine } from './game/audio';
import {
  CRESTS_CATALOG,
  applyPlayerUpgrades,
  getAchievementCurrentValue,
  getCupById,
  getKitById,
  getPlayerById,
} from './game/catalog';
import { SoccerEngine } from './game/engine';
import { MUTATORS } from './game/mutators';
import { ClientClubPayload, OnlineMatchSetup } from './game/onlineProtocol';
import { DEFAULT_PROFILE, loadCareerProfile, saveCareerProfile } from './game/progression';
import {
  AchievementSpec,
  CareerProfile,
  GamePhase,
  HudSnapshot,
  KitSpec,
  LeaderboardEntry,
  MatchConfig,
  MutatorId,
  PlayerProfile,
  TeamSide,
} from './game/types';
import { useDeviceMode } from './hooks/useDeviceMode';
import { useOnlineMultiplayer } from './hooks/useOnlineMultiplayer';
import {
  loadAndSyncCloudProfile,
  saveCloudProfile,
  subscribeLeaderboard,
} from './lib/careerCloud';
import {
  User,
  auth,
  onAuthStateChanged,
  signInWithGoogle,
  signOutAccount,
} from './lib/firebase';

interface PendingMatchLaunch {
  config: MatchConfig;
  fixedMutatorId?: MutatorId;
}

const STAGE_CREST_MAP: Record<string, string> = {
  crimson_united: 'crimson_fang',
  royal_emerald: 'emerald_crest',
  obsidian_gold: 'obsidian_crown',
  cosmic_nebula: 'cyber_nova',
  sunset_coral: 'solar_flare',
  emerald_gold: 'emerald_crest',
  inferno_carbon: 'crimson_fang',
  cyber_volt: 'solar_flare',
  arctic_glacier: 'cyber_nova',
};

export default function App() {
  const deviceMode = useDeviceMode();

  const [config, setConfig] = useState<MatchConfig>({
    mode: 'career',
    difficulty: 'pro',
    twistMode: 'random',
    targetScore: 5,
  });

  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [muted, setMuted] = useState<boolean>(() => soundEngine.isMuted());
  const [profile, setProfile] = useState<CareerProfile>(() => loadCareerProfile());
  const [careerOutcome, setCareerOutcome] = useState<CareerMatchOutcome | null>(null);
  const [pendingMatch, setPendingMatch] = useState<PendingMatchLaunch | null>(null);
  const [onlineLobbyOpen, setOnlineLobbyOpen] = useState(false);
  const [celestialModalOpen, setCelestialModalOpen] = useState(false);
  const [onlineJoinCodeParam, setOnlineJoinCodeParam] = useState<string>('');
  const [onlineClubs, setOnlineClubs] = useState<{
    blueName: string;
    blueCrestId: string;
    redName: string;
    redCrestId: string;
  } | null>(null);
  const [onlineDisconnectReason, setOnlineDisconnectReason] = useState<string | null>(null);

  // Firebase Auth & Cloud Career state
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const profileRef = useRef<CareerProfile>(profile);
  profileRef.current = profile;

  const authUserRef = useRef<User | null>(authUser);
  authUserRef.current = authUser;

  const onlineMySideRef = useRef<TeamSide | null>(null);

  const cloudSyncTimerRef = useRef<number | null>(null);

  const persistProfile = useCallback((next: CareerProfile, immediateCloud = false) => {
    saveCareerProfile(next);
    const user = authUserRef.current;
    if (!user) return;

    if (cloudSyncTimerRef.current !== null) {
      window.clearTimeout(cloudSyncTimerRef.current);
      cloudSyncTimerRef.current = null;
    }

    const push = () => {
      setCloudSyncing(true);
      void saveCloudProfile(user, next)
        .catch((err) => {
          console.error('Cloud save error:', err);
        })
        .finally(() => {
          setCloudSyncing(false);
        });
    };

    if (immediateCloud) {
      push();
    } else {
      cloudSyncTimerRef.current = window.setTimeout(push, 450);
    }
  }, []);

  const updateProfile = useCallback(
    (updater: (prev: CareerProfile) => CareerProfile, immediateCloud = false) => {
      setProfile((prev) => {
        const next = updater(prev);
        if (next !== prev) {
          persistProfile(next, immediateCloud);
        }
        return next;
      });
    },
    [persistProfile]
  );

  // Listen to Firebase Auth state and sync cloud profile on sign-in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      authUserRef.current = user;

      if (!user) {
        setLeaderboard([]);
        setAuthReady(true);
        return;
      }

      setCloudSyncing(true);
      void loadAndSyncCloudProfile(user, profileRef.current)
        .then((synced) => {
          let wasNamedLocally = false;
          try {
            wasNamedLocally = localStorage.getItem('pitch_chaos_club_named_' + user.uid) === 'true';
          } catch {}
          const resolved: CareerProfile = {
            ...synced,
            hasCustomizedClubName: Boolean(synced.hasCustomizedClubName || wasNamedLocally),
          };
          if (resolved.hasCustomizedClubName) {
            try {
              localStorage.setItem('pitch_chaos_club_named_' + user.uid, 'true');
            } catch {}
          }
          setProfile(resolved);
          saveCareerProfile(resolved);
          setAuthError(null);
        })
        .catch((err) => {
          console.error('Cloud sync failed:', err);
          setAuthError('Cloud sync could not be verified. Local progress remains safe.');
        })
        .finally(() => {
          setCloudSyncing(false);
          setAuthReady(true);
        });
    });

    const fallbackTimer = window.setTimeout(() => setAuthReady(true), 1200);
    return () => {
      unsub();
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  // Subscribe to global leaderboard while signed in
  useEffect(() => {
    if (!authUser) {
      setLeaderboard([]);
      setLeaderboardLoading(false);
      return;
    }
    setLeaderboardLoading(true);
    const unsub = subscribeLeaderboard(
      (entries) => {
        setLeaderboard(entries);
        setLeaderboardLoading(false);
      },
      () => {
        setLeaderboardLoading(false);
      }
    );
    return () => unsub();
  }, [authUser]);

  const touchInputRef = useRef<TouchControlState>({
    blueJumpHeld: false,
    blueJumpPressed: false,
    blueLeftHeld: false,
    blueRightHeld: false,
    blueAbilityPressed: false,
    redJumpHeld: false,
    redJumpPressed: false,
    redLeftHeld: false,
    redRightHeld: false,
    redAbilityPressed: false,
  });

  const engine = useMemo(() => {
    return new SoccerEngine({
      onHudChange: (snapshot) => {
        setHud(snapshot);
      },
      onGoalScored: (_scorer, snapshot) => {
        setProfile((prev) => {
          const next: CareerProfile = {
            ...prev,
            totalGoals: prev.totalGoals + 1,
            fastestShotKmh: Math.max(prev.fastestShotKmh, snapshot.stats.fastestShotKmh),
          };
          saveCareerProfile(next);
          return next;
        });
      },
      onMatchEnd: (winner: TeamSide, snapshot) => {
        setPhase('GAME_OVER');
        const activeConfig = engineRef.current?.config;

        if (activeConfig?.mode === 'career' && activeConfig.cupId) {
          const cup = getCupById(activeConfig.cupId);
          const stageIdx = activeConfig.cupStageIndex ?? 0;
          const stage = cup.stages[stageIdx] ?? cup.stages[0];
          const isFinal = stageIdx >= cup.stages.length - 1;
          const cleanSheet = winner === 'blue' && snapshot.redScore === 0;

          if (winner === 'blue') {
            const stageCoins = 50 + (cleanSheet ? 25 : 0);
            const bonusCoins = isFinal ? cup.rewardCoins : 0;
            const totalCoins = stageCoins + bonusCoins;
            const xpEarned = 95 + (isFinal ? 160 : 0) + (cleanSheet ? 35 : 0);

            updateProfile((prev) => {
              const alreadyTrophy = prev.earnedTrophyIds.includes(cup.id);
              const nextTrophies =
                isFinal && !alreadyTrophy
                  ? [...prev.earnedTrophyIds, cup.id]
                  : prev.earnedTrophyIds;

              let nextKits = prev.unlockedKitIds;
              let unlockedKitName: string | undefined;
              if (isFinal && cup.unlockKitId && !prev.unlockedKitIds.includes(cup.unlockKitId)) {
                nextKits = [...prev.unlockedKitIds, cup.unlockKitId];
                unlockedKitName = getKitById(cup.unlockKitId).name;
              }

              let nextPlayers = prev.unlockedPlayerIds;
              let unlockedPlayerName: string | undefined;
              if (
                isFinal &&
                cup.unlockPlayerId &&
                !prev.unlockedPlayerIds.includes(cup.unlockPlayerId)
              ) {
                nextPlayers = [...prev.unlockedPlayerIds, cup.unlockPlayerId];
                unlockedPlayerName = getPlayerById(cup.unlockPlayerId).name;
              }

              const nextWinStreak = prev.winStreak + 1;
              const nextClubXp = prev.clubXp + xpEarned;

              setCareerOutcome({
                coinsEarned: totalCoins,
                xpEarned,
                cleanSheetBonus: cleanSheet,
                winStreak: nextWinStreak,
                clubXpAfter: nextClubXp,
                cupName: cup.name,
                stageName: stage.stageName,
                hasNextStage: !isFinal,
                isCupChampion: isFinal,
                trophyAwarded: isFinal && !alreadyTrophy,
                unlockedKitName,
                unlockedPlayerName,
              });

              return {
                ...prev,
                coins: prev.coins + totalCoins,
                clubXp: nextClubXp,
                winStreak: nextWinStreak,
                bestWinStreak: Math.max(prev.bestWinStreak, nextWinStreak),
                unlockedKitIds: nextKits,
                unlockedPlayerIds: nextPlayers,
                earnedTrophyIds: nextTrophies,
                activeCupId: isFinal ? null : cup.id,
                activeCupStage: isFinal ? 0 : stageIdx + 1,
                careerWins: prev.careerWins + 1,
                cleanSheets: prev.cleanSheets + (cleanSheet ? 1 : 0),
                fastestShotKmh: Math.max(prev.fastestShotKmh, snapshot.stats.fastestShotKmh),
              };
            }, true);
          } else {
            const xpEarned = 30;
            updateProfile((prev) => {
              const nextClubXp = prev.clubXp + xpEarned;
              setCareerOutcome({
                coinsEarned: 20,
                xpEarned,
                cleanSheetBonus: false,
                winStreak: 0,
                clubXpAfter: nextClubXp,
                cupName: cup.name,
                stageName: stage.stageName,
                hasNextStage: false,
                isCupChampion: false,
                trophyAwarded: false,
              });
              return {
                ...prev,
                coins: prev.coins + 20,
                clubXp: nextClubXp,
                winStreak: 0,
                activeCupId: null,
                activeCupStage: 0,
                careerLosses: prev.careerLosses + 1,
                fastestShotKmh: Math.max(prev.fastestShotKmh, snapshot.stats.fastestShotKmh),
              };
            }, true);
          }
          return;
        }

        if (activeConfig?.mode === '1P') {
          const cleanSheet = winner === 'blue' && snapshot.redScore === 0;
          const coinsEarned = winner === 'blue' ? 35 + (cleanSheet ? 20 : 0) : 10;
          const xpEarned = winner === 'blue' ? 65 + (cleanSheet ? 25 : 0) : 20;

          updateProfile((prev) => {
            const nextWinStreak = winner === 'blue' ? prev.winStreak + 1 : 0;
            const nextClubXp = prev.clubXp + xpEarned;
            setCareerOutcome({
              coinsEarned,
              xpEarned,
              cleanSheetBonus: cleanSheet,
              winStreak: nextWinStreak,
              clubXpAfter: nextClubXp,
              hasNextStage: false,
              isCupChampion: false,
              trophyAwarded: false,
            });
            return {
              ...prev,
              coins: prev.coins + coinsEarned,
              clubXp: nextClubXp,
              winStreak: nextWinStreak,
              bestWinStreak: Math.max(prev.bestWinStreak, nextWinStreak),
              careerWins: winner === 'blue' ? prev.careerWins + 1 : prev.careerWins,
              careerLosses: winner === 'red' ? prev.careerLosses + 1 : prev.careerLosses,
              cleanSheets: prev.cleanSheets + (cleanSheet ? 1 : 0),
              fastestShotKmh: Math.max(prev.fastestShotKmh, snapshot.stats.fastestShotKmh),
            };
          }, true);
          return;
        }

        if (activeConfig?.mode === 'online') {
          const mySide = onlineMySideRef.current ?? 'blue';
          const iWon = winner === mySide;
          const myScore = mySide === 'blue' ? snapshot.blueScore : snapshot.redScore;
          const oppScore = mySide === 'blue' ? snapshot.redScore : snapshot.blueScore;
          const cleanSheet = iWon && oppScore === 0;
          const coinsEarned = iWon ? 55 + (cleanSheet ? 20 : 0) : 20;
          const xpEarned = iWon ? 100 + (cleanSheet ? 30 : 0) : 35;

          updateProfile((prev) => {
            const nextWinStreak = iWon ? prev.winStreak + 1 : 0;
            const nextClubXp = prev.clubXp + xpEarned;
            setCareerOutcome({
              coinsEarned,
              xpEarned,
              cleanSheetBonus: cleanSheet,
              winStreak: nextWinStreak,
              clubXpAfter: nextClubXp,
              hasNextStage: false,
              isCupChampion: false,
              trophyAwarded: false,
            });
            return {
              ...prev,
              coins: prev.coins + coinsEarned,
              clubXp: nextClubXp,
              winStreak: nextWinStreak,
              bestWinStreak: Math.max(prev.bestWinStreak, nextWinStreak),
              careerWins: iWon ? prev.careerWins + 1 : prev.careerWins,
              careerLosses: !iWon ? prev.careerLosses + 1 : prev.careerLosses,
              cleanSheets: prev.cleanSheets + (cleanSheet ? 1 : 0),
              fastestShotKmh: Math.max(
                prev.fastestShotKmh,
                myScore >= 0 ? snapshot.stats.fastestShotKmh : 0
              ),
            };
          }, true);
          return;
        }

        setCareerOutcome(null);
        updateProfile((prev) => ({
          ...prev,
          blue2PWins: winner === 'blue' ? prev.blue2PWins + 1 : prev.blue2PWins,
          red2PWins: winner === 'red' ? prev.red2PWins + 1 : prev.red2PWins,
          fastestShotKmh: Math.max(prev.fastestShotKmh, snapshot.stats.fastestShotKmh),
        }), true);
      },
    });
  }, [updateProfile]);

  const engineRef = useRef<SoccerEngine>(engine);
  engineRef.current = engine;

  const [hud, setHud] = useState<HudSnapshot>(() => engine.getHudSnapshot());

  const clubPayload = useMemo<ClientClubPayload>(
    () => ({
      clubName: profile.clubName,
      crestId: profile.crestId,
      kitId: profile.selectedKitId,
      strikerId: profile.selectedStrikerId,
      keeperId: profile.selectedKeeperId,
      powerupRole: profile.selectedPowerupRole,
      upgrades: profile.playerUpgrades,
    }),
    [profile]
  );

  const handleOnlineMatchStart = useCallback(
    (setup: OnlineMatchSetup) => {
      soundEngine.unlock();
      soundEngine.playWhistle('kickoff');
      onlineMySideRef.current = setup.mySide;
      setOnlineDisconnectReason(null);
      setOnlineLobbyOpen(false);
      setCareerOutcome(null);

      const blueUpgrades = setup.blueClub.upgrades ?? {};
      const redUpgrades = setup.redClub.upgrades ?? {};
      const matchCfg: MatchConfig = {
        mode: 'online',
        difficulty: 'pro',
        twistMode: setup.twistMode,
        targetScore: setup.targetScore,
        blueKit: getKitById(setup.blueClub.kitId),
        redKit: getKitById(setup.resolvedRedKitId),
        blueLineup: {
          keeper: applyPlayerUpgrades(getPlayerById(setup.blueClub.keeperId), blueUpgrades),
          striker: applyPlayerUpgrades(getPlayerById(setup.blueClub.strikerId), blueUpgrades),
        },
        redLineup: {
          keeper: applyPlayerUpgrades(getPlayerById(setup.redClub.keeperId), redUpgrades),
          striker: applyPlayerUpgrades(getPlayerById(setup.redClub.strikerId), redUpgrades),
        },
        bluePowerupRole: setup.blueClub.powerupRole,
        redPowerupRole: setup.redClub.powerupRole,
        onlineMySide: setup.mySide,
        opponentName: setup.redClub.clubName,
        opponentCrestId: setup.redClub.crestId,
      };

      setOnlineClubs({
        blueName: setup.blueClub.clubName,
        blueCrestId: setup.blueClub.crestId,
        redName: setup.redClub.clubName,
        redCrestId: setup.redClub.crestId,
      });

      // Pre-initialize engine with both online clubs so incoming server snapshots reconcile immediately
      engine.startNewMatch(
        matchCfg,
        setup.twistMode === 'classic' ? MUTATORS.classic_turf : undefined
      );
      setConfig(matchCfg);
      setPendingMatch({
        config: matchCfg,
        fixedMutatorId: setup.twistMode === 'classic' ? 'classic_turf' : undefined,
      });
      setHud(engine.getHudSnapshot());
    },
    [engine]
  );

  const online = useOnlineMultiplayer({
    onMatchStart: handleOnlineMatchStart,
    onSnapshot: (snap) => {
      engine.applyOnlineSnapshot(snap);
    },
    onOpponentLeft: (reason) => {
      setPendingMatch(null);
      setOnlineDisconnectReason(reason);
      if (engine.phase === 'PLAYING' || engine.phase === 'GOAL_CELEBRATION' || engine.phase === 'PAUSED') {
        const mySide = onlineMySideRef.current ?? 'blue';
        engine.winner = mySide;
        engine.setPhase('GAME_OVER');
        setPhase('GAME_OVER');
        setHud(engine.getHudSnapshot());
      } else {
        setOnlineLobbyOpen(true);
      }
    },
  });

  // Auto-open Global Lobby if opened via ?room=CODE invite URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && roomParam.trim().length >= 4) {
      const clean = roomParam.trim().toUpperCase().slice(0, 6);
      setOnlineJoinCodeParam(clean);
      setConfig((prev) => ({ ...prev, mode: 'online' }));
      setOnlineLobbyOpen(true);
      online.connect(clubPayload);
    }
    // Run once on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPhase(engine.phase);
  }, [hud, engine]);

  const launchMatchWithTunnel = useCallback(
    (matchCfg: MatchConfig, fixedMutatorId?: MutatorId) => {
      setConfig(matchCfg);
      setCareerOutcome(null);
      setPendingMatch({ config: matchCfg, fixedMutatorId });
    },
    []
  );

  const finalizeMatchStart = useCallback(() => {
    setPendingMatch((current) => {
      if (!current) return null;
      if (current.config.mode !== 'online') {
        const fixedMutator = current.fixedMutatorId
          ? MUTATORS[current.fixedMutatorId]
          : undefined;
        engine.startNewMatch(current.config, fixedMutator);
      }
      setPhase('PLAYING');
      setHud(engine.getHudSnapshot());
      return null;
    });
  }, [engine]);

  const startCupStage = useCallback(
    (cupId: string, stageIndex: number) => {
      soundEngine.unlock();
      soundEngine.playClick();
      const cup = getCupById(cupId);
      const clampedIdx = Math.max(0, Math.min(stageIndex, cup.stages.length - 1));
      const stage = cup.stages[clampedIdx];
      const curProfile = profileRef.current;

      updateProfile(
        (prev) => ({
          ...prev,
          activeCupId: cup.id,
          activeCupStage: clampedIdx,
        }),
        false
      );

      const oppCrest =
        STAGE_CREST_MAP[stage.opponentKitId] ??
        CRESTS_CATALOG[clampedIdx % CRESTS_CATALOG.length].id;

      const matchCfg: MatchConfig = {
        mode: 'career',
        difficulty: stage.difficulty,
        twistMode: stage.mutatorId ? 'classic' : 'random',
        targetScore: stage.targetScore,
        cupId: cup.id,
        cupStageIndex: clampedIdx,
        blueKit: getKitById(curProfile.selectedKitId),
        blueLineup: {
          keeper: applyPlayerUpgrades(
            getPlayerById(curProfile.selectedKeeperId),
            curProfile.playerUpgrades
          ),
          striker: applyPlayerUpgrades(
            getPlayerById(curProfile.selectedStrikerId),
            curProfile.playerUpgrades
          ),
        },
        bluePowerupRole: curProfile.selectedPowerupRole,
        redKit: getKitById(stage.opponentKitId),
        redLineup: {
          keeper: getPlayerById(stage.opponentKeeperId),
          striker: getPlayerById(stage.opponentStrikerId),
        },
        opponentName: stage.opponentName,
        opponentCrestId: oppCrest,
      };

      launchMatchWithTunnel(matchCfg, stage.mutatorId);
    },
    [launchMatchWithTunnel, updateProfile]
  );

  const handleOpenOnlineLobby = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();
    setCareerOutcome(null);
    setPendingMatch(null);
    setOnlineDisconnectReason(null);
    if (engine.phase !== 'TITLE_MENU') {
      online.leaveRoom();
      engine.returnToTitle();
      setPhase('TITLE_MENU');
    }
    setConfig((prev) => ({ ...prev, mode: 'online' }));
    setOnlineLobbyOpen(true);
    online.connect(clubPayload);
  }, [clubPayload, engine, online]);

  const handleStartQuickMatch = useCallback(() => {
    if (config.mode === 'online') {
      handleOpenOnlineLobby();
      return;
    }
    soundEngine.unlock();
    soundEngine.playClick();
    const curProfile = profileRef.current;

    const matchCfg: MatchConfig =
      config.mode === '2P'
        ? {
            mode: '2P',
            difficulty: config.difficulty,
            twistMode: config.twistMode,
            targetScore: config.targetScore,
            opponentCrestId: 'crimson_fang',
          }
        : {
            mode: '1P',
            difficulty: config.difficulty,
            twistMode: config.twistMode,
            targetScore: config.targetScore,
            blueKit: getKitById(curProfile.selectedKitId),
            blueLineup: {
              keeper: applyPlayerUpgrades(
                getPlayerById(curProfile.selectedKeeperId),
                curProfile.playerUpgrades
              ),
              striker: applyPlayerUpgrades(
                getPlayerById(curProfile.selectedStrikerId),
                curProfile.playerUpgrades
              ),
            },
            bluePowerupRole: curProfile.selectedPowerupRole,
            opponentCrestId: 'crimson_fang',
          };

    launchMatchWithTunnel(matchCfg);
  }, [config, handleOpenOnlineLobby, launchMatchWithTunnel]);

  const handleOpenCareerHub = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();
    online.leaveRoom();
    online.leaveQueue();
    setOnlineLobbyOpen(false);
    setCareerOutcome(null);
    setPendingMatch(null);
    engine.setPhase('CAREER_HUB');
    setPhase('CAREER_HUB');
  }, [engine, online]);

  const handlePause = useCallback(() => {
    if (engine.phase === 'PLAYING' || engine.phase === 'GOAL_CELEBRATION') {
      soundEngine.playClick();
      engine.setPhase('PAUSED');
      setPhase('PAUSED');
    } else if (engine.phase === 'PAUSED') {
      soundEngine.playClick();
      engine.setPhase('PLAYING');
      setPhase('PLAYING');
    }
  }, [engine]);

  const handleResume = useCallback(() => {
    soundEngine.playClick();
    engine.setPhase('PLAYING');
    setPhase('PLAYING');
  }, [engine]);

  const handleRestart = useCallback(() => {
    soundEngine.unlock();
    soundEngine.playClick();
    setCareerOutcome(null);
    if (config.mode === 'career' && config.cupId) {
      startCupStage(config.cupId, config.cupStageIndex ?? 0);
      return;
    }
    handleStartQuickMatch();
  }, [config, handleStartQuickMatch, startCupStage]);

  const handleNextCupStage = useCallback(() => {
    const cupId = config.cupId ?? profileRef.current.activeCupId;
    if (!cupId) {
      handleOpenCareerHub();
      return;
    }
    const nextIdx = (config.cupStageIndex ?? 0) + 1;
    startCupStage(cupId, nextIdx);
  }, [config.cupId, config.cupStageIndex, handleOpenCareerHub, startCupStage]);

  const handleMainMenu = useCallback(() => {
    soundEngine.playClick();
    online.leaveRoom();
    online.leaveQueue();
    onlineMySideRef.current = null;
    setOnlineLobbyOpen(false);
    setOnlineClubs(null);
    setOnlineDisconnectReason(null);
    setCareerOutcome(null);
    setPendingMatch(null);
    engine.returnToTitle();
    setPhase('TITLE_MENU');
    setHud(engine.getHudSnapshot());
  }, [engine, online]);

  const handleToggleMute = useCallback(() => {
    soundEngine.unlock();
    const nextMuted = soundEngine.toggleMute();
    setMuted(nextMuted);
  }, []);

  const handleSignIn = useCallback(async () => {
    soundEngine.unlock();
    soundEngine.playClick();
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Sign in failed:', err);
      setAuthError('Google sign-in was cancelled or blocked. Try again anytime.');
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    soundEngine.playClick();
    setAuthBusy(true);
    try {
      const user = authUserRef.current;
      if (user) {
        if (cloudSyncTimerRef.current !== null) {
          window.clearTimeout(cloudSyncTimerRef.current);
          cloudSyncTimerRef.current = null;
        }
        await saveCloudProfile(user, profileRef.current).catch((err) => {
          console.warn('Pre-signout save notice:', err);
        });
      }
      await signOutAccount();
      const fresh = { ...DEFAULT_PROFILE };
      setProfile(fresh);
      saveCareerProfile(fresh);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const handleUnlockPlayer = useCallback(
    (player: PlayerProfile) => {
      soundEngine.unlock();
      soundEngine.playPowerup();
      updateProfile((prev) => {
        if (prev.unlockedPlayerIds.includes(player.id) || prev.coins < player.cost) {
          return prev;
        }
        return {
          ...prev,
          coins: prev.coins - player.cost,
          unlockedPlayerIds: [...prev.unlockedPlayerIds, player.id],
          selectedStrikerId: player.role === 'striker' ? player.id : prev.selectedStrikerId,
          selectedKeeperId: player.role === 'keeper' ? player.id : prev.selectedKeeperId,
          selectedPowerupRole: player.role,
        };
      }, true);
    },
    [updateProfile]
  );

  const handleEquipPlayer = useCallback(
    (player: PlayerProfile) => {
      soundEngine.unlock();
      soundEngine.playClick();
      updateProfile((prev) => {
        if (!prev.unlockedPlayerIds.includes(player.id)) return prev;
        return {
          ...prev,
          selectedStrikerId: player.role === 'striker' ? player.id : prev.selectedStrikerId,
          selectedKeeperId: player.role === 'keeper' ? player.id : prev.selectedKeeperId,
          selectedPowerupRole: player.role,
        };
      });
    },
    [updateProfile]
  );

  const handleUpgradePlayerStat = useCallback(
    (playerId: string, stat: 'speed' | 'jump' | 'kick') => {
      soundEngine.unlock();
      soundEngine.playPowerup();
      updateProfile((prev) => {
        if (!prev.unlockedPlayerIds.includes(playerId)) return prev;
        const currentUp = prev.playerUpgrades[playerId] ?? { speed: 0, jump: 0, kick: 0 };
        const lvl = currentUp[stat];
        if (lvl >= 5) return prev;
        const cost = 60 + lvl * 45;
        if (prev.coins < cost) return prev;
        return {
          ...prev,
          coins: prev.coins - cost,
          playerUpgrades: {
            ...prev.playerUpgrades,
            [playerId]: {
              ...currentUp,
              [stat]: lvl + 1,
            },
          },
        };
      }, true);
    },
    [updateProfile]
  );

  const handleSetPowerupRole = useCallback(
    (role: 'striker' | 'keeper') => {
      soundEngine.unlock();
      soundEngine.playClick();
      updateProfile((prev) => ({
        ...prev,
        selectedPowerupRole: role,
      }));
    },
    [updateProfile]
  );

  const handleUnlockKit = useCallback(
    (kit: KitSpec) => {
      soundEngine.unlock();
      soundEngine.playPowerup();
      updateProfile((prev) => {
        if (prev.unlockedKitIds.includes(kit.id) || prev.coins < kit.cost) {
          return prev;
        }
        return {
          ...prev,
          coins: prev.coins - kit.cost,
          unlockedKitIds: [...prev.unlockedKitIds, kit.id],
          selectedKitId: kit.id,
        };
      }, true);
    },
    [updateProfile]
  );

  const handleEquipKit = useCallback(
    (kitId: string) => {
      soundEngine.unlock();
      soundEngine.playClick();
      updateProfile((prev) => {
        if (!prev.unlockedKitIds.includes(kitId)) return prev;
        return {
          ...prev,
          selectedKitId: kitId,
        };
      });
    },
    [updateProfile]
  );

  const handleUpdateClubIdentity = useCallback(
    (clubName: string, crestId: string) => {
      soundEngine.unlock();
      soundEngine.playClick();
      updateProfile(
        (prev) => ({
          ...prev,
          clubName: prev.hasCustomizedClubName ? prev.clubName : (clubName.trim().slice(0, 36) || prev.clubName),
          crestId,
        }),
        true
      );
    },
    [updateProfile]
  );

  const handleClaimAchievement = useCallback(
    (ach: AchievementSpec) => {
      soundEngine.unlock();
      soundEngine.playPowerup();
      updateProfile((prev) => {
        if (prev.claimedAchievementIds.includes(ach.id)) return prev;
        if (getAchievementCurrentValue(ach, prev) < ach.target) return prev;
        return {
          ...prev,
          coins: prev.coins + ach.rewardCoins,
          clubXp: prev.clubXp + ach.rewardXp,
          claimedAchievementIds: [...prev.claimedAchievementIds, ach.id],
        };
      }, true);
    },
    [updateProfile]
  );

  const handleTouchControl = useCallback(
    (team: 'blue' | 'red', action: TouchAction, active: boolean) => {
      soundEngine.unlock();
      const t = touchInputRef.current;
      if (team === 'blue') {
        if (action === 'kick') {
          if (active && !t.blueJumpHeld) t.blueJumpPressed = true;
          t.blueJumpHeld = active;
        } else if (action === 'ability') {
          if (active) t.blueAbilityPressed = true;
        } else if (action === 'left') {
          t.blueLeftHeld = active;
        } else {
          t.blueRightHeld = active;
        }
      } else {
        if (action === 'kick') {
          if (active && !t.redJumpHeld) t.redJumpPressed = true;
          t.redJumpHeld = active;
        } else if (action === 'ability') {
          if (active) t.redAbilityPressed = true;
        } else if (action === 'left') {
          t.redLeftHeld = active;
        } else {
          t.redRightHeld = active;
        }
      }
    },
    []
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'KeyM') {
        handleToggleMute();
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (
          engine.phase === 'PLAYING' ||
          engine.phase === 'GOAL_CELEBRATION' ||
          engine.phase === 'PAUSED'
        ) {
          e.preventDefault();
          handlePause();
        }
        return;
      }

      if (e.code === 'Enter' || e.code === 'Space') {
        if (pendingMatch) {
          e.preventDefault();
          finalizeMatchStart();
          return;
        }
        if (engine.phase === 'TITLE_MENU' && !onlineLobbyOpen) {
          if (document.activeElement?.tagName !== 'BUTTON') {
            e.preventDefault();
            if (config.mode === 'career') {
              handleOpenCareerHub();
            } else {
              handleStartQuickMatch();
            }
          }
        } else if (engine.phase === 'GAME_OVER') {
          if (document.activeElement?.tagName !== 'BUTTON') {
            e.preventDefault();
            if (config.mode === 'online') {
              online.requestRematch();
            } else if (config.mode === 'career') {
              if (careerOutcome?.hasNextStage) {
                handleNextCupStage();
              } else {
                handleOpenCareerHub();
              }
            } else {
              handleRestart();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    careerOutcome?.hasNextStage,
    config.mode,
    engine,
    finalizeMatchStart,
    handleNextCupStage,
    handleOpenCareerHub,
    handlePause,
    handleRestart,
    handleStartQuickMatch,
    handleToggleMute,
    online,
    onlineLobbyOpen,
    pendingMatch,
  ]);

  const showMatchCanvas =
    phase !== 'TITLE_MENU' &&
    phase !== 'CAREER_HUB' &&
    pendingMatch === null &&
    !onlineLobbyOpen;
  const blueClubLabel =
    config.mode === 'online' && onlineClubs
      ? onlineClubs.blueName
      : config.mode === '2P'
        ? 'BLUE'
        : profile.clubName;
  const blueCrestId =
    config.mode === 'online' && onlineClubs ? onlineClubs.blueCrestId : profile.crestId;
  const redCrestId =
    config.mode === 'online' && onlineClubs
      ? onlineClubs.redCrestId
      : config.opponentCrestId ?? 'crimson_fang';

  if (!authReady) {
    return (
      <main className="relative w-full h-dvh overflow-hidden bg-[radial-gradient(ellipse_at_top,rgba(14,165,233,0.28),transparent_55%),linear-gradient(to_bottom,#020617,#071326,#022c22)] flex flex-col items-center justify-center p-6 text-slate-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col items-center text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.3, repeat: Infinity, ease: 'linear' }}
            className="w-20 h-20 rounded-full border-4 border-amber-400 bg-slate-950 flex items-center justify-center shadow-[0_0_32px_rgba(251,191,36,0.4)]"
          >
            <svg viewBox="0 0 40 40" className="w-12 h-12" aria-hidden="true">
              <circle cx="20" cy="20" r="17" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.2" />
              <polygon points="20,12 26,17 24,25 16,25 14,17" fill="#0f172a" />
              <path
                d="M20 3 V12 M34 15 L26 17 M29 33 L24 25 M11 33 L16 25 M6 15 L14 17"
                stroke="#0f172a"
                strokeWidth="2"
              />
            </svg>
          </motion.div>
          <div className="mt-5 font-display font-extrabold italic text-4xl tracking-wide text-white drop-shadow-[0_3px_0_rgba(2,6,23,0.95)]">
            PITCH <span className="text-amber-400">CHAOS</span>
          </div>
          <p className="mt-1.5 text-xs font-extrabold uppercase tracking-widest text-sky-300">
            Entering Stadium &amp; Club Locker…
          </p>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="relative w-full h-dvh overflow-hidden bg-slate-950">
      {showMatchCanvas && (
        <GameCanvas
          engine={engine}
          touchInputRef={touchInputRef}
          onOnlineInput={online.sendInput}
        />
      )}

      {pendingMatch && (
        <MatchLoadingScreen
          config={pendingMatch.config}
          profile={profile}
          fixedMutatorId={pendingMatch.fixedMutatorId}
          blueTeamLabel={onlineClubs?.blueName}
          blueTeamCrestId={onlineClubs?.blueCrestId}
          onReady={finalizeMatchStart}
        />
      )}

      {onlineLobbyOpen && !pendingMatch && (
        <OnlineLobbyModal
          profile={profile}
          clubPayload={clubPayload}
          connected={online.connected}
          connecting={online.connecting}
          status={online.status}
          onlineCount={online.onlineCount}
          queuedCount={online.queuedCount}
          openRooms={online.openRooms}
          roomCode={online.roomCode}
          pingMs={online.pingMs}
          error={online.error}
          initialJoinCode={onlineJoinCodeParam}
          twistMode={config.twistMode}
          targetScore={config.targetScore}
          onChangeTwist={(twistMode) => setConfig((prev) => ({ ...prev, twistMode }))}
          onChangeTarget={(targetScore) => setConfig((prev) => ({ ...prev, targetScore }))}
          onJoinQueue={() => online.joinQueue(clubPayload, config.twistMode, config.targetScore)}
          onLeaveQueue={online.leaveQueue}
          onCreateRoom={(isPublic) =>
            online.createRoom(clubPayload, config.twistMode, config.targetScore, isPublic)
          }
          onJoinRoom={(code) => online.joinRoom(clubPayload, code)}
          onLeaveRoom={online.leaveRoom}
          onBack={handleMainMenu}
        />
      )}

      {celestialModalOpen && !pendingMatch && (
        <CelestialGamemodeModal
          profile={profile}
          config={config}
          onClose={() => setCelestialModalOpen(false)}
          onLaunch1P={(diff) => {
            setCelestialModalOpen(false);
            setConfig((prev) => ({
              ...prev,
              mode: '1P',
              difficulty: diff,
              twistMode: 'celestial',
            }));
            const curProfile = profileRef.current;
            const matchCfg: MatchConfig = {
              mode: '1P',
              difficulty: diff,
              twistMode: 'celestial',
              targetScore: config.targetScore,
              blueKit: getKitById(curProfile.selectedKitId),
              blueLineup: {
                keeper: applyPlayerUpgrades(
                  getPlayerById(curProfile.selectedKeeperId),
                  curProfile.playerUpgrades
                ),
                striker: applyPlayerUpgrades(
                  getPlayerById(curProfile.selectedStrikerId),
                  curProfile.playerUpgrades
                ),
              },
              bluePowerupRole: curProfile.selectedPowerupRole,
              redKit: getKitById('sunset_coral'),
              redLineup: {
                keeper: getPlayerById('elena_shield'),
                striker: getPlayerById('diego_sky'),
              },
              opponentName: `Lunar CPU (${diff.toUpperCase()})`,
              opponentCrestId: 'solar_flare',
            };
            launchMatchWithTunnel(matchCfg, MUTATORS.lunar_dome.id);
          }}
          onLaunchOnline={() => {
            setCelestialModalOpen(false);
            setConfig((prev) => ({ ...prev, mode: 'online', twistMode: 'celestial' }));
            setOnlineLobbyOpen(true);
            online.connect(clubPayload);
          }}
        />
      )}

      {authUser !== null &&
        !profile.hasCustomizedClubName &&
        (() => {
          try {
            return localStorage.getItem('pitch_chaos_club_named_' + authUser.uid) !== 'true';
          } catch {
            return true;
          }
        })() &&
        !pendingMatch &&
        !onlineLobbyOpen &&
        !celestialModalOpen && (
          <ClubNamePromptModal
            profile={profile}
            onSaveClubName={(name, newCrestId) => {
              if (authUser) {
                try {
                  localStorage.setItem('pitch_chaos_club_named_' + authUser.uid, 'true');
                } catch {}
              }
              updateProfile(
                (prev) => ({
                  ...prev,
                  clubName: name,
                  crestId: newCrestId,
                  hasCustomizedClubName: true,
                }),
                true
              );
            }}
          />
        )}

      {phase === 'TITLE_MENU' && !pendingMatch && !onlineLobbyOpen && !celestialModalOpen && (
        <TitleOverlay
          config={config}
          profile={profile}
          deviceMode={deviceMode}
          muted={muted}
          authUser={authUser}
          authBusy={authBusy}
          cloudSyncing={cloudSyncing}
          authError={authError}
          onChangeConfig={setConfig}
          onStart={handleStartQuickMatch}
          onOpenCareerHub={handleOpenCareerHub}
          onOpenOnlineLobby={() => setOnlineLobbyOpen(true)}
          onOpenCelestialModal={() => setCelestialModalOpen(true)}
          onToggleMute={handleToggleMute}
          onSignIn={() => void handleSignIn()}
          onSignOut={() => void handleSignOut()}
        />
      )}

      {phase === 'CAREER_HUB' && !pendingMatch && !onlineLobbyOpen && (
        <CareerHub
          profile={profile}
          authUser={authUser}
          authBusy={authBusy}
          cloudSyncing={cloudSyncing}
          leaderboard={leaderboard}
          leaderboardLoading={leaderboardLoading}
          onBack={handleMainMenu}
          onStartCupStage={startCupStage}
          onUnlockPlayer={handleUnlockPlayer}
          onEquipPlayer={handleEquipPlayer}
          onUpgradePlayerStat={handleUpgradePlayerStat}
          onSetPowerupRole={handleSetPowerupRole}
          onUnlockKit={handleUnlockKit}
          onEquipKit={handleEquipKit}
          onUpdateClubIdentity={handleUpdateClubIdentity}
          onClaimAchievement={handleClaimAchievement}
          onSignIn={() => void handleSignIn()}
          onSignOut={() => void handleSignOut()}
        />
      )}

      {!pendingMatch && !onlineLobbyOpen && (phase === 'PLAYING' || phase === 'GOAL_CELEBRATION') && (
        <GameHud
          phase={phase}
          mode={config.mode}
          deviceMode={deviceMode}
          targetScore={config.targetScore}
          hud={hud}
          muted={muted}
          blueCrestId={blueCrestId}
          blueClubLabel={blueClubLabel}
          redCrestId={redCrestId}
          onlineMySide={online.mySide}
          pingMs={online.pingMs}
          onPause={handlePause}
          onToggleMute={handleToggleMute}
          onTouchControl={handleTouchControl}
        />
      )}

      {!pendingMatch && !onlineLobbyOpen && (
        <ModalOverlays
          phase={phase}
          mode={config.mode}
          deviceMode={deviceMode}
          hud={hud}
          blueCrestId={blueCrestId}
          blueClubLabel={blueClubLabel}
          redCrestId={redCrestId}
          careerOutcome={careerOutcome}
          onlineMySide={online.mySide}
          onlineRematchStatus={online.rematchStatus}
          onlineDisconnectReason={onlineDisconnectReason}
          onResume={handleResume}
          onRestart={handleRestart}
          onNextCupStage={handleNextCupStage}
          onOpenCareerHub={handleOpenCareerHub}
          onOnlineRematch={online.requestRematch}
          onOpenOnlineLobby={handleOpenOnlineLobby}
          onMainMenu={handleMainMenu}
        />
      )}
    </main>
  );
}
