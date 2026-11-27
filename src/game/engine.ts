import { soundEngine } from './audio';
import { getKitById, getPlayerById, pickRandomKit, pickRandomSquad } from './catalog';
import {
  BASE_GOAL_HEIGHT,
  GOAL_DEPTH,
  GROUND_Y,
  MUTATORS,
  PITCH_LEFT,
  PITCH_RIGHT,
  WORLD_WIDTH,
  pickNextMutator,
} from './mutators';
import {
  OnlineMatchSnapshot,
  OnlineSoundEvent,
} from './onlineProtocol';
import {
  ActivePowerup,
  BallEntity,
  ChaosOrb,
  CpuDifficulty,
  FloatingCallout,
  GamePhase,
  HudSnapshot,
  KitSpec,
  MatchConfig,
  MatchStats,
  MutatorSpec,
  NetNode,
  OrbType,
  Particle,
  PlayerAbilityId,
  PlayerEntity,
  PlayerProfile,
  ShockwaveRing,
  SkidMark,
  TeamInput,
  TeamSide,
} from './types';

function clamp(val: number, min: number, max: number): number {
  return val < min ? min : val > max ? max : val;
}

const ORB_META: Record<OrbType, { label: string; color: string }> = {
  golden_ball: { label: 'Golden Ball +2', color: '#fbbf24' },
  giant_goal: { label: 'Giant Enemy Goal', color: '#a855f7' },
  magnet: { label: 'Magnet Boots', color: '#38bdf8' },
  freeze: { label: 'Cryo Freeze', color: '#22d3ee' },
};

interface BallSimPoint {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export class SoccerEngine {
  public phase: GamePhase = 'TITLE_MENU';
  public config: MatchConfig = {
    mode: '2P',
    difficulty: 'pro',
    twistMode: 'random',
    targetScore: 5,
  };

  public mutator: MutatorSpec = MUTATORS.classic_turf;
  public nextMutator: MutatorSpec = MUTATORS.classic_turf;
  public roundNumber: number = 1;
  public blueScore: number = 0;
  public redScore: number = 0;
  public blueOverdrive: number = 0;
  public redOverdrive: number = 0;
  public blueAbilityCharge: number = 100;
  public redAbilityCharge: number = 100;
  public blueRocketReady: boolean = false;
  public redRocketReady: boolean = false;
  public rallyCount: number = 0;

  public blueKit: KitSpec = getKitById('azure_club');
  public redKit: KitSpec = getKitById('crimson_united');
  public blueLineup: { keeper: PlayerProfile; striker: PlayerProfile } = {
    keeper: getPlayerById('sam_wall'),
    striker: getPlayerById('leo_spark'),
  };
  public redLineup: { keeper: PlayerProfile; striker: PlayerProfile } = {
    keeper: getPlayerById('sam_wall'),
    striker: getPlayerById('leo_spark'),
  };
  public opponentLabel: string = 'RED';

  public lastScorer: TeamSide | null = null;
  public lastGoalPoints: number = 1;
  public lastGoalSpeedKmh: number = 0;
  public isOwnGoal: boolean = false;
  public goalTypeLabel: string = 'GOAL!';
  public winner: TeamSide | null = null;

  public players: PlayerEntity[] = [];
  public balls: BallEntity[] = [];
  public orbs: ChaosOrb[] = [];
  public activePowerup: ActivePowerup | null = null;

  public leftGoalHeight: number = BASE_GOAL_HEIGHT;
  public rightGoalHeight: number = BASE_GOAL_HEIGHT;
  public leftNet: NetNode[] = [];
  public rightNet: NetNode[] = [];

  public particles: Particle[] = [];
  public shockwaves: ShockwaveRing[] = [];
  public skidMarks: SkidMark[] = [];
  public callouts: FloatingCallout[] = [];
  public ambientParticles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }> = [];
  public dustMotes: Array<{ x: number; y: number; r: number; speed: number; phase: number }> = [];

  public stats: MatchStats = {
    blueShots: 0,
    redShots: 0,
    crossbarHits: 0,
    airGoals: 0,
    longestVolley: 0,
    fastestShotKmh: 0,
  };

  public time: number = 0;
  public roundElapsed: number = 0;
  public hitstopTimer: number = 0;
  public goalTimer: number = 0;
  public shakeTime: number = 0;
  public shakeMagnitude: number = 0;
  public flashAlpha: number = 0;
  public crowdExcitement: number = 0;

  private aiRedJumpCooldown: number = 0;
  private aiKeeperJumpCooldown: number = 0;
  private orbSpawnCooldown: number = 5.0;
  private currentVolleyCount: number = 0;
  private kickSoundCooldown: number = 0;
  private bounceSoundCooldown: number = 0;
  private hudSyncCooldown: number = 0;

  public headless: boolean = false;
  private pendingAudioEvents: OnlineSoundEvent[] = [];

  private onHudChange?: (snapshot: HudSnapshot) => void;
  private onMatchEnd?: (winner: TeamSide, snapshot: HudSnapshot) => void;
  private onGoalScored?: (scorer: TeamSide, snapshot: HudSnapshot) => void;

  constructor(callbacks?: {
    headless?: boolean;
    onHudChange?: (snapshot: HudSnapshot) => void;
    onMatchEnd?: (winner: TeamSide, snapshot: HudSnapshot) => void;
    onGoalScored?: (scorer: TeamSide, snapshot: HudSnapshot) => void;
  }) {
    this.headless = Boolean(callbacks?.headless);
    this.onHudChange = callbacks?.onHudChange;
    this.onMatchEnd = callbacks?.onMatchEnd;
    this.onGoalScored = callbacks?.onGoalScored;

    this.balls = [this.createBall('main', false)];
    this.initAmbientParticles();
    this.initDustMotes();
    this.setupRound(MUTATORS.classic_turf, false);
  }

  public get ball(): BallEntity {
    return this.balls[0];
  }

  private emitSound(ev: OnlineSoundEvent): void {
    if (this.headless) {
      if (this.pendingAudioEvents.length < 18) {
        this.pendingAudioEvents.push(ev);
      }
      return;
    }
    switch (ev.type) {
      case 'kickoff':
        soundEngine.playWhistle('kickoff');
        break;
      case 'fulltime':
        soundEngine.playWhistle('fulltime');
        break;
      case 'goal':
        soundEngine.playGoal();
        break;
      case 'powerup':
        soundEngine.playPowerup();
        break;
      case 'jump':
        soundEngine.playJump();
        break;
      case 'kick':
        soundEngine.playKick(ev.intensity);
        break;
      case 'overdrive_kick':
        soundEngine.playOverdriveKick();
        break;
      case 'bounce':
        soundEngine.playBounce(ev.speed);
        break;
      case 'crossbar':
        soundEngine.playCrossbar(ev.intensity);
        break;
    }
  }

  public drainAudioEvents(): OnlineSoundEvent[] {
    if (this.pendingAudioEvents.length === 0) return [];
    const copy = this.pendingAudioEvents;
    this.pendingAudioEvents = [];
    return copy;
  }

  private createBall(id: string, isGolden: boolean): BallEntity {
    return {
      id,
      isGolden,
      x: WORLD_WIDTH / 2,
      y: 190,
      vx: 0,
      vy: 0,
      r: isGolden ? 20 : this.mutator.ballRadius,
      angle: 0,
      omega: 0,
      mass: isGolden ? 0.85 : this.mutator.ballMass,
      restitution: isGolden ? 0.88 : this.mutator.ballRestitution,
      drag: this.mutator.ballDrag,
      squashX: 1,
      squashY: 1,
      squashAngle: 0,
      hitFlash: 0,
      lastTouchTeam: null,
      lastTouchTime: 0,
      trail: [],
    };
  }

  private initAmbientParticles(): void {
    this.ambientParticles = [];
    for (let i = 0; i < 65; i++) {
      this.ambientParticles.push({
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * GROUND_Y,
        vx: (Math.random() - 0.5) * 40,
        vy: 20 + Math.random() * 52,
        size: 1.5 + Math.random() * 2.8,
        alpha: 0.25 + Math.random() * 0.65,
      });
    }
  }

