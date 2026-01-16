import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Target,
  PiggyBank,
  Loader2,
  Brain,
  Rocket,
  Building2,
  CheckCircle2,
  ArrowRight,
  Percent,
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
  CapitalRequirement,
  ExitPlan,
  AIInvestorAnalysis,
  SECTOR_MULTIPLES 
} from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';
import { calculateCapitalNeeds, calculateExitPlan, projectFutureRevenue } from '@/hooks/finance/useInvestorAnalysis';

interface InvestmentTabProps {
  scenarioA: SimulationScenario;
  scenarioB: SimulationScenario;
  summaryA: { totalRevenue: number; totalExpenses: number; netProfit: number; profitMargin: number };
  summaryB: { totalRevenue: number; totalExpenses: number; netProfit: number; profitMargin: number };
  quarterlyA: { q1: number; q2: number; q3: number; q4: number };
  quarterlyB: { q1: number; q2: number; q3: number; q4: number };
  dealConfig: DealConfiguration;
  onDealConfigChange: (updates: Partial<DealConfiguration>) => void;
  investorAnalysis: AIInvestorAnalysis | null;
  isLoading: boolean;
  onAnalyze: () => void;
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
  investorAnalysis,
  isLoading,
  onAnalyze,
}) => {
  // Calculate capital needs for both scenarios
  const capitalNeedA = useMemo(() => calculateCapitalNeeds(quarterlyA), [quarterlyA]);
  const capitalNeedB = useMemo(() => calculateCapitalNeeds(quarterlyB), [quarterlyB]);

  // Calculate growth rate
  const growthRate = useMemo(() => {
    return summaryA.totalRevenue > 0 
      ? (summaryB.totalRevenue - summaryA.totalRevenue) / summaryA.totalRevenue 
      : 0.3;
  }, [summaryA.totalRevenue, summaryB.totalRevenue]);

  // Calculate exit plan
  const exitPlan = useMemo(() => {
    return calculateExitPlan(dealConfig, summaryB.totalRevenue, summaryB.totalExpenses, growthRate);
  }, [dealConfig, summaryB.totalRevenue, summaryB.totalExpenses, growthRate]);

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

  // Opportunity cost calculation
  const opportunityCost = useMemo(() => {
    return summaryB.totalRevenue - summaryA.totalRevenue;
  }, [summaryA.totalRevenue, summaryB.totalRevenue]);

  // Capital efficiency calculation
  const capitalEfficiency = useMemo(() => {
    if (capitalNeedB.requiredInvestment <= 0) return Infinity;
    return summaryB.totalRevenue / capitalNeedB.requiredInvestment;
  }, [summaryB.totalRevenue, capitalNeedB.requiredInvestment]);

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
              <h4 className="text-xs font-semibold text-blue-400 mb-2">3. YIL</h4>
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
              <h4 className="text-xs font-semibold text-emerald-400 mb-2">5. YIL 🚀</h4>
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
              <div className="text-xs text-muted-foreground">Büyüme Hızı</div>
              <div className="text-lg font-bold text-primary">
                %{(growthRate * 100).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Yıllık gelir artışı</div>
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

      {/* AI Analysis Button & Results */}
      <Card className="bg-gradient-to-r from-purple-500/5 to-blue-500/5 border-purple-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-400" />
              AI Yatırımcı Pitch Analizi
            </CardTitle>
            <Button 
              onClick={onAnalyze} 
              disabled={isLoading}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analiz ediliyor...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Yatırımcı Sunumu Oluştur
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : investorAnalysis ? (
            <div className="space-y-4">
              {/* Capital Story */}
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="text-xs font-semibold flex items-center gap-1 mb-1">
                  <DollarSign className="h-3 w-3 text-primary" />
                  Sermaye Hikayesi
                </h4>
                <p className="text-sm text-muted-foreground">{investorAnalysis.capitalStory}</p>
              </div>

              {/* Opportunity Cost */}
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <h4 className="text-xs font-semibold flex items-center gap-1 mb-1 text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  Yatırımsızlık Maliyeti
                </h4>
                <p className="text-sm text-red-300">{investorAnalysis.opportunityCost}</p>
              </div>

              {/* Investor ROI */}
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <h4 className="text-xs font-semibold flex items-center gap-1 mb-1 text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  Yatırımcı Getirisi
                </h4>
                <p className="text-sm text-emerald-300">{investorAnalysis.investorROI}</p>
              </div>

              {/* Exit Narrative */}
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <h4 className="text-xs font-semibold flex items-center gap-1 mb-1 text-blue-400">
                  <Rocket className="h-3 w-3" />
                  Çıkış Stratejisi
                </h4>
                <p className="text-sm text-blue-300">{investorAnalysis.exitNarrative}</p>
                <Badge variant="outline" className="mt-2 bg-blue-500/20 text-blue-400">
                  Önerilen: {
                    investorAnalysis.recommendedExit === 'series_b' ? 'Seri B Yatırımı' :
                    investorAnalysis.recommendedExit === 'strategic_sale' ? 'Stratejik Satış' :
                    investorAnalysis.recommendedExit === 'ipo' ? 'Halka Arz' : 'Tutma'
                  }
                </Badge>
              </div>

              {/* Potential Acquirers */}
              {investorAnalysis.potentialAcquirers.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <h4 className="text-xs font-semibold flex items-center gap-1 mb-2">
                    <Building2 className="h-3 w-3 text-purple-400" />
                    Potansiyel Alıcılar
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {investorAnalysis.potentialAcquirers.map((acquirer, i) => (
                      <Badge key={i} variant="secondary">{acquirer}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Factors */}
              {investorAnalysis.riskFactors && investorAnalysis.riskFactors.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <h4 className="text-xs font-semibold flex items-center gap-1 mb-2 text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    Risk Faktörleri
                  </h4>
                  <ul className="text-xs text-amber-300 space-y-1">
                    {investorAnalysis.riskFactors.map((risk, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-muted/50">
                  <div className="text-lg font-bold text-primary">
                    {investorAnalysis.keyMetrics.capitalEfficiency.toFixed(1)}x
                  </div>
                  <div className="text-xs text-muted-foreground">Sermaye Verimliliği</div>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <div className="text-lg font-bold text-primary">
                    {investorAnalysis.keyMetrics.paybackMonths} ay
                  </div>
                  <div className="text-xs text-muted-foreground">Geri Ödeme</div>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <div className="text-lg font-bold text-primary">
                    {investorAnalysis.keyMetrics.burnMultiple.toFixed(1)}x
                  </div>
                  <div className="text-xs text-muted-foreground">Burn Multiple</div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Yukarıdaki ayarları yapın ve yatırımcı sunumu oluşturmak için butona tıklayın.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
