import { ReactNode } from 'react';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { Check, Trash2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  disabled?: boolean;
  leftLabel?: string;
  rightLabel?: string;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
  leftLabel = 'Sil',
  rightLabel = 'Tamamla',
}: SwipeableCardProps) {
  const isMobile = useIsMobile();
  
  const { handlers, style, direction, progress } = useSwipeGesture({
    onSwipeLeft,
    onSwipeRight,
    threshold: 80,
    disabled: disabled || !isMobile,
  });

  // Don't apply swipe functionality on desktop
  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background actions */}
      <div className="absolute inset-0 flex">
        {/* Right swipe background (Complete - Green) */}
        <div 
          className="flex-1 flex items-center justify-start pl-4 bg-green-500 transition-opacity"
          style={{ opacity: direction === 'right' ? progress : 0 }}
        >
          <div className="flex items-center gap-2 text-white font-medium">
            <Check className="h-6 w-6" />
            <span className="text-sm">{rightLabel}</span>
          </div>
        </div>
        
        {/* Left swipe background (Delete - Red) */}
        <div 
          className="flex-1 flex items-center justify-end pr-4 bg-destructive transition-opacity"
          style={{ opacity: direction === 'left' ? progress : 0 }}
        >
          <div className="flex items-center gap-2 text-white font-medium">
            <span className="text-sm">{leftLabel}</span>
            <Trash2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Swipeable content */}
      <div
        {...handlers}
        style={style}
        className="relative bg-background"
      >
        {children}
      </div>
    </div>
  );
}
