export type GamePhase =
  | 'TITLE_MENU'
  | 'CAREER_HUB'
  | 'PLAYING'
  | 'GOAL_CELEBRATION'
  | 'PAUSED'
  | 'GAME_OVER';

export type PlayMode = 'career' | '1P' | '2P' | 'online';
export type CpuDifficulty = 'casual' | 'pro' | 'chaos';
export type TwistMode = 'random' | 'classic' | 'celestial';
export type TeamSide = 'blue' | 'red';

export type PlayerAbilityId =
  | 'rocket_volley'
  | 'titan_anchor'
  | 'dash_surge'
  | 'sky_leap'
  | 'hammer_header'
  | 'cryo_pulse'
  | 'magnet_boot'
  | 'goal_shield'
  | 'golden_strike'
  | 'overdrive_nova';

export type HairStyle = 'classic' | 'spiky' | 'mohawk' | 'visor' | 'afro' | 'crown';

export interface PlayerProfile {
  id: string;
  name: string;
  nickname: string;
  role: 'keeper' | 'striker';
  number: string;
  cost: number;
  speedMult: number;
  jumpMult: number;
  kickMult: number;
  headScaleMult: number;
  skinColor: string;
  hairColor: string;
  hairStyle: HairStyle;
  abilityId: PlayerAbilityId;
  abilityName: string;
  abilityDesc: string;
}

export interface KitSpec {
  id: string;
  name: string;
  cost: number;
  primary: string;
  secondary: string;
  trim: string;
  shorts: string;
  boot: string;
}

export interface CupStage {
  stageName: string;
  opponentName: string;
  opponentKitId: string;
  opponentStrikerId: string;
  opponentKeeperId: string;
  difficulty: CpuDifficulty;
  mutatorId?: MutatorId;
  targetScore: 3 | 5;
}

export interface CupSpec {
  id: string;
  name: string;
  subtitle: string;
  trophyTier: 'bronze' | 'silver' | 'gold' | 'diamond';
  rewardCoins: number;
  unlockPlayerId?: string;
  unlockKitId?: string;
  stages: CupStage[];
}

export interface ClubCrestSpec {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  shape: 'shield' | 'diamond' | 'hex' | 'crown';
}

export interface AchievementSpec {
  id: string;
  title: string;
  description: string;
  target: number;
  metric:
    | 'careerWins'
    | 'totalGoals'
    | 'earnedTrophies'
    | 'fastestShotKmh'
    | 'cleanSheets'
    | 'bestWinStreak'
    | 'unlockedPlayers';
  rewardCoins: number;
  rewardXp: number;
}

export interface PlayerStatUpgrade {
  speed: number;
  jump: number;
  kick: number;
}

export type PlayerUpgradeMap = Record<string, PlayerStatUpgrade>;

export interface LeaderboardEntry {
  ownerUid: string;
  clubName: string;
  managerName: string;
  crestId: string;
  trophiesCount: number;
  careerWins: number;
  clubXp: number;
  fastestShotKmh: number;
}

export interface WeeklyMultiplayerLeaderboardEntry {
  id: string;
  seasonId: string;
  ownerUid: string;
  clubName: string;
  managerName: string;
  crestId: string;
  rating: number;
  onlineWins: number;
  onlineLosses: number;
  winStreak: number;
  goalsScored: number;
  updatedAt?: unknown;
}

export interface CareerProfile {
  clubName: string;
  crestId: string;
  hasCustomizedClubName?: boolean;
  lastClaimedWeeklySeasonId?: string;
  coins: number;
  clubXp: number;
  winStreak: number;
  bestWinStreak: number;
  unlockedPlayerIds: string[];
  unlockedKitIds: string[];
  selectedStrikerId: string;
  selectedKeeperId: string;
  selectedKitId: string;
  selectedPowerupRole: 'striker' | 'keeper';
  earnedTrophyIds: string[];
  claimedAchievementIds: string[];
  playerUpgrades: PlayerUpgradeMap;
  activeCupId: string | null;
  activeCupStage: number;
  careerWins: number;
  careerLosses: number;
  cleanSheets: number;
  totalGoals: number;
  blue2PWins: number;
  red2PWins: number;
  fastestShotKmh: number;
}

export interface MatchConfig {
  mode: PlayMode;
  difficulty: CpuDifficulty;
  twistMode: TwistMode;
  targetScore: 3 | 5 | 7;
  cupId?: string;
  cupStageIndex?: number;
  blueKit?: KitSpec;
  redKit?: KitSpec;
  blueLineup?: { keeper: PlayerProfile; striker: PlayerProfile };
  redLineup?: { keeper: PlayerProfile; striker: PlayerProfile };
  bluePowerupRole?: 'striker' | 'keeper';
  redPowerupRole?: 'striker' | 'keeper';
  onlineMySide?: TeamSide;
  opponentName?: string;
  opponentCrestId?: string;
}

