import { useState, useCallback, useRef } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  disabled?: boolean;
}

interface SwipeGestureResult {
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  style: React.CSSProperties;
  isSwiping: boolean;
  direction: 'left' | 'right' | null;
  progress: number;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  disabled = false,
}: SwipeGestureOptions): SwipeGestureResult {
  const [deltaX, setDeltaX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    isHorizontalSwipe.current = null;
    setIsSwiping(true);
  }, [disabled]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || !isSwiping) return;
    const touch = e.touches[0];
    const currentDeltaX = touch.clientX - startX.current;
    const currentDeltaY = touch.clientY - startY.current;

    // Determine if this is a horizontal or vertical swipe
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(currentDeltaX) > 10 || Math.abs(currentDeltaY) > 10) {
        isHorizontalSwipe.current = Math.abs(currentDeltaX) > Math.abs(currentDeltaY);
      }
    }

    // Only allow horizontal swipes
    if (isHorizontalSwipe.current === false) {
      return;
    }

    // Clamp deltaX to prevent over-swiping
    const clampedDelta = Math.max(-150, Math.min(150, currentDeltaX));
    setDeltaX(clampedDelta);
  }, [disabled, isSwiping]);

  const onTouchEnd = useCallback(() => {
    if (disabled) return;
    
    if (Math.abs(deltaX) >= threshold) {
      if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      } else if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      }
    }
    
    setDeltaX(0);
    setIsSwiping(false);
    isHorizontalSwipe.current = null;
  }, [disabled, deltaX, threshold, onSwipeLeft, onSwipeRight]);

  const direction = deltaX < -20 ? 'left' : deltaX > 20 ? 'right' : null;
  const progress = Math.min(Math.abs(deltaX) / threshold, 1);

  const style: React.CSSProperties = {
    transform: `translateX(${deltaX}px)`,
    transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    style,
    isSwiping,
    direction,
    progress,
  };
}
