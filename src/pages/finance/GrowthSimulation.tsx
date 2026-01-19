import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RotateCcw, TrendingUp, TrendingDown, Save, Plus, Loader2, FileText, GitCompare } from 'lucide-react';
import { useGrowthSimulation } from '@/hooks/finance/useGrowthSimulation';
import { useScenarios } from '@/hooks/finance/useScenarios';
import { usePdfEngine } from '@/hooks/finance/usePdfEngine';
import { useAdvancedCapitalAnalysis } from '@/hooks/finance/useAdvancedCapitalAnalysis';
import { useROIAnalysis } from '@/hooks/finance/useROIAnalysis';
import { useFinancialDataHub } from '@/hooks/finance/useFinancialDataHub';
import { SummaryCards } from '@/components/simulation/SummaryCards';
import { ProjectionTable } from '@/components/simulation/ProjectionTable';
import { AddItemDialog } from '@/components/simulation/AddItemDialog';
import { ComparisonChart } from '@/components/simulation/ComparisonChart';
import { CapitalAnalysis } from '@/components/simulation/CapitalAnalysis';
import { ScenarioSelector } from '@/components/simulation/ScenarioSelector';
import { NewScenarioDialog } from '@/components/simulation/NewScenarioDialog';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { SimulationScenario } from '@/types/simulation';
import { toast } from 'sonner';

function GrowthSimulationContent() {
  const navigate = useNavigate();
  const simulation = useGrowthSimulation();
  const hub = useFinancialDataHub(simulation.baseYear);
  const scenariosHook = useScenarios();
  const { generateSimulationPdfData, isGenerating, progress } = usePdfEngine();
  
  // Chart ref for ComparisonChart
  const chartsContainerRef = useRef<HTMLDivElement>(null);
  
  const [showNextYearDialog, setShowNextYearDialog] = useState(false);
  const [isCreatingNextYear, setIsCreatingNextYear] = useState(false);
  const [showNewScenarioDialog, setShowNewScenarioDialog] = useState(false);
  const [scenarioType, setScenarioType] = useState<'positive' | 'negative'>('positive');
  
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
  } = simulation;

  // Advanced analysis hooks
  const advancedAnalysis = useAdvancedCapitalAnalysis({
    revenues,
    expenses,
    investments,
    summary,
    hub: hub.isLoading ? null : hub,
  });

  const roiAnalysis = useROIAnalysis({
    revenues,
    expenses,
    investments,
    summary,
  });

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
        toast.success(`${newScenario.targetYear} simülasyonu oluşturuldu`);
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
  };

  const handleNewScenario = () => {
    setShowNewScenarioDialog(true);
  };

  const handleNewScenarioConfirm = (name: string, type: 'positive' | 'negative') => {
    resetToDefaults();
    setScenarioName(name);
    setScenarioType(type);
    scenariosHook.setCurrentScenarioId(null);
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
        chartsElement: chartsContainerRef.current,
      };
      
      const success = await generateSimulationPdfData(pdfData);
      if (success) {
        toast.success('PDF başarıyla oluşturuldu');
      } else {
        toast.error('PDF oluşturulurken hata oluştu');
      }
    } catch {
      toast.error('PDF oluşturulurken hata oluştu');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/finance/reports">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Raporlar
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                {scenarioType === 'positive' ? (
                  <TrendingUp className="h-6 w-6 text-green-500" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-500" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold">{targetYear} Büyüme Simülasyonu</h1>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        scenarioType === 'positive' 
                          ? 'border-green-500 text-green-600 bg-green-500/10' 
                          : 'border-red-500 text-red-600 bg-red-500/10'
                      }`}
                    >
                      {scenarioType === 'positive' ? 'Pozitif' : 'Negatif'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{baseYear} USD verileri baz alınarak</p>
                </div>
              </div>
            </div>
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
                Yeni
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
                Kaydet
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => navigate('/finance/simulation/compare')}
                disabled={scenariosHook.scenarios.length < 2}
              >
                <GitCompare className="h-4 w-4" />
                Karşılaştır
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleNewScenario}>
                <RotateCcw className="h-4 w-4" />
                Sıfırla
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
                PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 bg-background">
        {/* Scenario Settings */}
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scenarioName">Senaryo Adı</Label>
                <Input
                  id="scenarioName"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="Varsayılan Senaryo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exchangeRate">Varsayılan Kur (TL/USD)</Label>
                <Input
                  id="exchangeRate"
                  type="number"
                  value={assumedExchangeRate}
                  onChange={(e) => setAssumedExchangeRate(parseFloat(e.target.value) || 45)}
                  step="0.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notlar</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Senaryo hakkında notlar..."
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
          <SummaryCards summary={summary} exchangeRate={assumedExchangeRate} />
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="projections" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="projections">Projeksiyonlar</TabsTrigger>
            <TabsTrigger value="charts">Grafikler</TabsTrigger>
            <TabsTrigger value="capital">Sermaye Analizi</TabsTrigger>
          </TabsList>

          <TabsContent value="projections" className="space-y-6">
            {/* Revenue Projections */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-green-600">Gelir Projeksiyonları</h2>
                <AddItemDialog type="revenue" onAdd={addRevenue} />
              </div>
              <ProjectionTable
                title=""
                items={revenues}
                onUpdate={updateRevenue}
                onRemove={removeRevenue}
                type="revenue"
              />
            </div>

            {/* Expense Projections */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-red-600">Gider Projeksiyonları</h2>
                <AddItemDialog type="expense" onAdd={addExpense} />
              </div>
              <ProjectionTable
                title=""
                items={expenses}
                onUpdate={updateExpense}
                onRemove={removeExpense}
                type="expense"
              />
            </div>
          </TabsContent>

          <TabsContent value="charts">
            <ComparisonChart 
              ref={chartsContainerRef} 
              revenues={revenues} 
              expenses={expenses}
              baseYear={baseYear}
              targetYear={targetYear}
            />
          </TabsContent>

          <TabsContent value="capital">
            <CapitalAnalysis
              investments={investments}
              summary={summary}
              exchangeRate={assumedExchangeRate}
              onAddInvestment={addInvestment}
              onRemoveInvestment={removeInvestment}
              advancedAnalysis={advancedAnalysis}
              roiAnalysis={roiAnalysis}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* PDF Progress Dialog */}
      <Dialog open={isGenerating}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>PDF Oluşturuluyor</DialogTitle>
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
              Senaryo Kaydedildi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              <strong>"{scenarioName}"</strong> başarıyla kaydedildi.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Sonraki Yıl Simülasyonu Oluştur</p>
              <p className="text-xs text-muted-foreground">
                {targetYear} → {targetYear + 1} dönemi için lineer projeksiyon ile başlayın.
                Mevcut projeksiyonlarınız yeni simülasyonun baz değerleri olacak.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowNextYearDialog(false)}
              >
                Tamam
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
                {targetYear + 1} Simülasyonu Oluştur
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
    <CurrencyProvider defaultYear={2025}>
      <GrowthSimulationContent />
    </CurrencyProvider>
  );
}
