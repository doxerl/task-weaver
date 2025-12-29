import { useAuth } from '@/hooks/useAuth';
import { useEstimationStats } from '@/hooks/useEstimation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { BiasIndicator } from './BiasIndicator';
import { Skeleton } from '@/components/ui/skeleton';

export const EstimationInsights = () => {
  const { user } = useAuth();
  const { data: stats, isLoading } = useEstimationStats(user?.id);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5" />
            Tahmin Kalibrasyonu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5" />
            Tahmin Kalibrasyonu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Henüz yeterli veri yok</p>
            <p className="text-xs mt-1">Görevleri tamamladıkça kalibrasyon verileri oluşacak</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Genel kalibrasyon skoru (ağırlıklı ortalama)
  const totalTasks = stats.reduce((sum, s) => sum + s.total_tasks, 0);
  const weightedScore = stats.reduce((sum, s) => 
    sum + (s.calibration_score || 0) * s.total_tasks, 0
  ) / totalTasks;

  // En iyi ve en kötü kategoriler
  const sortedByScore = [...stats].sort((a, b) => 
    (b.calibration_score || 0) - (a.calibration_score || 0)
  );
  const bestCategory = sortedByScore[0];
  const worstCategory = sortedByScore[sortedByScore.length - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5" />
          Tahmin Kalibrasyonu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Genel Skor */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Genel Kalibrasyon</span>
            <span className={`text-2xl font-bold ${
              weightedScore >= 80 ? 'text-green-500' :
              weightedScore >= 60 ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {Math.round(weightedScore)}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                weightedScore >= 80 ? 'bg-green-500' :
                weightedScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${weightedScore}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {totalTasks} görev bazlı
          </p>
        </div>

        {/* Kategori Detayları */}
        <div className="space-y-2">
          {stats.slice(0, 5).map((stat) => (
            <div 
              key={stat.id} 
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {stat.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {stat.total_tasks} görev
                </span>
              </div>
              <BiasIndicator 
                biasPercent={stat.avg_deviation_percent} 
                calibrationScore={stat.calibration_score}
                compact
              />
            </div>
          ))}
        </div>

        {/* En İyi / En Kötü */}
        {stats.length >= 2 && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
            <div className="text-center p-2">
              <TrendingUp className="h-4 w-4 mx-auto text-green-500 mb-1" />
              <p className="text-xs font-medium">{bestCategory.category}</p>
              <p className="text-xs text-muted-foreground">En iyi</p>
            </div>
            <div className="text-center p-2">
              <TrendingDown className="h-4 w-4 mx-auto text-red-500 mb-1" />
              <p className="text-xs font-medium">{worstCategory.category}</p>
              <p className="text-xs text-muted-foreground">Geliştirilmeli</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
