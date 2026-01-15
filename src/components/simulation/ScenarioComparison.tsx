import React, { useState, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ArrowLeftRight, 
  Trophy, 
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Target,
  Shield,
  Zap,
  DollarSign,
  PiggyBank,
  TrendingUpDown,
  Download,
  Loader2,
  LineChart as LineChartIcon
} from 'lucide-react';
import { SimulationScenario } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';
import { toast } from 'sonner';
import { usePdfEngine } from '@/hooks/finance/usePdfEngine';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

interface ScenarioComparisonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarios: SimulationScenario[];
  currentScenarioId: string | null;
}

interface ComparisonMetric {
  label: string;
  scenarioA: number;
  scenarioB: number;
  format: 'currency' | 'percent' | 'number';
  higherIsBetter: boolean;
}

interface ScenarioInsight {
  type: 'positive' | 'negative' | 'neutral' | 'warning';
  category: 'revenue' | 'expense' | 'profit' | 'margin' | 'capital' | 'general';
  icon: React.ReactNode;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendation?: string;
}

interface DecisionRecommendation {
  id?: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  suitableFor: string;
  keyActions?: string[];
  expectedOutcome?: string;
}

interface QuarterlyComparison {
  quarter: string;
  scenarioARevenue: number;
  scenarioAExpense: number;
  scenarioANet: number;
  scenarioBRevenue: number;
  scenarioBExpense: number;
  scenarioBNet: number;
}

interface ScenarioSummary {
  totalRevenue: number;
  totalExpense: number;
  totalInvestment: number;
  netProfit: number;
  profitMargin: number;
  capitalNeed: number;
}

interface WinnerResult {
  winner: 'A' | 'B' | 'TIE';
  winnerName: string;
  scoreA: number;
  scoreB: number;
  totalMetrics: number;
  advantages: string[];
  disadvantages: string[];
}

const formatValue = (value: number, format: 'currency' | 'percent' | 'number'): string => {
  switch (format) {
    case 'currency':
      return formatCompactUSD(value);
    case 'percent':
      return `%${value.toFixed(1)}`;
    case 'number':
      return value.toLocaleString('tr-TR');
    default:
      return String(value);
  }
};

const calculateDiff = (a: number, b: number): { value: number; percent: number } => {
  const diff = b - a;
  const percent = a !== 0 ? ((b - a) / Math.abs(a)) * 100 : b !== 0 ? 100 : 0;
  return { value: diff, percent };
};

