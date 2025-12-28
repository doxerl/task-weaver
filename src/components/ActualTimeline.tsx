import { useState, useRef, useEffect } from 'react';
import { ActualEntry } from '@/types/plan';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Activity, Github, Trash2, Link, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActualTimelineProps {
  entries: ActualEntry[];
  loading: boolean;
  onUpdate: () => void;
}

export function ActualTimeline({ entries, loading, onUpdate }: ActualTimelineProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<'title' | 'time' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId, editField]);

  const startEditingTitle = (entry: ActualEntry) => {
    setEditingId(entry.id);
    setEditField('title');
    setEditValue(entry.title);
  };

  const startEditingTime = (entry: ActualEntry) => {
    setEditingId(entry.id);
    setEditField('time');
    setEditStartTime(format(new Date(entry.start_at), 'HH:mm'));
    setEditEndTime(format(new Date(entry.end_at), 'HH:mm'));
  };

  const handleSaveTitle = async () => {
    if (!editingId || !editValue.trim()) {
      setEditingId(null);
      setEditField(null);
      return;
    }

    const { error } = await supabase
      .from('actual_entries')
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

    const entry = entries.find(e => e.id === editingId);
    if (!entry) return;

    const baseDate = new Date(entry.start_at);
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
      .from('actual_entries')
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

  const handleDelete = async (entry: ActualEntry) => {
    const { error } = await supabase
      .from('actual_entries')
      .delete()
      .eq('id', entry.id);

    if (error) {
      toast.error('Silinemedi');
      return;
    }

    toast.success('Silindi');
    onUpdate();
  };

  const calculateDuration = (start: string, end: string): string => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} dk`;
    }
    
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours} sa ${mins} dk` : `${hours} sa`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Activity className="mx-auto mb-3 h-12 w-12 opacity-50" />
        <p>Henüz kayıt yok</p>
        <p className="text-sm">"Şu an" veya "Az önce" komutlarıyla aktivite ekleyin</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <Card key={entry.id} className="border-l-4 border-l-accent transition-all hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-accent-foreground shrink-0" />
                  {editingId === entry.id && editField === 'title' ? (
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
                      className="font-medium truncate cursor-pointer hover:text-primary group flex items-center gap-1"
                      onClick={() => startEditingTitle(entry)}
                    >
                      {entry.title}
                      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 shrink-0" />
                    </h3>
                  )}
                </div>
                
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                  {editingId === entry.id && editField === 'time' ? (
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
                        onBlur={handleSaveTime}
                        onKeyDown={handleKeyDown}
                        className="w-24 text-sm border border-input rounded px-2 py-1 bg-background"
                      />
                    </div>
                  ) : (
                    <span 
                      className="cursor-pointer hover:text-primary group flex items-center gap-1"
                      onClick={() => startEditingTime(entry)}
                    >
                      {format(new Date(entry.start_at), 'HH:mm', { locale: tr })} - {format(new Date(entry.end_at), 'HH:mm', { locale: tr })}
                      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                    </span>
                  )}
                  <span className="text-primary font-medium">
                    {calculateDuration(entry.start_at, entry.end_at)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {entry.source === 'voice' && (
                    <Badge variant="outline" className="text-xs">🎤 Sesli</Badge>
                  )}
                  {entry.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {entry.linked_plan_item_id && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Link className="h-3 w-3" />
                      Plana bağlı
                    </Badge>
                  )}
                  {entry.linked_github && (
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Github className="h-3 w-3" />
                      #{entry.linked_github.number}
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(entry)}
                title="Sil"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {entry.notes && (
              <p className="mt-2 text-sm text-muted-foreground border-t pt-2">
                {entry.notes}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
