import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Calendar,
  Rocket,
  ArrowLeft
} from 'lucide-react';
import { SimulationScenario, AIScenarioInsight, AIRecommendation, DEFAULT_DEAL_CONFIG } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';
import { toast } from 'sonner';
import { usePdfEngine } from '@/hooks/finance/usePdfEngine';
import { useScenarioAIAnalysis } from '@/hooks/finance/useScenarioAIAnalysis';
import { useInvestorAnalysis } from '@/hooks/finance/useInvestorAnalysis';
import { useScenarios } from '@/hooks/finance/useScenarios';
import { InvestmentTab } from '@/components/simulation/InvestmentTab';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
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
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';

// Helper functions
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

const calculateScenarioSummary = (scenario: SimulationScenario) => {
  const totalRevenue = scenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
  const totalExpense = scenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
  const totalInvestment = scenario.investments.reduce((sum, i) => sum + i.amount, 0);
  const netProfit = totalRevenue - totalExpense;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const capitalNeed = Math.max(0, totalInvestment - netProfit);
  return { totalRevenue, totalExpense, totalInvestment, netProfit, profitMargin, capitalNeed };
};

const calculateQuarterlyComparison = (scenarioA: SimulationScenario, scenarioB: SimulationScenario) => {
  const quarters: ('q1' | 'q2' | 'q3' | 'q4')[] = ['q1', 'q2', 'q3', 'q4'];
  return quarters.map(q => {
    const aRevenue = scenarioA.revenues.reduce((sum, r) => sum + (r.projectedQuarterly?.[q] || r.projectedAmount / 4), 0);
    const aExpense = scenarioA.expenses.reduce((sum, e) => sum + (e.projectedQuarterly?.[q] || e.projectedAmount / 4), 0);
    const bRevenue = scenarioB.revenues.reduce((sum, r) => sum + (r.projectedQuarterly?.[q] || r.projectedAmount / 4), 0);
    const bExpense = scenarioB.expenses.reduce((sum, e) => sum + (e.projectedQuarterly?.[q] || e.projectedAmount / 4), 0);
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

const DiffBadge = ({ diff, format, higherIsBetter }: { diff: { value: number; percent: number }; format: 'currency' | 'percent' | 'number'; higherIsBetter: boolean }) => {
  const isPositive = diff.value > 0;
  const isNeutral = diff.value === 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;
  if (isNeutral) return <Badge variant="secondary" className="gap-1"><Minus className="h-3 w-3" />-</Badge>;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isGood ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30';
  return (
    <Badge variant="outline" className={`gap-1 ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {isPositive ? '+' : ''}{format === 'percent' ? `${diff.value.toFixed(1)}pp` : `${diff.percent.toFixed(1)}%`}
    </Badge>
  );
};

function ScenarioComparisonContent() {
  const { scenarios, isLoading: scenariosLoading, currentScenarioId } = useScenarios();
  const [scenarioAId, setScenarioAId] = useState<string | null>(currentScenarioId);
  const [scenarioBId, setScenarioBId] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const { generatePdfFromElement, isGenerating } = usePdfEngine();
  const { analysis: aiAnalysis, isLoading: aiLoading, analyzeScenarios, clearAnalysis } = useScenarioAIAnalysis();
  const { dealConfig, updateDealConfig, investorAnalysis, isLoading: investorLoading, analyzeForInvestors } = useInvestorAnalysis();

  const scenarioA = useMemo(() => scenarios.find(s => s.id === scenarioAId), [scenarios, scenarioAId]);
  const scenarioB = useMemo(() => scenarios.find(s => s.id === scenarioBId), [scenarios, scenarioBId]);
  const summaryA = useMemo(() => scenarioA ? calculateScenarioSummary(scenarioA) : null, [scenarioA]);
  const summaryB = useMemo(() => scenarioB ? calculateScenarioSummary(scenarioB) : null, [scenarioB]);

  const metrics = useMemo(() => {
    if (!summaryA || !summaryB) return [];
    return [
      { label: 'Toplam Gelir', scenarioA: summaryA.totalRevenue, scenarioB: summaryB.totalRevenue, format: 'currency' as const, higherIsBetter: true },
      { label: 'Toplam Gider', scenarioA: summaryA.totalExpense, scenarioB: summaryB.totalExpense, format: 'currency' as const, higherIsBetter: false },
      { label: 'Net Kâr', scenarioA: summaryA.netProfit, scenarioB: summaryB.netProfit, format: 'currency' as const, higherIsBetter: true },
      { label: 'Kâr Marjı', scenarioA: summaryA.profitMargin, scenarioB: summaryB.profitMargin, format: 'percent' as const, higherIsBetter: true },
    ];
  }, [summaryA, summaryB]);

  const quarterlyComparison = useMemo(() => {
    if (!scenarioA || !scenarioB) return [];
    return calculateQuarterlyComparison(scenarioA, scenarioB);
  }, [scenarioA, scenarioB]);

  const quarterlyCumulativeData = useMemo(() => {
    let cumulativeA = 0, cumulativeB = 0;
    return quarterlyComparison.map(q => {
      cumulativeA += q.scenarioANet;
      cumulativeB += q.scenarioBNet;
      return { ...q, scenarioACumulative: cumulativeA, scenarioBCumulative: cumulativeB };
    });
  }, [quarterlyComparison]);

  const canCompare = scenarioA && scenarioB && scenarioAId !== scenarioBId;

  useEffect(() => { clearAnalysis(); }, [scenarioAId, scenarioBId, clearAnalysis]);

  const handleAIAnalysis = async () => {
    if (!scenarioA || !scenarioB || !summaryA || !summaryB) return;
    const quarterlyA = { q1: quarterlyComparison[0]?.scenarioANet || 0, q2: quarterlyComparison[1]?.scenarioANet || 0, q3: quarterlyComparison[2]?.scenarioANet || 0, q4: quarterlyComparison[3]?.scenarioANet || 0 };
    const quarterlyB = { q1: quarterlyComparison[0]?.scenarioBNet || 0, q2: quarterlyComparison[1]?.scenarioBNet || 0, q3: quarterlyComparison[2]?.scenarioBNet || 0, q4: quarterlyComparison[3]?.scenarioBNet || 0 };
    await analyzeScenarios(scenarioA, scenarioB, { totalRevenue: summaryA.totalRevenue, totalExpenses: summaryA.totalExpense, netProfit: summaryA.netProfit, profitMargin: summaryA.profitMargin }, { totalRevenue: summaryB.totalRevenue, totalExpenses: summaryB.totalExpense, netProfit: summaryB.netProfit, profitMargin: summaryB.profitMargin }, quarterlyA, quarterlyB);
  };

  const chartConfig: ChartConfig = {
    scenarioANet: { label: `${scenarioA?.name || 'A'} Net`, color: '#2563eb' },
    scenarioBNet: { label: `${scenarioB?.name || 'B'} Net`, color: '#16a34a' },
  };

  if (scenariosLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/finance/simulation">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Simülasyona Dön
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">Senaryo Karşılaştırma</h1>
              </div>
            </div>
            {canCompare && (
              <Button variant="outline" size="sm" disabled={isGenerating} className="gap-2">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                PDF
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Senaryo A</label>
                <Select value={scenarioAId || ''} onValueChange={setScenarioAId}>
                  <SelectTrigger><SelectValue placeholder="Senaryo seçin..." /></SelectTrigger>
                  <SelectContent>
                    {scenarios.map((s) => <SelectItem key={s.id} value={s.id!} disabled={s.id === scenarioBId}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Senaryo B</label>
                <Select value={scenarioBId || ''} onValueChange={setScenarioBId}>
                  <SelectTrigger><SelectValue placeholder="Senaryo seçin..." /></SelectTrigger>
                  <SelectContent>
                    {scenarios.map((s) => <SelectItem key={s.id} value={s.id!} disabled={s.id === scenarioAId}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {!canCompare ? (
          <div className="text-center py-16 text-muted-foreground">
            {scenarios.length < 2 ? <p>Karşılaştırma için en az 2 kayıtlı senaryo gerekli.</p> : <p>Karşılaştırmak için iki farklı senaryo seçin.</p>}
          </div>
        ) : (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="summary">Özet</TabsTrigger>
              <TabsTrigger value="trend"><LineChartIcon className="h-4 w-4 mr-1" />Trend</TabsTrigger>
              <TabsTrigger value="quarterly"><Calendar className="h-4 w-4 mr-1" />Çeyreklik</TabsTrigger>
              <TabsTrigger value="investment" className="text-amber-400"><Rocket className="h-4 w-4 mr-1" />Yatırım</TabsTrigger>
              <TabsTrigger value="insights"><Sparkles className="h-4 w-4 mr-1" />AI Analiz</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metrik</TableHead>
                    <TableHead className="text-right">{scenarioA?.name}</TableHead>
                    <TableHead className="text-right">{scenarioB?.name}</TableHead>
                    <TableHead className="text-right">Fark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((m) => {
                    const diff = calculateDiff(m.scenarioA, m.scenarioB);
                    return (
                      <TableRow key={m.label}>
                        <TableCell className="font-medium">{m.label}</TableCell>
                        <TableCell className="text-right font-mono">{formatValue(m.scenarioA, m.format)}</TableCell>
                        <TableCell className="text-right font-mono">{formatValue(m.scenarioB, m.format)}</TableCell>
                        <TableCell className="text-right"><DiffBadge diff={diff} format={m.format} higherIsBetter={m.higherIsBetter} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="trend" className="mt-4">
              <Card ref={chartContainerRef}>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Çeyreklik Net Kâr Karşılaştırması</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px] w-full">
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

            <TabsContent value="quarterly" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Kümülatif Nakit Akışı</CardTitle></CardHeader>
                <CardContent>
                  <ChartContainer config={{ scenarioACumulative: { label: `${scenarioA?.name} Kümülatif`, color: '#2563eb' }, scenarioBCumulative: { label: `${scenarioB?.name} Kümülatif`, color: '#16a34a' } }} className="h-[250px] w-full">
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
            </TabsContent>

            <TabsContent value="investment" className="mt-4">
              <InvestmentTab
                scenarioA={scenarioA}
                scenarioB={scenarioB}
                summaryA={{ totalRevenue: summaryA!.totalRevenue, totalExpenses: summaryA!.totalExpense, netProfit: summaryA!.netProfit, profitMargin: summaryA!.profitMargin }}
                summaryB={{ totalRevenue: summaryB!.totalRevenue, totalExpenses: summaryB!.totalExpense, netProfit: summaryB!.netProfit, profitMargin: summaryB!.profitMargin }}
                quarterlyA={{ q1: quarterlyComparison[0]?.scenarioANet || 0, q2: quarterlyComparison[1]?.scenarioANet || 0, q3: quarterlyComparison[2]?.scenarioANet || 0, q4: quarterlyComparison[3]?.scenarioANet || 0 }}
                quarterlyB={{ q1: quarterlyComparison[0]?.scenarioBNet || 0, q2: quarterlyComparison[1]?.scenarioBNet || 0, q3: quarterlyComparison[2]?.scenarioBNet || 0, q4: quarterlyComparison[3]?.scenarioBNet || 0 }}
                dealConfig={dealConfig}
                onDealConfigChange={updateDealConfig}
                investorAnalysis={investorAnalysis}
                isLoading={investorLoading}
                onAnalyze={() => analyzeForInvestors(scenarioA, scenarioB, { totalRevenue: summaryA!.totalRevenue, totalExpenses: summaryA!.totalExpense, netProfit: summaryA!.netProfit, profitMargin: summaryA!.profitMargin }, { totalRevenue: summaryB!.totalRevenue, totalExpenses: summaryB!.totalExpense, netProfit: summaryB!.netProfit, profitMargin: summaryB!.profitMargin }, { q1: quarterlyComparison[0]?.scenarioANet || 0, q2: quarterlyComparison[1]?.scenarioANet || 0, q3: quarterlyComparison[2]?.scenarioANet || 0, q4: quarterlyComparison[3]?.scenarioANet || 0 }, { q1: quarterlyComparison[0]?.scenarioBNet || 0, q2: quarterlyComparison[1]?.scenarioBNet || 0, q3: quarterlyComparison[2]?.scenarioBNet || 0, q4: quarterlyComparison[3]?.scenarioBNet || 0 })}
              />
            </TabsContent>

            <TabsContent value="insights" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {aiAnalysis ? <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-4 w-4" />AI analizi tamamlandı</span> : <span>AI ile derin analiz yapın</span>}
                </div>
                <Button onClick={handleAIAnalysis} disabled={aiLoading} variant={aiAnalysis ? "outline" : "default"} size="sm" className="gap-2">
                  {aiLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Analiz ediliyor...</> : <><Sparkles className="h-4 w-4" />{aiAnalysis ? 'Yeniden Analiz Et' : 'AI ile Analiz Et'}</>}
                </Button>
              </div>
              {aiLoading && <div className="space-y-3">{[1, 2, 3].map((i) => <Card key={i} className="p-4"><Skeleton className="h-16 w-full" /></Card>)}</div>}
              {!aiLoading && aiAnalysis?.insights?.map((insight, i) => (
                <Card key={i} className="p-4">
                  <h4 className="font-medium">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

export default function ScenarioComparisonPage() {
  return (
    <CurrencyProvider defaultYear={2025}>
      <ScenarioComparisonContent />
    </CurrencyProvider>
  );
}
