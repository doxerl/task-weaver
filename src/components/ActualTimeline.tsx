import { useState, useRef, useEffect } from 'react';
import { ActualEntry, PlanItem } from '@/types/plan';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calculateDeviation, isWithinTolerance, formatDeviation, getDeviationStatus } from '@/lib/planUtils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Activity, Github, Trash2, Link, Pencil, Check, X, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActualTimelineProps {
  entries: ActualEntry[];
  planItems?: PlanItem[];
  loading: boolean;
  onUpdate: () => void;
}

export function ActualTimeline({ entries, planItems = [], loading, onUpdate }: ActualTimelineProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<'title' | 'time' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [linkingId, setLinkingId] = useState<string | null>(null);
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

    // Recalculate deviation if linked to a plan
    let deviationMinutes: number | null = null;
    if (entry.linked_plan_item_id) {
      const linkedPlan = planItems.find(p => p.id === entry.linked_plan_item_id);
      if (linkedPlan) {
        const actualStart = newStartAt.getTime();
        const plannedStart = new Date(linkedPlan.start_at).getTime();
        deviationMinutes = Math.round((actualStart - plannedStart) / 60000);
      }
    }

    const { error } = await supabase
      .from('actual_entries')
      .update({ 
        start_at: newStartAt.toISOString(),
        end_at: newEndAt.toISOString(),
        deviation_minutes: deviationMinutes
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

  const handleLinkToPlan = async (entryId: string, planId: string | null) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    let deviationMinutes: number | null = null;
    let matchMethod: string | null = null;

    if (planId) {
      const linkedPlan = planItems.find(p => p.id === planId);
      if (linkedPlan) {
        deviationMinutes = calculateDeviation(entry, linkedPlan);
        matchMethod = 'manual';
      }
    }

    const { error } = await supabase
      .from('actual_entries')
      .update({ 
        linked_plan_item_id: planId,
        deviation_minutes: deviationMinutes,
        match_method: matchMethod
      })
      .eq('id', entryId);

    if (error) {
      toast.error('Bağlantı güncellenemedi');
    } else {
      toast.success(planId ? 'Plana bağlandı' : 'Bağlantı kaldırıldı');
      onUpdate();
    }
    
    setLinkingId(null);
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

  const getLinkedPlan = (entry: ActualEntry): PlanItem | undefined => {
    return planItems.find(p => p.id === entry.linked_plan_item_id);
  };

  const getDeviationBadge = (entry: ActualEntry) => {
    if (!entry.linked_plan_item_id || entry.deviation_minutes === null) return null;
    
    const deviation = entry.deviation_minutes;
    const status = getDeviationStatus(deviation);
    const withinTolerance = isWithinTolerance(deviation);
    
    return (
      <Badge 
        variant={withinTolerance ? 'secondary' : 'destructive'} 
        className={`text-xs flex items-center gap-1 ${
          status === 'early' ? 'bg-blue-100 text-blue-700' :
          status === 'late' ? 'bg-amber-100 text-amber-700' :
          'bg-green-100 text-green-700'
        }`}
      >
        {status === 'early' && <Clock className="h-3 w-3" />}
        {status === 'late' && <AlertCircle className="h-3 w-3" />}
        {status === 'on-time' && <Check className="h-3 w-3" />}
        {status === 'early' ? `-${formatDeviation(deviation)}` :
         status === 'late' ? `+${formatDeviation(deviation)}` :
         'Zamanında'}
      </Badge>
    );
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

  // Available plans for linking (same day, not already linked)
  const linkedPlanIds = entries.filter(e => e.linked_plan_item_id).map(e => e.linked_plan_item_id);
  const availablePlans = planItems.filter(p => !linkedPlanIds.includes(p.id));

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const linkedPlan = getLinkedPlan(entry);
        
        return (
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

                  <div className="flex flex-wrap gap-1 items-center">
                    {entry.source === 'voice' && (
                      <Badge variant="outline" className="text-xs">🎤 Sesli</Badge>
                    )}
                    {entry.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    
                    {/* Plan link section */}
                    {linkingId === entry.id ? (
                      <Select
                        value={entry.linked_plan_item_id || 'none'}
                        onValueChange={(value) => handleLinkToPlan(entry.id, value === 'none' ? null : value)}
                      >
                        <SelectTrigger className="h-6 w-40 text-xs">
                          <SelectValue placeholder="Plan seç..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Bağlantı yok</SelectItem>
                          {availablePlans.map(plan => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.title}
                            </SelectItem>
                          ))}
                          {entry.linked_plan_item_id && linkedPlan && (
                            <SelectItem value={entry.linked_plan_item_id}>
                              {linkedPlan.title} (mevcut)
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    ) : entry.linked_plan_item_id && linkedPlan ? (
                      <Badge 
                        variant="outline" 
                        className="text-xs flex items-center gap-1 cursor-pointer hover:bg-muted"
                        onClick={() => setLinkingId(entry.id)}
                      >
                        <Link className="h-3 w-3" />
                        {linkedPlan.title}
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                        onClick={() => setLinkingId(entry.id)}
                      >
                        <Link className="h-3 w-3 mr-1" />
                        Plana Bağla
                      </Button>
                    )}
                    
                    {/* Deviation badge */}
                    {getDeviationBadge(entry)}
                    
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
        );
      })}
    </div>
  );
}
