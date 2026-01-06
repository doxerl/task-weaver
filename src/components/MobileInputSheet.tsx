import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/VoiceInput';
import { QuickChips } from '@/components/QuickChips';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { ChevronUp, Mic } from 'lucide-react';
import { format } from 'date-fns';

interface MobileInputSheetProps {
  mode: 'plan' | 'actual';
  onModeChange: (mode: 'plan' | 'actual') => void;
  date: Date;
  onSuccess: () => void;
}

export function MobileInputSheet({ mode, onModeChange, date, onSuccess }: MobileInputSheetProps) {
  const [open, setOpen] = useState(false);
  const [autoStartRecording, setAutoStartRecording] = useState(false);
  
  const isPastDay = format(date, 'yyyy-MM-dd') < format(new Date(), 'yyyy-MM-dd');

  const handleSuccess = useCallback(() => {
    onSuccess();
    setOpen(false);
    setAutoStartRecording(false);
  }, [onSuccess]);

  const handleMicClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setAutoStartRecording(true);
    setOpen(true);
  }, []);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setAutoStartRecording(false);
    }
  }, []);

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <div className="fixed bottom-16 left-0 right-0 z-50 bg-card border-t shadow-lg">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Left: Mode indicator */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                {mode === 'plan' ? 'Plan Ekle' : 'Kayıt Ekle'}
              </span>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {/* Center: Handle bar */}
            <div className="absolute left-1/2 -translate-x-1/2 top-1.5">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            
            {/* Right: Quick mic button */}
            <Button 
              size="icon" 
              variant="default"
              className="h-10 w-10 rounded-full"
              onClick={handleMicClick}
            >
              <Mic className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </DrawerTrigger>

      <DrawerContent className="max-h-[85vh]">
        <div className="px-4 pb-6 pt-2">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={mode === 'plan' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModeChange('plan')}
              disabled={isPastDay}
              className="flex-1 h-10"
            >
              Plan
            </Button>
            <Button
              variant={mode === 'actual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModeChange('actual')}
              className="flex-1 h-10"
            >
              Gerçek
            </Button>
          </div>

          {/* Hint text */}
          <p className="text-sm text-muted-foreground mb-3 text-center">
            {mode === 'plan' ? 'Ne yapacaksın?' : 'Ne yaptın?'}
          </p>

          {/* Voice Input */}
          <VoiceInput 
            mode={mode} 
            date={date}
            onSuccess={handleSuccess}
            embedded
            autoStart={autoStartRecording}
          />

          {/* Quick Chips */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Hızlı Seçenekler</p>
            <QuickChips 
              mode={mode}
              date={date}
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
