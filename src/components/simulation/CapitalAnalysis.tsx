import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatCompactUSD, formatCompactTRY, formatFullUSD } from '@/lib/formatters';

interface CapitalAnalysisProps {
  investments: InvestmentItem[];
  summary: SimulationSummary;
  exchangeRate: number;
  onAddInvestment: (item: Omit<InvestmentItem, 'id'>) => void;
  onRemoveInvestment: (id: string) => void;
  advancedAnalysis?: AdvancedCapitalAnalysis | null;
  roiAnalysis?: ROIAnalysis | null;
}

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
  const { t } = useTranslation(['simulation']);

  const MONTH_NAMES = useMemo(() =>
    t('months.shortNames', { returnObjects: true }) as string[],
    [t]
  );

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
        <h3 className="font-semibold text-lg">{t('capitalAnalysis.title')}</h3>
        <AddItemDialog type="investment" onAdd={onAddInvestment} />
      </div>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary" className="gap-1">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">{t('capitalAnalysis.tabs.summary')}</span>
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="gap-1">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('capitalAnalysis.tabs.cashflow')}</span>
          </TabsTrigger>
          <TabsTrigger value="roi" className="gap-1">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">{t('capitalAnalysis.tabs.roi')}</span>
          </TabsTrigger>
          <TabsTrigger value="sensitivity" className="gap-1">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">{t('capitalAnalysis.tabs.sensitivity')}</span>
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
                    {t('capitalAnalysis.currentCash.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('capitalAnalysis.currentCash.bankBalance')}</span>
                    <span className="font-medium">{formatCompactUSD(advancedAnalysis.currentCash.bankBalance)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('capitalAnalysis.currentCash.cashOnHand')}</span>
                    <span className="font-medium">{formatCompactUSD(advancedAnalysis.currentCash.cashOnHand)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-medium">{t('capitalAnalysis.currentCash.totalLiquidity')}</span>
                    <span className="font-bold text-green-600">
                      {formatCompactUSD(advancedAnalysis.currentCash.totalLiquidity)}
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
                    {t('capitalAnalysis.workingCapital.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('capitalAnalysis.workingCapital.monthlyExpense')}</span>
                    <span className="font-medium">{formatCompactUSD(advancedAnalysis.workingCapital.monthlyOperatingCash)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('capitalAnalysis.workingCapital.safetyBuffer', { months: advancedAnalysis.workingCapital.safetyMonths })}</span>
                    <span className="font-medium">{formatCompactUSD(advancedAnalysis.workingCapital.safetyBuffer)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('capitalAnalysis.workingCapital.netWorkingCapital')}</span>
                    <span className={cn("font-medium", advancedAnalysis.workingCapital.netWorkingCapital >= 0 ? "text-green-600" : "text-red-600")}>
                      {formatCompactUSD(advancedAnalysis.workingCapital.netWorkingCapital)}
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
                  {t('capitalAnalysis.needs.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('capitalAnalysis.needs.totalInvestment')}</span>
                  <span className="font-medium">{formatCompactUSD(totalInvestment)}</span>
                </div>
                {hasAdvanced && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('capitalAnalysis.needs.workingCapitalNeed')}</span>
                    <span className="font-medium">{formatCompactUSD(advancedAnalysis.capitalNeeds.workingCapitalNeed)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('capitalAnalysis.needs.projectedNetProfit')}</span>
                  <span className="font-medium text-green-600">{formatCompactUSD(projectedProfit)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium">{t('capitalAnalysis.needs.netCapitalNeed')}</span>
                  <span className={cn(
                    "font-bold",
                    (hasAdvanced ? advancedAnalysis.capitalNeeds.isSufficient : isPositive) ? "text-green-600" : "text-red-600"
                  )}>
                    {hasAdvanced
                      ? formatCompactUSD(advancedAnalysis.capitalNeeds.netCapitalGap)
                      : formatCompactUSD(Math.abs(netCapitalNeed))
                    }
                    {(hasAdvanced ? advancedAnalysis.capitalNeeds.isSufficient : isPositive) && ' ✓'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('capitalAnalysis.needs.tryEquivalent')}: {formatCompactTRY((hasAdvanced ? advancedAnalysis.capitalNeeds.netCapitalGap : Math.abs(netCapitalNeed)) * exchangeRate)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Investment List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('capitalAnalysis.investments.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {investments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('capitalAnalysis.investments.noInvestments')}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('capitalAnalysis.investments.investment')}</TableHead>
                      <TableHead>{t('capitalAnalysis.investments.month')}</TableHead>
                      <TableHead className="text-right">{t('capitalAnalysis.investments.amount')}</TableHead>
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
                          {formatFullUSD(inv.amount)}
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
                      <TableCell colSpan={2}>{t('capitalAnalysis.investments.total')}</TableCell>
                      <TableCell className="text-right">{formatCompactUSD(totalInvestment)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Cash Flow - Quarterly View */}
        <TabsContent value="cashflow" className="space-y-4">
          {hasAdvanced && advancedAnalysis.burnRateAnalysis ? (
            <>
              <CashFlowChart 
                quarterlyProjections={advancedAnalysis.burnRateAnalysis.quarterlyProjectionsWithInvestment}
                currentCash={advancedAnalysis.currentCash.totalLiquidity}
                safetyBuffer={advancedAnalysis.workingCapital.safetyBuffer}
                breakEvenQuarter={advancedAnalysis.burnRateAnalysis.criticalQuarter}
              />
              
              {/* Quarterly projection table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('capitalAnalysis.cashflow.title')}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('capitalAnalysis.cashflow.period')}</TableHead>
                        <TableHead className="text-right">{t('capitalAnalysis.cashflow.opening')}</TableHead>
                        <TableHead className="text-right text-green-600">{t('capitalAnalysis.cashflow.revenue')}</TableHead>
                        <TableHead className="text-right text-red-600">{t('capitalAnalysis.cashflow.expense')}</TableHead>
                        <TableHead className="text-right text-orange-600">{t('capitalAnalysis.cashflow.investment')}</TableHead>
                        <TableHead className="text-right">{t('capitalAnalysis.cashflow.netFlow')}</TableHead>
                        <TableHead className="text-right font-semibold">{t('capitalAnalysis.cashflow.closing')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {advancedAnalysis.burnRateAnalysis.quarterlyProjectionsWithInvestment.map((p) => (
                        <TableRow key={p.quarter} className={cn(
                          p.closingBalance < 0 && "bg-red-50/50 dark:bg-red-950/20",
                          p.quarter === advancedAnalysis.burnRateAnalysis?.criticalQuarter && "bg-yellow-50/50 dark:bg-yellow-950/20"
                        )}>
                          <TableCell className="font-medium">
                            <div>
                              <span>{p.quarter}</span>
                              <span className="text-xs text-muted-foreground ml-1">
                                ({p.months.join('-')})
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatCompactUSD(p.openingBalance)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCompactUSD(p.revenue)}</TableCell>
                          <TableCell className="text-right text-red-600">{formatCompactUSD(p.expense)}</TableCell>
                          <TableCell className="text-right text-orange-600">
                            {p.investment > 0 ? formatCompactUSD(p.investment) : '-'}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right",
                            p.netCashFlow >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {formatCompactUSD(p.netCashFlow)}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-semibold",
                            p.closingBalance >= 0 ? "text-foreground" : "text-red-600"
                          )}>
                            {formatCompactUSD(p.closingBalance)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Year-end summary row */}
                      <TableRow className="bg-muted/50 font-semibold border-t-2">
                        <TableCell>{t('capitalAnalysis.cashflow.yearEnd')}</TableCell>
                        <TableCell className="text-right">
                          {formatCompactUSD(advancedAnalysis.currentCash.totalLiquidity)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCompactUSD(advancedAnalysis.burnRateAnalysis.quarterlyProjectionsWithInvestment.reduce((sum, p) => sum + p.revenue, 0))}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCompactUSD(advancedAnalysis.burnRateAnalysis.quarterlyProjectionsWithInvestment.reduce((sum, p) => sum + p.expense, 0))}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {formatCompactUSD(advancedAnalysis.burnRateAnalysis.quarterlyProjectionsWithInvestment.reduce((sum, p) => sum + p.investment, 0))}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right",
                          advancedAnalysis.burnRateAnalysis.quarterlyProjectionsWithInvestment.reduce((sum, p) => sum + p.netCashFlow, 0) >= 0 
                            ? "text-green-600" : "text-red-600"
                        )}>
                          {formatCompactUSD(advancedAnalysis.burnRateAnalysis.quarterlyProjectionsWithInvestment.reduce((sum, p) => sum + p.netCashFlow, 0))}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCompactUSD(advancedAnalysis.burnRateAnalysis.quarterlyProjectionsWithInvestment[3]?.closingBalance || 0)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Critical quarter warning */}
              {advancedAnalysis.burnRateAnalysis.criticalQuarter && (
                <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">{t('capitalAnalysis.cashflow.criticalPeriodWarning')}</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          {t('capitalAnalysis.cashflow.criticalPeriodMessage', { quarter: advancedAnalysis.burnRateAnalysis.criticalQuarter })}
                          {advancedAnalysis.burnRateAnalysis.cashDeficitWithoutInvestment > 0 && (
                            <> {t('capitalAnalysis.cashflow.investmentNotMadeMessage', { amount: formatCompactUSD(advancedAnalysis.burnRateAnalysis.cashDeficitWithoutInvestment) })}</>
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Peak deficit warning */}
              {advancedAnalysis.capitalNeeds.peakCashDeficit > 0 && (
                <Card className="border-red-500/50 bg-red-50/50 dark:bg-red-950/20">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800 dark:text-red-200">{t('capitalAnalysis.cashflow.cashDeficitWarning')}</p>
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {t('capitalAnalysis.cashflow.cashDeficitMessage', { amount: formatCompactUSD(advancedAnalysis.capitalNeeds.peakCashDeficit) })}
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
                <p>{t('capitalAnalysis.cashflow.loading')}</p>
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
                    {t('capitalAnalysis.roi.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <MetricCard
                      icon={TrendingUp}
                      label={t('capitalAnalysis.roi.simpleROI')}
                      value={`%${roiAnalysis.simpleROI.toFixed(0)}`}
                      variant={roiAnalysis.simpleROI >= 100 ? 'success' : roiAnalysis.simpleROI >= 50 ? 'warning' : 'danger'}
                    />
                    <MetricCard
                      icon={Clock}
                      label={t('capitalAnalysis.roi.paybackPeriod')}
                      value={roiAnalysis.paybackPeriod.months === Infinity ? '-' : t('capitalAnalysis.roi.months', { count: roiAnalysis.paybackPeriod.months })}
                      subValue={roiAnalysis.paybackPeriod.isWithinYear ? t('capitalAnalysis.roi.withinYear') : t('capitalAnalysis.roi.moreThanYear')}
                      variant={roiAnalysis.paybackPeriod.isWithinYear ? 'success' : 'warning'}
                    />
                    <MetricCard
                      icon={DollarSign}
                      label={t('capitalAnalysis.roi.npv')}
                      value={formatCompactUSD(roiAnalysis.npvAnalysis.npv)}
                      subValue={t('capitalAnalysis.roi.discount', { rate: roiAnalysis.npvAnalysis.discountRate })}
                      variant={roiAnalysis.npvAnalysis.isPositiveNPV ? 'success' : 'danger'}
                    />
                    <MetricCard
                      icon={Percent}
                      label={t('capitalAnalysis.roi.irrEstimate')}
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
                    {t('capitalAnalysis.breakeven.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('capitalAnalysis.breakeven.revenue')}</span>
                      <span className="font-medium">{formatCompactUSD(roiAnalysis.breakEven.revenue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('capitalAnalysis.breakeven.margin')}</span>
                      <span className="font-medium">%{roiAnalysis.breakEven.margin.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('capitalAnalysis.breakeven.currentVsRequired')}</span>
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
                      <span>{t('capitalAnalysis.breakeven.point')}</span>
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
                        {t('capitalAnalysis.breakeven.aboveBreakeven')}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {t('capitalAnalysis.breakeven.additionalRevenueNeeded', { amount: formatCompactUSD(roiAnalysis.breakEven.revenue - summary.projected.totalRevenue) })}
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
                <p>{t('capitalAnalysis.roi.addInvestmentForROI')}</p>
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
                  <CardTitle className="text-base">{t('capitalAnalysis.scenarioComparison.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('capitalAnalysis.scenarioComparison.scenario')}</TableHead>
                        <TableHead className="text-right">{t('capitalAnalysis.scenarioComparison.revenue')}</TableHead>
                        <TableHead className="text-right">{t('capitalAnalysis.scenarioComparison.expense')}</TableHead>
                        <TableHead className="text-right">{t('capitalAnalysis.scenarioComparison.netProfit')}</TableHead>
                        <TableHead className="text-right">{t('capitalAnalysis.scenarioComparison.profitMargin')}</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="bg-red-50/30 dark:bg-red-950/10">
                        <TableCell className="font-medium text-red-700 dark:text-red-400">
                          {t('capitalAnalysis.scenarioComparison.pessimist')}
                        </TableCell>
                        <TableCell className="text-right">{formatCompactUSD(roiAnalysis.sensitivity.pessimistic.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCompactUSD(roiAnalysis.sensitivity.pessimistic.expense)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCompactUSD(roiAnalysis.sensitivity.pessimistic.profit)}</TableCell>
                        <TableCell className="text-right">%{roiAnalysis.sensitivity.pessimistic.margin.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">%{roiAnalysis.sensitivity.pessimistic.roi.toFixed(0)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-primary/5">
                        <TableCell className="font-medium text-primary">
                          {t('capitalAnalysis.scenarioComparison.base')}
                        </TableCell>
                        <TableCell className="text-right">{formatCompactUSD(roiAnalysis.sensitivity.baseline.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCompactUSD(roiAnalysis.sensitivity.baseline.expense)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCompactUSD(roiAnalysis.sensitivity.baseline.profit)}</TableCell>
                        <TableCell className="text-right">%{roiAnalysis.sensitivity.baseline.margin.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">%{roiAnalysis.sensitivity.baseline.roi.toFixed(0)}</TableCell>
                      </TableRow>
                      <TableRow className="bg-green-50/30 dark:bg-green-950/10">
                        <TableCell className="font-medium text-green-700 dark:text-green-400">
                          {t('capitalAnalysis.scenarioComparison.optimist')}
                        </TableCell>
                        <TableCell className="text-right">{formatCompactUSD(roiAnalysis.sensitivity.optimistic.revenue)}</TableCell>
                        <TableCell className="text-right">{formatCompactUSD(roiAnalysis.sensitivity.optimistic.expense)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCompactUSD(roiAnalysis.sensitivity.optimistic.profit)}</TableCell>
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
                <p>{t('capitalAnalysis.scenarioComparison.enterDataForAnalysis')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
