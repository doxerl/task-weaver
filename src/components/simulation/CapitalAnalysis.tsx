import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, CheckCircle2, TrendingUp, Wallet, BarChart3, Target, DollarSign, Clock, Calculator, Percent } from 'lucide-react';
import { InvestmentItem, SimulationSummary, AdvancedCapitalAnalysis, ROIAnalysis } from '@/types/simulation';
import { AddItemDialog } from './AddItemDialog';
import { CashFlowChart } from './CashFlowChart';
import { SensitivityChart } from './SensitivityChart';
import { cn } from '@/lib/utils';

interface CapitalAnalysisProps {
  investments: InvestmentItem[];
  summary: SimulationSummary;
  exchangeRate: number;
  onAddInvestment: (item: Omit<InvestmentItem, 'id'>) => void;
  onRemoveInvestment: (id: string) => void;
  advancedAnalysis?: AdvancedCapitalAnalysis | null;
  roiAnalysis?: ROIAnalysis | null;
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTRY(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

// Metric card component for summary display
function MetricCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  variant = 'default' 
}: { 
  icon: React.ElementType;
  label: string; 
  value: string; 
  subValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantStyles = {
    default: 'text-foreground',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <Icon className={cn("h-5 w-5 mt-0.5", variantStyles[variant])} />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={cn("text-lg font-semibold", variantStyles[variant])}>{value}</p>
        {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
      </div>
    </div>
  );
}

export function CapitalAnalysis({ 
  investments, 
  summary, 
  exchangeRate, 
  onAddInvestment, 
  onRemoveInvestment,
  advancedAnalysis,
  roiAnalysis,
}: CapitalAnalysisProps) {
  const totalInvestment = investments.reduce((sum, i) => sum + i.amount, 0);
  const projectedProfit = summary.projected.netProfit;
  const netCapitalNeed = totalInvestment - projectedProfit;
  const isPositive = netCapitalNeed <= 0;

  // Use advanced analysis if available, otherwise fallback
  const hasAdvanced = !!advancedAnalysis;
  const hasROI = !!roiAnalysis;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Sermaye & Yatırım Analizi</h3>
        <AddItemDialog type="investment" onAdd={onAddInvestment} />
      </div>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary" className="gap-1">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Özet</span>
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="gap-1">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Nakit Akış</span>
          </TabsTrigger>
          <TabsTrigger value="roi" className="gap-1">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">ROI</span>
          </TabsTrigger>
          <TabsTrigger value="sensitivity" className="gap-1">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Duyarlılık</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Capital Summary */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Current Cash Position */}
            {hasAdvanced && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    Mevcut Nakit Durumu
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Banka Bakiyesi</span>
                    <span className="font-medium">{formatUSD(advancedAnalysis.currentCash.bankBalance)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Kasa</span>
                    <span className="font-medium">{formatUSD(advancedAnalysis.currentCash.cashOnHand)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-medium">Toplam Likit</span>
                    <span className="font-bold text-green-600">
                      {formatUSD(advancedAnalysis.currentCash.totalLiquidity)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Working Capital */}
            {hasAdvanced && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-blue-600" />
                    İşletme Sermayesi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Aylık Gider</span>
                    <span className="font-medium">{formatUSD(advancedAnalysis.workingCapital.monthlyOperatingCash)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Güvenlik Tamponu ({advancedAnalysis.workingCapital.safetyMonths} ay)</span>
                    <span className="font-medium">{formatUSD(advancedAnalysis.workingCapital.safetyBuffer)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Net İşletme Sermayesi</span>
                    <span className={cn("font-medium", advancedAnalysis.workingCapital.netWorkingCapital >= 0 ? "text-green-600" : "text-red-600")}>
                      {formatUSD(advancedAnalysis.workingCapital.netWorkingCapital)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Capital Needs */}
            <Card className={cn(
              hasAdvanced && advancedAnalysis.capitalNeeds.isSufficient 
                ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" 
                : "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20"
            )}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {(hasAdvanced ? advancedAnalysis.capitalNeeds.isSufficient : isPositive) ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  )}
                  Sermaye Analizi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Toplam Yatırım</span>
                  <span className="font-medium">{formatUSD(totalInvestment)}</span>
                </div>
                {hasAdvanced && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">İşletme Sermayesi</span>
                    <span className="font-medium">{formatUSD(advancedAnalysis.capitalNeeds.workingCapitalNeed)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tahmini Net Kar</span>
                  <span className="font-medium text-green-600">{formatUSD(projectedProfit)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium">Net Sermaye İhtiyacı</span>
                  <span className={cn(
                    "font-bold",
                    (hasAdvanced ? advancedAnalysis.capitalNeeds.isSufficient : isPositive) ? "text-green-600" : "text-red-600"
                  )}>
                    {hasAdvanced 
                      ? formatUSD(advancedAnalysis.capitalNeeds.netCapitalGap)
                      : formatUSD(Math.abs(netCapitalNeed))
                    }
                    {(hasAdvanced ? advancedAnalysis.capitalNeeds.isSufficient : isPositive) && ' ✓'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  TL Karşılığı: {formatTRY((hasAdvanced ? advancedAnalysis.capitalNeeds.netCapitalGap : Math.abs(netCapitalNeed)) * exchangeRate)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Investment List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Planlanan Yatırımlar</CardTitle>
            </CardHeader>
            <CardContent>
              {investments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Henüz yatırım eklenmedi. "Ekle" butonuna tıklayarak yatırım ekleyebilirsiniz.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Yatırım</TableHead>
                      <TableHead>Ay</TableHead>
                      <TableHead className="text-right">Tutar (USD)</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investments.map((inv) => (
                      <TableRow key={inv.id} className="group">
                        <TableCell>
                          <div>
                            <p className="font-medium">{inv.name}</p>
                            {inv.description && (
                              <p className="text-xs text-muted-foreground">{inv.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{MONTH_NAMES[inv.month - 1]}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatUSD(inv.amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                            onClick={() => onRemoveInvestment(inv.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={2}>TOPLAM</TableCell>
                      <TableCell className="text-right">{formatUSD(totalInvestment)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Cash Flow */}
        <TabsContent value="cashflow" className="space-y-4">
          {hasAdvanced ? (
            <>
              <CashFlowChart 
                projections={advancedAnalysis.monthlyProjections}
                breakEvenMonth={advancedAnalysis.breakEven.breakEvenMonth}
              />
              
              {/* Monthly projection table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">12 Aylık Nakit Akış Tablosu</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ay</TableHead>
                        <TableHead className="text-right">Açılış</TableHead>
                        <TableHead className="text-right text-green-600">Gelir</TableHead>
                        <TableHead className="text-right text-red-600">Gider</TableHead>
                        <TableHead className="text-right text-orange-600">Yatırım</TableHead>
                        <TableHead className="text-right">Net Akış</TableHead>
                        <TableHead className="text-right font-semibold">Kapanış</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {advancedAnalysis.monthlyProjections.map((p) => (
                        <TableRow key={p.month} className={cn(
                          p.closingBalance < 0 && "bg-red-50/50 dark:bg-red-950/20"
                        )}>
                          <TableCell className="font-medium">{p.monthName}</TableCell>
                          <TableCell className="text-right">{formatUSD(p.openingBalance)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatUSD(p.revenue)}</TableCell>
                          <TableCell className="text-right text-red-600">{formatUSD(p.expense)}</TableCell>
                          <TableCell className="text-right text-orange-600">
                            {p.investment > 0 ? formatUSD(p.investment) : '-'}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right",
                            p.netCashFlow >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {formatUSD(p.netCashFlow)}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-semibold",
                            p.closingBalance >= 0 ? "text-foreground" : "text-red-600"
                          )}>
                            {formatUSD(p.closingBalance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Peak deficit warning */}
              {advancedAnalysis.capitalNeeds.peakCashDeficit > 0 && (
                <Card className="border-red-500/50 bg-red-50/50 dark:bg-red-950/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800 dark:text-red-200">Nakit Açığı Uyarısı</p>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {MONTH_NAMES[(advancedAnalysis.capitalNeeds.deficitMonth || 1) - 1]} ayında{' '}
                          <strong>{formatUSD(advancedAnalysis.capitalNeeds.peakCashDeficit)}</strong>{' '}
                          nakit açığı oluşabilir. Yatırım zamanlamasını veya finansman planını gözden geçirin.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nakit akış analizi için finansal veriler yükleniyor...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 3: ROI & Break-even */}
        <TabsContent value="roi" className="space-y-4">
          {hasROI ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* ROI Metrics */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Percent className="h-5 w-5 text-primary" />
                    Yatırım Getirisi (ROI)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <MetricCard 
                      icon={TrendingUp}
                      label="Basit ROI"
                      value={`%${roiAnalysis.simpleROI.toFixed(0)}`}
                      variant={roiAnalysis.simpleROI >= 100 ? 'success' : roiAnalysis.simpleROI >= 50 ? 'warning' : 'danger'}
                    />
                    <MetricCard 
                      icon={Clock}
                      label="Geri Dönüş Süresi"
                      value={roiAnalysis.paybackPeriod.months === Infinity ? '-' : `${roiAnalysis.paybackPeriod.months} ay`}
                      subValue={roiAnalysis.paybackPeriod.isWithinYear ? '1 yıl içinde' : '1 yıldan fazla'}
                      variant={roiAnalysis.paybackPeriod.isWithinYear ? 'success' : 'warning'}
                    />
                    <MetricCard 
                      icon={DollarSign}
                      label="NPV"
                      value={formatUSD(roiAnalysis.npvAnalysis.npv)}
                      subValue={`%${roiAnalysis.npvAnalysis.discountRate} iskonto`}
                      variant={roiAnalysis.npvAnalysis.isPositiveNPV ? 'success' : 'danger'}
                    />
                    <MetricCard 
                      icon={Percent}
                      label="IRR (Tahmini)"
                      value={`%${roiAnalysis.npvAnalysis.irr.toFixed(0)}`}
                      variant={roiAnalysis.npvAnalysis.irr >= 20 ? 'success' : roiAnalysis.npvAnalysis.irr >= 10 ? 'warning' : 'danger'}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Break-even */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Break-even Analizi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Break-even Geliri</span>
                      <span className="font-medium">{formatUSD(roiAnalysis.breakEven.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Katkı Marjı</span>
                      <span className="font-medium">%{roiAnalysis.breakEven.margin.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mevcut / Gereken</span>
                      <span className={cn(
                        "font-semibold",
                        roiAnalysis.breakEven.currentVsRequired >= 1 ? "text-green-600" : "text-red-600"
                      )}>
                        {roiAnalysis.breakEven.currentVsRequired.toFixed(2)}x
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress bar showing current vs required */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Break-even noktası</span>
                      <span>{Math.min(100, roiAnalysis.breakEven.currentVsRequired * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all",
                          roiAnalysis.breakEven.currentVsRequired >= 1 ? "bg-green-500" : "bg-yellow-500"
                        )}
                        style={{ width: `${Math.min(100, roiAnalysis.breakEven.currentVsRequired * 100)}%` }}
                      />
                    </div>
                  </div>

                  {roiAnalysis.breakEven.currentVsRequired >= 1 ? (
                    <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Projeksiyonlar break-even noktasının üzerinde
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Break-even için {formatUSD(roiAnalysis.breakEven.revenue - summary.projected.totalRevenue)} ek gelir gerekli
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>ROI analizi için yatırım ekleyin</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 4: Sensitivity Analysis */}
        <TabsContent value="sensitivity" className="space-y-4">
          {hasROI ? (
            <>
              <SensitivityChart sensitivity={roiAnalysis.sensitivity} />
              
              {/* Detailed comparison table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Senaryo Karşılaştırması</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Senaryo</TableHead>
                        <TableHead className="text-right">Gelir</TableHead>
                        <TableHead className="text-right">Gider</TableHead>
                        <TableHead className="text-right">Net Kar</TableHead>
                        <TableHead className="text-right">Kar Marjı</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="bg-red-50/30 dark:bg-red-950/10">
                        <TableCell className="font-medium text-red-700 dark:text-red-400">
                          Pesimist (-20%)
                        </TableCell>
                        <TableCell className="text-right">{formatUSD(roiAnalysis.sensitivity.pessimistic.revenue)}</TableCell>
                        <TableCell className="text-right">{formatUSD(roiAnalysis.sensitivity.pessimistic.expense)}</TableCell>
                        <TableCell className="text-right font-medium">{formatUSD(roiAnalysis.sensitivity.pessimistic.profit)}</TableCell>
                        <TableCell className="text-right">%{roiAnalysis.sensitivity.pessimistic.margin.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">%{roiAnalysis.sensitivity.pessimistic.roi.toFixed(0)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-primary/5">
                        <TableCell className="font-medium text-primary">
                          Baz Senaryo
                        </TableCell>
                        <TableCell className="text-right">{formatUSD(roiAnalysis.sensitivity.baseline.revenue)}</TableCell>
                        <TableCell className="text-right">{formatUSD(roiAnalysis.sensitivity.baseline.expense)}</TableCell>
                        <TableCell className="text-right font-medium">{formatUSD(roiAnalysis.sensitivity.baseline.profit)}</TableCell>
                        <TableCell className="text-right">%{roiAnalysis.sensitivity.baseline.margin.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">%{roiAnalysis.sensitivity.baseline.roi.toFixed(0)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-green-50/30 dark:bg-green-950/10">
                        <TableCell className="font-medium text-green-700 dark:text-green-400">
                          Optimist (+20%)
                        </TableCell>
                        <TableCell className="text-right">{formatUSD(roiAnalysis.sensitivity.optimistic.revenue)}</TableCell>
                        <TableCell className="text-right">{formatUSD(roiAnalysis.sensitivity.optimistic.expense)}</TableCell>
                        <TableCell className="text-right font-medium">{formatUSD(roiAnalysis.sensitivity.optimistic.profit)}</TableCell>
                        <TableCell className="text-right">%{roiAnalysis.sensitivity.optimistic.margin.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">%{roiAnalysis.sensitivity.optimistic.roi.toFixed(0)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Duyarlılık analizi için projeksiyon verilerini girin</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
