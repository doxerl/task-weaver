import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ArrowLeftRight, 
  AlertTriangle,
  Download,
  Loader2,
  LineChart as LineChartIcon,
  Sparkles,
  Brain,
  Clock,
  CheckCircle2,
  ArrowRight,
  Calendar,
  Rocket,
  ArrowLeft,
  RefreshCw,
  History,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { SimulationScenario, AnalysisHistoryItem } from '@/types/simulation';
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

// Cache info badge component
const CacheInfoBadge = ({ cachedInfo }: { cachedInfo: { id: string; updatedAt: Date } | null }) => {
  if (!cachedInfo) return null;
  
  return (
    <Badge variant="outline" className="gap-1 text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">
      <History className="h-3 w-3" />
      Son analiz: {format(cachedInfo.updatedAt, 'dd MMM HH:mm', { locale: tr })}
    </Badge>
  );
};

// Data changed warning component
const DataChangedWarning = ({ onReanalyze, isLoading }: { onReanalyze: () => void; isLoading: boolean }) => {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3 mb-4">
      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-400">
          Senaryo verileri güncellendi
        </p>
        <p className="text-xs text-muted-foreground">
          Son analizden bu yana veriler değişti. Güncel sonuçlar için yeniden analiz yapmanızı öneririz.
        </p>
      </div>
      <Button 
        size="sm" 
        variant="outline" 
        className="gap-1 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 flex-shrink-0"
        onClick={onReanalyze}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        Yeniden Analiz
      </Button>
    </div>
  );
};

