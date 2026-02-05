import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Save,
  Plus,
  Loader2,
  FileText,
  GitCompare,
  PieChart,
  Activity,
  Wallet,
} from 'lucide-react';
import { DealSimulatorCard, CashAnalysis, ExitPlanYear5 } from '@/components/simulation/DealSimulatorCard';
import { InvestmentConfigPanel } from '@/components/simulation/InvestmentConfigPanel';
import { calculateDecayYear5Revenue, STARTUP_GROWTH_PROFILES, type BusinessModel } from '@/constants/simulation';
import { useGrowthSimulation } from '@/hooks/finance/useGrowthSimulation';
import { useScenarios } from '@/hooks/finance/useScenarios';
import { usePdfEngine } from '@/hooks/finance/usePdfEngine';
import { useFinancialDataHub } from '@/hooks/finance/useFinancialDataHub';
import { SummaryCards } from '@/components/simulation/SummaryCards';
import { ProjectionTable } from '@/components/simulation/ProjectionTable';
import { AddItemDialog } from '@/components/simulation/AddItemDialog';
import { ScenarioSelector } from '@/components/simulation/ScenarioSelector';
import { NewScenarioDialog } from '@/components/simulation/NewScenarioDialog';
import { CapTableEditor } from '@/components/simulation/CapTableEditor';
import { FocusProjectSelector } from '@/components/simulation/FocusProjectSelector';
import { SensitivityPanel } from '@/components/simulation/SensitivityPanel';
import { CashFlowDashboard } from '@/components/simulation/CashFlowDashboard';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { SimulationScenario, InvestmentAllocation, DealConfig } from '@/types/simulation';
import { AppHeader } from '@/components/AppHeader';
import { toast } from 'sonner';
import { generateTornadoAnalysis, generateScenarioMatrix } from '@/lib/sensitivityEngine';
import { generate13WeekCashForecast, reconcilePnLToCash } from '@/lib/cashFlowEngine';
import type { CapTableEntry, FutureRoundAssumption, WorkingCapitalConfigV2, SensitivityConfigV2 } from '@/types/simulation';

