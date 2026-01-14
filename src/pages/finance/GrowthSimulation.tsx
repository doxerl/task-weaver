import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, RotateCcw, Download, TrendingUp, Save, Plus, Loader2, FileText, GitCompare } from 'lucide-react';
import { useGrowthSimulation } from '@/hooks/finance/useGrowthSimulation';
import { useScenarios } from '@/hooks/finance/useScenarios';
import { useSimulationPdf } from '@/hooks/finance/useSimulationPdf';
import { SummaryCards } from '@/components/simulation/SummaryCards';
import { ProjectionTable } from '@/components/simulation/ProjectionTable';
import { AddItemDialog } from '@/components/simulation/AddItemDialog';
import { ComparisonChart } from '@/components/simulation/ComparisonChart';
import { CapitalAnalysis } from '@/components/simulation/CapitalAnalysis';
import { ScenarioSelector } from '@/components/simulation/ScenarioSelector';
import { ScenarioComparison } from '@/components/simulation/ScenarioComparison';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { SimulationScenario } from '@/types/simulation';
import { toast } from 'sonner';

function GrowthSimulationContent() {
  const simulation = useGrowthSimulation();
  const scenariosHook = useScenarios();
  const { generatePdf, isGenerating, progress } = useSimulationPdf();
  const [showComparison, setShowComparison] = useState(false);
  
  // Ref for chart capture
  const chartsContainerRef = useRef<HTMLDivElement>(null);
  
  const {
    scenarioName,
    setScenarioName,
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
  } = simulation;

  const handleSave = async () => {
    const savedId = await scenariosHook.saveScenario(
      {
        name: scenarioName,
        revenues,
        expenses,
        investments,
        assumedExchangeRate,
        notes,
      },
      scenariosHook.currentScenarioId
    );
    
    if (savedId) {
      scenariosHook.setCurrentScenarioId(savedId);
    }
  };

  const handleSelectScenario = (scenario: SimulationScenario) => {
    loadScenario(scenario);
    scenariosHook.setCurrentScenarioId(scenario.id);
  };

  const handleNewScenario = () => {
    resetToDefaults();
    scenariosHook.setCurrentScenarioId(null);
  };

  const handleExportPdf = async () => {
    const success = await generatePdf(
      {
        scenarioName,
        revenues,
        expenses,
        investments,
        summary,
        assumedExchangeRate,
        notes,
      },
      {
        chartsContainer: chartsContainerRef.current,
      },
      {
        companyName: 'Şirket',
      }
    );

    if (success) {
      toast.success('PDF başarıyla oluşturuldu');
    } else {
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
                <TrendingUp className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-xl font-bold">2026 Büyüme Simülasyonu</h1>
                  <p className="text-sm text-muted-foreground">2025 USD verileri baz alınarak</p>
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
                onClick={() => setShowComparison(true)}
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

      <main className="container mx-auto px-4 py-6 space-y-6">
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
            />
          </TabsContent>

          <TabsContent value="capital">
            <CapitalAnalysis
              investments={investments}
              summary={summary}
              exchangeRate={assumedExchangeRate}
              onAddInvestment={addInvestment}
              onRemoveInvestment={removeInvestment}
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

      {/* Scenario Comparison Modal */}
      <ScenarioComparison
        open={showComparison}
        onOpenChange={setShowComparison}
        scenarios={scenariosHook.scenarios}
        currentScenarioId={scenariosHook.currentScenarioId}
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
