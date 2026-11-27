import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Shield, Sparkles } from 'lucide-react';
import { CareerProfile, ClubCrestSpec } from '../game/types';
import { CRESTS_CATALOG } from '../game/catalog';
import { ClubCrestSvg } from './ClubCrestSvg';

interface ClubNamePromptModalProps {
  profile: CareerProfile;
  onSaveClubName: (name: string, crestId: string) => void;
}

export const ClubNamePromptModal: React.FC<ClubNamePromptModalProps> = ({
  profile,
  onSaveClubName,
}) => {
  const [clubName, setClubName] = useState(profile.clubName || 'My Club');
  const [crestId, setCrestId] = useState(profile.crestId || CRESTS_CATALOG[0].id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = clubName.trim();
    if (trimmed.length > 0) {
      onSaveClubName(trimmed.slice(0, 24), crestId);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="max-w-md w-full rounded-3xl border-2 border-sky-400/60 border-b-8 border-b-sky-950 bg-slate-900/95 p-6 sm:p-8 shadow-[0_24px_60px_rgba(14,165,233,0.35)] space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-400/20 border border-sky-400 text-sky-300 shadow-inner mb-1">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="font-display font-extrabold italic text-2xl sm:text-3xl text-white tracking-wide">
            WELCOME TO PITCH CHAOS!
          </h2>
          <p className="text-xs font-semibold text-slate-300">
            Set your official Club Name and Crest. Choose carefully: your Club Name can only be set once upon sign-in and will be permanently locked!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-sky-300">
              Official Club Name
            </label>
            <input
              type="text"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              maxLength={24}
              required
              placeholder="e.g. United Strikers FC"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border-2 border-slate-700 focus:border-sky-400 text-white font-display font-extrabold italic text-lg outline-none transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-sky-300">
              Select Club Crest Badge
            </label>
            <div className="grid grid-cols-4 gap-2.5 max-h-40 overflow-y-auto p-1">
              {CRESTS_CATALOG.map((crest) => {
                const isSelected = crestId === crest.id;
                return (
                  <button
                    key={crest.id}
                    type="button"
                    onClick={() => setCrestId(crest.id)}
                    className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-400 scale-105 shadow-md'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <ClubCrestSvg crestId={crest.id} sizeClass="w-10 h-10" />
                    <span className="mt-1 text-[10px] font-bold text-slate-300 truncate max-w-[65px]">
                      {crest.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-xl bg-gradient-to-r from-sky-400 to-sky-500 hover:brightness-105 active:translate-y-1 border-2 border-sky-200 border-b-6 border-b-sky-800 text-slate-950 font-display font-extrabold italic text-xl tracking-wide transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
          >
            <Lock className="w-5 h-5" />
            <span>CONFIRM &amp; LOCK CLUB NAME</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
};
