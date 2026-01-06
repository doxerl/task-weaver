import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addMinutes, format, setHours, setMinutes } from 'date-fns';
import { Loader2, Plus, X } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface QuickChipsProps {
  mode: 'plan' | 'actual';
  date: Date;
  onSuccess: () => void;
}

interface QuickItem {
  id?: string;
  label: string;
  duration: number;
  tags: string[];
  defaultHour?: number;
  isCustom?: boolean;
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
  const [customChips, setCustomChips] = useState<QuickItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDuration, setNewDuration] = useState('30');
  const [newTags, setNewTags] = useState('');
  const [saving, setSaving] = useState(false);

  const isPastDay = format(date, 'yyyy-MM-dd') < format(new Date(), 'yyyy-MM-dd');
  const defaultItems = isPastDay ? PAST_DAY_ITEMS : TODAY_ITEMS;

  // Fetch user's custom chips
  useEffect(() => {
    if (!user) return;

    const fetchCustomChips = async () => {
      const { data, error } = await supabase
        .from('user_quick_chips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching custom chips:', error);
        return;
      }

      if (data) {
        setCustomChips(data.map(chip => ({
          id: chip.id,
          label: chip.label,
          duration: chip.duration,
          tags: chip.tags || [],
          defaultHour: chip.default_hour || 12,
          isCustom: true,
        })));
      }
    };

    fetchCustomChips();
  }, [user]);

  const handleQuickAdd = async (item: QuickItem) => {
    if (!user) {
      toast.error('Giriş yapmalısınız');
      return;
    }

    setLoadingItem(item.label);

    try {
      let startAt: Date;
      
      if (isPastDay) {
        const targetDate = new Date(date);
        startAt = setMinutes(setHours(targetDate, item.defaultHour || 12), 0);
      } else {
        const now = new Date();
        startAt = mode === 'actual' ? now : new Date(date.setHours(now.getHours() + 1, 0, 0, 0));
      }
      
      const endAt = addMinutes(startAt, item.duration);

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

  const handleAddCustomChip = async () => {
    if (!user || !newLabel.trim()) {
      toast.error('Lütfen bir isim girin');
      return;
    }

    setSaving(true);

    try {
      const tagsArray = newTags.trim() 
        ? newTags.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const { data, error } = await supabase
        .from('user_quick_chips')
        .insert([{
          user_id: user.id,
          label: newLabel.trim(),
          duration: parseInt(newDuration) || 30,
          tags: tagsArray,
          default_hour: 12,
        }])
        .select()
        .single();

      if (error) throw error;

      setCustomChips(prev => [...prev, {
        id: data.id,
        label: data.label,
        duration: data.duration,
        tags: data.tags || [],
        defaultHour: data.default_hour || 12,
        isCustom: true,
      }]);

      setNewLabel('');
      setNewDuration('30');
      setNewTags('');
      setDialogOpen(false);
      toast.success('Özel chip eklendi');
    } catch (error) {
      console.error('Error adding custom chip:', error);
      toast.error('Eklenemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomChip = async (chipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_quick_chips')
        .delete()
        .eq('id', chipId)
        .eq('user_id', user.id);

      if (error) throw error;

      setCustomChips(prev => prev.filter(c => c.id !== chipId));
      toast.success('Chip silindi');
    } catch (error) {
      console.error('Error deleting chip:', error);
      toast.error('Silinemedi');
    }
  };

  const allItems = [...defaultItems, ...customChips];

  return (
    <div className="mt-2 overflow-x-auto -mx-4 px-4 scrollbar-hide">
      <div className="flex gap-2 min-w-max items-center">
        <span className="text-xs text-muted-foreground shrink-0">
          {isPastDay ? 'Kayıt:' : 'Hızlı:'}
        </span>
        
        {allItems.map((item) => (
          <div key={item.id || item.label} className="relative group">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQuickAdd(item)}
              disabled={loadingItem !== null}
              className="shrink-0 text-xs h-8 pr-2"
            >
              {loadingItem === item.label ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                item.label
              )}
            </Button>
            {item.isCustom && item.id && (
              <button
                onClick={(e) => handleDeleteCustomChip(item.id!, e)}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        ))}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[320px]">
            <DialogHeader>
              <DialogTitle>Özel Chip Ekle</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="label">İsim</Label>
                <Input
                  id="label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Örn: Spor"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duration">Süre (dakika)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  placeholder="30"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tags">Etiketler (virgülle ayırın)</Label>
                <Input
                  id="tags"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="spor, kişisel"
                />
              </div>
              <Button onClick={handleAddCustomChip} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Ekle
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
