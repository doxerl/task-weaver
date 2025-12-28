import { useState, useRef, useEffect } from 'react';
import { PlanItem } from '@/types/plan';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { SwipeableCard } from '@/components/SwipeableCard';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Check, X, Clock, MapPin, Github, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startEditing = (item: PlanItem) => {
    if (item.status !== 'done') {
      setEditingId(item.id);
      setEditValue(item.title);
    }
  };

  const handleSave = async () => {
    if (!editingId || !editValue.trim()) {
      setEditingId(null);
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  const handleStatusChange = async (item: PlanItem, newStatus: 'done' | 'skipped') => {
    const { error } = await supabase
      .from('plan_items')
      .update({ status: newStatus })
      .eq('id', item.id);

    if (error) {
      toast.error('Güncellenemedi');
      return;
    }

    toast.success(newStatus === 'done' ? 'Tamamlandı!' : 'Atlandı');
    onUpdate();
  };

  const handleDelete = async (item: PlanItem) => {
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
      {items.map((item) => (
        <SwipeableCard
          key={item.id}
          onSwipeLeft={() => handleDelete(item)}
          onSwipeRight={() => item.status === 'planned' && handleStatusChange(item, 'done')}
          disabled={item.status === 'done'}
          rightLabel="Tamamla"
          leftLabel="Sil"
        >
          <Card 
            className={`border-l-4 ${priorityColors[item.priority]} transition-all hover:shadow-md`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {statusIcons[item.status]}
                    {editingId === item.id ? (
                      <Input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className="h-7 px-2 font-medium flex-1"
                      />
                    ) : (
                      <h3 
                        className={`text-base font-semibold truncate group cursor-pointer hover:text-primary transition-colors ${item.status === 'done' ? 'line-through text-muted-foreground' : ''}`}
                        onClick={() => startEditing(item)}
                      >
                        {item.title}
                        {item.status !== 'done' && (
                          <Pencil className="h-3.5 w-3.5 ml-1.5 opacity-0 group-hover:opacity-50 inline-block" />
                        )}
                      </h3>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                    <span className="font-medium">
                      {format(new Date(item.start_at), 'HH:mm', { locale: tr })} - {format(new Date(item.end_at), 'HH:mm', { locale: tr })}
                    </span>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(item)}
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Mobile: Small hint for swipe */}
                <div className="md:hidden flex items-center">
                  <span className="text-xs text-muted-foreground/50">←→</span>
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
      ))}
    </div>
  );
}
