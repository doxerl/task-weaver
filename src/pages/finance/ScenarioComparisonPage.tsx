import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  Sparkles,
  Brain,
  Clock,
  CheckCircle2,
  ArrowRight,
  Rocket,
  ArrowLeft,
  RefreshCw,
  History,
  ChevronDown,
  RotateCcw,
  Presentation,
} from 'lucide-react';
import { SimulationScenario, AnalysisHistoryItem, NextYearProjection, QuarterlyItemizedData } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';
import { toast } from 'sonner';
import { usePdfEngine, ScenarioPresentationPdfData } from '@/hooks/finance/usePdfEngine';
import { useUnifiedAnalysis } from '@/hooks/finance/useUnifiedAnalysis';
import { useInvestorAnalysis, calculateCapitalNeeds, calculateExitPlan } from '@/hooks/finance/useInvestorAnalysis';
import { useScenarios } from '@/hooks/finance/useScenarios';
import { InvestmentTab } from '@/components/simulation/InvestmentTab';
import { PitchDeckView } from '@/components/simulation/PitchDeckView';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { useExchangeRates } from '@/hooks/finance/useExchangeRates';
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { scenarios, isLoading: scenariosLoading, currentScenarioId, saveScenario, createNextYearFromAI } = useScenarios();
  
  // URL State: Senaryo ID'lerini URL'den al veya varsayılan kullan
  const urlScenarioA = searchParams.get('a');
  const urlScenarioB = searchParams.get('b');
  
  const [scenarioAId, setScenarioAIdState] = useState<string | null>(urlScenarioA || currentScenarioId);
  const [scenarioBId, setScenarioBIdState] = useState<string | null>(urlScenarioB);
  
  // URL State Sync: Senaryo değiştiğinde URL'i güncelle
  const setScenarioAId = useCallback((id: string | null) => {
    setScenarioAIdState(id);
    if (id) {
      setSearchParams(prev => {
        prev.set('a', id);
        return prev;
      }, { replace: true });
    }
  }, [setSearchParams]);
  
  const setScenarioBId = useCallback((id: string | null) => {
    setScenarioBIdState(id);
    if (id) {
      setSearchParams(prev => {
        prev.set('b', id);
        return prev;
      }, { replace: true });
    }
  }, [setSearchParams]);
  
  // URL'den gelen değerleri senkronize et
  useEffect(() => {
    if (urlScenarioA && urlScenarioA !== scenarioAId) {
      setScenarioAIdState(urlScenarioA);
    }
    if (urlScenarioB && urlScenarioB !== scenarioBId) {
      setScenarioBIdState(urlScenarioB);
    }
  }, [urlScenarioA, urlScenarioB]);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const quarterlyChartRef = useRef<HTMLDivElement>(null);
  const cumulativeChartRef = useRef<HTMLDivElement>(null);
  
  // Sheet states
  const [selectedHistoricalAnalysis, setSelectedHistoricalAnalysis] = useState<AnalysisHistoryItem | null>(null);
  const [historySheetType, setHistorySheetType] = useState<'scenario_comparison' | 'investor_pitch'>('scenario_comparison');
  const [showPitchDeck, setShowPitchDeck] = useState(false);

  const { generatePdfFromElement, generateScenarioPresentationPdf, isGenerating } = usePdfEngine();
  
  // Unified Analysis Hook - TEK AI hook, tüm fonksiyonlar burada
  const { 
    analysis: unifiedAnalysis, 
    isLoading: unifiedLoading, 
    isCacheLoading: unifiedCacheLoading,
    cachedInfo: unifiedCachedInfo,
    dataChanged: unifiedDataChanged,
    analysisHistory: unifiedAnalysisHistory,
    isHistoryLoading: unifiedHistoryLoading,
    runUnifiedAnalysis,
    fetchHistoricalBalance,
    loadCachedAnalysis: loadCachedUnifiedAnalysis,
    loadAnalysisHistory: loadUnifiedAnalysisHistory,
    checkDataChanges: checkUnifiedDataChanges,
    restoreHistoricalAnalysis: restoreUnifiedHistoricalAnalysis,
    clearAnalysis: clearUnifiedAnalysis
  } = useUnifiedAnalysis();
  
  // Investor Analysis Hook - sadece dealConfig için
  const { 
    dealConfig, 
    updateDealConfig
  } = useInvestorAnalysis();

  const scenarioA = useMemo(() => scenarios.find(s => s.id === scenarioAId), [scenarios, scenarioAId]);
  const scenarioB = useMemo(() => scenarios.find(s => s.id === scenarioBId), [scenarios, scenarioBId]);
  
  // Exchange rates hook for TL to USD conversion (after scenarioB is defined)
  const { yearlyAverageRate } = useExchangeRates(scenarioB?.targetYear || new Date().getFullYear());
  
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

  // Quarterly itemized data for AI analysis
  const quarterlyItemized = useMemo((): QuarterlyItemizedData | null => {
    if (!scenarioA || !scenarioB) return null;
    
    const quarters: ('q1' | 'q2' | 'q3' | 'q4')[] = ['q1', 'q2', 'q3', 'q4'];
    
    // Scenario A revenues by quarter
    const aRevenuesByQuarter = scenarioA.revenues.map(r => ({
      category: r.category,
      q1: r.projectedQuarterly?.q1 || r.projectedAmount / 4,
      q2: r.projectedQuarterly?.q2 || r.projectedAmount / 4,
      q3: r.projectedQuarterly?.q3 || r.projectedAmount / 4,
      q4: r.projectedQuarterly?.q4 || r.projectedAmount / 4,
      total: r.projectedAmount
    }));
    
    // Scenario A expenses by quarter
    const aExpensesByQuarter = scenarioA.expenses.map(e => ({
      category: e.category,
      q1: e.projectedQuarterly?.q1 || e.projectedAmount / 4,
      q2: e.projectedQuarterly?.q2 || e.projectedAmount / 4,
      q3: e.projectedQuarterly?.q3 || e.projectedAmount / 4,
      q4: e.projectedQuarterly?.q4 || e.projectedAmount / 4,
      total: e.projectedAmount
    }));
    
    // Scenario B revenues by quarter
    const bRevenuesByQuarter = scenarioB.revenues.map(r => ({
      category: r.category,
      q1: r.projectedQuarterly?.q1 || r.projectedAmount / 4,
      q2: r.projectedQuarterly?.q2 || r.projectedAmount / 4,
      q3: r.projectedQuarterly?.q3 || r.projectedAmount / 4,
      q4: r.projectedQuarterly?.q4 || r.projectedAmount / 4,
      total: r.projectedAmount
    }));
    
    // Scenario B expenses by quarter
    const bExpensesByQuarter = scenarioB.expenses.map(e => ({
      category: e.category,
      q1: e.projectedQuarterly?.q1 || e.projectedAmount / 4,
      q2: e.projectedQuarterly?.q2 || e.projectedAmount / 4,
      q3: e.projectedQuarterly?.q3 || e.projectedAmount / 4,
      q4: e.projectedQuarterly?.q4 || e.projectedAmount / 4,
      total: e.projectedAmount
    }));
    
    // Calculate revenue differences between scenarios
    const revenueDiffs = bRevenuesByQuarter.map(b => {
      const a = aRevenuesByQuarter.find(ar => ar.category === b.category);
      return {
        category: b.category,
        diffQ1: b.q1 - (a?.q1 || 0),
        diffQ2: b.q2 - (a?.q2 || 0),
        diffQ3: b.q3 - (a?.q3 || 0),
        diffQ4: b.q4 - (a?.q4 || 0),
        totalDiff: b.total - (a?.total || 0),
        percentChange: a?.total ? ((b.total - a.total) / a.total * 100) : 100
      };
    });
    
    // Calculate expense differences between scenarios
    const expenseDiffs = bExpensesByQuarter.map(b => {
      const a = aExpensesByQuarter.find(ae => ae.category === b.category);
      return {
        category: b.category,
        diffQ1: b.q1 - (a?.q1 || 0),
        diffQ2: b.q2 - (a?.q2 || 0),
        diffQ3: b.q3 - (a?.q3 || 0),
        diffQ4: b.q4 - (a?.q4 || 0),
        totalDiff: b.total - (a?.total || 0),
        percentChange: a?.total ? ((b.total - a.total) / a.total * 100) : 100
      };
    });
    
    return {
      scenarioA: { revenues: aRevenuesByQuarter, expenses: aExpensesByQuarter },
      scenarioB: { revenues: bRevenuesByQuarter, expenses: bExpensesByQuarter },
      diffs: { revenues: revenueDiffs, expenses: expenseDiffs }
    };
  }, [scenarioA, scenarioB]);

  const canCompare = scenarioA && scenarioB && scenarioAId !== scenarioBId;

  // Load cached unified analysis when scenarios change
  useEffect(() => {
    if (scenarioAId && scenarioBId && scenarioAId !== scenarioBId) {
      loadCachedUnifiedAnalysis(scenarioAId, scenarioBId);
      loadUnifiedAnalysisHistory(scenarioAId, scenarioBId);
    } else {
      clearUnifiedAnalysis();
    }
  }, [scenarioAId, scenarioBId, loadCachedUnifiedAnalysis, loadUnifiedAnalysisHistory, clearUnifiedAnalysis]);

  // Check for data changes when scenarios are loaded
  useEffect(() => {
    if (scenarioA && scenarioB && unifiedCachedInfo) {
      checkUnifiedDataChanges(scenarioA, scenarioB);
    }
  }, [scenarioA, scenarioB, unifiedCachedInfo, checkUnifiedDataChanges]);

  // Unified AI Analysis Handler - TEK BUTON, TÜM GÜÇ
  const handleUnifiedAnalysis = async () => {
    if (!scenarioA || !scenarioB || !summaryA || !summaryB) return;
    
    // Get average exchange rate for TL to USD conversion (fallback to 39 if not available)
    const averageRate = yearlyAverageRate || 39;
    
    // Fetch historical balance for target year (converted to USD)
    const historicalBalance = scenarioB.targetYear 
      ? await fetchHistoricalBalance(scenarioB.targetYear, averageRate) 
      : null;
    
    const quarterlyA = { 
      q1: quarterlyComparison[0]?.scenarioANet || 0, 
      q2: quarterlyComparison[1]?.scenarioANet || 0, 
      q3: quarterlyComparison[2]?.scenarioANet || 0, 
      q4: quarterlyComparison[3]?.scenarioANet || 0 
    };
    const quarterlyB = { 
      q1: quarterlyComparison[0]?.scenarioBNet || 0, 
      q2: quarterlyComparison[1]?.scenarioBNet || 0, 
      q3: quarterlyComparison[2]?.scenarioBNet || 0, 
      q4: quarterlyComparison[3]?.scenarioBNet || 0 
    };
    
    // Calculate capital needs and exit plan
    const capitalNeeds = calculateCapitalNeeds(quarterlyB);
    const growthRate = summaryA.totalRevenue > 0 
      ? (summaryB.totalRevenue - summaryA.totalRevenue) / summaryA.totalRevenue 
      : 0.15;
    const exitPlan = calculateExitPlan(dealConfig, summaryB.totalRevenue, summaryB.totalExpense, growthRate);
    
    await runUnifiedAnalysis(
      scenarioA,
      scenarioB,
      { totalRevenue: summaryA.totalRevenue, totalExpenses: summaryA.totalExpense, netProfit: summaryA.netProfit, profitMargin: summaryA.profitMargin },
      { totalRevenue: summaryB.totalRevenue, totalExpenses: summaryB.totalExpense, netProfit: summaryB.netProfit, profitMargin: summaryB.profitMargin },
      quarterlyA,
      quarterlyB,
      dealConfig,
      exitPlan,
      capitalNeeds,
      historicalBalance,
      quarterlyItemized,
      averageRate
    );
  };

  // Create next year scenario from AI projection
  // PDF Presentation Handler
  const handleExportPresentationPdf = useCallback(async () => {
    if (!scenarioA || !scenarioB || !summaryA || !summaryB) {
      toast.error('Karşılaştırma için senaryo seçilmeli');
      return;
    }
    
    // Quarterly net profit data for capital needs
    const quarterlyNetA = {
      q1: quarterlyComparison[0]?.scenarioANet || 0,
      q2: quarterlyComparison[1]?.scenarioANet || 0,
      q3: quarterlyComparison[2]?.scenarioANet || 0,
      q4: quarterlyComparison[3]?.scenarioANet || 0,
    };
    const quarterlyNetB = {
      q1: quarterlyComparison[0]?.scenarioBNet || 0,
      q2: quarterlyComparison[1]?.scenarioBNet || 0,
      q3: quarterlyComparison[2]?.scenarioBNet || 0,
      q4: quarterlyComparison[3]?.scenarioBNet || 0,
    };
    
    const capitalA = calculateCapitalNeeds(quarterlyNetA);
    const capitalB = calculateCapitalNeeds(quarterlyNetB);
    
    // Exit plan calculation
    const exitPlanResult = calculateExitPlan(
      dealConfig,
      summaryB.totalRevenue,
      summaryB.totalExpense,
      0.15 // Default growth rate
    );
    
    const pdfData: ScenarioPresentationPdfData = {
      scenarioA: {
        id: scenarioA.id!,
        name: scenarioA.name,
        targetYear: scenarioA.targetYear,
        summary: {
          revenue: summaryA.totalRevenue,
          expense: summaryA.totalExpense,
          profit: summaryA.netProfit,
          margin: summaryA.profitMargin,
        },
      },
      scenarioB: {
        id: scenarioB.id!,
        name: scenarioB.name,
        targetYear: scenarioB.targetYear,
        summary: {
          revenue: summaryB.totalRevenue,
          expense: summaryB.totalExpense,
          profit: summaryB.netProfit,
          margin: summaryB.profitMargin,
        },
      },
      metrics: metrics.map(m => ({
        label: m.label,
        scenarioA: m.scenarioA,
        scenarioB: m.scenarioB,
        format: m.format,
        higherIsBetter: m.higherIsBetter,
        diffPercent: calculateDiff(m.scenarioA, m.scenarioB).percent,
        isPositive: m.higherIsBetter 
          ? m.scenarioB > m.scenarioA 
          : m.scenarioB < m.scenarioA,
      })),
      quarterlyData: quarterlyCumulativeData.map(q => ({
        quarter: q.quarter,
        scenarioANet: q.scenarioANet,
        scenarioBNet: q.scenarioBNet,
        scenarioACumulative: q.scenarioACumulative,
        scenarioBCumulative: q.scenarioBCumulative,
      })),
      capitalAnalysis: {
        scenarioANeed: capitalA.requiredInvestment,
        scenarioASelfSustaining: capitalA.selfSustaining,
        scenarioBNeed: capitalB.requiredInvestment,
        scenarioBSelfSustaining: capitalB.selfSustaining,
        burnRate: capitalB.burnRateMonthly,
        runway: capitalB.runwayMonths,
        criticalQuarter: capitalB.criticalQuarter,
        opportunityCost: summaryB.netProfit - summaryA.netProfit,
      },
      dealConfig: dealConfig,
      exitPlan: {
        postMoneyValuation: exitPlanResult.postMoneyValuation,
        exitValue: exitPlanResult.year5Projection?.companyValuation || 0,
        investorReturn: exitPlanResult.moic5Year || 0,
        founderRetention: 100 - dealConfig.equityPercentage,
      },
      insights: unifiedAnalysis?.insights?.map(i => ({
        category: i.category || 'Genel',
        severity: i.severity || 'medium',
        title: i.title || '',
        description: i.description || '',
      })) || [],
      recommendations: unifiedAnalysis?.recommendations?.map(r => ({
        title: r.title || '',
        description: r.description || '',
        risk: r.expected_outcome || 'Orta',
        priority: r.priority || 1,
      })) || [],
      pitchDeck: unifiedAnalysis?.pitch_deck ? {
        executiveSummary: unifiedAnalysis.pitch_deck.executive_summary || '',
        slides: unifiedAnalysis.pitch_deck.slides?.map(s => ({
          slideNumber: s.slide_number,
          title: s.title || '',
          bullets: s.content_bullets || [],
        })) || [],
      } : undefined,
      chartElements: {
        quarterlyChart: quarterlyChartRef.current,
        cumulativeChart: cumulativeChartRef.current,
      },
    };
    
    const success = await generateScenarioPresentationPdf(pdfData);
    
    if (success) {
      toast.success('PDF sunumu oluşturuldu!');
    } else {
      toast.error('PDF oluşturulamadı');
    }
  }, [scenarioA, scenarioB, summaryA, summaryB, metrics, quarterlyComparison, quarterlyCumulativeData, dealConfig, unifiedAnalysis, generateScenarioPresentationPdf]);

  const handleCreateNextYear = async () => {
    if (!unifiedAnalysis?.next_year_projection || !scenarioB) return;
    
    const newScenario = await createNextYearFromAI(scenarioB, unifiedAnalysis.next_year_projection);
    if (newScenario) {
      toast.success(`${newScenario.targetYear} yılı senaryosu oluşturuldu!`);
      navigate(`/finance/simulation?scenario=${newScenario.id}`);
    }
  };

  const handleSelectUnifiedHistory = (item: AnalysisHistoryItem) => {
    setSelectedHistoricalAnalysis(item);
    setHistorySheetType('scenario_comparison');
  };

  const handleRestoreHistory = (item: AnalysisHistoryItem) => {
    restoreUnifiedHistoricalAnalysis(item);
  };

  const chartConfig: ChartConfig = {
    scenarioANet: { label: `${scenarioA?.name || 'A'} Net`, color: '#2563eb' },
    scenarioBNet: { label: `${scenarioB?.name || 'B'} Net`, color: '#16a34a' },
  };

  const cumulativeChartConfig: ChartConfig = {
    scenarioACumulative: { label: `${scenarioA?.name || 'A'} Kümülatif`, color: '#2563eb' },
    scenarioBCumulative: { label: `${scenarioB?.name || 'B'} Kümülatif`, color: '#16a34a' },
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
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isGenerating} 
                className="gap-2"
                onClick={handleExportPresentationPdf}
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Presentation className="h-4 w-4" />}
                PDF Sunum
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Scenario Selection */}
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
          <div className="space-y-6">
            {/* SECTION 1: SUMMARY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metrics.map((m) => {
                const diff = calculateDiff(m.scenarioA, m.scenarioB);
                return (
                  <Card key={m.label}>
                    <CardContent className="pt-4">
                      <div className="text-xs text-muted-foreground mb-3">{m.label}</div>
                      <div className="flex items-center justify-between gap-2">
                        {/* Senaryo A - Sol Taraf */}
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span className="text-[10px] text-blue-600 font-medium mb-1 truncate w-full" title={scenarioA?.name}>
                            {scenarioA?.name || 'A'}
                          </span>
                          <span className="text-sm font-mono">{formatValue(m.scenarioA, m.format)}</span>
                        </div>
                        
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        
                        {/* Senaryo B - Sağ Taraf */}
                        <div className="flex flex-col items-end min-w-0 flex-1">
                          <span className="text-[10px] text-emerald-600 font-medium mb-1 truncate w-full text-right" title={scenarioB?.name}>
                            {scenarioB?.name || 'B'}
                          </span>
                          <span className="text-sm font-bold font-mono">{formatValue(m.scenarioB, m.format)}</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <DiffBadge diff={diff} format={m.format} higherIsBetter={m.higherIsBetter} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* SECTION 2: CHARTS SIDE BY SIDE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Quarterly Net Profit Bar Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Çeyreklik Net Kâr</CardTitle>
                </CardHeader>
                <CardContent>
                  <div ref={quarterlyChartRef} className="chart-capture-wrapper">
                    <ChartContainer config={chartConfig} className="h-[200px] w-full">
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
                  </div>
                </CardContent>
              </Card>

              {/* Cumulative Cash Flow Area Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Kümülatif Nakit Akışı</CardTitle>
                </CardHeader>
                <CardContent>
                  <div ref={cumulativeChartRef} className="chart-capture-wrapper">
                    <ChartContainer config={cumulativeChartConfig} className="h-[200px] w-full">
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
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SECTION 3: INVESTMENT & AI (formerly in tab) */}
            {unifiedCacheLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Önceki analiz yükleniyor...</span>
              </div>
            ) : (
              <>
                {/* Data changed warning */}
                {unifiedDataChanged && unifiedCachedInfo && (
                  <DataChangedWarning onReanalyze={handleUnifiedAnalysis} isLoading={unifiedLoading} />
                )}
                
                {unifiedCachedInfo && (
                  <div className="mb-4">
                    <CacheInfoBadge cachedInfo={unifiedCachedInfo} />
                  </div>
                )}
                
                {/* Analysis history */}
                <AnalysisHistoryPanel 
                  history={unifiedAnalysisHistory}
                  isLoading={unifiedHistoryLoading}
                  onSelectHistory={handleSelectUnifiedHistory}
                  analysisType="scenario_comparison"
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
                  unifiedAnalysis={unifiedAnalysis}
                  isLoading={unifiedLoading}
                  onUnifiedAnalyze={handleUnifiedAnalysis}
                  onCreateNextYear={handleCreateNextYear}
                  onShowPitchDeck={() => setShowPitchDeck(true)}
                />
                
                {/* Global Vizyon Kartı - Yatırımcıyı Heyecanlandır */}
                {unifiedAnalysis?.next_year_projection && (
                  <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-background to-teal-950/20 overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-emerald-500/20">
                            <Rocket className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {scenarioB?.targetYear ? scenarioB.targetYear + 1 : 'Gelecek'} Global Vizyonu
                            </CardTitle>
                            <CardDescription className="text-xs">
                              AI tarafından oluşturulan globalleşme odaklı büyüme simülasyonu
                            </CardDescription>
                          </div>
                        </div>
                        {unifiedAnalysis.next_year_projection.investor_hook && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                            {unifiedAnalysis.next_year_projection.investor_hook.revenue_growth_yoy || '%50+ Büyüme'}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Strategy Note */}
                      <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                        <p className="text-sm text-muted-foreground italic">
                          "{unifiedAnalysis.next_year_projection.strategy_note}"
                        </p>
                      </div>
                      
                      {/* Sanal Bilanço Gösterimi */}
                      {unifiedAnalysis.next_year_projection.virtual_opening_balance && (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Savaş Fonu</p>
                            <p className="text-lg font-bold text-emerald-400">
                              {formatCompactUSD(unifiedAnalysis.next_year_projection.virtual_opening_balance.opening_cash)}
                            </p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Global Hazırlık</p>
                            <Badge 
                              variant="outline" 
                              className={
                                unifiedAnalysis.next_year_projection.virtual_opening_balance.war_chest_status === 'Hazır' 
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                  : unifiedAnalysis.next_year_projection.virtual_opening_balance.war_chest_status === 'Yakın'
                                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                              }
                            >
                              {unifiedAnalysis.next_year_projection.virtual_opening_balance.war_chest_status}
                            </Badge>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Tahmini Gelir</p>
                            <p className="text-lg font-bold text-purple-400">
                              {formatCompactUSD(unifiedAnalysis.next_year_projection.summary.total_revenue)}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Çeyreklik Olaylar */}
                      <div className="grid grid-cols-4 gap-2">
                        {(['q1', 'q2', 'q3', 'q4'] as const).map((q, idx) => {
                          const quarterData = unifiedAnalysis.next_year_projection.quarterly[q];
                          return (
                            <div key={q} className="p-2 rounded-lg bg-muted/30 border border-border/50">
                              <p className="text-[10px] font-medium text-muted-foreground mb-1">Q{idx + 1}</p>
                              <p className="text-xs font-medium truncate" title={quarterData.key_event}>
                                {quarterData.key_event || `Çeyrek ${idx + 1}`}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {formatCompactUSD(quarterData.revenue)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Yatırımcı Kancası */}
                      {unifiedAnalysis.next_year_projection.investor_hook && (
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
                            📈 {unifiedAnalysis.next_year_projection.investor_hook.revenue_growth_yoy}
                          </Badge>
                          {unifiedAnalysis.next_year_projection.investor_hook.margin_improvement && (
                            <Badge className="bg-blue-500/20 text-blue-400 border-0">
                              💰 {unifiedAnalysis.next_year_projection.investor_hook.margin_improvement}
                            </Badge>
                          )}
                          {unifiedAnalysis.next_year_projection.investor_hook.valuation_multiple_target && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-0">
                              🎯 {unifiedAnalysis.next_year_projection.investor_hook.valuation_multiple_target}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Competitive Moat */}
                      {unifiedAnalysis.next_year_projection.investor_hook?.competitive_moat && (
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <p className="text-xs text-amber-400">
                            🛡️ <span className="font-medium">Rekabet Avantajı:</span> {unifiedAnalysis.next_year_projection.investor_hook.competitive_moat}
                          </p>
                        </div>
                      )}
                      
                      {/* CTA Button */}
                      <Button 
                        onClick={handleCreateNextYear}
                        className="w-full gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                        size="lg"
                      >
                        <Rocket className="h-4 w-4" />
                        🚀 {scenarioB?.targetYear ? scenarioB.targetYear + 1 : 'Gelecek'} Global Vizyonunu Keşfet
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
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
      
      {/* Pitch Deck Sheet */}
      <Sheet open={showPitchDeck} onOpenChange={setShowPitchDeck}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Presentation className="h-5 w-5 text-purple-400" />
              Yatırımcı Pitch Deck
            </SheetTitle>
            <SheetDescription>
              AI tarafından oluşturulan 5 slaytlık yatırımcı sunumu
            </SheetDescription>
          </SheetHeader>
          {unifiedAnalysis?.pitch_deck && (
            <div className="mt-4">
              <PitchDeckView pitchDeck={unifiedAnalysis.pitch_deck} />
            </div>
          )}
        </SheetContent>
      </Sheet>
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
