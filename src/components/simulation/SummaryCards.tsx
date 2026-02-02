import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { SimulationSummary } from '@/types/simulation';
import { cn } from '@/lib/utils';
import { formatCompactUSD, formatCompactTRY } from '@/lib/formatters';

interface SummaryCardsProps {
  summary: SimulationSummary;
  exchangeRate: number;
  baseYear?: number;
  targetYear?: number;
}

function GrowthIndicator({ value }: { value: number }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  
  return (
    <span className={cn(
      "inline-flex items-center text-sm font-medium",
      isPositive ? "text-green-600" : "text-red-600"
    )}>
      <Icon className="h-4 w-4" />
      {isPositive ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

export function SummaryCards({ summary, exchangeRate, baseYear, targetYear }: SummaryCardsProps) {
  const { t } = useTranslation(['simulation', 'common']);
  
  // Baz yıl = hedef yılın bir öncesi (targetYear - 1)
  const displayTargetYear = targetYear || baseYear || new Date().getFullYear();
  const displayBaseYear = displayTargetYear - 1;
  
  const cards = [
    {
      title: t('summary.baseYear', { year: displayBaseYear }),
      subtitle: t('summary.actualData'),
      items: [
        { label: t('common:revenue'), value: formatCompactUSD(summary.base.totalRevenue) },
        { label: t('common:expense'), value: formatCompactUSD(summary.base.totalExpense) },
        { label: t('common:netProfit'), value: formatCompactUSD(summary.base.netProfit), highlight: true },
      ],
      footer: `${t('summary.profitMargin')}: %${summary.base.profitMargin.toFixed(1)}`,
      variant: 'muted' as const,
    },
    {
      title: t('summary.projection', { year: displayTargetYear }),
      subtitle: t('summary.targetYear'),
      items: [
        { 
          label: t('common:revenue'), 
          value: formatCompactUSD(summary.projected.totalRevenue),
          growth: summary.growth.revenueGrowth,
        },
        { 
          label: t('common:expense'), 
          value: formatCompactUSD(summary.projected.totalExpense),
          growth: summary.growth.expenseGrowth,
        },
        { 
          label: t('common:netProfit'), 
          value: formatCompactUSD(summary.projected.netProfit), 
          highlight: true,
          growth: summary.growth.profitGrowth,
        },
      ],
      footer: `${t('summary.profitMargin')}: %${summary.projected.profitMargin.toFixed(1)}`,
      variant: 'primary' as const,
    },
    {
      title: t('capital.title'),
      subtitle: t('capital.investmentNeed'),
      items: [
        { label: t('capital.investments'), value: formatCompactUSD(summary.capitalNeeds.totalInvestment) },
        { label: t('capital.projectedProfit'), value: formatCompactUSD(summary.capitalNeeds.projectedProfit) },
        { 
          label: t('capital.netNeed'), 
          value: formatCompactUSD(summary.capitalNeeds.netCapitalNeed), 
          highlight: summary.capitalNeeds.netCapitalNeed > 0,
          isNegative: summary.capitalNeeds.netCapitalNeed > 0,
        },
      ],
      footer: `${t('capital.tryEquivalent')}: ${formatCompactTRY(summary.capitalNeeds.netCapitalNeed * exchangeRate)}`,
      variant: summary.capitalNeeds.netCapitalNeed > 0 ? 'warning' as const : 'success' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <Card 
          key={card.title} 
          className={cn(
            "relative overflow-hidden",
            card.variant === 'primary' && "border-primary/50 bg-primary/5",
            card.variant === 'warning' && "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20",
            card.variant === 'success' && "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
          )}
        >
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.subtitle}</p>
              </div>
              {card.variant === 'primary' && <TrendingUp className="h-5 w-5 text-primary" />}
              {card.variant === 'warning' && <DollarSign className="h-5 w-5 text-yellow-600" />}
              {card.variant === 'success' && <TrendingUp className="h-5 w-5 text-green-600" />}
            </div>
            
            <div className="space-y-2">
              {card.items.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium",
                      item.highlight && !item.isNegative && "text-green-600 font-semibold",
                      item.isNegative && "text-red-600 font-semibold",
                    )}>
                      {item.value}
                    </span>
                    {item.growth !== undefined && <GrowthIndicator value={item.growth} />}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm text-muted-foreground">{card.footer}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
