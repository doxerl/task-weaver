import React, { useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  AlertTriangle,
  Rocket,
  CheckCircle2,
  Target,
  AlertCircle,
} from 'lucide-react';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  SimulationScenario,
  DealConfiguration,
  InvestmentScenarioComparison,
  MultiYearCapitalPlan,
  NextYearProjection
} from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';
import { calculateCapitalNeeds, calculateExitPlan, calculateInvestmentScenarioComparison, calculateMultiYearCapitalNeeds, AIProjectionForExitPlan } from '@/hooks/finance/useInvestorAnalysis';
import { calculateInternalGrowthRate } from '@/utils/yearCalculations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvestmentScenarioCard } from './InvestmentScenarioCard';
import { FutureImpactChart } from './FutureImpactChart';
import { AIInvestmentTimingCard } from './AIInvestmentTimingCard';
import { QuarterlyCashFlowTable } from './QuarterlyCashFlowTable';
import { ValuationMethodsCard } from './ValuationMethodsCard';
import { getEBITDAMultiple, DEFAULT_VALUATION_CONFIG } from '@/lib/valuationCalculator';

interface InvestmentTabProps {
  scenarioA: SimulationScenario;
  scenarioB: SimulationScenario;
  summaryA: { totalRevenue: number; totalExpenses: number; netProfit: number; profitMargin: number };
  summaryB: { totalRevenue: number; totalExpenses: number; netProfit: number; profitMargin: number };
  quarterlyA: { q1: number; q2: number; q3: number; q4: number };
  quarterlyB: { q1: number; q2: number; q3: number; q4: number };
  // New: Detailed revenue/expense for quarterly table
  quarterlyRevenueA?: { q1: number; q2: number; q3: number; q4: number };
  quarterlyExpenseA?: { q1: number; q2: number; q3: number; q4: number };
  quarterlyRevenueB?: { q1: number; q2: number; q3: number; q4: number };
  quarterlyExpenseB?: { q1: number; q2: number; q3: number; q4: number };
  dealConfig: DealConfiguration;
  onDealConfigChange: (updates: Partial<DealConfiguration>) => void;
  // NEW: AI projection for Exit Plan integration
  aiNextYearProjection?: NextYearProjection;
  // NEW: User-edited projection override - syncs editable table totals to 5-year projection
  editedProjectionOverride?: {
    totalRevenue: number;
    totalExpenses: number;
  };
  // NEW: Base year data for projection table context
  baseYearData?: {
    year: number;
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
  };
}

