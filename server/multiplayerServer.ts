import type { Server as HttpServer } from 'http';
import crypto from 'crypto';
import { WebSocket, WebSocketServer } from 'ws';
import {
  CRESTS_CATALOG,
  KITS_CATALOG,
  PLAYERS_CATALOG,
  applyPlayerUpgrades,
  getKitById,
  getPlayerById,
  pickRandomKit,
} from '../src/game/catalog';
import { SoccerEngine } from '../src/game/engine';
import { MUTATORS } from '../src/game/mutators';
import {
  ClientClubPayload,
  ClientWsMessage,
  OnlineMatchSetup,
  PublicRoomSummary,
  ServerWsMessage,
} from '../src/game/onlineProtocol';
import { MatchConfig, PlayerUpgradeMap, TeamInput, TeamSide, TwistMode } from '../src/game/types';

interface ClientConn {
  id: string;
  ws: WebSocket;
  isAlive: boolean;
  club: ClientClubPayload;
  roomCode: string | null;
  side: TeamSide | null;
  inQueue: boolean;
  inputCountWindow: number;
  windowStart: number;
}

interface QueueEntry {
  clientId: string;
  twistMode: TwistMode;
  targetScore: 3 | 5 | 7;
  joinedAt: number;
}

interface PlayerInputBuffer {
  seq: number;
  jumpHeld: boolean;
  jumpJustPressed: boolean;
  lean: -1 | 0 | 1;
  abilityJustPressed: boolean;
}

interface MatchRoom {
  code: string;
  isPublic: boolean;
  twistMode: TwistMode;
  targetScore: 3 | 5 | 7;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: number;
  blueClientId: string;
  redClientId: string | null;
  blueClub: ClientClubPayload;
  redClub: ClientClubPayload | null;
  blueRematch: boolean;
  redRematch: boolean;
  blueInput: PlayerInputBuffer;
  redInput: PlayerInputBuffer;
  engine: SoccerEngine | null;
  tickTimer: NodeJS.Timeout | null;
  tickCount: number;
}

const VALID_CREST_IDS = new Set(CRESTS_CATALOG.map((c) => c.id));
const VALID_KIT_IDS = new Set(KITS_CATALOG.map((k) => k.id));
const VALID_PLAYER_IDS = new Set(PLAYERS_CATALOG.map((p) => p.id));

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function sanitizeClub(raw: unknown): ClientClubPayload {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const rawName = typeof obj.clubName === 'string' ? obj.clubName : 'Pitch Club';
  const cleanName = rawName.replace(/[<>]/g, '').trim().slice(0, 24) || 'Pitch Club';

  const crestId =
    typeof obj.crestId === 'string' && VALID_CREST_IDS.has(obj.crestId)
      ? obj.crestId
      : 'phoenix_gold';
  const kitId =
    typeof obj.kitId === 'string' && VALID_KIT_IDS.has(obj.kitId) ? obj.kitId : 'azure_club';
  const strikerId =
    typeof obj.strikerId === 'string' && VALID_PLAYER_IDS.has(obj.strikerId)
      ? obj.strikerId
      : 'leo_spark';
  const keeperId =
    typeof obj.keeperId === 'string' && VALID_PLAYER_IDS.has(obj.keeperId)
      ? obj.keeperId
      : 'sam_wall';
  const powerupRole = obj.powerupRole === 'keeper' ? 'keeper' : 'striker';

  const upgrades: PlayerUpgradeMap = {};
  if (typeof obj.upgrades === 'object' && obj.upgrades !== null) {
    for (const pid of [strikerId, keeperId]) {
      const entry = (obj.upgrades as Record<string, unknown>)[pid];
      if (typeof entry === 'object' && entry !== null) {
        const u = entry as Record<string, unknown>;
        const clampStat = (v: unknown) =>
          typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(5, Math.floor(v))) : 0;
        upgrades[pid] = {
          speed: clampStat(u.speed),
          jump: clampStat(u.jump),
          kick: clampStat(u.kick),
        };
      }
    }
  }

  return {
    clubName: cleanName,
    crestId,
    kitId,
    strikerId,
    keeperId,
    powerupRole,
    upgrades,
  };
}

function sanitizeTwist(val: unknown): TwistMode {
  if (val === 'classic') return 'classic';
  if (val === 'celestial') return 'celestial';
  return 'random';
}

function sanitizeTarget(val: unknown): 3 | 5 | 7 {
  return val === 3 || val === 7 ? val : 5;
}

