import React, { useEffect, useRef } from 'react';
import { SoccerEngine } from '../game/engine';
import { renderGame } from '../game/renderer';
import { TeamInput } from '../game/types';

export interface TouchControlState {
  blueJumpHeld: boolean;
  blueJumpPressed: boolean;
  blueLeftHeld: boolean;
  blueRightHeld: boolean;
  blueAbilityPressed: boolean;
  redJumpHeld: boolean;
  redJumpPressed: boolean;
  redLeftHeld: boolean;
  redRightHeld: boolean;
  redAbilityPressed: boolean;
}

interface GameCanvasProps {
  engine: SoccerEngine;
  touchInputRef: React.MutableRefObject<TouchControlState>;
  onOnlineInput?: (input: {
    jumpHeld: boolean;
    jumpJustPressed: boolean;
    lean: -1 | 0 | 1;
    abilityJustPressed: boolean;
  }) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  engine,
  touchInputRef,
  onOnlineInput,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onOnlineInputRef = useRef(onOnlineInput);
  onOnlineInputRef.current = onOnlineInput;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const heldKeys = new Set<string>();
    const justPressedKeys = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key) ||
        ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)
      ) {
        if (engine.phase === 'PLAYING' || engine.phase === 'GOAL_CELEBRATION') {
          e.preventDefault();
        }
      }
      if (!heldKeys.has(e.code)) {
        justPressedKeys.add(e.code);
      }
      heldKeys.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeys.delete(e.code);
    };

    const clearAllKeys = () => {
      heldKeys.clear();
      justPressedKeys.clear();
      touchInputRef.current.blueJumpHeld = false;
      touchInputRef.current.blueJumpPressed = false;
      touchInputRef.current.blueLeftHeld = false;
      touchInputRef.current.blueRightHeld = false;
      touchInputRef.current.blueAbilityPressed = false;
      touchInputRef.current.redJumpHeld = false;
      touchInputRef.current.redJumpPressed = false;
      touchInputRef.current.redLeftHeld = false;
      touchInputRef.current.redRightHeld = false;
      touchInputRef.current.redAbilityPressed = false;
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearAllKeys);

    let rafId = 0;
    let lastTime = performance.now();
    let lastOnlineSendTime = 0;
    let lastOnlineLean: -1 | 0 | 1 = 0;
    let lastOnlineJumpHeld = false;

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      const isSingleInput =
        engine.config.mode === '1P' ||
        engine.config.mode === 'career' ||
        engine.config.mode === 'online';
      const touch = touchInputRef.current;

      const blueJumpKeys = isSingleInput ? ['KeyW', 'Space', 'ArrowUp'] : ['KeyW', 'Space'];
      const blueJumpHeld =
        blueJumpKeys.some((k) => heldKeys.has(k)) || touch.blueJumpHeld;
      const blueJumpJustPressed =
        blueJumpKeys.some((k) => justPressedKeys.has(k)) || touch.blueJumpPressed;

      const blueGoLeft =
        heldKeys.has('KeyA') || (isSingleInput && heldKeys.has('ArrowLeft')) || touch.blueLeftHeld;
      const blueGoRight =
        heldKeys.has('KeyD') || (isSingleInput && heldKeys.has('ArrowRight')) || touch.blueRightHeld;

      let blueLean: -1 | 0 | 1 = 0;
      if (blueGoLeft && !blueGoRight) blueLean = -1;
      else if (blueGoRight && !blueGoLeft) blueLean = 1;

      const blueAbilityJustPressed =
        justPressedKeys.has('KeyS') ||
        justPressedKeys.has('KeyE') ||
        (isSingleInput && justPressedKeys.has('ArrowDown')) ||
        touch.blueAbilityPressed;

      const blueInput: TeamInput = {
        jumpHeld: blueJumpHeld,
        jumpJustPressed: blueJumpJustPressed,
        lean: blueLean,
        abilityJustPressed: blueAbilityJustPressed,
      };

      const redJumpHeld = heldKeys.has('ArrowUp') || touch.redJumpHeld;
      const redJumpJustPressed = justPressedKeys.has('ArrowUp') || touch.redJumpPressed;

      const redGoLeft = heldKeys.has('ArrowLeft') || touch.redLeftHeld;
      const redGoRight = heldKeys.has('ArrowRight') || touch.redRightHeld;

      let redLean: -1 | 0 | 1 = 0;
      if (redGoLeft && !redGoRight) redLean = -1;
      else if (redGoRight && !redGoLeft) redLean = 1;

      const redAbilityJustPressed =
        justPressedKeys.has('ArrowDown') || touch.redAbilityPressed;

      const redInput: TeamInput = {
        jumpHeld: redJumpHeld,
        jumpJustPressed: redJumpJustPressed,
        lean: redLean,
        abilityJustPressed: redAbilityJustPressed,
      };

      justPressedKeys.clear();
      touch.blueJumpPressed = false;
      touch.blueAbilityPressed = false;
      touch.redJumpPressed = false;
      touch.redAbilityPressed = false;

      if (engine.config.mode === 'online') {
        const changed =
          blueLean !== lastOnlineLean ||
          blueJumpHeld !== lastOnlineJumpHeld ||
          blueJumpJustPressed ||
          blueAbilityJustPressed;
        if (changed || now - lastOnlineSendTime > 55) {
          onOnlineInputRef.current?.({
            jumpHeld: blueJumpHeld,
            jumpJustPressed: blueJumpJustPressed,
            lean: blueLean,
            abilityJustPressed: blueAbilityJustPressed,
          });
          lastOnlineSendTime = now;
          lastOnlineLean = blueLean;
          lastOnlineJumpHeld = blueJumpHeld;
        }
        engine.stepOnlineVisuals(rawDt);
      } else {
        engine.step(rawDt, blueInput, redInput);
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderGame(ctx, engine, width, height);
      ctx.restore();

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearAllKeys);
    };
  }, [engine, touchInputRef]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
