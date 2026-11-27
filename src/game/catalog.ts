import {
  AchievementSpec,
  CareerProfile,
  ClubCrestSpec,
  CupSpec,
  KitSpec,
  PlayerProfile,
  PlayerUpgradeMap,
} from './types';

export const CRESTS_CATALOG: ClubCrestSpec[] = [
  {
    id: 'phoenix_gold',
    name: 'Phoenix United',
    primary: '#0ea5e9',
    secondary: '#0369a1',
    accent: '#fbbf24',
    shape: 'shield',
  },
  {
    id: 'crimson_fang',
    name: 'Crimson Fang',
    primary: '#f43f5e',
    secondary: '#881337',
    accent: '#fde047',
    shape: 'diamond',
  },
  {
    id: 'emerald_crest',
    name: 'Emerald Athletic',
    primary: '#10b981',
    secondary: '#064e3b',
    accent: '#a7f3d0',
    shape: 'hex',
  },
  {
    id: 'obsidian_crown',
    name: 'Royal Obsidian',
    primary: '#27272a',
    secondary: '#09090b',
    accent: '#fbbf24',
    shape: 'crown',
  },
  {
    id: 'cyber_nova',
    name: 'Cyber Nova',
    primary: '#8b5cf6',
    secondary: '#312e81',
    accent: '#38bdf8',
    shape: 'hex',
  },
  {
    id: 'solar_flare',
    name: 'Solar Flare',
    primary: '#f97316',
    secondary: '#7c2d12',
    accent: '#fef08a',
    shape: 'diamond',
  },
];

