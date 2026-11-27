import { CareerProfile, PlayerUpgradeMap } from './types';

const STORAGE_KEY = 'pitch_chaos_career_profile_v1';

export const DEFAULT_PROFILE: CareerProfile = {
  clubName: 'Pitch Chaos FC',
  crestId: 'phoenix_gold',
  hasCustomizedClubName: false,
  coins: 150,
  clubXp: 0,
  winStreak: 0,
  bestWinStreak: 0,
  unlockedPlayerIds: ['leo_spark', 'sam_wall'],
  unlockedKitIds: ['azure_club', 'crimson_united'],
  selectedStrikerId: 'leo_spark',
  selectedKeeperId: 'sam_wall',
  selectedKitId: 'azure_club',
  selectedPowerupRole: 'striker',
  earnedTrophyIds: [],
  claimedAchievementIds: [],
  playerUpgrades: {},
  activeCupId: null,
  activeCupStage: 0,
  careerWins: 0,
  careerLosses: 0,
  cleanSheets: 0,
  totalGoals: 0,
  blue2PWins: 0,
  red2PWins: 0,
  fastestShotKmh: 0,
};

function sanitizeUpgrades(raw: unknown): PlayerUpgradeMap {
  if (!raw || typeof raw !== 'object') return {};
  const result: PlayerUpgradeMap = {};
  const entries = Object.entries(raw as Record<string, unknown>).slice(0, 24);
  for (const [id, val] of entries) {
    if (val && typeof val === 'object') {
      const obj = val as Record<string, unknown>;
      result[id] = {
        speed: typeof obj.speed === 'number' ? Math.max(0, Math.min(5, Math.floor(obj.speed))) : 0,
        jump: typeof obj.jump === 'number' ? Math.max(0, Math.min(5, Math.floor(obj.jump))) : 0,
        kick: typeof obj.kick === 'number' ? Math.max(0, Math.min(5, Math.floor(obj.kick))) : 0,
      };
    }
  }
  return result;
}

export function normalizeCareerProfile(parsed: Partial<CareerProfile>): CareerProfile {
  return {
    clubName:
      typeof parsed.clubName === 'string' && parsed.clubName.trim().length > 0
        ? parsed.clubName.trim().slice(0, 36)
        : DEFAULT_PROFILE.clubName,
    crestId:
      typeof parsed.crestId === 'string' && parsed.crestId.length > 0
        ? parsed.crestId
        : DEFAULT_PROFILE.crestId,
    hasCustomizedClubName: Boolean(parsed.hasCustomizedClubName),
    lastClaimedWeeklySeasonId:
      typeof parsed.lastClaimedWeeklySeasonId === 'string'
        ? parsed.lastClaimedWeeklySeasonId
        : undefined,
    coins: typeof parsed.coins === 'number' && parsed.coins >= 0 ? parsed.coins : DEFAULT_PROFILE.coins,
    clubXp: typeof parsed.clubXp === 'number' && parsed.clubXp >= 0 ? parsed.clubXp : 0,
    winStreak: typeof parsed.winStreak === 'number' && parsed.winStreak >= 0 ? parsed.winStreak : 0,
    bestWinStreak:
      typeof parsed.bestWinStreak === 'number' && parsed.bestWinStreak >= 0
        ? parsed.bestWinStreak
        : 0,
    unlockedPlayerIds: Array.isArray(parsed.unlockedPlayerIds)
      ? parsed.unlockedPlayerIds.slice(0, 30)
      : [...DEFAULT_PROFILE.unlockedPlayerIds],
    unlockedKitIds: Array.isArray(parsed.unlockedKitIds)
      ? parsed.unlockedKitIds.slice(0, 30)
      : [...DEFAULT_PROFILE.unlockedKitIds],
    selectedStrikerId:
      typeof parsed.selectedStrikerId === 'string'
        ? parsed.selectedStrikerId
        : DEFAULT_PROFILE.selectedStrikerId,
    selectedKeeperId:
      typeof parsed.selectedKeeperId === 'string'
        ? parsed.selectedKeeperId
        : DEFAULT_PROFILE.selectedKeeperId,
    selectedKitId:
      typeof parsed.selectedKitId === 'string'
        ? parsed.selectedKitId
        : DEFAULT_PROFILE.selectedKitId,
    selectedPowerupRole: parsed.selectedPowerupRole === 'keeper' ? 'keeper' : 'striker',
    earnedTrophyIds: Array.isArray(parsed.earnedTrophyIds)
      ? parsed.earnedTrophyIds.slice(0, 20)
      : [],
    claimedAchievementIds: Array.isArray(parsed.claimedAchievementIds)
      ? parsed.claimedAchievementIds.slice(0, 30)
      : [],
    playerUpgrades: sanitizeUpgrades(parsed.playerUpgrades),
    activeCupId: typeof parsed.activeCupId === 'string' ? parsed.activeCupId : null,
    activeCupStage:
      typeof parsed.activeCupStage === 'number' && parsed.activeCupStage >= 0
        ? parsed.activeCupStage
        : 0,
    careerWins: typeof parsed.careerWins === 'number' && parsed.careerWins >= 0 ? parsed.careerWins : 0,
    careerLosses:
      typeof parsed.careerLosses === 'number' && parsed.careerLosses >= 0 ? parsed.careerLosses : 0,
    cleanSheets:
      typeof parsed.cleanSheets === 'number' && parsed.cleanSheets >= 0 ? parsed.cleanSheets : 0,
    totalGoals: typeof parsed.totalGoals === 'number' && parsed.totalGoals >= 0 ? parsed.totalGoals : 0,
    blue2PWins: typeof parsed.blue2PWins === 'number' && parsed.blue2PWins >= 0 ? parsed.blue2PWins : 0,
    red2PWins: typeof parsed.red2PWins === 'number' && parsed.red2PWins >= 0 ? parsed.red2PWins : 0,
    fastestShotKmh:
      typeof parsed.fastestShotKmh === 'number' && parsed.fastestShotKmh >= 0
        ? parsed.fastestShotKmh
        : 0,
  };
}

