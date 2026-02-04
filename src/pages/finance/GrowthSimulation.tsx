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
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Save,
  Plus,
  Loader2,
  FileText,
  GitCompare,
  DollarSign,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  PiggyBank,
  Percent,
} from 'lucide-react';
import { SECTOR_MULTIPLES, DEFAULT_DILUTION_CONFIG } from '@/types/simulation';
import { calculateMOICWithDilution } from '@/lib/valuationService';
import { formatCompactUSD } from '@/lib/formatters';
import { useGrowthSimulation } from '@/hooks/finance/useGrowthSimulation';
import { useScenarios } from '@/hooks/finance/useScenarios';
import { usePdfEngine } from '@/hooks/finance/usePdfEngine';
import { useFinancialDataHub } from '@/hooks/finance/useFinancialDataHub';
import { SummaryCards } from '@/components/simulation/SummaryCards';
import { ProjectionTable } from '@/components/simulation/ProjectionTable';
import { AddItemDialog } from '@/components/simulation/AddItemDialog';
import { ScenarioSelector } from '@/components/simulation/ScenarioSelector';
import { NewScenarioDialog } from '@/components/simulation/NewScenarioDialog';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { SimulationScenario } from '@/types/simulation';
import { AppHeader } from '@/components/AppHeader';
import { toast } from 'sonner';

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

  // =====================================================
  // INLINE DEAL SIMULATOR STATE
  // =====================================================
  const [dealSimulatorOpen, setDealSimulatorOpen] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState(150000);
  const [equityPercentage, setEquityPercentage] = useState(10);
  const [sectorMultiple, setSectorMultiple] = useState(5);
  const [valuationType, setValuationType] = useState<'pre-money' | 'post-money'>('post-money');
  
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

  // Auto-open deal simulator if investment needed (for negative scenarios)
  useEffect(() => {
    if (cashAnalysis.needsInvestment && scenarioType === 'negative' && !dealSimulatorOpen) {
      setDealSimulatorOpen(true);
      setInvestmentAmount(Math.round(cashAnalysis.suggestedInvestment));
    }
  }, [cashAnalysis.needsInvestment, scenarioType, cashAnalysis.suggestedInvestment, dealSimulatorOpen]);

  // Calculate deal metrics
  const dealMetrics = useMemo(() => {
    // Post-money calculation
    const postMoneyValuation = investmentAmount / (equityPercentage / 100);
    const preMoneyValuation = postMoneyValuation - investmentAmount;

    // If user selected pre-money, recalculate
    let effectivePreMoney = preMoneyValuation;
    let effectivePostMoney = postMoneyValuation;
    let effectiveEquity = equityPercentage;

    if (valuationType === 'pre-money') {
      // User entered pre-money, calculate post-money and equity
      effectivePreMoney = postMoneyValuation; // Treat input as pre-money
      effectivePostMoney = effectivePreMoney + investmentAmount;
      effectiveEquity = (investmentAmount / effectivePostMoney) * 100;
    }

    // 5-year exit value estimation (simplified)
    const currentRevenue = summary.projected.totalRevenue;
    const growthRate = 0.3; // 30% annual growth assumption
    const year5Revenue = currentRevenue * Math.pow(1 + growthRate, 5);
    const year5ExitValue = year5Revenue * sectorMultiple;

    // MOIC with dilution
    const moicResult = calculateMOICWithDilution(
      investmentAmount,
      effectiveEquity,
      year5ExitValue,
      DEFAULT_DILUTION_CONFIG,
      5
    );

    // Founder dilution calculation
    const founderPreInvestment = 100;
    const founderPostInvestment = founderPreInvestment - effectiveEquity;
    const founderPostESOP = founderPostInvestment * (1 - DEFAULT_DILUTION_CONFIG.esopPoolSize);

    return {
      preMoneyValuation: effectivePreMoney,
      postMoneyValuation: effectivePostMoney,
      effectiveEquity,
      year5ExitValue,
      moicNoDilution: moicResult.moicNoDilution,
      moicWithDilution: moicResult.moicWithDilution,
      investorProceeds: moicResult.investorProceeds,
      ownershipAtExit: moicResult.ownershipAtExit,
      irrEstimate: moicResult.irrEstimate,
      founderPreInvestment,
      founderPostInvestment,
      founderPostESOP,
    };
  }, [investmentAmount, equityPercentage, sectorMultiple, valuationType, summary.projected.totalRevenue]);

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
          <TrendingUp className="h-6 w-6 text-green-500" />
        ) : (
          <TrendingDown className="h-6 w-6 text-red-500" />
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
        {/* INLINE DEAL SIMULATOR - Nakit Durumuna Göre */}
        {/* ============================================= */}
        {(cashAnalysis.needsInvestment || scenarioType === 'positive') && (
          <Collapsible open={dealSimulatorOpen} onOpenChange={setDealSimulatorOpen}>
            <Card className={`border-2 ${
              cashAnalysis.needsInvestment
                ? 'border-red-500/50 bg-red-500/5'
                : 'border-blue-500/30 bg-blue-500/5'
            }`}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {cashAnalysis.needsInvestment ? (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      ) : (
                        <PiggyBank className="h-5 w-5 text-blue-500" />
                      )}
                      <div>
                        <CardTitle className="text-sm">
                          {cashAnalysis.needsInvestment
                            ? t('simulation:investment.dealSimulator.title') + ' ⚠️'
                            : t('simulation:investment.dealSimulator.title')
                          }
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {cashAnalysis.needsInvestment ? (
                            <>
                              Death Valley: <span className="text-red-500 font-semibold">{formatCompactUSD(cashAnalysis.deathValley)}</span>
                              {' '}({cashAnalysis.deathValleyQuarter}) •
                              {t('simulation:investment.dealSimulator.suggested')}: <span className="text-amber-500 font-semibold">{formatCompactUSD(cashAnalysis.suggestedInvestment)}</span>
                            </>
                          ) : (
                            t('simulation:investment.dealSimulator.description')
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {cashAnalysis.needsInvestment && (
                        <Badge variant="destructive" className="text-xs">
                          {t('simulation:capital.notSelfSustaining')}
                        </Badge>
                      )}
                      {dealSimulatorOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="space-y-4 pt-0">
                  {/* Input Section */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Investment Amount */}
                    <div className="space-y-2">
                      <Label className="text-xs">{t('simulation:investment.dealSimulator.investmentAmount')}</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          value={investmentAmount}
                          onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                          className="pl-8 font-mono"
                        />
                      </div>
                      {cashAnalysis.needsInvestment && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => setInvestmentAmount(Math.round(cashAnalysis.suggestedInvestment))}
                        >
                          {t('simulation:investment.dealSimulator.suggestedAmount')}: {formatCompactUSD(cashAnalysis.suggestedInvestment)}
                        </Button>
                      )}
                    </div>

                    {/* Equity Percentage */}
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {t('simulation:investment.dealSimulator.equityRatio')}: {equityPercentage}%
                      </Label>
                      <Slider
                        value={[equityPercentage]}
                        onValueChange={([v]) => setEquityPercentage(v)}
                        min={5}
                        max={30}
                        step={1}
                        className="mt-3"
                      />
                      <p className="text-xs text-muted-foreground">
                        {valuationType === 'post-money' ? 'Post-Money' : 'Pre-Money'}: {formatCompactUSD(dealMetrics.postMoneyValuation)}
                      </p>
                    </div>

                    {/* Valuation Type */}
                    <div className="space-y-2">
                      <Label className="text-xs">{t('simulation:investment.dealSimulator.valuation')} Tipi</Label>
                      <Select value={valuationType} onValueChange={(v: 'pre-money' | 'post-money') => setValuationType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="post-money">Post-Money</SelectItem>
                          <SelectItem value="pre-money">Pre-Money</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {valuationType === 'post-money'
                          ? `Pre: ${formatCompactUSD(dealMetrics.preMoneyValuation)}`
                          : `Post: ${formatCompactUSD(dealMetrics.postMoneyValuation)}`
                        }
                      </p>
                    </div>

                    {/* Sector Multiple */}
                    <div className="space-y-2">
                      <Label className="text-xs">{t('simulation:investment.dealSimulator.sectorMultiple')}</Label>
                      <Select
                        value={String(sectorMultiple)}
                        onValueChange={(v) => setSectorMultiple(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(SECTOR_MULTIPLES).map(([sector, multiple]) => (
                            <SelectItem key={sector} value={String(multiple)}>
                              {sector} ({multiple}x)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Results Section */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
                    {/* Valuation Box */}
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground mb-1">{t('simulation:investment.dealSimulator.postMoneyValuation')}</p>
                      <p className="text-lg font-bold text-primary">{formatCompactUSD(dealMetrics.postMoneyValuation)}</p>
                      <p className="text-xs text-muted-foreground">
                        Pre: {formatCompactUSD(dealMetrics.preMoneyValuation)}
                      </p>
                    </div>

                    {/* Investor Return Box */}
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <p className="text-xs text-muted-foreground mb-1">5Y MOIC (Dilution ile)</p>
                      <p className="text-lg font-bold text-emerald-500">{dealMetrics.moicWithDilution.toFixed(1)}x</p>
                      <p className="text-xs text-muted-foreground">
                        IRR: ~{dealMetrics.irrEstimate.toFixed(0)}%
                      </p>
                    </div>

                    {/* Investor Proceeds Box */}
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                      <p className="text-xs text-muted-foreground mb-1">Yatırımcı 5Y Exit Getiri</p>
                      <p className="text-lg font-bold text-blue-500">{formatCompactUSD(dealMetrics.investorProceeds)}</p>
                      <p className="text-xs text-muted-foreground">
                        Exit Ownership: {dealMetrics.ownershipAtExit.toFixed(1)}%
                      </p>
                    </div>

                    {/* Founder Dilution Box */}
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <p className="text-xs text-muted-foreground mb-1">Kurucu Hissesi</p>
                      <p className="text-lg font-bold text-amber-500">
                        %{dealMetrics.founderPreInvestment} → %{dealMetrics.founderPostESOP.toFixed(0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ESOP sonrası (10% havuz)
                      </p>
                    </div>
                  </div>

                  {/* Warning for high dilution */}
                  {dealMetrics.moicWithDilution < 3 && (
                    <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 text-xs text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      MOIC 3x altında - yatırımcılar için çekicilik düşük olabilir. Değerlemeyi veya çıkış çarpanını gözden geçirin.
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Projections Content */}
        <div className="space-y-6">
          {/* Revenue Projections */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-green-600">{t('growthSimulation.revenueProjections')}</h2>
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
              <h2 className="text-lg font-semibold text-red-600">{t('growthSimulation.expenseProjections')}</h2>
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
        </div>
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
              <TrendingUp className="h-5 w-5 text-green-500" />
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