export const PLAYERS_CATALOG: PlayerProfile[] = [
  {
    id: 'leo_spark',
    name: 'Leo Vance',
    nickname: 'Spark',
    role: 'striker',
    number: '9',
    cost: 0,
    speedMult: 1.04,
    jumpMult: 1.02,
    kickMult: 1.05,
    headScaleMult: 1.0,
    skinColor: '#eab689',
    hairColor: '#0f172a',
    hairStyle: 'spiky',
    abilityId: 'rocket_volley',
    abilityName: 'Rocket Volley',
    abilityDesc: 'Overcharges next kick to 1.45x velocity with high curve spin.',
  },
  {
    id: 'sam_wall',
    name: 'Sam Kovacs',
    nickname: 'The Wall',
    role: 'keeper',
    number: '1',
    cost: 0,
    speedMult: 0.96,
    jumpMult: 1.04,
    kickMult: 1.0,
    headScaleMult: 1.05,
    skinColor: '#f5d0a9',
    hairColor: '#451a03',
    hairStyle: 'classic',
    abilityId: 'titan_anchor',
    abilityName: 'Titan Anchor',
    abilityDesc: 'Emits a shockwave clear and enlarges keeper reach for 6s.',
  },
  {
    id: 'maya_blitz',
    name: 'Maya Chen',
    nickname: 'Blitz',
    role: 'striker',
    number: '7',
    cost: 120,
    speedMult: 1.2,
    jumpMult: 1.04,
    kickMult: 1.06,
    headScaleMult: 0.96,
    skinColor: '#f3cfb3',
    hairColor: '#1e1b4b',
    hairStyle: 'visor',
    abilityId: 'dash_surge',
    abilityName: 'Dash Surge',
    abilityDesc: 'Rockets your squad forward toward the ball with sonic speed.',
  },
  {
    id: 'diego_sky',
    name: 'Diego Silva',
    nickname: 'Acrobat',
    role: 'striker',
    number: '11',
    cost: 150,
    speedMult: 1.06,
    jumpMult: 1.18,
    kickMult: 1.08,
    headScaleMult: 1.0,
    skinColor: '#c68642',
    hairColor: '#171717',
    hairStyle: 'mohawk',
    abilityId: 'sky_leap',
    abilityName: 'Sky Leap',
    abilityDesc: 'Launches both players skyward for instant aerial bicycle kicks.',
  },
  {
    id: 'bram_iron',
    name: 'Bram Lind',
    nickname: 'Ironhead',
    role: 'keeper',
    number: '4',
    cost: 180,
    speedMult: 0.95,
    jumpMult: 1.08,
    kickMult: 1.04,
    headScaleMult: 1.32,
    skinColor: '#fde2c4',
    hairColor: '#b45309',
    hairStyle: 'spiky',
    abilityId: 'hammer_header',
    abilityName: 'Hammer Header',
    abilityDesc: 'Enlarges heads and boosts header rebound power for 6.5s.',
  },
  {
    id: 'kira_vortex',
    name: 'Kira Sato',
    nickname: 'Vortex',
    role: 'striker',
    number: '17',
    cost: 210,
    speedMult: 1.16,
    jumpMult: 1.12,
    kickMult: 1.1,
    headScaleMult: 0.98,
    skinColor: '#f5d0a9',
    hairColor: '#38bdf8',
    hairStyle: 'spiky',
    abilityId: 'dash_surge',
    abilityName: 'Dash Surge',
    abilityDesc: 'High-agility winger who bursts through tackles with sonic pace.',
  },
  {
    id: 'zara_frost',
    name: 'Zara Nyx',
    nickname: 'Frost',
    role: 'striker',
    number: '14',
    cost: 240,
    speedMult: 1.12,
    jumpMult: 1.06,
    kickMult: 1.1,
    headScaleMult: 1.0,
    skinColor: '#8d5524',
    hairColor: '#38bdf8',
    hairStyle: 'afro',
    abilityId: 'cryo_pulse',
    abilityName: 'Cryo Pulse',
    abilityDesc: 'Freezes the opponent turf into slick ice for 5.5s.',
  },
  {
    id: 'elena_shield',
    name: 'Elena Volkov',
    nickname: 'Aegis',
    role: 'keeper',
    number: '13',
    cost: 260,
    speedMult: 1.02,
    jumpMult: 1.16,
    kickMult: 1.08,
    headScaleMult: 1.08,
    skinColor: '#fde2c4',
    hairColor: '#0f172a',
    hairStyle: 'visor',
    abilityId: 'goal_shield',
    abilityName: 'Goal Shield',
    abilityDesc: 'Deploys a defensive barrier shrinking your goal height by 30%.',
  },
  {
    id: 'tariq_mag',
    name: 'Tariq Mansoor',
    nickname: 'Maestro',
    role: 'striker',
    number: '10',
    cost: 280,
    speedMult: 1.1,
    jumpMult: 1.08,
    kickMult: 1.14,
    headScaleMult: 1.02,
    skinColor: '#c68642',
    hairColor: '#0f172a',
    hairStyle: 'visor',
    abilityId: 'magnet_boot',
    abilityName: 'Magnet Boot',
    abilityDesc: 'Pulls nearby balls smoothly toward your kicking boots for 6.5s.',
  },
  {
    id: 'giga_petrov',
    name: 'Viktor Petrov',
    nickname: 'Fortress',
    role: 'keeper',
    number: '99',
    cost: 320,
    speedMult: 0.94,
    jumpMult: 1.1,
    kickMult: 1.12,
    headScaleMult: 1.15,
    skinColor: '#f5d0a9',
    hairColor: '#334155',
    hairStyle: 'mohawk',
    abilityId: 'titan_anchor',
    abilityName: 'Titan Anchor',
    abilityDesc: 'Giant keeper aura and shockwave clearance away from your box.',
  },
  {
    id: 'axel_blaze',
    name: 'Axel Lindqvist',
    nickname: 'Cannon',
    role: 'striker',
    number: '19',
    cost: 360,
    speedMult: 1.12,
    jumpMult: 1.15,
    kickMult: 1.2,
    headScaleMult: 1.05,
    skinColor: '#f5d0a9',
    hairColor: '#f97316',
    hairStyle: 'mohawk',
    abilityId: 'rocket_volley',
    abilityName: 'Rocket Volley',
    abilityDesc: 'Unleashes thunderous 1.45x shots that bend past keepers.',
  },
  {
    id: 'nova_comet',
    name: 'Nova Takahashi',
    nickname: 'Comet',
    role: 'striker',
    number: '22',
    cost: 400,
    speedMult: 1.18,
    jumpMult: 1.14,
    kickMult: 1.18,
    headScaleMult: 1.04,
    skinColor: '#f3cfb3',
    hairColor: '#fbbf24',
    hairStyle: 'spiky',
    abilityId: 'golden_strike',
    abilityName: 'Golden Strike',
    abilityDesc: 'Spawns a bonus Golden Ball worth +2 goals on the pitch!',
  },
  {
    id: 'titan_rex',
    name: 'Marcus Rex',
    nickname: 'Colossus',
    role: 'keeper',
    number: '88',
    cost: 460,
    speedMult: 1.04,
    jumpMult: 1.16,
    kickMult: 1.18,
    headScaleMult: 1.24,
    skinColor: '#8d5524',
    hairColor: '#fbbf24',
    hairStyle: 'afro',
    abilityId: 'hammer_header',
    abilityName: 'Hammer Header',
    abilityDesc: 'Massive header & rebound specialist with elite aerial reach.',
  },
  {
    id: 'king_aurelius',
    name: 'King Aurelius',
    nickname: 'Apex',
    role: 'striker',
    number: '100',
    cost: 550,
    speedMult: 1.22,
    jumpMult: 1.18,
    kickMult: 1.24,
    headScaleMult: 1.12,
    skinColor: '#8d5524',
    hairColor: '#fbbf24',
    hairStyle: 'crown',
    abilityId: 'overdrive_nova',
    abilityName: 'Overdrive Nova',
    abilityDesc: 'Instantly maxes Overdrive to 100% and blasts nearby balls!',
  },
];

