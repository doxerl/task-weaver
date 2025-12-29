import { PlanItem, ActualEntry } from '@/types/plan';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Check, X, Clock, Activity, AlertTriangle, Lightbulb } from 'lucide-react';

interface CompareViewProps {
  planItems: PlanItem[];
  actualEntries: ActualEntry[];
  loading: boolean;
}

export function CompareView({ planItems, actualEntries, loading }: CompareViewProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const completedPlans = planItems.filter(p => p.status === 'done');
  const skippedPlans = planItems.filter(p => p.status === 'skipped');
  const pendingPlans = planItems.filter(p => p.status === 'planned');
  
  // Find unlinked actual entries (unplanned work)
  const unplannedActuals = actualEntries.filter(a => !a.linked_plan_item_id);

  // Calculate completion rate
  const totalPlanned = planItems.length;
  const completionRate = totalPlanned > 0 ? Math.round((completedPlans.length / totalPlanned) * 100) : 0;

  // Calculate total planned vs actual time
  const plannedMinutes = planItems.reduce((acc, item) => {
    const diff = new Date(item.end_at).getTime() - new Date(item.start_at).getTime();
    return acc + diff / 60000;
  }, 0);

  const actualMinutes = actualEntries.reduce((acc, entry) => {
    const diff = new Date(entry.end_at).getTime() - new Date(entry.start_at).getTime();
    return acc + diff / 60000;
  }, 0);

  const formatDuration = (mins: number): string => {
    const hours = Math.floor(mins / 60);
    const minutes = Math.round(mins % 60);
    if (hours === 0) return `${minutes} dk`;
    return minutes > 0 ? `${hours} sa ${minutes} dk` : `${hours} sa`;
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{completedPlans.length}/{planItems.length}</div>
            <div className="text-sm text-muted-foreground">Tamamlanan Plan</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent-foreground">{actualEntries.length}</div>
            <div className="text-sm text-muted-foreground">Kayıtlı Aktivite</div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Progress */}
      {totalPlanned > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Tamamlanma Oranı</span>
              <span className="text-sm font-medium">%{completionRate}</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-medium">{formatDuration(plannedMinutes)}</div>
            <div className="text-sm text-muted-foreground">Planlanan Süre</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-lg font-medium">{formatDuration(actualMinutes)}</div>
            <div className="text-sm text-muted-foreground">Gerçekleşen Süre</div>
          </CardContent>
        </Card>
      </div>

      {/* Completed Plans */}
      {completedPlans.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-green-600">
              <Check className="h-4 w-4" />
              Tamamlanan ({completedPlans.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedPlans.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>{item.title}</span>
                <span className="text-muted-foreground">
                  {format(new Date(item.start_at), 'HH:mm', { locale: tr })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Pending Plans */}
      {pendingPlans.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-primary">
              <Clock className="h-4 w-4" />
              Bekleyen ({pendingPlans.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingPlans.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span>{item.title}</span>
                <span className="text-muted-foreground">
                  {format(new Date(item.start_at), 'HH:mm', { locale: tr })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Skipped Plans */}
      {skippedPlans.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <X className="h-4 w-4" />
              Atlanan ({skippedPlans.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {skippedPlans.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm line-through text-muted-foreground">
                <span>{item.title}</span>
                <span>
                  {format(new Date(item.start_at), 'HH:mm', { locale: tr })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Unplanned Work */}
      {unplannedActuals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Plansız Çalışma ({unplannedActuals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unplannedActuals.map(entry => (
              <div key={entry.id} className="flex items-center justify-between text-sm">
                <span>{entry.title}</span>
                <span className="text-muted-foreground">
                  {format(new Date(entry.start_at), 'HH:mm', { locale: tr })} - {format(new Date(entry.end_at), 'HH:mm', { locale: tr })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Suggestions Section (from Review page) */}
      {(pendingPlans.length > 0 || skippedPlans.length > 0 || totalPlanned > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Değerlendirme
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Deferred tasks suggestion */}
            {(pendingPlans.length > 0 || skippedPlans.length > 0) && (
              <div className="bg-primary/10 rounded-lg p-3">
                <h4 className="font-medium mb-1 text-sm">📋 Ertelenen Görevler</h4>
                <p className="text-xs text-muted-foreground">
                  {pendingPlans.length + skippedPlans.length} görev tamamlanmadı. Bunları yarına eklemeyi düşünün.
                </p>
              </div>
            )}

            {/* Time management tip */}
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-medium mb-1 text-sm">⏰ Zaman Yönetimi</h4>
              <p className="text-xs text-muted-foreground">
                {completionRate >= 80 
                  ? "Harika bir gün! Bu tempoyu korumaya devam edin."
                  : completionRate >= 50
                    ? "Ortalama bir performans. Önceliklendirmeye daha fazla dikkat edin."
                    : completionRate > 0
                      ? "Düşük tamamlanma oranı. Daha az ama odaklı planlar yapmayı deneyin."
                      : "Henüz tamamlanmış görev yok."}
              </p>
            </div>

            {/* General tip */}
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-medium mb-1 text-sm">💡 İpucu</h4>
              <p className="text-xs text-muted-foreground">
                En verimli olduğunuz saatlerde en önemli işleri planlayın.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {planItems.length === 0 && actualEntries.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <Activity className="mx-auto mb-3 h-12 w-12 opacity-50" />
          <p>Karşılaştırılacak veri yok</p>
          <p className="text-sm">Plan ve aktivite ekleyerek karşılaştırma yapın</p>
        </div>
      )}
    </div>
  );
}
