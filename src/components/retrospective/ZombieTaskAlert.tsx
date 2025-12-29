import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ghost, Trash2, Scissors, Play } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ZombieTask {
  id: string;
  title: string;
  carry_over_count: number;
}

interface ZombieTaskAlertProps {
  tasks: ZombieTask[];
  onRefresh: () => void;
}

export function ZombieTaskAlert({ tasks, onRefresh }: ZombieTaskAlertProps) {
  if (tasks.length === 0) return null;

  const handleDelete = async (taskId: string) => {
    const { error } = await supabase
      .from('plan_items')
      .delete()
      .eq('id', taskId);
    
    if (error) {
      toast.error('Görev silinemedi');
    } else {
      toast.success('Zombi görev silindi');
      onRefresh();
    }
  };

  const handleBreakDown = async (task: ZombieTask) => {
    // Mark original as done with note
    const { error } = await supabase
      .from('plan_items')
      .update({ 
        status: 'skipped',
        notes: 'Parçalandı - alt görevlere bölündü'
      })
      .eq('id', task.id);
    
    if (error) {
      toast.error('İşlem başarısız');
    } else {
      toast.success('Görevi parçalayabilirsin. Yeni görevler ekle!');
      onRefresh();
    }
  };

  const handleDoThisWeek = async (task: ZombieTask) => {
    // Reset carry count and schedule for this week
    const today = new Date();
    const startAt = new Date(today);
    startAt.setHours(9, 0, 0, 0);
    const endAt = new Date(today);
    endAt.setHours(10, 0, 0, 0);

    const { error } = await supabase
      .from('plan_items')
      .update({ 
        carry_over_count: 0,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status: 'pending'
      })
      .eq('id', task.id);
    
    if (error) {
      toast.error('İşlem başarısız');
    } else {
      toast.success('Görev bu haftaya eklendi');
      onRefresh();
    }
  };

  return (
    <Card className="border-orange-500/50 bg-orange-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Ghost className="h-5 w-5 text-orange-500" />
          Zombi Görevler
          <Badge variant="destructive" className="ml-auto">
            {tasks.length}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          3+ kez taşınan görevler. Bunlarla yüzleşme zamanı!
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => (
          <div 
            key={task.id} 
            className="flex items-center justify-between p-3 bg-background rounded-lg border"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                {task.carry_over_count}x taşındı
              </p>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => handleDelete(task.id)}
                title="Sil"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => handleBreakDown(task)}
                title="Parçala"
              >
                <Scissors className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-green-600 hover:text-green-600"
                onClick={() => handleDoThisWeek(task)}
                title="Bu hafta yap"
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