export const KITS_CATALOG: KitSpec[] = [
  {
    id: 'azure_club',
    name: 'Azure Strikers',
    cost: 0,
    primary: '#0ea5e9',
    secondary: '#0369a1',
    trim: '#bae6fd',
    shorts: '#0f172a',
    boot: '#38bdf8',
  },
  {
    id: 'crimson_united',
    name: 'Crimson Blaze',
    cost: 0,
    primary: '#f43f5e',
    secondary: '#be123c',
    trim: '#fecdd3',
    shorts: '#1e1b4b',
    boot: '#fb7185',
  },
  {
    id: 'cyber_volt',
    name: 'Cyber Volt',
    cost: 90,
    primary: '#eab308',
    secondary: '#a16207',
    trim: '#fef08a',
    shorts: '#09090b',
    boot: '#facc15',
  },
  {
    id: 'royal_emerald',
    name: 'Emerald Athletic',
    cost: 140,
    primary: '#10b981',
    secondary: '#047857',
    trim: '#a7f3d0',
    shorts: '#064e3b',
    boot: '#34d399',
  },
  {
    id: 'obsidian_gold',
    name: 'Obsidian Crown',
    cost: 220,
    primary: '#27272a',
    secondary: '#09090b',
    trim: '#fbbf24',
    shorts: '#18181b',
    boot: '#f59e0b',
  },
  {
    id: 'arctic_glacier',
    name: 'Arctic Frost',
    cost: 260,
    primary: '#e0f2fe',
    secondary: '#7dd3fc',
    trim: '#0284c7',
    shorts: '#0c4a6e',
    boot: '#38bdf8',
  },
  {
    id: 'sunset_coral',
    name: 'Solar Flare',
    cost: 320,
    primary: '#f97316',
    secondary: '#c2410c',
    trim: '#fed7aa',
    shorts: '#431407',
    boot: '#fb923c',
  },
  {
    id: 'cosmic_nebula',
    name: 'Cosmic Nebula',
    cost: 420,
    primary: '#8b5cf6',
    secondary: '#5b21b6',
    trim: '#ddd6fe',
    shorts: '#1e1b4b',
    boot: '#a78bfa',
  },
  {
    id: 'emerald_gold',
    name: 'Imperial Jade',
    cost: 480,
    primary: '#059669',
    secondary: '#064e3b',
    trim: '#fbbf24',
    shorts: '#022c22',
    boot: '#fbbf24',
  },
  {
    id: 'inferno_carbon',
    name: 'Inferno Carbon',
    cost: 540,
    primary: '#dc2626',
    secondary: '#18181b',
    trim: '#fca5a5',
    shorts: '#09090b',
    boot: '#ef4444',
  },
];