  private initDustMotes(): void {
    this.dustMotes = [];
    for (let i = 0; i < 28; i++) {
      this.dustMotes.push({
        x: 120 + Math.random() * (WORLD_WIDTH - 240),
        y: 80 + Math.random() * (GROUND_Y - 140),
        r: 1.2 + Math.random() * 2.2,
        speed: 0.4 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private buildNetNodes(side: 'left' | 'right', goalHeight: number): NetNode[] {
    const nodes: NetNode[] = [];
    const topY = GROUND_Y - goalHeight;
    const segmentsBack = 7;
    const segmentsTop = 4;

    if (side === 'left') {
      const frontX = PITCH_LEFT;
      const backX = PITCH_LEFT - GOAL_DEPTH;
      for (let i = 0; i <= segmentsTop; i++) {
        const t = i / segmentsTop;
        const x = frontX - t * GOAL_DEPTH;
        const y = topY + t * 8;
        nodes.push({
          x,
          y,
          restX: x,
          restY: y,
          vx: 0,
          vy: 0,
          pinned: i === 0 || i === segmentsTop,
        });
      }
      for (let j = 1; j <= segmentsBack; j++) {
        const t = j / segmentsBack;
        const x = backX;
        const y = topY + 8 + t * (goalHeight - 8);
        nodes.push({
          x,
          y,
          restX: x,
          restY: y,
          vx: 0,
          vy: 0,
          pinned: j === segmentsBack,
        });
      }
    } else {
      const frontX = PITCH_RIGHT;
      const backX = PITCH_RIGHT + GOAL_DEPTH;
      for (let i = 0; i <= segmentsTop; i++) {
        const t = i / segmentsTop;
        const x = frontX + t * GOAL_DEPTH;
        const y = topY + t * 8;
        nodes.push({
          x,
          y,
          restX: x,
          restY: y,
          vx: 0,
          vy: 0,
          pinned: i === 0 || i === segmentsTop,
        });
      }
      for (let j = 1; j <= segmentsBack; j++) {
        const t = j / segmentsBack;
        const x = backX;
        const y = topY + 8 + t * (goalHeight - 8);
        nodes.push({
          x,
          y,
          restX: x,
          restY: y,
          vx: 0,
          vy: 0,
          pinned: j === segmentsBack,
        });
      }
    }
    return nodes;
  }

  public startNewMatch(config: MatchConfig, fixedMutator?: MutatorSpec): void {
    this.config = { ...config };
    this.blueScore = 0;
    this.redScore = 0;
    this.blueOverdrive = 0;
    this.redOverdrive = 0;
    this.blueAbilityCharge = 100;
    this.redAbilityCharge = 100;
    this.blueRocketReady = false;
    this.redRocketReady = false;
    this.roundNumber = 1;
    this.lastScorer = null;
    this.winner = null;

    if (config.mode === '2P') {
      // Randomly shuffle players & kits for both teams in 2P mode!
      const bSquad = pickRandomSquad();
      const rSquad = pickRandomSquad([bSquad.keeper.id, bSquad.striker.id]);
      const bKit = pickRandomKit();
      const rKit = pickRandomKit(bKit.id);
      this.blueLineup = config.blueLineup ?? bSquad;
      this.redLineup = config.redLineup ?? rSquad;
      this.blueKit = config.blueKit ?? bKit;
      this.redKit = config.redKit ?? rKit;
      this.opponentLabel = 'RED';
    } else {
      this.blueLineup = config.blueLineup ?? {
        keeper: getPlayerById('sam_wall'),
        striker: getPlayerById('leo_spark'),
      };
      this.redLineup = config.redLineup ?? pickRandomSquad([this.blueLineup.striker.id]);
      this.blueKit = config.blueKit ?? getKitById('azure_club');
      this.redKit = config.redKit ?? pickRandomKit(this.blueKit.id);
      this.opponentLabel = config.opponentName ?? 'CPU';
    }

    this.stats = {
      blueShots: 0,
      redShots: 0,
      crossbarHits: 0,
      airGoals: 0,
      longestVolley: 0,
      fastestShotKmh: 0,
    };

    const initialMutator = fixedMutator ?? MUTATORS.classic_turf;
    this.nextMutator =
      config.twistMode === 'random'
        ? pickNextMutator(initialMutator.id)
        : initialMutator;

    this.pendingAudioEvents = [];
    this.phase = 'PLAYING';
    this.setupRound(initialMutator, true);
    this.emitSound({ type: 'kickoff' });
    this.emitHud();
  }

  public returnToTitle(): void {
    this.phase = 'TITLE_MENU';
    this.blueScore = 0;
    this.redScore = 0;
    this.blueOverdrive = 0;
    this.redOverdrive = 0;
    this.roundNumber = 1;
    this.winner = null;
    this.setupRound(MUTATORS.classic_turf, false);
    this.emitHud();
  }

  public setPhase(nextPhase: GamePhase): void {
    this.phase = nextPhase;
    this.emitHud();
  }

  public setupRound(mutator: MutatorSpec, announce: boolean): void {
    this.mutator = mutator;
    const groundRestY = GROUND_Y - 44;

    this.players = [
      this.createPlayer(
        'blue-keeper',
        this.blueLineup.keeper,
        this.blueKit,
        'blue',
        'keeper',
        265,
        groundRestY,
        1
      ),
      this.createPlayer(
        'blue-striker',
        this.blueLineup.striker,
        this.blueKit,
        'blue',
        'striker',
        495,
        groundRestY,
        1
      ),
      this.createPlayer(
        'red-striker',
        this.redLineup.striker,
        this.redKit,
        'red',
        'striker',
        WORLD_WIDTH - 495,
        groundRestY,
        -1
      ),
      this.createPlayer(
        'red-keeper',
        this.redLineup.keeper,
        this.redKit,
        'red',
        'keeper',
        WORLD_WIDTH - 265,
        groundRestY,
        -1
      ),
    ];

    const mainBall = this.createBall('main', false);
    mainBall.y = 175;
    mainBall.vx = (Math.random() - 0.5) * 90;
    mainBall.vy = 20;
    mainBall.omega = (Math.random() - 0.5) * 4;
    this.balls = [mainBall];

    this.orbs = [];
    this.activePowerup = null;
    this.blueAbilityCharge = 100;
    this.redAbilityCharge = 100;
    this.blueRocketReady = false;
    this.redRocketReady = false;
    this.orbSpawnCooldown = 11.0 + Math.random() * 5.0;
    this.roundElapsed = 0;
    this.rallyCount = 0;

    this.leftGoalHeight = mutator.goalHeight || BASE_GOAL_HEIGHT;
    this.rightGoalHeight = mutator.goalHeight || BASE_GOAL_HEIGHT;
    this.leftNet = this.buildNetNodes('left', this.leftGoalHeight);
    this.rightNet = this.buildNetNodes('right', this.rightGoalHeight);

    this.skidMarks = [];
    this.shockwaves = [];
    this.particles = [];
    this.callouts = [];
    this.currentVolleyCount = 0;
    this.goalTimer = 0;
    this.hitstopTimer = 0;
    this.aiRedJumpCooldown = 0;
    this.aiKeeperJumpCooldown = 0;

    if (announce) {
      this.addCallout(
        this.isMatchPoint()
          ? 'MATCH POINT · ' + mutator.name.toUpperCase()
          : mutator.name.toUpperCase(),
        WORLD_WIDTH / 2,
        140,
        this.isMatchPoint() ? '#fbbf24' : '#f8fafc',
        1.4
      );
    }
  }

  public isMatchPoint(): boolean {
    const t = this.config.targetScore;
    return this.blueScore >= t - 1 || this.redScore >= t - 1;
  }

  private createPlayer(
    id: string,
    profile: PlayerProfile,
    kit: KitSpec,
    team: TeamSide,
    role: 'keeper' | 'striker',
    x: number,
    y: number,
    facing: 1 | -1
  ): PlayerEntity {
    return {
      id,
      profile,
      kit,
      team,
      role,
      number: profile.number,
      x,
      y,
      vx: 0,
      vy: 0,
      angle: facing * 0.05,
      omega: 0,
      legAngle: 0,
      legOmega: 0,
      kickTimer: 0,
      headBobAngle: 0,
      headBobOmega: 0,
      grounded: true,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      squashX: 1,
      squashY: 1,
      hitFlash: 0,
      homeX: x,
      facing,
      shotIntent: 'standard',
    };
  }

  public getTeamActiveAbility(team: TeamSide): {
    player: PlayerProfile;
    abilityId: PlayerAbilityId;
    abilityName: string;
  } {
    const lineup = team === 'blue' ? this.blueLineup : this.redLineup;
    const useKeeper =
      team === 'blue'
        ? this.config.bluePowerupRole === 'keeper'
        : this.config.redPowerupRole === 'keeper';
    const captain = useKeeper ? lineup.keeper : lineup.striker;
    return {
      player: captain,
      abilityId: captain.abilityId,
      abilityName: captain.abilityName,
    };
  }

  public getHudSnapshot(): HudSnapshot {
    const blueAb = this.getTeamActiveAbility('blue');
    const redAb = this.getTeamActiveAbility('red');
    return {
      blueScore: this.blueScore,
      redScore: this.redScore,
      blueOverdrive: Math.round(this.blueOverdrive),
      redOverdrive: Math.round(this.redOverdrive),
      blueAbilityCharge: Math.round(this.blueAbilityCharge),
      redAbilityCharge: Math.round(this.redAbilityCharge),
      blueAbilityName: blueAb.abilityName,
      redAbilityName: redAb.abilityName,
      blueLineupNames: `${this.blueLineup.keeper.nickname} & ${this.blueLineup.striker.nickname}`,
      redLineupNames: `${this.redLineup.keeper.nickname} & ${this.redLineup.striker.nickname}`,
      opponentLabel: this.opponentLabel,
      rallyCount: this.rallyCount,
      roundNumber: this.roundNumber,
      mutator: this.mutator,
      activePowerup: this.activePowerup ? { ...this.activePowerup } : null,
      isMatchPoint: this.isMatchPoint(),
      lastScorer: this.lastScorer,
      lastGoalPoints: this.lastGoalPoints,
      lastGoalSpeedKmh: this.lastGoalSpeedKmh,
      isOwnGoal: this.isOwnGoal,
      goalTypeLabel: this.goalTypeLabel,
      nextMutator: this.nextMutator,
      stats: { ...this.stats },
      winner: this.winner,
    };
  }

  private emitHud(): void {
    this.onHudChange?.(this.getHudSnapshot());
  }

  public step(rawDt: number, blueInput: TeamInput, redInput: TeamInput): void {
    const clampedDt = Math.min(rawDt, 0.05);
    if (
      this.phase === 'TITLE_MENU' ||
      this.phase === 'CAREER_HUB' ||
      this.phase === 'PAUSED' ||
      this.phase === 'GAME_OVER'
    ) {
      return;
    }

    this.time += clampedDt;
    this.roundElapsed += clampedDt;
    this.kickSoundCooldown = Math.max(0, this.kickSoundCooldown - clampedDt);
    this.bounceSoundCooldown = Math.max(0, this.bounceSoundCooldown - clampedDt);
    this.crowdExcitement = Math.max(0, this.crowdExcitement - clampedDt * 0.52);
    this.flashAlpha = Math.max(0, this.flashAlpha - clampedDt * 2.8);

    // Recharge activatable team power-ups steadily (100% every ~9s, faster on ball touches)
    if (this.phase === 'PLAYING') {
      this.blueAbilityCharge = Math.min(100, this.blueAbilityCharge + clampedDt * 11);
      this.redAbilityCharge = Math.min(100, this.redAbilityCharge + clampedDt * 11);
    }

    for (const b of this.balls) {
      const ballSpeed = Math.hypot(b.vx, b.vy);
      if (ballSpeed > 520 && (b.x < 340 || b.x > WORLD_WIDTH - 340)) {
        this.crowdExcitement = Math.max(this.crowdExcitement, 0.52);
      }
    }
    if (this.rallyCount >= 4) {
      this.crowdExcitement = Math.max(this.crowdExcitement, 0.35);
    }

    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - clampedDt);
    }

    this.updateParticles(clampedDt);
    this.updateShockwaves(clampedDt);
    this.updateSkidMarks(clampedDt);
    this.updateCallouts(clampedDt);
    this.updateAmbientParticles(clampedDt);

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - clampedDt);
      return;
    }

    if (this.phase === 'GOAL_CELEBRATION') {
      this.goalTimer += clampedDt;
      const slowDt = clampedDt * 0.42;
      this.stepSimulation(
        slowDt,
        { jumpHeld: false, jumpJustPressed: false, lean: 0, abilityJustPressed: false },
        { jumpHeld: false, jumpJustPressed: false, lean: 0, abilityJustPressed: false }
      );

      if (this.goalTimer >= 1.85) {
        if (this.blueScore >= this.config.targetScore || this.redScore >= this.config.targetScore) {
          this.winner = this.blueScore > this.redScore ? 'blue' : 'red';
          this.phase = 'GAME_OVER';
          this.emitSound({ type: 'fulltime' });
          this.emitHud();
          this.onMatchEnd?.(this.winner, this.getHudSnapshot());
        } else {
          this.roundNumber += 1;
          const activeMutator = this.nextMutator;
          this.nextMutator =
            this.config.twistMode === 'random'
              ? pickNextMutator(activeMutator.id)
              : activeMutator;
          this.phase = 'PLAYING';
          this.setupRound(activeMutator, true);
          this.emitSound({ type: 'kickoff' });
          this.emitHud();
        }
      }
      return;
    }

    this.stepEngagementDirector(clampedDt);
    this.stepGoalHeights(clampedDt);

    const isCpu = this.config.mode === '1P' || this.config.mode === 'career';
    const resolvedRed = isCpu
      ? this.computeCalculatedCpuInput('red', this.config.difficulty, clampedDt)
      : redInput;

    // Handle Activatable Team Power-Ups
    if (blueInput.abilityJustPressed && this.blueAbilityCharge >= 100) {
      this.activatePlayerAbility('blue');
    }
    if (resolvedRed.abilityJustPressed && this.redAbilityCharge >= 100) {
      this.activatePlayerAbility('red');
    }

    this.stepSimulation(clampedDt, blueInput, resolvedRed);

    this.hudSyncCooldown -= clampedDt;
    if (this.hudSyncCooldown <= 0) {
      this.hudSyncCooldown = 0.1;
      this.emitHud();
    }
  }