export function isStarterProfile(p: CareerProfile): boolean {
  return (
    !p.hasCustomizedClubName &&
    p.clubXp === 0 &&
    p.careerWins === 0 &&
    p.careerLosses === 0 &&
    p.totalGoals === 0 &&
    p.earnedTrophyIds.length === 0 &&
    p.claimedAchievementIds.length === 0 &&
    Object.keys(p.playerUpgrades).length === 0
  );
}

export function mergeCareerProfiles(local: CareerProfile, cloud: CareerProfile): CareerProfile {
  const mergedUpgrades: PlayerUpgradeMap = { ...cloud.playerUpgrades };
  for (const [id, up] of Object.entries(local.playerUpgrades)) {
    const existing = mergedUpgrades[id];
    mergedUpgrades[id] = existing
      ? {
          speed: Math.max(existing.speed, up.speed),
          jump: Math.max(existing.jump, up.jump),
          kick: Math.max(existing.kick, up.kick),
        }
      : up;
  }

  const isCustomized = Boolean(cloud.hasCustomizedClubName || local.hasCustomizedClubName);
  const resolvedClubName = cloud.hasCustomizedClubName
    ? cloud.clubName
    : local.hasCustomizedClubName
      ? local.clubName
      : (cloud.clubName || local.clubName);
  const resolvedCrestId = cloud.hasCustomizedClubName
    ? cloud.crestId
    : local.hasCustomizedClubName
      ? local.crestId
      : (cloud.crestId || local.crestId);

  return normalizeCareerProfile({
    ...cloud,
    hasCustomizedClubName: isCustomized,
    clubName: resolvedClubName,
    crestId: resolvedCrestId,
    coins: Math.max(cloud.coins, local.coins),
    clubXp: Math.max(cloud.clubXp, local.clubXp),
    winStreak: Math.max(cloud.winStreak, local.winStreak),
    bestWinStreak: Math.max(cloud.bestWinStreak, local.bestWinStreak),
    unlockedPlayerIds: Array.from(
      new Set([...cloud.unlockedPlayerIds, ...local.unlockedPlayerIds])
    ),
    unlockedKitIds: Array.from(new Set([...cloud.unlockedKitIds, ...local.unlockedKitIds])),
    earnedTrophyIds: Array.from(new Set([...cloud.earnedTrophyIds, ...local.earnedTrophyIds])),
    claimedAchievementIds: Array.from(
      new Set([...cloud.claimedAchievementIds, ...local.claimedAchievementIds])
    ),
    playerUpgrades: mergedUpgrades,
    careerWins: Math.max(cloud.careerWins, local.careerWins),
    careerLosses: Math.max(cloud.careerLosses, local.careerLosses),
    cleanSheets: Math.max(cloud.cleanSheets, local.cleanSheets),
    totalGoals: Math.max(cloud.totalGoals, local.totalGoals),
    blue2PWins: Math.max(cloud.blue2PWins, local.blue2PWins),
    red2PWins: Math.max(cloud.red2PWins, local.red2PWins),
    fastestShotKmh: Math.max(cloud.fastestShotKmh, local.fastestShotKmh),
  });
}

export function loadCareerProfile(): CareerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    return normalizeCareerProfile(JSON.parse(raw) as Partial<CareerProfile>);
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveCareerProfile(profile: CareerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage errors
  }
}