export const CUPS_CATALOG: CupSpec[] = [
  {
    id: 'rookie_street_cup',
    name: 'Street Floodlight Cup',
    subtitle: '3-stage opener · Balanced turf & crisp goals',
    trophyTier: 'bronze',
    rewardCoins: 180,
    unlockKitId: 'cyber_volt',
    unlockPlayerId: 'maya_blitz',
    stages: [
      {
        stageName: 'Quarterfinal',
        opponentName: 'Dockyard FC',
        opponentKitId: 'crimson_united',
        opponentStrikerId: 'leo_spark',
        opponentKeeperId: 'sam_wall',
        difficulty: 'casual',
        mutatorId: 'classic_turf',
        targetScore: 3,
      },
      {
        stageName: 'Semifinal',
        opponentName: 'Harbor Rovers',
        opponentKitId: 'royal_emerald',
        opponentStrikerId: 'diego_sky',
        opponentKeeperId: 'sam_wall',
        difficulty: 'casual',
        mutatorId: 'big_heads',
        targetScore: 3,
      },
      {
        stageName: 'Cup Final',
        opponentName: 'Metro Blaze',
        opponentKitId: 'sunset_coral',
        opponentStrikerId: 'maya_blitz',
        opponentKeeperId: 'bram_iron',
        difficulty: 'pro',
        mutatorId: 'classic_turf',
        targetScore: 5,
      },
    ],
  },
  {
    id: 'beach_ice_clash',
    name: 'Coast & Glacier Shield',
    subtitle: '3-stage element series · Sand drift to mirror ice',
    trophyTier: 'silver',
    rewardCoins: 240,
    unlockKitId: 'sunset_coral',
    unlockPlayerId: 'kira_vortex',
    stages: [
      {
        stageName: 'Quarterfinal',
        opponentName: 'Dune Strikers',
        opponentKitId: 'cyber_volt',
        opponentStrikerId: 'kira_vortex',
        opponentKeeperId: 'sam_wall',
        difficulty: 'casual',
        mutatorId: 'beach_volley',
        targetScore: 3,
      },
      {
        stageName: 'Semifinal',
        opponentName: 'Fjord Kings',
        opponentKitId: 'arctic_glacier',
        opponentStrikerId: 'zara_frost',
        opponentKeeperId: 'elena_shield',
        difficulty: 'pro',
        mutatorId: 'ice_rink',
        targetScore: 5,
      },
      {
        stageName: 'Cup Final',
        opponentName: 'Tidal Zenith',
        opponentKitId: 'emerald_gold',
        opponentStrikerId: 'diego_sky',
        opponentKeeperId: 'elena_shield',
        difficulty: 'pro',
        mutatorId: 'beach_volley',
        targetScore: 5,
      },
    ],
  },
  {
    id: 'premier_arena_cup',
    name: 'Premier Arena Trophy',
    subtitle: '4-stage pro circuit · Fast rebounds & sniper crossbars',
    trophyTier: 'silver',
    rewardCoins: 320,
    unlockKitId: 'royal_emerald',
    unlockPlayerId: 'bram_iron',
    stages: [
      {
        stageName: 'Round of 16',
        opponentName: 'Nordic Glaciers',
        opponentKitId: 'arctic_glacier',
        opponentStrikerId: 'zara_frost',
        opponentKeeperId: 'bram_iron',
        difficulty: 'pro',
        mutatorId: 'ice_rink',
        targetScore: 3,
      },
      {
        stageName: 'Quarterfinal',
        opponentName: 'Sniper Athletic',
        opponentKitId: 'cyber_volt',
        opponentStrikerId: 'tariq_mag',
        opponentKeeperId: 'elena_shield',
        difficulty: 'pro',
        mutatorId: 'tiny_goals',
        targetScore: 5,
      },
      {
        stageName: 'Semifinal',
        opponentName: 'Carbon Wolves',
        opponentKitId: 'inferno_carbon',
        opponentStrikerId: 'axel_blaze',
        opponentKeeperId: 'bram_iron',
        difficulty: 'pro',
        mutatorId: 'classic_turf',
        targetScore: 5,
      },
      {
        stageName: 'Cup Final',
        opponentName: 'Iron Foundry XI',
        opponentKitId: 'obsidian_gold',
        opponentStrikerId: 'diego_sky',
        opponentKeeperId: 'giga_petrov',
        difficulty: 'pro',
        mutatorId: 'heavy_steel',
        targetScore: 5,
      },
    ],
  },
  {
    id: 'elemental_masters_cup',
    name: 'Elemental Masters Cup',
    subtitle: '4-stage tour · Sand, Ice, Moon & Mega Sphere',
    trophyTier: 'gold',
    rewardCoins: 420,
    unlockKitId: 'arctic_glacier',
    unlockPlayerId: 'tariq_mag',
    stages: [
      {
        stageName: 'Round of 16',
        opponentName: 'Tropic Wave FC',
        opponentKitId: 'sunset_coral',
        opponentStrikerId: 'diego_sky',
        opponentKeeperId: 'bram_iron',
        difficulty: 'pro',
        mutatorId: 'beach_volley',
        targetScore: 3,
      },
      {
        stageName: 'Quarterfinal',
        opponentName: 'Frostbite United',
        opponentKitId: 'arctic_glacier',
        opponentStrikerId: 'zara_frost',
        opponentKeeperId: 'giga_petrov',
        difficulty: 'pro',
        mutatorId: 'ice_rink',
        targetScore: 5,
      },
      {
        stageName: 'Semifinal',
        opponentName: 'Lunar Orbiters',
        opponentKitId: 'cosmic_nebula',
        opponentStrikerId: 'nova_comet',
        opponentKeeperId: 'bram_iron',
        difficulty: 'chaos',
        mutatorId: 'lunar_dome',
        targetScore: 5,
      },
      {
        stageName: 'Cup Final',
        opponentName: 'Titan Colossus',
        opponentKitId: 'obsidian_gold',
        opponentStrikerId: 'tariq_mag',
        opponentKeeperId: 'titan_rex',
        difficulty: 'chaos',
        mutatorId: 'mega_ball',
        targetScore: 5,
      },
    ],
  },
  {
    id: 'legends_superleague',
    name: 'Legends Superleague',
    subtitle: '4-stage invitational · Elite Chaos AI squads',
    trophyTier: 'gold',
    rewardCoins: 540,
    unlockKitId: 'emerald_gold',
    unlockPlayerId: 'axel_blaze',
    stages: [
      {
        stageName: 'Quarterfinal',
        opponentName: 'Aegis Vanguard',
        opponentKitId: 'arctic_glacier',
        opponentStrikerId: 'kira_vortex',
        opponentKeeperId: 'elena_shield',
        difficulty: 'chaos',
        mutatorId: 'tiny_goals',
        targetScore: 5,
      },
      {
        stageName: 'Semifinal',
        opponentName: 'Cannon Syndicate',
        opponentKitId: 'inferno_carbon',
        opponentStrikerId: 'axel_blaze',
        opponentKeeperId: 'titan_rex',
        difficulty: 'chaos',
        mutatorId: 'heavy_steel',
        targetScore: 5,
      },
      {
        stageName: 'Winner Bracket',
        opponentName: 'Comet All-Stars',
        opponentKitId: 'cosmic_nebula',
        opponentStrikerId: 'nova_comet',
        opponentKeeperId: 'giga_petrov',
        difficulty: 'chaos',
        targetScore: 5,
      },
      {
        stageName: 'Superleague Final',
        opponentName: 'Imperial Jade XI',
        opponentKitId: 'emerald_gold',
        opponentStrikerId: 'tariq_mag',
        opponentKeeperId: 'titan_rex',
        difficulty: 'chaos',
        mutatorId: 'classic_turf',
        targetScore: 5,
      },
    ],
  },
  {
    id: 'world_chaos_championship',
    name: 'World Chaos Championship',
    subtitle: '5-stage grand finale · Unlocks Apex Legend',
    trophyTier: 'diamond',
    rewardCoins: 750,
    unlockKitId: 'obsidian_gold',
    unlockPlayerId: 'king_aurelius',
    stages: [
      {
        stageName: 'Group Knockout',
        opponentName: 'Volt Syndicate',
        opponentKitId: 'cyber_volt',
        opponentStrikerId: 'maya_blitz',
        opponentKeeperId: 'giga_petrov',
        difficulty: 'chaos',
        targetScore: 5,
      },
      {
        stageName: 'Round of 16',
        opponentName: 'Inferno Knights',
        opponentKitId: 'inferno_carbon',
        opponentStrikerId: 'axel_blaze',
        opponentKeeperId: 'elena_shield',
        difficulty: 'chaos',
        mutatorId: 'big_heads',
        targetScore: 5,
      },
      {
        stageName: 'Quarterfinal',
        opponentName: 'Nebula Stars',
        opponentKitId: 'cosmic_nebula',
        opponentStrikerId: 'nova_comet',
        opponentKeeperId: 'bram_iron',
        difficulty: 'chaos',
        targetScore: 5,
      },
      {
        stageName: 'Semifinal',
        opponentName: 'Royal Obsidian',
        opponentKitId: 'obsidian_gold',
        opponentStrikerId: 'tariq_mag',
        opponentKeeperId: 'titan_rex',
        difficulty: 'chaos',
        targetScore: 5,
      },
      {
        stageName: 'World Final',
        opponentName: 'Apex Pantheon',
        opponentKitId: 'obsidian_gold',
        opponentStrikerId: 'king_aurelius',
        opponentKeeperId: 'titan_rex',
        difficulty: 'chaos',
        targetScore: 5,
      },
    ],
  },
];