const DiffBadge: React.FC<{ diff: { value: number; percent: number }; format: 'currency' | 'percent' | 'number'; higherIsBetter: boolean }> = ({
  diff,
  format,
  higherIsBetter,
}) => {
  const isPositive = diff.value > 0;
  const isNeutral = diff.value === 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;

  if (isNeutral) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Minus className="h-3 w-3" />
        -
      </Badge>
    );
  }

  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isGood ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30';

  return (
    <Badge variant="outline" className={`gap-1 ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {isPositive ? '+' : ''}{format === 'percent' ? `${diff.value.toFixed(1)}pp` : `${diff.percent.toFixed(1)}%`}
    </Badge>
  );
};

const calculateScenarioSummary = (scenario: SimulationScenario): ScenarioSummary => {
  const totalRevenue = scenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
  const totalExpense = scenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
  const totalInvestment = scenario.investments.reduce((sum, i) => sum + i.amount, 0);
  const netProfit = totalRevenue - totalExpense;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const capitalNeed = Math.max(0, totalInvestment - netProfit);

  return {
    totalRevenue,
    totalExpense,
    totalInvestment,
    netProfit,
    profitMargin,
    capitalNeed,
  };
};

const determineWinner = (
  summaryA: ScenarioSummary, 
  summaryB: ScenarioSummary, 
  nameA: string, 
  nameB: string
): WinnerResult => {
  let scoreA = 0, scoreB = 0;
  const advantagesA: string[] = [];
  const advantagesB: string[] = [];

  // Revenue (higher is better)
  if (summaryA.totalRevenue > summaryB.totalRevenue) {
    scoreA++;
    advantagesA.push(`+${formatCompactUSD(summaryA.totalRevenue - summaryB.totalRevenue)} gelir`);
  } else if (summaryB.totalRevenue > summaryA.totalRevenue) {
    scoreB++;
    advantagesB.push(`+${formatCompactUSD(summaryB.totalRevenue - summaryA.totalRevenue)} gelir`);
  }

  // Expense (lower is better)
  if (summaryA.totalExpense < summaryB.totalExpense) {
    scoreA++;
    advantagesA.push(`${formatCompactUSD(summaryB.totalExpense - summaryA.totalExpense)} daha az gider`);
  } else if (summaryB.totalExpense < summaryA.totalExpense) {
    scoreB++;
    advantagesB.push(`${formatCompactUSD(summaryA.totalExpense - summaryB.totalExpense)} daha az gider`);
  }

  // Net Profit (higher is better)
  if (summaryA.netProfit > summaryB.netProfit) {
    scoreA++;
    advantagesA.push('Daha yüksek net kâr');
  } else if (summaryB.netProfit > summaryA.netProfit) {
    scoreB++;
    advantagesB.push('Daha yüksek net kâr');
  }

  // Profit Margin (higher is better)
  if (summaryA.profitMargin > summaryB.profitMargin) {
    scoreA++;
    advantagesA.push('Daha iyi kâr marjı');
  } else if (summaryB.profitMargin > summaryA.profitMargin) {
    scoreB++;
    advantagesB.push('Daha iyi kâr marjı');
  }

  // Capital Need (lower is better)
  if (summaryA.capitalNeed < summaryB.capitalNeed) {
    scoreA++;
    advantagesA.push('Daha az sermaye ihtiyacı');
  } else if (summaryB.capitalNeed < summaryA.capitalNeed) {
    scoreB++;
    advantagesB.push('Daha az sermaye ihtiyacı');
  }

  const winner = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'TIE';
  
  return {
    winner,
    winnerName: winner === 'A' ? nameA : winner === 'B' ? nameB : 'Eşit',
    scoreA,
    scoreB,
    totalMetrics: 5,
    advantages: winner === 'A' ? advantagesA : winner === 'B' ? advantagesB : [],
    disadvantages: winner === 'A' ? advantagesB : winner === 'B' ? advantagesA : [],
  };
};

const generateInsights = (
  summaryA: ScenarioSummary, 
  summaryB: ScenarioSummary, 
  nameA: string, 
  nameB: string
): ScenarioInsight[] => {
  const insights: ScenarioInsight[] = [];

  // Revenue difference analysis
  const revenueDiff = summaryA.totalRevenue - summaryB.totalRevenue;
  const revenueDiffPercent = summaryB.totalRevenue !== 0 
    ? (revenueDiff / summaryB.totalRevenue) * 100 
    : 0;
  
  if (Math.abs(revenueDiff) > 10000) {
    const higherScenario = revenueDiff > 0 ? nameA : nameB;
    insights.push({
      type: 'positive',
      category: 'revenue',
      icon: <DollarSign className="h-4 w-4" />,
      title: 'Gelir Farkı',
      description: `${higherScenario} %${Math.abs(revenueDiffPercent).toFixed(1)} daha fazla gelir üretiyor (${formatCompactUSD(Math.abs(revenueDiff))}).`,
      impact: Math.abs(revenueDiff) > 50000 ? 'high' : 'medium',
      recommendation: 'Yüksek gelir senaryosunun gerçekleşme olasılığını ve risk faktörlerini değerlendirin.',
    });
  }

  // Expense risk analysis
  const expenseDiff = summaryA.totalExpense - summaryB.totalExpense;
  const expenseDiffPercent = summaryB.totalExpense !== 0 
    ? (expenseDiff / summaryB.totalExpense) * 100 
    : 0;
  
  if (Math.abs(expenseDiff) > 20000) {
    const higherExpenseScenario = expenseDiff > 0 ? nameA : nameB;
    const lowerExpenseScenario = expenseDiff > 0 ? nameB : nameA;
    insights.push({
      type: 'warning',
      category: 'expense',
      icon: <AlertTriangle className="h-4 w-4" />,
      title: 'Gider Riski',
      description: `${higherExpenseScenario}'da giderler %${Math.abs(expenseDiffPercent).toFixed(1)} daha yüksek. ${lowerExpenseScenario}'nın maliyet yapısı daha sürdürülebilir.`,
      impact: Math.abs(expenseDiff) > 100000 ? 'high' : 'medium',
      recommendation: 'Yüksek gider senaryosundaki kalemleri tek tek inceleyerek gerekli olanları belirleyin.',
    });
  }

  // Profit margin analysis
  const marginDiff = summaryA.profitMargin - summaryB.profitMargin;
  const bothNegativeMargin = summaryA.profitMargin < 0 && summaryB.profitMargin < 0;
  
  if (bothNegativeMargin) {
    const lessBadScenario = summaryA.profitMargin > summaryB.profitMargin ? nameA : nameB;
    insights.push({
      type: 'warning',
      category: 'margin',
      icon: <Target className="h-4 w-4" />,
      title: 'Kritik Negatif Marj',
      description: `Her iki senaryo da negatif kâr marjına sahip. ${lessBadScenario} daha az zarar öngörüyor (%${Math.max(summaryA.profitMargin, summaryB.profitMargin).toFixed(1)} vs %${Math.min(summaryA.profitMargin, summaryB.profitMargin).toFixed(1)}).`,
      impact: 'high',
      recommendation: 'Giderleri azaltmak veya gelirleri artırmak için acil aksiyon planı oluşturun.',
    });
  } else if (Math.abs(marginDiff) > 10) {
    const betterMarginScenario = summaryA.profitMargin > summaryB.profitMargin ? nameA : nameB;
    insights.push({
      type: summaryA.profitMargin > 0 || summaryB.profitMargin > 0 ? 'positive' : 'neutral',
      category: 'margin',
      icon: <BarChart3 className="h-4 w-4" />,
      title: 'Kâr Marjı Analizi',
      description: `${betterMarginScenario} ${Math.abs(marginDiff).toFixed(1)} puan daha iyi kâr marjına sahip.`,
      impact: 'medium',
    });
  }

  // Capital efficiency analysis
  const efficiencyA = summaryA.capitalNeed > 0 ? summaryA.totalRevenue / summaryA.capitalNeed : Infinity;
  const efficiencyB = summaryB.capitalNeed > 0 ? summaryB.totalRevenue / summaryB.capitalNeed : Infinity;
  
  if (summaryA.capitalNeed > 0 || summaryB.capitalNeed > 0) {
    const moreEfficientScenario = efficiencyA > efficiencyB ? nameA : nameB;
    const lessEfficientScenario = efficiencyA > efficiencyB ? nameB : nameA;
    const betterEfficiency = Math.max(efficiencyA, efficiencyB);
    
    if (isFinite(betterEfficiency)) {
      insights.push({
        type: 'neutral',
        category: 'capital',
        icon: <PiggyBank className="h-4 w-4" />,
        title: 'Sermaye Verimliliği',
        description: `${moreEfficientScenario} daha verimli: $1 sermaye için $${betterEfficiency.toFixed(2)} gelir. ${lessEfficientScenario} daha fazla sermaye gerektiriyor.`,
        impact: 'medium',
        recommendation: 'Sermaye verimliliği düşük olan senaryoda yatırım önceliklerini gözden geçirin.',
      });
    }
  }

  // Capital requirement gap
  const capitalDiff = Math.abs(summaryA.capitalNeed - summaryB.capitalNeed);
  if (capitalDiff > 50000) {
    const moreCapitalScenario = summaryA.capitalNeed > summaryB.capitalNeed ? nameA : nameB;
    insights.push({
      type: 'warning',
      category: 'capital',
      icon: <Shield className="h-4 w-4" />,
      title: 'Sermaye İhtiyacı Farkı',
      description: `${moreCapitalScenario} ${formatCompactUSD(capitalDiff)} daha fazla sermaye gerektiriyor. Finansman planınızı buna göre ayarlayın.`,
      impact: capitalDiff > 200000 ? 'high' : 'medium',
      recommendation: 'Ek sermaye temini için banka kredisi, yatırımcı veya iç kaynakları değerlendirin.',
    });
  }

  return insights;
};

const generateRecommendations = (
  summaryA: ScenarioSummary, 
  summaryB: ScenarioSummary, 
  nameA: string, 
  nameB: string,
  winner: WinnerResult
): DecisionRecommendation[] => {
  const recommendations: DecisionRecommendation[] = [];

  // Determine characteristics
  const higherRevenueScenario = summaryA.totalRevenue > summaryB.totalRevenue ? { name: nameA, summary: summaryA } : { name: nameB, summary: summaryB };
  const lowerExpenseScenario = summaryA.totalExpense < summaryB.totalExpense ? { name: nameA, summary: summaryA } : { name: nameB, summary: summaryB };
  const lowerCapitalScenario = summaryA.capitalNeed < summaryB.capitalNeed ? { name: nameA, summary: summaryA } : { name: nameB, summary: summaryB };

  // Growth-focused recommendation
  if (summaryA.totalRevenue !== summaryB.totalRevenue) {
    const capitalNeeded = higherRevenueScenario.summary.capitalNeed;
    recommendations.push({
      icon: <Zap className="h-5 w-5 text-amber-400" />,
      title: 'Büyüme Odaklı Strateji',
      description: `${higherRevenueScenario.name} senaryosunu seçin${capitalNeeded > 0 ? ` ve ${formatCompactUSD(capitalNeeded)} ek sermaye temin edin` : ''}. Yüksek gelir potansiyeli, uzun vadeli büyüme sağlayabilir.`,
      risk: capitalNeeded > 200000 ? 'high' : capitalNeeded > 100000 ? 'medium' : 'low',
      suitableFor: 'Risk toleransı yüksek, büyüme hedefleyen işletmeler',
    });
  }

  // Conservative recommendation
  if (summaryA.totalExpense !== summaryB.totalExpense) {
    recommendations.push({
      icon: <Shield className="h-5 w-5 text-blue-400" />,
      title: 'Temkinli Yaklaşım',
      description: `${lowerExpenseScenario.name} senaryosunun gider yapısıyla başlayın. Maliyet kontrolü öncelikli, sürdürülebilir büyüme.`,
      risk: 'low',
      suitableFor: 'Nakit akışı kısıtlı veya ekonomik belirsizlik dönemindeki işletmeler',
    });
  }

  // Hybrid recommendation
  if (higherRevenueScenario.name !== lowerExpenseScenario.name) {
    recommendations.push({
      icon: <TrendingUpDown className="h-5 w-5 text-purple-400" />,
      title: 'Hibrit Senaryo',
      description: `${higherRevenueScenario.name}'nın gelir hedeflerini ${lowerExpenseScenario.name}'nın gider yapısıyla birleştirin. Optimize edilmiş kârlılık.`,
      risk: 'medium',
      suitableFor: 'Dengeli büyüme ve maliyet kontrolü hedefleyen işletmeler',
    });
  }

  // Phased approach
  if (winner.winner !== 'TIE' && Math.abs(summaryA.capitalNeed - summaryB.capitalNeed) > 50000) {
    recommendations.push({
      icon: <Target className="h-5 w-5 text-emerald-400" />,
      title: 'Kademeli Geçiş',
      description: `İlk 6 ay ${lowerCapitalScenario.name} ile başlayın, hedeflere ulaşıldığında diğer senaryoya geçin. Risk yönetimli büyüme.`,
      risk: 'low',
      suitableFor: 'Sonuçları test ederek ilerlemek isteyen işletmeler',
    });
  }

  return recommendations;
};

const calculateQuarterlyComparison = (
  scenarioA: SimulationScenario,
  scenarioB: SimulationScenario
): QuarterlyComparison[] => {
  const quarters: ('q1' | 'q2' | 'q3' | 'q4')[] = ['q1', 'q2', 'q3', 'q4'];
  
  return quarters.map(q => {
    const aRevenue = scenarioA.revenues.reduce((sum, r) => 
      sum + (r.projectedQuarterly?.[q] || r.projectedAmount / 4), 0);
    const aExpense = scenarioA.expenses.reduce((sum, e) => 
      sum + (e.projectedQuarterly?.[q] || e.projectedAmount / 4), 0);
    
    const bRevenue = scenarioB.revenues.reduce((sum, r) => 
      sum + (r.projectedQuarterly?.[q] || r.projectedAmount / 4), 0);
    const bExpense = scenarioB.expenses.reduce((sum, e) => 
      sum + (e.projectedQuarterly?.[q] || e.projectedAmount / 4), 0);
    
    return {
      quarter: q.toUpperCase(),
      scenarioARevenue: aRevenue,
      scenarioAExpense: aExpense,
      scenarioANet: aRevenue - aExpense,
      scenarioBRevenue: bRevenue,
      scenarioBExpense: bExpense,
      scenarioBNet: bRevenue - bExpense,
    };
  });
};

const InsightCard: React.FC<{ insight: ScenarioInsight }> = ({ insight }) => {
  const bgColors = {
    positive: 'bg-emerald-500/10 border-emerald-500/20',
    negative: 'bg-red-500/10 border-red-500/20',
    warning: 'bg-amber-500/10 border-amber-500/20',
    neutral: 'bg-muted/50 border-border',
  };

  const iconColors = {
    positive: 'text-emerald-400',
    negative: 'text-red-400',
    warning: 'text-amber-400',
    neutral: 'text-muted-foreground',
  };

  return (
    <div className={`p-4 rounded-lg border ${bgColors[insight.type]}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${iconColors[insight.type]}`}>
          {insight.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm">{insight.title}</h4>
            <Badge variant="outline" className="text-xs">
              {insight.impact === 'high' ? 'Kritik' : insight.impact === 'medium' ? 'Orta' : 'Düşük'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{insight.description}</p>
          {insight.recommendation && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              💡 {insight.recommendation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const RecommendationCard: React.FC<{ recommendation: DecisionRecommendation }> = ({ recommendation }) => {
  const riskColors = {
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    high: 'bg-red-500/10 text-red-400 border-red-500/30',
  };

  const riskLabels = {
    low: 'Düşük Risk',
    medium: 'Orta Risk',
    high: 'Yüksek Risk',
  };

  return (
    <Card className="bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted">
            {recommendation.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium">{recommendation.title}</h4>
              <Badge variant="outline" className={riskColors[recommendation.risk]}>
                {riskLabels[recommendation.risk]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{recommendation.description}</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Uygun:</span> {recommendation.suitableFor}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({
  open,
  onOpenChange,
  scenarios,
  currentScenarioId,
}) => {
  const [scenarioAId, setScenarioAId] = useState<string | null>(currentScenarioId);
  const [scenarioBId, setScenarioBId] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  const { generateScenarioComparisonPdf, isGenerating } = usePdfEngine();

  const scenarioA = useMemo(() => scenarios.find(s => s.id === scenarioAId), [scenarios, scenarioAId]);
  const scenarioB = useMemo(() => scenarios.find(s => s.id === scenarioBId), [scenarios, scenarioBId]);

  const summaryA = useMemo(() => scenarioA ? calculateScenarioSummary(scenarioA) : null, [scenarioA]);
  const summaryB = useMemo(() => scenarioB ? calculateScenarioSummary(scenarioB) : null, [scenarioB]);

  const metrics: ComparisonMetric[] = useMemo(() => {
    if (!summaryA || !summaryB) return [];

    return [
      { label: 'Toplam Gelir', scenarioA: summaryA.totalRevenue, scenarioB: summaryB.totalRevenue, format: 'currency', higherIsBetter: true },
      { label: 'Toplam Gider', scenarioA: summaryA.totalExpense, scenarioB: summaryB.totalExpense, format: 'currency', higherIsBetter: false },
      { label: 'Net Kâr', scenarioA: summaryA.netProfit, scenarioB: summaryB.netProfit, format: 'currency', higherIsBetter: true },
      { label: 'Kâr Marjı', scenarioA: summaryA.profitMargin, scenarioB: summaryB.profitMargin, format: 'percent', higherIsBetter: true },
      { label: 'Yatırım Toplamı', scenarioA: summaryA.totalInvestment, scenarioB: summaryB.totalInvestment, format: 'currency', higherIsBetter: false },
      { label: 'Sermaye İhtiyacı', scenarioA: summaryA.capitalNeed, scenarioB: summaryB.capitalNeed, format: 'currency', higherIsBetter: false },
    ];
  }, [summaryA, summaryB]);

  const winner = useMemo(() => {
    if (!summaryA || !summaryB || !scenarioA || !scenarioB) return null;
    return determineWinner(summaryA, summaryB, scenarioA.name, scenarioB.name);
  }, [summaryA, summaryB, scenarioA, scenarioB]);

  const insights = useMemo(() => {
    if (!summaryA || !summaryB || !scenarioA || !scenarioB) return [];
    return generateInsights(summaryA, summaryB, scenarioA.name, scenarioB.name);
  }, [summaryA, summaryB, scenarioA, scenarioB]);

  const recommendations = useMemo(() => {
    if (!summaryA || !summaryB || !scenarioA || !scenarioB || !winner) return [];
    return generateRecommendations(summaryA, summaryB, scenarioA.name, scenarioB.name, winner);
  }, [summaryA, summaryB, scenarioA, scenarioB, winner]);

  const quarterlyComparison = useMemo(() => {
    if (!scenarioA || !scenarioB) return [];
    return calculateQuarterlyComparison(scenarioA, scenarioB);
  }, [scenarioA, scenarioB]);

  const canCompare = scenarioA && scenarioB && scenarioAId !== scenarioBId;

  const handleExportPdf = async () => {
    if (!scenarioA || !scenarioB || !summaryA || !summaryB) return;
    
    try {
      await generateScenarioComparisonPdf({
        scenarioA: { name: scenarioA.name, summary: summaryA },
        scenarioB: { name: scenarioB.name, summary: summaryB },
        metrics,
        winner: winner || undefined,
      });
      toast.success('Senaryo karşılaştırma PDF oluşturuldu');
    } catch {
      toast.error('PDF oluşturulamadı');
    }
  };

  const chartConfig: ChartConfig = {
    scenarioANet: { label: `${scenarioA?.name || 'A'} Net`, color: 'hsl(var(--chart-1))' },
    scenarioBNet: { label: `${scenarioB?.name || 'B'} Net`, color: 'hsl(var(--chart-2))' },
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Senaryo Karşılaştırma
            </div>
            {canCompare && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportPdf}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                PDF
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Senaryo A</label>
            <Select value={scenarioAId || ''} onValueChange={setScenarioAId}>
              <SelectTrigger>
                <SelectValue placeholder="Senaryo seçin..." />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((scenario) => (
                  <SelectItem key={scenario.id} value={scenario.id!} disabled={scenario.id === scenarioBId}>
                    {scenario.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Senaryo B</label>
            <Select value={scenarioBId || ''} onValueChange={setScenarioBId}>
              <SelectTrigger>
                <SelectValue placeholder="Senaryo seçin..." />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((scenario) => (
                  <SelectItem key={scenario.id} value={scenario.id!} disabled={scenario.id === scenarioAId}>
                    {scenario.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!canCompare ? (
          <div className="text-center py-8 text-muted-foreground">
            {scenarios.length < 2 ? (
              <p>Karşılaştırma için en az 2 kayıtlı senaryo gerekli.</p>
            ) : (
              <p>Karşılaştırmak için iki farklı senaryo seçin.</p>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4 pr-4">
              {/* Winner Card */}
              {winner && winner.winner !== 'TIE' && (
                <Card className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-amber-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-amber-500/20">
                        <Trophy className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">Önerilen: {winner.winnerName}</h3>
                          <Badge variant="secondary">
                            {winner.scoreA > winner.scoreB ? winner.scoreA : winner.scoreB}/{winner.totalMetrics} metrik
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {winner.advantages.map((adv, i) => (
                            <Badge key={i} variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                              ✓ {adv}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabs */}
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="summary">Özet</TabsTrigger>
                  <TabsTrigger value="trend">
                    <LineChartIcon className="h-4 w-4 mr-1" />
                    Trend
                  </TabsTrigger>
                  <TabsTrigger value="insights">
                    <Lightbulb className="h-4 w-4 mr-1" />
                    Çıkarımlar
                  </TabsTrigger>
                  <TabsTrigger value="recommendations">Öneriler</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[160px]">Metrik</TableHead>
                        <TableHead className="text-right">{scenarioA?.name}</TableHead>
                        <TableHead className="text-right">{scenarioB?.name}</TableHead>
                        <TableHead className="text-right w-[100px]">Fark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.map((metric) => {
                        const diff = calculateDiff(metric.scenarioA, metric.scenarioB);
                        return (
                          <TableRow key={metric.label}>
                            <TableCell className="font-medium">{metric.label}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatValue(metric.scenarioA, metric.format)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatValue(metric.scenarioB, metric.format)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DiffBadge diff={diff} format={metric.format} higherIsBetter={metric.higherIsBetter} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="trend" className="mt-4">
                  <Card ref={chartContainerRef} className="bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Çeyreklik Net Kâr Karşılaştırması</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ComposedChart data={quarterlyComparison}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="quarter" className="text-xs" />
                          <YAxis tickFormatter={(v) => formatCompactUSD(v)} className="text-xs" />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar dataKey="scenarioANet" fill="var(--color-scenarioANet)" name={scenarioA?.name} radius={4} />
                          <Bar dataKey="scenarioBNet" fill="var(--color-scenarioBNet)" name={scenarioB?.name} radius={4} />
                        </ComposedChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="insights" className="mt-4">
                  {insights.length > 0 ? (
                    <div className="space-y-3">
                      {insights.map((insight, index) => (
                        <InsightCard key={index} insight={insight} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Senaryolar arasında önemli bir fark bulunamadı.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="recommendations" className="mt-4">
                  {recommendations.length > 0 ? (
                    <div className="space-y-3">
                      {recommendations.map((rec, index) => (
                        <RecommendationCard key={index} recommendation={rec} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Yeterli veri olmadığından öneri oluşturulamadı.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
