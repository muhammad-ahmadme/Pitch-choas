import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Check,
  Copy,
  Globe,
  Link2,
  Loader2,
  Plus,
  Radio,
  Search,
  Users,
} from 'lucide-react';
import { getKitById, getPlayerById } from '../game/catalog';
import { ClientClubPayload, PublicRoomSummary } from '../game/onlineProtocol';
import { CareerProfile, TwistMode } from '../game/types';
import { OnlineLobbyStatus } from '../hooks/useOnlineMultiplayer';
import { ClubCrestSvg } from './ClubCrestSvg';
import { PlayerAvatarSvg } from './PlayerAvatarSvg';

interface OnlineLobbyModalProps {
  profile: CareerProfile;
  clubPayload: ClientClubPayload;
  connected: boolean;
  connecting: boolean;
  status: OnlineLobbyStatus;
  onlineCount: number;
  queuedCount: number;
  openRooms: PublicRoomSummary[];
  roomCode: string | null;
  pingMs: number | null;
  error: string | null;
  initialJoinCode?: string;
  twistMode: TwistMode;
  targetScore: 3 | 5 | 7;
  onChangeTwist: (twist: TwistMode) => void;
  onChangeTarget: (target: 3 | 5 | 7) => void;
  onJoinQueue: () => void;
  onLeaveQueue: () => void;
  onCreateRoom: (isPublic: boolean) => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onBack: () => void;
}

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  profile,
  connected,
  connecting,
  status,
  onlineCount,
  queuedCount,
  openRooms,
  roomCode,
  pingMs,
  error,
  initialJoinCode = '',
  twistMode,
  targetScore,
  onChangeTwist,
  onChangeTarget,
  onJoinQueue,
  onLeaveQueue,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onBack,
}) => {
  const [joinCode, setJoinCode] = useState(initialJoinCode);
  const [isPublicRoom, setIsPublicRoom] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const equippedKit = getKitById(profile.selectedKitId);
  const equippedKeeper = getPlayerById(profile.selectedKeeperId);
  const equippedStriker = getPlayerById(profile.selectedStrikerId);

  const handleCopyCode = () => {
    if (!roomCode) return;
    void navigator.clipboard?.writeText(roomCode);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleCopyInviteLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}?room=${roomCode}`;
    void navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 1800);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim().length >= 4) {
      onJoinRoom(joinCode.trim().toUpperCase());
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.22),transparent_55%),linear-gradient(to_bottom,#020617,#071326,#020617)] text-slate-100 overflow-y-auto p-4 sm:p-6 md:p-8 select-none">
      <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col gap-5">
        {/* Top Arcade Arena Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 border-b-4 border-b-slate-950 text-xs font-extrabold uppercase tracking-wider text-slate-100 transition-all active:translate-y-0.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Main Menu</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-400 shrink-0" />
                <h1 className="font-display font-extrabold italic text-2xl sm:text-3xl tracking-wide text-white leading-none">
                  GLOBAL MULTIPLAYER ARENA
                </h1>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs font-bold text-slate-300 tabular-nums">
                <span className={connected ? 'text-emerald-300' : 'text-amber-300'}>
                  {connecting ? 'Connecting…' : connected ? 'Server Live' : 'Offline'}
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>{onlineCount} Players Online</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>{queuedCount} Searching</span>
                {pingMs !== null && (
                  <>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-sky-300">{pingMs} ms Ping</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Squad Badge */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-900/90 border-2 border-sky-500/40 px-3.5 py-2">
            <ClubCrestSvg crestId={profile.crestId} sizeClass="w-8 h-8" />
            <div className="text-left">
              <div className="font-display font-extrabold italic text-base text-white leading-none">
                {profile.clubName}
              </div>
              <div className="text-[11px] font-bold text-sky-300 mt-0.5">
                {equippedKeeper.nickname} &amp; {equippedStriker.nickname}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border-2 border-rose-500/70 bg-rose-950/90 px-4 py-3 text-sm font-bold text-rose-100">
            {error}
          </div>
        )}

        {/* Main 2-Column Lobby */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-5 my-auto">
          {/* LEFT: Quick Global Matchmaking + Match Rules */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-emerald-400/40 border-b-4 border-b-slate-950 bg-slate-900/90 p-5 sm:p-6 flex flex-col justify-between gap-5 shadow-2xl"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-display font-extrabold italic text-2xl text-white">
                  WORLDWIDE QUICK MATCH
                </span>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                  1v1 Team Physics
                </span>
              </div>

              {/* Squad Showcase Strip */}
              <div className="rounded-xl bg-slate-950/90 border border-slate-800 px-4 py-3 flex items-center justify-between gap-4 mb-4">
                <div className="flex items-end -space-x-4">
                  <PlayerAvatarSvg
                    player={equippedKeeper}
                    kit={equippedKit}
                    facing="right"
                    sizeClass="w-16 h-20"
                  />
                  <PlayerAvatarSvg
                    player={equippedStriker}
                    kit={equippedKit}
                    facing="right"
                    sizeClass="w-20 h-24"
                  />
                </div>
                <div className="text-right min-w-0">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                    Your Online Squad
                  </div>
                  <div className="font-display font-extrabold italic text-xl text-white truncate">
                    {equippedStriker.nickname} &amp; {equippedKeeper.nickname}
                  </div>
                  <div className="text-xs font-semibold text-slate-300">
                    {equippedKit.name}
                  </div>
                </div>
              </div>

              {/* Match Preferences */}
              <div className="flex flex-wrap items-center gap-2.5 mb-5">
                <div className="flex items-center gap-1 bg-slate-950 border-2 border-slate-800 rounded-xl p-1">
                  <button
                    type="button"
                    disabled={status !== 'idle'}
                    onClick={() => onChangeTwist('random')}
                    className={`px-3 py-1.5 rounded-lg font-display font-extrabold italic text-sm uppercase tracking-wide cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 ${
                      twistMode === 'random'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Chaos Arenas
                  </button>
                  <button
                    type="button"
                    disabled={status !== 'idle'}
                    onClick={() => onChangeTwist('classic')}
                    className={`px-3 py-1.5 rounded-lg font-display font-extrabold italic text-sm uppercase tracking-wide cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 ${
                      twistMode === 'classic'
                        ? 'bg-emerald-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Classic Turf
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 border-2 border-slate-800 rounded-xl p-1">
                  {([3, 5, 7] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      disabled={status !== 'idle'}
                      onClick={() => onChangeTarget(g)}
                      className={`px-3 py-1.5 rounded-lg font-display font-extrabold italic text-sm uppercase tabular-nums cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 ${
                        targetScore === g
                          ? 'bg-white text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {g} Goals
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Matchmaking Action State */}
            {status === 'queued' ? (
              <div className="rounded-xl border-2 border-amber-400/60 bg-amber-400/10 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="w-5 h-5 text-amber-300 animate-spin shrink-0" />
                    <div>
                      <div className="font-display font-extrabold italic text-xl text-amber-300 leading-none">
                        SEARCHING GLOBAL PLAYERS…
                      </div>
                      <div className="text-xs font-semibold text-slate-300 mt-1">
                        Pairing you with the next available challenger worldwide
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onLeaveQueue}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border-b-4 border-slate-950 text-xs font-extrabold uppercase tracking-wider text-white cursor-pointer"
                >
                  Cancel Search
                </button>
              </div>
            ) : status === 'waiting_room' && roomCode ? (
              <div className="rounded-xl border-2 border-sky-400/70 bg-sky-950/60 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-extrabold uppercase tracking-widest text-sky-300">
                      Room Ready · Waiting For Challenger
                    </div>
                    <div className="font-display font-extrabold italic text-4xl tracking-widest text-white mt-0.5 tabular-nums">
                      {roomCode}
                    </div>
                  </div>
                  <Loader2 className="w-6 h-6 text-sky-300 animate-spin shrink-0" />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-sky-400 hover:bg-sky-300 border-b-4 border-sky-700 text-slate-950 text-xs font-extrabold uppercase tracking-wider cursor-pointer whitespace-nowrap"
                  >
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? 'Copied Code!' : 'Copy Code'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 border-b-4 border-amber-700 text-slate-950 text-xs font-extrabold uppercase tracking-wider cursor-pointer whitespace-nowrap"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                    <span>{copiedLink ? 'Invite Copied!' : 'Copy Invite Link'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onLeaveRoom}
                  className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Close Room
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!connected}
                onClick={onJoinQueue}
                className="w-full inline-flex items-center justify-center gap-3 py-4 px-6 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 hover:brightness-105 active:translate-y-1 disabled:opacity-50 border-2 border-emerald-200 border-b-[6px] border-b-emerald-800 text-slate-950 font-display font-extrabold italic text-3xl tracking-wide transition-all cursor-pointer shadow-[0_10px_28px_rgba(16,185,129,0.35)]"
              >
                <Search className="w-7 h-7 shrink-0" />
                <span>FIND GLOBAL MATCH!</span>
              </button>
            )}
          </motion.div>

          {/* RIGHT: Create Room, Join by Code & Live Open Rooms */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border-2 border-slate-700/80 border-b-4 border-b-slate-950 bg-slate-900/90 p-5 sm:p-6 flex flex-col gap-5 shadow-2xl"
          >
            {/* Create Match Room */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="font-display font-extrabold italic text-xl text-white">
                  CREATE CHALLENGE ROOM
                </span>
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublicRoom}
                    onChange={(e) => setIsPublicRoom(e.target.checked)}
                    className="accent-amber-400 w-4 h-4 rounded"
                  />
                  <span>List Publicly</span>
                </label>
              </div>

              <button
                type="button"
                disabled={!connected || status !== 'idle'}
                onClick={() => onCreateRoom(isPublicRoom)}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-400 hover:bg-sky-300 active:translate-y-0.5 disabled:opacity-50 border-b-4 border-sky-700 text-slate-950 font-display font-extrabold italic text-xl tracking-wide transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5 shrink-0" />
                <span>CREATE ROOM CODE</span>
              </button>
            </div>

            {/* Join Room by Code */}
            <form onSubmit={handleJoinSubmit} className="space-y-2">
              <label
                htmlFor="room-code-input"
                className="block font-display font-extrabold italic text-xl text-white"
              >
                JOIN FRIEND BY CODE
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="room-code-input"
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE (E.G. KICK7)"
                  className="flex-1 rounded-xl bg-slate-950 border-2 border-slate-700 focus:border-amber-400 px-3.5 py-2.5 font-display font-extrabold text-lg uppercase tracking-widest text-white placeholder:text-slate-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={!connected || status !== 'idle' || joinCode.trim().length < 4}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 border-b-4 border-amber-700 text-slate-950 font-display font-extrabold italic text-xl tracking-wide cursor-pointer whitespace-nowrap shrink-0"
                >
                  JOIN!
                </button>
              </div>
            </form>

            {/* Open Public Rooms Browser */}
            <div className="flex-1 flex flex-col min-h-[150px]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 font-display font-extrabold italic text-lg text-slate-200">
                  <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
                  LIVE OPEN ROOMS ({openRooms.length})
                </span>
                <span className="text-[11px] font-bold text-slate-400">Click to Join</span>
              </div>

              {openRooms.length === 0 ? (
                <div className="flex-1 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 flex flex-col items-center justify-center p-4 text-center">
                  <Users className="w-6 h-6 text-slate-500 mb-1.5" />
                  <div className="text-xs font-bold text-slate-400">
                    No open rooms waiting right now — create one or hit Find Global Match!
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {openRooms.map((r) => (
                    <button
                      key={r.roomCode}
                      type="button"
                      disabled={!connected || status !== 'idle'}
                      onClick={() => onJoinRoom(r.roomCode)}
                      className="w-full flex items-center justify-between gap-3 rounded-xl bg-slate-950/90 hover:bg-slate-800 border border-slate-700 hover:border-emerald-400/60 px-3.5 py-2.5 text-left transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ClubCrestSvg crestId={r.hostCrestId} sizeClass="w-8 h-8" />
                        <div className="min-w-0">
                          <div className="font-display font-extrabold italic text-lg text-white leading-none truncate">
                            {r.hostClubName}
                          </div>
                          <div className="text-[11px] font-bold text-slate-400 mt-0.5 tabular-nums">
                            {r.twistMode === 'classic' ? 'Classic Turf' : 'Chaos Arenas'} · First to{' '}
                            {r.targetScore}
                          </div>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-lg bg-emerald-400 text-slate-950 font-display font-extrabold italic text-sm tracking-wider shrink-0">
                        JOIN {r.roomCode}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
