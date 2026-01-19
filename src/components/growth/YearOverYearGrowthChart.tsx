import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SimulationScenario } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';
import { TrendingUp, TrendingDown, ArrowRight, Calendar } from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface YearOverYearGrowthChartProps {
  baseScenario: SimulationScenario;
  growthScenario: SimulationScenario;
  aiAnalysis?: any;
}

interface GrowthMetric {
  label: string;
  baseValue: number;
  growthValue: number;
  growthRate: number;
  isPositive: boolean;
}

export function YearOverYearGrowthChart({
  baseScenario,
  growthScenario,
  aiAnalysis,
}: YearOverYearGrowthChartProps) {
  // Yıllık metrikleri hesapla
  const metrics = useMemo((): GrowthMetric[] => {
    const baseRevenue = baseScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    const growthRevenue = growthScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    
    const baseExpense = baseScenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
    const growthExpense = growthScenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
    
    const baseProfit = baseRevenue - baseExpense;
    const growthProfit = growthRevenue - growthExpense;
    
    const calcGrowth = (base: number, growth: number) => 
      base > 0 ? ((growth - base) / base) * 100 : growth > 0 ? 100 : 0;
    
    return [
      {
        label: 'Gelir',
        baseValue: baseRevenue,
        growthValue: growthRevenue,
        growthRate: calcGrowth(baseRevenue, growthRevenue),
        isPositive: growthRevenue > baseRevenue,
      },
      {
        label: 'Gider',
        baseValue: baseExpense,
        growthValue: growthExpense,
        growthRate: calcGrowth(baseExpense, growthExpense),
        isPositive: growthExpense <= baseExpense, // Gider artmazsa pozitif
      },
      {
        label: 'Net Kâr',
        baseValue: baseProfit,
        growthValue: growthProfit,
        growthRate: calcGrowth(Math.abs(baseProfit), Math.abs(growthProfit)) * (baseProfit < 0 && growthProfit > 0 ? 1 : 1),
        isPositive: growthProfit > baseProfit,
      },
    ];
  }, [baseScenario, growthScenario]);
  
  // Çeyreklik karşılaştırma verisi
  const chartData = useMemo(() => {
    const quarters: ('q1' | 'q2' | 'q3' | 'q4')[] = ['q1', 'q2', 'q3', 'q4'];
    
    return quarters.map(q => {
      const baseRev = baseScenario.revenues.reduce(
        (sum, r) => sum + (r.projectedQuarterly?.[q] || r.projectedAmount / 4), 0
      );
      const growthRev = growthScenario.revenues.reduce(
        (sum, r) => sum + (r.projectedQuarterly?.[q] || r.projectedAmount / 4), 0
      );
      
      const baseExp = baseScenario.expenses.reduce(
        (sum, e) => sum + (e.projectedQuarterly?.[q] || e.projectedAmount / 4), 0
      );
      const growthExp = growthScenario.expenses.reduce(
        (sum, e) => sum + (e.projectedQuarterly?.[q] || e.projectedAmount / 4), 0
      );
      
      return {
        quarter: q.toUpperCase(),
        [`${baseScenario.targetYear} Gelir`]: baseRev,
        [`${growthScenario.targetYear} Gelir`]: growthRev,
        [`${baseScenario.targetYear} Kâr`]: baseRev - baseExp,
        [`${growthScenario.targetYear} Kâr`]: growthRev - growthExp,
      };
    });
  }, [baseScenario, growthScenario]);
  
  const formatTooltip = (value: number) => formatCompactUSD(value);
  
  return (
    <div className="space-y-6">
      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className={
            metric.isPositive 
              ? 'border-emerald-500/30 bg-emerald-500/5' 
              : 'border-amber-500/30 bg-amber-500/5'
          }>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                {metric.label}
                {metric.isPositive ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-amber-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg text-muted-foreground">
                  {formatCompactUSD(metric.baseValue)}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {formatCompactUSD(metric.growthValue)}
                </span>
              </div>
              <Badge 
                variant="outline" 
                className={
                  metric.isPositive
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }
              >
                {metric.growthRate > 0 ? '+' : ''}{metric.growthRate.toFixed(1)}%
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Yıllar Arası Karşılaştırma Grafiği */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Çeyreklik Karşılaştırma
          </CardTitle>
          <CardDescription>
            {baseScenario.targetYear} → {growthScenario.targetYear} yıllar arası gelir ve kâr karşılaştırması
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="quarter" className="text-xs" />
                <YAxis 
                  tickFormatter={(value) => formatCompactUSD(value)} 
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value: number) => formatTooltip(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                
                {/* Baz Yıl Gelir */}
                <Bar 
                  dataKey={`${baseScenario.targetYear} Gelir`} 
                  fill="hsl(var(--muted-foreground))" 
                  opacity={0.5}
                  radius={[4, 4, 0, 0]}
                />
                
                {/* Büyüme Yılı Gelir */}
                <Bar 
                  dataKey={`${growthScenario.targetYear} Gelir`} 
                  fill="hsl(142.1 76.2% 36.3%)" 
                  radius={[4, 4, 0, 0]}
                />
                
                {/* Baz Yıl Kâr Line */}
                <Line 
                  type="monotone" 
                  dataKey={`${baseScenario.targetYear} Kâr`} 
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                
                {/* Büyüme Yılı Kâr Line */}
                <Line 
                  type="monotone" 
                  dataKey={`${growthScenario.targetYear} Kâr`} 
                  stroke="hsl(142.1 76.2% 36.3%)"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(142.1 76.2% 36.3%)', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* AI İçgörüleri */}
      {aiAnalysis?.growthInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI Büyüme Analizi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiAnalysis.growthInsights.map((insight: any, index: number) => (
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
