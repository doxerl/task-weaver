import { useEffect, useState } from 'react';
import { Clock, TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useDurationSuggestion } from '@/hooks/useEstimation';
import type { DurationSuggestion as DurationSuggestionType } from '@/types/estimation';

interface Props {
  category: string;
  userEstimate: number | null;
  onSuggestionLoaded?: (suggestion: DurationSuggestionType) => void;
}

export const DurationSuggestion = ({ category, userEstimate, onSuggestionLoaded }: Props) => {
  const [suggestion, setSuggestion] = useState<DurationSuggestionType | null>(null);
  const { mutate: fetchSuggestion, isPending } = useDurationSuggestion();

  useEffect(() => {
    if (category) {
      fetchSuggestion(category, {
        onSuccess: (data) => {
          setSuggestion(data);
          onSuggestionLoaded?.(data);
        },
      });
    }
  }, [category, fetchSuggestion, onSuggestionLoaded]);

  if (isPending) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
        <Clock className="h-3 w-3" />
        <span>Öneri yükleniyor...</span>
      </div>
    );
  }

  if (!suggestion || suggestion.sample_size < 3) {
    return null;
  }

  const showWarning = userEstimate && suggestion.suggested_minutes && 
    Math.abs(userEstimate - suggestion.suggested_minutes) > suggestion.suggested_minutes * 0.3;

  const BiasIcon = suggestion.personal_bias_percent !== null && suggestion.personal_bias_percent > 10 
    ? TrendingUp 
    : suggestion.personal_bias_percent !== null && suggestion.personal_bias_percent < -10 
    ? TrendingDown 
    : Minus;

  const confidenceColors = {
    high: 'bg-green-500/10 text-green-600 border-green-200',
    medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
    low: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 p-2 rounded-lg border ${showWarning ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20' : 'border-border bg-muted/30'}`}>
            <Lightbulb className={`h-4 w-4 ${showWarning ? 'text-yellow-600' : 'text-muted-foreground'}`} />
            
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">
                {suggestion.suggested_minutes} dk
              </span>
              
              <Badge variant="outline" className={`text-xs ${confidenceColors[suggestion.confidence]}`}>
                {suggestion.confidence === 'high' ? 'Güvenilir' : 
                 suggestion.confidence === 'medium' ? 'Orta' : 'Düşük'}
              </Badge>
              
              {suggestion.personal_bias_percent !== null && Math.abs(suggestion.personal_bias_percent) > 10 && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <BiasIcon className="h-3 w-3" />
                  %{Math.abs(Math.round(suggestion.personal_bias_percent))}
                </span>
              )}
            </div>
          </div>
        </TooltipTrigger>
        
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 text-sm">
            <p className="font-medium">
              Bu kategorideki {suggestion.sample_size} görev bazlı öneri
            </p>
            
            {suggestion.category_stats && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Ortalama tahmin: {suggestion.category_stats.avg_estimated} dk</p>
                <p>Ortalama gerçek: {suggestion.category_stats.avg_actual} dk</p>
              </div>
            )}
            
            {suggestion.message && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                💡 {suggestion.message}
              </p>
            )}
            
            {showWarning && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                ⚠️ Tahminin öneriden oldukça farklı
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
