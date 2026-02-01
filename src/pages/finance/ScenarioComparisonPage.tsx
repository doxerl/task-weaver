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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  Activity,
  Calculator,
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
  EditableProjectionItem,
  InvestmentAllocation,
  YearlyBalanceSheet,
  safeArray
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
import { AIAnalysisSummaryCard } from '@/components/simulation/AIAnalysisSummaryCard';
import { AIAnalysisDetails } from '@/components/simulation/AIAnalysisDetails';
import { PdfExportContainer } from '@/components/simulation/pdf';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { useExchangeRates } from '@/hooks/finance/useExchangeRates';
import { getProjectionYears, calculateInternalGrowthRate } from '@/utils/yearCalculations';
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

// ============================================
// CONSTANTS (imported from centralized file)
// ============================================
import {
  GROWTH_MULTIPLIERS,
  DISPLAY_LIMITS,
  FINANCIAL_ASSUMPTIONS,
  QUARTERS,
} from '@/constants/simulation';

// Destructure for backward compatibility
const DEFAULT_REVENUE_GROWTH_MULTIPLIER = GROWTH_MULTIPLIERS.REVENUE;
const DEFAULT_EXPENSE_GROWTH_MULTIPLIER = GROWTH_MULTIPLIERS.EXPENSE;
const MAX_DISPLAY_ITEMS = DISPLAY_LIMITS.FOCUS_PROJECTS;
const MAX_METRICS_DISPLAY = DISPLAY_LIMITS.METRICS;
const MAX_RECOMMENDATIONS_DISPLAY = DISPLAY_LIMITS.RECOMMENDATIONS;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Deep clone an object without using JSON.parse/stringify
 * Handles most common data types safely
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => deepClone(item)) as T;
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Safely get array element with default value
 */
function safeArrayAccess<T>(arr: T[], index: number, defaultValue: T): T {
  return arr[index] ?? defaultValue;
}

/**
 * Calculate quarterly values with growth multiplier
 */
function calculateQuarterlyWithGrowth(
  baseQuarterly: { q1?: number; q2?: number; q3?: number; q4?: number } | undefined,
  baseAmount: number,
  growthMultiplier: number
): { q1: number; q2: number; q3: number; q4: number; total: number } {
  const defaultQuarter = baseAmount / 4;
  const q1 = Math.round((baseQuarterly?.q1 || defaultQuarter) * growthMultiplier);
  const q2 = Math.round((baseQuarterly?.q2 || defaultQuarter) * growthMultiplier);
  const q3 = Math.round((baseQuarterly?.q3 || defaultQuarter) * growthMultiplier);
  const q4 = Math.round((baseQuarterly?.q4 || defaultQuarter) * growthMultiplier);
  return { q1, q2, q3, q4, total: q1 + q2 + q3 + q4 };
}

/**
 * Sanitize filename by removing invalid characters
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove invalid chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 100); // Limit length
}

/**
 * Safe division that returns default value when dividing by zero
 */
function safeDivide(numerator: number, denominator: number, defaultValue: number = 0): number {
  return denominator !== 0 ? numerator / denominator : defaultValue;
}

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

