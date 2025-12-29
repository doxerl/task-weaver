import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  biasPercent: number | null;
  calibrationScore: number | null;
  compact?: boolean;
}

export const BiasIndicator = ({ biasPercent, calibrationScore, compact = false }: Props) => {
  if (biasPercent === null && calibrationScore === null) {
    return null;
  }

  const getBiasStatus = () => {
    if (biasPercent === null) return { icon: Minus, color: 'text-muted-foreground', label: 'Veri yok' };
    if (biasPercent > 20) return { icon: TrendingUp, color: 'text-red-500', label: 'Eksik tahmin' };
    if (biasPercent < -20) return { icon: TrendingDown, color: 'text-blue-500', label: 'Fazla tahmin' };
    return { icon: Target, color: 'text-green-500', label: 'İyi kalibrasyon' };
  };

  const getCalibrationColor = () => {
    if (calibrationScore === null) return 'text-muted-foreground';
    if (calibrationScore >= 80) return 'text-green-500';
    if (calibrationScore >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const status = getBiasStatus();
  const Icon = status.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 ${status.color}`}>
              <Icon className="h-4 w-4" />
              {biasPercent !== null && (
                <span className="text-xs font-medium">
                  {biasPercent > 0 ? '+' : ''}{Math.round(biasPercent)}%
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{status.label}</p>
            {calibrationScore !== null && (
              <p className="text-xs text-muted-foreground">
                Kalibrasyon: {calibrationScore}/100
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
      <div className={`p-2 rounded-full bg-muted ${status.color}`}>
        <Icon className="h-5 w-5" />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{status.label}</span>
          {biasPercent !== null && (
            <span className={`text-lg font-bold ${status.color}`}>
              {biasPercent > 0 ? '+' : ''}{Math.round(biasPercent)}%
            </span>
          )}
        </div>
        
        {calibrationScore !== null && (
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${getCalibrationColor().replace('text-', 'bg-')}`}
                style={{ width: `${calibrationScore}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${getCalibrationColor()}`}>
              {calibrationScore}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
