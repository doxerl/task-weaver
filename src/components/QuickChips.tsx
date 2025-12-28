import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addMinutes } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

interface QuickChipsProps {
  mode: 'plan' | 'actual';
  date: Date;
  onSuccess: () => void;
}

const QUICK_ITEMS = [
  { label: 'Toplantı', duration: 60, tags: ['toplantı'] },
  { label: 'Odak Çalışma', duration: 90, tags: ['odak', 'deep-work'] },
  { label: 'Yemek', duration: 45, tags: ['yemek', 'ara'] },
  { label: 'Yolda', duration: 30, tags: ['yol', 'ulaşım'] },
  { label: 'Mola', duration: 15, tags: ['mola', 'ara'] },
];

export function QuickChips({ mode, date, onSuccess }: QuickChipsProps) {
  const { user } = useAuthContext();
  const [loadingItem, setLoadingItem] = useState<string | null>(null);

  const handleQuickAdd = async (item: typeof QUICK_ITEMS[0]) => {
    if (!user) {
      toast.error('Giriş yapmalısınız');
      return;
    }

    setLoadingItem(item.label);

    try {
      const now = new Date();
      const startAt = mode === 'actual' ? now : new Date(date.setHours(now.getHours() + 1, 0, 0, 0));
      const endAt = addMinutes(startAt, item.duration);

      if (mode === 'plan') {
        const { error } = await supabase.from('plan_items').insert([{
          user_id: user.id,
          title: item.label,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          type: 'event',
          tags: item.tags,
          source: 'manual'
        }]);

        if (error) throw error;
        toast.success(`"${item.label}" planlandı`);
      } else {
        const { error } = await supabase.from('actual_entries').insert([{
          user_id: user.id,
          title: item.label,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          tags: item.tags,
          source: 'text'
        }]);

        if (error) throw error;
        toast.success(`"${item.label}" kaydedildi`);
      }

      onSuccess();
    } catch (error) {
      console.error('Quick add error:', error);
      toast.error('Eklenemedi');
    } finally {
      setLoadingItem(null);
    }
  };

  return (
    <div className="mt-2 overflow-x-auto -mx-4 px-4 scrollbar-hide">
      <div className="flex gap-2 min-w-max items-center">
        <span className="text-xs text-muted-foreground shrink-0">Hızlı:</span>
        {QUICK_ITEMS.map((item) => (
          <Button
            key={item.label}
            variant="secondary"
            size="sm"
            onClick={() => handleQuickAdd(item)}
            disabled={loadingItem !== null}
            className="shrink-0 text-xs h-8"
          >
            {loadingItem === item.label ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              item.label
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}
