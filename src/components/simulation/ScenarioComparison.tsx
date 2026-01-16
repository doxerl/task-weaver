import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
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
  LineChart as LineChartIcon,
  Sparkles,
  Brain,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { SimulationScenario, AIScenarioInsight, AIRecommendation, QuarterlyAIAnalysis } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';
import { toast } from 'sonner';
import { usePdfEngine } from '@/hooks/finance/usePdfEngine';
import { useScenarioAIAnalysis } from '@/hooks/finance/useScenarioAIAnalysis';
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
  Area,
  AreaChart,
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
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  
  const { generatePdfFromElement, isGenerating } = usePdfEngine();
  const { analysis: aiAnalysis, isLoading: aiLoading, analyzeScenarios, clearAnalysis } = useScenarioAIAnalysis();

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

  // Calculate cumulative data for quarterly chart
  const quarterlyCumulativeData = useMemo(() => {
    let cumulativeA = 0;
    let cumulativeB = 0;
    return quarterlyComparison.map(q => {
      cumulativeA += q.scenarioANet;
      cumulativeB += q.scenarioBNet;
      return {
        quarter: q.quarter,
        ...q,
        scenarioACumulative: cumulativeA,
        scenarioBCumulative: cumulativeB,
      };
    });
  }, [quarterlyComparison]);

  const canCompare = scenarioA && scenarioB && scenarioAId !== scenarioBId;

  // Clear AI analysis when scenarios change
  useEffect(() => {
    clearAnalysis();
  }, [scenarioAId, scenarioBId, clearAnalysis]);

  const handleAIAnalysis = async () => {
    if (!scenarioA || !scenarioB || !summaryA || !summaryB) return;

    const quarterlyA = {
      q1: quarterlyComparison[0]?.scenarioANet || 0,
      q2: quarterlyComparison[1]?.scenarioANet || 0,
      q3: quarterlyComparison[2]?.scenarioANet || 0,
      q4: quarterlyComparison[3]?.scenarioANet || 0,
    };
    const quarterlyB = {
      q1: quarterlyComparison[0]?.scenarioBNet || 0,
      q2: quarterlyComparison[1]?.scenarioBNet || 0,
      q3: quarterlyComparison[2]?.scenarioBNet || 0,
      q4: quarterlyComparison[3]?.scenarioBNet || 0,
    };

    await analyzeScenarios(
      scenarioA,
      scenarioB,
      { totalRevenue: summaryA.totalRevenue, totalExpenses: summaryA.totalExpense, netProfit: summaryA.netProfit, profitMargin: summaryA.profitMargin },
      { totalRevenue: summaryB.totalRevenue, totalExpenses: summaryB.totalExpense, netProfit: summaryB.netProfit, profitMargin: summaryB.profitMargin },
      quarterlyA,
      quarterlyB
    );
  };

  const handleExportPdf = async () => {
    if (!pdfContainerRef.current || !scenarioA || !scenarioB) return;
    
    try {
      const success = await generatePdfFromElement(pdfContainerRef, {
        filename: `Senaryo_Karsilastirma_${scenarioA.name.replace(/\s+/g, '_')}_vs_${scenarioB.name.replace(/\s+/g, '_')}.pdf`,
        orientation: 'portrait',
        margin: 15,
        fitToPage: false,
      });
      
      if (success) {
        toast.success('Senaryo karşılaştırma PDF oluşturuldu');
      } else {
        toast.error('PDF oluşturulamadı');
      }
    } catch {
      toast.error('PDF oluşturulamadı');
    }
  };

  // PDF uyumluluğu için hex renk değerleri
  const chartConfig: ChartConfig = {
    scenarioANet: { label: `${scenarioA?.name || 'A'} Net`, color: '#2563eb' },
    scenarioBNet: { label: `${scenarioB?.name || 'B'} Net`, color: '#16a34a' },
  };
  // Risk renk sınıfları
  const riskColors: Record<string, string> = {
    low: 'border-l-4 border-l-emerald-500 bg-emerald-50',
    medium: 'border-l-4 border-l-amber-500 bg-amber-50',
    high: 'border-l-4 border-l-red-500 bg-red-50',
  };
  
  // Impact renk sınıfları
  const impactColors: Record<string, string> = {
    positive: 'border-l-4 border-l-emerald-500 bg-emerald-50',
    negative: 'border-l-4 border-l-red-500 bg-red-50',
    warning: 'border-l-4 border-l-amber-500 bg-amber-50',
    neutral: 'border-l-4 border-l-slate-400 bg-slate-50',
  };

  return (
    <>
      {/* PDF için Gizli Container - Akıllı sayfa bölmeli dikey A4 */}
      {canCompare && (
        <div 
          ref={pdfContainerRef} 
          className="hidden pdf-hidden-container"
          style={{ width: '210mm', minHeight: 'fit-content' }}
        >
          <div className="pdf-content p-8 space-y-6 bg-white text-black" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Başlık - Kapak sayfası yok, doğrudan başlık */}
            <div className="text-center border-b-2 border-slate-200 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Senaryo Karşılaştırma Raporu</h1>
              <p className="text-lg text-slate-600">{scenarioA?.name} vs {scenarioB?.name}</p>
              <p className="text-sm text-slate-400 mt-1">{new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            {/* Kazanan Kartı */}
            {winner && winner.winner !== 'TIE' && (
              <div className="avoid-break p-4 rounded-lg bg-amber-50 border border-amber-200 mb-6">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🏆</div>
                  <div>
                    <h3 className="font-bold text-lg text-amber-900">Önerilen: {winner.winnerName}</h3>
                    <p className="text-sm text-amber-700">Skor: {Math.max(winner.scoreA, winner.scoreB)}/{winner.totalMetrics} metrik</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {winner.advantages.map((adv, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-800">
                          ✓ {adv}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Metrik Karşılaştırma Tablosu */}
            <div className="pdf-section avoid-break">
              <h2 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">Metrik Karşılaştırması</h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="text-left p-2 font-semibold">Metrik</th>
                    <th className="text-right p-2 font-semibold">{scenarioA?.name}</th>
                    <th className="text-right p-2 font-semibold">{scenarioB?.name}</th>
                    <th className="text-right p-2 font-semibold">Fark</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric, idx) => {
                    const diff = calculateDiff(metric.scenarioA, metric.scenarioB);
                    const isPositive = metric.higherIsBetter ? diff.value > 0 : diff.value < 0;
                    return (
                      <tr key={metric.label} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="p-2 font-medium text-slate-700">{metric.label}</td>
                        <td className="p-2 text-right font-mono text-slate-600">{formatValue(metric.scenarioA, metric.format)}</td>
                        <td className="p-2 text-right font-mono text-slate-600">{formatValue(metric.scenarioB, metric.format)}</td>
                        <td className={`p-2 text-right font-mono ${isPositive ? 'text-emerald-600' : diff.value !== 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {diff.value === 0 ? '-' : `${diff.percent >= 0 ? '+' : ''}${diff.percent.toFixed(1)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Sayfa sonu ipucu + Çeyreklik Trend Tablosu */}
            <div className="page-break-before pdf-section avoid-break">
              <h2 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">Çeyreklik Net Kâr Karşılaştırması</h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-indigo-600 text-white">
                    <th className="text-center p-2 font-semibold">Çeyrek</th>
                    <th className="text-right p-2 font-semibold">{scenarioA?.name}</th>
                    <th className="text-right p-2 font-semibold">{scenarioB?.name}</th>
                    <th className="text-right p-2 font-semibold">Fark</th>
                  </tr>
                </thead>
                <tbody>
                  {quarterlyComparison.map((q, idx) => {
                    const diff = q.scenarioBNet - q.scenarioANet;
                    const diffPercent = q.scenarioANet !== 0 ? (diff / Math.abs(q.scenarioANet)) * 100 : 0;
                    return (
                      <tr key={q.quarter} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="p-2 text-center font-semibold text-slate-700">{q.quarter}</td>
                        <td className="p-2 text-right font-mono text-slate-600">{formatCompactUSD(q.scenarioANet)}</td>
                        <td className="p-2 text-right font-mono text-slate-600">{formatCompactUSD(q.scenarioBNet)}</td>
                        <td className={`p-2 text-right font-mono ${diffPercent > 0 ? 'text-emerald-600' : diffPercent < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {diffPercent === 0 ? '-' : `${diffPercent >= 0 ? '+' : ''}${diffPercent.toFixed(1)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Çıkarımlar */}
            {insights.length > 0 && (
              <div className="pdf-section">
                <h2 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">Analiz Çıkarımları</h2>
                <div className="space-y-3">
                  {insights.map((insight, index) => (
                    <div key={index} className={`avoid-break p-3 rounded ${impactColors[insight.type]}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{insight.type === 'positive' ? '✅' : insight.type === 'warning' ? '⚠️' : insight.type === 'negative' ? '❌' : 'ℹ️'}</span>
                        <div>
                          <h4 className="font-semibold text-slate-800">{insight.title}</h4>
                          <p className="text-sm text-slate-600 mt-1">{insight.description}</p>
                          {insight.recommendation && (
                            <p className="text-xs text-slate-500 mt-2 italic">💡 {insight.recommendation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Öneriler - Sayfa sonu */}
            {recommendations.length > 0 && (
              <div className="page-break-before pdf-section">
                <h2 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">Karar Önerileri</h2>
                <div className="space-y-3">
                  {recommendations.map((rec, index) => (
                    <div key={index} className={`avoid-break p-3 rounded ${riskColors[rec.risk]}`}>
                      <h4 className="font-semibold text-slate-800">{rec.title}</h4>
                      <p className="text-sm text-slate-600 mt-1">{rec.description}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        <span className="font-medium">Risk:</span> {rec.risk === 'low' ? 'Düşük' : rec.risk === 'medium' ? 'Orta' : 'Yüksek'} | 
                        <span className="font-medium ml-2">Uygun:</span> {rec.suitableFor}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-slate-400 mt-8 pt-4 border-t">
              Bu rapor otomatik olarak oluşturulmuştur.
            </div>
          </div>
        </div>
      )}

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
          <>
            <ScrollArea className="h-[60vh]">
              <div className="space-y-4 pr-4 bg-background">
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
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="summary">Özet</TabsTrigger>
                    <TabsTrigger value="trend">
                      <LineChartIcon className="h-4 w-4 mr-1" />
                      Trend
                    </TabsTrigger>
                    <TabsTrigger value="quarterly">
                      <Calendar className="h-4 w-4 mr-1" />
                      Çeyreklik
                    </TabsTrigger>
                    <TabsTrigger value="insights">
                      <Sparkles className="h-4 w-4 mr-1" />
                      Çıkarımlar
                    </TabsTrigger>
                    <TabsTrigger value="recommendations">
                      <Brain className="h-4 w-4 mr-1" />
                      Öneriler
                    </TabsTrigger>
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
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis tickFormatter={(v) => formatCompactUSD(v)} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Bar dataKey="scenarioANet" fill="var(--color-scenarioANet)" name={scenarioA?.name} radius={4} />
                            <Bar dataKey="scenarioBNet" fill="var(--color-scenarioBNet)" name={scenarioB?.name} radius={4} />
                          </ComposedChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* New Quarterly Tab */}
                  <TabsContent value="quarterly" className="mt-4 space-y-4">
                    {/* Detailed Quarterly Table */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Çeyreklik Detay Tablosu
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Çeyrek</TableHead>
                              <TableHead className="text-right">{scenarioA?.name} Gelir</TableHead>
                              <TableHead className="text-right">{scenarioB?.name} Gelir</TableHead>
                              <TableHead className="text-right">{scenarioA?.name} Net</TableHead>
                              <TableHead className="text-right">{scenarioB?.name} Net</TableHead>
                              <TableHead className="text-center">Kazanan</TableHead>
                              <TableHead className="text-center">Trend</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {quarterlyCumulativeData.map((q, idx) => {
                              const winnerQ = q.scenarioBNet > q.scenarioANet ? 'B' : q.scenarioANet > q.scenarioBNet ? 'A' : '-';
                              const prevNet = idx > 0 ? quarterlyCumulativeData[idx - 1] : null;
                              const trendA = prevNet ? (q.scenarioANet > prevNet.scenarioANet ? '↗' : q.scenarioANet < prevNet.scenarioANet ? '↘' : '→') : '-';
                              const trendB = prevNet ? (q.scenarioBNet > prevNet.scenarioBNet ? '↗' : q.scenarioBNet < prevNet.scenarioBNet ? '↘' : '→') : '-';
                              return (
                                <TableRow key={q.quarter}>
                                  <TableCell className="font-semibold">{q.quarter}</TableCell>
                                  <TableCell className="text-right font-mono text-sm">{formatCompactUSD(q.scenarioARevenue)}</TableCell>
                                  <TableCell className="text-right font-mono text-sm">{formatCompactUSD(q.scenarioBRevenue)}</TableCell>
                                  <TableCell className={`text-right font-mono text-sm ${q.scenarioANet >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {formatCompactUSD(q.scenarioANet)}
                                  </TableCell>
                                  <TableCell className={`text-right font-mono text-sm ${q.scenarioBNet >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {formatCompactUSD(q.scenarioBNet)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant={winnerQ === 'B' ? 'default' : winnerQ === 'A' ? 'secondary' : 'outline'}>
                                      {winnerQ === 'A' ? scenarioA?.name.slice(0, 8) : winnerQ === 'B' ? scenarioB?.name.slice(0, 8) : 'Eşit'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-center text-lg">
                                    <span className="text-blue-500">{trendA}</span> / <span className="text-emerald-500">{trendB}</span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    {/* Cumulative Cash Flow Chart */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Kümülatif Nakit Akışı</CardTitle>
                        <CardDescription className="text-xs">Yıl boyunca birikimli net kâr karşılaştırması</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={{
                          scenarioACumulative: { label: `${scenarioA?.name} Kümülatif`, color: '#2563eb' },
                          scenarioBCumulative: { label: `${scenarioB?.name} Kümülatif`, color: '#16a34a' },
                        }} className="h-[200px] w-full">
                          <AreaChart data={quarterlyCumulativeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: '#64748b' }} />
                            <YAxis tickFormatter={(v) => formatCompactUSD(v)} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Area type="monotone" dataKey="scenarioACumulative" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} name={scenarioA?.name} />
                            <Area type="monotone" dataKey="scenarioBCumulative" stroke="#16a34a" fill="#16a34a" fillOpacity={0.2} name={scenarioB?.name} />
                          </AreaChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>

                    {/* AI Quarterly Analysis */}
                    {aiAnalysis?.quarterly_analysis && (
                      <Card className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-500/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Brain className="h-4 w-4 text-purple-400" />
                            AI Mevsimsellik Analizi
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">{aiAnalysis.quarterly_analysis.overview}</p>
                          
                          {aiAnalysis.quarterly_analysis.critical_periods.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold mb-2 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-amber-400" />
                                Kritik Dönemler
                              </h5>
                              <div className="space-y-1">
                                {aiAnalysis.quarterly_analysis.critical_periods.map((period, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs">
                                    <Badge variant="outline" className={
                                      period.risk_level === 'high' ? 'border-red-500 text-red-400' :
                                      period.risk_level === 'medium' ? 'border-amber-500 text-amber-400' :
                                      'border-blue-500 text-blue-400'
                                    }>{period.quarter}</Badge>
                                    <span className="text-muted-foreground">{period.reason}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {aiAnalysis.quarterly_analysis.seasonal_trends.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold mb-2">Mevsimsel Trendler</h5>
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {aiAnalysis.quarterly_analysis.seasonal_trends.map((trend, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <TrendingUp className="h-3 w-3 mt-0.5 text-emerald-400 shrink-0" />
                                    {trend}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {aiAnalysis.quarterly_analysis.cash_burn_warning && (
                            <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                              <p className="text-xs text-red-400 flex items-start gap-1">
                                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                {aiAnalysis.quarterly_analysis.cash_burn_warning}
                              </p>
                            </div>
                          )}

                          <div className="text-xs">
                            <span className="font-semibold">Büyüme Eğilimi: </span>
                            <span className="text-muted-foreground">{aiAnalysis.quarterly_analysis.growth_trajectory}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Enhanced Insights Tab with AI */}
                  <TabsContent value="insights" className="mt-4 space-y-4">
                    {/* AI Analysis Button */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {aiAnalysis ? (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                            AI analizi tamamlandı
                          </span>
                        ) : (
                          <span>AI ile derin analiz yapın</span>
                        )}
                      </div>
                      <Button 
                        onClick={handleAIAnalysis} 
                        disabled={aiLoading}
                        variant={aiAnalysis ? "outline" : "default"}
                        size="sm"
                        className="gap-2"
                      >
                        {aiLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Analiz ediliyor... (10-15 sn)
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            {aiAnalysis ? 'Yeniden Analiz Et' : 'AI ile Analiz Et'}
                          </>
                        )}
                      </Button>
                    </div>

                    {/* AI Loading Skeleton */}
                    {aiLoading && (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Card key={i} className="p-4">
                            <div className="flex items-start gap-3">
                              <Skeleton className="h-8 w-8 rounded" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/3" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-2/3" />
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* AI Insights */}
                    {!aiLoading && aiAnalysis?.insights && aiAnalysis.insights.length > 0 && (
                      <div className="space-y-3">
                        {aiAnalysis.insights.map((insight, index) => (
                          <AIInsightCard key={index} insight={insight} />
                        ))}
                      </div>
                    )}

                    {/* Fallback Static Insights */}
                    {!aiLoading && !aiAnalysis && insights.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground mb-2">Temel çıkarımlar (AI analizi için yukarıdaki butonu kullanın)</p>
                        {insights.map((insight, index) => (
                          <InsightCard key={index} insight={insight} />
                        ))}
                      </div>
                    )}

                    {!aiLoading && !aiAnalysis && insights.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Senaryolar arasında önemli bir fark bulunamadı.</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Enhanced Recommendations Tab with AI */}
                  <TabsContent value="recommendations" className="mt-4 space-y-4">
                    {/* AI Analysis Button (if not already analyzed) */}
                    {!aiAnalysis && !aiLoading && (
                      <div className="flex items-center justify-center p-4 border border-dashed rounded-lg">
                        <Button 
                          onClick={handleAIAnalysis} 
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <Brain className="h-4 w-4" />
                          AI Stratejik Öneriler Al
                        </Button>
                      </div>
                    )}

                    {/* AI Loading Skeleton */}
                    {aiLoading && (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <Card key={i} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-6 w-6 rounded" />
                                <Skeleton className="h-4 w-1/4" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                              </div>
                              <Skeleton className="h-3 w-full" />
                              <Skeleton className="h-3 w-3/4" />
                              <div className="space-y-1 pt-2">
                                <Skeleton className="h-2 w-full" />
                                <Skeleton className="h-2 w-5/6" />
                                <Skeleton className="h-2 w-4/6" />
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* AI Recommendations */}
                    {!aiLoading && aiAnalysis?.recommendations && aiAnalysis.recommendations.length > 0 && (
                      <div className="space-y-3">
                        {aiAnalysis.recommendations.map((rec, index) => (
                          <AIRecommendationCard key={index} recommendation={rec} />
                        ))}
                      </div>
                    )}

                    {/* Fallback Static Recommendations */}
                    {!aiLoading && !aiAnalysis && recommendations.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs text-muted-foreground mb-2">Temel öneriler (AI analizi için Çıkarımlar sekmesini kullanın)</p>
                        {recommendations.map((rec, index) => (
                          <RecommendationCard key={index} recommendation={rec} />
                        ))}
                      </div>
                    )}

                    {!aiLoading && !aiAnalysis && recommendations.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Yeterli veri olmadığından öneri oluşturulamadı.</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>

          </>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};
