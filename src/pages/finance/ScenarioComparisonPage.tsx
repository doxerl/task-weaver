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
  Edit2,
} from 'lucide-react';
import { 
  SimulationScenario, 
  AnalysisHistoryItem, 
  NextYearProjection, 
  QuarterlyItemizedData,
  FinancialRatios,
  TrendAnalysisResult,
  EnhancedSensitivityAnalysis,
  BreakEvenResult,
  ProfessionalAnalysisData,
  FocusProjectInfo,
  EditableProjectionItem
} from '@/types/simulation';
import { FocusProjectSelector } from '@/components/simulation/FocusProjectSelector';
import { EditableProjectionTable } from '@/components/simulation/EditableProjectionTable';
import { formatCompactUSD } from '@/lib/formatters';
import { toast } from 'sonner';
import { usePdfEngine } from '@/hooks/finance/usePdfEngine';
import { useUnifiedAnalysis } from '@/hooks/finance/useUnifiedAnalysis';
import { useInvestorAnalysis, calculateCapitalNeeds, calculateExitPlan } from '@/hooks/finance/useInvestorAnalysis';
import { useScenarios } from '@/hooks/finance/useScenarios';
import { InvestmentTab } from '@/components/simulation/InvestmentTab';
import { PitchDeckView } from '@/components/simulation/PitchDeckView';
import { PitchDeckEditor } from '@/components/simulation/PitchDeckEditor';
import { SensitivityTable } from '@/components/simulation/SensitivityTable';
import { FinancialRatiosPanel } from '@/components/simulation/FinancialRatiosPanel';
import { ItemTrendCards } from '@/components/simulation/ItemTrendCards';
import { ScenarioComparisonCards } from '@/components/simulation/ScenarioComparisonCards';
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
  const presentationPdfRef = useRef<HTMLDivElement>(null);
  
  // Sheet states
  const [selectedHistoricalAnalysis, setSelectedHistoricalAnalysis] = useState<AnalysisHistoryItem | null>(null);
  const [historySheetType, setHistorySheetType] = useState<'scenario_comparison' | 'investor_pitch'>('scenario_comparison');
  const [showPitchDeck, setShowPitchDeck] = useState(false);
  
  // Focus Project State - yatırım odak projesi
  const [focusProject, setFocusProject] = useState<string>('');
  const [focusProjectPlan, setFocusProjectPlan] = useState<string>('');
  const [investmentAllocation, setInvestmentAllocation] = useState({
    product: 40,
    marketing: 30,
    hiring: 20,
    operations: 10
  });
  
  // Editable Projection State - AI'ın ürettiği projeksiyonu düzenlenebilir hale getir
  const [editableRevenueProjection, setEditableRevenueProjection] = useState<EditableProjectionItem[]>([]);
  const [editableExpenseProjection, setEditableExpenseProjection] = useState<EditableProjectionItem[]>([]);
  const [originalRevenueProjection, setOriginalRevenueProjection] = useState<EditableProjectionItem[]>([]);
  const [originalExpenseProjection, setOriginalExpenseProjection] = useState<EditableProjectionItem[]>([]);

  const { generatePdfFromElement, isGenerating } = usePdfEngine();
  
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

  // =====================================================
  // PROFESSIONAL ANALYSIS CALCULATIONS
  // =====================================================

  // Financial Ratios (from historical balance sheet)
  const [historicalBalance, setHistoricalBalance] = useState<any>(null);
  
  // Fetch historical balance when scenario changes
  useEffect(() => {
    const loadBalance = async () => {
      if (scenarioB?.targetYear && yearlyAverageRate) {
        const balance = await fetchHistoricalBalance(scenarioB.targetYear, yearlyAverageRate);
        setHistoricalBalance(balance);
      }
    };
    loadBalance();
  }, [scenarioB?.targetYear, yearlyAverageRate, fetchHistoricalBalance]);

  // Calculate Financial Ratios
  const financialRatios = useMemo((): FinancialRatios | null => {
    if (!historicalBalance || !summaryB) return null;
    
    const cash = (historicalBalance.cash_on_hand || 0) + (historicalBalance.bank_balance || 0);
    const currentAssets = cash + (historicalBalance.trade_receivables || 0);
    const shortTermDebt = (historicalBalance.trade_payables || 0) + ((historicalBalance.bank_loans || 0) * 0.3);
    const equity = (historicalBalance.total_assets || 0) - (historicalBalance.total_liabilities || 0);
    
    return {
      liquidity: {
        currentRatio: shortTermDebt > 0 ? currentAssets / shortTermDebt : 0,
        quickRatio: shortTermDebt > 0 ? (cash + (historicalBalance.trade_receivables || 0)) / shortTermDebt : 0,
        cashRatio: shortTermDebt > 0 ? cash / shortTermDebt : 0,
        workingCapital: currentAssets - shortTermDebt
      },
      leverage: {
        debtToEquity: equity > 0 ? (historicalBalance.bank_loans || 0) / equity : 0,
        debtToAssets: (historicalBalance.total_assets || 0) > 0 ? (historicalBalance.bank_loans || 0) / (historicalBalance.total_assets || 1) : 0,
        receivablesRatio: (historicalBalance.total_assets || 0) > 0 ? (historicalBalance.trade_receivables || 0) / (historicalBalance.total_assets || 1) : 0
      },
      profitability: {
        returnOnAssets: (historicalBalance.total_assets || 0) > 0 ? ((historicalBalance.current_profit || 0) / (historicalBalance.total_assets || 1)) * 100 : 0,
        returnOnEquity: equity > 0 ? ((historicalBalance.current_profit || 0) / equity) * 100 : 0,
        netMargin: summaryB.totalRevenue > 0 ? (summaryB.netProfit / summaryB.totalRevenue) * 100 : 0
      }
    };
  }, [historicalBalance, summaryB]);

  // Item Trend Analysis
  const itemTrendAnalysis = useMemo((): TrendAnalysisResult | null => {
    if (!quarterlyItemized || !summaryB) return null;
    
    const analyzeItem = (item: { q1: number; q2: number; q3: number; q4: number; total: number }) => {
      const quarters = [item.q1, item.q2, item.q3, item.q4];
      const avg = item.total / 4;
      const variance = quarters.reduce((sum, q) => sum + Math.pow(q - avg, 2), 0) / 4;
      const stdDev = Math.sqrt(variance);
      const volatility = avg > 0 ? (stdDev / avg) * 100 : 0;
      const overallGrowth = item.q1 > 0 ? ((item.q4 - item.q1) / item.q1) * 100 : 0;
      const seasonalityIndex = item.q1 > 0 ? item.q4 / item.q1 : 1;
      const concentrationRisk = item.total > 0 ? (Math.max(...quarters) / item.total) * 100 : 0;
      
      return {
        trend: (overallGrowth > 10 ? 'increasing' : overallGrowth < -10 ? 'decreasing' : 'stable') as 'increasing' | 'decreasing' | 'stable',
        volatility,
        volatilityLevel: (volatility > 50 ? 'high' : volatility > 20 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
        seasonalityIndex,
        overallGrowth,
        concentrationRisk
      };
    };
    
    return {
      revenues: quarterlyItemized.scenarioB.revenues.map(r => ({
        category: r.category,
        ...analyzeItem(r),
        shareOfTotal: summaryB.totalRevenue > 0 ? (r.total / summaryB.totalRevenue) * 100 : 0
      })),
      expenses: quarterlyItemized.scenarioB.expenses.map(e => ({
        category: e.category,
        ...analyzeItem(e),
        shareOfTotal: summaryB.totalExpense > 0 ? (e.total / summaryB.totalExpense) * 100 : 0
      }))
    };
  }, [quarterlyItemized, summaryB]);

  // Sensitivity Analysis
  const sensitivityAnalysis = useMemo((): EnhancedSensitivityAnalysis | null => {
    if (!summaryB || !dealConfig) return null;
    
    const scenarios = [-20, -10, 0, 10, 20];
    const capitalNeeds = calculateCapitalNeeds({
      q1: quarterlyComparison[0]?.scenarioBNet || 0,
      q2: quarterlyComparison[1]?.scenarioBNet || 0,
      q3: quarterlyComparison[2]?.scenarioBNet || 0,
      q4: quarterlyComparison[3]?.scenarioBNet || 0
    });
    
    return {
      revenueImpact: scenarios.map(change => {
        const newRevenue = summaryB.totalRevenue * (1 + change/100);
        const newProfit = newRevenue - summaryB.totalExpense;
        const newMargin = newRevenue > 0 ? (newProfit / newRevenue) * 100 : 0;
        const newValuation = newRevenue * dealConfig.sectorMultiple;
        const newMOIC = dealConfig.investmentAmount > 0 
          ? (newValuation * (dealConfig.equityPercentage/100)) / dealConfig.investmentAmount 
          : 0;
        const newRunway = newProfit > 0 
          ? 999 
          : Math.abs(capitalNeeds.minCumulativeCash + dealConfig.investmentAmount) / Math.max(Math.abs(newProfit/12), 1);
        
        return { 
          change, 
          revenue: newRevenue, 
          profit: newProfit, 
          margin: newMargin, 
          valuation: newValuation, 
          moic: newMOIC, 
          runway: Math.round(Math.min(newRunway, 999))
        };
      }),
      expenseImpact: scenarios.map(change => {
        const newExpense = summaryB.totalExpense * (1 + change/100);
        const newProfit = summaryB.totalRevenue - newExpense;
        const newMargin = summaryB.totalRevenue > 0 ? (newProfit / summaryB.totalRevenue) * 100 : 0;
        
        return { change, expense: newExpense, profit: newProfit, margin: newMargin };
      })
    };
  }, [summaryB, dealConfig, quarterlyComparison]);

  // Break-Even Analysis
  const breakEvenAnalysis = useMemo((): BreakEvenResult | null => {
    if (!scenarioB || !quarterlyComparison || !summaryB) return null;
    
    let cumulativeRevenue = 0;
    let cumulativeExpense = 0;
    const months: { month: string; cumRevenue: number; cumExpense: number; isBreakEven: boolean }[] = [];
    
    quarterlyComparison.forEach((q, qIndex) => {
      for (let m = 0; m < 3; m++) {
        cumulativeRevenue += q.scenarioBRevenue / 3;
        cumulativeExpense += q.scenarioBExpense / 3;
        months.push({
          month: `${scenarioB.targetYear}-${String((qIndex * 3) + m + 1).padStart(2, '0')}`,
          cumRevenue: cumulativeRevenue,
          cumExpense: cumulativeExpense,
          isBreakEven: cumulativeRevenue >= cumulativeExpense
        });
      }
    });
    
    const breakEvenIdx = months.findIndex(m => m.isBreakEven);
    const breakEvenMonth = breakEvenIdx >= 0 ? months[breakEvenIdx].month : 'Yıl içinde ulaşılamadı';
    
    return {
      months,
      breakEvenMonth,
      monthsToBreakEven: breakEvenIdx >= 0 ? breakEvenIdx + 1 : 13,
      requiredMonthlyRevenue: summaryB.totalExpense / 12
    };
  }, [scenarioB, quarterlyComparison, summaryB]);

  // Bundle professional analysis data
  const professionalAnalysisData = useMemo((): ProfessionalAnalysisData => ({
    financialRatios,
    itemTrendAnalysis,
    sensitivityAnalysis,
    breakEvenAnalysis
  }), [financialRatios, itemTrendAnalysis, sensitivityAnalysis, breakEvenAnalysis]);

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
  
  // Senaryo net kâr bilgisini hesapla - dropdown'da göstermek için
  const scenariosWithProfit = useMemo(() => {
    return scenarios.map(s => {
      const summary = calculateScenarioSummary(s);
      return { ...s, netProfit: summary.netProfit };
    }).sort((a, b) => b.netProfit - a.netProfit); // Yüksek kârdan düşüğe
  }, [scenarios]);
  
  // Otomatik senaryo ataması - sayfa ilk açıldığında
  useEffect(() => {
    if (scenariosWithProfit.length >= 2 && !scenarioAId && !scenarioBId) {
      // En yüksek kârlı senaryoyu A'ya, en düşük kârlıyı B'ye ata
      setScenarioAId(scenariosWithProfit[0].id!);
      setScenarioBId(scenariosWithProfit[scenariosWithProfit.length - 1].id!);
    }
  }, [scenariosWithProfit, scenarioAId, scenarioBId]);
  
  // Senaryo sıralaması hatalı mı? (uyarı banner'ı için)
  const isScenarioOrderWrong = useMemo(() => {
    if (!summaryA || !summaryB) return false;
    return summaryA.netProfit < summaryB.netProfit;
  }, [summaryA, summaryB]);
  
  // Senaryoları yer değiştir
  const swapScenarios = useCallback(() => {
    if (!scenarioAId || !scenarioBId) return;
    const newParams = new URLSearchParams();
    newParams.set('a', scenarioBId);
    newParams.set('b', scenarioAId);
    navigate(`/finance/simulation/compare?${newParams.toString()}`, { replace: true });
    toast.success('Senaryo sıralaması düzeltildi');
  }, [scenarioAId, scenarioBId, navigate]);
  
  // Editable Projection Sync - AI analizi tamamlandığında düzenlenebilir tabloya aktar
  useEffect(() => {
    if (unifiedAnalysis?.next_year_projection && scenarioA) {
      const projection = unifiedAnalysis.next_year_projection;
      
      // Gelir kalemleri için düzenlenebilir projeksiyon oluştur
      const revenueItems: EditableProjectionItem[] = scenarioA.revenues.map(r => {
        const growthMultiplier = 1.3; // Varsayılan %30 büyüme
        const baseQ = r.projectedQuarterly || { q1: r.projectedAmount / 4, q2: r.projectedAmount / 4, q3: r.projectedAmount / 4, q4: r.projectedAmount / 4 };
        const q1 = Math.round((baseQ.q1 || r.projectedAmount / 4) * growthMultiplier);
        const q2 = Math.round((baseQ.q2 || r.projectedAmount / 4) * growthMultiplier);
        const q3 = Math.round((baseQ.q3 || r.projectedAmount / 4) * growthMultiplier);
        const q4 = Math.round((baseQ.q4 || r.projectedAmount / 4) * growthMultiplier);
        return {
          category: r.category,
          q1,
          q2,
          q3,
          q4,
          total: q1 + q2 + q3 + q4,
          aiGenerated: true,
          userEdited: false
        };
      });
      
      // Gider kalemleri için düzenlenebilir projeksiyon oluştur
      const expenseItems: EditableProjectionItem[] = scenarioA.expenses.map(e => {
        const growthMultiplier = 1.15; // Varsayılan %15 artış
        const baseQ = e.projectedQuarterly || { q1: e.projectedAmount / 4, q2: e.projectedAmount / 4, q3: e.projectedAmount / 4, q4: e.projectedAmount / 4 };
        const q1 = Math.round((baseQ.q1 || e.projectedAmount / 4) * growthMultiplier);
        const q2 = Math.round((baseQ.q2 || e.projectedAmount / 4) * growthMultiplier);
        const q3 = Math.round((baseQ.q3 || e.projectedAmount / 4) * growthMultiplier);
        const q4 = Math.round((baseQ.q4 || e.projectedAmount / 4) * growthMultiplier);
        return {
          category: e.category,
          q1,
          q2,
          q3,
          q4,
          total: q1 + q2 + q3 + q4,
          aiGenerated: true,
          userEdited: false
        };
      });
      
      setEditableRevenueProjection(revenueItems);
      setEditableExpenseProjection(expenseItems);
      setOriginalRevenueProjection(JSON.parse(JSON.stringify(revenueItems)));
      setOriginalExpenseProjection(JSON.parse(JSON.stringify(expenseItems)));
    }
  }, [unifiedAnalysis?.next_year_projection, scenarioA]);
  
  // Editable projection handlers
  const handleRevenueProjectionChange = useCallback((index: number, field: 'q1' | 'q2' | 'q3' | 'q4', value: number) => {
    setEditableRevenueProjection(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value, userEdited: true } : item
    ));
  }, []);
  
  const handleExpenseProjectionChange = useCallback((index: number, field: 'q1' | 'q2' | 'q3' | 'q4', value: number) => {
    setEditableExpenseProjection(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value, userEdited: true } : item
    ));
  }, []);
  
  const handleResetRevenueProjection = useCallback(() => {
    setEditableRevenueProjection(JSON.parse(JSON.stringify(originalRevenueProjection)));
  }, [originalRevenueProjection]);
  
  const handleResetExpenseProjection = useCallback(() => {
    setEditableExpenseProjection(JSON.parse(JSON.stringify(originalExpenseProjection)));
  }, [originalExpenseProjection]);
  
  // Editable Pitch Deck State
  const [editablePitchDeck, setEditablePitchDeck] = useState<{ slides: any[]; executive_summary: string } | null>(null);
  const [pitchDeckEditMode, setPitchDeckEditMode] = useState(false);
  
  // Sync editable pitch deck when unified analysis changes
  useEffect(() => {
    if (unifiedAnalysis?.pitch_deck) {
      setEditablePitchDeck({
        slides: JSON.parse(JSON.stringify(unifiedAnalysis.pitch_deck.slides || [])),
        executive_summary: unifiedAnalysis.pitch_deck.executive_summary || ''
      });
    }
  }, [unifiedAnalysis?.pitch_deck]);
  
  // Pitch deck edit handlers
  const handlePitchSlideChange = useCallback((index: number, field: string, value: string | string[]) => {
    if (!editablePitchDeck) return;
    setEditablePitchDeck(prev => {
      if (!prev) return prev;
      const newSlides = [...prev.slides];
      newSlides[index] = { ...newSlides[index], [field]: value };
      return { ...prev, slides: newSlides };
    });
  }, [editablePitchDeck]);
  
  const handleExecutiveSummaryChange = useCallback((value: string) => {
    setEditablePitchDeck(prev => prev ? { ...prev, executive_summary: value } : prev);
  }, []);
  
  const handleAddBullet = useCallback((slideIndex: number) => {
    if (!editablePitchDeck) return;
    setEditablePitchDeck(prev => {
      if (!prev) return prev;
      const newSlides = [...prev.slides];
      const currentBullets = newSlides[slideIndex]?.content_bullets || [];
      newSlides[slideIndex] = { ...newSlides[slideIndex], content_bullets: [...currentBullets, ''] };
      return { ...prev, slides: newSlides };
    });
  }, [editablePitchDeck]);
  
  const handleRemoveBullet = useCallback((slideIndex: number, bulletIndex: number) => {
    if (!editablePitchDeck) return;
    setEditablePitchDeck(prev => {
      if (!prev) return prev;
      const newSlides = [...prev.slides];
      const currentBullets = [...(newSlides[slideIndex]?.content_bullets || [])];
      currentBullets.splice(bulletIndex, 1);
      newSlides[slideIndex] = { ...newSlides[slideIndex], content_bullets: currentBullets };
      return { ...prev, slides: newSlides };
    });
  }, [editablePitchDeck]);

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
  // PDF Presentation Handler - HTML yakalama ile (Türkçe karakter + grafik desteği)
  const handleExportPresentationPdf = useCallback(async () => {
    if (!scenarioA || !scenarioB || !summaryA || !summaryB || !presentationPdfRef.current) {
      toast.error('PDF için gerekli veriler eksik');
      return;
    }
    
    toast.info('PDF hazırlanıyor...');
    
    const success = await generatePdfFromElement(presentationPdfRef, {
      filename: `Senaryo_Sunum_${scenarioA.name.replace(/\s+/g, '_')}_vs_${scenarioB.name.replace(/\s+/g, '_')}.pdf`,
      orientation: 'landscape',
      margin: 10,
      scale: 2,
      fitToPage: false,
      onProgress: (stage, percent) => {
        console.log(`[PDF] ${stage}: ${percent}%`);
      }
    });
    
    if (success) {
      toast.success('PDF sunumu oluşturuldu!');
    } else {
      toast.error('PDF oluşturulamadı');
    }
  }, [scenarioA, scenarioB, summaryA, summaryB, generatePdfFromElement]);

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
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                    Pozitif
                  </Badge>
                  Senaryo A
                </label>
                <Select value={scenarioAId || ''} onValueChange={setScenarioAId}>
                  <SelectTrigger><SelectValue placeholder="Senaryo seçin..." /></SelectTrigger>
                  <SelectContent>
                    {scenariosWithProfit.map((s) => (
                      <SelectItem key={s.id} value={s.id!} disabled={s.id === scenarioBId}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{s.name}</span>
                          <Badge 
                            variant="outline" 
                            className={s.netProfit >= 0 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs' 
                              : 'bg-red-500/10 text-red-500 border-red-500/30 text-xs'
                            }
                          >
                            {s.netProfit >= 0 ? '+' : ''}{formatCompactUSD(s.netProfit)}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                    Negatif
                  </Badge>
                  Senaryo B
                </label>
                <Select value={scenarioBId || ''} onValueChange={setScenarioBId}>
                  <SelectTrigger><SelectValue placeholder="Senaryo seçin..." /></SelectTrigger>
                  <SelectContent>
                    {scenariosWithProfit.map((s) => (
                      <SelectItem key={s.id} value={s.id!} disabled={s.id === scenarioAId}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{s.name}</span>
                          <Badge 
                            variant="outline" 
                            className={s.netProfit >= 0 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs' 
                              : 'bg-red-500/10 text-red-500 border-red-500/30 text-xs'
                            }
                          >
                            {s.netProfit >= 0 ? '+' : ''}{formatCompactUSD(s.netProfit)}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Wrong Order Warning Banner */}
            {isScenarioOrderWrong && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-500">
                    Senaryo Sıralaması Hatalı
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Senaryo A pozitif (yüksek kâr), Senaryo B negatif (düşük kâr) olmalıdır.
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-1 border-amber-500/30 text-amber-500 hover:bg-amber-500/20 flex-shrink-0"
                  onClick={swapScenarios}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Düzelt
                </Button>
              </div>
            )}
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

            {/* SECTION 2.5: PROFESSIONAL ANALYSIS PANELS */}
            {(financialRatios || sensitivityAnalysis || itemTrendAnalysis) && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Profesyonel Analiz Metrikleri
                </h3>
                {/* 1. Cross-Scenario Comparison - Gelir/Gider Kalemleri Karşılaştırması */}
                {quarterlyItemized && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ScenarioComparisonCards quarterlyItemized={quarterlyItemized} type="revenues" />
                    <ScenarioComparisonCards quarterlyItemized={quarterlyItemized} type="expenses" />
                  </div>
                )}
                
                {/* 2. Single Scenario Trend Analysis */}
                {itemTrendAnalysis && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ItemTrendCards analysis={itemTrendAnalysis} type="revenues" />
                    <ItemTrendCards analysis={itemTrendAnalysis} type="expenses" />
                  </div>
                )}

                {/* 3. Financial Ratios + Sensitivity Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {financialRatios && (
                    <FinancialRatiosPanel ratios={financialRatios} />
                  )}
                  {sensitivityAnalysis && (
                    <SensitivityTable analysis={sensitivityAnalysis} baseProfit={summaryB?.netProfit || 0} />
                  )}
                </div>
              </div>
            )}

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
                
                {/* Focus Project Selector - Yatırım Odak Projesi */}
                {scenarioA && (
                  <FocusProjectSelector
                    revenues={scenarioA.revenues}
                    focusProject={focusProject}
                    focusProjectPlan={focusProjectPlan}
                    investmentAllocation={investmentAllocation}
                    onFocusProjectChange={setFocusProject}
                    onFocusProjectPlanChange={setFocusProjectPlan}
                    onInvestmentAllocationChange={setInvestmentAllocation}
                  />
                )}
                
                {/* Editable Projection Tables - Düzenlenebilir Projeksiyon */}
                {unifiedAnalysis?.next_year_projection && editableRevenueProjection.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <EditableProjectionTable
                      title={`${scenarioA?.targetYear ? scenarioA.targetYear + 1 : 'Gelecek Yıl'} Gelir Projeksiyonu`}
                      description="AI tarafından oluşturuldu - düzenleyebilirsiniz"
                      items={editableRevenueProjection}
                      onItemChange={handleRevenueProjectionChange}
                      onReset={handleResetRevenueProjection}
                      type="revenue"
                    />
                    <EditableProjectionTable
                      title={`${scenarioA?.targetYear ? scenarioA.targetYear + 1 : 'Gelecek Yıl'} Gider Projeksiyonu`}
                      description="AI tarafından oluşturuldu - düzenleyebilirsiniz"
                      items={editableExpenseProjection}
                      onItemChange={handleExpenseProjectionChange}
                      onReset={handleResetExpenseProjection}
                      type="expense"
                    />
                  </div>
                )}
                
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
      
      {/* Pitch Deck Sheet - Editable */}
      <Sheet open={showPitchDeck} onOpenChange={setShowPitchDeck}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  <Presentation className="h-5 w-5 text-purple-400" />
                  Yatırımcı Pitch Deck
                </SheetTitle>
                <SheetDescription>
                  AI tarafından oluşturulan 5 slaytlık yatırımcı sunumu - düzenleyebilirsiniz
                </SheetDescription>
              </div>
              <Button
                variant={pitchDeckEditMode ? "default" : "outline"}
                size="sm"
                onClick={() => setPitchDeckEditMode(!pitchDeckEditMode)}
                className="gap-1"
              >
                <Edit2 className="h-3 w-3" />
                {pitchDeckEditMode ? 'Görüntüleme' : 'Düzenleme'}
              </Button>
            </div>
          </SheetHeader>
          <div className="mt-4">
            {pitchDeckEditMode && editablePitchDeck ? (
              <PitchDeckEditor
                slides={editablePitchDeck.slides}
                executiveSummary={editablePitchDeck.executive_summary}
                onSlideChange={handlePitchSlideChange}
                onExecutiveSummaryChange={handleExecutiveSummaryChange}
                onAddBullet={handleAddBullet}
                onRemoveBullet={handleRemoveBullet}
              />
            ) : unifiedAnalysis?.pitch_deck ? (
              <PitchDeckView pitchDeck={unifiedAnalysis.pitch_deck} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Presentation className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Henüz pitch deck oluşturulmadı.</p>
                <p className="text-xs mt-1">Önce AI analizi çalıştırın.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      
      {/* PDF SUNUM HIDDEN CONTAINER - HTML yakalamalı */}
      {/* PDF SUNUM HIDDEN CONTAINER - Landscape A4 optimized */}
      <div 
        ref={presentationPdfRef} 
        className="pdf-hidden-container"
        style={{ position: 'absolute', left: '-9999px', top: 0 }}
      >
        {/* 
          Landscape A4: 297mm x 210mm = 1.414:1 aspect ratio
          1200px genişlik → 848px yükseklik (1200/1.414)
          Her sayfa bu boyutta olmalı
        */}
        <div style={{ width: '1200px', background: 'white', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          
          {/* SAYFA 1: KAPAK - Landscape A4 oranında */}
          <div className="page-break-after" style={{ 
            width: '1200px', 
            height: '848px', 
            position: 'relative', 
            background: 'linear-gradient(180deg, #1e3a8a 0%, #3b82f6 55%, #ffffff 55%)', 
            padding: '48px',
            boxSizing: 'border-box'
          }}>
            <div style={{ textAlign: 'center', paddingTop: '60px' }}>
              <h1 style={{ fontSize: '42px', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>
                Senaryo Karşılaştırma Raporu
              </h1>
              <p style={{ fontSize: '22px', color: '#93c5fd', marginBottom: '8px' }}>
                {scenarioA?.name} vs {scenarioB?.name}
              </p>
              <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)' }}>
                Hedef Yıl: {scenarioB?.targetYear || new Date().getFullYear()}
              </p>
            </div>
            
            {/* Özet Metrikleri */}
            <div style={{ position: 'absolute', bottom: '80px', left: '48px', right: '48px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                {metrics.slice(0, 4).map((m, i) => {
                  const diff = calculateDiff(m.scenarioA, m.scenarioB);
                  const isPositive = m.higherIsBetter ? m.scenarioB > m.scenarioA : m.scenarioB < m.scenarioA;
                  return (
                    <div key={i} style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase' }}>{m.label}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ textAlign: 'left' }}>
                          <p style={{ fontSize: '9px', color: '#2563eb', marginBottom: '2px' }}>{scenarioA?.name}</p>
                          <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb' }}>{formatValue(m.scenarioA, m.format)}</p>
                        </div>
                        <span style={{ color: '#9ca3af', fontSize: '16px' }}>→</span>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '9px', color: '#16a34a', marginBottom: '2px' }}>{scenarioB?.name}</p>
                          <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#16a34a' }}>{formatValue(m.scenarioB, m.format)}</p>
                        </div>
                      </div>
                      <p style={{ fontSize: '14px', fontWeight: 'bold', color: isPositive ? '#16a34a' : '#dc2626', textAlign: 'center', marginTop: '8px' }}>
                        {diff.percent >= 0 ? '+' : ''}{diff.percent.toFixed(1)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SAYFA 2: METRİKLER ve TABLO */}
          <div className="page-break-after" style={{ 
            width: '1200px', 
            height: '848px', 
            padding: '40px',
            boxSizing: 'border-box',
            background: 'white'
          }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px', borderBottom: '3px solid #3b82f6', paddingBottom: '12px', color: '#1e3a8a' }}>
              Finansal Özet Karşılaştırması
            </h2>
            
            {/* Metrik Kartları - Senaryo etiketleri ile */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
              {metrics.map((m, i) => {
                const diff = calculateDiff(m.scenarioA, m.scenarioB);
                const isPositive = m.higherIsBetter ? m.scenarioB > m.scenarioA : m.scenarioB < m.scenarioA;
                return (
                  <div key={i} style={{ 
                    padding: '24px', 
                    borderRadius: '16px', 
                    background: isPositive ? '#f0fdf4' : '#fef2f2',
                    border: `2px solid ${isPositive ? '#86efac' : '#fecaca'}`,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                  }}>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px', textTransform: 'uppercase', fontWeight: '600' }}>{m.label}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      {/* Senaryo A */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: '500', marginBottom: '4px' }}>
                          {scenarioA?.name || 'Senaryo A'}
                        </span>
                        <span style={{ color: '#2563eb', fontWeight: '700', fontSize: '16px' }}>
                          {formatValue(m.scenarioA, m.format)}
                        </span>
                      </div>
                      
                      {/* Ok işareti */}
                      <span style={{ alignSelf: 'center', color: '#9ca3af', fontSize: '18px' }}>→</span>
                      
                      {/* Senaryo B */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '500', marginBottom: '4px' }}>
                          {scenarioB?.name || 'Senaryo B'}
                        </span>
                        <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '16px' }}>
                          {formatValue(m.scenarioB, m.format)}
                        </span>
                      </div>
                    </div>
                    <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18px', color: isPositive ? '#16a34a' : '#dc2626' }}>
                      {diff.percent >= 0 ? '+' : ''}{diff.percent.toFixed(1)}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SAYFA 3: GRAFİKLER */}
          <div className="page-break-after" style={{ 
            width: '1200px', 
            height: '848px', 
            padding: '40px',
            boxSizing: 'border-box',
            background: 'white'
          }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px', borderBottom: '3px solid #3b82f6', paddingBottom: '12px', color: '#1e3a8a' }}>
              Görsel Analiz
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              {/* Çeyreklik Net Kâr Grafiği */}
              <div style={{ 
                border: '1px solid #e5e7eb', 
                borderRadius: '16px', 
                padding: '20px', 
                background: 'white',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                height: '420px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
                  Çeyreklik Net Kâr Karşılaştırması
                </h3>
                <div style={{ width: '100%', height: '340px' }}>
                  <ChartContainer config={chartConfig} style={{ width: '100%', height: '100%' }}>
                    <ComposedChart data={quarterlyComparison} width={500} height={320}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis tickFormatter={(v) => formatCompactUSD(v)} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="scenarioANet" fill="#2563eb" name={scenarioA?.name} radius={4} />
                      <Bar dataKey="scenarioBNet" fill="#16a34a" name={scenarioB?.name} radius={4} />
                    </ComposedChart>
                  </ChartContainer>
                </div>
              </div>
              
              {/* Kümülatif Nakit Akışı Grafiği */}
              <div style={{ 
                border: '1px solid #e5e7eb', 
                borderRadius: '16px', 
                padding: '20px', 
                background: 'white',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                height: '420px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
                  Kümülatif Nakit Akışı
                </h3>
                <div style={{ width: '100%', height: '340px' }}>
                  <ChartContainer config={cumulativeChartConfig} style={{ width: '100%', height: '100%' }}>
                    <AreaChart data={quarterlyCumulativeData} width={500} height={320}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis tickFormatter={(v) => formatCompactUSD(v)} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Area type="monotone" dataKey="scenarioACumulative" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} name={scenarioA?.name} />
                      <Area type="monotone" dataKey="scenarioBCumulative" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} name={scenarioB?.name} />
                    </AreaChart>
                  </ChartContainer>
                </div>
              </div>
            </div>
          </div>

          {/* SAYFA 4: YATIRIMCI METRİKLERİ */}
          {unifiedAnalysis && (
            <div className="page-break-after" style={{ 
              width: '1200px', 
              height: '848px', 
              padding: '40px',
              boxSizing: 'border-box',
              background: 'white'
            }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px', borderBottom: '3px solid #3b82f6', paddingBottom: '12px', color: '#1e3a8a' }}>
                Yatırımcı Analizi
              </h2>
              
              {/* Deal Analysis Score */}
              {unifiedAnalysis.deal_analysis && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '24px',
                  padding: '20px',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  borderRadius: '16px',
                  color: 'white'
                }}>
                  <div>
                    <p style={{ fontSize: '14px', opacity: 0.9 }}>Anlaşma Skoru</p>
                    <p style={{ fontSize: '48px', fontWeight: 'bold' }}>{unifiedAnalysis.deal_analysis.deal_score}/100</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '14px', opacity: 0.9 }}>Değerleme Görüşü</p>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', textTransform: 'capitalize' }}>
                      {unifiedAnalysis.deal_analysis.valuation_verdict === 'premium' ? '💎 Premium' : 
                       unifiedAnalysis.deal_analysis.valuation_verdict === 'fair' ? '✅ Adil' : '💰 Ucuz'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', maxWidth: '400px' }}>
                    <p style={{ fontSize: '14px', opacity: 0.9 }}>Yatırımcı Çekiciliği</p>
                    <p style={{ fontSize: '13px', lineHeight: '1.4' }}>{unifiedAnalysis.deal_analysis.investor_attractiveness}</p>
                  </div>
                </div>
              )}

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
                {/* Deal Configuration */}
                <div style={{ 
                  padding: '20px', 
                  borderRadius: '12px', 
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Yatırım Miktarı</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a' }}>${dealConfig.investmentAmount.toLocaleString()}</p>
                </div>
                <div style={{ 
                  padding: '20px', 
                  borderRadius: '12px', 
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Equity Oranı</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a' }}>%{dealConfig.equityPercentage}</p>
                </div>
                <div style={{ 
                  padding: '20px', 
                  borderRadius: '12px', 
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Pre-Money Valuation</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a' }}>
                    ${((dealConfig.investmentAmount / dealConfig.equityPercentage) * 100 - dealConfig.investmentAmount).toLocaleString()}
                  </p>
                </div>
                <div style={{ 
                  padding: '20px', 
                  borderRadius: '12px', 
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Sektör Çarpanı</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a' }}>{dealConfig.sectorMultiple}x</p>
                </div>
              </div>

              {/* Risk Factors */}
              {unifiedAnalysis.deal_analysis?.risk_factors && unifiedAnalysis.deal_analysis.risk_factors.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>Risk Faktörleri</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {unifiedAnalysis.deal_analysis.risk_factors.slice(0, 6).map((risk, i) => (
                      <div key={i} style={{ 
                        padding: '12px 16px', 
                        background: '#fef2f2', 
                        borderRadius: '8px',
                        borderLeft: '3px solid #ef4444',
                        fontSize: '13px',
                        color: '#991b1b'
                      }}>
                        ⚠️ {risk}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exit Strategy Preview */}
              <div style={{ 
                padding: '20px', 
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                borderRadius: '12px',
                border: '1px solid #86efac'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#166534' }}>Çıkış Stratejisi</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>3 Yıllık MOIC</p>
                    <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#166534' }}>
                      {((summaryB?.netProfit || 0) * 3 / dealConfig.investmentAmount + 1).toFixed(1)}x
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>5 Yıllık MOIC</p>
                    <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#166534' }}>
                      {((summaryB?.netProfit || 0) * 5 / dealConfig.investmentAmount + 1).toFixed(1)}x
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#166534', marginBottom: '4px' }}>Tahmini ROI</p>
                    <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#166534' }}>
                      +{(((summaryB?.netProfit || 0) * 3 / dealConfig.investmentAmount) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SAYFA 5: GLOBAL VİZYON */}
          {unifiedAnalysis?.next_year_projection && (
            <div className="page-break-after" style={{ 
              width: '1200px', 
              height: '848px', 
              padding: '40px',
              boxSizing: 'border-box',
              background: 'white'
            }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px', borderBottom: '3px solid #3b82f6', paddingBottom: '12px', color: '#1e3a8a' }}>
                {(scenarioB?.targetYear || new Date().getFullYear()) + 1} Yılı Global Vizyonu
              </h2>
              
              {/* Strategy Note */}
              <div style={{ 
                marginBottom: '24px', 
                padding: '20px', 
                background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)', 
                borderRadius: '16px', 
                border: '1px solid #bfdbfe' 
              }}>
                <p style={{ fontSize: '16px', color: '#1e3a8a', fontStyle: 'italic', lineHeight: '1.6' }}>
                  "{unifiedAnalysis.next_year_projection.strategy_note}"
                </p>
              </div>

              {/* Virtual Opening Balance & Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
                {unifiedAnalysis.next_year_projection.virtual_opening_balance && (
                  <>
                    <div style={{ padding: '20px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Açılış Nakit</p>
                      <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e3a8a' }}>
                        ${unifiedAnalysis.next_year_projection.virtual_opening_balance.opening_cash?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div style={{ padding: '20px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Savaş Fonu Durumu</p>
                      <p style={{ 
                        fontSize: '20px', 
                        fontWeight: 'bold', 
                        color: unifiedAnalysis.next_year_projection.virtual_opening_balance.war_chest_status === 'Hazır' ? '#16a34a' : 
                               unifiedAnalysis.next_year_projection.virtual_opening_balance.war_chest_status === 'Yakın' ? '#f59e0b' : '#ef4444'
                      }}>
                        {unifiedAnalysis.next_year_projection.virtual_opening_balance.war_chest_status === 'Hazır' ? '🟢' : 
                         unifiedAnalysis.next_year_projection.virtual_opening_balance.war_chest_status === 'Yakın' ? '🟡' : '🔴'} {unifiedAnalysis.next_year_projection.virtual_opening_balance.war_chest_status}
                      </p>
                    </div>
                  </>
                )}
                <div style={{ padding: '20px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #86efac' }}>
                  <p style={{ fontSize: '12px', color: '#166534', marginBottom: '8px', textTransform: 'uppercase' }}>Tahmini Yıllık Gelir</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#166534' }}>
                    ${unifiedAnalysis.next_year_projection.summary?.total_revenue?.toLocaleString() || '0'}
                  </p>
                </div>
                <div style={{ padding: '20px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #86efac' }}>
                  <p style={{ fontSize: '12px', color: '#166534', marginBottom: '8px', textTransform: 'uppercase' }}>Tahmini Net Kâr</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#166534' }}>
                    ${unifiedAnalysis.next_year_projection.summary?.net_profit?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>

              {/* Quarterly Events */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>Çeyreklik Hedefler</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  {(['q1', 'q2', 'q3', 'q4'] as const).map((q, i) => {
                    const quarterData = unifiedAnalysis.next_year_projection.quarterly?.[q];
                    return (
                      <div key={q} style={{ 
                        padding: '16px', 
                        borderRadius: '12px', 
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <span style={{ 
                            background: '#3b82f6', 
                            color: 'white', 
                            padding: '4px 10px', 
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold'
                          }}>Q{i + 1}</span>
                        </div>
                        <p style={{ fontSize: '14px', color: '#374151', fontWeight: '500', marginBottom: '8px', minHeight: '40px' }}>
                          {quarterData?.key_event || '-'}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280' }}>
                          <span>Gelir: ${quarterData?.revenue?.toLocaleString() || '0'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Investor Hooks */}
              {unifiedAnalysis.next_year_projection.investor_hook && (
                <div style={{ 
                  padding: '20px', 
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  borderRadius: '12px',
                  border: '1px solid #f59e0b'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#92400e' }}>Yatırımcı Çekici Noktalar</h3>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <span style={{ background: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', color: '#1e3a8a' }}>
                      📈 {unifiedAnalysis.next_year_projection.investor_hook.revenue_growth_yoy}
                    </span>
                    <span style={{ background: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', color: '#166534' }}>
                      💰 {unifiedAnalysis.next_year_projection.investor_hook.margin_improvement}
                    </span>
                    <span style={{ background: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', color: '#7c3aed' }}>
                      🎯 {unifiedAnalysis.next_year_projection.investor_hook.valuation_multiple_target}
                    </span>
                    <span style={{ background: 'white', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '500', color: '#0d9488' }}>
                      🛡️ {unifiedAnalysis.next_year_projection.investor_hook.competitive_moat}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SAYFA 6: AI INSIGHTS */}
          {unifiedAnalysis?.insights && unifiedAnalysis.insights.length > 0 && (
            <div className="page-break-after" style={{ 
              width: '1200px', 
              height: '848px', 
              padding: '40px',
              boxSizing: 'border-box',
              background: 'white'
            }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px', borderBottom: '3px solid #3b82f6', paddingBottom: '12px', color: '#1e3a8a' }}>
                AI Analiz Sonuçları
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                {unifiedAnalysis.insights.slice(0, 6).map((insight, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      padding: '20px', 
                      borderRadius: '12px', 
                      borderLeft: `5px solid ${insight.severity === 'high' ? '#ef4444' : insight.severity === 'medium' ? '#f59e0b' : '#22c55e'}`,
                      background: insight.severity === 'high' ? '#fef2f2' : insight.severity === 'medium' ? '#fffbeb' : '#f0fdf4',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    <h4 style={{ fontWeight: '600', marginBottom: '8px', color: '#111827', fontSize: '15px' }}>{insight.title}</h4>
                    <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>{insight.description}</p>
                  </div>
                ))}
              </div>
              
              {/* Öneriler */}
              {unifiedAnalysis.recommendations && unifiedAnalysis.recommendations.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>Stratejik Öneriler</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {unifiedAnalysis.recommendations.slice(0, 4).map((rec, i) => (
                      <div key={i} style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <span style={{ 
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)', 
                            color: 'white', 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontSize: '12px', 
                            fontWeight: 'bold' 
                          }}>
                            {rec.priority || i + 1}
                          </span>
                          <span style={{ fontWeight: '600', fontSize: '14px', color: '#1e3a8a' }}>{rec.title}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SAYFA 7: PITCH DECK - Son sayfa (page-break-after yok) */}
          {unifiedAnalysis?.pitch_deck?.slides && unifiedAnalysis.pitch_deck.slides.length > 0 && (
            <div style={{ 
              width: '1200px', 
              height: '848px', 
              padding: '40px',
              boxSizing: 'border-box',
              background: 'white'
            }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', borderBottom: '3px solid #3b82f6', paddingBottom: '12px', color: '#1e3a8a' }}>
                Yatırımcı Sunumu
              </h2>
              
              {/* Executive Summary */}
              {unifiedAnalysis.pitch_deck.executive_summary && (
                <div style={{ marginBottom: '24px', padding: '20px', background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)', borderRadius: '16px', border: '1px solid #bfdbfe' }}>
                  <p style={{ fontSize: '15px', color: '#374151', fontStyle: 'italic', lineHeight: '1.6' }}>
                    "{unifiedAnalysis.pitch_deck.executive_summary}"
                  </p>
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {unifiedAnalysis.pitch_deck.slides.slice(0, 4).map((slide, i) => (
                  <div key={i} style={{ 
                    background: 'linear-gradient(to bottom right, #f8fafc, white)', 
                    padding: '20px', 
                    borderRadius: '16px', 
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <span style={{ 
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)', 
                        color: 'white', 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '14px', 
                        fontWeight: 'bold' 
                      }}>
                        {slide.slide_number}
                      </span>
                      <h3 style={{ fontWeight: '600', fontSize: '16px', color: '#1e3a8a' }}>{slide.title}</h3>
                    </div>
                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                      {slide.content_bullets?.slice(0, 3).map((bullet, j) => (
                        <li key={j} style={{ fontSize: '13px', color: '#4b5563', marginBottom: '6px', lineHeight: '1.4' }}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>
      </div>
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
