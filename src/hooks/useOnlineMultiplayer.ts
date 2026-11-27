import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ClientClubPayload,
  ClientWsMessage,
  OnlineMatchSetup,
  OnlineMatchSnapshot,
  PublicRoomSummary,
  ServerWsMessage,
} from '../game/onlineProtocol';
import { TeamSide, TwistMode } from '../game/types';

export type OnlineLobbyStatus = 'idle' | 'queued' | 'waiting_room' | 'in_match';

interface UseOnlineMultiplayerOptions {
  onMatchStart: (setup: OnlineMatchSetup) => void;
  onSnapshot: (snapshot: OnlineMatchSnapshot) => void;
  onOpponentLeft: (reason: string) => void;
}

export function useOnlineMultiplayer({
  onMatchStart,
  onSnapshot,
  onOpponentLeft,
}: UseOnlineMultiplayerOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const seqRef = useRef(0);
  const pingIntervalRef = useRef<number | null>(null);
  const lastClubRef = useRef<ClientClubPayload | null>(null);

  const callbacksRef = useRef({ onMatchStart, onSnapshot, onOpponentLeft });
  callbacksRef.current = { onMatchStart, onSnapshot, onOpponentLeft };

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<OnlineLobbyStatus>('idle');
  const [onlineCount, setOnlineCount] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);
  const [openRooms, setOpenRooms] = useState<PublicRoomSummary[]>([]);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [mySide, setMySide] = useState<TeamSide | null>(null);
  const [rematchStatus, setRematchStatus] = useState<{ blueReady: boolean; redReady: boolean }>({
    blueReady: false,
    redReady: false,
  });
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendRaw = useCallback((msg: ClientWsMessage): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(msg));
    return true;
  }, []);

  const disconnect = useCallback(() => {
    if (pingIntervalRef.current !== null) {
      window.clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // Ignore close errors
      }
      wsRef.current = null;
    }
    setConnected(false);
    setConnecting(false);
    setStatus('idle');
    setRoomCode(null);
    setMySide(null);
    setPingMs(null);
  }, []);

  const connect = useCallback(
    (club: ClientClubPayload) => {
      lastClubRef.current = club;
      const existing = wsRef.current;
      if (existing && existing.readyState === WebSocket.OPEN) {
        sendRaw({ type: 'hello', club });
        return;
      }
      if (existing && existing.readyState === WebSocket.CONNECTING) {
        return;
      }

      setConnecting(true);
      setError(null);

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${window.location.host}/ws/multiplayer`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        setError(null);
        if (lastClubRef.current) {
          ws.send(JSON.stringify({ type: 'hello', club: lastClubRef.current }));
        }
        ws.send(JSON.stringify({ type: 'ping', t: Date.now() }));

        if (pingIntervalRef.current !== null) {
          window.clearInterval(pingIntervalRef.current);
        }
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', t: Date.now() }));
          }
        }, 4000);
      };

      ws.onmessage = (event) => {
        let msg: ServerWsMessage;
        try {
          msg = JSON.parse(String(event.data)) as ServerWsMessage;
        } catch {
          return;
        }

        switch (msg.type) {
          case 'pong':
            setPingMs(Math.max(1, Date.now() - msg.t));
            break;
          case 'lobby_state':
            setOnlineCount(msg.onlineCount);
            setQueuedCount(msg.queuedCount);
            setOpenRooms(msg.openRooms);
            break;
          case 'queued':
            setStatus('queued');
            setRoomCode(null);
            setMySide(null);
            setError(null);
            break;
          case 'room_waiting':
            setStatus('waiting_room');
            setRoomCode(msg.roomCode);
            setMySide(msg.mySide);
            setError(null);
            break;
          case 'match_start':
            seqRef.current = 0;
            setStatus('in_match');
            setRoomCode(msg.setup.roomCode);
            setMySide(msg.setup.mySide);
            setRematchStatus({ blueReady: false, redReady: false });
            setError(null);
            callbacksRef.current.onMatchStart(msg.setup);
            break;
          case 'snapshot':
            callbacksRef.current.onSnapshot(msg.snapshot);
            break;
          case 'rematch_status':
            setRematchStatus({ blueReady: msg.blueReady, redReady: msg.redReady });
            break;
          case 'opponent_left':
            setStatus('idle');
            setRoomCode(null);
            setMySide(null);
            setRematchStatus({ blueReady: false, redReady: false });
            callbacksRef.current.onOpponentLeft(msg.reason);
            break;
          case 'error':
            setError(msg.message);
            break;
        }
      };

      ws.onerror = () => {
        setConnecting(false);
        setError('Could not connect to the global multiplayer server.');
      };

      ws.onclose = () => {
        if (pingIntervalRef.current !== null) {
          window.clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        wsRef.current = null;
        setConnected(false);
        setConnecting(false);
        setStatus((prev) => {
          if (prev === 'in_match') {
            callbacksRef.current.onOpponentLeft('Lost connection to the match server.');
          }
          return 'idle';
        });
      };
    },
    [sendRaw]
  );

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const joinQueue = useCallback(
    (club: ClientClubPayload, twistMode: TwistMode, targetScore: 3 | 5 | 7) => {
      setError(null);
      sendRaw({ type: 'queue_join', club, twistMode, targetScore });
    },
    [sendRaw]
  );

  const leaveQueue = useCallback(() => {
    sendRaw({ type: 'queue_leave' });
    setStatus('idle');
  }, [sendRaw]);

  const createRoom = useCallback(
    (club: ClientClubPayload, twistMode: TwistMode, targetScore: 3 | 5 | 7, isPublic: boolean) => {
      setError(null);
      sendRaw({ type: 'room_create', club, twistMode, targetScore, isPublic });
    },
    [sendRaw]
  );

  const joinRoom = useCallback(
    (club: ClientClubPayload, code: string) => {
      setError(null);
      sendRaw({ type: 'room_join', club, roomCode: code });
    },
    [sendRaw]
  );

  const leaveRoom = useCallback(() => {
    sendRaw({ type: 'room_leave' });
    setStatus('idle');
    setRoomCode(null);
    setMySide(null);
    setRematchStatus({ blueReady: false, redReady: false });
  }, [sendRaw]);

  const sendInput = useCallback(
    (input: {
      jumpHeld: boolean;
      jumpJustPressed: boolean;
      lean: -1 | 0 | 1;
      abilityJustPressed: boolean;
    }) => {
      seqRef.current += 1;
      sendRaw({
        type: 'input',
        seq: seqRef.current,
        jumpHeld: input.jumpHeld,
        jumpJustPressed: input.jumpJustPressed,
        lean: input.lean,
        abilityJustPressed: input.abilityJustPressed,
      });
    },
    [sendRaw]
  );

  const requestRematch = useCallback(() => {
    sendRaw({ type: 'rematch_request' });
  }, [sendRaw]);

  return {
    connected,
    connecting,
    status,
    onlineCount,
    queuedCount,
    openRooms,
    roomCode,
    mySide,
    rematchStatus,
    pingMs,
    error,
    clearError: () => setError(null),
    connect,
    disconnect,
    joinQueue,
    leaveQueue,
    createRoom,
    joinRoom,
    leaveRoom,
    sendInput,
    requestRematch,
  };
}
