import { ActualEntry } from '@/types/plan';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Activity, Github, Trash2, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ActualTimelineProps {
  entries: ActualEntry[];
  loading: boolean;
  onUpdate: () => void;
}

export function ActualTimeline({ entries, loading, onUpdate }: ActualTimelineProps) {
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
                  <Activity className="h-4 w-4 text-accent-foreground" />
                  <h3 className="font-medium truncate">{entry.title}</h3>
                </div>
                
                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                  <span>
                    {format(new Date(entry.start_at), 'HH:mm', { locale: tr })} - {format(new Date(entry.end_at), 'HH:mm', { locale: tr })}
                  </span>
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