export type MutatorId =
  | 'classic_turf'
  | 'ice_rink'
  | 'beach_volley'
  | 'lunar_dome'
  | 'heavy_steel'
  | 'mega_ball'
  | 'tiny_goals'
  | 'big_heads';

export interface MutatorSpec {
  id: MutatorId;
  name: string;
  tagline: string;
  gravity: number;
  groundFriction: number;
  ballRadius: number;
  ballMass: number;
  ballRestitution: number;
  ballDrag: number;
  ballStyle: 'classic' | 'ice' | 'beach' | 'lunar' | 'steel' | 'mega';
  goalHeight: number;
  headScale: number;
  playerScale: number;
  jumpPower: number;
  skyTop: string;
  skyBottom: string;
  turfPrimary: string;
  turfSecondary: string;
  lineColor: string;
  ambientParticle: 'none' | 'snow' | 'stars' | 'sparks' | 'sand';
}

export interface PlayerEntity {
  id: string;
  profile: PlayerProfile;
  kit: KitSpec;
  team: TeamSide;
  role: 'keeper' | 'striker';
  number: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  omega: number;
  legAngle: number;
  legOmega: number;
  kickTimer: number;
  headBobAngle: number;
  headBobOmega: number;
  grounded: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  squashX: number;
  squashY: number;
  hitFlash: number;
  homeX: number;
  facing: 1 | -1;
  shotIntent: 'standard' | 'low_drive' | 'chip';
}

export interface BallEntity {
  id: string;
  isGolden: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  angle: number;
  omega: number;
  mass: number;
  restitution: number;
  drag: number;
  squashX: number;
  squashY: number;
  squashAngle: number;
  hitFlash: number;
  lastTouchTeam: TeamSide | null;
  lastTouchTime: number;
  trail: Array<{ x: number; y: number; alpha: number; speed: number }>;
}

export type OrbType = 'golden_ball' | 'giant_goal' | 'magnet' | 'freeze';

export interface ChaosOrb {
  type: OrbType;
  label: string;
  x: number;
  y: number;
  baseY: number;
  r: number;
  phase: number;
  life: number;
  maxLife: number;
}

export interface ActivePowerup {
  type: OrbType | PlayerAbilityId;
  owner: TeamSide;
  label: string;
  remaining: number;
  duration: number;
}

export interface NetNode {
  x: number;
  y: number;
  restX: number;
  restY: number;
  vx: number;
  vy: number;
  pinned: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravityScale: number;
  shape: 'circle' | 'rect' | 'spark';
  rotation: number;
  vRot: number;
}

export interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  life: number;
  maxLife: number;
  lineWidth: number;
}

export interface SkidMark {
  x: number;
  width: number;
  alpha: number;
  color: string;
}

export interface FloatingCallout {
  text: string;
  x: number;
  y: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface TeamInput {
  jumpHeld: boolean;
  jumpJustPressed: boolean;
  lean: -1 | 0 | 1;
  abilityJustPressed: boolean;
  shotIntent?: 'standard' | 'low_drive' | 'chip';
  playerOverrides?: Record<
    string,
    {
      lean: -1 | 0 | 1;
      jumpHeld: boolean;
      jumpJustPressed: boolean;
      shotIntent?: 'standard' | 'low_drive' | 'chip';
    }
  >;
}

export interface MatchStats {
  blueShots: number;
  redShots: number;
  crossbarHits: number;
  airGoals: number;
  longestVolley: number;
  fastestShotKmh: number;
}

export interface HudSnapshot {
  blueScore: number;
  redScore: number;
  blueOverdrive: number;
  redOverdrive: number;
  blueAbilityCharge: number;
  redAbilityCharge: number;
  blueAbilityName: string;
  redAbilityName: string;
  blueLineupNames: string;
  redLineupNames: string;
  opponentLabel: string;
  rallyCount: number;
  roundNumber: number;
  mutator: MutatorSpec;
  activePowerup: ActivePowerup | null;
  isMatchPoint: boolean;
  lastScorer: TeamSide | null;
  lastGoalPoints: number;
  lastGoalSpeedKmh: number;
  isOwnGoal: boolean;
  goalTypeLabel: string;
  nextMutator: MutatorSpec;
  stats: MatchStats;
  winner: TeamSide | null;
}
