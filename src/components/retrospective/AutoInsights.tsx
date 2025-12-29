import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Target, Clock, Calendar, BarChart3 } from 'lucide-react';

interface DayPerformance {
  planned: number;
  completed: number;
}

interface AutoInsightsProps {
  completionRate: number;
  estimationAccuracy: number;
  categoryDistribution: Record<string, number>;
  dayPerformance: Record<string, DayPerformance>;
  deepWorkRatio: number;
  autoSuggestions: string[];
  previousWeekRate?: number;
}

export function AutoInsights({
  completionRate,
  estimationAccuracy,
  categoryDistribution,
  dayPerformance,
  deepWorkRatio,
  autoSuggestions,
  previousWeekRate,
}: AutoInsightsProps) {
  // Find best day
  let bestDay = '';
  let bestRate = 0;
  Object.entries(dayPerformance).forEach(([day, perf]) => {
    if (perf.planned > 0) {
      const rate = (perf.completed / perf.planned) * 100;
      if (rate > bestRate) {
        bestRate = rate;
        bestDay = day;
      }
    }
  });

  // Find top category
  const topCategory = Object.entries(categoryDistribution).sort((a, b) => b[1] - a[1])[0];
  const totalMinutes = Object.values(categoryDistribution).reduce((sum, v) => sum + v, 0);

  // Trend indicator
  const getTrendIcon = () => {
    if (previousWeekRate === undefined) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (completionRate > previousWeekRate) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (completionRate < previousWeekRate) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Otomatik İçgörüler
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Completion Rate */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />
                Tamamlama
              </span>
              {getTrendIcon()}
            </div>
            <div className="text-2xl font-bold">%{completionRate}</div>
            <Progress value={completionRate} className="h-1.5" />
          </div>

          {/* Estimation Accuracy */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Tahmin Doğruluğu
            </span>
            <div className="text-2xl font-bold">%{estimationAccuracy}</div>
            <Progress value={estimationAccuracy} className="h-1.5" />
          </div>
        </div>

        {/* Best Day & Top Category */}
        <div className="grid grid-cols-2 gap-3">
          {bestDay && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Calendar className="h-3 w-3" />
                En Verimli Gün
              </div>
              <div className="font-semibold">{bestDay}</div>
              <div className="text-xs text-muted-foreground">%{Math.round(bestRate)} tamamlama</div>
            </div>
          )}
          
          {topCategory && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">En Çok Zaman</div>
              <div className="font-semibold truncate">{topCategory[0]}</div>
              <div className="text-xs text-muted-foreground">
                {Math.round(topCategory[1])} dk ({Math.round((topCategory[1] / totalMinutes) * 100)}%)
              </div>
            </div>
          )}
        </div>

        {/* Deep Work Ratio */}
        <div className="p-3 bg-primary/5 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Derin Çalışma Oranı</span>
            <Badge variant="outline" className="text-xs">%{deepWorkRatio}</Badge>
          </div>
          <Progress value={deepWorkRatio} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-1">
            60+ dakikalık kesintisiz çalışma blokları
          </p>
        </div>

        {/* Auto Suggestions */}
        {autoSuggestions.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground font-medium">Öneriler</span>
            <div className="space-y-1.5">
              {autoSuggestions.map((suggestion, index) => (
                <div 
                  key={index}
                  className="text-xs p-2 bg-muted/50 rounded border-l-2 border-primary"
                >
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
