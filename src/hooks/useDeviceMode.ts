import { useEffect, useState } from 'react';

export type DeviceMode = 'mobile' | 'pc';

function detectInitialDeviceMode(): DeviceMode {
  if (typeof window === 'undefined') return 'pc';
  const hasCoarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ''
  );
  if (mobileUa || (hasCoarsePointer && hasTouch && window.innerWidth < 1180)) {
    return 'mobile';
  }
  return 'pc';
}

export function useDeviceMode(): DeviceMode {
  const [deviceMode, setDeviceMode] = useState<DeviceMode>(() => detectInitialDeviceMode());

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        setDeviceMode('mobile');
      } else if (e.pointerType === 'mouse' && window.innerWidth >= 1024) {
        // Keep current mode unless keyboard is used or non-touch desktop resize
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
          e.code
        )
      ) {
        setDeviceMode('pc');
      }
    };

    const handleResize = () => {
      // Re-detect on every resize so controls switch correctly when the
      // window is resized, rotated, or moved across breakpoints.
      setDeviceMode(detectInitialDeviceMode());
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    const visualViewport = window.visualViewport ?? null;
    visualViewport?.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  return deviceMode;
}
