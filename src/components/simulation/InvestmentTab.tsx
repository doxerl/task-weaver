import React, { useMemo } from 'react';
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
  InvestmentScenarioComparison
} from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';
import { calculateCapitalNeeds, calculateExitPlan, calculateInvestmentScenarioComparison } from '@/hooks/finance/useInvestorAnalysis';
import { calculateInternalGrowthRate } from '@/utils/yearCalculations';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InvestmentScenarioCard } from './InvestmentScenarioCard';
import { FutureImpactChart } from './FutureImpactChart';

interface InvestmentTabProps {
  scenarioA: SimulationScenario;
  scenarioB: SimulationScenario;
  summaryA: { totalRevenue: number; totalExpenses: number; netProfit: number; profitMargin: number };
  summaryB: { totalRevenue: number; totalExpenses: number; netProfit: number; profitMargin: number };
  quarterlyA: { q1: number; q2: number; q3: number; q4: number };
  quarterlyB: { q1: number; q2: number; q3: number; q4: number };
  dealConfig: DealConfiguration;
  onDealConfigChange: (updates: Partial<DealConfiguration>) => void;
}

export const InvestmentTab: React.FC<InvestmentTabProps> = ({
  scenarioA,
  scenarioB,
  summaryA,
  summaryB,
  quarterlyA,
  quarterlyB,
  dealConfig,
  onDealConfigChange,
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

  // Calculate exit plan - POZİTİF SENARYO (A) verileriyle
  const exitPlan = useMemo(() => {
    return calculateExitPlan(dealConfig, summaryA.totalRevenue, summaryA.totalExpenses, growthRate);
  }, [dealConfig, summaryA.totalRevenue, summaryA.totalExpenses, growthRate]);

  // Calculate runway data for chart
  const runwayData = useMemo(() => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const flowsA = [quarterlyA.q1, quarterlyA.q2, quarterlyA.q3, quarterlyA.q4];
    const flowsB = [quarterlyB.q1, quarterlyB.q2, quarterlyB.q3, quarterlyB.q4];
    
    let cumulativeA = 0;
    let cumulativeB = 0;
    let cumulativeBWithInvestment = dealConfig.investmentAmount;
    
    return quarters.map((q, i) => {
      cumulativeA += flowsA[i];
      cumulativeB += flowsB[i];
      cumulativeBWithInvestment += flowsB[i];
      
      return {
        quarter: q,
        scenarioA: cumulativeA,
        scenarioB: cumulativeB,
        scenarioBWithInvestment: cumulativeBWithInvestment,
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
      dealConfig.sectorMultiple
    );
  }, [summaryA, summaryB, exitPlan, dealConfig.sectorMultiple, scenarioA.revenues, scenarioB.revenues]);

  const chartConfig: ChartConfig = {
    scenarioA: { label: scenarioA.name, color: '#6b7280' },
    scenarioB: { label: `${scenarioB.name} (Yatırımsız)`, color: '#ef4444' },
    scenarioBWithInvestment: { label: `${scenarioB.name} (Yatırımlı)`, color: '#22c55e' },
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
              </p>
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

      {/* Investment Scenario Comparison - Yatırım Al vs Alama */}
      <InvestmentScenarioCard 
        comparison={scenarioComparison}
        scenarioAName={scenarioA.name}
        scenarioBName={scenarioB.name}
      />

      {/* 5 Year Future Impact Chart */}
      <FutureImpactChart comparison={scenarioComparison} />

      {/* Capital Needs Comparison */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={capitalNeedA.selfSustaining ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">{scenarioA.name}</CardTitle>
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
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">{scenarioB.name} İhtiyacı</CardTitle>
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
              <Line type="monotone" dataKey="scenarioA" stroke="#6b7280" strokeWidth={2} dot={{ fill: '#6b7280' }} name={scenarioA.name} />
              <Line type="monotone" dataKey="scenarioB" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} name={`${scenarioB.name} (Yatırımsız)`} />
              <Line type="monotone" dataKey="scenarioBWithInvestment" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} name={`${scenarioB.name} (Yatırımlı)`} />
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

      {/* 5 Year Projection Detail Table */}
      {exitPlan.allYears && exitPlan.allYears.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              5 Yıllık Projeksiyon Detayı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Yıl</TableHead>
                  <TableHead>Aşama</TableHead>
                  <TableHead className="text-right">Büyüme</TableHead>
                  <TableHead className="text-right">Gelir</TableHead>
                  <TableHead className="text-right">Değerleme</TableHead>
                  <TableHead className="text-right">MOIC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exitPlan.allYears.map((year) => {
                  const moic = (year.companyValuation * (dealConfig.equityPercentage / 100)) / dealConfig.investmentAmount;
                  return (
                    <TableRow key={year.year}>
                      <TableCell className="font-medium">{year.actualYear}</TableCell>
                      <TableCell>
                        {year.growthStage === 'aggressive' ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                            Agresif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Normal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-blue-600 font-medium">
                        +{((year.appliedGrowthRate || 0) * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCompactUSD(year.revenue)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCompactUSD(year.companyValuation)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={moic >= 3 ? "default" : "secondary"} className="font-mono">
                          {moic.toFixed(1)}x
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

    </div>
  );
};