const InvestmentTabComponent: React.FC<InvestmentTabProps> = ({
  scenarioA,
  scenarioB,
  summaryA,
  summaryB,
  quarterlyA,
  quarterlyB,
  quarterlyRevenueA,
  quarterlyExpenseA,
  quarterlyRevenueB,
  quarterlyExpenseB,
  dealConfig,
  onDealConfigChange,
  aiNextYearProjection,
  editedProjectionOverride,
  baseYearData,
}) => {
  const { t } = useTranslation(['simulation', 'common']);
  // Calculate capital needs for both scenarios
  const capitalNeedA = useMemo(() => calculateCapitalNeeds(quarterlyA), [quarterlyA]);
  const capitalNeedB = useMemo(() => calculateCapitalNeeds(quarterlyB), [quarterlyB]);

  // Calculate growth rate - POZİTİF senaryonun iç büyümesi (base → projected)
  const growthRate = useMemo(() => {
    const baseRevenue = scenarioA.revenues?.reduce(
      (sum, r) => sum + (r.baseAmount || 0), 0
    ) || 0;
    return calculateInternalGrowthRate(baseRevenue, summaryA.totalRevenue, 0.10);
  }, [scenarioA.revenues, summaryA.totalRevenue]);

  // Senaryo yılını hesapla - max(A.targetYear, B.targetYear)
  const scenarioTargetYear = useMemo(() => {
    return Math.max(scenarioA.targetYear || 2026, scenarioB.targetYear || 2026);
  }, [scenarioA.targetYear, scenarioB.targetYear]);

  // AI projeksiyonunu Exit Plan formatına dönüştür
  // UPDATED: editedProjectionOverride varsa, kullanıcı düzenlemelerini kullan
  const aiProjectionForExitPlan = useMemo<AIProjectionForExitPlan | undefined>(() => {
    // DEBUG: AI projeksiyonunun gelip gelmediğini kontrol et
    console.log('[InvestmentTab] AI Next Year Projection:', {
      hasProjection: !!aiNextYearProjection,
      summary: aiNextYearProjection?.summary,
      investorHook: aiNextYearProjection?.investor_hook,
      hasEditedOverride: !!editedProjectionOverride,
      editedOverride: editedProjectionOverride,
    });
    
    if (!aiNextYearProjection) return undefined;
    
    // AI'ın önerdiği büyüme oranını parse et (e.g. "%65 YoY" → 0.65 veya "65% YoY" → 0.65)
    let growthRateHint: number | undefined;
    if (aiNextYearProjection.investor_hook?.revenue_growth_yoy) {
      const match = aiNextYearProjection.investor_hook.revenue_growth_yoy.match(/[0-9.]+/);
      if (match) {
        growthRateHint = parseFloat(match[0]) / 100;
      }
    }
    
    // YENİ: Kullanıcı düzenlemesi varsa, AI summary'sini override et
    const effectiveRevenue = editedProjectionOverride?.totalRevenue ?? aiNextYearProjection.summary.total_revenue;
    const effectiveExpenses = editedProjectionOverride?.totalExpenses ?? aiNextYearProjection.summary.total_expenses;
    const effectiveNetProfit = effectiveRevenue - effectiveExpenses;
    
    const result = {
      year1Revenue: effectiveRevenue,
      year1Expenses: effectiveExpenses,
      year1NetProfit: effectiveNetProfit,
      quarterlyData: {
        revenues: {
          q1: aiNextYearProjection.quarterly.q1.revenue,
          q2: aiNextYearProjection.quarterly.q2.revenue,
          q3: aiNextYearProjection.quarterly.q3.revenue,
          q4: aiNextYearProjection.quarterly.q4.revenue,
        },
        expenses: {
          q1: aiNextYearProjection.quarterly.q1.expenses,
          q2: aiNextYearProjection.quarterly.q2.expenses,
          q3: aiNextYearProjection.quarterly.q3.expenses,
          q4: aiNextYearProjection.quarterly.q4.expenses,
        },
      },
      growthRateHint,
    };
    
    console.log('[InvestmentTab] AI Projection for Exit Plan (with override):', result);
    
    return result;
  }, [aiNextYearProjection, editedProjectionOverride]);

  // Calculate exit plan - AI DESTEKLİ
  const exitPlan = useMemo(() => {
    return calculateExitPlan(
      dealConfig, 
      summaryA.totalRevenue, 
      summaryA.totalExpenses, 
      growthRate, 
      'default', 
      scenarioTargetYear,
      aiProjectionForExitPlan  // YENİ: AI projeksiyonu
    );
  }, [dealConfig, summaryA.totalRevenue, summaryA.totalExpenses, growthRate, scenarioTargetYear, aiProjectionForExitPlan]);

  // Calculate multi-year capital needs - AI çeyreklik veri desteği ile
  const multiYearCapitalPlan = useMemo<MultiYearCapitalPlan>(() => {
    return calculateMultiYearCapitalNeeds(
      exitPlan,
      dealConfig.investmentAmount,
      summaryA.netProfit, // Year 1 net profit
      dealConfig.safetyMargin / 100, // Convert percentage to decimal
      aiProjectionForExitPlan?.quarterlyData  // YENİ: AI çeyreklik verileri
    );
  }, [exitPlan, dealConfig.investmentAmount, summaryA.netProfit, dealConfig.safetyMargin, aiProjectionForExitPlan?.quarterlyData]);

  // Calculate runway data for chart - CORRECTED LOGIC
  // Yatırımlı = Pozitif Senaryo (A) + Yatırım ile başla
  // Yatırımsız = Negatif Senaryo (B) + 0 ile başla
  const runwayData = useMemo(() => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const flowsA = [quarterlyA.q1, quarterlyA.q2, quarterlyA.q3, quarterlyA.q4]; // Pozitif (yatırımlı)
    const flowsB = [quarterlyB.q1, quarterlyB.q2, quarterlyB.q3, quarterlyB.q4]; // Negatif (yatırımsız)
    
    let cumulativeWithInvestment = dealConfig.investmentAmount; // Yatırımla başla
    let cumulativeWithoutInvestment = 0; // Öz sermaye ile başla
    
    return quarters.map((q, i) => {
      cumulativeWithInvestment += flowsA[i]; // Pozitif senaryo akışları
      cumulativeWithoutInvestment += flowsB[i]; // Negatif senaryo akışları
      
      return {
        quarter: q,
        withInvestment: cumulativeWithInvestment,
        withoutInvestment: cumulativeWithoutInvestment,
        difference: cumulativeWithInvestment - cumulativeWithoutInvestment, // Fırsat maliyeti
      };
    });
  }, [quarterlyA, quarterlyB, dealConfig.investmentAmount]);

  // Opportunity cost calculation - Pozitif vs Negatif fark
  const opportunityCost = useMemo(() => {
    return summaryA.totalRevenue - summaryB.totalRevenue;
  }, [summaryA.totalRevenue, summaryB.totalRevenue]);

  // Capital efficiency calculation - POZİTİF senaryo bazlı
  const capitalEfficiency = useMemo(() => {
    if (capitalNeedA.requiredInvestment <= 0) return Infinity;
    return summaryA.totalRevenue / capitalNeedA.requiredInvestment;
  }, [summaryA.totalRevenue, capitalNeedA.requiredInvestment]);

  // Investment Scenario Comparison - Yatırım Al vs Alama
  const scenarioComparison = useMemo<InvestmentScenarioComparison>(() => {
    const baseRevenueA = scenarioA.revenues?.reduce((sum, r) => sum + (r.baseAmount || 0), 0) || 0;
    const baseRevenueB = scenarioB.revenues?.reduce((sum, r) => sum + (r.baseAmount || 0), 0) || 0;
    
    return calculateInvestmentScenarioComparison(
      {
        totalRevenue: summaryA.totalRevenue,
        totalExpenses: summaryA.totalExpenses,
        netProfit: summaryA.netProfit,
        profitMargin: summaryA.profitMargin,
        baseRevenue: baseRevenueA,
      },
      {
        totalRevenue: summaryB.totalRevenue,
        totalExpenses: summaryB.totalExpenses,
        netProfit: summaryB.netProfit,
        profitMargin: summaryB.profitMargin,
        baseRevenue: baseRevenueB,
      },
      exitPlan,
      dealConfig.sectorMultiple,
      scenarioTargetYear
    );
  }, [summaryA, summaryB, exitPlan, dealConfig.sectorMultiple, scenarioA.revenues, scenarioB.revenues, scenarioTargetYear]);

  // Updated chart config - corrected labels
  const chartConfig: ChartConfig = {
    withInvestment: { label: t('simulation:investment.cashFlowRunway.withInvestmentLabel'), color: '#22c55e' },
    withoutInvestment: { label: t('simulation:investment.cashFlowRunway.withoutInvestmentLabel'), color: '#ef4444' },
    difference: { label: t('simulation:investment.cashFlowRunway.opportunityCost'), color: '#3b82f6' },
  };

  return (
    <div className="space-y-4 print-page-break">
      {/* Investment Tier Selector - 3 options */}
      {capitalNeedB.investmentTiers && !capitalNeedB.selfSustaining && (
        <Card className="border-blue-500/20 bg-blue-500/5 avoid-break">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              {t('simulation:investment.options.title')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('simulation:investment.options.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {capitalNeedB.investmentTiers.map((tier) => (
                <button
                  key={tier.tier}
                  onClick={() => onDealConfigChange({ investmentAmount: tier.amount })}
                  className={`p-3 rounded-lg border text-left transition-all hover:scale-[1.02] ${
                    tier.tier === 'minimum' ? 'border-amber-500/30 hover:border-amber-500/50 bg-amber-500/5' :
                    tier.tier === 'recommended' ? 'border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20' :
                    'border-blue-500/30 hover:border-blue-500/50 bg-blue-500/5'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    {tier.tier === 'minimum' && <AlertCircle className="h-3 w-3 text-amber-400" />}
                    {tier.tier === 'recommended' && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                    {tier.tier === 'aggressive' && <Rocket className="h-3 w-3 text-blue-400" />}
                    <span className="text-xs font-medium">{tier.label}</span>
                  </div>
                  <div className="text-lg font-bold">{formatCompactUSD(tier.amount)}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {tier.runwayMonths < 999 ? `${tier.runwayMonths} ay runway` : '∞'}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{tier.description}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Investment Timing Card - Optimal yatırım zamanlaması */}
      <AIInvestmentTimingCard
        quarterlyA={quarterlyA}
        quarterlyB={quarterlyB}
        capitalNeedB={capitalNeedB}
        investmentAmount={dealConfig.investmentAmount}
        targetYear={scenarioB.targetYear}
      />

      {/* Quarterly Cash Flow Table - Detaylı çeyreklik nakit akış analizi */}
      {quarterlyRevenueA && quarterlyExpenseA && quarterlyRevenueB && quarterlyExpenseB && (
        <QuarterlyCashFlowTable
          quarterlyRevenueA={quarterlyRevenueA}
          quarterlyExpenseA={quarterlyExpenseA}
          quarterlyRevenueB={quarterlyRevenueB}
          quarterlyExpenseB={quarterlyExpenseB}
          investmentAmount={dealConfig.investmentAmount}
          scenarioAName={`${scenarioA.targetYear} ${scenarioA.name}`}
          scenarioBName={`${scenarioB.targetYear} ${scenarioB.name}`}
        />
      )}

      {/* Investment Scenario Comparison - Yatırım Al vs Alama */}
      <InvestmentScenarioCard 
        comparison={scenarioComparison}
        scenarioAName={`${scenarioA.targetYear} ${scenarioA.name}`}
        scenarioBName={`${scenarioB.targetYear} ${scenarioB.name}`}
        scenarioYear={scenarioTargetYear}
      />

      {/* 5 Year Future Impact Chart */}
      <FutureImpactChart comparison={scenarioComparison} scenarioYear={scenarioTargetYear} />

      {/* Capital Needs Comparison */}
      <div className="grid grid-cols-3 gap-4 avoid-break">
        <Card className={capitalNeedA.selfSustaining ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">{scenarioA.targetYear} {scenarioA.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {capitalNeedA.selfSustaining ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-400">{t('simulation:investment.dealSimulator.selfFinancing')}</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-400">
                  {formatCompactUSD(capitalNeedA.requiredInvestment)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('simulation:investment.capitalComparison.criticalQuarter')}: {capitalNeedA.criticalQuarter}
                </p>
              </>
            )}

            {/* Additional Metrics */}
            <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('simulation:investment.capitalComparison.yearEnd')}:</span>
                <span className={capitalNeedA.yearEndDeficit ? 'text-red-400' : 'text-emerald-400'}>
                  {formatCompactUSD(capitalNeedA.yearEndBalance)}
                </span>
              </div>
              {capitalNeedA.breakEvenQuarter && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t('simulation:investment.capitalComparison.breakEven')}:</span>
                  <span className="text-blue-400">{capitalNeedA.breakEvenQuarter}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('simulation:investment.capitalComparison.runway')}:</span>
                <span>{capitalNeedA.runwayMonths < 999 ? `${capitalNeedA.runwayMonths} ${t('common:units.months')}` : '∞'}</span>
              </div>
              {capitalNeedA.extendedRunway && capitalNeedA.extendedRunway.combinedDeathValley < 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t('simulation:investment.capitalComparison.twoYearDeathValley')}:</span>
                  <span className="text-orange-400">
                    {formatCompactUSD(capitalNeedA.extendedRunway.combinedDeathValley)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">{scenarioB.targetYear} {scenarioB.name} {t('simulation:investment.capitalComparison.requirement')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {formatCompactUSD(capitalNeedB.requiredInvestment)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('simulation:investment.capitalComparison.criticalQuarter')}: {capitalNeedB.criticalQuarter}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('simulation:investment.capitalComparison.monthlyBurn')}: {formatCompactUSD(capitalNeedB.burnRateMonthly)}
            </p>

            {/* Additional Metrics */}
            <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('simulation:investment.capitalComparison.yearEnd')}:</span>
                <span className={capitalNeedB.yearEndDeficit ? 'text-red-400' : 'text-emerald-400'}>
                  {formatCompactUSD(capitalNeedB.yearEndBalance)}
                </span>
              </div>
              {capitalNeedB.breakEvenQuarter && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t('simulation:investment.capitalComparison.breakEven')}:</span>
                  <span className="text-blue-400">{capitalNeedB.breakEvenQuarter}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('simulation:investment.capitalComparison.runway')}:</span>
                <span>{capitalNeedB.runwayMonths < 999 ? `${capitalNeedB.runwayMonths} ${t('common:units.months')}` : '∞'}</span>
              </div>
              {capitalNeedB.extendedRunway && capitalNeedB.extendedRunway.combinedDeathValley < 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{t('simulation:investment.capitalComparison.twoYearDeathValley')}:</span>
                  <span className="text-orange-400">
                    {formatCompactUSD(capitalNeedB.extendedRunway.combinedDeathValley)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">{t('simulation:investment.capitalComparison.opportunityCostCard')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {formatCompactUSD(opportunityCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('simulation:investment.capitalComparison.opportunityCostDesc')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Runway Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('simulation:investment.cashFlowRunway.title')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('simulation:investment.cashFlowRunway.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <LineChart data={runwayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis tickFormatter={(v) => formatCompactUSD(v)} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" />
              <Line type="monotone" dataKey="withInvestment" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} name={t('simulation:investment.cashFlowRunway.withInvestmentLabel')} />
              <Line type="monotone" dataKey="withoutInvestment" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} name={t('simulation:investment.cashFlowRunway.withoutInvestmentLabel')} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Growth Model Info Card */}
      {exitPlan.growthConfig && (
        <Card className="bg-gradient-to-r from-blue-500/5 to-indigo-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">{t('simulation:investment.twoStageGrowth.title')}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-muted-foreground mb-1">{t('simulation:investment.twoStageGrowth.year1to2')}</p>
                <p className="font-semibold text-amber-600">
                  %{(exitPlan.growthConfig.aggressiveGrowthRate * 100).toFixed(0)}
                </p>
                {exitPlan.growthConfig.rawUserGrowthRate > 1.0 && (
                  <p className="text-xs text-amber-500 mt-1">
                    {t('simulation:investment.exitPlan.targetGrowth')}: %{(exitPlan.growthConfig.rawUserGrowthRate * 100).toFixed(0)} → %100 cap
                  </p>
                )}
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-muted-foreground mb-1">{t('simulation:investment.twoStageGrowth.year3to5')}</p>
                <p className="font-semibold text-green-600">
                  %{(exitPlan.growthConfig.normalizedGrowthRate * 100).toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{t('simulation:investment.twoStageGrowth.sectorAverage')}</p>
              </div>
            </div>

            {exitPlan.growthConfig.rawUserGrowthRate > 1.0 && (
              <div className="mt-3 p-2 rounded bg-amber-500/10 text-xs text-amber-600 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                {t('simulation:investment.twoStageGrowth.capWarningDetail', { original: (exitPlan.growthConfig.rawUserGrowthRate * 100).toFixed(0) })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Exit Plan Card (The Pot of Gold) */}
      <Card className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 border-amber-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Rocket className="h-4 w-4 text-amber-400" />
            {t('simulation:investment.exitPlan.title')} - {t('simulation:investment.exitPlan.subtitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {/* Entry */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">{t('simulation:investment.exitPlan.entry')}</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t('simulation:investment.exitPlan.investment')}:</span>
                  <span className="font-mono font-bold">{formatCompactUSD(dealConfig.investmentAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t('simulation:investment.exitPlan.share')}:</span>
                  <span className="font-mono font-bold">%{dealConfig.equityPercentage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t('simulation:investment.dealSimulator.valuation')}:</span>
                  <span className="font-mono font-bold">{formatCompactUSD(exitPlan.postMoneyValuation)}</span>
                </div>
              </div>
            </div>

            {/* Year 3 */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <h4 className="text-xs font-semibold text-blue-400 mb-2">{t('simulation:investment.exitPlan.year3')} ({exitPlan.yearLabels?.moic3Year})</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t('simulation:investment.exitPlan.companyValue')}:</span>
                  <span className="font-mono font-bold">{formatCompactUSD(exitPlan.year3Projection.companyValuation)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t('simulation:investment.exitPlan.investorShare')}:</span>
                  <span className="font-mono font-bold">{formatCompactUSD(exitPlan.investorShare3Year)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{t('simulation:investment.exitPlan.moic')}:</span>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {exitPlan.moic3Year.toFixed(1)}x
                  </Badge>
                </div>
              </div>
            </div>

            {/* Year 5 */}
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <h4 className="text-xs font-semibold text-emerald-400 mb-2">{t('simulation:investment.exitPlan.year5')} ({exitPlan.yearLabels?.moic5Year}) 🚀</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t('simulation:investment.exitPlan.companyValue')}:</span>
                  <span className="font-mono font-bold">{formatCompactUSD(exitPlan.year5Projection.companyValuation)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">{t('simulation:investment.exitPlan.investorShare')}:</span>
                  <span className="font-mono font-bold">{formatCompactUSD(exitPlan.investorShare5Year)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{t('simulation:investment.exitPlan.moic')}:</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    {exitPlan.moic5Year.toFixed(1)}x 🚀
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-muted-foreground">{t('simulation:investment.exitPlan.capitalEfficiency')}</div>
              <div className="text-lg font-bold text-primary">
                {isFinite(capitalEfficiency) ? `${capitalEfficiency.toFixed(1)}x` : '∞'}
              </div>
              <div className="text-xs text-muted-foreground">{t('simulation:investment.exitPlan.revenuePerDollar')}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('simulation:investment.exitPlan.targetGrowth')}</div>
              <div className="text-lg font-bold text-primary">
                %{(growthRate * 100).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">{t('simulation:scenario.title')}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('simulation:investment.exitPlan.breakEven')}</div>
              <div className="text-lg font-bold text-primary">
                {exitPlan.breakEvenYear ? t('simulation:investment.exitPlan.yearN', { year: exitPlan.breakEvenYear }) : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">{t('simulation:investment.exitPlan.breakEvenPoint')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Valuation Methods Card - comparison of 4 valuation methods */}
      {exitPlan.allYears && exitPlan.allYears.length > 0 && exitPlan.allYears[4]?.valuations && (
        <ValuationMethodsCard
          valuations={exitPlan.allYears[4].valuations}
          sectorMultiple={dealConfig.sectorMultiple}
          ebitdaMultiple={getEBITDAMultiple('default')}
          config={DEFAULT_VALUATION_CONFIG}
          year5Label={`${exitPlan.yearLabels?.moic5Year || scenarioTargetYear + 5}`}
        />
      )}

      {/* 5 Year Projection Detail Table - Enhanced with Multi-Year Capital Plan */}
      {exitPlan.allYears && exitPlan.allYears.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              {t('simulation:investment.fiveYearProjection.title')}
              {multiYearCapitalPlan.selfSustainingFromYear && (
                <Badge variant="outline" className="ml-2 text-emerald-500 border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {t('simulation:investment.dealSimulator.selfFinancing')} ({multiYearCapitalPlan.selfSustainingFromYear}+)
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('simulation:investment.fiveYearProjection.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">{t('simulation:investment.fiveYearProjection.year')}</TableHead>
                  <TableHead className="text-right">{t('simulation:investment.fiveYearProjection.opening')}</TableHead>
                  <TableHead className="text-right">{t('simulation:investment.fiveYearProjection.revenue')}</TableHead>
                  <TableHead className="text-right">{t('simulation:investment.fiveYearProjection.expense')}</TableHead>
                  <TableHead className="text-right">{t('simulation:investment.fiveYearProjection.netProfit')}</TableHead>
                  <TableHead className="text-right">{t('simulation:investment.fiveYearProjection.deathValley')}</TableHead>
                  <TableHead className="text-right">{t('simulation:investment.fiveYearProjection.capitalNeed')}</TableHead>
                  <TableHead className="text-right">{t('simulation:investment.fiveYearProjection.yearEnd')}</TableHead>
                  <TableHead className="text-right">{t('simulation:investment.fiveYearProjection.valuation')}</TableHead>
                  <TableHead className="text-right">{t('simulation:investment.exitPlan.moic')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Base Year Row (e.g., 2025) */}
                {baseYearData && (
                  <TableRow className="bg-muted/30 border-b border-dashed">
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-1">
                        {baseYearData.year}
                        <Badge variant="outline" className="text-[10px] px-1 py-0">Baz</Badge>
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground font-mono text-sm">–</TableCell>
                    <TableCell className="text-right font-mono">{formatCompactUSD(baseYearData.totalRevenue)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCompactUSD(baseYearData.totalExpenses)}</TableCell>
                    <TableCell className={`text-right font-mono ${baseYearData.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatCompactUSD(baseYearData.netProfit)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                  </TableRow>
                )}
                {/* Scenario Year Row (e.g., 2026 - Positive scenario) */}
                {baseYearData && (
                  <TableRow className="bg-blue-500/5 border-b-2">
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-1">
                        {scenarioTargetYear}
                        <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-500/30 text-blue-500">Senaryo</Badge>
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground font-mono text-sm">
                      {formatCompactUSD(baseYearData.netProfit)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCompactUSD(summaryA.totalRevenue)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCompactUSD(summaryA.totalExpenses)}</TableCell>
                    <TableCell className={`text-right font-mono ${summaryA.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {formatCompactUSD(summaryA.netProfit)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                    <TableCell className="text-right text-muted-foreground">-</TableCell>
                  </TableRow>
                )}
                {multiYearCapitalPlan.years.map((yearCap, i) => {
                  const yearData = exitPlan.allYears?.[i];
                  const moic = yearCap.weightedValuation > 0 
                    ? (yearCap.weightedValuation * (dealConfig.equityPercentage / 100)) / dealConfig.investmentAmount 
                    : 0;
                  
                  return (
                    <TableRow key={yearCap.year}>
                      <TableCell className="font-medium">{yearCap.year}</TableCell>
                      <TableCell className="text-right text-muted-foreground font-mono text-sm">
                        {formatCompactUSD(yearCap.openingCash)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCompactUSD(yearCap.projectedRevenue)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCompactUSD(yearCap.projectedExpenses)}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${yearCap.projectedNetProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {formatCompactUSD(yearCap.projectedNetProfit)}
                      </TableCell>
                      <TableCell className="text-right">
                        {yearCap.peakDeficit < 0 ? (
                          <span className="text-red-500 font-mono text-sm">
                            {formatCompactUSD(yearCap.peakDeficit)} 
                            <span className="text-[10px] text-muted-foreground ml-1">({yearCap.peakDeficitQuarter})</span>
                          </span>
                        ) : (
                          <span className="text-emerald-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {yearCap.requiredCapital > 0 ? (
                          <Badge variant="outline" className="text-amber-500 border-amber-500/30 font-mono">
                            {formatCompactUSD(yearCap.requiredCapital)}
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            {t('simulation:capital.none')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCompactUSD(yearCap.endingCash)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">
                        {formatCompactUSD(yearCap.weightedValuation)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={moic >= 3 ? "default" : "secondary"} className="font-mono">
                          {moic.toFixed(1)}x
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Total Row */}
                <TableRow className="bg-muted/50 font-bold border-t-2">
                  <TableCell>{t('simulation:capital.total')}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCompactUSD(multiYearCapitalPlan.years.reduce((sum, y) => sum + y.projectedRevenue, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCompactUSD(multiYearCapitalPlan.years.reduce((sum, y) => sum + y.projectedExpenses, 0))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-emerald-500">
                    {formatCompactUSD(multiYearCapitalPlan.years.reduce((sum, y) => sum + y.projectedNetProfit, 0))}
                  </TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30 font-mono">
                      {formatCompactUSD(multiYearCapitalPlan.totalRequiredInvestment)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-emerald-500">
                    {formatCompactUSD(multiYearCapitalPlan.cumulativeEndingCash)}
                  </TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const InvestmentTab = memo(InvestmentTabComponent);
