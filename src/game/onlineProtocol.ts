import {
  ActivePowerup,
  ChaosOrb,
  GamePhase,
  MatchStats,
  MutatorId,
  TeamSide,
  TwistMode,
} from './types';

export interface ClientClubPayload {
  clubName: string;
  crestId: string;
  kitId: string;
  strikerId: string;
  keeperId: string;
  powerupRole: 'striker' | 'keeper';
  upgrades?: Record<string, { speed: number; jump: number; kick: number }>;
}

export interface PublicRoomSummary {
  roomCode: string;
  hostClubName: string;
  hostCrestId: string;
  twistMode: TwistMode;
  targetScore: 3 | 5 | 7;
  createdAt: number;
}

export type OnlineSoundEvent =
  | { type: 'kickoff' }
  | { type: 'fulltime' }
  | { type: 'goal' }
  | { type: 'powerup' }
  | { type: 'jump' }
  | { type: 'kick'; intensity: number }
  | { type: 'overdrive_kick' }
  | { type: 'bounce'; speed: number }
  | { type: 'crossbar'; intensity: number };

export interface OnlinePlayerSnapshot {
  id: string;
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
  grounded: boolean;
  squashX: number;
  squashY: number;
  hitFlash: number;
  facing: 1 | -1;
}

export interface OnlineBallSnapshot {
  id: string;
  isGolden: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  angle: number;
  omega: number;
  squashX: number;
  squashY: number;
  hitFlash: number;
  lastTouchTeam: TeamSide | null;
}

export interface OnlineMatchSnapshot {
  seqAck: number;
  phase: GamePhase;
  roundNumber: number;
  mutatorId: MutatorId;
  nextMutatorId: MutatorId;
  blueScore: number;
  redScore: number;
  blueOverdrive: number;
  redOverdrive: number;
  blueAbilityCharge: number;
  redAbilityCharge: number;
  blueRocketReady: boolean;
  redRocketReady: boolean;
  rallyCount: number;
  leftGoalHeight: number;
  rightGoalHeight: number;
  activePowerup: ActivePowerup | null;
  lastScorer: TeamSide | null;
  lastGoalPoints: number;
  lastGoalSpeedKmh: number;
  isOwnGoal: boolean;
  goalTypeLabel: string;
  winner: TeamSide | null;
  stats: MatchStats;
  players: OnlinePlayerSnapshot[];
  balls: OnlineBallSnapshot[];
  orbs: ChaosOrb[];
  events: OnlineSoundEvent[];
  serverTime: number;
}

export interface OnlineMatchSetup {
  roomCode: string;
  mySide: TeamSide;
  blueClub: ClientClubPayload;
  redClub: ClientClubPayload;
  resolvedRedKitId: string;
  twistMode: TwistMode;
  targetScore: 3 | 5 | 7;
}

export type ClientWsMessage =
  | { type: 'hello'; club: ClientClubPayload }
  | { type: 'queue_join'; club: ClientClubPayload; twistMode: TwistMode; targetScore: 3 | 5 | 7 }
  | { type: 'queue_leave' }
  | {
      type: 'room_create';
      club: ClientClubPayload;
      twistMode: TwistMode;
      targetScore: 3 | 5 | 7;
      isPublic: boolean;
    }
  | { type: 'room_join'; club: ClientClubPayload; roomCode: string }
  | { type: 'room_leave' }
  | {
      type: 'input';
      seq: number;
      jumpHeld: boolean;
      jumpJustPressed: boolean;
      lean: -1 | 0 | 1;
      abilityJustPressed: boolean;
    }
  | { type: 'rematch_request' }
  | { type: 'ping'; t: number };

export type ServerWsMessage =
  | {
      type: 'lobby_state';
      onlineCount: number;
      queuedCount: number;
      openRooms: PublicRoomSummary[];
    }
  | {
      type: 'queued';
      position: number;
      twistMode: TwistMode;
      targetScore: 3 | 5 | 7;
    }
  | {
      type: 'room_waiting';
      roomCode: string;
      mySide: TeamSide;
      hostClub: ClientClubPayload;
      twistMode: TwistMode;
      targetScore: 3 | 5 | 7;
      isPublic: boolean;
    }
  | {
      type: 'match_start';
      setup: OnlineMatchSetup;
    }
  | {
      type: 'snapshot';
      snapshot: OnlineMatchSnapshot;
    }
  | {
      type: 'rematch_status';
      blueReady: boolean;
      redReady: boolean;
    }
  | {
      type: 'opponent_left';
      reason: string;
    }
  | {
      type: 'pong';
      t: number;
    }
  | {
      type: 'error';
      message: string;
    };
