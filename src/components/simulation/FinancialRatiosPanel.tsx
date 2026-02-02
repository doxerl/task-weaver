import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { FinancialRatios, SECTOR_BENCHMARKS_DATA } from '@/types/simulation';
import { useTranslation } from 'react-i18next';

interface FinancialRatiosPanelProps {
  ratios: FinancialRatios;
}

export function FinancialRatiosPanel({ ratios }: FinancialRatiosPanelProps) {
  const { t } = useTranslation(['simulation']);
  const benchmarks = SECTOR_BENCHMARKS_DATA['B2B Services'];
  
  const getRatioStatus = (value: number, benchmark: { good: number; average: number; poor: number }, higherIsBetter: boolean = true) => {
    if (higherIsBetter) {
      if (value >= benchmark.good) return { status: 'good', label: t('financialRatios.status.good'), color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      if (value >= benchmark.average) return { status: 'average', label: t('financialRatios.status.average'), color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
      return { status: 'poor', label: t('financialRatios.status.poor'), color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    } else {
      if (value <= benchmark.good) return { status: 'good', label: t('financialRatios.status.good'), color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      if (value <= benchmark.average) return { status: 'average', label: t('financialRatios.status.average'), color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
      return { status: 'poor', label: t('financialRatios.status.poor'), color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    }
  };

  const getProgressValue = (value: number, max: number = 3) => {
    return Math.min((value / max) * 100, 100);
  };

  const ratioGroups = [
    {
      title: t('financialRatios.liquidity'),
      icon: <TrendingUp className="h-4 w-4 text-blue-400" />,
      items: [
        { 
          label: t('financialRatios.currentRatio'), 
          value: ratios.liquidity.currentRatio,
          format: (v: number) => v.toFixed(2),
          benchmark: benchmarks.currentRatio,
          higherIsBetter: true,
          tooltip: t('financialRatios.tooltips.currentRatio')
        },
        { 
          label: t('financialRatios.quickRatio'), 
          value: ratios.liquidity.quickRatio,
          format: (v: number) => v.toFixed(2),
          benchmark: benchmarks.quickRatio,
          higherIsBetter: true,
          tooltip: t('financialRatios.tooltips.quickRatio')
        },
        { 
          label: t('financialRatios.cashRatio'), 
          value: ratios.liquidity.cashRatio,
          format: (v: number) => v.toFixed(2),
          benchmark: { good: 0.5, average: 0.3, poor: 0.1 },
          higherIsBetter: true,
          tooltip: t('financialRatios.tooltips.cashRatio')
        },
      ]
    },
    {
      title: t('financialRatios.leverage'),
      icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
      items: [
        { 
          label: t('financialRatios.debtToEquity'), 
          value: ratios.leverage.debtToEquity,
          format: (v: number) => v.toFixed(2),
          benchmark: benchmarks.debtToEquity,
          higherIsBetter: false,
          tooltip: t('financialRatios.tooltips.debtToEquity')
        },
        { 
          label: t('financialRatios.debtToAssets'), 
          value: ratios.leverage.debtToAssets,
          format: (v: number) => `%${(v * 100).toFixed(0)}`,
          benchmark: { good: 0.3, average: 0.5, poor: 0.7 },
          higherIsBetter: false,
          tooltip: t('financialRatios.tooltips.debtToAssets')
        },
        { 
          label: t('financialRatios.receivablesRatio'), 
          value: ratios.leverage.receivablesRatio,
          format: (v: number) => `%${(v * 100).toFixed(0)}`,
          benchmark: { good: 0.15, average: 0.25, poor: 0.35 },
          higherIsBetter: false,
          tooltip: t('financialRatios.tooltips.receivablesRatio')
        },
      ]
    },
    {
      title: t('financialRatios.profitability'),
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
      items: [
        { 
          label: t('financialRatios.roa'), 
          value: ratios.profitability.returnOnAssets,
          format: (v: number) => `%${v.toFixed(1)}`,
          benchmark: { good: 15, average: 10, poor: 5 },
          higherIsBetter: true,
          tooltip: t('financialRatios.tooltips.roa')
        },
        { 
          label: t('financialRatios.roe'), 
          value: ratios.profitability.returnOnEquity,
          format: (v: number) => `%${v.toFixed(1)}`,
          benchmark: benchmarks.returnOnEquity,
          higherIsBetter: true,
          tooltip: t('financialRatios.tooltips.roe')
        },
        { 
          label: t('financialRatios.netMargin'), 
          value: ratios.profitability.netMargin,
          format: (v: number) => `%${v.toFixed(1)}`,
          benchmark: benchmarks.netMargin,
          higherIsBetter: true,
          tooltip: t('financialRatios.tooltips.netMargin')
        },
      ]
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {t('financialRatios.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ratioGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              {group.icon}
              {group.title}
            </div>
            <div className="grid gap-2">
              {group.items.map((item, iIdx) => {
                const status = getRatioStatus(item.value, item.benchmark, item.higherIsBetter);
                return (
                  <div key={iIdx} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground" title={item.tooltip}>
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {item.format(item.value)}
                      </span>
                      <Badge variant="outline" className={`text-xs ${status.color}`}>
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {t('financialRatios.benchmarkNote')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