const calculateDiff = (a: number, b: number): { absolute: number; percent: number } => {
  const diff = b - a;
  const percent = a !== 0 ? ((b - a) / Math.abs(a)) * 100 : b !== 0 ? 100 : 0;
  return { absolute: diff, percent };
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

const DiffBadge = ({ diff, format, higherIsBetter }: { diff: { absolute: number; percent: number }; format: 'currency' | 'percent' | 'number'; higherIsBetter: boolean }) => {
  const isPositive = diff.absolute > 0;
  const isNeutral = diff.absolute === 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;
  if (isNeutral) return <Badge variant="secondary" className="gap-1"><Minus className="h-3 w-3" />-</Badge>;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isGood ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30';
  return (
    <Badge variant="outline" className={`gap-1 ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {isPositive ? '+' : ''}{format === 'percent' ? `${diff.absolute.toFixed(1)}pp` : `${diff.percent.toFixed(1)}%`}
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
                        {item.analysisType === 'investor_pitch' 
                          ? `Yatırımcı analizi ${item.investorAnalysis ? '✓' : ''}`
                          : item.analysisType === 'unified'
                          ? `Kapsamlı analiz`
                          : `${item.insights?.length || 0} çıkarım, ${item.recommendations?.length || 0} öneri`
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
  
  const quarterlyChartRef = useRef<HTMLDivElement>(null);
  const cumulativeChartRef = useRef<HTMLDivElement>(null);
  const presentationPdfRef = useRef<HTMLDivElement>(null);
  
  // Sheet states
  const [selectedHistoricalAnalysis, setSelectedHistoricalAnalysis] = useState<AnalysisHistoryItem | null>(null);
  const [historySheetType, setHistorySheetType] = useState<'scenario_comparison' | 'investor_pitch'>('scenario_comparison');
  const [showPitchDeck, setShowPitchDeck] = useState(false);
  
  // Focus Project State - yatırım odak projesi (çoklu seçim destekli)
  const [focusProjects, setFocusProjects] = useState<string[]>([]);
  const [focusProjectPlan, setFocusProjectPlan] = useState<string>('');
  // Organik büyüme oranı (non-focus projeler için)
  const [organicGrowthRate, setOrganicGrowthRate] = useState<number>(5); // Default %5
  
  // Handler for multi-select focus projects (max 2)
  const handleFocusProjectsChange = useCallback((projects: string[]) => {
    if (projects.length > 2) {
      toast.warning('En fazla 2 proje seçebilirsiniz');
      return;
    }
    setFocusProjects(projects);
  }, []);
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
  // Kullanıcı düzenlemelerini koruma seçeneği
  const [preserveUserEdits, setPreserveUserEdits] = useState(true);

  // Kullanıcının düzenleme yapıp yapmadığını kontrol et
  const hasUserEdits = editableRevenueProjection.some(i => i.userEdited) ||
                       editableExpenseProjection.some(i => i.userEdited);

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
    clearAnalysis: clearUnifiedAnalysis,
    saveEditedProjections
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
    
    // Scenario A revenues by quarter - sorted by total descending
    const aRevenuesByQuarter = scenarioA.revenues.map(r => ({
      category: r.category,
      q1: r.projectedQuarterly?.q1 || r.projectedAmount / 4,
      q2: r.projectedQuarterly?.q2 || r.projectedAmount / 4,
      q3: r.projectedQuarterly?.q3 || r.projectedAmount / 4,
      q4: r.projectedQuarterly?.q4 || r.projectedAmount / 4,
      total: r.projectedAmount
    })).sort((a, b) => b.total - a.total);

    // Scenario A expenses by quarter - sorted by total descending
    const aExpensesByQuarter = scenarioA.expenses.map(e => ({
      category: e.category,
      q1: e.projectedQuarterly?.q1 || e.projectedAmount / 4,
      q2: e.projectedQuarterly?.q2 || e.projectedAmount / 4,
      q3: e.projectedQuarterly?.q3 || e.projectedAmount / 4,
      q4: e.projectedQuarterly?.q4 || e.projectedAmount / 4,
      total: e.projectedAmount
    })).sort((a, b) => b.total - a.total);

    // Scenario B revenues by quarter - sorted by total descending
    const bRevenuesByQuarter = scenarioB.revenues.map(r => ({
      category: r.category,
      q1: r.projectedQuarterly?.q1 || r.projectedAmount / 4,
      q2: r.projectedQuarterly?.q2 || r.projectedAmount / 4,
      q3: r.projectedQuarterly?.q3 || r.projectedAmount / 4,
      q4: r.projectedQuarterly?.q4 || r.projectedAmount / 4,
      total: r.projectedAmount
    })).sort((a, b) => b.total - a.total);

    // Scenario B expenses by quarter - sorted by total descending
    const bExpensesByQuarter = scenarioB.expenses.map(e => ({
      category: e.category,
      q1: e.projectedQuarterly?.q1 || e.projectedAmount / 4,
      q2: e.projectedQuarterly?.q2 || e.projectedAmount / 4,
      q3: e.projectedQuarterly?.q3 || e.projectedAmount / 4,
      q4: e.projectedQuarterly?.q4 || e.projectedAmount / 4,
      total: e.projectedAmount
    })).sort((a, b) => b.total - a.total);
    
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
  const [historicalBalance, setHistoricalBalance] = useState<YearlyBalanceSheet | null>(null);
  
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
    const shortTermDebt = (historicalBalance.trade_payables || 0) + ((historicalBalance.bank_loans || 0) * FINANCIAL_ASSUMPTIONS.SHORT_TERM_DEBT_RATIO);
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
    const defaultQuarter = { scenarioBNet: 0 };
    const capitalNeeds = calculateCapitalNeeds({
      q1: safeArrayAccess(quarterlyComparison, 0, defaultQuarter).scenarioBNet,
      q2: safeArrayAccess(quarterlyComparison, 1, defaultQuarter).scenarioBNet,
      q3: safeArrayAccess(quarterlyComparison, 2, defaultQuarter).scenarioBNet,
      q4: safeArrayAccess(quarterlyComparison, 3, defaultQuarter).scenarioBNet
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

  // =====================================================
  // PDF EXIT PLAN - UI ile aynı hesaplama (Merkezi)
  // =====================================================
  const pdfExitPlan = useMemo(() => {
    if (!scenarioA || !summaryA || !dealConfig) return null;
    
    const baseRevenue = scenarioA.revenues?.reduce(
      (sum, r) => sum + (r.baseAmount || 0), 0
    ) || 0;
    const growthRate = calculateInternalGrowthRate(
      baseRevenue, 
      summaryA.totalRevenue, 
      0.10
    );
    
    return calculateExitPlan(
      dealConfig, 
      summaryA.totalRevenue, 
      summaryA.totalExpense, 
      growthRate
    );
  }, [scenarioA, summaryA, dealConfig]);

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

  // Sync focus project settings from cached analysis
  useEffect(() => {
    if (unifiedCachedInfo) {
      // Load focus project settings from cache
      if (unifiedCachedInfo.focusProjects && unifiedCachedInfo.focusProjects.length > 0) {
        setFocusProjects(unifiedCachedInfo.focusProjects);
      }
      if (unifiedCachedInfo.focusProjectPlan) {
        setFocusProjectPlan(unifiedCachedInfo.focusProjectPlan);
      }
      if (unifiedCachedInfo.investmentAllocation) {
        setInvestmentAllocation(unifiedCachedInfo.investmentAllocation);
      }
      // Load edited projections from cache
      if (unifiedCachedInfo.editedRevenueProjection && unifiedCachedInfo.editedRevenueProjection.length > 0) {
        setEditableRevenueProjection(unifiedCachedInfo.editedRevenueProjection);
        setOriginalRevenueProjection(deepClone(unifiedCachedInfo.editedRevenueProjection));
      }
      if (unifiedCachedInfo.editedExpenseProjection && unifiedCachedInfo.editedExpenseProjection.length > 0) {
        setEditableExpenseProjection(unifiedCachedInfo.editedExpenseProjection);
        setOriginalExpenseProjection(deepClone(unifiedCachedInfo.editedExpenseProjection));
      }
    }
  }, [unifiedCachedInfo]);

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
  // UPDATED: AI'ın itemized_revenues/expenses verilerini öncelikli olarak kullan
  // UPDATED: Kullanıcı düzenlemelerini koruma seçeneği eklendi
  useEffect(() => {
    if (unifiedAnalysis?.next_year_projection && scenarioA) {
      const projection = unifiedAnalysis.next_year_projection;

      // Kullanıcı düzenlemelerini koru - eğer preserveUserEdits true ve mevcut düzenlemeler varsa
      const currentHasUserEdits = editableRevenueProjection.some(i => i.userEdited) ||
                                  editableExpenseProjection.some(i => i.userEdited);

      if (preserveUserEdits && currentHasUserEdits) {
        console.log('[Editable Sync] Preserving user edits - skipping AI projection override');
        toast.info('Kullanıcı düzenlemeleri korundu. Yeni AI projeksiyonunu görmek için "Düzenlemeleri Sıfırla" kullanın.');
        return; // Kullanıcı düzenlemelerini koru, AI sonuçlarını uygulama
      }

      // YENİ: AI'dan gelen itemized veriler varsa bunları kullan
      if (projection.itemized_revenues && projection.itemized_revenues.length > 0) {
        console.log('[Editable Sync] Using AI itemized_revenues:', projection.itemized_revenues.length, 'items');
        const revenueItems: EditableProjectionItem[] = projection.itemized_revenues.map(item => ({
          category: item.category,
          q1: Math.round(item.q1),
          q2: Math.round(item.q2),
          q3: Math.round(item.q3),
          q4: Math.round(item.q4),
          total: Math.round(item.total || (item.q1 + item.q2 + item.q3 + item.q4)),
          aiGenerated: true,
          userEdited: false
        }));
        setEditableRevenueProjection(revenueItems);
        setOriginalRevenueProjection(deepClone(revenueItems));
      } else {
        // Fallback: AI itemized veri üretmediyse, dinamik çarpan ile senaryo verilerini kullan
        console.log('[Editable Sync] Fallback: Using scenario data with dynamic multiplier');
        const baseRevenue = scenarioA.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
        const aiTotalRevenue = projection.summary?.total_revenue || baseRevenue * DEFAULT_REVENUE_GROWTH_MULTIPLIER;
        const growthMultiplier = safeDivide(aiTotalRevenue, baseRevenue, DEFAULT_REVENUE_GROWTH_MULTIPLIER);

        const revenueItems: EditableProjectionItem[] = scenarioA.revenues.map(r => {
          const quarterly = calculateQuarterlyWithGrowth(r.projectedQuarterly, r.projectedAmount, growthMultiplier);
          return {
            category: r.category,
            ...quarterly,
            aiGenerated: true,
            userEdited: false
          };
        });
        setEditableRevenueProjection(revenueItems);
        setOriginalRevenueProjection(deepClone(revenueItems));
      }
      
      // YENİ: AI'dan gelen itemized expense veriler varsa bunları kullan
      if (projection.itemized_expenses && projection.itemized_expenses.length > 0) {
        console.log('[Editable Sync] Using AI itemized_expenses:', projection.itemized_expenses.length, 'items');
        const expenseItems: EditableProjectionItem[] = projection.itemized_expenses.map(item => ({
          category: item.category,
          q1: Math.round(item.q1),
          q2: Math.round(item.q2),
          q3: Math.round(item.q3),
          q4: Math.round(item.q4),
          total: Math.round(item.total || (item.q1 + item.q2 + item.q3 + item.q4)),
          aiGenerated: true,
          userEdited: false
        }));
        setEditableExpenseProjection(expenseItems);
        setOriginalExpenseProjection(deepClone(expenseItems));
      } else {
        // Fallback: AI itemized veri üretmediyse, dinamik çarpan ile senaryo verilerini kullan
        const baseExpenses = scenarioA.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
        const aiTotalExpenses = projection.summary?.total_expenses || baseExpenses * DEFAULT_EXPENSE_GROWTH_MULTIPLIER;
        const expenseGrowthMultiplier = safeDivide(aiTotalExpenses, baseExpenses, DEFAULT_EXPENSE_GROWTH_MULTIPLIER);

        const expenseItems: EditableProjectionItem[] = scenarioA.expenses.map(e => {
          const quarterly = calculateQuarterlyWithGrowth(e.projectedQuarterly, e.projectedAmount, expenseGrowthMultiplier);
          return {
            category: e.category,
            ...quarterly,
            aiGenerated: true,
            userEdited: false
          };
        });
        setEditableExpenseProjection(expenseItems);
        setOriginalExpenseProjection(deepClone(expenseItems));
      }
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
    setEditableRevenueProjection(deepClone(originalRevenueProjection));
  }, [originalRevenueProjection]);

  const handleResetExpenseProjection = useCallback(() => {
    setEditableExpenseProjection(deepClone(originalExpenseProjection));
  }, [originalExpenseProjection]);
  
  // Auto-save edited projections with debounce (2 seconds)
  const saveProjectionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!scenarioAId || !scenarioBId) return;
    
    const hasEdits = editableRevenueProjection.some(i => i.userEdited) || 
                     editableExpenseProjection.some(i => i.userEdited);
    
    if (!hasEdits) return;
    
    // Clear previous timeout
    if (saveProjectionsTimeoutRef.current) {
      clearTimeout(saveProjectionsTimeoutRef.current);
    }
    
    // Debounce save (2 seconds)
    saveProjectionsTimeoutRef.current = setTimeout(() => {
      saveEditedProjections(scenarioAId, scenarioBId, editableRevenueProjection, editableExpenseProjection);
    }, 2000);
    
    return () => {
      if (saveProjectionsTimeoutRef.current) {
        clearTimeout(saveProjectionsTimeoutRef.current);
      }
    };
  }, [editableRevenueProjection, editableExpenseProjection, scenarioAId, scenarioBId, saveEditedProjections]);
  
  // Editable Pitch Deck State
  const [editablePitchDeck, setEditablePitchDeck] = useState<{ slides: any[]; executive_summary: string } | null>(null);
  const [pitchDeckEditMode, setPitchDeckEditMode] = useState(false);
  
  // Sync editable pitch deck when unified analysis changes
  useEffect(() => {
    if (unifiedAnalysis?.pitch_deck) {
      setEditablePitchDeck({
        slides: deepClone(unifiedAnalysis.pitch_deck.slides || []),
        executive_summary: typeof unifiedAnalysis.pitch_deck.executive_summary === 'string'
          ? unifiedAnalysis.pitch_deck.executive_summary
          : unifiedAnalysis.pitch_deck.executive_summary?.short_pitch || ''
      });
    }
  }, [unifiedAnalysis?.pitch_deck]);
  
  // Pitch deck edit handlers
  const handlePitchSlideChange = useCallback((index: number, field: string, value: string | string[]) => {
    setEditablePitchDeck(prev => {
      if (!prev) return prev;
      const newSlides = [...prev.slides];
      newSlides[index] = { ...newSlides[index], [field]: value };
      return { ...prev, slides: newSlides };
    });
  }, []);
  
  const handleExecutiveSummaryChange = useCallback((value: string) => {
    setEditablePitchDeck(prev => prev ? { ...prev, executive_summary: value } : prev);
  }, []);
  
  const handleAddBullet = useCallback((slideIndex: number) => {
    setEditablePitchDeck(prev => {
      if (!prev) return prev;
      const newSlides = [...prev.slides];
      const currentBullets = newSlides[slideIndex]?.content_bullets || [];
      newSlides[slideIndex] = { ...newSlides[slideIndex], content_bullets: [...currentBullets, ''] };
      return { ...prev, slides: newSlides };
    });
  }, []);
  
  const handleRemoveBullet = useCallback((slideIndex: number, bulletIndex: number) => {
    setEditablePitchDeck(prev => {
      if (!prev) return prev;
      const newSlides = [...prev.slides];
      const currentBullets = [...(newSlides[slideIndex]?.content_bullets || [])];
      currentBullets.splice(bulletIndex, 1);
      newSlides[slideIndex] = { ...newSlides[slideIndex], content_bullets: currentBullets };
      return { ...prev, slides: newSlides };
    });
  }, []);

  // Unified AI Analysis Handler - TEK BUTON, TÜM GÜÇ
  const handleUnifiedAnalysis = async () => {
    if (!scenarioA || !scenarioB || !summaryA || !summaryB) return;
    
    // Get year context for projections
    const years = getProjectionYears();
    
    // Get average exchange rate for TL to USD conversion (fallback to 39 if not available)
    const averageRate = yearlyAverageRate || 39;
    
    // Fetch historical balance for base year (converted to USD)
    // Base year = completed year = scenarioA.baseYear (e.g., 2025)
    const historicalBalance = scenarioA.baseYear 
      ? await fetchHistoricalBalance(scenarioA.baseYear, averageRate) 
      : null;
    
    // Validate quarterlyComparison array has required length
    if (!quarterlyComparison || quarterlyComparison.length < 4) {
      toast.error('Çeyreklik veri eksik. Lütfen senaryoları kontrol edin.');
      setIsAnalyzing(false);
      return;
    }

    // Quarterly data from POSITIVE scenario (A) for capital needs
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
    
    // Calculate capital needs from POSITIVE SCENARIO (A) - this is the investment target
    const capitalNeeds = calculateCapitalNeeds(quarterlyA);
    
    // Calculate growth rate from POSITIVE SCENARIO (A) internal growth (base → projected)
    const baseRevenue = scenarioA.revenues.reduce((sum, r) => sum + (r.baseAmount || 0), 0);
    const projectedRevenue = summaryA.totalRevenue;
    const growthRate = calculateInternalGrowthRate(baseRevenue, projectedRevenue, 0.10);
    
    // Senaryo yılını hesapla - max(A.targetYear, B.targetYear)
    const scenarioTargetYear = Math.max(scenarioA.targetYear || 2026, scenarioB.targetYear || 2026);
    
    // Exit Plan uses POSITIVE SCENARIO (A) data - this is what investors see
    const exitPlan = calculateExitPlan(
      dealConfig, 
      summaryA.totalRevenue,   // Positive scenario revenue
      summaryA.totalExpense,   // Positive scenario expenses
      growthRate,
      'default',
      scenarioTargetYear
    );
    
    // Prepare focus project info if projects are selected
    let focusProjectInfo: FocusProjectInfo | undefined;
    if (focusProjects.length > 0 && scenarioA?.revenues) {
      const projects = focusProjects.map(projectName => {
        const revenueItemA = scenarioA.revenues.find(r => r.category === projectName);
        return {
          projectName,
          currentRevenue: revenueItemA?.baseAmount || 0,        // Base year value (2025)
          projectedRevenue: revenueItemA?.projectedAmount || 0  // Positive scenario target (2026)
        };
      });
      
      const combinedCurrentRevenue = projects.reduce((sum, p) => sum + p.currentRevenue, 0);
      const combinedProjectedRevenue = projects.reduce((sum, p) => sum + p.projectedRevenue, 0);
      
      focusProjectInfo = {
        projects,
        combinedCurrentRevenue,
        combinedProjectedRevenue,
        growthPlan: focusProjectPlan,
        investmentAllocation: investmentAllocation as InvestmentAllocation,
        yearContext: {
          baseYear: years.baseYear,          // 2025
          scenarioYear: years.year1,         // 2026
          projectionYears: {
            year2: years.year2,              // 2027
            year3: years.year3,              // 2029
            year5: years.year5               // 2031
          }
        },
        organicGrowthRate // Non-focus projeler için organik büyüme oranı
      };
    }
    
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
      averageRate,
      focusProjectInfo
    );
  };

  // Create next year scenario from AI projection
  // PDF Presentation Handler - HTML yakalama ile (Türkçe karakter + grafik desteği)
  const handleExportPresentationPdf = useCallback(async () => {
    // Validation
    if (!scenarioA || !scenarioB) {
      toast.error('Senaryo verileri eksik');
      return;
    }
    if (!summaryA || !summaryB) {
      toast.error('Senaryo özet verileri hesaplanamadı');
      return;
    }
    if (!presentationPdfRef.current) {
      toast.error('PDF içeriği yüklenemedi, sayfayı yenileyin');
      return;
    }

    // Check if ref has content
    if (!presentationPdfRef.current.innerHTML || presentationPdfRef.current.innerHTML.trim() === '') {
      toast.error('PDF içeriği boş, lütfen bekleyin ve tekrar deneyin');
      return;
    }

    toast.info('PDF hazırlanıyor...');

    try {
      const safeNameA = sanitizeFilename(scenarioA.name);
      const safeNameB = sanitizeFilename(scenarioB.name);
      const filename = `Senaryo_Sunum_${safeNameA}_vs_${safeNameB}.pdf`;

      const success = await generatePdfFromElement(presentationPdfRef, {
        filename,
        orientation: 'landscape',
        margin: 10,
        scale: 1.5, // Reduced from 2 for better performance
        fitToPage: true, // Changed to true to prevent content cutoff
        onProgress: (stage, percent) => {
          console.log(`[PDF] ${stage}: ${percent}%`);
        }
      });

      if (success) {
        toast.success('PDF sunumu oluşturuldu!');
      } else {
        toast.error('PDF oluşturulamadı, lütfen tekrar deneyin');
      }
    } catch (error) {
      console.error('[PDF Export Error]', error);
      toast.error('PDF oluşturulurken hata oluştu: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
    }
  }, [scenarioA, scenarioB, summaryA, summaryB, generatePdfFromElement]);

  const handleCreateNextYear = async () => {
    if (!unifiedAnalysis?.next_year_projection || !scenarioA || !scenarioB) return;
    
    // Pass both scenarios + focusProjects for selective growth
    // Only focus projects get growth multiplier, others stay static
    const newScenario = await createNextYearFromAI(
      scenarioA, 
      scenarioB, 
      unifiedAnalysis.next_year_projection,
      focusProjects  // Seçili odak projeler - sadece bunlara büyüme uygulanır
    );
    if (newScenario) {
      const focusNote = focusProjects.length > 0 
        ? ` (Odak: ${focusProjects.join(', ')})`
        : '';
      toast.success(`${newScenario.targetYear} yılı senaryosu oluşturuldu!${focusNote}`);
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
                    {scenarioA?.targetYear || '?'} {scenarioA && scenarioB && scenarioA.targetYear > scenarioB.targetYear ? 'Büyüme' : 'Pozitif'}
                  </Badge>
                  Senaryo A
                </label>
                <Select value={scenarioAId || ''} onValueChange={setScenarioAId}>
                  <SelectTrigger><SelectValue placeholder="Senaryo seçin..." /></SelectTrigger>
                  <SelectContent>
                    {scenariosWithProfit.map((s) => (
                      <SelectItem key={s.id} value={s.id!} disabled={s.id === scenarioBId}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="font-medium">{s.targetYear}</span>
                          <span className="truncate">{s.name}</span>
                          <Badge 
                            variant="outline" 
                            className={s.scenarioType === 'negative'
                              ? 'bg-red-500/10 text-red-500 border-red-500/30 text-xs' 
                              : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs'
                            }
                          >
                            {s.scenarioType === 'negative' ? 'Negatif' : 'Pozitif'}
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
                    {scenarioB?.targetYear || '?'} {scenarioA && scenarioB && scenarioA.targetYear > scenarioB.targetYear ? 'Baz' : 'Negatif'}
                  </Badge>
                  Senaryo B
                </label>
                <Select value={scenarioBId || ''} onValueChange={setScenarioBId}>
                  <SelectTrigger><SelectValue placeholder="Senaryo seçin..." /></SelectTrigger>
                  <SelectContent>
                    {scenariosWithProfit.map((s) => (
                      <SelectItem key={s.id} value={s.id!} disabled={s.id === scenarioAId}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="font-medium">{s.targetYear}</span>
                          <span className="truncate">{s.name}</span>
                          <Badge 
                            variant="outline" 
                            className={s.scenarioType === 'negative'
                              ? 'bg-red-500/10 text-red-500 border-red-500/30 text-xs' 
                              : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs'
                            }
                          >
                            {s.scenarioType === 'negative' ? 'Negatif' : 'Pozitif'}
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
            {/* AI ANALYSIS SUMMARY - EN ÜSTTE */}
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
                
                {/* Calculate projection year dynamically: max(A.year, B.year) + 1 */}
                {(() => {
                  const maxScenarioYear = Math.max(
                    scenarioA?.targetYear || new Date().getFullYear(),
                    scenarioB?.targetYear || new Date().getFullYear()
                  );
                  const fallbackProjectionYear = maxScenarioYear + 1;
                  
                  return (
                    <AIAnalysisSummaryCard
                      unifiedAnalysis={unifiedAnalysis}
                      isLoading={unifiedLoading}
                      onAnalyze={handleUnifiedAnalysis}
                      onShowPitchDeck={() => setShowPitchDeck(true)}
                      onCreateNextYear={handleCreateNextYear}
                      targetYear={maxScenarioYear}
                      cachedAt={unifiedCachedInfo?.updatedAt || null}
                      scenarioA={scenarioA}
                      scenarioB={scenarioB}
                      summaryA={summaryA}
                      summaryB={summaryB}
                      projectionYear={unifiedAnalysis?.next_year_projection?.projection_year || fallbackProjectionYear}
                    />
                  );
                })()}
                
                {/* AI Analysis Details - Collapsible - Sayfanın başında */}
                <AIAnalysisDetails
                  unifiedAnalysis={unifiedAnalysis}
                  targetYear={scenarioB?.targetYear}
                />
                
                {/* Analysis History - Right below AI Summary Card for visibility */}
                <AnalysisHistoryPanel
                  history={unifiedAnalysisHistory}
                  isLoading={unifiedHistoryLoading}
                  onSelectHistory={handleSelectUnifiedHistory}
                  analysisType="scenario_comparison"
                />
              </>
            )}

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

            {/* SECTION 2.5: PROFESSIONAL ANALYSIS PANELS - ACCORDION */}
            {(financialRatios || sensitivityAnalysis || itemTrendAnalysis || quarterlyItemized) && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Profesyonel Analiz Metrikleri
                </h3>
                
                <Accordion type="multiple" defaultValue={['financial-ratios']} className="space-y-2">
                  {/* Senaryo Karşılaştırması */}
                  {quarterlyItemized && (
                    <AccordionItem value="scenario-comparison" className="border rounded-lg bg-card">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <ArrowLeftRight className="h-4 w-4 text-blue-400" />
                          <span>Senaryo Karşılaştırması</span>
                          <Badge variant="secondary" className="ml-2">
                            {(quarterlyItemized.scenarioA?.revenues?.length || 0) + (quarterlyItemized.scenarioA?.expenses?.length || 0)} kalem
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <ScenarioComparisonCards 
                            quarterlyItemized={quarterlyItemized} 
                            type="revenues" 
                            scenarioAYear={scenarioA?.targetYear}
                            scenarioBYear={scenarioB?.targetYear}
                            scenarioAName={scenarioA?.name}
                            scenarioBName={scenarioB?.name}
                          />
                          <ScenarioComparisonCards 
                            quarterlyItemized={quarterlyItemized} 
                            type="expenses" 
                            scenarioAYear={scenarioA?.targetYear}
                            scenarioBYear={scenarioB?.targetYear}
                            scenarioAName={scenarioA?.name}
                            scenarioBName={scenarioB?.name}
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  
                  {/* Trend Analizi */}
                  {itemTrendAnalysis && (
                    <AccordionItem value="trend-analysis" className="border rounded-lg bg-card">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-purple-400" />
                          <span>Trend Analizi</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <ItemTrendCards analysis={itemTrendAnalysis} type="revenues" />
                          <ItemTrendCards analysis={itemTrendAnalysis} type="expenses" />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  
                  {/* Finansal Oranlar - Varsayılan açık */}
                  {financialRatios && (
                    <AccordionItem value="financial-ratios" className="border rounded-lg bg-card">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-4 w-4 text-emerald-400" />
                          <span>Finansal Oranlar</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <FinancialRatiosPanel ratios={financialRatios} />
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  
                  {/* Duyarlılık Analizi */}
                  {sensitivityAnalysis && (
                    <AccordionItem value="sensitivity" className="border rounded-lg bg-card">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                          <span>Duyarlılık Analizi</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <SensitivityTable analysis={sensitivityAnalysis} baseProfit={summaryB?.netProfit || 0} />
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </div>
            )}

            {/* SECTION 3: INVESTMENT TAB + AI DETAILS */}
            
            <InvestmentTab
              scenarioA={scenarioA}
              scenarioB={scenarioB}
              summaryA={{ totalRevenue: summaryA!.totalRevenue, totalExpenses: summaryA!.totalExpense, netProfit: summaryA!.netProfit, profitMargin: summaryA!.profitMargin }}
              summaryB={{ totalRevenue: summaryB!.totalRevenue, totalExpenses: summaryB!.totalExpense, netProfit: summaryB!.netProfit, profitMargin: summaryB!.profitMargin }}
              quarterlyA={{ q1: quarterlyComparison[0]?.scenarioANet || 0, q2: quarterlyComparison[1]?.scenarioANet || 0, q3: quarterlyComparison[2]?.scenarioANet || 0, q4: quarterlyComparison[3]?.scenarioANet || 0 }}
              quarterlyB={{ q1: quarterlyComparison[0]?.scenarioBNet || 0, q2: quarterlyComparison[1]?.scenarioBNet || 0, q3: quarterlyComparison[2]?.scenarioBNet || 0, q4: quarterlyComparison[3]?.scenarioBNet || 0 }}
              quarterlyRevenueA={{ q1: quarterlyComparison[0]?.scenarioARevenue || 0, q2: quarterlyComparison[1]?.scenarioARevenue || 0, q3: quarterlyComparison[2]?.scenarioARevenue || 0, q4: quarterlyComparison[3]?.scenarioARevenue || 0 }}
              quarterlyExpenseA={{ q1: quarterlyComparison[0]?.scenarioAExpense || 0, q2: quarterlyComparison[1]?.scenarioAExpense || 0, q3: quarterlyComparison[2]?.scenarioAExpense || 0, q4: quarterlyComparison[3]?.scenarioAExpense || 0 }}
              quarterlyRevenueB={{ q1: quarterlyComparison[0]?.scenarioBRevenue || 0, q2: quarterlyComparison[1]?.scenarioBRevenue || 0, q3: quarterlyComparison[2]?.scenarioBRevenue || 0, q4: quarterlyComparison[3]?.scenarioBRevenue || 0 }}
              quarterlyExpenseB={{ q1: quarterlyComparison[0]?.scenarioBExpense || 0, q2: quarterlyComparison[1]?.scenarioBExpense || 0, q3: quarterlyComparison[2]?.scenarioBExpense || 0, q4: quarterlyComparison[3]?.scenarioBExpense || 0 }}
              dealConfig={dealConfig}
              onDealConfigChange={updateDealConfig}
              aiNextYearProjection={unifiedAnalysis?.next_year_projection}
              editedProjectionOverride={
                editableRevenueProjection.length > 0 
                  ? {
                      totalRevenue: editableRevenueProjection.reduce((sum, r) => sum + (r.total || 0), 0),
                      totalExpenses: editableExpenseProjection.reduce((sum, e) => sum + (e.total || 0), 0),
                    }
                  : undefined
              }
            />
                
                {/* Focus Project Selector - Yatırım Odak Projesi (çoklu seçim) */}
                {scenarioA && (
                  <FocusProjectSelector
                    revenues={scenarioA.revenues}
                    focusProjects={focusProjects}
                    focusProjectPlan={focusProjectPlan}
                    investmentAllocation={investmentAllocation}
                    onFocusProjectsChange={handleFocusProjectsChange}
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
      
      {/* PDF Export Container - Modular component for PDF export */}
      <PdfExportContainer
        presentationPdfRef={presentationPdfRef}
        scenarioA={scenarioA}
        scenarioB={scenarioB}
        summaryA={summaryA}
        summaryB={summaryB}
        metrics={metrics}
        calculateDiff={calculateDiff}
        formatValue={formatValue}
        quarterlyComparison={quarterlyComparison}
        quarterlyCumulativeData={quarterlyCumulativeData}
        quarterlyItemized={quarterlyItemized}
        chartConfig={chartConfig}
        cumulativeChartConfig={cumulativeChartConfig}
        financialRatios={financialRatios}
        sensitivityAnalysis={sensitivityAnalysis}
        unifiedAnalysis={unifiedAnalysis}
        dealConfig={dealConfig}
        pdfExitPlan={pdfExitPlan}
        editableRevenueProjection={editableRevenueProjection}
        editableExpenseProjection={editableExpenseProjection}
        focusProjects={focusProjects}
        investmentAllocation={investmentAllocation}
        focusProjectPlan={focusProjectPlan}
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
