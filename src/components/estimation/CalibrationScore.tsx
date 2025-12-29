import { Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEstimationStats } from '@/hooks/useEstimation';

interface Props {
  compact?: boolean;
}

export const CalibrationScore = ({ compact = false }: Props) => {
  const { user } = useAuth();
  const { data: stats, isLoading } = useEstimationStats(user?.id);

  if (isLoading || !stats || stats.length === 0) {
    return null;
  }

  // Ağırlıklı ortalama hesapla
  const totalTasks = stats.reduce((sum, s) => sum + s.total_tasks, 0);
  const weightedScore = stats.reduce((sum, s) => 
    sum + (s.calibration_score || 0) * s.total_tasks, 0
  ) / totalTasks;

  const score = Math.round(weightedScore);
  
  const getColor = () => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getBgColor = () => {
    if (score >= 80) return 'bg-green-500/10';
    if (score >= 60) return 'bg-yellow-500/10';
    return 'bg-red-500/10';
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${getBgColor()}`}>
        <Target className={`h-3.5 w-3.5 ${getColor()}`} />
        <span className={`text-sm font-medium ${getColor()}`}>{score}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border border-border ${getBgColor()}`}>
      <Target className={`h-5 w-5 ${getColor()}`} />
      <div>
        <div className="flex items-baseline gap-1">
          <span className={`text-xl font-bold ${getColor()}`}>{score}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
        <p className="text-xs text-muted-foreground">Tahmin Kalibrasyonu</p>
      </div>
    </div>
  );
};