  private activatePlayerAbility(team: TeamSide): void {
    const { player, abilityId, abilityName } = this.getTeamActiveAbility(team);
    if (team === 'blue') this.blueAbilityCharge = 0;
    else this.redAbilityCharge = 0;

    this.emitSound({ type: 'powerup' });
    const myPlayers = this.players.filter((p) => p.team === team);
    const striker = myPlayers.find((p) => p.role === 'striker') ?? myPlayers[0];
    const teamColor = team === 'blue' ? this.blueKit.primary : this.redKit.primary;

    this.spawnShockwave(striker.x, striker.y, 110, teamColor, 4);
    this.addCallout(abilityName.toUpperCase() + '!', striker.x, striker.y - 54, '#fbbf24', 1.15);

    switch (abilityId) {
      case 'rocket_volley': {
        if (team === 'blue') this.blueRocketReady = true;
        else this.redRocketReady = true;
        break;
      }
      case 'titan_anchor': {
        this.activePowerup = {
          type: 'titan_anchor',
          owner: team,
          label: `${player.nickname}: Titan Anchor`,
          remaining: 6,
          duration: 6,
        };
        // Shockwave clears nearby balls away from own goal
        for (const b of this.balls) {
          const dist = Math.hypot(b.x - striker.x, b.y - striker.y);
          if (dist < 220) {
            b.vx += striker.facing * 420;
            b.vy -= 220;
          }
        }
        break;
      }
      case 'dash_surge': {
        for (const p of myPlayers) {
          const dir = Math.sign(this.ball.x - p.x) || p.facing;
          p.vx = dir * 560;
          p.vy = Math.min(p.vy, -180);
          p.kickTimer = 0.28;
          p.legOmega = 26;
        }
        break;
      }
      case 'sky_leap': {
        for (const p of myPlayers) {
          p.vy = -this.mutator.jumpPower * 1.25;
          p.grounded = false;
          p.kickTimer = 0.3;
          p.legOmega = 28;
          p.omega += -p.facing * 6;
        }
        break;
      }
      case 'hammer_header': {
        this.activePowerup = {
          type: 'hammer_header',
          owner: team,
          label: `${player.nickname}: Hammer Header`,
          remaining: 6.5,
          duration: 6.5,
        };
        break;
      }
      case 'cryo_pulse': {
        this.activePowerup = {
          type: 'freeze',
          owner: team,
          label: `${player.nickname}: Cryo Freeze`,
          remaining: 5.5,
          duration: 5.5,
        };
        break;
      }
      case 'magnet_boot': {
        this.activePowerup = {
          type: 'magnet',
          owner: team,
          label: `${player.nickname}: Magnet Boot`,
          remaining: 6.5,
          duration: 6.5,
        };
        break;
      }
      case 'goal_shield': {
        this.activePowerup = {
          type: 'goal_shield',
          owner: team,
          label: `${player.nickname}: Goal Shield`,
          remaining: 7,
          duration: 7,
        };
        break;
      }
      case 'golden_strike': {
        if (this.balls.length < 2) {
          const golden = this.createBall('golden-' + Math.round(this.time * 10), true);
          golden.x = striker.x + striker.facing * 42;
          golden.y = striker.y - 36;
          golden.vx = striker.facing * 320;
          golden.vy = -260;
          this.balls.push(golden);
        }
        this.activePowerup = {
          type: 'golden_ball',
          owner: team,
          label: `${player.nickname}: Golden Ball (+2)`,
          remaining: 9,
          duration: 9,
        };
        break;
      }
      case 'overdrive_nova': {
        if (team === 'blue') this.blueOverdrive = 100;
        else this.redOverdrive = 100;
        for (const b of this.balls) {
          const dx = b.x - striker.x;
          const dy = b.y - striker.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 240 && dist > 1) {
            b.vx += (dx / dist) * 480;
            b.vy += (dy / dist) * 320 - 140;
          }
        }
        break;
      }
    }
    this.emitHud();
  }

  private stepEngagementDirector(dt: number): void {
    if (this.activePowerup) {
      this.activePowerup.remaining -= dt;
      if (this.activePowerup.remaining <= 0) {
        this.activePowerup = null;
        this.emitHud();
      }
    }

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const o = this.orbs[i];
      o.life += dt;
      o.phase += dt * 3.2;
      o.y = o.baseY + Math.sin(o.phase) * 14;
      if (o.life >= o.maxLife) {
        this.orbs.splice(i, 1);
      }
    }

    this.orbSpawnCooldown -= dt;
    if (this.orbSpawnCooldown <= 0 && this.orbs.length === 0 && !this.activePowerup) {
      const canSpawnGolden =
        this.roundElapsed >= 16 && !this.balls.some((b) => b.isGolden);
      const standardPool: OrbType[] = ['giant_goal', 'magnet', 'freeze'];
      const chosen: OrbType =
        canSpawnGolden && Math.random() < 0.08
          ? 'golden_ball'
          : standardPool[Math.floor(Math.random() * standardPool.length)];

      const scoreDiff = this.blueScore - this.redScore;
      const biasX = clamp(scoreDiff * 45, -140, 140);
      const x = WORLD_WIDTH / 2 + biasX + (Math.random() - 0.5) * 160;
      const baseY = 260 + Math.random() * 140;

      this.orbs.push({
        type: chosen,
        label: ORB_META[chosen].label,
        x,
        y: baseY,
        baseY,
        r: 22,
        phase: 0,
        life: 0,
        maxLife: 11,
      });
      this.spawnShockwave(x, baseY, 55, ORB_META[chosen].color, 2.5);
      this.orbSpawnCooldown = 15.5 + Math.random() * 6.5;
    }
  }

  private stepGoalHeights(dt: number): void {
    const baseH = this.mutator.goalHeight || BASE_GOAL_HEIGHT;
    let targetLeft = baseH;
    let targetRight = baseH;

    if (this.activePowerup?.type === 'giant_goal') {
      if (this.activePowerup.owner === 'red') targetLeft = baseH + 78;
      else targetRight = baseH + 78;
    } else if (this.activePowerup?.type === 'goal_shield') {
      if (this.activePowerup.owner === 'blue') targetLeft = Math.max(105, baseH * 0.68);
      else targetRight = Math.max(105, baseH * 0.68);
    }

    const prevLeft = this.leftGoalHeight;
    const prevRight = this.rightGoalHeight;
    this.leftGoalHeight += (targetLeft - this.leftGoalHeight) * Math.min(1, dt * 6);
    this.rightGoalHeight += (targetRight - this.rightGoalHeight) * Math.min(1, dt * 6);

    if (Math.abs(this.leftGoalHeight - prevLeft) > 0.2) {
      this.leftNet = this.buildNetNodes('left', this.leftGoalHeight);
    }
    if (Math.abs(this.rightGoalHeight - prevRight) > 0.2) {
      this.rightNet = this.buildNetNodes('right', this.rightGoalHeight);
    }
  }

  /**
   * Shared physics impulse calculation used by both live kicks and the AI shot-solver.
   */
  private computeKickVelocity(
    p: PlayerEntity,
    b: BallEntity,
    intent: 'standard' | 'low_drive' | 'chip',
    isOverdrive: boolean,
    nx: number,
    ny: number
  ): { vx: number; vy: number; omega: number } {
    const styleSpeedMult =
      intent === 'low_drive' ? 1.13 : intent === 'chip' ? 0.94 : 1.02;
    const powerMult =
      (isOverdrive ? 1.44 : 1.0) * p.profile.kickMult * styleSpeedMult;
    const kickStrength = (785 * powerMult) / Math.sqrt(b.mass);

    const baseX = intent === 'chip' ? 0.66 : intent === 'low_drive' ? 0.96 : 0.84;
    const baseY = intent === 'chip' ? -0.94 : intent === 'low_drive' ? -0.21 : -0.54;
    const kickDirX = p.facing * baseX + nx * 0.26;
    const kickDirY = baseY + ny * 0.2;
    const len = Math.hypot(kickDirX, kickDirY) || 1;

    const vx = (kickDirX / len) * kickStrength + p.vx * 0.4;
    const vy = (kickDirY / len) * kickStrength + Math.min(0, p.vy * 0.35);
    const baseSpin =
      intent === 'chip'
        ? p.facing * 15
        : intent === 'low_drive'
          ? -p.facing * 6
          : p.facing * 10;
    const omega = isOverdrive ? p.facing * 19 : baseSpin;
    return { vx, vy, omega };
  }

  /**
   * Full-Arena Engine Physics Simulation for AI Decision-Making:
   * Simulates gravity, Magnus spin, drag, ground friction bounces, ceiling/wall rebounds,
   * and goal-line crossing times/heights for BOTH goals.
   */
  private simulateBallPath(
    ball: BallEntity,
    horizonSec: number,
    steps = 50
  ): {
    points: BallSimPoint[];
    redGoalCrossT: number | null;
    redGoalCrossY: number | null;
    blueGoalCrossT: number | null;
    blueGoalCrossY: number | null;
  } {
    const dt = horizonSec / steps;
    const g = this.mutator.gravity;
    const dragPow = Math.pow(ball.drag, dt * 60);
    const groundFricPow = Math.pow(this.mutator.groundFriction, 0.25);
    const leftTopY = GROUND_Y - this.leftGoalHeight;
    const rightTopY = GROUND_Y - this.rightGoalHeight;

    let x = ball.x;
    let y = ball.y;
    let vx = ball.vx;
    let vy = ball.vy;
    const omega = ball.omega;
    const points: BallSimPoint[] = [];
    let redGoalCrossT: number | null = null;
    let redGoalCrossY: number | null = null;
    let blueGoalCrossT: number | null = null;
    let blueGoalCrossY: number | null = null;

    for (let i = 1; i <= steps; i++) {
      const t = i * dt;
      const ax = omega * vy * 0.00032;
      const ay = g - omega * vx * 0.00032;
      vx = (vx + ax * dt) * dragPow;
      vy = (vy + ay * dt) * dragPow;
      x += vx * dt;
      y += vy * dt;

      if (y + ball.r > GROUND_Y) {
        y = GROUND_Y - ball.r;
        vy = -Math.abs(vy) * ball.restitution;
        if (Math.abs(vy) < 42) vy = 0;
        vx *= groundFricPow;
      }
      if (y - ball.r < 24) {
        y = 24 + ball.r;
        vy = Math.abs(vy) * ball.restitution;
      }
      if (x + ball.r > PITCH_RIGHT && y < rightTopY - 6) {
        x = PITCH_RIGHT - ball.r;
        vx = -Math.abs(vx) * ball.restitution;
      }
      if (x - ball.r < PITCH_LEFT && y < leftTopY - 6) {
        x = PITCH_LEFT + ball.r;
        vx = Math.abs(vx) * ball.restitution;
      }
      if (x >= PITCH_RIGHT - ball.r && y > rightTopY + 4 && redGoalCrossT === null) {
        redGoalCrossT = t;
        redGoalCrossY = y;
      }
      if (x <= PITCH_LEFT + ball.r && y > leftTopY + 4 && blueGoalCrossT === null) {
        blueGoalCrossT = t;
        blueGoalCrossY = y;
      }

      points.push({ t, x, y, vx, vy });
    }

    return { points, redGoalCrossT, redGoalCrossY, blueGoalCrossT, blueGoalCrossY };
  }

  private getBaseWalkSpeed(p: PlayerEntity): number {
    const base = this.mutator.id === 'beach_volley' ? 365 : 445;
    return base * p.profile.speedMult;
  }

  /**
   * Computes minimum time for player `p` to reach target `(targetX, targetY)`,
   * accounting for current momentum, direction-reversal braking, sprint speed,
   * and single-jump height curve.
   */
  private estimatePlayerReachTime(
    p: PlayerEntity,
    targetX: number,
    targetY: number
  ): { reachable: boolean; time: number; needsJump: boolean } {
    const walkSpeed = this.getBaseWalkSpeed(p);
    const dx = targetX - p.x;
    const dist = Math.abs(dx);
    const desiredDir = Math.sign(dx);

    let timeX = dist / Math.max(220, walkSpeed);
    if (desiredDir !== 0 && Math.sign(p.vx) === -desiredDir && Math.abs(p.vx) > 40) {
      timeX += Math.abs(p.vx) / 1450;
    } else if (desiredDir !== 0 && Math.sign(p.vx) === desiredDir && Math.abs(p.vx) > 80) {
      timeX *= 0.85;
    }

    const groundFootY = GROUND_Y - 20;
    if (targetY >= GROUND_Y - 78) {
      return { reachable: true, time: timeX, needsJump: false };
    }

    const g = this.mutator.gravity;
    const jumpVy = this.mutator.jumpPower * p.profile.jumpMult;
    const maxRise = (jumpVy * jumpVy) / (2 * g);
    const maxHeadReachY = GROUND_Y - 44 - 34 - maxRise - 24;

    if (targetY < maxHeadReachY) {
      return { reachable: false, time: Infinity, needsJump: true };
    }

    // Solve y(t) rise from foot/head center
    const riseNeeded = Math.max(0, groundFootY - 38 - targetY);
    const disc = Math.max(0, jumpVy * jumpVy - 2 * g * riseNeeded);
    const tJump = Math.max(0.06, (jumpVy - Math.sqrt(disc)) / g);

    return { reachable: true, time: Math.max(timeX, tJump), needsJump: true };
  }

  /**
   * Finds the earliest (fastest-route) point along the simulated ball trajectory
   * that player `p` can intercept, or the best landing/pursuit point if out of reach.
   */
  private findFastestBallIntercept(
    p: PlayerEntity,
    simPoints: BallSimPoint[],
    offsetX: number,
    maxT = 1.35
  ): {
    t: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    needsJump: boolean;
    reachableInTime: boolean;
  } {
    let fallbackPt = simPoints[simPoints.length - 1] ?? {
      t: 0.25,
      x: p.x,
      y: GROUND_Y - 22,
      vx: 0,
      vy: 0,
    };
    let bestMargin = Infinity;

    for (const pt of simPoints) {
      if (pt.t > maxT) break;
      const strikeX = clamp(pt.x + offsetX, PITCH_LEFT + 14, PITCH_RIGHT - 14);
      const reach = this.estimatePlayerReachTime(p, strikeX, pt.y);

      if (reach.reachable && reach.time <= pt.t + 0.035) {
        return {
          t: pt.t,
          x: pt.x,
          y: pt.y,
          vx: pt.vx,
          vy: pt.vy,
          needsJump: reach.needsJump,
          reachableInTime: true,
        };
      }

      if (reach.reachable) {
        const deficit = reach.time - pt.t;
        if (deficit < bestMargin) {
          bestMargin = deficit;
          fallbackPt = pt;
        }
      }
    }

    return {
      t: fallbackPt.t,
      x: fallbackPt.x,
      y: fallbackPt.y,
      vx: fallbackPt.vx,
      vy: fallbackPt.vy,
      needsJump: fallbackPt.y < GROUND_Y - 78,
      reachableInTime: false,
    };
  }

  /**
   * Simulates EVERY viable scoring route through the real physics engine:
   * - Grounded & Jump-Elevated strikes across 'low_drive', 'standard', and 'chip'
   * - Ceiling/crossbar rebounds (handled natively by simulateBallPath)
   * - Defender jump-block interception checks & own-goal safety verification
   */
  private evaluateAllScoringRoutes(
    shooter: PlayerEntity,
    ball: BallEntity,
    difficulty: CpuDifficulty
  ): {
    bestIntent: 'standard' | 'low_drive' | 'chip';
    useJumpShot: boolean;
    scoresCleanly: boolean;
    isOwnGoalRisk: boolean;
    bestScore: number;
  } {
    const intents: Array<'low_drive' | 'standard' | 'chip'> = [
      'low_drive',
      'standard',
      'chip',
    ];
    const postures: Array<{ isJumpShot: boolean; yShift: number; vyPlayer: number }> = [
      { isJumpShot: false, yShift: 0, vyPlayer: shooter.vy },
      {
        isJumpShot: true,
        yShift: -34,
        vyPlayer: -this.mutator.jumpPower * shooter.profile.jumpMult * 0.72,
      },
    ];

    const bluePlayers = this.players.filter((p) => p.team === 'blue');
    const isOverdrive = this.redOverdrive >= 100 || this.redRocketReady;
    const dx = ball.x - shooter.x;
    const dy = ball.y - (shooter.y + 14);
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    let bestIntent: 'standard' | 'low_drive' | 'chip' = 'standard';
    let bestUseJump = false;
    let bestScore = -Infinity;
    let scoresCleanly = false;
    let isOwnGoalRisk = false;

    for (const posture of postures) {
      if (posture.isJumpShot && !shooter.grounded) continue;
      if (posture.isJumpShot && difficulty === 'casual') continue;

      const virtualShooter: PlayerEntity = posture.isJumpShot
        ? {
            ...shooter,
            y: shooter.y + posture.yShift,
            vy: posture.vyPlayer,
            vx: clamp(shooter.vx + shooter.facing * 120, -640, 640),
          }
        : shooter;

      for (const intent of intents) {
        const k = this.computeKickVelocity(virtualShooter, ball, intent, isOverdrive, nx, ny);
        const mockBall: BallEntity = {
          ...ball,
          y: Math.min(ball.y, GROUND_Y - ball.r),
          vx: k.vx,
          vy: k.vy,
          omega: k.omega,
        };
        const sim = this.simulateBallPath(mockBall, 1.35, 36);

        if (sim.redGoalCrossT !== null) {
          isOwnGoalRisk = true;
          continue;
        }

        let blocked = false;
        let minDefDist = 999;
        for (const pt of sim.points) {
          for (const bp of bluePlayers) {
            const predBpX = clamp(
              bp.x + bp.vx * Math.min(pt.t, 0.36),
              PITCH_LEFT,
              PITCH_RIGHT
            );
            // Model Blue defender jump-block capability on Pro/Chaos
            const blueCanJumpBlock =
              difficulty !== 'casual' &&
              bp.grounded &&
              pt.t > 0.14 &&
              pt.t < 0.45 &&
              Math.abs(pt.x - predBpX) < 62 &&
              pt.y > GROUND_Y - 155;
            const predBpY = blueCanJumpBlock
              ? Math.max(GROUND_Y - 145, pt.y)
              : bp.grounded
                ? bp.y
                : Math.min(
                    GROUND_Y - 44,
                    bp.y + bp.vy * pt.t + 0.5 * this.mutator.gravity * pt.t * pt.t
                  );
            const d = Math.hypot(pt.x - predBpX, pt.y - (predBpY - 12));
            if (d < minDefDist) minDefDist = d;
            if (d < ball.r + 24 && pt.x > PITCH_LEFT + 18) {
              blocked = true;
              break;
            }
          }
          if (blocked) break;
        }

        let score = 0;
        if (sim.blueGoalCrossT !== null) {
          const topClearance =
            (sim.blueGoalCrossY ?? GROUND_Y) - (GROUND_Y - this.leftGoalHeight);
          const bottomCornerBonus = (sim.blueGoalCrossY ?? GROUND_Y) > GROUND_Y - 70 ? 55 : 0;
          score +=
            1350 -
            sim.blueGoalCrossT * 280 +
            Math.min(50, topClearance * 0.5) +
            bottomCornerBonus;
          if (!blocked) {
            score += 650;
            scoresCleanly = true;
          }
        } else {
          const endPt = sim.points[sim.points.length - 1];
          const nearGoalScore = (WORLD_WIDTH - (endPt?.x ?? ball.x)) * 0.48;
          score += nearGoalScore;
        }

        if (blocked) score -= 540;
        if (posture.isJumpShot && !blocked && sim.blueGoalCrossT !== null) score += 45;
        score += Math.min(140, minDefDist * 0.65);

        if (score > bestScore) {
          bestScore = score;
          bestIntent = intent;
          bestUseJump = posture.isJumpShot;
        }
      }
    }

    return {
      bestIntent,
      useJumpShot: bestUseJump,
      scoresCleanly,
      isOwnGoalRisk: isOwnGoalRisk && bestScore === -Infinity,
      bestScore,
    };
  }

  /**
   * Evaluates whether jumping now for a given player intersects the simulated ball path
   * at a valid strike/save window.
   */
  private willJumpInterceptBall(
    p: PlayerEntity,
    ballPath: BallSimPoint[],
    minT: number,
    maxT: number,
    isDefending: boolean,
    leanDir: -1 | 0 | 1
  ): boolean {
    if (!p.grounded && p.coyoteTimer <= 0) return false;
    const g = this.mutator.gravity;
    const jumpVy = -this.mutator.jumpPower * p.profile.jumpMult;
    const leanImpulse =
      leanDir !== 0
        ? leanDir * 295 * p.profile.speedMult
        : Math.sin(p.angle) * 320 + p.facing * 95;
    const jumpVx = clamp(p.vx + leanImpulse, -640, 640);

    for (const pt of ballPath) {
      if (pt.t < minT || pt.t > maxT) continue;
      const px = clamp(p.x + jumpVx * pt.t, PITCH_LEFT - 18, PITCH_RIGHT + 18);
      const py = Math.min(GROUND_Y - 44, p.y + jumpVy * pt.t + 0.5 * g * pt.t * pt.t);

      const footDist = Math.hypot(pt.x - (px + p.facing * 18), pt.y - (py + 16));
      const headDist = Math.hypot(pt.x - px, pt.y - (py - 32));
      const strikeRadius = isDefending ? 52 : 44;

      if (footDist <= strikeRadius || headDist <= (isDefending ? 46 : 38)) {
        const ballBehindPlayer = pt.x > px + 18;
        if (!ballBehindPlayer || isDefending) {
          return true;
        }
      }
    }
    return false;
  }

  private computeCalculatedCpuInput(
    team: TeamSide,
    difficulty: CpuDifficulty,
    dt: number
  ): TeamInput {
    this.aiRedJumpCooldown = Math.max(0, this.aiRedJumpCooldown - dt);
    this.aiKeeperJumpCooldown = Math.max(0, this.aiKeeperJumpCooldown - dt);

    const myPlayers = this.players.filter((p) => p.team === team);
    const striker = myPlayers.find((p) => p.role === 'striker') ?? myPlayers[0];
    const keeper = myPlayers.find((p) => p.role === 'keeper') ?? myPlayers[0];
    const bluePlayers = this.players.filter((p) => p.team === 'blue');

    // 1. Simulate EVERY active ball over 1.35s (60 steps) to rank urgency & opportunities
    let primarySim = this.simulateBallPath(this.balls[0], 1.35, 60);
    let targetBall = this.balls[0];
    let bestPriority = -Infinity;

    for (const b of this.balls) {
      const sim = this.simulateBallPath(b, 1.35, 60);
      const threatUrgency =
        sim.redGoalCrossT !== null ? 1800 / Math.max(0.08, sim.redGoalCrossT) : 0;
      const attackChance = b.x < WORLD_WIDTH * 0.58 && b.vx < 90 ? 360 : 0;
      const goldenBonus = b.isGolden ? 380 : 0;
      const priority = threatUrgency + attackChance + goldenBonus + (WORLD_WIDTH - b.x) * 0.25;
      if (priority > bestPriority) {
        bestPriority = priority;
        primarySim = sim;
        targetBall = b;
      }
    }

    // 2. Compute fastest routes to ball for Red Striker, Red Keeper & nearest Blue opponent
    const strikerRoute = this.findFastestBallIntercept(striker, primarySim.points, 20, 1.35);
    const keeperRoute = this.findFastestBallIntercept(keeper, primarySim.points, 22, 1.35);
    let blueFastestT = Infinity;
    let nearestBlueDist = 999;
    let blueDeepestX = PITCH_LEFT + 200;

    for (const bp of bluePlayers) {
      const d = Math.hypot(bp.x - targetBall.x, bp.y - targetBall.y);
      if (d < nearestBlueDist) nearestBlueDist = d;
      if (bp.x < blueDeepestX) blueDeepestX = bp.x;
      const r = this.findFastestBallIntercept(bp, primarySim.points, -18, 1.2);
      if (r.reachableInTime && r.t < blueFastestT) {
        blueFastestT = r.t;
      }
    }

    const strikerBehindBall = targetBall.x > striker.x + 14;
    const keeperBehindBall = targetBall.x > keeper.x + 12;
    const isThreat =
      primarySim.redGoalCrossT !== null ||
      (targetBall.x > WORLD_WIDTH * 0.66 && targetBall.vx > -60);

    const reactionCadence =
      difficulty === 'chaos' ? 0.045 : difficulty === 'pro' ? 0.09 : 0.20;
    const minWin = difficulty === 'chaos' ? 0.02 : 0.03;
    const maxWin = difficulty === 'chaos' ? 0.52 : difficulty === 'pro' ? 0.42 : 0.28;

    // =========================================================================
    // 3. INDEPENDENT STRIKER BRAIN: Fastest Route + Every Scoring Technique
    // =========================================================================
    const strikerShotPlan = this.evaluateAllScoringRoutes(striker, targetBall, difficulty);
    let strikerIntent: 'standard' | 'low_drive' | 'chip' = strikerShotPlan.bestIntent;
    if (difficulty === 'casual' && Math.random() < 0.3) {
      strikerIntent = 'standard';
    }

    let strikerLean: -1 | 0 | 1 = 0;
    let strikerJump = false;

    const strikerFootX = striker.x - 18;
    const strikerFootY = striker.y + 14;
    const strikerHorizBootDist = Math.abs(targetBall.x - strikerFootX);
    const strikerVertBootDist = Math.abs(targetBall.y - strikerFootY);

    if (strikerBehindBall) {
      // Striker is on the wrong side (to the left of the ball):
      // Sprint RIGHT along the fastest route past the ball to get goal-side!
      const recoveryTargetX = clamp(
        strikerRoute.x + 28,
        PITCH_LEFT + 95,
        PITCH_RIGHT - 75
      );
      const err = recoveryTargetX - striker.x;
      if (Math.abs(err) > 6) strikerLean = err > 0 ? 1 : -1;

      // Hop cleanly over a low rolling ball if trapped close on the wrong side
      if (
        striker.grounded &&
        this.aiRedJumpCooldown <= 0 &&
        targetBall.x - striker.x > 10 &&
        targetBall.x - striker.x < 48 &&
        targetBall.y > GROUND_Y - 58 &&
        Math.abs(targetBall.vx) < 220
      ) {
        strikerJump = true;
        strikerLean = 1;
        this.aiRedJumpCooldown = reactionCadence * 1.4;
      }
    } else {
      // Striker is goal-side (right of the ball) — pursue intercept or Chaos Orb!
      const orbOpportunity =
        this.orbs.length > 0 &&
        difficulty !== 'casual' &&
        Math.abs(this.orbs[0].x - striker.x) < 175 &&
        blueFastestT > strikerRoute.t + 0.16 &&
        !isThreat;

      // Decide between crisp Dribble-Walk-In vs Direct Strike Offset
      const wantDribblePush =
        !strikerShotPlan.scoresCleanly &&
        targetBall.x > WORLD_WIDTH * 0.56 &&
        nearestBlueDist > 125 &&
        targetBall.y > GROUND_Y - 56;

      const desiredOffset = wantDribblePush ? 10 : 18;
      const desiredX = orbOpportunity
        ? this.orbs[0].x
        : clamp(strikerRoute.x + desiredOffset, PITCH_LEFT + 48, PITCH_RIGHT - 68);
      const err = desiredX - striker.x;
      if (Math.abs(err) > 5) strikerLean = err > 0 ? 1 : -1;

      // Instant boot-contact strike (exact reach check so we NEVER jump over ground balls!)
      const instantBootHit =
        !strikerShotPlan.isOwnGoalRisk &&
        strikerHorizBootDist <= 34 &&
        strikerVertBootDist <= 34 &&
        (strikerShotPlan.scoresCleanly ||
          targetBall.x < WORLD_WIDTH * 0.78 ||
          nearestBlueDist < 120 ||
          blueFastestT < strikerRoute.t + 0.14 ||
          blueDeepestX > PITCH_LEFT + 320);

      // Pinch-break chip if deadlocked nose-to-nose with a Blue defender
      const pinchDeadlock =
        striker.grounded &&
        Math.abs(striker.vx) < 40 &&
        Math.hypot(targetBall.x - striker.x, targetBall.y - striker.y) < 56 &&
        nearestBlueDist < 72;

      // Mid-air volley / bicycle kick while already airborne
      const midAirVolley =
        !striker.grounded &&
        striker.kickTimer <= 0.02 &&
        Math.hypot(targetBall.x - strikerFootX, targetBall.y - striker.y) < 62;

      if (instantBootHit || midAirVolley) {
        strikerJump = true;
        this.aiRedJumpCooldown = reactionCadence * 0.7;
      } else if (pinchDeadlock) {
        strikerJump = true;
        strikerIntent = 'chip';
        this.aiRedJumpCooldown = reactionCadence * 1.1;
      } else if (this.aiRedJumpCooldown <= 0 && !strikerShotPlan.isOwnGoalRisk) {
        const jumpShotReady =
          strikerShotPlan.useJumpShot &&
          striker.grounded &&
          strikerHorizBootDist < 62 &&
          targetBall.y > GROUND_Y - 82;

        const aerialInterceptReady =
          (strikerRoute.needsJump || strikerShotPlan.scoresCleanly || targetBall.y < GROUND_Y - 76) &&
          this.willJumpInterceptBall(
            striker,
            primarySim.points,
            minWin,
            maxWin,
            false,
            strikerLean
          );

        if (jumpShotReady || aerialInterceptReady) {
          strikerJump = true;
          this.aiRedJumpCooldown = reactionCadence * (0.75 + Math.random() * 0.3);
        }
      }
    }

    // =========================================================================
    // 4. INDEPENDENT KEEPER BRAIN: Shot-Stopping Angle + Sweeper Clearance
    // =========================================================================
    const keeperShotPlan = this.evaluateAllScoringRoutes(keeper, targetBall, difficulty);
    let keeperIntent: 'standard' | 'low_drive' | 'chip' = keeperShotPlan.bestIntent;
    let keeperLean: -1 | 0 | 1 = 0;
    let keeperJump = false;

    const keeperFootX = keeper.x - 18;
    const keeperFootY = keeper.y + 14;
    const keeperHorizBootDist = Math.abs(targetBall.x - keeperFootX);
    const keeperVertBootDist = Math.abs(targetBall.y - keeperFootY);

    const sweeperActive =
      strikerBehindBall && !keeperBehindBall && targetBall.x > WORLD_WIDTH * 0.42;

    if (primarySim.redGoalCrossT !== null) {
      // Shot incoming toward Red's net! Sprint to goal line & calculate save jump
      const saveTargetX = clamp(
        primarySim.redGoalCrossT < 0.45 ? PITCH_RIGHT - 34 : keeperRoute.x + 18,
        WORLD_WIDTH * 0.68,
        PITCH_RIGHT - 24
      );
      const err = saveTargetX - keeper.x;
      if (Math.abs(err) > 6) keeperLean = err > 0 ? 1 : -1;

      const imminentCrossSave =
        primarySim.redGoalCrossT < 0.44 &&
        primarySim.redGoalCrossY !== null &&
        primarySim.redGoalCrossY < GROUND_Y - 56 &&
        Math.abs(keeper.x - PITCH_RIGHT) < 150;

      if (!keeperBehindBall && keeperHorizBootDist <= 36 && keeperVertBootDist <= 36) {
        keeperJump = true;
        keeperIntent = 'chip';
        this.aiKeeperJumpCooldown = reactionCadence;
      } else if (
        this.aiKeeperJumpCooldown <= 0 &&
        (imminentCrossSave ||
          this.willJumpInterceptBall(
            keeper,
            primarySim.points,
            minWin,
            maxWin,
            true,
            keeperLean
          ))
      ) {
        keeperJump = true;
        this.aiKeeperJumpCooldown = reactionCadence;
      }
    } else if (sweeperActive) {
      // Striker was beaten — Keeper becomes active sweeper/finisher!
      const sweepX = clamp(keeperRoute.x + 18, WORLD_WIDTH * 0.48, PITCH_RIGHT - 36);
      const err = sweepX - keeper.x;
      if (Math.abs(err) > 6) keeperLean = err > 0 ? 1 : -1;

      if (
        !keeperShotPlan.isOwnGoalRisk &&
        keeperHorizBootDist <= 34 &&
        keeperVertBootDist <= 34
      ) {
        keeperJump = true;
        this.aiKeeperJumpCooldown = reactionCadence;
      } else if (
        this.aiKeeperJumpCooldown <= 0 &&
        !keeperShotPlan.isOwnGoalRisk &&
        (keeperRoute.needsJump || keeperShotPlan.scoresCleanly) &&
        this.willJumpInterceptBall(keeper, primarySim.points, minWin, maxWin, false, keeperLean)
      ) {
        keeperJump = true;
        this.aiKeeperJumpCooldown = reactionCadence;
      }
    } else {
      // Guard goal angle smoothly between ball and Red's goal mouth
      const guardX = clamp(
        targetBall.x + 260,
        WORLD_WIDTH * 0.72,
        PITCH_RIGHT - 38
      );
      const err = guardX - keeper.x;
      if (Math.abs(err) > 10) keeperLean = err > 0 ? 1 : -1;

      if (
        !keeperBehindBall &&
        !keeperShotPlan.isOwnGoalRisk &&
        keeperHorizBootDist <= 34 &&
        keeperVertBootDist <= 34 &&
        targetBall.x > WORLD_WIDTH * 0.62
      ) {
        keeperJump = true;
        keeperIntent = keeperShotPlan.scoresCleanly ? keeperShotPlan.bestIntent : 'chip';
        this.aiKeeperJumpCooldown = reactionCadence;
      }
    }

    // 5. Tactical Signature Power-Up Activation
    let abilityJustPressed = false;
    const allowAbilities = difficulty !== 'casual' || this.roundElapsed > 6.0;
    if (this.redAbilityCharge >= 100 && allowAbilities) {
      const ab = this.getTeamActiveAbility('red').abilityId;
      if (
        (ab === 'titan_anchor' || ab === 'goal_shield') &&
        (primarySim.redGoalCrossT !== null || targetBall.x > WORLD_WIDTH * 0.68)
      ) {
        abilityJustPressed = true;
      } else if (
        ab === 'rocket_volley' &&
        !strikerBehindBall &&
        strikerHorizBootDist < 120 &&
        (strikerShotPlan.scoresCleanly || targetBall.x < WORLD_WIDTH * 0.68)
      ) {
        abilityJustPressed = true;
      } else if (
        (ab === 'magnet_boot' || ab === 'dash_surge') &&
        Math.hypot(targetBall.x - striker.x, targetBall.y - striker.y) < 220
      ) {
        abilityJustPressed = true;
      } else if (
        ab === 'sky_leap' &&
        targetBall.y < GROUND_Y - 105 &&
        Math.abs(targetBall.x - striker.x) < 130
      ) {
        abilityJustPressed = true;
      } else if (
        ab === 'overdrive_nova' &&
        !strikerBehindBall &&
        Math.hypot(targetBall.x - striker.x, targetBall.y - striker.y) < 195
      ) {
        abilityJustPressed = true;
      } else if (
        (ab === 'cryo_pulse' || ab === 'golden_strike' || ab === 'hammer_header') &&
        this.roundElapsed > 1.5
      ) {
        abilityJustPressed = true;
      }
    }

    return {
      jumpHeld: strikerJump,
      jumpJustPressed: strikerJump,
      lean: strikerLean,
      abilityJustPressed,
      shotIntent: strikerIntent,
      playerOverrides: {
        [striker.id]: {
          lean: strikerLean,
          jumpHeld: strikerJump,
          jumpJustPressed: strikerJump,
          shotIntent: strikerIntent,
        },
        [keeper.id]: {
          lean: keeperLean,
          jumpHeld: keeperJump,
          jumpJustPressed: keeperJump,
          shotIntent: keeperIntent,
        },
      },
    };
  }

  private resolvePlayerInput(
    p: PlayerEntity,
    blueInput: TeamInput,
    redInput: TeamInput
  ): {
    lean: -1 | 0 | 1;
    jumpHeld: boolean;
    jumpJustPressed: boolean;
    shotIntent?: 'standard' | 'low_drive' | 'chip';
  } {
    const teamInput = p.team === 'blue' ? blueInput : redInput;
    const ov = teamInput.playerOverrides?.[p.id];
    if (!ov) return teamInput;
    return ov;
  }

  private stepSimulation(
    dt: number,
    blueInput: TeamInput,
    redInput: TeamInput
  ): void {
    const subSteps = 4;
    const subDt = dt / subSteps;

    for (const p of this.players) {
      const input = this.resolvePlayerInput(p, blueInput, redInput);
      if (input.shotIntent) {
        p.shotIntent = input.shotIntent;
      } else {
        p.shotIntent =
          input.lean === p.facing
            ? 'low_drive'
            : input.lean === -p.facing
              ? 'chip'
              : 'standard';
      }
      if (input.jumpJustPressed) {
        p.jumpBufferTimer = 0.12;
      } else {
        p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);
      }
    }

    for (let step = 0; step < subSteps; step++) {
      this.stepPlayers(subDt, blueInput, redInput);
      this.stepBalls(subDt);
      this.resolvePlayerPlayerCollisions();
      this.resolveBallBallCollisions();
      this.resolveBallPlayerCollisions();
      this.resolveBallArenaCollisions();
      this.resolveOrbPickups();
      this.stepNet(this.leftNet, subDt);
      this.stepNet(this.rightNet, subDt);

      if (this.phase === 'PLAYING') {
        const scored = this.checkGoal();
        if (scored) break;
      }
    }

    for (const b of this.balls) {
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > 430) {
        b.trail.push({ x: b.x, y: b.y, alpha: 0.85, speed });
        if (b.trail.length > 14) {
          b.trail.shift();
        }
      }
      for (let i = b.trail.length - 1; i >= 0; i--) {
        b.trail[i].alpha -= dt * 3.4;
        if (b.trail[i].alpha <= 0) {
          b.trail.splice(i, 1);
        }
      }
    }
  }

  private stepPlayers(dt: number, blueInput: TeamInput, redInput: TeamInput): void {
    const g = this.mutator.gravity;

    for (const p of this.players) {
      const input = this.resolvePlayerInput(p, blueInput, redInput);
      const isFrozen =
        this.activePowerup?.type === 'freeze' && this.activePowerup.owner !== p.team;
      const hasMagnet =
        (this.activePowerup?.type === 'magnet' || this.activePowerup?.type === 'magnet_boot') &&
        this.activePowerup.owner === p.team;

      const friction = isFrozen ? 0.99 : this.mutator.groundFriction;
      const swayOffset = Math.sin(this.time * 4.4 + (p.role === 'keeper' ? 0 : 1.7)) * 0.14;
      const targetLean = input.lean !== 0 ? input.lean * 0.28 : swayOffset;

      const springK = p.grounded ? 56 : 26;
      const damping = p.grounded ? 8.8 : 5.2;
      const torque = -springK * (p.angle - targetLean) - damping * p.omega;
      p.omega += torque * dt;
      p.angle = clamp(p.angle + p.omega * dt, -1.35, 1.35);

      if (input.lean !== 0) {
        if (p.grounded) {
          const baseWalk = this.getBaseWalkSpeed(p);
          const targetWalkSpeed = isFrozen ? baseWalk * 0.55 : baseWalk;
          const desiredVx = input.lean * targetWalkSpeed;
          const reversing = Math.sign(p.vx) === -input.lean;
          const traction =
            isFrozen || this.mutator.id === 'ice_rink'
              ? 5.8
              : reversing
                ? 24.0
                : 18.0;
          const accelStep =
            isFrozen || this.mutator.id === 'ice_rink'
              ? 520
              : reversing
                ? 1650
                : 1200;

          if (input.lean > 0 && p.vx < desiredVx) {
            p.vx = Math.min(
              desiredVx,
              p.vx + (desiredVx - p.vx) * Math.min(1, traction * dt) + accelStep * dt
            );
          } else if (input.lean < 0 && p.vx > desiredVx) {
            p.vx = Math.max(
              desiredVx,
              p.vx + (desiredVx - p.vx) * Math.min(1, traction * dt) - accelStep * dt
            );
          }
        } else {
          p.vx = clamp(p.vx + input.lean * 820 * p.profile.speedMult * dt, -640, 640);
        }
      }

      if (hasMagnet) {
        const parts = this.getPlayerParts(p);
        for (const b of this.balls) {
          const dx = parts.foot.x - b.x;
          const dy = parts.foot.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 10 && dist < 245) {
            const pull = (1 - dist / 245) * 880;
            b.vx += (dx / dist) * pull * dt;
            b.vy += (dy / dist) * pull * dt;
          }
        }
      }

      if (p.grounded) {
        p.coyoteTimer = 0.095;
      } else {
        p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
      }

      if (p.jumpBufferTimer > 0) {
        p.jumpBufferTimer = 0;
        p.kickTimer = 0.22;
        p.legOmega = 24;

        if (p.coyoteTimer > 0) {
          p.coyoteTimer = 0;
          p.grounded = false;
          const jumpScale =
            (p.role === 'keeper' ? 1.03 : 1.0) * p.profile.jumpMult * (isFrozen ? 0.85 : 1.0);
          p.vy = -this.mutator.jumpPower * jumpScale * (0.95 + Math.random() * 0.1);

          const leanImpulse =
            input.lean !== 0
              ? input.lean * 295 * p.profile.speedMult
              : Math.sin(p.angle) * 320 + p.facing * 95;
          p.vx = clamp(p.vx + leanImpulse, -640, 640);
          p.omega += -p.facing * 3.4;

          p.squashX = 0.82;
          p.squashY = 1.22;

          if (this.phase === 'PLAYING') {
            this.emitSound({ type: 'jump' });
          }
          this.spawnDustBurst(p.x, GROUND_Y - 2, 6, this.mutator.turfPrimary);
        } else {
          p.omega += -p.facing * 4.5;
        }
      }

      if (p.kickTimer > 0) {
        p.kickTimer = Math.max(0, p.kickTimer - dt);
        p.legAngle = clamp(p.legAngle + p.legOmega * dt, -0.35, 1.48);
      } else {
        const legTorque = -52 * p.legAngle - 9.5 * p.legOmega;
        p.legOmega += legTorque * dt;
        p.legAngle = clamp(p.legAngle + p.legOmega * dt, -0.45, 1.48);
      }

      const headTorque = -68 * p.headBobAngle - 6.5 * p.headBobOmega;
      p.headBobOmega += headTorque * dt;
      p.headBobAngle = clamp(p.headBobAngle + p.headBobOmega * dt, -0.8, 0.8);

      p.vy += g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const footRestY = GROUND_Y - 44;
      if (p.y >= footRestY) {
        if (!p.grounded && p.vy > 180) {
          p.squashX = 1.24;
          p.squashY = 0.78;
          this.spawnDustBurst(p.x, GROUND_Y - 2, 5, this.mutator.turfPrimary);
          if (Math.abs(p.vx) > 140) {
            this.addSkidMark(p.x, 22);
          }
        }
        p.y = footRestY;
        p.vy = 0;
        p.grounded = true;
        if (input.lean === 0 || Math.sign(p.vx) !== input.lean) {
          p.vx *= Math.pow(friction, dt * 60);
        } else {
          p.vx *= Math.pow(0.992, dt * 60);
        }
      } else {
        p.grounded = false;
        p.vx *= Math.pow(0.992, dt * 60);
      }

      const minX = PITCH_LEFT - 18;
      const maxX = PITCH_RIGHT + 18;
      if (p.x < minX) {
        p.x = minX;
        p.vx = Math.abs(p.vx) * 0.45;
      } else if (p.x > maxX) {
        p.x = maxX;
        p.vx = -Math.abs(p.vx) * 0.45;
      }

      p.squashX += (1 - p.squashX) * Math.min(1, dt * 14);
      p.squashY += (1 - p.squashY) * Math.min(1, dt * 14);
      p.hitFlash = Math.max(0, p.hitFlash - dt * 5);
    }
  }

  private stepBalls(dt: number): void {
    const g = this.mutator.gravity;
    for (const b of this.balls) {
      const magnusFactor = 0.00032;
      const ax = b.omega * b.vy * magnusFactor;
      const ay = g - b.omega * b.vx * magnusFactor;

      b.vx += ax * dt;
      b.vy += ay * dt;

      const dragPow = Math.pow(b.drag, dt * 60);
      b.vx *= dragPow;
      b.vy *= dragPow;
      b.omega *= Math.pow(0.99, dt * 60);

      const speed = Math.hypot(b.vx, b.vy);
      const maxSpeed = 1650;
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        b.vx *= scale;
        b.vy *= scale;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += b.omega * dt;

      b.squashX += (1 - b.squashX) * Math.min(1, dt * 14);
      b.squashY += (1 - b.squashY) * Math.min(1, dt * 14);
      b.hitFlash = Math.max(0, b.hitFlash - dt * 6);
    }
  }

  private resolveBallBallCollisions(): void {
    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const a = this.balls[i];
        const b = this.balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.r + b.r;
        if (dist > 0.001 && dist < minDist) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;
          const totalMass = a.mass + b.mass;
          a.x -= nx * overlap * (b.mass / totalMass);
          a.y -= ny * overlap * (b.mass / totalMass);
          b.x += nx * overlap * (a.mass / totalMass);
          b.y += ny * overlap * (a.mass / totalMass);

          const relVx = b.vx - a.vx;
          const relVy = b.vy - a.vy;
          const vn = relVx * nx + relVy * ny;
          if (vn < 0) {
            const e = 0.9;
            const imp = (-(1 + e) * vn) / (1 / a.mass + 1 / b.mass);
            a.vx -= (imp / a.mass) * nx;
            a.vy -= (imp / a.mass) * ny;
            b.vx += (imp / b.mass) * nx;
            b.vy += (imp / b.mass) * ny;

            if (Math.abs(vn) > 160 && this.phase === 'PLAYING') {
              this.triggerImpactJuice((a.x + b.x) / 2, (a.y + b.y) / 2, 0.7, '#fbbf24', true);
              this.emitSound({ type: 'bounce', speed: Math.abs(vn) });
            }
          }
        }
      }
    }
  }

  private resolvePlayerPlayerCollisions(): void {
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const a = this.players[i];
        const b = this.players[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = 36;
        if (dist > 0.001 && dist < minDist) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = (minDist - dist) * 0.5;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          const relVx = b.vx - a.vx;
          const relVy = b.vy - a.vy;
          const sepVel = relVx * nx + relVy * ny;
          if (sepVel < 0) {
            const imp = -sepVel * 0.55;
            a.vx -= nx * imp;
            a.vy -= ny * imp;
            b.vx += nx * imp;
            b.vy += ny * imp;
          }
        }
      }
    }
  }

  public getPlayerParts(p: PlayerEntity): {
    head: { x: number; y: number; r: number };
    torso: { x: number; y: number; r: number };
    foot: { x: number; y: number; r: number };
    hip: { x: number; y: number };
  } {
    const cos = Math.cos(p.angle);
    const sin = Math.sin(p.angle);
    const localToWorld = (lx: number, ly: number) => ({
      x: p.x + lx * cos - ly * sin,
      y: p.y + lx * sin + ly * cos,
    });

    const titanScale =
      this.activePowerup?.type === 'titan_anchor' &&
      this.activePowerup.owner === p.team &&
      p.role === 'keeper'
        ? 1.28
        : 1.0;

    const hammerHeadScale =
      this.activePowerup?.type === 'hammer_header' && this.activePowerup.owner === p.team
        ? 1.38
        : 1.0;

    const headCenter = localToWorld(
      Math.sin(p.headBobAngle) * 6,
      -34 * p.squashY
    );
    const torsoCenter = localToWorld(0, -2);
    const hip = localToWorld(0, 14);

    const kickTotalAngle = p.angle - p.facing * p.legAngle;
    const footX = hip.x - Math.sin(kickTotalAngle) * 30;
    const footY = hip.y + Math.cos(kickTotalAngle) * 30;

    return {
      head: {
        x: headCenter.x,
        y: headCenter.y,
        r: 17 * this.mutator.headScale * p.profile.headScaleMult * hammerHeadScale,
      },
      torso: { x: torsoCenter.x, y: torsoCenter.y, r: 17 * titanScale },
      foot: { x: footX, y: footY, r: 14 * titanScale },
      hip,
    };
  }

  private addCharge(team: TeamSide, overdriveAmt: number, abilityAmt: number): void {
    if (this.phase !== 'PLAYING') return;
    if (team === 'blue') {
      this.blueOverdrive = Math.min(100, this.blueOverdrive + overdriveAmt);
      this.blueAbilityCharge = Math.min(100, this.blueAbilityCharge + abilityAmt);
    } else {
      this.redOverdrive = Math.min(100, this.redOverdrive + overdriveAmt);
      this.redAbilityCharge = Math.min(100, this.redAbilityCharge + abilityAmt);
    }
  }

  private resolveBallPlayerCollisions(): void {
    for (const b of this.balls) {
      for (const p of this.players) {
        const parts = this.getPlayerParts(p);

        const checks: Array<{ part: 'foot' | 'head' | 'torso'; x: number; y: number; r: number }> = [
          { part: 'foot', ...parts.foot },
          { part: 'head', ...parts.head },
          { part: 'torso', ...parts.torso },
        ];

        for (const c of checks) {
          const dx = b.x - c.x;
          const dy = b.y - c.y;
          const dist = Math.hypot(dx, dy);
          const minDist = b.r + c.r;

          if (dist < minDist) {
            const nx = dist > 0.001 ? dx / dist : p.facing;
            const ny = dist > 0.001 ? dy / dist : -1;
            const overlap = minDist - dist;

            const playerMass = 2.6;
            const totalMass = b.mass + playerMass;
            b.x += nx * overlap * (playerMass / totalMass);
            b.y += ny * overlap * (playerMass / totalMass);
            p.x -= nx * overlap * (b.mass / totalMass) * 0.5;

            const relVx = b.vx - p.vx;
            const relVy = b.vy - p.vy;
            const velAlongNormal = relVx * nx + relVy * ny;

            const isActiveKick = c.part === 'foot' && p.kickTimer > 0.02;

            if (velAlongNormal < 0 || isActiveKick) {
              const restitution = c.part === 'head' ? 0.94 : 0.78;
              const jImpulse =
                velAlongNormal < 0
                  ? (-(1 + restitution) * velAlongNormal) / (1 / b.mass + 1 / playerMass)
                  : 0;

              b.vx += (jImpulse / b.mass) * nx;
              b.vy += (jImpulse / b.mass) * ny;
              p.vx -= (jImpulse / playerMass) * nx * 0.45;

              const teamCharge = p.team === 'blue' ? this.blueOverdrive : this.redOverdrive;
              const rocketFlag = p.team === 'blue' ? this.blueRocketReady : this.redRocketReady;
              const isOverdriveKick = isActiveKick && (teamCharge >= 100 || rocketFlag);

              if (isActiveKick) {
                const k = this.computeKickVelocity(
                  p,
                  b,
                  p.shotIntent,
                  isOverdriveKick,
                  nx,
                  ny
                );
                b.vx = k.vx;
                b.vy = k.vy;
                b.omega = k.omega;
                p.kickTimer = 0;

                if (b.mass > 1.8) {
                  p.vx -= p.facing * 240;
                  p.omega -= p.facing * 4.5;
                }

                const speedKmh = Math.round(Math.hypot(b.vx, b.vy) * 0.145);
                if (this.phase === 'PLAYING') {
                  if (speedKmh > this.stats.fastestShotKmh) {
                    this.stats.fastestShotKmh = speedKmh;
                  }
                  if (p.team === 'blue') this.stats.blueShots++;
                  else this.stats.redShots++;
                }

                if (isOverdriveKick) {
                  if (p.team === 'blue') {
                    if (rocketFlag) this.blueRocketReady = false;
                    else this.blueOverdrive = 0;
                  } else {
                    if (rocketFlag) this.redRocketReady = false;
                    else this.redOverdrive = 0;
                  }
                  this.triggerImpactJuice(b.x, b.y, 1.45, '#fbbf24', true);
                  if (this.phase === 'PLAYING') {
                    this.emitSound({ type: 'overdrive_kick' });
                    this.addCallout(
                      `${rocketFlag ? 'ROCKET' : 'OVERDRIVE'}! ${speedKmh} KM/H`,
                      b.x,
                      b.y - 38,
                      '#fbbf24',
                      1.05
                    );
                  }
                } else {
                  this.addCharge(p.team, 26, 12);
                  this.triggerImpactJuice(b.x, b.y, 1.05, p.kit.primary, true);
                  if (this.phase === 'PLAYING') {
                    if (this.kickSoundCooldown <= 0) {
                      this.emitSound({ type: 'kick', intensity: 1.0 });
                      this.kickSoundCooldown = 0.08;
                    }
                    if (p.shotIntent === 'chip' && b.y < GROUND_Y - 55) {
                      this.addCallout('CHIP LOB!', b.x, b.y - 34, '#38bdf8', 0.8);
                    } else if (p.shotIntent === 'low_drive' && speedKmh > 106) {
                      this.addCallout(`DRIVEN ${speedKmh} KM/H!`, b.x, b.y - 34, '#fbbf24', 0.85);
                    } else if (speedKmh > 114) {
                      this.addCallout(`${speedKmh} KM/H!`, b.x, b.y - 34, '#fbbf24', 0.85);
                    }
                  }
                }
              } else if (c.part === 'head') {
                const hasHammer =
                  this.activePowerup?.type === 'hammer_header' &&
                  this.activePowerup.owner === p.team;
                const hammerMult = hasHammer ? 1.45 : 1.0;
                const headerBoost =
                  (!p.grounded ? 420 : 250) * hammerMult / Math.sqrt(b.mass);
                b.vx += nx * headerBoost * 0.58 + p.facing * 175 * hammerMult;
                b.vy = Math.min(b.vy, -210) + ny * headerBoost * 0.45;
                b.omega += -nx * 5;
                p.headBobOmega += nx * 18;
                this.addCharge(p.team, 20, 10);

                const impactSpeed = Math.abs(velAlongNormal);
                if (impactSpeed > 260) {
                  this.triggerImpactJuice(b.x, b.y, 0.65, '#f8fafc', impactSpeed > 420);
                  if (this.phase === 'PLAYING' && this.kickSoundCooldown <= 0) {
                    this.emitSound({ type: 'kick', intensity: 0.65 });
                    this.kickSoundCooldown = 0.09;
                  }
                  if ((!p.grounded || hasHammer) && impactSpeed > 360 && this.phase === 'PLAYING') {
                    this.addCallout(
                      hasHammer ? 'HAMMER HEADER!' : 'HEADER!',
                      b.x,
                      b.y - 32,
                      '#e2e8f0',
                      0.75
                    );
                  }
                }
              } else {
                this.addCharge(p.team, 10, 5);
                if (
                  Math.abs(velAlongNormal) > 220 &&
                  this.phase === 'PLAYING' &&
                  this.bounceSoundCooldown <= 0
                ) {
                  this.emitSound({ type: 'bounce', speed: Math.abs(velAlongNormal) });
                  this.bounceSoundCooldown = 0.08;
                }
              }

              if (b.lastTouchTeam && b.lastTouchTeam !== p.team) {
                this.rallyCount += 1;
                this.currentVolleyCount = 1;
                if (this.rallyCount >= 5 && this.rallyCount % 3 === 0 && this.phase === 'PLAYING') {
                  this.addCharge('blue', 12, 8);
                  this.addCharge('red', 12, 8);
                  this.addCallout(`${this.rallyCount}x RALLY!`, WORLD_WIDTH / 2, 165, '#38bdf8', 0.85);
                }
              } else if (this.time - b.lastTouchTime > 0.25) {
                this.currentVolleyCount += 1;
                if (this.currentVolleyCount > this.stats.longestVolley) {
                  this.stats.longestVolley = this.currentVolleyCount;
                }
              }
              b.lastTouchTeam = p.team;
              b.lastTouchTime = this.time;

              b.hitFlash = 1;
              p.hitFlash = 0.7;
              b.squashAngle = Math.atan2(ny, nx);
              b.squashX = 0.78;
              b.squashY = 1.26;
            }
            break;
          }
        }
      }
    }
  }

  private resolveOrbPickups(): void {
    if (this.phase !== 'PLAYING' || this.orbs.length === 0) return;

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      let claimedBy: TeamSide | null = null;

      for (const b of this.balls) {
        if (Math.hypot(b.x - orb.x, b.y - orb.y) < b.r + orb.r) {
          claimedBy = b.lastTouchTeam ?? (b.vx >= 0 ? 'blue' : 'red');
          break;
        }
      }

      if (!claimedBy) {
        for (const p of this.players) {
          if (Math.hypot(p.x - orb.x, p.y - 10 - orb.y) < 34 + orb.r) {
            claimedBy = p.team;
            break;
          }
        }
      }

      if (claimedBy) {
        this.activateOrb(orb, claimedBy);
        this.orbs.splice(i, 1);
      }
    }
  }

  private activateOrb(orb: ChaosOrb, owner: TeamSide): void {
    this.emitSound({ type: 'powerup' });
    const color = ORB_META[orb.type].color;
    this.spawnShockwave(orb.x, orb.y, 120, color, 4);
    this.addCallout(orb.label.toUpperCase() + '!', orb.x, orb.y - 24, color, 1.25);

    if (orb.type === 'golden_ball') {
      if (this.balls.length < 2) {
        const golden = this.createBall('golden-' + Math.round(this.time * 10), true);
        golden.x = orb.x;
        golden.y = orb.y;
        golden.vx = (owner === 'blue' ? 1 : -1) * (180 + Math.random() * 140);
        golden.vy = -260;
        golden.omega = (Math.random() - 0.5) * 10;
        this.balls.push(golden);
      }
      this.activePowerup = {
        type: 'golden_ball',
        owner,
        label: 'Golden Ball Active (+2 Goals)',
        remaining: 9,
        duration: 9,
      };
    } else {
      const duration = orb.type === 'freeze' ? 6.5 : 8.5;
      this.activePowerup = {
        type: orb.type,
        owner,
        label:
          orb.type === 'giant_goal'
            ? `${owner === 'blue' ? 'Red' : 'Blue'} Goal Expanded`
            : orb.type === 'magnet'
              ? `${owner === 'blue' ? 'Blue' : 'Red'} Magnet Boots`
              : `${owner === 'blue' ? 'Red' : 'Blue'} Team Frozen`,
        remaining: duration,
        duration,
      };
    }
    this.emitHud();
  }

  private resolveBallArenaCollisions(): void {
    for (const b of this.balls) {
      if (b.y + b.r > GROUND_Y) {
        const impactVy = Math.abs(b.vy);
        b.y = GROUND_Y - b.r;
        b.vy = -Math.abs(b.vy) * b.restitution;
        if (Math.abs(b.vy) < 42) b.vy = 0;

        const groundFric = this.mutator.groundFriction;
        b.vx *= Math.pow(groundFric, 0.25);
        b.omega = b.vx / b.r;

        if (impactVy > 150) {
          b.squashAngle = Math.PI / 2;
          b.squashX = 0.84;
          b.squashY = 1.18;
          this.spawnDustBurst(b.x, GROUND_Y - 2, 5, this.mutator.turfPrimary);
          if (this.phase === 'PLAYING' && this.bounceSoundCooldown <= 0) {
            this.emitSound({ type: 'bounce', speed: impactVy });
            this.bounceSoundCooldown = 0.07;
          }
        }
      }

      if (b.y - b.r < 24) {
        b.y = 24 + b.r;
        b.vy = Math.abs(b.vy) * b.restitution;
      }

      const leftTopY = GROUND_Y - this.leftGoalHeight;
      const rightTopY = GROUND_Y - this.rightGoalHeight;

      const posts = [
        { x: PITCH_LEFT, y: leftTopY, r: 9 },
        { x: PITCH_RIGHT, y: rightTopY, r: 9 },
        { x: PITCH_LEFT - GOAL_DEPTH, y: leftTopY + 8, r: 7 },
        { x: PITCH_RIGHT + GOAL_DEPTH, y: rightTopY + 8, r: 7 },
      ];

      for (const post of posts) {
        const dx = b.x - post.x;
        const dy = b.y - post.y;
        const dist = Math.hypot(dx, dy);
        const minDist = b.r + post.r;
        if (dist < minDist && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          b.x = post.x + nx * minDist;
          b.y = post.y + ny * minDist;

          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) {
            b.vx -= (1 + 0.88) * vn * nx;
            b.vy -= (1 + 0.88) * vn * ny;
            b.omega += (nx * b.vy - ny * b.vx) * 0.015;

            if (Math.abs(vn) > 190) {
              this.triggerImpactJuice(post.x, post.y, 0.95, '#fbbf24', true);
              if (this.phase === 'PLAYING') {
                this.stats.crossbarHits += 1;
                this.emitSound({ type: 'crossbar', intensity: Math.abs(vn) / 650 });
                this.addCallout('CLANG!', post.x, post.y - 26, '#fbbf24', 0.8);
              }
            }
          }
        }
      }

      const resolveRoof = (x1: number, x2: number, topY: number, isLeft: boolean) => {
        if (b.x > x1 && b.x < x2) {
          const t = (b.x - x1) / (x2 - x1);
          const roofY = topY + (isLeft ? (1 - t) * 8 : t * 8);
          if (b.y + b.r > roofY - 4 && b.y - b.r < roofY + 6 && b.vy > 0 && b.y < roofY) {
            b.y = roofY - 4 - b.r;
            b.vy = -Math.abs(b.vy) * 0.65;
          }
        }
      };
      resolveRoof(PITCH_LEFT - GOAL_DEPTH, PITCH_LEFT, leftTopY, true);
      resolveRoof(PITCH_RIGHT, PITCH_RIGHT + GOAL_DEPTH, rightTopY, false);

      if (b.x < WORLD_WIDTH / 2 && b.y < leftTopY - 6 && b.x - b.r < PITCH_LEFT) {
        b.x = PITCH_LEFT + b.r;
        b.vx = Math.abs(b.vx) * b.restitution;
      } else if (b.x >= WORLD_WIDTH / 2 && b.y < rightTopY - 6 && b.x + b.r > PITCH_RIGHT) {
        b.x = PITCH_RIGHT - b.r;
        b.vx = -Math.abs(b.vx) * b.restitution;
      }

      if (b.x < WORLD_WIDTH / 2 && b.y > leftTopY && b.x - b.r < PITCH_LEFT - GOAL_DEPTH + 4) {
        b.x = PITCH_LEFT - GOAL_DEPTH + 4 + b.r;
        b.vx = Math.abs(b.vx) * 0.25;
        b.vy *= 0.72;
        this.pushNet(this.leftNet, b.x - b.r, b.y, -380);
      } else if (
        b.x >= WORLD_WIDTH / 2 &&
        b.y > rightTopY &&
        b.x + b.r > PITCH_RIGHT + GOAL_DEPTH - 4
      ) {
        b.x = PITCH_RIGHT + GOAL_DEPTH - 4 - b.r;
        b.vx = -Math.abs(b.vx) * 0.25;
        b.vy *= 0.72;
        this.pushNet(this.rightNet, b.x + b.r, b.y, 380);
      }
    }
  }

  private pushNet(net: NetNode[], x: number, y: number, impulseX: number): void {
    for (const node of net) {
      if (node.pinned) continue;
      const dist = Math.hypot(node.x - x, node.y - y);
      if (dist < 72) {
        const falloff = 1 - dist / 72;
        node.vx += impulseX * falloff * 0.55;
        node.vy += (Math.random() - 0.5) * 140 * falloff;
      }
    }
  }

  private stepNet(net: NetNode[], dt: number): void {
    for (let i = 0; i < net.length; i++) {
      const n = net[i];
      if (n.pinned) continue;
      const fx = (n.restX - n.x) * 110;
      const fy = (n.restY - n.y) * 110;
      n.vx = (n.vx + fx * dt) * Math.pow(0.86, dt * 60);
      n.vy = (n.vy + fy * dt) * Math.pow(0.86, dt * 60);

      if (i > 0) {
        n.vx += (net[i - 1].x - n.x) * 14 * dt;
        n.vy += (net[i - 1].y - n.y) * 14 * dt;
      }
      if (i < net.length - 1) {
        n.vx += (net[i + 1].x - n.x) * 14 * dt;
        n.vy += (net[i + 1].y - n.y) * 14 * dt;
      }

      n.x += n.vx * dt;
      n.y += n.vy * dt;
    }
  }

  private checkGoal(): boolean {
    const leftTopY = GROUND_Y - this.leftGoalHeight;
    const rightTopY = GROUND_Y - this.rightGoalHeight;

    for (const b of this.balls) {
      let scorer: TeamSide | null = null;
      if (b.x < PITCH_LEFT - b.r * 0.42 && b.y > leftTopY + 4) {
        scorer = 'red';
        this.pushNet(this.leftNet, b.x, b.y, -460);
      } else if (b.x > PITCH_RIGHT + b.r * 0.42 && b.y > rightTopY + 4) {
        scorer = 'blue';
        this.pushNet(this.rightNet, b.x, b.y, 460);
      }

      if (!scorer) continue;

      const points = b.isGolden ? 2 : 1;
      if (scorer === 'blue') this.blueScore += points;
      else this.redScore += points;

      this.lastScorer = scorer;
      this.lastGoalPoints = points;
      const speedKmh = Math.round(Math.hypot(b.vx, b.vy) * 0.145);
      this.lastGoalSpeedKmh = speedKmh;
      if (speedKmh > this.stats.fastestShotKmh) {
        this.stats.fastestShotKmh = speedKmh;
      }

      this.isOwnGoal = b.lastTouchTeam !== null && b.lastTouchTeam !== scorer;
      const isVolleyGoal = b.y < GROUND_Y - 125;
      if (isVolleyGoal) {
        this.stats.airGoals += 1;
      }

      if (b.isGolden) {
        this.goalTypeLabel = 'GOLDEN GOAL +2!';
      } else if (this.isOwnGoal) {
        this.goalTypeLabel = 'OWN GOAL!';
      } else if (isVolleyGoal) {
        this.goalTypeLabel = 'TOP-BIN VOLLEY!';
      } else if (speedKmh > 105) {
        this.goalTypeLabel = `ROCKET ${speedKmh} KM/H!`;
      } else {
        this.goalTypeLabel = 'GOAL!';
      }

      if (scorer === 'blue') this.redOverdrive = Math.min(100, this.redOverdrive + 35);
      else this.blueOverdrive = Math.min(100, this.blueOverdrive + 35);

      this.phase = 'GOAL_CELEBRATION';
      this.goalTimer = 0;
      this.hitstopTimer = 0.085;
      this.shakeTime = 0.46;
      this.shakeMagnitude = 14;
      this.flashAlpha = 0.45;
      this.crowdExcitement = 1.0;

      this.spawnShockwave(
        scorer === 'blue' ? PITCH_RIGHT : PITCH_LEFT,
        b.y,
        215,
        b.isGolden ? '#fbbf24' : scorer === 'blue' ? this.blueKit.primary : this.redKit.primary,
        5.5
      );
      this.spawnGoalConfetti(scorer, b.isGolden);
      this.emitSound({ type: 'goal' });
      this.emitHud();
      this.onGoalScored?.(scorer, this.getHudSnapshot());
      return true;
    }

    return false;
  }

  private triggerImpactJuice(
    x: number,
    y: number,
    intensity: number,
    color: string,
    withShockwave: boolean
  ): void {
    this.hitstopTimer = Math.max(this.hitstopTimer, 0.032 * intensity);
    this.shakeTime = Math.max(this.shakeTime, 0.16 * intensity);
    this.shakeMagnitude = Math.max(this.shakeMagnitude, 7.5 * intensity);

    if (withShockwave) {
      this.spawnShockwave(x, y, 65 * intensity, color, 3);
    }

    const count = Math.round(10 * intensity);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (140 + Math.random() * 280) * intensity;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 60,
        size: 2.5 + Math.random() * 3.5,
        color,
        alpha: 1,
        life: 0,
        maxLife: 0.28 + Math.random() * 0.22,
        gravityScale: 0.4,
        shape: 'spark',
        rotation: a,
        vRot: (Math.random() - 0.5) * 10,
      });
    }
  }

  private spawnShockwave(
    x: number,
    y: number,
    maxRadius: number,
    color: string,
    lineWidth: number
  ): void {
    this.shockwaves.push({
      x,
      y,
      radius: 10,
      maxRadius,
      color,
      life: 0,
      maxLife: 0.34,
      lineWidth,
    });
  }

  private addSkidMark(x: number, width: number): void {
    this.skidMarks.push({
      x,
      width,
      alpha: 0.38,
      color: this.mutator.id === 'ice_rink' ? '#ffffff' : '#0f172a',
    });
    if (this.skidMarks.length > 24) {
      this.skidMarks.shift();
    }
  }

  private spawnDustBurst(x: number, y: number, count: number, turfColor: string): void {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 18,
        y,
        vx: (Math.random() - 0.5) * 115,
        vy: -32 - Math.random() * 88,
        size: 3 + Math.random() * 4.5,
        color: turfColor === '#bae6fd' ? '#e0f2fe' : '#e2e8f0',
        alpha: 0.6,
        life: 0,
        maxLife: 0.34 + Math.random() * 0.2,
        gravityScale: 0.15,
        shape: 'circle',
        rotation: 0,
        vRot: 0,
      });
    }
  }

  private spawnGoalConfetti(scorer: TeamSide, golden: boolean): void {
    const kit = scorer === 'blue' ? this.blueKit : this.redKit;
    const palette = golden
      ? ['#fbbf24', '#fef08a', '#f59e0b', '#ffffff']
      : [kit.primary, kit.trim, '#f8fafc', '#fbbf24'];
    const originX = scorer === 'blue' ? PITCH_RIGHT - 15 : PITCH_LEFT + 15;
    const goalH = scorer === 'blue' ? this.rightGoalHeight : this.leftGoalHeight;
    const originY = GROUND_Y - goalH * 0.5;

    for (let i = 0; i < 85; i++) {
      const angle = (scorer === 'blue' ? Math.PI : 0) + (Math.random() - 0.5) * 2.1;
      const spd = 200 + Math.random() * 560;
      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 260,
        size: 5 + Math.random() * 6.5,
        color: palette[i % palette.length],
        alpha: 1,
        life: 0,
        maxLife: 1.3 + Math.random() * 0.75,
        gravityScale: 0.35,
        shape: 'rect',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 14,
      });
    }
  }

  private addCallout(
    text: string,
    x: number,
    y: number,
    color: string,
    maxLife: number
  ): void {
    this.callouts.push({
      text,
      x: clamp(x, 140, WORLD_WIDTH - 140),
      y: clamp(y, 90, GROUND_Y - 80),
      vy: -48,
      color,
      life: 0,
      maxLife,
    });
  }

  private updateParticles(dt: number): void {
    const g = 980;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += g * p.gravityScale * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;
      p.alpha = 1 - p.life / p.maxLife;
    }
  }

  private updateShockwaves(dt: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life += dt;
      if (s.life >= s.maxLife) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      const t = s.life / s.maxLife;
      const eased = 1 - Math.pow(1 - t, 3);
      s.radius = 10 + (s.maxRadius - 10) * eased;
    }
  }

  private updateSkidMarks(dt: number): void {
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      this.skidMarks[i].alpha -= dt * 0.08;
      if (this.skidMarks[i].alpha <= 0) {
        this.skidMarks.splice(i, 1);
      }
    }
  }

  private updateCallouts(dt: number): void {
    for (let i = this.callouts.length - 1; i >= 0; i--) {
      const c = this.callouts[i];
      c.life += dt;
      if (c.life >= c.maxLife) {
        this.callouts.splice(i, 1);
        continue;
      }
      c.y += c.vy * dt;
      c.vy *= 0.94;
    }
  }

  private updateAmbientParticles(dt: number): void {
    const mode = this.mutator.ambientParticle;
    if (mode === 'none') return;
    for (const a of this.ambientParticles) {
      if (mode === 'stars') {
        a.alpha = 0.25 + 0.55 * Math.abs(Math.sin(this.time * 1.8 + a.x));
        continue;
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (a.y > GROUND_Y) {
        a.y = -10;
        a.x = Math.random() * WORLD_WIDTH;
      }
      if (a.x < 0) a.x = WORLD_WIDTH;
      if (a.x > WORLD_WIDTH) a.x = 0;
    }
  }

  public exportOnlineSnapshot(seqAck: number): OnlineMatchSnapshot {
    return {
      seqAck,
      phase: this.phase,
      roundNumber: this.roundNumber,
      mutatorId: this.mutator.id,
      nextMutatorId: this.nextMutator.id,
      blueScore: this.blueScore,
      redScore: this.redScore,
      blueOverdrive: Math.round(this.blueOverdrive),
      redOverdrive: Math.round(this.redOverdrive),
      blueAbilityCharge: Math.round(this.blueAbilityCharge),
      redAbilityCharge: Math.round(this.redAbilityCharge),
      blueRocketReady: this.blueRocketReady,
      redRocketReady: this.redRocketReady,
      rallyCount: this.rallyCount,
      leftGoalHeight: Math.round(this.leftGoalHeight * 10) / 10,
      rightGoalHeight: Math.round(this.rightGoalHeight * 10) / 10,
      activePowerup: this.activePowerup ? { ...this.activePowerup } : null,
      lastScorer: this.lastScorer,
      lastGoalPoints: this.lastGoalPoints,
      lastGoalSpeedKmh: this.lastGoalSpeedKmh,
      isOwnGoal: this.isOwnGoal,
      goalTypeLabel: this.goalTypeLabel,
      winner: this.winner,
      stats: { ...this.stats },
      players: this.players.map((p) => ({
        id: p.id,
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        vx: Math.round(p.vx * 10) / 10,
        vy: Math.round(p.vy * 10) / 10,
        angle: Math.round(p.angle * 1000) / 1000,
        omega: Math.round(p.omega * 100) / 100,
        legAngle: Math.round(p.legAngle * 1000) / 1000,
        legOmega: Math.round(p.legOmega * 100) / 100,
        kickTimer: Math.round(p.kickTimer * 1000) / 1000,
        headBobAngle: Math.round(p.headBobAngle * 1000) / 1000,
        grounded: p.grounded,
        squashX: Math.round(p.squashX * 1000) / 1000,
        squashY: Math.round(p.squashY * 1000) / 1000,
        hitFlash: Math.round(p.hitFlash * 1000) / 1000,
        facing: p.facing,
      })),
      balls: this.balls.map((b) => ({
        id: b.id,
        isGolden: b.isGolden,
        x: Math.round(b.x * 10) / 10,
        y: Math.round(b.y * 10) / 10,
        vx: Math.round(b.vx * 10) / 10,
        vy: Math.round(b.vy * 10) / 10,
        r: b.r,
        angle: Math.round(b.angle * 1000) / 1000,
        omega: Math.round(b.omega * 100) / 100,
        squashX: Math.round(b.squashX * 1000) / 1000,
        squashY: Math.round(b.squashY * 1000) / 1000,
        hitFlash: Math.round(b.hitFlash * 1000) / 1000,
        lastTouchTeam: b.lastTouchTeam,
      })),
      orbs: this.orbs.map((o) => ({ ...o })),
      events: this.drainAudioEvents(),
      serverTime: Date.now(),
    };
  }

  public applyOnlineSnapshot(snap: OnlineMatchSnapshot): void {
    const prevPhase = this.phase;
    const prevRound = this.roundNumber;
    const prevLeftGoal = this.leftGoalHeight;
    const prevRightGoal = this.rightGoalHeight;
    const prevPowerupType = this.activePowerup?.type ?? null;

    this.phase = snap.phase;
    this.roundNumber = snap.roundNumber;
    this.mutator = MUTATORS[snap.mutatorId] ?? MUTATORS.classic_turf;
    this.nextMutator = MUTATORS[snap.nextMutatorId] ?? MUTATORS.classic_turf;
    this.blueScore = snap.blueScore;
    this.redScore = snap.redScore;
    this.blueOverdrive = snap.blueOverdrive;
    this.redOverdrive = snap.redOverdrive;
    this.blueAbilityCharge = snap.blueAbilityCharge;
    this.redAbilityCharge = snap.redAbilityCharge;
    this.blueRocketReady = snap.blueRocketReady;
    this.redRocketReady = snap.redRocketReady;
    this.rallyCount = snap.rallyCount;
    this.leftGoalHeight = snap.leftGoalHeight;
    this.rightGoalHeight = snap.rightGoalHeight;
    this.activePowerup = snap.activePowerup ? { ...snap.activePowerup } : null;
    this.lastScorer = snap.lastScorer;
    this.lastGoalPoints = snap.lastGoalPoints;
    this.lastGoalSpeedKmh = snap.lastGoalSpeedKmh;
    this.isOwnGoal = snap.isOwnGoal;
    this.goalTypeLabel = snap.goalTypeLabel;
    this.winner = snap.winner;
    this.stats = { ...snap.stats };
    this.orbs = snap.orbs.map((o) => ({ ...o }));

    const roundReset = snap.roundNumber !== prevRound;
    if (roundReset) {
      this.particles = [];
      this.shockwaves = [];
      this.skidMarks = [];
      this.callouts = [];
      this.leftNet = this.buildNetNodes('left', this.leftGoalHeight);
      this.rightNet = this.buildNetNodes('right', this.rightGoalHeight);
    } else {
      if (Math.abs(this.leftGoalHeight - prevLeftGoal) > 0.25) {
        this.leftNet = this.buildNetNodes('left', this.leftGoalHeight);
      }
      if (Math.abs(this.rightGoalHeight - prevRightGoal) > 0.25) {
        this.rightNet = this.buildNetNodes('right', this.rightGoalHeight);
      }
    }

    // Reconcile players smoothly
    for (const sp of snap.players) {
      const target = this.players.find((p) => p.id === sp.id);
      if (!target) continue;
      const dist = Math.hypot(sp.x - target.x, sp.y - target.y);
      if (roundReset || dist > 160) {
        target.x = sp.x;
        target.y = sp.y;
      } else {
        target.x += (sp.x - target.x) * 0.65;
        target.y += (sp.y - target.y) * 0.65;
      }
      target.vx = sp.vx;
      target.vy = sp.vy;
      target.angle = sp.angle;
      target.omega = sp.omega;
      target.legAngle = sp.legAngle;
      target.legOmega = sp.legOmega;
      target.kickTimer = sp.kickTimer;
      target.headBobAngle = sp.headBobAngle;
      target.grounded = sp.grounded;
      target.squashX = sp.squashX;
      target.squashY = sp.squashY;
      target.hitFlash = sp.hitFlash;
      target.facing = sp.facing;
    }

    // Reconcile balls smoothly while preserving local tapered trails
    const nextBalls: BallEntity[] = [];
    for (const sb of snap.balls) {
      const existing = this.balls.find((b) => b.id === sb.id);
      if (existing && !roundReset) {
        const dist = Math.hypot(sb.x - existing.x, sb.y - existing.y);
        if (dist > 170) {
          existing.x = sb.x;
          existing.y = sb.y;
          existing.trail = [];
        } else {
          existing.x += (sb.x - existing.x) * 0.72;
          existing.y += (sb.y - existing.y) * 0.72;
        }
        existing.vx = sb.vx;
        existing.vy = sb.vy;
        existing.r = sb.r;
        existing.angle = sb.angle;
        existing.omega = sb.omega;
        existing.squashX = sb.squashX;
        existing.squashY = sb.squashY;
        existing.hitFlash = sb.hitFlash;
        existing.lastTouchTeam = sb.lastTouchTeam;
        nextBalls.push(existing);
      } else {
        const created = this.createBall(sb.id, sb.isGolden);
        created.x = sb.x;
        created.y = sb.y;
        created.vx = sb.vx;
        created.vy = sb.vy;
        created.r = sb.r;
        created.angle = sb.angle;
        created.omega = sb.omega;
        created.squashX = sb.squashX;
        created.squashY = sb.squashY;
        created.hitFlash = sb.hitFlash;
        created.lastTouchTeam = sb.lastTouchTeam;
        nextBalls.push(created);
      }
    }
    this.balls = nextBalls;

    // Trigger local celebration VFX on transitions
    if (snap.phase === 'GOAL_CELEBRATION' && prevPhase !== 'GOAL_CELEBRATION' && snap.lastScorer) {
      this.shakeTime = 0.46;
      this.shakeMagnitude = 14;
      this.flashAlpha = 0.45;
      this.crowdExcitement = 1.0;
      const scorer = snap.lastScorer;
      const isGolden = snap.lastGoalPoints > 1;
      const targetNet = scorer === 'blue' ? this.rightNet : this.leftNet;
      const netX = scorer === 'blue' ? PITCH_RIGHT + 18 : PITCH_LEFT - 18;
      this.pushNet(targetNet, netX, GROUND_Y - 85, scorer === 'blue' ? 460 : -460);
      this.spawnShockwave(
        scorer === 'blue' ? PITCH_RIGHT : PITCH_LEFT,
        GROUND_Y - 85,
        215,
        isGolden ? '#fbbf24' : scorer === 'blue' ? this.blueKit.primary : this.redKit.primary,
        5.5
      );
      this.spawnGoalConfetti(scorer, isGolden);
    }

    if (snap.activePowerup && snap.activePowerup.type !== prevPowerupType) {
      this.addCallout(
        snap.activePowerup.label.toUpperCase() + '!',
        WORLD_WIDTH / 2,
        165,
        '#fbbf24',
        1.15
      );
    }

    for (const ev of snap.events) {
      this.emitSound(ev);
    }

    this.emitHud();
    if (snap.phase === 'GAME_OVER' && prevPhase !== 'GAME_OVER' && snap.winner) {
      this.onMatchEnd?.(snap.winner, this.getHudSnapshot());
    }
  }

  public stepOnlineVisuals(rawDt: number): void {
    const dt = Math.min(rawDt, 0.05);
    if (this.phase === 'TITLE_MENU' || this.phase === 'CAREER_HUB' || this.phase === 'GAME_OVER') {
      return;
    }

    this.time += dt;
    this.crowdExcitement = Math.max(0, this.crowdExcitement - dt * 0.52);
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.8);
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
    }

    // Subtle dead-reckoning between 30Hz server snapshots for 60/120Hz fluidity
    const simScale = this.phase === 'GOAL_CELEBRATION' ? 0.35 : 0.72;
    for (const p of this.players) {
      p.x = clamp(p.x + p.vx * dt * simScale, PITCH_LEFT + 18, PITCH_RIGHT - 18);
      p.y = clamp(p.y + p.vy * dt * simScale, 60, GROUND_Y - 44);
      if (p.kickTimer > 0) {
        p.kickTimer = Math.max(0, p.kickTimer - dt);
        p.legAngle = clamp(p.legAngle + p.legOmega * dt, -0.35, 1.48);
      }
    }

    for (const b of this.balls) {
      b.x += b.vx * dt * simScale;
      b.y = Math.min(GROUND_Y - b.r, b.y + b.vy * dt * simScale);
      b.angle += b.omega * dt * simScale;
      const spd = Math.hypot(b.vx, b.vy);
      if (spd > 280) {
        b.trail.push({ x: b.x, y: b.y, alpha: 0.85, speed: spd });
        if (b.trail.length > 16) b.trail.shift();
      }
      for (let t = b.trail.length - 1; t >= 0; t--) {
        b.trail[t].alpha -= dt * 3.8;
        if (b.trail[t].alpha <= 0) b.trail.splice(t, 1);
      }
    }

    this.stepNet(this.leftNet, dt);
    this.stepNet(this.rightNet, dt);
    this.updateParticles(dt);
    this.updateShockwaves(dt);
    this.updateSkidMarks(dt);
    this.updateCallouts(dt);
    this.updateAmbientParticles(dt);
  }
}