export const ACHIEVEMENTS_CATALOG: AchievementSpec[] = [
  {
    id: 'first_victory',
    title: 'First Floodlight Win',
    description: 'Win your first single-player match or cup tie.',
    target: 1,
    metric: 'careerWins',
    rewardCoins: 75,
    rewardXp: 100,
  },
  {
    id: 'goal_machine',
    title: 'Clinical Finisher',
    description: 'Score 25 total goals across all matches.',
    target: 25,
    metric: 'totalGoals',
    rewardCoins: 140,
    rewardXp: 180,
  },
  {
    id: 'rocket_striker',
    title: 'Supersonic Boot',
    description: 'Unleash a shot clocking 125+ km/h.',
    target: 125,
    metric: 'fastestShotKmh',
    rewardCoins: 160,
    rewardXp: 200,
  },
  {
    id: 'clean_sheet_wall',
    title: 'Brick Wall Defense',
    description: 'Win 3 single-player matches conceding 0 goals.',
    target: 3,
    metric: 'cleanSheets',
    rewardCoins: 180,
    rewardXp: 220,
  },
  {
    id: 'unstoppable_streak',
    title: 'Unbeaten Run',
    description: 'Reach a 4-match single-player win streak.',
    target: 4,
    metric: 'bestWinStreak',
    rewardCoins: 220,
    rewardXp: 260,
  },
  {
    id: 'squad_builder',
    title: 'Galactico Scout',
    description: 'Sign 6 players into your club roster.',
    target: 6,
    metric: 'unlockedPlayers',
    rewardCoins: 200,
    rewardXp: 240,
  },
  {
    id: 'cup_collector',
    title: 'Silverware Collector',
    description: 'Win 3 Championship Cup trophies.',
    target: 3,
    metric: 'earnedTrophies',
    rewardCoins: 300,
    rewardXp: 400,
  },
  {
    id: 'world_apex',
    title: 'Apex Dynasty',
    description: 'Lift all 6 Career Championship trophies.',
    target: 6,
    metric: 'earnedTrophies',
    rewardCoins: 600,
    rewardXp: 800,
  },
];

