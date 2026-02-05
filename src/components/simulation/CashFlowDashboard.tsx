/**
 * Cash Flow Dashboard Component
 * 13-week forecast, working capital, and P&L reconciliation
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import type { 
  ThirteenWeekCashForecast, 
  CashReconciliationBridge,
  WorkingCapitalConfigV2,
} from '@/types/simulation';
import { formatCurrency } from '@/lib/formatters';
import { calculateCashConversionCycle, calculateNetWorkingCapital } from '@/lib/cashFlowEngine';

interface CashFlowDashboardProps {
  forecast: ThirteenWeekCashForecast[];
  reconciliation?: CashReconciliationBridge;
  workingCapitalConfig: WorkingCapitalConfigV2;
  annualRevenue: number;
  annualExpenses: number;
  currency?: 'TRY' | 'USD';
}

export function CashFlowDashboard({
  forecast,
  reconciliation,
  workingCapitalConfig,
  annualRevenue,
  annualExpenses,
  currency = 'TRY',
}: CashFlowDashboardProps) {
  const { t } = useTranslation(['simulation', 'finance']);

  // Calculate working capital metrics
  const workingCapital = useMemo(() => {
    const ccc = calculateCashConversionCycle(workingCapitalConfig);
    const nwc = calculateNetWorkingCapital(annualRevenue, annualExpenses, workingCapitalConfig);
    return { ccc, ...nwc };
  }, [workingCapitalConfig, annualRevenue, annualExpenses]);

  // Find min cash position (death valley)
  const deathValley = useMemo(() => {
    let min = Infinity;
    let minWeek = 0;
    
    forecast.forEach(week => {
      if (week.closing_balance < min) {
        min = week.closing_balance;
        minWeek = week.week;
      }
    });
    
    return { minCash: min, week: minWeek };
  }, [forecast]);

  // Calculate runway from current position
  const runway = useMemo(() => {
    if (forecast.length === 0) return { months: 0, weeks: 0 };
    
    const lastWeek = forecast[forecast.length - 1];
    const avgWeeklyBurn = forecast.reduce((sum, w) => sum + Math.max(0, -w.net_cash_flow), 0) / forecast.length;
    
    if (avgWeeklyBurn <= 0) return { months: 999, weeks: 999 }; // Cash positive
    
    const weeksRemaining = lastWeek.closing_balance / avgWeeklyBurn;
    return {
      weeks: Math.floor(weeksRemaining),
      months: Math.floor(weeksRemaining / 4.33),
    };
  }, [forecast]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return forecast.map(week => ({
      ...week,
      name: week.week_label,
      inflows: week.ar_collections,
      outflows: -(week.ap_payments + week.payroll + week.debt_service),
    }));
  }, [forecast]);

  const getHealthColor = (ccc: number) => {
    if (ccc < 0) return 'text-emerald-500';
    if (ccc < 30) return 'text-primary';
    if (ccc < 60) return 'text-amber-500';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Wallet className="h-4 w-4" />
              {t('simulation:cashFlow.currentCash')}
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(forecast[0]?.opening_balance ?? 0, currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="h-4 w-4" />
              {t('simulation:cashFlow.runway')}
            </div>
            <p className={`text-2xl font-bold mt-1 ${runway.months < 6 ? 'text-destructive' : runway.months < 12 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {runway.months === 999 ? '∞' : `${runway.months} ay`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingDown className="h-4 w-4" />
              {t('simulation:cashFlow.deathValley')}
            </div>
            <p className={`text-2xl font-bold mt-1 ${deathValley.minCash < 0 ? 'text-destructive' : ''}`}>
              {formatCurrency(deathValley.minCash, currency)}
            </p>
            <p className="text-xs text-muted-foreground">
              W{deathValley.week}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              CCC
            </div>
            <p className={`text-2xl font-bold mt-1 ${getHealthColor(workingCapital.ccc)}`}>
              {workingCapital.ccc} {t('simulation:cashFlow.days')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="forecast" className="space-y-4">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="forecast">
            {t('simulation:cashFlow.forecast13Week')}
          </TabsTrigger>
          <TabsTrigger value="working-capital">
            {t('simulation:cashFlow.workingCapital')}
          </TabsTrigger>
          <TabsTrigger value="reconciliation">
            {t('simulation:cashFlow.reconciliation')}
          </TabsTrigger>
        </TabsList>

        {/* 13-Week Forecast */}
        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('simulation:cashFlow.cashPosition')}</CardTitle>
              <CardDescription>
                {t('simulation:cashFlow.forecastDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 11 }}
                      interval={1}
                    />
                    <YAxis
                      tickFormatter={v => formatCurrency(v, currency, true)}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value, currency)}
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey="closing_balance"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                      name={t('simulation:cashFlow.closingBalance')}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('simulation:cashFlow.weeklyDetails')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('simulation:cashFlow.week')}</TableHead>
                      <TableHead className="text-right">{t('simulation:cashFlow.opening')}</TableHead>
                      <TableHead className="text-right">{t('simulation:cashFlow.collections')}</TableHead>
                      <TableHead className="text-right">{t('simulation:cashFlow.payments')}</TableHead>
                      <TableHead className="text-right">{t('simulation:cashFlow.payroll')}</TableHead>
                      <TableHead className="text-right">{t('simulation:cashFlow.netFlow')}</TableHead>
                      <TableHead className="text-right">{t('simulation:cashFlow.closing')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecast.slice(0, 6).map(week => (
                      <TableRow key={week.week}>
                        <TableCell className="font-medium">{week.week_label}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(week.opening_balance, currency)}
                        </TableCell>
                        <TableCell className="text-right text-emerald-500">
                          +{formatCurrency(week.ar_collections, currency)}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          -{formatCurrency(week.ap_payments, currency)}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          -{formatCurrency(week.payroll, currency)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${week.net_cash_flow >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                          {week.net_cash_flow >= 0 ? '+' : ''}{formatCurrency(week.net_cash_flow, currency)}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${week.closing_balance < 0 ? 'text-destructive' : ''}`}>
                          {formatCurrency(week.closing_balance, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Working Capital */}
        <TabsContent value="working-capital" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CCC Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>{t('simulation:cashFlow.cccBreakdown')}</CardTitle>
                <CardDescription>
                  {t('simulation:cashFlow.cccDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('simulation:cashFlow.dso')}</span>
                    <span className="font-medium">{workingCapitalConfig.ar_days} {t('simulation:cashFlow.days')}</span>
                  </div>
                  <Progress value={Math.min(100, (workingCapitalConfig.ar_days / 90) * 100)} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('simulation:cashFlow.dio')}</span>
                    <span className="font-medium">{workingCapitalConfig.inventory_days ?? 0} {t('simulation:cashFlow.days')}</span>
                  </div>
                  <Progress value={Math.min(100, ((workingCapitalConfig.inventory_days ?? 0) / 90) * 100)} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('simulation:cashFlow.dpo')}</span>
                    <span className="font-medium">{workingCapitalConfig.ap_days} {t('simulation:cashFlow.days')}</span>
                  </div>
                  <Progress value={Math.min(100, (workingCapitalConfig.ap_days / 90) * 100)} className="h-2" />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('simulation:cashFlow.cccResult')}</span>
                    <Badge variant={workingCapital.ccc < 0 ? 'default' : workingCapital.ccc < 30 ? 'secondary' : 'destructive'}>
                      {workingCapital.ccc} {t('simulation:cashFlow.days')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {workingCapital.ccc < 0 
                      ? t('simulation:cashFlow.cccNegative')
                      : t('simulation:cashFlow.cccPositive', { days: workingCapital.ccc })
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* NWC Components */}
            <Card>
              <CardHeader>
                <CardTitle>{t('simulation:cashFlow.nwcComponents')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('simulation:cashFlow.accountsReceivable')}</p>
                    <p className="text-lg font-bold text-emerald-500">
                      {formatCurrency(workingCapital.accountsReceivable, currency)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-500 opacity-50" />
                </div>

                {workingCapital.inventory > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('simulation:cashFlow.inventory')}</p>
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(workingCapital.inventory, currency)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('simulation:cashFlow.accountsPayable')}</p>
                    <p className="text-lg font-bold text-destructive">
                      ({formatCurrency(workingCapital.accountsPayable, currency)})
                    </p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-destructive opacity-50" />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{t('simulation:cashFlow.netWorkingCapital')}</span>
                    <span className={`text-xl font-bold ${workingCapital.netWorkingCapital >= 0 ? 'text-primary' : 'text-destructive'}`}>
                      {formatCurrency(workingCapital.netWorkingCapital, currency)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* P&L to Cash Reconciliation */}
        <TabsContent value="reconciliation" className="space-y-4">
          {reconciliation ? (
            <Card>
              <CardHeader>
                <CardTitle>{t('simulation:cashFlow.pnlToCash')}</CardTitle>
                <CardDescription>
                  {t('simulation:cashFlow.reconciliationDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Step 1: Net Income to EBITDA */}
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">1</div>
                      <span className="font-medium">{t('simulation:cashFlow.netIncomeToEbitda')}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>{t('simulation:cashFlow.netIncome')}</span>
                        <span className="font-medium">{formatCurrency(reconciliation.net_income, currency)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-500">
                        <span>+ {t('simulation:cashFlow.depreciation')}</span>
                        <span>{formatCurrency(reconciliation.add_depreciation, currency)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-500">
                        <span>+ {t('simulation:cashFlow.amortization')}</span>
                        <span>{formatCurrency(reconciliation.add_amortization, currency)}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t">
                        <span>EBITDA</span>
                        <span>{formatCurrency(reconciliation.ebitda, currency)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* Step 2: EBITDA to Operating Cash Flow */}
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">2</div>
                      <span className="font-medium">{t('simulation:cashFlow.ebitdaToOcf')}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>EBITDA</span>
                        <span className="font-medium">{formatCurrency(reconciliation.ebitda, currency)}</span>
                      </div>
                      <div className={`flex justify-between ${reconciliation.change_in_ar > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                        <span>{reconciliation.change_in_ar > 0 ? '-' : '+'} Δ AR</span>
                        <span>{formatCurrency(Math.abs(reconciliation.change_in_ar), currency)}</span>
                      </div>
                      <div className={`flex justify-between ${reconciliation.change_in_ap > 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                        <span>{reconciliation.change_in_ap > 0 ? '+' : '-'} Δ AP</span>
                        <span>{formatCurrency(Math.abs(reconciliation.change_in_ap), currency)}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t">
                        <span>{t('simulation:cashFlow.operatingCashFlow')}</span>
                        <span className={reconciliation.operating_cash_flow >= 0 ? 'text-emerald-500' : 'text-destructive'}>
                          {formatCurrency(reconciliation.operating_cash_flow, currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* Step 3: Final Cash Change */}
                  <div className="p-4 rounded-lg border bg-primary/5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">3</div>
                      <span className="font-medium">{t('simulation:cashFlow.netCashChange')}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>{t('simulation:cashFlow.operatingCashFlow')}</span>
                        <span>{formatCurrency(reconciliation.operating_cash_flow, currency)}</span>
                      </div>
                      <div className="flex justify-between text-destructive">
                        <span>- CapEx</span>
                        <span>{formatCurrency(reconciliation.capex, currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>± {t('simulation:cashFlow.financing')}</span>
                        <span>{formatCurrency(reconciliation.financing_cash_flow, currency)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg pt-2 border-t">
                        <span>{t('simulation:cashFlow.endingCash')}</span>
                        <span className={reconciliation.ending_cash >= 0 ? 'text-emerald-500' : 'text-destructive'}>
                          {formatCurrency(reconciliation.ending_cash, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {t('simulation:cashFlow.noReconciliationData')}
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CashFlowDashboard;
