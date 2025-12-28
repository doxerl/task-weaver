import { PlanItem, ActualEntry } from '@/types/plan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Check, X, Clock, Activity, AlertTriangle } from 'lucide-react';

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