// Analysis history panel component
const AnalysisHistoryPanel = ({ 
  history, 
  isLoading, 
  onSelectHistory,
  analysisType 
}: { 
  history: AnalysisHistoryItem[]; 
  isLoading: boolean;
  onSelectHistory: (item: AnalysisHistoryItem) => void;
  analysisType: 'scenario_comparison' | 'investor_pitch';
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (history.length === 0 && !isLoading) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <History className="h-4 w-4" />
          Analiz Geçmişi ({history.length})
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="mt-2">
          <CardContent className="p-3 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Henüz analiz geçmişi yok
              </p>
            ) : (
              history.map((item, index) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => onSelectHistory(item)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                    <div>
                      <p className="text-sm font-medium">
                        {format(item.createdAt, 'dd MMMM yyyy HH:mm', { locale: tr })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {analysisType === 'scenario_comparison' 
                          ? `${item.insights?.length || 0} çıkarım, ${item.recommendations?.length || 0} öneri`
                          : 'Yatırımcı analizi'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {index === 0 && (
                      <Badge variant="secondary" className="text-xs">Güncel</Badge>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
};

// Historical analysis sheet component
const HistoricalAnalysisSheet = ({
  item,
  isOpen,
  onClose,
  onRestore,
  analysisType
}: {
  item: AnalysisHistoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (item: AnalysisHistoryItem) => void;
  analysisType: 'scenario_comparison' | 'investor_pitch';
}) => {
  if (!item) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[450px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Geçmiş Analiz</SheetTitle>
          <SheetDescription>
            {format(item.createdAt, 'dd MMMM yyyy HH:mm', { locale: tr })}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-200px)] mt-4 pr-4">
          {analysisType === 'scenario_comparison' && item.insights && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 text-sm text-muted-foreground">Çıkarımlar</h4>
                {item.insights.map((insight, i) => (
                  <Card key={i} className="p-3 mb-2">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                  </Card>
                ))}
              </div>
              {item.recommendations && item.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-sm text-muted-foreground">Öneriler</h4>
                  {item.recommendations.map((rec, i) => (
                    <Card key={i} className="p-3 mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          Öncelik {rec.priority}
                        </Badge>
                        <p className="text-sm font-medium">{rec.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{rec.description}</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {analysisType === 'investor_pitch' && item.investorAnalysis && (
            <div className="space-y-4">
              <Card className="p-3">
                <h4 className="text-sm font-medium mb-2">Sermaye Hikayesi</h4>
                <p className="text-xs text-muted-foreground">{item.investorAnalysis.capitalStory}</p>
              </Card>
              <Card className="p-3">
                <h4 className="text-sm font-medium mb-2">Yatırımcı Getirisi</h4>
                <p className="text-xs text-muted-foreground">{item.investorAnalysis.investorROI}</p>
              </Card>
              <Card className="p-3">
                <h4 className="text-sm font-medium mb-2">Çıkış Senaryosu</h4>
                <p className="text-xs text-muted-foreground">{item.investorAnalysis.exitNarrative}</p>
              </Card>
            </div>
          )}
        </ScrollArea>
        <div className="mt-4 pt-4 border-t">
          <Button 
            className="w-full gap-2" 
            onClick={() => {
              onRestore(item);
              onClose();
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Bu Analizi Geri Yükle
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

function ScenarioComparisonContent() {
  const { scenarios, isLoading: scenariosLoading, currentScenarioId } = useScenarios();
  const [scenarioAId, setScenarioAId] = useState<string | null>(currentScenarioId);
  const [scenarioBId, setScenarioBId] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  
  // Sheet state for historical analysis
  const [selectedHistoricalAnalysis, setSelectedHistoricalAnalysis] = useState<AnalysisHistoryItem | null>(null);
  const [historySheetType, setHistorySheetType] = useState<'scenario_comparison' | 'investor_pitch'>('scenario_comparison');

  const { generatePdfFromElement, isGenerating } = usePdfEngine();
  const { 
    analysis: aiAnalysis, 
    isLoading: aiLoading, 
    isCacheLoading: aiCacheLoading,
    cachedInfo: aiCachedInfo,
    dataChanged: aiDataChanged,
    analysisHistory: aiAnalysisHistory,
    isHistoryLoading: aiHistoryLoading,
    analyzeScenarios, 
    loadCachedAnalysis,
    loadAnalysisHistory: loadAIAnalysisHistory,
    checkDataChanges: checkAIDataChanges,
    restoreHistoricalAnalysis: restoreAIHistoricalAnalysis,
    clearAnalysis 
  } = useScenarioAIAnalysis();
  
  const { 
    dealConfig, 
    updateDealConfig, 
    investorAnalysis, 
    isLoading: investorLoading, 
    isCacheLoading: investorCacheLoading,
    cachedInfo: investorCachedInfo,
    dataChanged: investorDataChanged,
    analysisHistory: investorAnalysisHistory,
    isHistoryLoading: investorHistoryLoading,
    analyzeForInvestors,
    loadCachedInvestorAnalysis,
    loadAnalysisHistory: loadInvestorAnalysisHistory,
    checkDataChanges: checkInvestorDataChanges,
    restoreHistoricalAnalysis: restoreInvestorHistoricalAnalysis,
    clearAnalysis: clearInvestorAnalysis
  } = useInvestorAnalysis();

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

  // Load cached analyses and history when scenarios change
  useEffect(() => {
    if (scenarioAId && scenarioBId && scenarioAId !== scenarioBId) {
      // Load cached analyses
      loadCachedAnalysis(scenarioAId, scenarioBId);
      loadCachedInvestorAnalysis(scenarioAId, scenarioBId);
      
      // Load history
      loadAIAnalysisHistory(scenarioAId, scenarioBId);
      loadInvestorAnalysisHistory(scenarioAId, scenarioBId);
    } else {
      // Clear if no valid comparison
      clearAnalysis();
      clearInvestorAnalysis();
    }
  }, [scenarioAId, scenarioBId, loadCachedAnalysis, loadCachedInvestorAnalysis, loadAIAnalysisHistory, loadInvestorAnalysisHistory, clearAnalysis, clearInvestorAnalysis]);

  // Check for data changes when scenarios are loaded and we have cached info
  useEffect(() => {
    if (scenarioA && scenarioB && aiCachedInfo) {
      checkAIDataChanges(scenarioA, scenarioB);
    }
    if (scenarioA && scenarioB && investorCachedInfo) {
      checkInvestorDataChanges(scenarioA, scenarioB);
    }
  }, [scenarioA, scenarioB, aiCachedInfo, investorCachedInfo, checkAIDataChanges, checkInvestorDataChanges]);

  const handleAIAnalysis = async () => {
    if (!scenarioA || !scenarioB || !summaryA || !summaryB) return;
    const quarterlyA = { q1: quarterlyComparison[0]?.scenarioANet || 0, q2: quarterlyComparison[1]?.scenarioANet || 0, q3: quarterlyComparison[2]?.scenarioANet || 0, q4: quarterlyComparison[3]?.scenarioANet || 0 };
    const quarterlyB = { q1: quarterlyComparison[0]?.scenarioBNet || 0, q2: quarterlyComparison[1]?.scenarioBNet || 0, q3: quarterlyComparison[2]?.scenarioBNet || 0, q4: quarterlyComparison[3]?.scenarioBNet || 0 };
    await analyzeScenarios(scenarioA, scenarioB, { totalRevenue: summaryA.totalRevenue, totalExpenses: summaryA.totalExpense, netProfit: summaryA.netProfit, profitMargin: summaryA.profitMargin }, { totalRevenue: summaryB.totalRevenue, totalExpenses: summaryB.totalExpense, netProfit: summaryB.netProfit, profitMargin: summaryB.profitMargin }, quarterlyA, quarterlyB);
  };

  const handleInvestorAnalysis = async () => {
    if (!scenarioA || !scenarioB || !summaryA || !summaryB) return;
    const quarterlyA = { q1: quarterlyComparison[0]?.scenarioANet || 0, q2: quarterlyComparison[1]?.scenarioANet || 0, q3: quarterlyComparison[2]?.scenarioANet || 0, q4: quarterlyComparison[3]?.scenarioANet || 0 };
    const quarterlyB = { q1: quarterlyComparison[0]?.scenarioBNet || 0, q2: quarterlyComparison[1]?.scenarioBNet || 0, q3: quarterlyComparison[2]?.scenarioBNet || 0, q4: quarterlyComparison[3]?.scenarioBNet || 0 };
    await analyzeForInvestors(scenarioA, scenarioB, { totalRevenue: summaryA.totalRevenue, totalExpenses: summaryA.totalExpense, netProfit: summaryA.netProfit, profitMargin: summaryA.profitMargin }, { totalRevenue: summaryB.totalRevenue, totalExpenses: summaryB.totalExpense, netProfit: summaryB.netProfit, profitMargin: summaryB.profitMargin }, quarterlyA, quarterlyB);
  };

  const handleSelectAIHistory = (item: AnalysisHistoryItem) => {
    setSelectedHistoricalAnalysis(item);
    setHistorySheetType('scenario_comparison');
  };

  const handleSelectInvestorHistory = (item: AnalysisHistoryItem) => {
    setSelectedHistoricalAnalysis(item);
    setHistorySheetType('investor_pitch');
  };

  const handleRestoreHistory = (item: AnalysisHistoryItem) => {
    if (historySheetType === 'scenario_comparison') {
      restoreAIHistoricalAnalysis(item);
    } else {
      restoreInvestorHistoricalAnalysis(item);
    }
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
              {investorCacheLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Önceki analiz yükleniyor...</span>
                </div>
              ) : (
                <>
                  {/* Data changed warning */}
                  {investorDataChanged && investorCachedInfo && (
                    <DataChangedWarning onReanalyze={handleInvestorAnalysis} isLoading={investorLoading} />
                  )}
                  
                  {investorCachedInfo && (
                    <div className="mb-4">
                      <CacheInfoBadge cachedInfo={investorCachedInfo} />
                    </div>
                  )}
                  
                  {/* Analysis history */}
                  <AnalysisHistoryPanel 
                    history={investorAnalysisHistory}
                    isLoading={investorHistoryLoading}
                    onSelectHistory={handleSelectInvestorHistory}
                    analysisType="investor_pitch"
                  />
                  
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
                    onAnalyze={handleInvestorAnalysis}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="insights" className="mt-4 space-y-4">
              {/* Data changed warning */}
              {aiDataChanged && aiCachedInfo && (
                <DataChangedWarning onReanalyze={handleAIAnalysis} isLoading={aiLoading} />
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {aiCacheLoading ? (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Önceki analiz yükleniyor...
                    </span>
                  ) : aiAnalysis ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-sm text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        AI analizi tamamlandı
                      </span>
                      <CacheInfoBadge cachedInfo={aiCachedInfo} />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">AI ile derin analiz yapın</span>
                  )}
                </div>
                <Button 
                  onClick={handleAIAnalysis} 
                  disabled={aiLoading || aiCacheLoading} 
                  variant={aiAnalysis ? "outline" : "default"} 
                  size="sm" 
                  className="gap-2"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analiz ediliyor...
                    </>
                  ) : aiAnalysis ? (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Yeniden Analiz Et
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      AI ile Analiz Et
                    </>
                  )}
                </Button>
              </div>
              
              {/* Analysis history */}
              <AnalysisHistoryPanel 
                history={aiAnalysisHistory}
                isLoading={aiHistoryLoading}
                onSelectHistory={handleSelectAIHistory}
                analysisType="scenario_comparison"
              />
              
              {(aiLoading || aiCacheLoading) && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-4">
                      <Skeleton className="h-16 w-full" />
                    </Card>
                  ))}
                </div>
              )}
              
              {!aiLoading && !aiCacheLoading && aiAnalysis?.insights?.map((insight, i) => (
                <Card key={i} className="p-4">
                  <h4 className="font-medium">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                </Card>
              ))}
              
              {!aiLoading && !aiCacheLoading && !aiAnalysis && (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Henüz AI analizi yapılmadı</p>
                  <p className="text-sm mt-1">Yukarıdaki butona tıklayarak analiz başlatın</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
      
      {/* Historical Analysis Sheet */}
      <HistoricalAnalysisSheet
        item={selectedHistoricalAnalysis}
        isOpen={!!selectedHistoricalAnalysis}
        onClose={() => setSelectedHistoricalAnalysis(null)}
        onRestore={handleRestoreHistory}
        analysisType={historySheetType}
      />
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