function sanitizeRoomCode(val: unknown): string {
  if (typeof val !== 'string') return '';
  return val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function emptyInput(): PlayerInputBuffer {
  return {
    seq: 0,
    jumpHeld: false,
    jumpJustPressed: false,
    lean: 0,
    abilityJustPressed: false,
  };
}

function generateRoomCode(existing: Map<string, MatchRoom>): string {
  for (let attempt = 0; attempt < 25; attempt++) {
    let code = '';
    const bytes = crypto.randomBytes(5);
    for (let i = 0; i < 5; i++) {
      code += ROOM_ALPHABET[bytes[i] % ROOM_ALPHABET.length];
    }
    if (!existing.has(code)) return code;
  }
  return `P${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

export function attachMultiplayerServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws/multiplayer',
    maxPayload: 4096,
  });

  const clients = new Map<string, ClientConn>();
  const rooms = new Map<string, MatchRoom>();
  const queue: QueueEntry[] = [];

  const send = (ws: WebSocket, msg: ServerWsMessage) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  const sendToClient = (clientId: string | null, msg: ServerWsMessage) => {
    if (!clientId) return;
    const c = clients.get(clientId);
    if (c) send(c.ws, msg);
  };

  const getPublicRooms = (): PublicRoomSummary[] => {
    const list: PublicRoomSummary[] = [];
    for (const r of rooms.values()) {
      if (r.isPublic && r.status === 'waiting') {
        list.push({
          roomCode: r.code,
          hostClubName: r.blueClub.clubName,
          hostCrestId: r.blueClub.crestId,
          twistMode: r.twistMode,
          targetScore: r.targetScore,
          createdAt: r.createdAt,
        });
      }
    }
    list.sort((a, b) => b.createdAt - a.createdAt);
    return list.slice(0, 12);
  };

  const broadcastLobbyState = () => {
    const payload: ServerWsMessage = {
      type: 'lobby_state',
      onlineCount: clients.size,
      queuedCount: queue.length,
      openRooms: getPublicRooms(),
    };
    for (const c of clients.values()) {
      if (!c.roomCode) {
        send(c.ws, payload);
      }
    }
  };

  const removeFromQueue = (clientId: string) => {
    const idx = queue.findIndex((q) => q.clientId === clientId);
    if (idx !== -1) {
      queue.splice(idx, 1);
      const c = clients.get(clientId);
      if (c) c.inQueue = false;
    }
  };

  const destroyRoom = (roomCode: string, notifyRemainingReason?: string) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    if (room.tickTimer) {
      clearInterval(room.tickTimer);
      room.tickTimer = null;
    }
    const blue = clients.get(room.blueClientId);
    const red = room.redClientId ? clients.get(room.redClientId) : undefined;
    if (blue) {
      blue.roomCode = null;
      blue.side = null;
      if (notifyRemainingReason) {
        send(blue.ws, { type: 'opponent_left', reason: notifyRemainingReason });
      }
    }
    if (red) {
      red.roomCode = null;
      red.side = null;
      if (notifyRemainingReason) {
        send(red.ws, { type: 'opponent_left', reason: notifyRemainingReason });
      }
    }
    rooms.delete(roomCode);
    broadcastLobbyState();
  };

  const leaveCurrentRoom = (client: ClientConn, reason: string) => {
    if (!client.roomCode) return;
    const room = rooms.get(client.roomCode);
    const oldCode = client.roomCode;
    client.roomCode = null;
    client.side = null;
    if (!room) return;

    if (room.tickTimer) {
      clearInterval(room.tickTimer);
      room.tickTimer = null;
    }

    const otherId = room.blueClientId === client.id ? room.redClientId : room.blueClientId;
    if (otherId) {
      const other = clients.get(otherId);
      if (other) {
        other.roomCode = null;
        other.side = null;
        send(other.ws, { type: 'opponent_left', reason });
      }
    }
    rooms.delete(oldCode);
    broadcastLobbyState();
  };

  const startRoomMatch = (room: MatchRoom) => {
    if (!room.redClientId || !room.redClub) return;

    const blueClub = room.blueClub;
    const redClub = room.redClub;
    const resolvedRedKit =
      redClub.kitId === blueClub.kitId ? pickRandomKit(blueClub.kitId) : getKitById(redClub.kitId);

    const blueKit = getKitById(blueClub.kitId);
    const blueLineup = {
      keeper: applyPlayerUpgrades(getPlayerById(blueClub.keeperId), blueClub.upgrades ?? {}),
      striker: applyPlayerUpgrades(getPlayerById(blueClub.strikerId), blueClub.upgrades ?? {}),
    };
    const redLineup = {
      keeper: applyPlayerUpgrades(getPlayerById(redClub.keeperId), redClub.upgrades ?? {}),
      striker: applyPlayerUpgrades(getPlayerById(redClub.strikerId), redClub.upgrades ?? {}),
    };

    const matchCfg: MatchConfig = {
      mode: 'online',
      difficulty: 'pro',
      twistMode: room.twistMode,
      targetScore: room.targetScore,
      blueKit,
      redKit: resolvedRedKit,
      blueLineup,
      redLineup,
      bluePowerupRole: blueClub.powerupRole,
      redPowerupRole: redClub.powerupRole,
      opponentName: redClub.clubName,
      opponentCrestId: redClub.crestId,
    };

    const fixedMutator =
      room.twistMode === 'classic'
        ? MUTATORS.classic_turf
        : room.twistMode === 'celestial'
          ? MUTATORS.lunar_dome
          : undefined;
    const engine = new SoccerEngine();
    engine.startNewMatch(matchCfg, fixedMutator);

    room.engine = engine;
    room.status = 'playing';
    room.blueRematch = false;
    room.redRematch = false;
    room.blueInput = emptyInput();
    room.redInput = emptyInput();
    room.tickCount = 0;

    const baseSetup: Omit<OnlineMatchSetup, 'mySide'> = {
      roomCode: room.code,
      blueClub,
      redClub,
      resolvedRedKitId: resolvedRedKit.id,
      twistMode: room.twistMode,
      targetScore: room.targetScore,
    };

    sendToClient(room.blueClientId, {
      type: 'match_start',
      setup: { ...baseSetup, mySide: 'blue' },
    });
    sendToClient(room.redClientId, {
      type: 'match_start',
      setup: { ...baseSetup, mySide: 'red' },
    });

    // Brief 1.2s tunnel countdown before stepping physics
    let preStartTicks = Math.round(1.25 * 60);
    let lastPhase = engine.phase;
    let lastRound = engine.roundNumber;

    if (room.tickTimer) clearInterval(room.tickTimer);
    room.tickTimer = setInterval(() => {
      if (!room.engine) return;
      if (!clients.has(room.blueClientId) || (room.redClientId && !clients.has(room.redClientId))) {
        destroyRoom(room.code, 'Opponent disconnected from the match.');
        return;
      }

      if (preStartTicks > 0) {
        preStartTicks--;
        if (preStartTicks === 0) {
          const snap = room.engine.exportOnlineSnapshot(room.blueInput.seq);
          sendToClient(room.blueClientId, { type: 'snapshot', snapshot: snap });
          const redSnap = { ...snap, seqAck: room.redInput.seq, events: [] };
          sendToClient(room.redClientId, { type: 'snapshot', snapshot: redSnap });
        }
        return;
      }

      if (room.engine.phase === 'GAME_OVER') {
        room.status = 'finished';
        if (room.tickTimer) {
          clearInterval(room.tickTimer);
          room.tickTimer = null;
        }
        return;
      }

      const bIn: TeamInput = {
        jumpHeld: room.blueInput.jumpHeld,
        jumpJustPressed: room.blueInput.jumpJustPressed,
        lean: room.blueInput.lean,
        abilityJustPressed: room.blueInput.abilityJustPressed,
      };
      const rIn: TeamInput = {
        jumpHeld: room.redInput.jumpHeld,
        jumpJustPressed: room.redInput.jumpJustPressed,
        lean: room.redInput.lean,
        abilityJustPressed: room.redInput.abilityJustPressed,
      };

      // Consume edge triggers after stepping once
      room.blueInput.jumpJustPressed = false;
      room.blueInput.abilityJustPressed = false;
      room.redInput.jumpJustPressed = false;
      room.redInput.abilityJustPressed = false;

      room.engine.step(1 / 60, bIn, rIn);
      room.tickCount++;

      const phaseChanged = room.engine.phase !== lastPhase;
      const roundChanged = room.engine.roundNumber !== lastRound;
      lastPhase = room.engine.phase;
      lastRound = room.engine.roundNumber;

      // Broadcast at 30Hz or immediately on goal / round reset / game over
      if (room.tickCount % 2 === 0 || phaseChanged || roundChanged) {
        const blueSnap = room.engine.exportOnlineSnapshot(room.blueInput.seq);
        const redSnap = { ...blueSnap, seqAck: room.redInput.seq };
        sendToClient(room.blueClientId, { type: 'snapshot', snapshot: blueSnap });
        sendToClient(room.redClientId, { type: 'snapshot', snapshot: redSnap });
      }
    }, 1000 / 60);
  };

  const tryMatchQueue = () => {
    if (queue.length < 2) return;
    const now = Date.now();

    for (let i = 0; i < queue.length; i++) {
      const a = queue[i];
      const clientA = clients.get(a.clientId);
      if (!clientA || clientA.roomCode) {
        queue.splice(i, 1);
        i--;
        continue;
      }

      let matchIdx = -1;
      for (let j = i + 1; j < queue.length; j++) {
        const b = queue[j];
        const clientB = clients.get(b.clientId);
        if (!clientB || clientB.roomCode) continue;

        const exactRule = a.twistMode === b.twistMode && a.targetScore === b.targetScore;
        const waitedEnough = now - a.joinedAt > 2500 || now - b.joinedAt > 2500;
        if (exactRule || waitedEnough) {
          matchIdx = j;
          break;
        }
      }

      if (matchIdx !== -1) {
        const [entryA] = queue.splice(i, 1);
        const [entryB] = queue.splice(matchIdx - 1, 1);
        const cA = clients.get(entryA.clientId);
        const cB = clients.get(entryB.clientId);
        if (!cA || !cB) continue;

        cA.inQueue = false;
        cB.inQueue = false;

        const code = generateRoomCode(rooms);
        const room: MatchRoom = {
          code,
          isPublic: false,
          twistMode: entryA.twistMode,
          targetScore: entryA.targetScore,
          status: 'waiting',
          createdAt: now,
          blueClientId: cA.id,
          redClientId: cB.id,
          blueClub: cA.club,
          redClub: cB.club,
          blueRematch: false,
          redRematch: false,
          blueInput: emptyInput(),
          redInput: emptyInput(),
          engine: null,
          tickTimer: null,
          tickCount: 0,
        };
        rooms.set(code, room);
        cA.roomCode = code;
        cA.side = 'blue';
        cB.roomCode = code;
        cB.side = 'red';

        startRoomMatch(room);
        broadcastLobbyState();
        i--;
      }
    }
  };

  const queueTimer = setInterval(tryMatchQueue, 500);

  const heartbeatTimer = setInterval(() => {
    for (const c of clients.values()) {
      if (!c.isAlive) {
        c.ws.terminate();
        continue;
      }
      c.isAlive = false;
      c.ws.ping();
    }
  }, 25000);

  wss.on('close', () => {
    clearInterval(queueTimer);
    clearInterval(heartbeatTimer);
    for (const r of rooms.values()) {
      if (r.tickTimer) clearInterval(r.tickTimer);
    }
    rooms.clear();
  });

  wss.on('connection', (ws) => {
    const id = crypto.randomUUID();
    const client: ClientConn = {
      id,
      ws,
      isAlive: true,
      club: sanitizeClub({}),
      roomCode: null,
      side: null,
      inQueue: false,
      inputCountWindow: 0,
      windowStart: Date.now(),
    };
    clients.set(id, client);

    send(ws, {
      type: 'lobby_state',
      onlineCount: clients.size,
      queuedCount: queue.length,
      openRooms: getPublicRooms(),
    });
    broadcastLobbyState();

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', (raw) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString('utf8'));
      } catch {
        return;
      }
      if (typeof parsed !== 'object' || parsed === null) return;
      const msg = parsed as ClientWsMessage;

      switch (msg.type) {
        case 'ping': {
          if (typeof msg.t === 'number') {
            send(ws, { type: 'pong', t: msg.t });
          }
          break;
        }

        case 'hello': {
          client.club = sanitizeClub(msg.club);
          send(ws, {
            type: 'lobby_state',
            onlineCount: clients.size,
            queuedCount: queue.length,
            openRooms: getPublicRooms(),
          });
          break;
        }

        case 'queue_join': {
          client.club = sanitizeClub(msg.club);
          leaveCurrentRoom(client, 'Player switched to matchmaking.');
          removeFromQueue(client.id);

          const twistMode = sanitizeTwist(msg.twistMode);
          const targetScore = sanitizeTarget(msg.targetScore);
          queue.push({
            clientId: client.id,
            twistMode,
            targetScore,
            joinedAt: Date.now(),
          });
          client.inQueue = true;
          send(ws, {
            type: 'queued',
            position: queue.length,
            twistMode,
            targetScore,
          });
          tryMatchQueue();
          broadcastLobbyState();
          break;
        }

        case 'queue_leave': {
          removeFromQueue(client.id);
          broadcastLobbyState();
          break;
        }

        case 'room_create': {
          client.club = sanitizeClub(msg.club);
          removeFromQueue(client.id);
          leaveCurrentRoom(client, 'Host created a new room.');

          const code = generateRoomCode(rooms);
          const twistMode = sanitizeTwist(msg.twistMode);
          const targetScore = sanitizeTarget(msg.targetScore);
          const isPublic = Boolean(msg.isPublic);

          const room: MatchRoom = {
            code,
            isPublic,
            twistMode,
            targetScore,
            status: 'waiting',
            createdAt: Date.now(),
            blueClientId: client.id,
            redClientId: null,
            blueClub: client.club,
            redClub: null,
            blueRematch: false,
            redRematch: false,
            blueInput: emptyInput(),
            redInput: emptyInput(),
            engine: null,
            tickTimer: null,
            tickCount: 0,
          };
          rooms.set(code, room);
          client.roomCode = code;
          client.side = 'blue';

          send(ws, {
            type: 'room_waiting',
            roomCode: code,
            mySide: 'blue',
            hostClub: client.club,
            twistMode,
            targetScore,
            isPublic,
          });
          broadcastLobbyState();
          break;
        }

        case 'room_join': {
          client.club = sanitizeClub(msg.club);
          const code = sanitizeRoomCode(msg.roomCode);
          if (!code) {
            send(ws, { type: 'error', message: 'Enter a valid 5-character room code.' });
            return;
          }
          const room = rooms.get(code);
          if (!room) {
            send(ws, { type: 'error', message: `Room ${code} was not found or already closed.` });
            return;
          }
          if (room.status !== 'waiting' || room.redClientId !== null) {
            send(ws, { type: 'error', message: `Room ${code} is already full.` });
            return;
          }
          if (room.blueClientId === client.id) {
            send(ws, { type: 'error', message: 'You are already hosting this room.' });
            return;
          }

          removeFromQueue(client.id);
          leaveCurrentRoom(client, 'Player joined another room.');

          room.redClientId = client.id;
          room.redClub = client.club;
          client.roomCode = room.code;
          client.side = 'red';

          startRoomMatch(room);
          broadcastLobbyState();
          break;
        }

        case 'room_leave': {
          removeFromQueue(client.id);
          leaveCurrentRoom(client, 'Opponent left the match.');
          break;
        }

        case 'input': {
          const now = Date.now();
          if (now - client.windowStart > 1000) {
            client.windowStart = now;
            client.inputCountWindow = 0;
          }
          client.inputCountWindow++;
          if (client.inputCountWindow > 140) return;

          if (!client.roomCode || !client.side) return;
          const room = rooms.get(client.roomCode);
          if (!room || room.status !== 'playing') return;

          const target = client.side === 'blue' ? room.blueInput : room.redInput;
          const seq = typeof msg.seq === 'number' && Number.isFinite(msg.seq) ? msg.seq : target.seq;
          const lean: -1 | 0 | 1 = msg.lean === -1 ? -1 : msg.lean === 1 ? 1 : 0;

          target.seq = seq;
          target.lean = lean;
          target.jumpHeld = Boolean(msg.jumpHeld);
          if (msg.jumpJustPressed) target.jumpJustPressed = true;
          if (msg.abilityJustPressed) target.abilityJustPressed = true;
          break;
        }

        case 'rematch_request': {
          if (!client.roomCode || !client.side) return;
          const room = rooms.get(client.roomCode);
          if (!room || room.status !== 'finished') return;
          if (client.side === 'blue') room.blueRematch = true;
          else room.redRematch = true;

          sendToClient(room.blueClientId, {
            type: 'rematch_status',
            blueReady: room.blueRematch,
            redReady: room.redRematch,
          });
          sendToClient(room.redClientId, {
            type: 'rematch_status',
            blueReady: room.blueRematch,
            redReady: room.redRematch,
          });

          if (room.blueRematch && room.redRematch) {
            startRoomMatch(room);
          }
          break;
        }
      }
    });

    ws.on('close', () => {
      removeFromQueue(client.id);
      leaveCurrentRoom(client, 'Opponent disconnected.');
      clients.delete(client.id);
      broadcastLobbyState();
    });
  });

  return {
    getStats: () => ({
      onlineCount: clients.size,
      queuedCount: queue.length,
      activeRooms: rooms.size,
      openRooms: getPublicRooms().length,
    }),
  };
}
