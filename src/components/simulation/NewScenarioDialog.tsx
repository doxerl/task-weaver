import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewScenarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string, type: 'positive' | 'negative') => void;
}

export function NewScenarioDialog({
  open,
  onOpenChange,
  onConfirm,
}: NewScenarioDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'positive' | 'negative'>('positive');

  const handleConfirm = () => {
    if (!name.trim()) return;
    onConfirm(name.trim(), type);
    setName('');
    setType('positive');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setName('');
    setType('positive');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Senaryo Oluştur</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="scenarioName">Senaryo Adı</Label>
            <Input
              id="scenarioName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="2026 Yatırım Senaryosu"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Senaryo Tipi</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('positive')}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  type === 'positive'
                    ? "border-green-500 bg-green-500/10"
                    : "border-border hover:border-green-500/50"
                )}
              >
                <TrendingUp className={cn(
                  "h-6 w-6",
                  type === 'positive' ? "text-green-500" : "text-muted-foreground"
                )} />
                <div className="text-center">
                  <p className={cn(
                    "font-medium text-sm",
                    type === 'positive' ? "text-green-500" : "text-foreground"
                  )}>
                    Pozitif
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Yatırım Alırsak
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('negative')}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  type === 'negative'
                    ? "border-red-500 bg-red-500/10"
                    : "border-border hover:border-red-500/50"
                )}
              >
                <TrendingDown className={cn(
                  "h-6 w-6",
                  type === 'negative' ? "text-red-500" : "text-muted-foreground"
                )} />
                <div className="text-center">
                  <p className={cn(
                    "font-medium text-sm",
                    type === 'negative' ? "text-red-500" : "text-foreground"
                  )}>
                    Negatif
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Yatırım Alamazsak
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            İptal
          </Button>
          <Button onClick={handleConfirm} disabled={!name.trim()}>
            Senaryo Oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
