import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useYear } from '@/contexts/YearContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, FileDown, BarChart3, FileText, Users, Loader2, Receipt, CreditCard, Car, Building, AlertTriangle, Info, Shield } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFinancialDataHub } from '@/hooks/finance/useFinancialDataHub';
import { useIncomeAnalysis } from '@/hooks/finance/useIncomeAnalysis';
import { useExpenseAnalysis } from '@/hooks/finance/useExpenseAnalysis';
import { useIncomeStatement } from '@/hooks/finance/useIncomeStatement';
import { useDetailedIncomeStatement } from '@/hooks/finance/useDetailedIncomeStatement';
import { useFixedExpenses } from '@/hooks/finance/useFixedExpenses';
import { usePdfEngine } from '@/hooks/finance/usePdfEngine';
import { useBalanceSheet } from '@/hooks/finance/useBalanceSheet';
import { useCashFlowStatement } from '@/hooks/finance/useCashFlowStatement';
import { MonthlyTrendChart } from '@/components/finance/charts/MonthlyTrendChart';
import { ServiceRevenueChart } from '@/components/finance/charts/ServiceRevenueChart';
import { ExpenseCategoryChart } from '@/components/finance/charts/ExpenseCategoryChart';
import { IncomeStatementTable } from '@/components/finance/tables/IncomeStatementTable';
import { DetailedIncomeStatementTable } from '@/components/finance/tables/DetailedIncomeStatementTable';
import { CashFlowStatementTable } from '@/components/finance/CashFlowStatementTable';
import { BottomTabBar } from '@/components/BottomTabBar';
import { CurrencyToggle } from '@/components/finance/CurrencyToggle';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ReportPeriod, FullReportData, MonthlyDataPoint, MONTH_NAMES_SHORT_TR } from '@/types/reports';
import { toast } from 'sonner';