export function getPlayerById(id: string): PlayerProfile {
  return PLAYERS_CATALOG.find((p) => p.id === id) ?? PLAYERS_CATALOG[0];
}

export function getKitById(id: string): KitSpec {
  return KITS_CATALOG.find((k) => k.id === id) ?? KITS_CATALOG[0];
}

export function getCupById(id: string): CupSpec {
  return CUPS_CATALOG.find((c) => c.id === id) ?? CUPS_CATALOG[0];
}

export function getCrestById(id: string): ClubCrestSpec {
  return CRESTS_CATALOG.find((c) => c.id === id) ?? CRESTS_CATALOG[0];
}

export function applyPlayerUpgrades(
  player: PlayerProfile,
  upgrades?: PlayerUpgradeMap
): PlayerProfile {
  const up = upgrades?.[player.id];
  if (!up) return player;
  return {
    ...player,
    speedMult: Number((player.speedMult + up.speed * 0.04).toFixed(3)),
    jumpMult: Number((player.jumpMult + up.jump * 0.04).toFixed(3)),
    kickMult: Number((player.kickMult + up.kick * 0.045).toFixed(3)),
  };
}

export function getDivisionInfo(clubXp: number): {
  division: string;
  level: number;
  progressPct: number;
  xpIntoLevel: number;
  xpPerLevel: number;
} {
  const xpPerLevel = 250;
  const level = Math.floor(clubXp / xpPerLevel) + 1;
  const xpIntoLevel = clubXp % xpPerLevel;
  const progressPct = Math.round((xpIntoLevel / xpPerLevel) * 100);

  let division = 'Division 5';
  if (level >= 15) division = 'Apex Premier';
  else if (level >= 11) division = 'Division 1';
  else if (level >= 8) division = 'Division 2';
  else if (level >= 5) division = 'Division 3';
  else if (level >= 3) division = 'Division 4';

  return { division, level, progressPct, xpIntoLevel, xpPerLevel };
}

