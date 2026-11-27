import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  DEFAULT_PROFILE,
  isStarterProfile,
  mergeCareerProfiles,
  normalizeCareerProfile,
} from '../game/progression';
import { CareerProfile, LeaderboardEntry } from '../game/types';
import { OperationType, db, handleFirestoreError } from './firebase';

function sanitizeId(raw: string, fallback: string, maxLen = 48): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeCareerFields(profile: CareerProfile, uid: string) {
  const normalized = normalizeCareerProfile(profile);
  const safeUpgrades: Record<string, { speed: number; jump: number; kick: number }> = {};
  for (const [k, v] of Object.entries(normalized.playerUpgrades).slice(0, 24)) {
    const safeKey = sanitizeId(k, 'player', 48);
    safeUpgrades[safeKey] = {
      speed: Math.max(0, Math.min(5, Math.floor(v.speed))),
      jump: Math.max(0, Math.min(5, Math.floor(v.jump))),
      kick: Math.max(0, Math.min(5, Math.floor(v.kick))),
    };
  }

  return {
    ownerUid: uid,
    clubName: normalized.clubName.slice(0, 36) || 'Pitch Chaos FC',
    crestId: sanitizeId(normalized.crestId, 'phoenix_gold', 32),
    coins: Math.max(0, Math.min(100000000, Math.floor(normalized.coins))),
    clubXp: Math.max(0, Math.min(100000000, Math.floor(normalized.clubXp))),
    winStreak: Math.max(0, Math.min(100000, Math.floor(normalized.winStreak))),
    bestWinStreak: Math.max(0, Math.min(100000, Math.floor(normalized.bestWinStreak))),
    unlockedPlayerIds: normalized.unlockedPlayerIds.slice(0, 30),
    unlockedKitIds: normalized.unlockedKitIds.slice(0, 30),
    selectedStrikerId: sanitizeId(normalized.selectedStrikerId, 'leo_spark', 48),
    selectedKeeperId: sanitizeId(normalized.selectedKeeperId, 'sam_wall', 48),
    selectedKitId: sanitizeId(normalized.selectedKitId, 'azure_club', 48),
    selectedPowerupRole: normalized.selectedPowerupRole,
    earnedTrophyIds: normalized.earnedTrophyIds.slice(0, 20),
    claimedAchievementIds: normalized.claimedAchievementIds.slice(0, 30),
    playerUpgrades: safeUpgrades,
    activeCupId: normalized.activeCupId ? normalized.activeCupId.slice(0, 48) : null,
    activeCupStage: Math.max(0, Math.min(50, Math.floor(normalized.activeCupStage))),
    careerWins: Math.max(0, Math.min(100000000, Math.floor(normalized.careerWins))),
    careerLosses: Math.max(0, Math.min(100000000, Math.floor(normalized.careerLosses))),
    cleanSheets: Math.max(0, Math.min(100000000, Math.floor(normalized.cleanSheets))),
    totalGoals: Math.max(0, Math.min(100000000, Math.floor(normalized.totalGoals))),
    blue2PWins: Math.max(0, Math.min(100000000, Math.floor(normalized.blue2PWins))),
    red2PWins: Math.max(0, Math.min(100000000, Math.floor(normalized.red2PWins))),
    fastestShotKmh: Math.max(0, Math.min(1000, Math.floor(normalized.fastestShotKmh))),
    hasCustomizedClubName: Boolean(normalized.hasCustomizedClubName),
  };
}

function buildLeaderboardPayload(user: User, profile: CareerProfile) {
  const safe = sanitizeCareerFields(profile, user.uid);
  const managerRaw = (user.displayName || 'Club Manager').trim().slice(0, 40);
  return {
    ownerUid: user.uid,
    clubName: safe.clubName,
    managerName: managerRaw.length > 0 ? managerRaw : 'Club Manager',
    crestId: safe.crestId,
    trophiesCount: safe.earnedTrophyIds.length,
    careerWins: safe.careerWins,
    clubXp: safe.clubXp,
    fastestShotKmh: safe.fastestShotKmh,
    updatedAt: serverTimestamp(),
  };
}