export default function Reports() {
  const { t } = useTranslation(['finance', 'common']);
  const { selectedYear: year, setSelectedYear: setYear } = useYear();
  const period: ReportPeriod = 'yearly';
  const dashboardRef = useRef<HTMLDivElement>(null);
  const incomeRef = useRef<HTMLDivElement>(null);
  const expenseRef = useRef<HTMLDivElement>(null);
  const trendChartRef = useRef<HTMLDivElement>(null);
  const incomeChartRef = useRef<HTMLDivElement>(null);
  const expenseChartRef = useRef<HTMLDivElement>(null);
  
  // Use unified data hub
  const hub = useFinancialDataHub(year);
  // Reports sayfası HER ZAMAN dinamik veri göstermeli (etiketlenmiş banka işlemleri)
  const incomeAnalysis = useIncomeAnalysis(year, { forceRealtime: true });
  const expenseAnalysis = useExpenseAnalysis(year, { forceRealtime: true });
  const incomeStatement = useIncomeStatement(year, { forceRealtime: true });
  const detailedStatement = useDetailedIncomeStatement(year);
  const { definitions: fixedExpensesList } = useFixedExpenses();
  const { balanceSheet } = useBalanceSheet(year);
  const { cashFlowStatement, isLoading: cashFlowLoading } = useCashFlowStatement(year);
  
  // Merkezi PDF hook - tablo ve grafik PDF işlemleri için
  const { 
    generateFullReportPdfData,
    generateDetailedIncomePdfData,
    generateBalanceSheetPdf,
    generateIncomeStatementPdf,
    generateVatReportPdf,
    generateFullReportPdf,
    generateDashboardChartPdf,
    generateDashboardPdfSmart,
    generateDistributionChartPdf,
    generateCashFlowPdfData,
    createPdfBuilder,
    isGenerating: isPdfEngineGenerating,
    progress: pdfProgress,
  } = usePdfEngine();
  
  const { currency, formatAmount, formatCompactAmount, getAvailableMonthsCount, yearlyAverageRate } = useCurrency();
  
  const availableMonths = getAvailableMonthsCount(year);
  const missingMonths = 12 - availableMonths;

  // Combine monthly data from hub with service breakdown
  const monthlyData = useMemo((): MonthlyDataPoint[] => {
    const months = Object.entries(hub.byMonth || {});
    let cumulative = 0;
    
    return months.map(([m, data]) => {
      const month = parseInt(m);
      const net = data.income.net - data.expense.net;
      cumulative += net;
      
      // Calculate income by service for this month
      let leadership = 0, sbtTracker = 0, danismanlik = 0, zdhcOther = 0;
      
      incomeAnalysis.serviceRevenue.forEach(service => {
        const monthAmount = service.byMonth[month] || 0;
        const code = service.code.toUpperCase();
        
        if (code === 'L&S') {
          leadership += monthAmount;
        } else if (code === 'SBT') {
          sbtTracker += monthAmount;
        } else if (code === 'DANIS') {
          danismanlik += monthAmount;
        } else {
          // ZDHC, LISANS, FAIZ_IN and other income
          zdhcOther += monthAmount;
        }
      });
      
      return {
        month,
        monthName: MONTH_NAMES_SHORT_TR[month - 1],
        income: data.income.net,
        expense: data.expense.net,
        net,
        cumulativeProfit: cumulative,
        incomeByService: { leadership, sbtTracker, danismanlik, zdhcOther },
      };
    });
  }, [hub.byMonth, incomeAnalysis.serviceRevenue]);

  // Content refs for PDF
  const fullReportRef = useRef<HTMLDivElement>(null);
  const incomeStatementRef = useRef<HTMLDivElement>(null);
  const financingRef = useRef<HTMLDivElement>(null);

  // Data-driven Full Report PDF - akıllı sayfa bölme ile
  const handleFullReportPdf = async () => {
    try {
      const success = await generateFullReportPdfData({
        hub,
        incomeStatement: incomeStatement.statement ?? null,
        detailedStatement: detailedStatement.data ?? null,
        balanceSheet,
        year,
        formatAmount: (n: number) => formatAmount(n, undefined, year),
        currency,
        monthlyChartElement: trendChartRef.current,
      });
      
      if (success) {
        toast.success(t('reports.pdfCreated'));
      } else {
        toast.error(t('reports.pdfFailed'));
      }
    } catch {
      toast.error(t('reports.pdfFailed'));
    }
  };

  const handleIncomeStatementPdf = async () => {
    if (!incomeStatementRef.current) return;
    try {
      await generateIncomeStatementPdf(incomeStatementRef, year, currency);
      toast.success(t('reports.pdfCreated'));
    } catch {
      toast.error(t('reports.pdfFailed'));
    }
  };

  // Detaylı Gelir Tablosu PDF - data-driven (jspdf-autotable)
  const handleDetailedPdf = async () => {
    if (!detailedStatement.data) return;
    try {
      const success = await generateDetailedIncomePdfData(
        detailedStatement.data,
        year,
        (n) => formatAmount(n, undefined, year),
        { currency }
      );
      if (success) {
        toast.success(t('reports.pdfCreated'));
      } else {
        toast.error(t('reports.pdfFailed'));
      }
    } catch {
      toast.error(t('reports.pdfFailed'));
    }
  };

  // Finansman Özeti PDF - data-driven (jspdf-autotable)
  const handleFinancingPdf = async () => {
    try {
      const builder = createPdfBuilder({ orientation: 'portrait', margin: 10 });
      
      // Ortak Cari Hesabı
      builder.addSpacer(10);
      builder.addTable({
        title: t('reports.financingSummary'),
        headers: [t('common:description'), t('common:amount')],
        rows: [
          [t('reports.partnerDeposit'), formatAmount(hub.partnerSummary.deposits, undefined, year)],
          [t('reports.partnerWithdraw'), `(${formatAmount(hub.partnerSummary.withdrawals, undefined, year)})`],
          [t('reports.netBalance'), formatAmount(hub.partnerSummary.balance, undefined, year)],
        ],
      });
      
      // Kredi Takibi
      builder.addSpacer(10);
      builder.addTable({
        title: t('reports.creditTracking'),
        headers: [t('common:description'), t('common:amount')],
        rows: [
          [t('reports.totalCredit'), formatAmount(hub.financingSummary.creditDetails.totalCredit, undefined, year)],
          [t('reports.paidInstallment'), `(${formatAmount(hub.financingSummary.creditOut, undefined, year)})`],
          [t('reports.leasingPayment'), `(${formatAmount(hub.financingSummary.leasingOut, undefined, year)})`],
          [t('reports.interestPayment'), `(${formatAmount(hub.financingSummary.interestPaid, undefined, year)})`],
          [t('reports.remainingDebt'), formatAmount(hub.financingSummary.remainingDebt, undefined, year)],
        ],
      });
      
      // Yatırımlar
      builder.addSpacer(10);
      builder.addTable({
        title: t('reports.investments'),
        headers: [t('common:description'), t('common:amount')],
        rows: [
          [t('reports.vehicles'), formatAmount(hub.investmentSummary.vehicles, undefined, year)],
          [t('reports.equipment'), formatAmount(hub.investmentSummary.equipment, undefined, year)],
          [t('reports.fixtures'), formatAmount(hub.investmentSummary.fixtures, undefined, year)],
          [t('reports.other'), formatAmount(hub.investmentSummary.other, undefined, year)],
          [t('reports.totalInvestment'), formatAmount(hub.investmentSummary.total, undefined, year)],
        ],
      });
      
      // Sabit Giderler
      builder.addSpacer(10);
      builder.addTable({
        title: t('reports.fixedExpensesTracking'),
        headers: [t('common:description'), t('common:amount')],
        rows: [
          [t('reports.monthlyFixed'), formatAmount(hub.fixedExpenses.monthlyFixed, undefined, year)],
          [t('reports.monthlyInstallments'), formatAmount(hub.fixedExpenses.monthlyInstallments, undefined, year)],
          [t('reports.totalMonthly'), formatAmount(hub.fixedExpenses.totalMonthly, undefined, year)],
          [t('reports.yearlyProjection'), formatAmount(hub.fixedExpenses.yearlyProjected, undefined, year)],
        ],
      });
      
      const filename = `Financing_Summary_${year}_${currency}.pdf`;
      const success = await builder.build(filename);
      
      if (success) {
        toast.success(t('reports.pdfCreated'));
      } else {
        toast.error(t('reports.pdfFailed'));
      }
    } catch {
      toast.error(t('reports.pdfFailed'));
    }
  };

  const handleDashboardPdf = async () => {
    try {
      // Her grafiği ayrı sayfaya koyarak bölünmeyi önle
      const success = await generateDashboardPdfSmart(
        {
          trendChart: trendChartRef.current,
          revenueChart: incomeChartRef.current,
          expenseChart: expenseChartRef.current,
        },
        year,
        currency
      );
      
      if (success) {
        toast.success(t('reports.pdfCreated'));
      } else {
        toast.error(t('reports.pdfFailed'));
      }
    } catch {
      toast.error(t('reports.pdfFailed'));
    }
  };

  const handleIncomePdf = async () => {
    try {
      await generateDistributionChartPdf(incomeRef, 'income', year, currency);
      toast.success(t('reports.pdfCreated'));
    } catch {
      toast.error(t('reports.pdfFailed'));
    }
  };

  const handleExpensePdf = async () => {
    try {
      await generateDistributionChartPdf(expenseRef, 'expense', year, currency);
      toast.success(t('reports.pdfCreated'));
    } catch {
      toast.error(t('reports.pdfFailed'));
    }
  };

  const handleCashFlowPdf = async () => {
    if (!cashFlowStatement) {
      toast.error(t('reports.pdfFailed'));
      return;
    }
    
    const success = await generateCashFlowPdfData(
      cashFlowStatement,
      year,
      (n) => formatAmount(n, undefined, year)
    );
    
    if (success) {
      toast.success(t('reports.pdfCreated'));
    } else {
      toast.error(t('reports.pdfFailed'));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/finance/" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold flex-1">{t('reports.title')}</h1>
          {incomeStatement.isOfficial && (
            <Badge variant="default" className="bg-green-600">
              <Shield className="h-3 w-3 mr-1" />
              {t('dashboard.officialData')}
            </Badge>
          )}
          <CurrencyToggle year={year} />
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Link to="/finance/simulation">
            <Button variant="outline" size="sm" className="gap-1">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">{t('reports.simulation', { year: 2026 })}</span>
            </Button>
          </Link>
          <Button onClick={handleFullReportPdf} disabled={isPdfEngineGenerating} size="sm" className="gap-1">
            {isPdfEngineGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs hidden sm:inline">{pdfProgress.stage} ({pdfProgress.current}/{pdfProgress.total})</span>
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">{t('reports.fullReport')}</span>
              </>
            )}
          </Button>
        </div>

        {/* USD Conversion Warning */}
        {currency === 'USD' && missingMonths > 0 && (
          <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              {t('reports.exchangeWarning', { count: missingMonths, available: availableMonths })}
            </AlertDescription>
          </Alert>
        )}

        {/* Uncategorized Transaction Warning */}
        {hub.uncategorizedCount > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('reports.uncategorizedTitle')}</AlertTitle>
            <AlertDescription>
              {t('reports.uncategorizedDetail', { count: hub.uncategorizedCount, amount: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(hub.uncategorizedTotal) })}{' '}
              <Link to="/finance/bank-transactions" className="underline font-medium">
                {t('reports.goToCategorize')}
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Cards - Row 1: Income/Expense */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-green-50 dark:bg-green-950/30">
            <CardContent className="p-3">
              <TrendingUp className="h-4 w-4 text-green-600 mb-1" />
              <p className="text-xs text-muted-foreground">{t('reports.netIncome')}</p>
              <p className="text-lg font-bold text-green-600">{formatAmount(incomeStatement.statement?.netSales || 0)}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/30">
            <CardContent className="p-3">
              <TrendingDown className="h-4 w-4 text-red-600 mb-1" />
              <p className="text-xs text-muted-foreground">{t('reports.netExpense')}</p>
              <p className="text-lg font-bold text-red-600">
                {formatAmount((incomeStatement.statement?.costOfSales || 0) + (incomeStatement.statement?.operatingExpenses.total || 0))}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <Wallet className="h-4 w-4 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">{t('reports.netProfit')}</p>
              <p className={`text-lg font-bold ${(incomeStatement.statement?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatAmount(incomeStatement.statement?.netProfit || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <BarChart3 className="h-4 w-4 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">{t('reports.profitMargin')}</p>
              <p className="text-lg font-bold">{(incomeStatement.statement?.profitMargin || 0).toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards - Row 2: VAT Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="p-3">
              <Receipt className="h-4 w-4 text-blue-600 mb-1" />
              <p className="text-xs text-muted-foreground">{t('reports.calculatedVat')}</p>
              <p className="text-base font-bold text-blue-600">{formatAmount(hub.vatSummary.calculated)}</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 dark:bg-orange-950/30">
            <CardContent className="p-3">
              <Receipt className="h-4 w-4 text-orange-600 mb-1" />
              <p className="text-xs text-muted-foreground">{t('reports.deductibleVat')}</p>
              <p className="text-base font-bold text-orange-600">{formatAmount(hub.vatSummary.deductible)}</p>
            </CardContent>
          </Card>
          <Card className={hub.vatSummary.net >= 0 ? 'bg-purple-50 dark:bg-purple-950/30' : 'bg-green-50 dark:bg-green-950/30'}>
            <CardContent className="p-3">
              <Wallet className="h-4 w-4 text-purple-600 mb-1" />
              <p className="text-xs text-muted-foreground">{t('reports.netVat')}</p>
              <p className={`text-base font-bold ${hub.vatSummary.net >= 0 ? 'text-purple-600' : 'text-green-600'}`}>
                {hub.vatSummary.net >= 0 ? t('reports.payable') : t('reports.deferred')}: {formatAmount(Math.abs(hub.vatSummary.net))}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="dashboard" className="text-xs py-2"><BarChart3 className="h-3 w-3 mr-1 hidden sm:inline" />{t('reports.tabs.summary')}</TabsTrigger>
            <TabsTrigger value="detailed" className="text-xs py-2"><FileText className="h-3 w-3 mr-1 hidden sm:inline" />{t('reports.tabs.official')}</TabsTrigger>
            <TabsTrigger value="financing" className="text-xs py-2"><CreditCard className="h-3 w-3 mr-1 hidden sm:inline" />{t('reports.tabs.financing')}</TabsTrigger>
            <TabsTrigger value="cashflow" className="text-xs py-2"><Wallet className="h-3 w-3 mr-1 hidden sm:inline" />{t('reports.tabs.cashflow')}</TabsTrigger>
          </TabsList>

          {/* Tab 1: Dashboard */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="flex justify-end">
              <Button 
                onClick={handleDashboardPdf} 
                disabled={isPdfEngineGenerating} 
                size="sm" 
                variant="outline"
                className="gap-1"
              >
                {isPdfEngineGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                {t('reports.charts.chartPdf')}
              </Button>
            </div>
            <div ref={dashboardRef} className="space-y-4 bg-background p-4 rounded-lg">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">{t('reports.charts.monthlyTrend')} - {year}</CardTitle></CardHeader>
                <CardContent>
                  <div ref={trendChartRef}>
                    <MonthlyTrendChart data={monthlyData} formatAmount={(n) => formatAmount(n, undefined, year)} />
                  </div>
                </CardContent>
              </Card>
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{t('reports.charts.serviceRevenue')}</CardTitle></CardHeader>
                  <CardContent>
                    <div ref={incomeChartRef}>
                      <ServiceRevenueChart data={incomeAnalysis.serviceRevenue} formatAmount={(n) => formatAmount(n, undefined, year)} formatCompactAmount={(n) => formatCompactAmount(n, undefined, year)} />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">{t('reports.charts.expenseCategories')}</CardTitle></CardHeader>
                  <CardContent>
                    <div ref={expenseChartRef}>
                      <ExpenseCategoryChart data={expenseAnalysis.topCategories} formatAmount={(n) => formatAmount(n, undefined, year)} formatCompactAmount={(n) => formatCompactAmount(n, undefined, year)} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>


          {/* Tab 2: Detailed Income Statement (Official Format) */}
          <TabsContent value="detailed" className="space-y-3">
            <div className="flex justify-end">
              <Button 
                onClick={handleDetailedPdf} 
                disabled={isPdfEngineGenerating} 
                size="sm" 
                variant="outline"
                className="gap-1"
              >
                {isPdfEngineGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              PDF
              </Button>
            </div>
            <DetailedIncomeStatementTable 
              data={detailedStatement.data}
              formatAmount={(n) => formatAmount(n, undefined, year)}
            />
          </TabsContent>

          {/* Tab 6: Financing - Detailed */}
          <TabsContent value="financing" className="space-y-4">
            <div className="flex justify-end">
              <Button 
                onClick={handleFinancingPdf} 
                disabled={false} 
                size="sm" 
                variant="outline"
                className="gap-1"
              >
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
            </div>
            <div ref={financingRef} className="space-y-4 bg-background">
            {/* Partner Account */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <CardTitle className="text-sm">{t('reports.partnerAccount')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('reports.partnerDeposit')}</span>
                  <span className="text-green-600">+{formatAmount(hub.partnerSummary.deposits)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('reports.partnerWithdraw')}</span>
                  <span className="text-red-600">-{formatAmount(hub.partnerSummary.withdrawals)}</span>
                </div>
                <hr />
                <div className="flex justify-between font-medium">
                  <span>{t('reports.netBalance')}</span>
                  <span className={hub.partnerSummary.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatAmount(hub.partnerSummary.balance)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Credit Tracking */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <CardTitle className="text-sm">{t('reports.creditTracking')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('reports.totalCredit')}</span>
                    <span className="font-medium">{formatAmount(hub.financingSummary.creditDetails.totalCredit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('reports.paidInstallment')}</span>
                    <span className="text-green-600">-{formatAmount(hub.financingSummary.creditOut)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('reports.leasingPayment')}</span>
                    <span className="text-green-600">-{formatAmount(hub.financingSummary.leasingOut)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-medium">
                    <span>{t('reports.remainingDebt')}</span>
                    <span className="text-red-600">{formatAmount(hub.financingSummary.remainingDebt)}</span>
                  </div>
                </div>
                
                {hub.financingSummary.creditDetails.totalCredit > 0 && (
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{t('common:progress')}</span>
                      <span>
                        {hub.financingSummary.creditDetails.paidMonths > 0 
                          ? `${hub.financingSummary.creditDetails.paidMonths} / ${hub.financingSummary.creditDetails.paidMonths + hub.financingSummary.creditDetails.remainingMonths} ${t('common:months')}`
                          : `${Math.round((hub.financingSummary.creditOut / hub.financingSummary.creditDetails.totalCredit) * 100)}%`
                        }
                      </span>
                    </div>
                    <Progress 
                      value={hub.financingSummary.creditDetails.totalCredit > 0 
                        ? (hub.financingSummary.creditOut / hub.financingSummary.creditDetails.totalCredit) * 100 
                        : 0} 
                      className="h-2" 
                    />
                    {hub.financingSummary.creditDetails.monthlyPayment > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('common:monthly')}: {formatAmount(hub.financingSummary.creditDetails.monthlyPayment)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Investment Summary */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <CardTitle className="text-sm">{t('reports.investments')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {hub.investmentSummary.vehicles > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Car className="h-3 w-3" /> {t('reports.vehicles')}
                    </span>
                    <span className="font-medium">{formatAmount(hub.investmentSummary.vehicles)}</span>
                  </div>
                )}
                {hub.investmentSummary.equipment > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('reports.equipment')}</span>
                    <span className="font-medium">{formatAmount(hub.investmentSummary.equipment)}</span>
                  </div>
                )}
                {hub.investmentSummary.other > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('reports.other')}</span>
                    <span className="font-medium">{formatAmount(hub.investmentSummary.other)}</span>
                  </div>
                )}
                <hr />
                <div className="flex justify-between font-medium">
                  <span>{t('reports.totalInvestment')}</span>
                  <span>{formatAmount(hub.investmentSummary.total)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Fixed Expenses Summary */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  <CardTitle className="text-sm">{t('reports.fixedExpensesTracking')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('reports.monthlyFixed')}</span>
                  <span className="font-medium">{formatAmount(hub.fixedExpenses.monthlyFixed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('reports.monthlyInstallments')}</span>
                  <span className="font-medium">{formatAmount(hub.fixedExpenses.monthlyInstallments)}</span>
                </div>
                <hr />
                <div className="flex justify-between font-medium">
                  <span>{t('reports.totalMonthly')}</span>
                  <span className="text-red-600">{formatAmount(hub.fixedExpenses.totalMonthly)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t('reports.yearlyProjection')}</span>
                  <span>{formatAmount(hub.fixedExpenses.yearlyProjected)}</span>
                </div>
                
                {hub.fixedExpenses.installmentDetails.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{t('common:activeInstallments')}:</p>
                    {hub.fixedExpenses.installmentDetails.map((item, i) => (
                      <div key={i} className="bg-muted/50 rounded p-2 text-xs">
                        <div className="flex justify-between">
                          <span className="font-medium">{item.definition.expense_name}</span>
                          <span>{formatAmount(item.monthlyAmount)}/{t('common:month')}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground mt-1">
                          <span>{t('common:remaining')}: {item.remainingMonths} {t('common:months')}</span>
                          <span>{formatAmount(item.remainingTotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          {/* Tab 6: Cash Flow Statement */}
          <TabsContent value="cashflow" className="space-y-4">
            <div className="flex justify-end">
              <Button 
                onClick={handleCashFlowPdf} 
                disabled={isPdfEngineGenerating || !cashFlowStatement} 
                size="sm" 
                variant="outline"
                className="gap-1"
              >
                {isPdfEngineGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                PDF
              </Button>
            </div>
            {cashFlowLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : cashFlowStatement ? (
              <CashFlowStatementTable data={cashFlowStatement} year={year} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {t('reports.pdfFailed')}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ============================================ */}
        {/* TAM RAPOR PDF İÇİN HİDDEN CONTAINER */}
        {/* Tüm sekme içeriklerini içerir, ekranda gizli */}
        {/* ============================================ */}
        <div ref={fullReportRef} className="hidden pdf-hidden-container">
          <div className="bg-white p-6 space-y-8" style={{ width: '1200px' }}>
            {/* Başlık */}
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')} - {year}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {t('currency.try')}: {currency} | {new Date().toLocaleDateString('tr-TR')}
              </p>
            </div>

            {/* Özet KPI'lar */}
            <div className="pdf-section">
              <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">{t('reports.tabs.summary')}</h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-xs text-gray-600">{t('reports.netIncome')}</p>
                  <p className="text-lg font-bold text-green-700">{formatAmount(incomeStatement.statement?.netSales || 0)}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-xs text-gray-600">{t('reports.netExpense')}</p>
                  <p className="text-lg font-bold text-red-700">{formatAmount((incomeStatement.statement?.costOfSales || 0) + (incomeStatement.statement?.operatingExpenses.total || 0))}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600">{t('reports.netProfit')}</p>
                  <p className={`text-lg font-bold ${(incomeStatement.statement?.netProfit || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatAmount(incomeStatement.statement?.netProfit || 0)}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-xs text-gray-600">{t('reports.profitMargin')}</p>
                  <p className="text-lg font-bold text-purple-700">{(incomeStatement.statement?.profitMargin || 0).toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* KDV Özeti */}
            <div className="pdf-section">
              <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">{t('vat.title')}</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600">{t('reports.calculatedVat')}</p>
                  <p className="text-lg font-bold text-blue-700">{formatAmount(hub.vatSummary.calculated)}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-xs text-gray-600">{t('reports.deductibleVat')}</p>
                  <p className="text-lg font-bold text-orange-700">{formatAmount(hub.vatSummary.deductible)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-xs text-gray-600">{t('reports.netVat')}</p>
                  <p className={`text-lg font-bold ${hub.vatSummary.net >= 0 ? 'text-purple-700' : 'text-green-700'}`}>
                    {hub.vatSummary.net >= 0 ? t('reports.payable') : t('reports.deferred')}: {formatAmount(Math.abs(hub.vatSummary.net))}
                  </p>
                </div>
              </div>
            </div>

            {/* Gelir Dağılımı */}
            <div className="pdf-section">
              <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">{t('reports.incomeDistribution')}</h2>
              <div className="grid grid-cols-2 gap-6">
                <div ref={incomeRef}>
                  <ServiceRevenueChart data={incomeAnalysis.serviceRevenue} formatAmount={(n) => formatAmount(n, undefined, year)} formatCompactAmount={(n) => formatCompactAmount(n, undefined, year)} />
                </div>
                <div className="space-y-2">
                  {incomeAnalysis.serviceRevenue.map((service, i) => (
                    <div key={i} className="flex justify-between text-sm border-b pb-1">
                      <span className="text-gray-700">{service.name}</span>
                      <span className="font-medium">{formatAmount(service.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Gider Dağılımı */}
            <div className="pdf-section">
              <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">{t('reports.expenseDistribution')}</h2>
              <div className="grid grid-cols-2 gap-6">
                <div ref={expenseRef}>
                  <ExpenseCategoryChart data={expenseAnalysis.topCategories} formatAmount={(n) => formatAmount(n, undefined, year)} formatCompactAmount={(n) => formatCompactAmount(n, undefined, year)} />
                </div>
                <div className="space-y-2">
                  {expenseAnalysis.topCategories.slice(0, 10).map((cat, i) => (
                    <div key={i} className="flex justify-between text-sm border-b pb-1">
                      <span className="text-gray-700">{cat.name}</span>
                      <span className="font-medium">{formatAmount(cat.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Aylık Trend */}
            <div className="pdf-section">
              <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">{t('reports.monthlyTrend')}</h2>
              <MonthlyTrendChart data={monthlyData} formatAmount={(n) => formatAmount(n, undefined, year)} />
            </div>
          </div>
        </div>
      </div>
      <BottomTabBar />
    </div>
  );
}
