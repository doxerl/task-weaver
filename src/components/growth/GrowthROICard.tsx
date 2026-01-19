import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SimulationScenario } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';
import { 
  DollarSign, 
  TrendingUp, 
  Target, 
  ArrowRight, 
  Percent,
  Calculator,
  PiggyBank,
} from 'lucide-react';

interface GrowthROICardProps {
  baseScenario: SimulationScenario;
  growthScenario: SimulationScenario;
  aiAnalysis?: any;
}

interface ROIMetric {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color: 'emerald' | 'blue' | 'amber' | 'purple';
}

export function GrowthROICard({
  baseScenario,
  growthScenario,
  aiAnalysis,
}: GrowthROICardProps) {
  // ROI Metrikleri Hesapla
  const roiMetrics = useMemo(() => {
    // Gelir ve gider toplamları
    const baseRevenue = baseScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    const growthRevenue = growthScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    
    const baseExpense = baseScenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
    const growthExpense = growthScenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
    
    const baseProfit = baseRevenue - baseExpense;
    const growthProfit = growthRevenue - growthExpense;
    
    // Yatırım toplamları (varsa)
    const baseInvestment = baseScenario.investments.reduce((sum, i) => sum + i.amount, 0);
    const growthInvestment = growthScenario.investments.reduce((sum, i) => sum + i.amount, 0);
    const totalInvestment = baseInvestment + growthInvestment;
    
    // Büyüme oranları
    const revenueGrowthRate = baseRevenue > 0 ? ((growthRevenue - baseRevenue) / baseRevenue) * 100 : 0;
    const profitGrowthRate = baseProfit !== 0 ? ((growthProfit - baseProfit) / Math.abs(baseProfit)) * 100 : 0;
    
    // ROI hesabı
    const profitIncrease = growthProfit - baseProfit;
    const roi = totalInvestment > 0 ? (profitIncrease / totalInvestment) * 100 : profitGrowthRate;
    
    // Basit değerleme (3x gelir çarpanı)
    const multiple = 3;
    const baseValuation = baseRevenue * multiple;
    const growthValuation = growthRevenue * multiple;
    const valuationIncrease = growthValuation - baseValuation;
    
    // MOIC (yatırım varsa)
    const moic = totalInvestment > 0 ? (growthValuation / totalInvestment) : 0;
    
    return {
      revenue: { base: baseRevenue, growth: growthRevenue, rate: revenueGrowthRate },
      profit: { base: baseProfit, growth: growthProfit, rate: profitGrowthRate },
      investment: { total: totalInvestment, base: baseInvestment, growth: growthInvestment },
      valuation: { base: baseValuation, growth: growthValuation, increase: valuationIncrease },
      roi,
      moic,
    };
  }, [baseScenario, growthScenario]);
  
  // Metrik kartları
  const metrics: ROIMetric[] = [
    {
      label: 'Gelir Büyümesi',
      value: `+${roiMetrics.revenue.rate.toFixed(1)}%`,
      subValue: `${formatCompactUSD(roiMetrics.revenue.base)} → ${formatCompactUSD(roiMetrics.revenue.growth)}`,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'emerald',
    },
    {
      label: 'Kâr Büyümesi',
      value: `+${roiMetrics.profit.rate.toFixed(1)}%`,
      subValue: `${formatCompactUSD(roiMetrics.profit.base)} → ${formatCompactUSD(roiMetrics.profit.growth)}`,
      icon: <DollarSign className="h-5 w-5" />,
      color: roiMetrics.profit.growth > 0 ? 'emerald' : 'amber',
    },
    {
      label: 'Değerleme Artışı',
      value: formatCompactUSD(roiMetrics.valuation.increase),
      subValue: `${formatCompactUSD(roiMetrics.valuation.base)} → ${formatCompactUSD(roiMetrics.valuation.growth)}`,
      icon: <Target className="h-5 w-5" />,
      color: 'blue',
    },
    {
      label: roiMetrics.investment.total > 0 ? 'MOIC' : 'Kâr Marjı',
      value: roiMetrics.investment.total > 0 
        ? `${roiMetrics.moic.toFixed(1)}x`
        : `${((roiMetrics.profit.growth / roiMetrics.revenue.growth) * 100).toFixed(1)}%`,
      subValue: roiMetrics.investment.total > 0 
        ? `${formatCompactUSD(roiMetrics.investment.total)} yatırım`
        : 'Net kâr / Gelir',
      icon: roiMetrics.investment.total > 0 ? <Calculator className="h-5 w-5" /> : <Percent className="h-5 w-5" />,
      color: 'purple',
    },
  ];
  
  const colorClasses = {
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500',
    blue: 'border-blue-500/30 bg-blue-500/5 text-blue-500',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-500',
    purple: 'border-purple-500/30 bg-purple-500/5 text-purple-500',
  };
  
  return (
    <div className="space-y-6">
      {/* ROI Özeti */}
      <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <PiggyBank className="h-4 w-4" />
            Yatırım Getirisi (ROI) Özeti
          </CardTitle>
          <CardDescription>
            {baseScenario.targetYear} → {growthScenario.targetYear} dönemi için hesaplanan getiri
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-4xl font-bold text-emerald-500">
                +{roiMetrics.roi.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Toplam ROI
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="gap-1">
                <ArrowRight className="h-3 w-3" />
                {formatCompactUSD(roiMetrics.profit.growth - roiMetrics.profit.base)} kâr artışı
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Metrik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className={colorClasses[metric.color]}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-2">
                <span className={`${colorClasses[metric.color].split(' ')[2]}`}>
                  {metric.icon}
                </span>
              </div>
              <p className="text-2xl font-bold">{metric.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{metric.label}</p>
              {metric.subValue && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">{metric.subValue}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Yatırım Akışı (varsa) */}
      {roiMetrics.investment.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Yatırım → Büyüme → Değerleme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div className="text-center flex-1">
                <p className="text-lg font-bold">{formatCompactUSD(roiMetrics.investment.total)}</p>
                <p className="text-xs text-muted-foreground">Toplam Yatırım</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-center flex-1">
                <p className="text-lg font-bold text-emerald-500">+{roiMetrics.revenue.rate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Büyüme</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-center flex-1">
                <p className="text-lg font-bold">{formatCompactUSD(roiMetrics.valuation.growth)}</p>
                <p className="text-xs text-muted-foreground">Değerleme</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-center flex-1">
                <p className="text-lg font-bold text-purple-500">{roiMetrics.moic.toFixed(1)}x</p>
                <p className="text-xs text-muted-foreground">MOIC</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* AI ROI Analizi */}
      {aiAnalysis?.roiInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI ROI Analizi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiAnalysis.roiInsights.map((insight: any, index: number) => (
                <div key={index} className="p-3 rounded-lg bg-accent/50">
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
