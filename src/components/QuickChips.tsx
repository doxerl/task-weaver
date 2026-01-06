import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addMinutes, format, setHours, setMinutes } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

interface QuickChipsProps {
  mode: 'plan' | 'actual';
  date: Date;
  onSuccess: () => void;
}

interface QuickItem {
  label: string;
  duration: number;
  tags: string[];
  defaultHour?: number;
}

const TODAY_ITEMS: QuickItem[] = [
  { label: 'Toplantı', duration: 60, tags: ['toplantı'] },
  { label: 'Odak Çalışma', duration: 90, tags: ['odak', 'deep-work'] },
  { label: 'Yemek', duration: 45, tags: ['yemek', 'ara'] },
  { label: 'Yolda', duration: 30, tags: ['yol', 'ulaşım'] },
  { label: 'Mola', duration: 15, tags: ['mola', 'ara'] },
];

const PAST_DAY_ITEMS: QuickItem[] = [
  { label: 'Sabah Toplantı', duration: 60, tags: ['toplantı'], defaultHour: 9 },
  { label: 'Öğlen Yemek', duration: 45, tags: ['yemek', 'ara'], defaultHour: 12 },
  { label: 'Öğleden Sonra', duration: 90, tags: ['odak', 'deep-work'], defaultHour: 14 },
  { label: 'Akşam Aktivite', duration: 60, tags: ['kişisel'], defaultHour: 18 },
];

export function QuickChips({ mode, date, onSuccess }: QuickChipsProps) {
  const { user } = useAuthContext();
  const [loadingItem, setLoadingItem] = useState<string | null>(null);

  const isPastDay = format(date, 'yyyy-MM-dd') < format(new Date(), 'yyyy-MM-dd');
  const items = isPastDay ? PAST_DAY_ITEMS : TODAY_ITEMS;

  const handleQuickAdd = async (item: QuickItem) => {
    if (!user) {
      toast.error('Giriş yapmalısınız');
      return;
    }

    setLoadingItem(item.label);

    try {
      let startAt: Date;
      
      if (isPastDay) {
        // Geçmiş gün - seçilen tarihin belirli saatini kullan
        const targetDate = new Date(date);
        startAt = setMinutes(setHours(targetDate, item.defaultHour || 12), 0);
      } else {
        // Bugün - mevcut mantık
        const now = new Date();
        startAt = mode === 'actual' ? now : new Date(date.setHours(now.getHours() + 1, 0, 0, 0));
      }
      
      const endAt = addMinutes(startAt, item.duration);

      // Geçmiş gün her zaman actual_entries'e kaydet
      if (isPastDay || mode === 'actual') {
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
      } else {
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
        <span className="text-xs text-muted-foreground shrink-0">
          {isPastDay ? 'Kayıt:' : 'Hızlı:'}
        </span>
        {items.map((item) => (
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
