import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Activity } from 'lucide-react';
import { TrendAnalysisResult } from '@/types/simulation';
import { useTranslation } from 'react-i18next';

interface ItemTrendCardsProps {
  analysis: TrendAnalysisResult;
  type: 'revenues' | 'expenses';
}

export function ItemTrendCards({ analysis, type }: ItemTrendCardsProps) {
  const { t } = useTranslation(['simulation']);
  const items = type === 'revenues' ? analysis.revenues : analysis.expenses;
  const title = type === 'revenues' ? t('itemTrend.revenueItems') : t('itemTrend.expenseItems');
  const typeLabel = type === 'revenues' ? t('summary.metrics.revenue').toLowerCase() : t('summary.metrics.expense').toLowerCase();

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-emerald-400" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return t('itemTrend.trend.increasing');
      case 'decreasing':
        return t('itemTrend.trend.decreasing');
      default:
        return t('itemTrend.trend.stable');
    }
  };

  const getVolatilityColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  const getVolatilityLabel = (level: string) => {
    switch (level) {
      case 'high':
        return t('itemTrend.volatility.high');
      case 'medium':
        return t('itemTrend.volatility.medium');
      default:
        return t('itemTrend.volatility.low');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {[...items].sort((a, b) => b.overallGrowth - a.overallGrowth).slice(0, 5).map((item, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {getTrendIcon(item.trend)}
                  <span className="text-sm font-medium truncate">{item.category}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {t('itemTrend.share')}: %{item.shareOfTotal.toFixed(1)}
                  </span>
                  {item.shareOfTotal > 50 && (
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {t('itemTrend.concentrated')}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${getVolatilityColor(item.volatilityLevel)}`}>
                    {getVolatilityLabel(item.volatilityLevel)}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  Q1→Q4: {item.overallGrowth >= 0 ? '+' : ''}{item.overallGrowth.toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {items.some(i => i.shareOfTotal > 50) && (
          <div className="mt-3 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <p className="text-xs text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              <span className="font-medium">{t('itemTrend.concentrationRisk')}:</span>
              {t('itemTrend.concentrationWarning', { type: typeLabel })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