export function getAchievementCurrentValue(
  ach: AchievementSpec,
  profile: CareerProfile
): number {
  switch (ach.metric) {
    case 'careerWins':
      return profile.careerWins;
    case 'totalGoals':
      return profile.totalGoals;
    case 'earnedTrophies':
      return profile.earnedTrophyIds.length;
    case 'fastestShotKmh':
      return profile.fastestShotKmh;
    case 'cleanSheets':
      return profile.cleanSheets;
    case 'bestWinStreak':
      return profile.bestWinStreak;
    case 'unlockedPlayers':
      return profile.unlockedPlayerIds.length;
  }
}

export function pickRandomSquad(excludeIds: string[] = []): {
  keeper: PlayerProfile;
  striker: PlayerProfile;
} {
  const keepers = PLAYERS_CATALOG.filter(
    (p) => p.role === 'keeper' && !excludeIds.includes(p.id)
  );
  const strikers = PLAYERS_CATALOG.filter(
    (p) => p.role === 'striker' && !excludeIds.includes(p.id)
  );
  const kPool = keepers.length > 0 ? keepers : PLAYERS_CATALOG.filter((p) => p.role === 'keeper');
  const sPool = strikers.length > 0 ? strikers : PLAYERS_CATALOG.filter((p) => p.role === 'striker');

  return {
    keeper: kPool[Math.floor(Math.random() * kPool.length)],
    striker: sPool[Math.floor(Math.random() * sPool.length)],
  };
}

export function pickRandomKit(excludeId?: string): KitSpec {
  const pool = KITS_CATALOG.filter((k) => k.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)] ?? KITS_CATALOG[0];
}
