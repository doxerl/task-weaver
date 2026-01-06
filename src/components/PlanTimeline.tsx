import { useState, useRef, useEffect } from 'react';
import { PlanItem } from '@/types/plan';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { SwipeableCard } from '@/components/SwipeableCard';
import { isPlanFrozen } from '@/lib/planUtils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Check, X, Clock, MapPin, Github, Trash2, Pencil, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRecordEstimation } from '@/hooks/useEstimation';

interface PlanTimelineProps {
  items: PlanItem[];
  loading: boolean;
  onUpdate: () => void;
}

const priorityColors: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/30',
  med: 'bg-primary/10 text-primary border-primary/30',
  low: 'bg-muted text-muted-foreground border-border',
};

const statusIcons: Record<string, React.ReactNode> = {
  done: <Check className="h-4 w-4 text-green-600" />,
  skipped: <X className="h-4 w-4 text-muted-foreground" />,
  planned: <Clock className="h-4 w-4 text-primary" />,
};

export function PlanTimeline({ items, loading, onUpdate }: PlanTimelineProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<'title' | 'time' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const recordEstimation = useRecordEstimation();

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId, editField]);

  const startEditingTitle = (item: PlanItem) => {
    if (item.status !== 'done' && !isPlanFrozen(item)) {
      setEditingId(item.id);
      setEditField('title');
      setEditValue(item.title);
    }
  };

  const startEditingTime = (item: PlanItem) => {
    if (item.status !== 'done' && !isPlanFrozen(item)) {
      setEditingId(item.id);
      setEditField('time');
      setEditStartTime(format(new Date(item.start_at), 'HH:mm'));
      setEditEndTime(format(new Date(item.end_at), 'HH:mm'));
    }
  };

  const handleSaveTitle = async () => {
    if (!editingId || !editValue.trim()) {
      setEditingId(null);
      setEditField(null);
      return;
    }

    const { error } = await supabase
      .from('plan_items')
      .update({ title: editValue.trim() })
      .eq('id', editingId);

    if (error) {
      toast.error('Güncellenemedi');
    } else {
      toast.success('Güncellendi');
      onUpdate();
    }

    setEditingId(null);
    setEditField(null);
  };

  const handleSaveTime = async () => {
    if (!editingId) {
      setEditingId(null);
      setEditField(null);
      return;
    }

    const item = items.find(i => i.id === editingId);
    if (!item) return;

    const baseDate = new Date(item.start_at);
    const [startHour, startMin] = editStartTime.split(':').map(Number);
    const [endHour, endMin] = editEndTime.split(':').map(Number);

    const newStartAt = new Date(baseDate);
    newStartAt.setHours(startHour, startMin, 0, 0);

    const newEndAt = new Date(baseDate);
    newEndAt.setHours(endHour, endMin, 0, 0);

    // If end time is before start time, assume it's the next day
    if (newEndAt <= newStartAt) {
      newEndAt.setDate(newEndAt.getDate() + 1);
    }

    const { error } = await supabase
      .from('plan_items')
      .update({ 
        start_at: newStartAt.toISOString(),
        end_at: newEndAt.toISOString()
      })
      .eq('id', editingId);

    if (error) {
      toast.error('Güncellenemedi');
    } else {
      toast.success('Güncellendi');
      onUpdate();
    }

    setEditingId(null);
    setEditField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editField === 'title') {
        handleSaveTitle();
      } else if (editField === 'time') {
        handleSaveTime();
      }
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditField(null);
    }
  };

  const handleStatusChange = async (item: PlanItem, newStatus: 'done' | 'skipped') => {
    // 1. Plan durumunu güncelle
    const { error: planError } = await supabase
      .from('plan_items')
      .update({ status: newStatus })
      .eq('id', item.id);

    if (planError) {
      toast.error('Güncellenemedi');
      return;
    }

    // 2. Eğer tamamlandıysa, actual_entries'e de kayıt ekle (duplicate kontrolü ile)
    if (newStatus === 'done') {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        // Önce bu plan için zaten actual entry var mı kontrol et
        const { data: existingEntry } = await supabase
          .from('actual_entries')
          .select('id')
          .eq('linked_plan_item_id', item.id)
          .maybeSingle();

        if (!existingEntry) {
          const { error: actualError } = await supabase
            .from('actual_entries')
            .insert({
              user_id: userData.user.id,
              title: item.title,
              start_at: item.start_at,
              end_at: item.end_at,
              tags: item.tags,
              notes: item.notes,
              source: 'review',
              linked_plan_item_id: item.id,
              deviation_minutes: 0,
              match_method: 'auto_complete'
            });

          if (actualError) {
            console.error('Actual entry oluşturulamadı:', actualError);
            toast.warning('Tamamlandı, ama gerçekleşen kaydı oluşturulamadı');
          }
        }

        // 3. Tahmin kalibrasyonu için kayıt oluştur
        const estimatedMinutes = (item as any).estimated_duration_minutes ?? 
          Math.round((new Date(item.end_at).getTime() - new Date(item.start_at).getTime()) / 60000);
        const actualMinutes = Math.round(
          (new Date(item.end_at).getTime() - new Date(item.start_at).getTime()) / 60000
        );
        const category = item.tags.length > 0 ? item.tags[0] : 'Genel';

        recordEstimation.mutate({
          planItemId: item.id,
          category,
          estimatedMinutes,
          actualMinutes,
        });
      }
    }

    toast.success(newStatus === 'done' ? 'Tamamlandı!' : 'Atlandı');
    onUpdate();
  };

  const handleDelete = async (item: PlanItem) => {
    // Don't allow deletion of frozen plans
    if (isPlanFrozen(item)) {
      toast.error('Dondurulmuş planlar silinemez');
      return;
    }

    const { error } = await supabase
      .from('plan_items')
      .delete()
      .eq('id', item.id);

    if (error) {
      toast.error('Silinemedi');
      return;
    }

    toast.success('Silindi');
    onUpdate();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Clock className="mx-auto mb-3 h-12 w-12 opacity-50" />
        <p>Henüz plan eklenmemiş</p>
        <p className="text-sm">Sesli veya yazılı komutla plan ekleyin</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const frozen = isPlanFrozen(item);
        const canEdit = !frozen && item.status !== 'done';
        
        return (
          <SwipeableCard
            key={item.id}
            onSwipeLeft={() => !frozen && handleDelete(item)}
            onSwipeRight={() => item.status === 'planned' && handleStatusChange(item, 'done')}
            disabled={item.status === 'done' || frozen}
            rightLabel="Tamamla"
            leftLabel="Sil"
          >
            <Card 
              className={`border-l-4 ${priorityColors[item.priority]} transition-all hover:shadow-md ${frozen ? 'opacity-80' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {frozen ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        statusIcons[item.status]
                      )}
                      {editingId === item.id && editField === 'title' ? (
                        <Input
                          ref={inputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleSaveTitle}
                          onKeyDown={handleKeyDown}
                          className="h-7 px-2 font-medium flex-1"
                        />
                      ) : (
                        <h3 
                          className={`text-base font-semibold truncate group ${canEdit ? 'cursor-pointer hover:text-primary' : ''} transition-colors ${item.status === 'done' ? 'line-through text-muted-foreground' : ''}`}
                          onClick={() => canEdit && startEditingTitle(item)}
                        >
                          {item.title}
                          {canEdit && (
                            <Pencil className="h-3.5 w-3.5 ml-1.5 opacity-0 group-hover:opacity-50 inline-block" />
                          )}
                        </h3>
                      )}
                      {frozen && (
                        <Badge variant="secondary" className="text-xs">
                          🔒 Donduruldu
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                      {editingId === item.id && editField === 'time' ? (
                        <div className="flex items-center gap-1">
                          <input 
                            type="time" 
                            value={editStartTime}
                            onChange={(e) => setEditStartTime(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-24 text-sm border border-input rounded px-2 py-1 bg-background"
                          />
                          <span>-</span>
                          <input 
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            type="time" 
                            value={editEndTime}
                            onChange={(e) => setEditEndTime(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-24 text-sm border border-input rounded px-2 py-1 bg-background"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-green-600 hover:text-green-700"
                            onClick={handleSaveTime}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground"
                            onClick={() => {
                              setEditingId(null);
                              setEditField(null);
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span 
                            className={`font-medium ${canEdit ? 'cursor-pointer hover:text-primary' : ''} group flex items-center gap-1`}
                            onClick={() => canEdit && startEditingTime(item)}
                          >
                            {format(new Date(item.start_at), 'HH:mm', { locale: tr })} - {format(new Date(item.end_at), 'HH:mm', { locale: tr })}
                            {canEdit && (
                              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                            )}
                          </span>
                          {new Date(item.end_at) <= new Date(item.start_at) && (
                            <Badge variant="destructive" className="text-xs">
                              ⚠️ Geçersiz zaman
                            </Badge>
                          )}
                        </>
                      )}
                      {item.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.location}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {item.type === 'task' ? 'Görev' : item.type === 'event' ? 'Etkinlik' : 'Alışkanlık'}
                      </Badge>
                      {item.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {item.linked_github && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Github className="h-3 w-3" />
                          #{item.linked_github.number}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Desktop action buttons - hidden on mobile */}
                  <div className="hidden md:flex flex-col gap-1">
                    {item.status === 'planned' && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleStatusChange(item, 'done')}
                          title="Tamamla"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleStatusChange(item, 'skipped')}
                          title="Atla"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {!frozen && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(item)}
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Mobile: Small hint for swipe */}
                  <div className="md:hidden flex items-center">
                    {!frozen && <span className="text-xs text-muted-foreground/50">←→</span>}
                  </div>
                </div>

                {item.notes && (
                  <p className="mt-2 text-sm text-muted-foreground border-t pt-2">
                    {item.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          </SwipeableCard>
        );
      })}
    </div>
  );
}
