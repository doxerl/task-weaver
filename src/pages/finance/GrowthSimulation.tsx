import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, RotateCcw, Download, TrendingUp, Loader2 } from 'lucide-react';
import { useGrowthSimulation } from '@/hooks/finance/useGrowthSimulation';
import { SummaryCards } from '@/components/simulation/SummaryCards';
import { ProjectionTable } from '@/components/simulation/ProjectionTable';
import { AddItemDialog } from '@/components/simulation/AddItemDialog';
import { ComparisonChart } from '@/components/simulation/ComparisonChart';
import { CapitalAnalysis } from '@/components/simulation/CapitalAnalysis';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';

function GrowthSimulationContent() {
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
  } = useGrowthSimulation();

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
              <Button variant="outline" size="sm" className="gap-2" onClick={resetToDefaults}>
                <RotateCcw className="h-4 w-4" />
                Sıfırla
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
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
            <ComparisonChart revenues={revenues} expenses={expenses} />
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
