import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  ArrowRight,
  Rocket,
} from 'lucide-react';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { InvestmentScenarioComparison } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';

interface FutureImpactChartProps {
  comparison: InvestmentScenarioComparison;
  scenarioYear?: number;
}

export const FutureImpactChart: React.FC<FutureImpactChartProps> = ({ comparison, scenarioYear }) => {
  const { t } = useTranslation(['simulation']);
  const { futureImpact } = comparison;

  // Dynamic year calculation
  const year1Label = scenarioYear ? `${scenarioYear + 1}` : t('futureImpact.yearDiff', { year: 1 });
  const year3Label = scenarioYear ? `${scenarioYear + 3}` : t('futureImpact.yearDiff', { year: 3 });
  const year5Label = scenarioYear ? `${scenarioYear + 5}` : t('futureImpact.yearDiff', { year: 5 });
  const projectionTitle = scenarioYear
    ? t('futureImpact.projectionTitle', { startYear: scenarioYear, endYear: scenarioYear + 5 })
    : t('futureImpact.projectionTitleDefault');

  const chartConfig: ChartConfig = {
    withInvestment: {
      label: t('futureImpact.withInvestment'),
      color: 'hsl(var(--chart-1))'
    },
    withoutInvestment: {
      label: t('futureImpact.withoutInvestment'),
      color: 'hsl(var(--destructive))'
    },
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" />
          {projectionTitle}
        </CardTitle>
        <CardDescription className="text-xs">
          {t('futureImpact.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chart */}
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <AreaChart data={futureImpact.yearlyProjections}>
            <defs>
              <linearGradient id="gradientWith" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gradientWithout" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="yearLabel"
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tickFormatter={(v) => formatCompactUSD(v)}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              formatter={(value: number) => formatCompactUSD(value)}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="withInvestment"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill="url(#gradientWith)"
              name={t('futureImpact.withInvestment')}
            />
            <Area
              type="monotone"
              dataKey="withoutInvestment"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              fill="url(#gradientWithout)"
              name={t('futureImpact.withoutInvestment')}
            />
          </AreaChart>
        </ChartContainer>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 border text-center">
            <p className="text-xs text-muted-foreground mb-1">{year1Label}</p>
            <p className="font-mono font-bold text-primary">
              +{formatCompactUSD(futureImpact.year1WithInvestment - futureImpact.year1WithoutInvestment)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
            <p className="text-xs text-muted-foreground mb-1">{year3Label}</p>
            <p className="font-mono font-bold text-blue-600 dark:text-blue-400">
              +{formatCompactUSD(futureImpact.year3WithInvestment - futureImpact.year3WithoutInvestment)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
            <p className="text-xs text-muted-foreground mb-1">{year5Label}</p>
            <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              +{formatCompactUSD(futureImpact.year5WithInvestment - futureImpact.year5WithoutInvestment)}
            </p>
          </div>
        </div>

        {/* Bottom Summary */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{t('futureImpact.totalValuationDiff', { year: year5Label })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary border-primary/30 font-mono text-base px-3">
                +{formatCompactUSD(futureImpact.cumulativeDifference)}
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {t('futureImpact.investmentBenefit')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
