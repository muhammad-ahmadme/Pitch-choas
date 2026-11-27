import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface JoystickProps {
  team: 'blue' | 'red';
  ariaLabel: string;
  onTouchControl: (team: 'blue' | 'red', action: 'left' | 'right', active: boolean) => void;
  className?: string;
}

// The knob is half the base size, so max travel is base/4 and the deadzone
// is base/16. Both are derived from the rendered size at drag time so the
// joystick works at any responsive size (e.g. w-16 on small screens).
const DEADZONE_RATIO = 1 / 16;

export const Joystick: React.FC<JoystickProps> = ({
  team,
  ariaLabel,
  onTouchControl,
  className = '',
}) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const activePointerRef = useRef<number | null>(null);
  const lastLeanRef = useRef<-1 | 0 | 1>(0);
  const onTouchControlRef = useRef(onTouchControl);
  onTouchControlRef.current = onTouchControl;

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [lean, setLeanState] = useState<-1 | 0 | 1>(0);
  const [isDragging, setIsDragging] = useState(false);

  const setLean = useCallback(
    (next: -1 | 0 | 1) => {
      const prev = lastLeanRef.current;
      if (prev === next) return;
      if (prev === -1) onTouchControlRef.current(team, 'left', false);
      if (prev === 1) onTouchControlRef.current(team, 'right', false);
      if (next === -1) onTouchControlRef.current(team, 'left', true);
      if (next === 1) onTouchControlRef.current(team, 'right', true);
      lastLeanRef.current = next;
      setLeanState(next);
    },
    [team]
  );

  const updateFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current;
      if (!base) return;
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const maxRadius = rect.width / 4;
      const deadzone = rect.width * DEADZONE_RATIO;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > maxRadius) {
        dx = (dx / len) * maxRadius;
        dy = (dy / len) * maxRadius;
      }
      setOffset({ x: dx, y: dy });
      // The game only uses horizontal lean (-1 / 0 / 1), so vertical
      // drag moves the knob for feel but does not trigger an action.
      let next: -1 | 0 | 1 = 0;
      if (dx < -deadzone) next = -1;
      else if (dx > deadzone) next = 1;
      setLean(next);
    },
    [setLean]
  );

  const reset = useCallback(() => {
    activePointerRef.current = null;
    setIsDragging(false);
    setOffset({ x: 0, y: 0 });
    setLean(0);
  }, [setLean]);

  // Clear the touch state if the component unmounts mid-drag.
  useEffect(() => {
    return () => {
      const prev = lastLeanRef.current;
      if (prev === -1) onTouchControlRef.current(team, 'left', false);
      if (prev === 1) onTouchControlRef.current(team, 'right', false);
      lastLeanRef.current = 0;
      activePointerRef.current = null;
    };
  }, [team]);

  // Reset the knob if the window loses focus mid-drag.
  useEffect(() => {
    window.addEventListener('blur', reset);
    return () => window.removeEventListener('blur', reset);
  }, [reset]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerRef.current !== null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
    activePointerRef.current = e.pointerId;
    setIsDragging(true);
    updateFromClient(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerRef.current) return;
    e.preventDefault();
    updateFromClient(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerRef.current) return;
    e.preventDefault();
    reset();
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerRef.current) return;
    reset();
  };

  const handleLostPointerCapture = () => {
    if (activePointerRef.current !== null) reset();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setLean(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setLean(1);
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' && lastLeanRef.current === -1) {
      e.preventDefault();
      setLean(0);
    } else if (e.key === 'ArrowRight' && lastLeanRef.current === 1) {
      e.preventDefault();
      setLean(0);
    }
  };

  const isBlue = team === 'blue';

  return (
    <div
      ref={baseRef}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={lean}
      aria-orientation="horizontal"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={() => {
        if (activePointerRef.current === null) setLean(0);
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 touch-none select-none cursor-pointer outline-none focus-visible:ring-2 ${
        isBlue
          ? isDragging
            ? 'border-sky-300 bg-sky-950/90 focus-visible:ring-sky-300/70'
            : 'border-sky-400/50 bg-slate-950/80 focus-visible:ring-sky-300/70'
          : isDragging
            ? 'border-rose-300 bg-rose-950/90 focus-visible:ring-rose-300/70'
            : 'border-rose-400/50 bg-slate-950/80 focus-visible:ring-rose-300/70'
      } ${className}`}
    >
      <div className="absolute inset-2 rounded-full border border-white/10 pointer-events-none" />
      <ChevronLeft
        aria-hidden="true"
        className={`absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${
          isBlue ? 'text-sky-300/40' : 'text-rose-300/40'
        }`}
      />
      <ChevronRight
        aria-hidden="true"
        className={`absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${
          isBlue ? 'text-sky-300/40' : 'text-rose-300/40'
        }`}
      />
      <div
        aria-hidden="true"
        style={{
          transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
        }}
        className={`absolute left-1/2 top-1/2 w-1/2 h-1/2 rounded-full border-2 shadow-lg pointer-events-none ${
          isDragging ? 'transition-none' : 'transition-transform duration-150 ease-out'
        } ${
          isBlue
            ? 'bg-gradient-to-br from-sky-400 to-sky-600 border-sky-200/70'
            : 'bg-gradient-to-br from-rose-400 to-rose-600 border-rose-200/70'
        }`}
      />
    </div>
  );
};