export async function loadAndSyncCloudProfile(
  user: User,
  localProfile: CareerProfile
): Promise<CareerProfile> {
  const userPath = `users/${user.uid}`;
  const lbPath = `leaderboards/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const lbRef = doc(db, 'leaderboards', user.uid);

  let cloudSnap;
  try {
    cloudSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (cloudSnap.exists()) {
    const rawData = cloudSnap.data() as Record<string, unknown>;
    const cloudData = normalizeCareerProfile(rawData as Partial<CareerProfile>);

    // If cloud profile had a customized name or was played previously, preserve hasCustomizedClubName
    if (
      !cloudData.hasCustomizedClubName &&
      (Boolean(rawData.hasCustomizedClubName) ||
        (cloudData.clubName && cloudData.clubName !== DEFAULT_PROFILE.clubName) ||
        cloudData.careerWins > 0 ||
        cloudData.clubXp > 0 ||
        cloudData.earnedTrophyIds.length > 0)
    ) {
      cloudData.hasCustomizedClubName = true;
    }

    const resolved = isStarterProfile(localProfile)
      ? cloudData
      : mergeCareerProfiles(localProfile, cloudData);

    try {
      const fields = sanitizeCareerFields(resolved, user.uid);
      const { ownerUid: _omitOwner, ...updatable } = fields;

      void updateDoc(userRef, {
        ...updatable,
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        console.warn('Cloud sync background update:', err);
      });

      void setDoc(lbRef, buildLeaderboardPayload(user, resolved), { merge: false }).catch((err) => {
        console.warn('Leaderboard background update:', err);
      });
    } catch {}

    return resolved;
  }

  const fields = sanitizeCareerFields(localProfile, user.uid);
  try {
    await setDoc(userRef, {
      ...fields,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }

  try {
    await setDoc(lbRef, buildLeaderboardPayload(user, localProfile));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, lbPath);
  }

  return localProfile;
}

export async function saveCloudProfile(user: User, profile: CareerProfile): Promise<void> {
  const userPath = `users/${user.uid}`;
  const lbPath = `leaderboards/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const lbRef = doc(db, 'leaderboards', user.uid);

  const fields = sanitizeCareerFields(profile, user.uid);
  const { ownerUid: _omitOwner, ...updatable } = fields;

  try {
    await updateDoc(userRef, {
      ...updatable,
      updatedAt: serverTimestamp(),
    });
  } catch {
    try {
      await setDoc(userRef, {
        ...fields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (innerError) {
      handleFirestoreError(innerError, OperationType.WRITE, userPath);
    }
  }

  try {
    await setDoc(lbRef, buildLeaderboardPayload(user, profile));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, lbPath);
  }
}

export function subscribeLeaderboard(
  onData: (entries: LeaderboardEntry[]) => void,
  onFailure?: (err: unknown) => void
): () => void {
  const lbPath = 'leaderboards';
  const q = query(collection(db, lbPath), orderBy('clubXp', 'desc'), limit(20));
  return onSnapshot(
    q,
    (snapshot) => {
      const entries: LeaderboardEntry[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (typeof d.ownerUid === 'string' && typeof d.clubName === 'string') {
          entries.push({
            ownerUid: d.ownerUid,
            clubName: d.clubName,
            managerName: typeof d.managerName === 'string' ? d.managerName : 'Manager',
            crestId: typeof d.crestId === 'string' ? d.crestId : 'phoenix_gold',
            trophiesCount: typeof d.trophiesCount === 'number' ? d.trophiesCount : 0,
            careerWins: typeof d.careerWins === 'number' ? d.careerWins : 0,
            clubXp: typeof d.clubXp === 'number' ? d.clubXp : 0,
            fastestShotKmh: typeof d.fastestShotKmh === 'number' ? d.fastestShotKmh : 0,
          });
        }
      });
      onData(entries);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, lbPath);
      } catch (wrapped) {
        onFailure?.(wrapped);
      }
    }
  );
}
