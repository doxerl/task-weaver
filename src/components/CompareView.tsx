import { PlanItem, ActualEntry } from '@/types/plan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { calculateDayMetrics, isWithinTolerance, formatDeviation, getDeviationStatus, DEVIATION_TOLERANCE } from '@/lib/planUtils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Check, X, Clock, Activity, AlertTriangle, Lightbulb, TrendingUp, TrendingDown, Minus, Link } from 'lucide-react';
import { EstimationInsights } from '@/components/estimation/EstimationInsights';

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
  const linkedActuals = actualEntries.filter(a => a.linked_plan_item_id);

  // Calculate metrics
  const today = new Date().toISOString().split('T')[0];
  const metrics = calculateDayMetrics(planItems, actualEntries, today);

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

  // Calculate deviation distribution
  const deviationCounts = { early: 0, onTime: 0, late: 0 };
  linkedActuals.forEach(entry => {
    if (entry.deviation_minutes !== null) {
      const status = getDeviationStatus(entry.deviation_minutes);
      if (status === 'early') deviationCounts.early++;
      else if (status === 'late') deviationCounts.late++;
      else deviationCounts.onTime++;
    }
  });

  const totalDeviations = deviationCounts.early + deviationCounts.onTime + deviationCounts.late;
  const toleranceRate = totalDeviations > 0 
    ? Math.round((deviationCounts.onTime / totalDeviations) * 100) 
    : 0;

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
      {planItems.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Tamamlanma Oranı</span>
              <span className="text-sm font-medium">%{metrics.completion_rate ?? 0}</span>
            </div>
            <Progress value={metrics.completion_rate ?? 0} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Focus Score */}
      {metrics.focus_score !== null && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Odaklanma Skoru</span>
              <span className={`text-sm font-bold ${
                metrics.focus_score >= 80 ? 'text-green-600' :
                metrics.focus_score >= 60 ? 'text-amber-600' :
                'text-red-600'
              }`}>
                {metrics.focus_score}/100
              </span>
            </div>
            <Progress 
              value={metrics.focus_score} 
              className={`h-2 ${
                metrics.focus_score >= 80 ? '[&>div]:bg-green-600' :
                metrics.focus_score >= 60 ? '[&>div]:bg-amber-500' :
                '[&>div]:bg-red-500'
              }`} 
            />
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.focus_score >= 80 ? 'Harika performans!' :
               metrics.focus_score >= 60 ? 'İyi gidiyorsunuz, biraz daha odaklanma gerekli.' :
               'Planlara uyum artırılmalı.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Deviation Summary */}
      {linkedActuals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Sapma Analizi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-blue-50 rounded-lg p-2">
                <div className="flex items-center justify-center gap-1 text-blue-600">
                  <TrendingDown className="h-3 w-3" />
                  <span className="text-lg font-bold">{deviationCounts.early}</span>
                </div>
                <div className="text-xs text-muted-foreground">Erken</div>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <div className="flex items-center justify-center gap-1 text-green-600">
                  <Minus className="h-3 w-3" />
                  <span className="text-lg font-bold">{deviationCounts.onTime}</span>
                </div>
                <div className="text-xs text-muted-foreground">Zamanında</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-2">
                <div className="flex items-center justify-center gap-1 text-amber-600">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-lg font-bold">{deviationCounts.late}</span>
                </div>
                <div className="text-xs text-muted-foreground">Geç</div>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Tolerans içi (±{DEVIATION_TOLERANCE} dk)</span>
              <Badge variant={toleranceRate >= 70 ? 'secondary' : 'destructive'}>
                %{toleranceRate}
              </Badge>
            </div>
            
            {metrics.avg_deviation_minutes !== null && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Ortalama sapma</span>
                <span className="font-medium">{formatDeviation(metrics.avg_deviation_minutes)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Time Comparison */}
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

      {/* Linked Plan-Actual Pairs */}
      {linkedActuals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-primary">
              <Link className="h-4 w-4" />
              Eşleşen Plan-Aktivite ({linkedActuals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {linkedActuals.map(entry => {
              const linkedPlan = planItems.find(p => p.id === entry.linked_plan_item_id);
              if (!linkedPlan) return null;
              
              const deviation = entry.deviation_minutes ?? 0;
              const status = getDeviationStatus(deviation);
              const withinTolerance = isWithinTolerance(deviation);
              
              return (
                <div key={entry.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{entry.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Plan: {format(new Date(linkedPlan.start_at), 'HH:mm')} → Gerçek: {format(new Date(entry.start_at), 'HH:mm')}
                    </div>
                  </div>
                  <Badge 
                    variant={withinTolerance ? 'secondary' : 'destructive'}
                    className={`text-xs ml-2 ${
                      status === 'early' ? 'bg-blue-100 text-blue-700' :
                      status === 'late' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}
                  >
                    {status === 'on-time' ? '✓' : 
                     status === 'early' ? `-${formatDeviation(deviation)}` : 
                     `+${formatDeviation(deviation)}`}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

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

      {/* Estimation Insights */}
      <EstimationInsights />

      {/* Suggestions Section */}
      {(pendingPlans.length > 0 || skippedPlans.length > 0 || planItems.length > 0) && (
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

            {/* Deviation tip */}
            {metrics.avg_deviation_minutes !== null && metrics.avg_deviation_minutes > DEVIATION_TOLERANCE && (
              <div className="bg-amber-50 rounded-lg p-3">
                <h4 className="font-medium mb-1 text-sm">⏰ Zamanlama İpucu</h4>
                <p className="text-xs text-muted-foreground">
                  Ortalama sapmanız {formatDeviation(metrics.avg_deviation_minutes)}. Planlarınızı daha gerçekçi zamanlara taşımayı düşünün.
                </p>
              </div>
            )}

            {/* Time management tip */}
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="font-medium mb-1 text-sm">⏰ Zaman Yönetimi</h4>
              <p className="text-xs text-muted-foreground">
                {metrics.completion_rate !== null && metrics.completion_rate >= 80 
                  ? "Harika bir gün! Bu tempoyu korumaya devam edin."
                  : metrics.completion_rate !== null && metrics.completion_rate >= 50
                    ? "Ortalama bir performans. Önceliklendirmeye daha fazla dikkat edin."
                    : metrics.completion_rate !== null && metrics.completion_rate > 0
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
