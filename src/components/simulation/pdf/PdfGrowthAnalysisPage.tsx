import React from 'react';
import { PdfPageWrapper } from './PdfPageWrapper';
import { SimulationScenario } from '@/types/simulation';
import { GrowthAnalysisResult } from '@/hooks/finance/useGrowthAnalysis';
import { TrendingUp, Target, Calendar, DollarSign, ArrowUp } from 'lucide-react';

interface PdfGrowthAnalysisPageProps {
  baseScenario: SimulationScenario;
  growthScenario: SimulationScenario;
  analysis: GrowthAnalysisResult | null;
}

/**
 * PDF Page for Growth Analysis - Year-over-Year comparison
 * Used in Growth Comparison export
 */
export function PdfGrowthAnalysisPage({
  baseScenario,
  growthScenario,
  analysis,
}: PdfGrowthAnalysisPageProps) {
  // Calculate basic growth metrics
  const baseRevenue = baseScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
  const growthRevenue = growthScenario.revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
  const revenueGrowth = baseRevenue > 0 ? ((growthRevenue - baseRevenue) / baseRevenue) * 100 : 0;

  const baseExpenses = baseScenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
  const growthExpenses = growthScenario.expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
  const expenseGrowth = baseExpenses > 0 ? ((growthExpenses - baseExpenses) / baseExpenses) * 100 : 0;

  const baseProfit = baseRevenue - baseExpenses;
  const growthProfit = growthRevenue - growthExpenses;
  const profitGrowth = baseProfit !== 0 ? ((growthProfit - baseProfit) / Math.abs(baseProfit)) * 100 : 0;

  const yearDiff = growthScenario.targetYear - baseScenario.targetYear;
  const cagr = yearDiff > 0 ? (Math.pow(growthRevenue / baseRevenue, 1 / yearDiff) - 1) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <PdfPageWrapper>
      <div className="p-8 h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-8 w-8 text-emerald-600" />
            <h1 className="text-2xl font-bold text-foreground">Büyüme Projeksiyonu Analizi</h1>
          </div>
          <p className="text-muted-foreground">
            {baseScenario.targetYear} → {growthScenario.targetYear} | {yearDiff} Yıllık Büyüme Yolculuğu
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">Gelir Büyümesi</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{formatPercent(revenueGrowth)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatCurrency(baseRevenue)} → {formatCurrency(growthRevenue)}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Kâr Büyümesi</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{formatPercent(profitGrowth)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatCurrency(baseProfit)} → {formatCurrency(growthProfit)}
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUp className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">CAGR</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{cagr.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {yearDiff} yıllık bileşik büyüme
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Gider Değişimi</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">{formatPercent(expenseGrowth)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatCurrency(baseExpenses)} → {formatCurrency(growthExpenses)}
            </div>
          </div>
        </div>

        {/* Year-over-Year Comparison Table */}
        <div className="flex-1 grid grid-cols-2 gap-6">
          {/* Base Year */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-2 border-b">
              <h3 className="font-semibold">{baseScenario.targetYear} - {baseScenario.name}</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toplam Gelir</span>
                <span className="font-medium">{formatCurrency(baseRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toplam Gider</span>
                <span className="font-medium">{formatCurrency(baseExpenses)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net Kâr</span>
                <span className={`font-bold ${baseProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(baseProfit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kâr Marjı</span>
                <span className="font-medium">
                  {baseRevenue > 0 ? ((baseProfit / baseRevenue) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Growth Year */}
          <div className="border rounded-lg overflow-hidden border-emerald-300">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 px-4 py-2 border-b border-emerald-200">
              <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">
                {growthScenario.targetYear} - {growthScenario.name}
              </h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toplam Gelir</span>
                <span className="font-medium">{formatCurrency(growthRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toplam Gider</span>
                <span className="font-medium">{formatCurrency(growthExpenses)}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net Kâr</span>
                <span className={`font-bold ${growthProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(growthProfit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kâr Marjı</span>
                <span className="font-medium">
                  {growthRevenue > 0 ? ((growthProfit / growthRevenue) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights (if available) */}
        {analysis && analysis.growthInsights && analysis.growthInsights.length > 0 && (
          <div className="mt-6 border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-amber-500">✨</span> AI Büyüme İçgörüleri
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {analysis.growthInsights.slice(0, 4).map((insight, idx) => (
                <div key={idx} className="bg-muted/30 rounded p-2">
                  <div className="font-medium text-sm">{insight.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{insight.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t flex justify-between text-xs text-muted-foreground">
          <span>Büyüme Projeksiyonu Raporu</span>
          <span>{new Date().toLocaleDateString('tr-TR')}</span>
        </div>
      </div>
    </PdfPageWrapper>
  );
}

export default PdfGrowthAnalysisPage;
