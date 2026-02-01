import React, { useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  PiggyBank,
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
  SECTOR_MULTIPLES,
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
import { QuarterlyCapitalTable } from './QuarterlyCapitalTable';
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
}) => {
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
    withInvestment: { label: 'Yatırımlı (Pozitif Senaryo)', color: '#22c55e' },
    withoutInvestment: { label: 'Yatırımsız (Negatif Senaryo)', color: '#ef4444' },
    difference: { label: 'Fırsat Maliyeti', color: '#3b82f6' },
  };

  return (
    <div className="space-y-4">
      {/* Deal Configuration */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Yatırım Anlaşması Simülatörü
          </CardTitle>
          <CardDescription className="text-xs">
            Yatırım tutarı ve hisse oranını ayarlayarak exit planını görün
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Yatırım Tutarı</Label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={dealConfig.investmentAmount}
                  onChange={(e) => onDealConfigChange({ investmentAmount: Number(e.target.value) })}
                  className="pl-8 font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Önerilen: {formatCompactUSD(capitalNeedB.requiredInvestment)}
                {capitalNeedB.calculationBasis && capitalNeedB.calculationBasis !== 'none' && (
                  <span className="text-[10px] ml-1 opacity-70">
                    ({capitalNeedB.calculationBasis === 'death_valley' ? 'Death Valley' : 'Yıl Sonu Açığı'} bazlı)
                  </span>
                )}
              </p>
              {/* Yıl bazlı ek sermaye önerileri */}
              {multiYearCapitalPlan.years.length > 1 && multiYearCapitalPlan.years[1]?.requiredCapital > 0 && (
                <p className="text-xs text-amber-500">
                  <strong>{multiYearCapitalPlan.years[1]?.year}:</strong> {formatCompactUSD(multiYearCapitalPlan.years[1]?.requiredCapital)}
                  <span className="text-[10px] ml-1">(ek sermaye)</span>
                </p>
              )}
              {multiYearCapitalPlan.selfSustainingFromYear && (
                <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {multiYearCapitalPlan.selfSustainingFromYear}'dan itibaren kendi kendini finanse ediyor
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Hisse Oranı: %{dealConfig.equityPercentage}</Label>
              <Slider
                value={[dealConfig.equityPercentage]}
                onValueChange={([value]) => onDealConfigChange({ equityPercentage: value })}
                min={5}
                max={30}
                step={1}
                className="mt-3"
              />
              <p className="text-xs text-muted-foreground">
                Değerleme: {formatCompactUSD(exitPlan.postMoneyValuation)}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Sektör Çarpanı</Label>
              <Select 
                value={String(dealConfig.sectorMultiple)}
                onValueChange={(v) => onDealConfigChange({ sectorMultiple: Number(v) })}
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
        </CardContent>
      </Card>

      {/* Investment Tier Selector - 3 Seçenekli Yatırım Önerisi */}
      {capitalNeedB.investmentTiers && !capitalNeedB.selfSustaining && (
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              Yatırım Seçenekleri
            </CardTitle>
            <CardDescription className="text-xs">
              İş ihtiyaçlarınıza göre uygun yatırım tutarını seçin
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

      {/* Quarterly Capital Table - Detaylı çeyreklik analiz */}
      {quarterlyRevenueA && quarterlyExpenseA && quarterlyRevenueB && quarterlyExpenseB && (
        <QuarterlyCapitalTable
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
      <div className="grid grid-cols-3 gap-4">
        <Card className={capitalNeedA.selfSustaining ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">{scenarioA.targetYear} {scenarioA.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {capitalNeedA.selfSustaining ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-400">Kendi Kendini Finanse Ediyor</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-400">
                  {formatCompactUSD(capitalNeedA.requiredInvestment)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Kritik Çeyrek: {capitalNeedA.criticalQuarter}
                </p>
              </>
            )}
            
            {/* Ek Metrikler */}
            <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Yıl Sonu:</span>
                <span className={capitalNeedA.yearEndDeficit ? 'text-red-400' : 'text-emerald-400'}>
                  {formatCompactUSD(capitalNeedA.yearEndBalance)}
                </span>
              </div>
              {capitalNeedA.breakEvenQuarter && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Break-even:</span>
                  <span className="text-blue-400">{capitalNeedA.breakEvenQuarter}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Runway:</span>
                <span>{capitalNeedA.runwayMonths < 999 ? `${capitalNeedA.runwayMonths} ay` : '∞'}</span>
              </div>
              {capitalNeedA.extendedRunway && capitalNeedA.extendedRunway.combinedDeathValley < 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">2Y Death Valley:</span>
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
            <CardTitle className="text-xs text-muted-foreground">{scenarioB.targetYear} {scenarioB.name} İhtiyacı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {formatCompactUSD(capitalNeedB.requiredInvestment)}
            </div>
            <p className="text-xs text-muted-foreground">
              Kritik Çeyrek: {capitalNeedB.criticalQuarter}
            </p>
            <p className="text-xs text-muted-foreground">
              Aylık Burn: {formatCompactUSD(capitalNeedB.burnRateMonthly)}
            </p>
            
            {/* Ek Metrikler */}
            <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Yıl Sonu:</span>
                <span className={capitalNeedB.yearEndDeficit ? 'text-red-400' : 'text-emerald-400'}>
                  {formatCompactUSD(capitalNeedB.yearEndBalance)}
                </span>
              </div>
              {capitalNeedB.breakEvenQuarter && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Break-even:</span>
                  <span className="text-blue-400">{capitalNeedB.breakEvenQuarter}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Runway:</span>
                <span>{capitalNeedB.runwayMonths < 999 ? `${capitalNeedB.runwayMonths} ay` : '∞'}</span>
              </div>
              {capitalNeedB.extendedRunway && capitalNeedB.extendedRunway.combinedDeathValley < 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">2Y Death Valley:</span>
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
            <CardTitle className="text-xs text-muted-foreground">Fırsat Maliyeti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {formatCompactUSD(opportunityCost)}
            </div>
            <p className="text-xs text-muted-foreground">
              Yatırım almazsanız masada bırakacağınız potansiyel gelir
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Runway Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Nakit Akışı Runway Grafiği
          </CardTitle>
          <CardDescription className="text-xs">
            Yatırımlı ve yatırımsız senaryo karşılaştırması
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
              <Line type="monotone" dataKey="withInvestment" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} name="Yatırımlı (Pozitif Senaryo)" />
              <Line type="monotone" dataKey="withoutInvestment" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} name="Yatırımsız (Negatif Senaryo)" />
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
              <span className="font-medium text-sm">İki Aşamalı Büyüme Modeli</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-muted-foreground mb-1">Year 1-2 (Agresif)</p>
                <p className="font-semibold text-amber-600">
                  %{(exitPlan.growthConfig.aggressiveGrowthRate * 100).toFixed(0)}
                </p>
                {exitPlan.growthConfig.rawUserGrowthRate > 1.0 && (
                  <p className="text-xs text-amber-500 mt-1">
                    Hedef: %{(exitPlan.growthConfig.rawUserGrowthRate * 100).toFixed(0)} → %100 cap
                  </p>
                )}
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-muted-foreground mb-1">Year 3-5 (Normalize)</p>
                <p className="font-semibold text-green-600">
                  %{(exitPlan.growthConfig.normalizedGrowthRate * 100).toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Sektör ortalaması</p>
              </div>
            </div>
            
            {exitPlan.growthConfig.rawUserGrowthRate > 1.0 && (
              <div className="mt-3 p-2 rounded bg-amber-500/10 text-xs text-amber-600 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                Agresif aşama %100 ile sınırlandı (orijinal hedef: %{(exitPlan.growthConfig.rawUserGrowthRate * 100).toFixed(0)})
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
            Exit Planı - Yatırımcı Getiri Projeksiyonu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {/* Entry */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">GİRİŞ</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Yatırım:</span>
                  <span className="font-mono font-bold">{formatCompactUSD(dealConfig.investmentAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Hisse:</span>
                  <span className="font-mono font-bold">%{dealConfig.equityPercentage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Değerleme:</span>
                  <span className="font-mono font-bold">{formatCompactUSD(exitPlan.postMoneyValuation)}</span>
                </div>
              </div>
            </div>

            {/* Year 3 */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <h4 className="text-xs font-semibold text-blue-400 mb-2">3. YIL ({exitPlan.yearLabels?.moic3Year})</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Şirket Değeri:</span>
                  <span className="font-mono font-bold">{formatCompactUSD(exitPlan.year3Projection.companyValuation)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Yatırımcı Payı:</span>
                  <span className="font-mono font-bold">{formatCompactUSD(exitPlan.investorShare3Year)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">MOIC:</span>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {exitPlan.moic3Year.toFixed(1)}x
                  </Badge>
                </div>
              </div>
            </div>

            {/* Year 5 */}
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <h4 className="text-xs font-semibold text-emerald-400 mb-2">5. YIL ({exitPlan.yearLabels?.moic5Year}) 🚀</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Şirket Değeri:</span>
                  <span className="font-mono font-bold">{formatCompactUSD(exitPlan.year5Projection.companyValuation)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Yatırımcı Payı:</span>
                  <span className="font-mono font-bold">{formatCompactUSD(exitPlan.investorShare5Year)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">MOIC:</span>
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
              <div className="text-xs text-muted-foreground">Sermaye Verimliliği</div>
              <div className="text-lg font-bold text-primary">
                {isFinite(capitalEfficiency) ? `${capitalEfficiency.toFixed(1)}x` : '∞'}
              </div>
              <div className="text-xs text-muted-foreground">Her $1 için gelir</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Hedef Büyüme</div>
              <div className="text-lg font-bold text-primary">
                %{(growthRate * 100).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Senaryo hedefi</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Break-even</div>
              <div className="text-lg font-bold text-primary">
                {exitPlan.breakEvenYear ? `Yıl ${exitPlan.breakEvenYear}` : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">Başabaş noktası</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Valuation Methods Card - 4 farklı değerleme metodunun karşılaştırması */}
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
              5 Yıllık Projeksiyon Detayı
              {multiYearCapitalPlan.selfSustainingFromYear && (
                <Badge variant="outline" className="ml-2 text-emerald-500 border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {multiYearCapitalPlan.selfSustainingFromYear}'dan itibaren kendi kendini finanse ediyor
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Yıl bağımlı sermaye hesaplaması: Devir kar → Çeyreklik death valley → Ek yatırım ihtiyacı
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">Yıl</TableHead>
                  <TableHead className="text-right">Açılış</TableHead>
                  <TableHead className="text-right">Gelir</TableHead>
                  <TableHead className="text-right">Gider</TableHead>
                  <TableHead className="text-right">Net Kar</TableHead>
                  <TableHead className="text-right">Death Valley</TableHead>
                  <TableHead className="text-right">Sermaye İhtiyacı</TableHead>
                  <TableHead className="text-right">Yıl Sonu</TableHead>
                  <TableHead className="text-right">Değerleme</TableHead>
                  <TableHead className="text-right">MOIC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
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
                            Yok
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
                  <TableCell>TOPLAM</TableCell>
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