function GrowthSimulationContent() {
  const { t } = useTranslation(['simulation', 'common']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const simulation = useGrowthSimulation();
  const hub = useFinancialDataHub(simulation.baseYear);
  const scenariosHook = useScenarios();
  const { generateSimulationPdfData, isGenerating, progress } = usePdfEngine();
  
  const [showNextYearDialog, setShowNextYearDialog] = useState(false);
  const [isCreatingNextYear, setIsCreatingNextYear] = useState(false);
  const [showNewScenarioDialog, setShowNewScenarioDialog] = useState(false);
  const [scenarioType, setScenarioType] = useState<'positive' | 'negative'>('positive');
  const [urlScenarioLoaded, setUrlScenarioLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('projections');

  // =====================================================
  // INLINE DEAL SIMULATOR STATE
  // =====================================================
  const [dealSimulatorOpen, setDealSimulatorOpen] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState(150000);
  const [equityPercentage, setEquityPercentage] = useState(10);
  const [sectorMultiple, setSectorMultiple] = useState(5);
  const [valuationType, setValuationType] = useState<'pre-money' | 'post-money'>('post-money');

  // =====================================================
  // INVESTMENT CONFIG PANEL STATE
  // =====================================================
  const [investmentConfigOpen, setInvestmentConfigOpen] = useState(true);
  const [focusProjects, setFocusProjects] = useState<string[]>([]);
  const [focusProjectPlan, setFocusProjectPlan] = useState('');
  const [investmentAllocation, setInvestmentAllocation] = useState<InvestmentAllocation>({
    product: 40,
    marketing: 30,
    hiring: 20,
    operations: 10,
  });

  // =====================================================
  // CAP TABLE STATE
  // =====================================================
  const [capTableEntries, setCapTableEntries] = useState<CapTableEntry[]>([
    { holder: 'Kurucu 1', shares: 50000, percentage: 50, type: 'common' },
    { holder: 'Kurucu 2', shares: 30000, percentage: 30, type: 'common' },
    { holder: 'Option Pool', shares: 20000, percentage: 20, type: 'options' },
  ]);
  const [futureRounds, setFutureRounds] = useState<FutureRoundAssumption[]>([]);

  // =====================================================
  // WORKING CAPITAL CONFIG
  // =====================================================
  const [workingCapitalConfig] = useState<WorkingCapitalConfigV2>({
    ar_days: 45,
    ap_days: 30,
    inventory_days: 0,
    deferred_revenue_days: 0,
  });

  const [sensitivityConfig] = useState<SensitivityConfigV2>({
    mode: 'tornado',
    shock_range: 0.10,
    drivers: ['revenue_growth', 'cogs_margin', 'opex_change', 'churn_rate'],
  });
  
  const {
    scenarioName,
    setScenarioName,
    baseYear,
    targetYear,
    revenues,
    expenses,
    investments,
    assumedExchangeRate,
    setAssumedExchangeRate,
    notes,
    setNotes,
    summary,
    isLoading,
    updateRevenue,
    addRevenue,
    removeRevenue,
    updateExpense,
    addExpense,
    removeExpense,
    addInvestment,
    removeInvestment,
    resetToDefaults,
    loadScenario,
    getCurrentScenario,
    loadBaseScenario,
    clearBaseScenario,
  } = simulation;

  // =====================================================
  // CASH FLOW ANALYSIS & DEAL SIMULATOR CALCULATIONS
  // =====================================================

  // Calculate quarterly cash flow from projections
  const quarterlyCashFlow = useMemo(() => {
    const revenueQ = revenues.reduce(
      (acc, r) => ({
        q1: acc.q1 + (r.projectedQuarterly?.q1 || 0),
        q2: acc.q2 + (r.projectedQuarterly?.q2 || 0),
        q3: acc.q3 + (r.projectedQuarterly?.q3 || 0),
        q4: acc.q4 + (r.projectedQuarterly?.q4 || 0),
      }),
      { q1: 0, q2: 0, q3: 0, q4: 0 }
    );

    const expenseQ = expenses.reduce(
      (acc, e) => ({
        q1: acc.q1 + (e.projectedQuarterly?.q1 || 0),
        q2: acc.q2 + (e.projectedQuarterly?.q2 || 0),
        q3: acc.q3 + (e.projectedQuarterly?.q3 || 0),
        q4: acc.q4 + (e.projectedQuarterly?.q4 || 0),
      }),
      { q1: 0, q2: 0, q3: 0, q4: 0 }
    );

    return {
      q1: revenueQ.q1 - expenseQ.q1,
      q2: revenueQ.q2 - expenseQ.q2,
      q3: revenueQ.q3 - expenseQ.q3,
      q4: revenueQ.q4 - expenseQ.q4,
    };
  }, [revenues, expenses]);

  // Calculate death valley and investment need
  const cashAnalysis = useMemo(() => {
    const flows = [quarterlyCashFlow.q1, quarterlyCashFlow.q2, quarterlyCashFlow.q3, quarterlyCashFlow.q4];
    let cumulative = 0;
    let minCash = 0;
    let deathValleyQuarter = '';

    for (let i = 0; i < flows.length; i++) {
      cumulative += flows[i];
      if (cumulative < minCash) {
        minCash = cumulative;
        deathValleyQuarter = `Q${i + 1}`;
      }
    }

    const yearEndCash = flows.reduce((sum, f) => sum + f, 0);
    const needsInvestment = minCash < 0 || yearEndCash < 0;
    const suggestedInvestment = needsInvestment ? Math.abs(minCash) * 1.25 : 0; // 25% buffer

    return {
      deathValley: minCash,
      deathValleyQuarter,
      yearEndCash,
      needsInvestment,
      suggestedInvestment: Math.max(suggestedInvestment, 50000), // Minimum $50K if needed
      monthlyBurn: Math.abs(Math.min(0, yearEndCash / 12)),
    };
  }, [quarterlyCashFlow]);

  // =====================================================
  // EXIT PLAN YEAR 5 PROJECTION FOR MOIC CALCULATION
  // =====================================================
  const exitPlanYear5 = useMemo((): ExitPlanYear5 | undefined => {
    const currentRevenue = summary.projected.totalRevenue;
    if (!currentRevenue || currentRevenue <= 0) return undefined;
    
    // Use Startup Decay Model to project Year 5 revenue
    const year5Revenue = calculateDecayYear5Revenue(currentRevenue, 'SAAS');
    const year5Valuation = year5Revenue * sectorMultiple;
    
    return {
      revenue: year5Revenue,
      companyValuation: year5Valuation,
      appliedGrowthRate: undefined, // Using decay model, not fixed rate
    };
  }, [summary.projected.totalRevenue, sectorMultiple]);

  // =====================================================
  // TORNADO & SENSITIVITY ANALYSIS
  // =====================================================
  const tornadoResults = useMemo(() => {
    const currentScenario = getCurrentScenario();
    const currentCash = cashAnalysis.yearEndCash > 0 ? cashAnalysis.yearEndCash : 100000;
    return generateTornadoAnalysis(currentScenario, sensitivityConfig, currentCash, sectorMultiple);
  }, [getCurrentScenario, sensitivityConfig, cashAnalysis.yearEndCash, sectorMultiple]);

  const scenarioMatrix = useMemo(() => {
    const currentScenario = getCurrentScenario();
    const currentCash = cashAnalysis.yearEndCash > 0 ? cashAnalysis.yearEndCash : 100000;
    return generateScenarioMatrix(currentScenario, currentCash, sectorMultiple, investmentAmount);
  }, [getCurrentScenario, cashAnalysis.yearEndCash, sectorMultiple, investmentAmount]);

  // =====================================================
  // 13-WEEK CASH FORECAST
  // =====================================================
  const cashForecast = useMemo(() => {
    const openingCash = cashAnalysis.yearEndCash > 0 ? cashAnalysis.yearEndCash : 50000;
    const weeklyRevenue = summary.projected.totalRevenue / 52;
    const weeklyExpense = summary.projected.totalExpense / 52;
    
    return generate13WeekCashForecast(
      openingCash,
      {
        weeklyRevenue,
        weeklyPayroll: weeklyExpense * 0.4,
        weeklyOtherExpenses: weeklyExpense * 0.5,
        weeklyDebtService: weeklyExpense * 0.1,
      },
      workingCapitalConfig
    );
  }, [cashAnalysis.yearEndCash, summary.projected, workingCapitalConfig]);

  // P&L to Cash Reconciliation
  const cashReconciliation = useMemo(() => {
    const netIncome = summary.projected.netProfit;
    const depreciation = summary.projected.totalExpense * 0.05;
    const openingCash = cashAnalysis.yearEndCash > 0 ? cashAnalysis.yearEndCash : 50000;
    
    return reconcilePnLToCash(
      netIncome,
      depreciation,
      0, // amortization
      summary.projected.totalRevenue * 0.1, // changeInAR
      summary.projected.totalExpense * 0.08, // changeInAP
      0, // changeInInventory
      summary.projected.totalExpense * 0.03, // capex
      0, // debtProceeds
      0, // debtRepayments
      openingCash
    );
  }, [summary.projected, cashAnalysis.yearEndCash]);

  // Auto-open deal simulator if investment needed (for negative scenarios)
  useEffect(() => {
    if (cashAnalysis.needsInvestment && scenarioType === 'negative' && !dealSimulatorOpen) {
      setDealSimulatorOpen(true);
      setInvestmentAmount(Math.round(cashAnalysis.suggestedInvestment));
    }
  }, [cashAnalysis.needsInvestment, scenarioType, cashAnalysis.suggestedInvestment, dealSimulatorOpen]);

  // URL'den senaryo yükleme - sayfa ilk açıldığında
  useEffect(() => {
    const scenarioId = searchParams.get('scenario');
    if (scenarioId && scenariosHook.scenarios.length > 0 && !urlScenarioLoaded) {
      const scenario = scenariosHook.scenarios.find(s => s.id === scenarioId);
      if (scenario) {
        loadScenario(scenario);
        scenariosHook.setCurrentScenarioId(scenario.id);
        setScenarioType(scenario.scenarioType || 'positive');
        
        // Baz yıl için önceki yılın pozitif senaryosunu bul ve yükle
        const previousYear = scenario.targetYear - 1;
        const baseScenario = scenariosHook.scenarios.find(
          s => s.targetYear === previousYear && s.scenarioType === 'positive'
        );
        
        if (baseScenario) {
          loadBaseScenario(baseScenario);
        } else {
          clearBaseScenario();
        }
        
        setUrlScenarioLoaded(true);
      }
    }
  }, [searchParams, scenariosHook.scenarios, urlScenarioLoaded, loadScenario, loadBaseScenario, clearBaseScenario, scenariosHook]);

  const handleSave = async () => {
    // Build deal config from current state
    const dealConfig: DealConfig = {
      investmentAmount,
      equityPercentage,
      sectorMultiple,
      valuationType,
    };

    const savedId = await scenariosHook.saveScenario(
      {
        name: scenarioName,
        baseYear,
        targetYear,
        revenues,
        expenses,
        investments,
        assumedExchangeRate,
        notes,
        scenarioType,
        // Investment configuration
        focusProjects,
        focusProjectPlan,
        investmentAllocation,
        dealConfig,
      },
      scenariosHook.currentScenarioId
    );
    
    if (savedId) {
      scenariosHook.setCurrentScenarioId(savedId);
      // Show next year dialog after successful save
      setShowNextYearDialog(true);
    }
  };

  const handleCreateNextYear = async () => {
    setIsCreatingNextYear(true);
    try {
      const currentScenario = getCurrentScenario();
      const newScenario = await scenariosHook.createNextYearSimulation(currentScenario);
      if (newScenario) {
        loadScenario(newScenario);
        scenariosHook.setCurrentScenarioId(newScenario.id);
        toast.success(t('growthSimulation.savedSuccess', { name: newScenario.targetYear }));
      }
    } finally {
      setIsCreatingNextYear(false);
      setShowNextYearDialog(false);
    }
  };

  const handleSelectScenario = (scenario: SimulationScenario) => {
    loadScenario(scenario);
    scenariosHook.setCurrentScenarioId(scenario.id);
    setScenarioType(scenario.scenarioType || 'positive');
    
    // Load investment configuration from scenario
    setFocusProjects(scenario.focusProjects || []);
    setFocusProjectPlan(scenario.focusProjectPlan || '');
    setInvestmentAllocation(scenario.investmentAllocation || { product: 40, marketing: 30, hiring: 20, operations: 10 });
    
    // Load deal config if available
    if (scenario.dealConfig) {
      setInvestmentAmount(scenario.dealConfig.investmentAmount);
      setEquityPercentage(scenario.dealConfig.equityPercentage);
      setSectorMultiple(scenario.dealConfig.sectorMultiple);
      setValuationType(scenario.dealConfig.valuationType);
    }
    
    // Baz yıl için önceki yılın pozitif senaryosunu bul ve yükle
    const previousYear = scenario.targetYear - 1;
    const baseScenario = scenariosHook.scenarios.find(
      s => s.targetYear === previousYear && s.scenarioType === 'positive'
    );
    
    if (baseScenario) {
      loadBaseScenario(baseScenario);
    } else {
      clearBaseScenario();
    }
  };

  const handleNewScenario = () => {
    setShowNewScenarioDialog(true);
  };

  const handleNewScenarioConfirm = (name: string, type: 'positive' | 'negative') => {
    resetToDefaults();
    setScenarioName(name);
    setScenarioType(type);
    scenariosHook.setCurrentScenarioId(null);
    clearBaseScenario(); // Yeni senaryo için baz senaryoyu temizle
    
    // Reset investment configuration
    setFocusProjects([]);
    setFocusProjectPlan('');
    setInvestmentAllocation({ product: 40, marketing: 30, hiring: 20, operations: 10 });
    setInvestmentAmount(150000);
    setEquityPercentage(10);
    setSectorMultiple(5);
    setValuationType('post-money');
  };

  const handleExportPdf = async () => {
    try {
      const pdfData = {
        scenarioName,
        baseYear,
        targetYear,
        summary: {
          baseRevenue: summary.base.totalRevenue,
          projectedRevenue: summary.projected.totalRevenue,
          baseExpense: summary.base.totalExpense,
          projectedExpense: summary.projected.totalExpense,
          baseProfit: summary.base.netProfit,
          projectedProfit: summary.projected.netProfit,
          revenueGrowth: summary.growth.revenueGrowth,
          expenseGrowth: summary.growth.expenseGrowth,
          profitGrowth: summary.growth.profitGrowth,
        },
        revenues: revenues.map(r => ({
          id: r.id,
          name: r.category,
          baseAmount: r.baseAmount,
          projectedAmount: r.projectedAmount,
          changePercent: r.baseAmount > 0 
            ? ((r.projectedAmount - r.baseAmount) / r.baseAmount) * 100 
            : 0,
          quarterly: r.projectedQuarterly,
        })),
        expenses: expenses.map(e => ({
          id: e.id,
          name: e.category,
          baseAmount: e.baseAmount,
          projectedAmount: e.projectedAmount,
          changePercent: e.baseAmount > 0 
            ? ((e.projectedAmount - e.baseAmount) / e.baseAmount) * 100 
            : 0,
          quarterly: e.projectedQuarterly,
        })),
        exchangeRate: assumedExchangeRate,
        chartsElement: null,
      };
      
      const success = await generateSimulationPdfData(pdfData);
      if (success) {
        toast.success(t('growthSimulation.pdfSuccess'));
      } else {
        toast.error(t('growthSimulation.pdfError'));
      }
    } catch {
      toast.error(t('growthSimulation.pdfError'));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title={t('growthSimulation.title', { year: targetYear })}
        subtitle={t('growthSimulation.subtitle', { year: baseYear })}
        backPath="/finance/reports"
        backLabel={t('common:back')}
        icon={scenarioType === 'positive' ? (
          <TrendingUp className="h-6 w-6 text-primary" />
        ) : (
          <TrendingDown className="h-6 w-6 text-destructive" />
        )}
        badge={
          <Badge 
            variant="outline" 
            className={`text-xs ${
              scenarioType === 'positive' 
                ? 'border-green-500 text-green-600 bg-green-500/10' 
                : 'border-red-500 text-red-600 bg-red-500/10'
            }`}
          >
            {scenarioType === 'positive' ? t('scenario.positive') : t('scenario.negative')}
          </Badge>
        }
        rightContent={
          <div className="flex items-center gap-2">
            <ScenarioSelector
              scenarios={scenariosHook.scenarios}
              currentScenarioId={scenariosHook.currentScenarioId}
              isLoading={scenariosHook.isLoading}
              onSelect={handleSelectScenario}
              onDelete={scenariosHook.deleteScenario}
              onDuplicate={scenariosHook.duplicateScenario}
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2" 
              onClick={handleNewScenario}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('growthSimulation.new')}</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2" 
              onClick={handleSave}
              disabled={scenariosHook.isSaving}
            >
              {scenariosHook.isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{t('growthSimulation.save')}</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => navigate('/finance/simulation/compare')}
              disabled={scenariosHook.scenarios.length < 2}
            >
              <GitCompare className="h-4 w-4" />
              <span className="hidden lg:inline">{t('growthSimulation.riskAnalysis')}</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => navigate('/finance/simulation/growth')}
              disabled={scenariosHook.scenarios.length < 2}
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden lg:inline">{t('growthSimulation.growth')}</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleNewScenario}>
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">{t('growthSimulation.reset')}</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={handleExportPdf}
              disabled={isGenerating || isLoading}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{t('growthSimulation.pdf')}</span>
            </Button>
          </div>
        }
      />

      <main className="container mx-auto px-4 py-6 space-y-6 bg-background">
        {/* Scenario Settings */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scenarioName">{t('growthSimulation.scenarioName')}</Label>
                <Input
                  id="scenarioName"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder={t('scenario.namePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exchangeRate">{t('growthSimulation.assumedRate')}</Label>
                <Input
                  id="exchangeRate"
                  type="number"
                  value={assumedExchangeRate}
                  onChange={(e) => setAssumedExchangeRate(parseFloat(e.target.value) || 45)}
                  step="0.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">{t('growthSimulation.notes')}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('growthSimulation.notesPlaceholder')}
                  className="min-h-[38px] resize-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards with Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-4 space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <div className="space-y-2 mt-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <SummaryCards 
            summary={summary} 
            exchangeRate={assumedExchangeRate} 
            baseYear={baseYear}
            targetYear={targetYear}
          />
        )}

        {/* ============================================= */}
        {/* DEAL SIMULATOR & FOCUS PROJECTS */}
        {/* ============================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DealSimulatorCard
            cashAnalysis={cashAnalysis as CashAnalysis}
            scenarioType={scenarioType}
            currentRevenue={summary.projected.totalRevenue}
            investmentAmount={investmentAmount}
            equityPercentage={equityPercentage}
            sectorMultiple={sectorMultiple}
            valuationType={valuationType}
            isOpen={dealSimulatorOpen}
            onInvestmentAmountChange={setInvestmentAmount}
            onEquityPercentageChange={setEquityPercentage}
            onSectorMultipleChange={setSectorMultiple}
            onValuationTypeChange={setValuationType}
            onOpenChange={setDealSimulatorOpen}
            exitPlanYear5={exitPlanYear5}
            businessModel="SAAS"
          />
          
          <FocusProjectSelector
            revenues={revenues}
            focusProjects={focusProjects}
            focusProjectPlan={focusProjectPlan}
            investmentAllocation={investmentAllocation}
            onFocusProjectsChange={setFocusProjects}
            onFocusProjectPlanChange={setFocusProjectPlan}
            onInvestmentAllocationChange={setInvestmentAllocation}
          />
        </div>

        {/* Main Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="projections" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">{t('growthSimulation.projections')}</span>
            </TabsTrigger>
            <TabsTrigger value="cap-table" className="gap-2">
              <PieChart className="h-4 w-4" />
              <span className="hidden sm:inline">{t('simulation:capTable.title')}</span>
            </TabsTrigger>
            <TabsTrigger value="sensitivity" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">{t('simulation:sensitivity.title')}</span>
            </TabsTrigger>
            <TabsTrigger value="cash-flow" className="gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">{t('simulation:cashFlow.title')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Projections Tab */}
          <TabsContent value="projections" className="space-y-6">
            {/* Revenue Projections */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-primary">{t('growthSimulation.revenueProjections')}</h2>
                <AddItemDialog type="revenue" onAdd={addRevenue} />
              </div>
              <ProjectionTable
                title=""
                items={revenues}
                onUpdate={updateRevenue}
                onRemove={removeRevenue}
                type="revenue"
                baseYear={targetYear - 1}
                targetYear={targetYear}
              />
            </div>

            {/* Expense Projections */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-destructive">{t('growthSimulation.expenseProjections')}</h2>
                <AddItemDialog type="expense" onAdd={addExpense} />
              </div>
              <ProjectionTable
                title=""
                items={expenses}
                onUpdate={updateExpense}
                onRemove={removeExpense}
                type="expense"
                baseYear={targetYear - 1}
                targetYear={targetYear}
              />
            </div>
          </TabsContent>

          {/* Cap Table Tab */}
          <TabsContent value="cap-table">
            <CapTableEditor
              entries={capTableEntries}
              rounds={futureRounds}
              onEntriesChange={setCapTableEntries}
              onRoundsChange={setFutureRounds}
              preMoneyValuation={summary.projected.totalRevenue * sectorMultiple}
              currency="USD"
            />
          </TabsContent>

          {/* Sensitivity Tab */}
          <TabsContent value="sensitivity">
            <SensitivityPanel
              tornadoResults={tornadoResults}
              scenarioMatrix={scenarioMatrix}
              baseValuation={summary.projected.totalRevenue * sectorMultiple}
              currency="USD"
            />
          </TabsContent>

          {/* Cash Flow Tab */}
          <TabsContent value="cash-flow">
            <CashFlowDashboard
              forecast={cashForecast}
              reconciliation={cashReconciliation}
              workingCapitalConfig={workingCapitalConfig}
              annualRevenue={summary.projected.totalRevenue}
              annualExpenses={summary.projected.totalExpense}
              currency="USD"
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* PDF Progress Dialog */}
      <Dialog open={isGenerating}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t('growthSimulation.pdfProgress')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Progress value={(progress.current / progress.total) * 100} />
            <p className="text-sm text-muted-foreground text-center">
              {progress.stage} ({progress.current}/{progress.total})
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Next Year Simulation Dialog */}
      <Dialog open={showNextYearDialog} onOpenChange={setShowNextYearDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t('growthSimulation.scenarioSaved')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              <strong>"{scenarioName}"</strong> {t('growthSimulation.savedSuccess')}.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">{t('growthSimulation.createNextYear')}</p>
              <p className="text-xs text-muted-foreground">
                {t('growthSimulation.nextYearDescription', { from: targetYear, to: targetYear + 1 })}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowNextYearDialog(false)}
              >
                {t('growthSimulation.ok')}
              </Button>
              <Button
                onClick={handleCreateNextYear}
                disabled={isCreatingNextYear}
                className="gap-2"
              >
                {isCreatingNextYear ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {t('growthSimulation.createSimulation', { year: targetYear + 1 })}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Scenario Dialog */}
      <NewScenarioDialog
        open={showNewScenarioDialog}
        onOpenChange={setShowNewScenarioDialog}
        onConfirm={handleNewScenarioConfirm}
      />
    </div>
  );
}

export default function GrowthSimulation() {
  return (
    <CurrencyProvider>
      <GrowthSimulationContent />
    </CurrencyProvider>
  );
}
