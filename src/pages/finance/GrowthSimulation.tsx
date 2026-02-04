import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, TrendingUp, TrendingDown, Save, Plus, Loader2, FileText, GitCompare } from 'lucide-react';
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
              onClick={() => navigate('/simulation/compare')}
              disabled={scenariosHook.scenarios.length < 2}
            >
              <GitCompare className="h-4 w-4" />
              <span className="hidden lg:inline">{t('growthSimulation.riskAnalysis')}</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => navigate('/simulation/growth')}
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
