import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, FileDown, BarChart3, FileText, Users, Loader2, Receipt, CreditCard, Car, Building, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFinancialDataHub } from '@/hooks/finance/useFinancialDataHub';
import { useIncomeAnalysis } from '@/hooks/finance/useIncomeAnalysis';
import { useExpenseAnalysis } from '@/hooks/finance/useExpenseAnalysis';
import { useIncomeStatement } from '@/hooks/finance/useIncomeStatement';
import { useDetailedIncomeStatement } from '@/hooks/finance/useDetailedIncomeStatement';
import { useFixedExpenses } from '@/hooks/finance/useFixedExpenses';
import { usePdfExport } from '@/hooks/finance/usePdfExport';
import { useIncomeStatementPdfExport } from '@/hooks/finance/useIncomeStatementPdfExport';
import { useDetailedIncomeStatementPdf } from '@/hooks/finance/useDetailedIncomeStatementPdf';
import { useFinancingSummaryPdf } from '@/hooks/finance/useFinancingSummaryPdf';
import { useFullReportPdf } from '@/hooks/finance/useFullReportPdf';
import { useBalanceSheet } from '@/hooks/finance/useBalanceSheet';
import { MonthlyTrendChart } from '@/components/finance/charts/MonthlyTrendChart';
import { ServiceRevenueChart } from '@/components/finance/charts/ServiceRevenueChart';
import { ExpenseCategoryChart } from '@/components/finance/charts/ExpenseCategoryChart';
import { IncomeStatementTable } from '@/components/finance/tables/IncomeStatementTable';
import { DetailedIncomeStatementTable } from '@/components/finance/tables/DetailedIncomeStatementTable';
import { BottomTabBar } from '@/components/BottomTabBar';
import { CurrencyToggle } from '@/components/finance/CurrencyToggle';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ReportPeriod, FullReportData, MonthlyDataPoint, MONTH_NAMES_SHORT_TR } from '@/types/reports';
import { captureElementToPdf } from '@/lib/pdfCapture';
import { toast } from 'sonner';

export default function Reports() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState<ReportPeriod>('yearly');
  const [isDashboardPdfGenerating, setIsDashboardPdfGenerating] = useState(false);
  const [isIncomePdfGenerating, setIsIncomePdfGenerating] = useState(false);
  const [isExpensePdfGenerating, setIsExpensePdfGenerating] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const incomeRef = useRef<HTMLDivElement>(null);
  const expenseRef = useRef<HTMLDivElement>(null);
  const trendChartRef = useRef<HTMLDivElement>(null);
  const incomeChartRef = useRef<HTMLDivElement>(null);
  const expenseChartRef = useRef<HTMLDivElement>(null);
  
  // Use unified data hub
  const hub = useFinancialDataHub(year);
  const incomeAnalysis = useIncomeAnalysis(year);
  const expenseAnalysis = useExpenseAnalysis(year);
  const incomeStatement = useIncomeStatement(year);
  const detailedStatement = useDetailedIncomeStatement(year);
  const { definitions: fixedExpensesList } = useFixedExpenses();
  const { balanceSheet } = useBalanceSheet(year);
  const { generatePdf, isGenerating } = usePdfExport();
  const { generateIncomeStatementPdf, isGenerating: isIncomeStatementPdfGenerating } = useIncomeStatementPdfExport();
  const { generatePdf: generateDetailedPdf, isGenerating: isDetailedPdfGenerating } = useDetailedIncomeStatementPdf();
  const { generatePdf: generateFinancingPdf, isGenerating: isFinancingPdfGenerating } = useFinancingSummaryPdf();
  const { generateFullReport, isGenerating: isFullReportGenerating, progress: fullReportProgress } = useFullReportPdf();
  const { currency, formatAmount, getAvailableMonthsCount, yearlyAverageRate } = useCurrency();
  
  const availableMonths = getAvailableMonthsCount(year);
  const missingMonths = 12 - availableMonths;

  // Combine monthly data from hub
  const monthlyData = useMemo((): MonthlyDataPoint[] => {
    const months = Object.entries(hub.byMonth || {});
    let cumulative = 0;
    return months.map(([m, data]) => {
      const net = data.income.net - data.expense.net;
      cumulative += net;
      return {
        month: parseInt(m),
        monthName: MONTH_NAMES_SHORT_TR[parseInt(m) - 1],
        income: data.income.net,
        expense: data.expense.net,
        net,
        cumulativeProfit: cumulative,
      };
    });
  }, [hub.byMonth]);

  const handleFullReportPdf = async () => {
    const reportData: FullReportData = {
      year,
      period,
      generatedAt: new Date().toISOString(),
      kpis: {
        totalIncome: { value: hub.incomeSummary.gross, trend: 'neutral' },
        totalExpenses: { value: hub.expenseSummary.gross, trend: 'neutral' },
        netProfit: { value: hub.operatingProfit, trend: hub.operatingProfit >= 0 ? 'up' : 'down' },
        profitMargin: { value: hub.profitMargin, trend: 'neutral' },
      },
      monthlyData,
      serviceRevenue: incomeAnalysis.serviceRevenue,
      expenseCategories: expenseAnalysis.expenseCategories,
      incomeStatement: incomeStatement.statement,
      partnerAccount: {
        transactions: [],
        totalDebit: hub.partnerSummary.withdrawals,
        totalCredit: hub.partnerSummary.deposits,
        balance: hub.partnerSummary.balance,
      },
      financing: {
        creditUsed: hub.financingSummary.creditIn,
        creditPaid: hub.financingSummary.creditOut,
        leasingPaid: hub.financingSummary.leasingOut,
        interestPaid: hub.financingSummary.interestPaid,
        remainingDebt: hub.financingSummary.remainingDebt,
      },
    };

    const chartRefs = {
      trendChart: trendChartRef.current,
      incomeChart: incomeChartRef.current,
      expenseChart: expenseChartRef.current,
    };

    const additionalData = {
      balanceSheet: {
        totalAssets: balanceSheet.totalAssets,
        totalLiabilities: balanceSheet.totalLiabilities,
        currentAssets: balanceSheet.currentAssets,
        fixedAssets: balanceSheet.fixedAssets,
        shortTermLiabilities: balanceSheet.shortTermLiabilities,
        longTermLiabilities: balanceSheet.longTermLiabilities,
        equity: balanceSheet.equity,
      },
      vatSummary: hub.vatSummary,
    };

    try {
      await generateFullReport(reportData, chartRefs, additionalData, {
        currency,
        formatAmount: (n) => formatAmount(n, undefined, year),
        yearlyAverageRate,
      });
      toast.success(`Kapsamlı rapor PDF oluşturuldu (${currency})`);
    } catch {
      toast.error('PDF oluşturulamadı');
    }
  };

  const handleExportPdf = async () => {
    const reportData: FullReportData = {
      year,
      period,
      generatedAt: new Date().toISOString(),
      kpis: {
        totalIncome: { value: hub.incomeSummary.gross, trend: 'neutral' },
        totalExpenses: { value: hub.expenseSummary.gross, trend: 'neutral' },
        netProfit: { value: hub.operatingProfit, trend: hub.operatingProfit >= 0 ? 'up' : 'down' },
        profitMargin: { value: hub.profitMargin, trend: 'neutral' },
      },
      monthlyData,
      serviceRevenue: incomeAnalysis.serviceRevenue,
      expenseCategories: expenseAnalysis.expenseCategories,
      incomeStatement: incomeStatement.statement,
      partnerAccount: {
        transactions: [],
        totalDebit: hub.partnerSummary.withdrawals,
        totalCredit: hub.partnerSummary.deposits,
        balance: hub.partnerSummary.balance,
      },
      financing: {
        creditUsed: hub.financingSummary.creditIn,
        creditPaid: hub.financingSummary.creditOut,
        leasingPaid: hub.financingSummary.leasingOut,
        interestPaid: hub.financingSummary.interestPaid,
        remainingDebt: hub.financingSummary.remainingDebt,
      },
    };

    try {
      await generatePdf(reportData, {
        currency,
        formatAmount: (n) => formatAmount(n, undefined, year),
        yearlyAverageRate,
      });
      toast.success(`PDF başarıyla oluşturuldu (${currency})`);
    } catch {
      toast.error('PDF oluşturulamadı');
    }
  };

  const handleIncomeStatementPdf = async () => {
    try {
      await generateIncomeStatementPdf(
        incomeStatement.statement,
        incomeStatement.lines,
        year,
        {
          currency,
          formatAmount: (n) => formatAmount(n, undefined, year),
          yearlyAverageRate,
        }
      );
      toast.success(`Gelir Tablosu PDF oluşturuldu (${currency})`);
    } catch {
      toast.error('PDF oluşturulamadı');
    }
  };

  const handleDetailedPdf = async () => {
    try {
      await generateDetailedPdf(detailedStatement.data, {
        currency,
        formatAmount: (n) => formatAmount(n, undefined, year),
        yearlyAverageRate,
      });
      toast.success(`Ayrıntılı Gelir Tablosu PDF oluşturuldu (${currency})`);
    } catch {
      toast.error('PDF oluşturulamadı');
    }
  };

  const handleDashboardPdf = async () => {
    if (!dashboardRef.current) return;
    setIsDashboardPdfGenerating(true);
    try {
      const success = await captureElementToPdf(dashboardRef.current, {
        filename: `Dashboard_${year}_${currency}.pdf`,
        orientation: 'landscape',
        fitToPage: false,
        scale: 2,
      });
      if (success) {
        toast.success(`Dashboard PDF oluşturuldu (${currency})`);
      } else {
        toast.error('PDF oluşturulamadı');
      }
    } catch {
      toast.error('PDF oluşturulamadı');
    } finally {
      setIsDashboardPdfGenerating(false);
    }
  };

  const handleIncomePdf = async () => {
    if (!incomeRef.current) return;
    setIsIncomePdfGenerating(true);
    try {
      const success = await captureElementToPdf(incomeRef.current, {
        filename: `Gelir_Dagilimi_${year}_${currency}.pdf`,
        orientation: 'landscape',
        fitToPage: true,
        scale: 2,
      });
      if (success) {
        toast.success(`Gelir dağılımı PDF oluşturuldu (${currency})`);
      } else {
        toast.error('PDF oluşturulamadı');
      }
    } catch {
      toast.error('PDF oluşturulamadı');
    } finally {
      setIsIncomePdfGenerating(false);
    }
  };

  const handleExpensePdf = async () => {
    if (!expenseRef.current) return;
    setIsExpensePdfGenerating(true);
    try {
      const success = await captureElementToPdf(expenseRef.current, {
        filename: `Gider_Dagilimi_${year}_${currency}.pdf`,
        orientation: 'landscape',
        fitToPage: true,
        scale: 2,
      });
      if (success) {
        toast.success(`Gider dağılımı PDF oluşturuldu (${currency})`);
      } else {
        toast.error('PDF oluşturulamadı');
      }
    } catch {
      toast.error('PDF oluşturulamadı');
    } finally {
      setIsExpensePdfGenerating(false);
    }
  };

  const handleFinancingPdf = async () => {
    try {
      await generateFinancingPdf({
        partnerSummary: {
          deposits: hub.partnerSummary.deposits,
          withdrawals: hub.partnerSummary.withdrawals,
          balance: hub.partnerSummary.balance,
        },
        financingSummary: {
          creditIn: hub.financingSummary.creditIn,
          creditOut: hub.financingSummary.creditOut,
          leasingOut: hub.financingSummary.leasingOut,
          interestPaid: hub.financingSummary.interestPaid,
          remainingDebt: hub.financingSummary.remainingDebt,
        },
        investmentSummary: {
          vehicles: hub.investmentSummary.vehicles,
          equipment: hub.investmentSummary.equipment,
          fixtures: hub.investmentSummary.other,
          totalInvestment: hub.investmentSummary.total,
        },
        fixedExpenses: fixedExpensesList || [],
      }, year, {
        currency,
        formatAmount: (n) => formatAmount(n, undefined, year),
        yearlyAverageRate,
      });
      toast.success(`Finansman Raporu PDF oluşturuldu (${currency})`);
    } catch {
      toast.error('PDF oluşturulamadı');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/finance" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold flex-1">Finansal Rapor</h1>
          <CurrencyToggle year={year} />
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleFullReportPdf} disabled={isFullReportGenerating} size="sm" className="gap-1">
            {isFullReportGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs hidden sm:inline">{fullReportProgress.stage} ({fullReportProgress.current}/{fullReportProgress.total})</span>
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">Tam Rapor</span>
              </>
            )}
          </Button>
        </div>

        {/* USD Conversion Warning */}
        {currency === 'USD' && missingMonths > 0 && (
          <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              {missingMonths} ay için kur verisi bulunmuyor. Sadece {availableMonths} ay USD'ye dönüştürüldü.
            </AlertDescription>
          </Alert>
        )}

        {/* Uncategorized Transaction Warning */}
        {hub.uncategorizedCount > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Kategorisiz İşlem Var</AlertTitle>
            <AlertDescription>
              {hub.uncategorizedCount} adet işlem ({new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(hub.uncategorizedTotal)}) kategorilendirilememiş. 
              Bu işlemler finansal raporlara dahil edilmiyor.{' '}
              <Link to="/finance/bank-transactions" className="underline font-medium">
                Kategorilendirmeye Git
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Cards - Row 1: Income/Expense */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-green-50 dark:bg-green-950/30">
            <CardContent className="p-3">
              <TrendingUp className="h-4 w-4 text-green-600 mb-1" />
              <p className="text-xs text-muted-foreground">Net Gelir (KDV Hariç)</p>
              <p className="text-lg font-bold text-green-600">{formatAmount(hub.incomeSummary.net)}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/30">
            <CardContent className="p-3">
              <TrendingDown className="h-4 w-4 text-red-600 mb-1" />
              <p className="text-xs text-muted-foreground">Net Gider (KDV Hariç)</p>
              <p className="text-lg font-bold text-red-600">{formatAmount(hub.expenseSummary.net)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <Wallet className="h-4 w-4 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Net Kâr</p>
              <p className={`text-lg font-bold ${hub.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatAmount(hub.operatingProfit)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <BarChart3 className="h-4 w-4 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Kâr Marjı</p>
              <p className="text-lg font-bold">{hub.profitMargin.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards - Row 2: VAT Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="p-3">
              <Receipt className="h-4 w-4 text-blue-600 mb-1" />
              <p className="text-xs text-muted-foreground">Hesaplanan KDV</p>
              <p className="text-base font-bold text-blue-600">{formatAmount(hub.vatSummary.calculated)}</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 dark:bg-orange-950/30">
            <CardContent className="p-3">
              <Receipt className="h-4 w-4 text-orange-600 mb-1" />
              <p className="text-xs text-muted-foreground">İndirilecek KDV</p>
              <p className="text-base font-bold text-orange-600">{formatAmount(hub.vatSummary.deductible)}</p>
            </CardContent>
          </Card>
          <Card className={hub.vatSummary.net >= 0 ? 'bg-purple-50 dark:bg-purple-950/30' : 'bg-green-50 dark:bg-green-950/30'}>
            <CardContent className="p-3">
              <Wallet className="h-4 w-4 text-purple-600 mb-1" />
              <p className="text-xs text-muted-foreground">Net KDV</p>
              <p className={`text-base font-bold ${hub.vatSummary.net >= 0 ? 'text-purple-600' : 'text-green-600'}`}>
                {hub.vatSummary.net >= 0 ? 'Ödenecek' : 'Devreden'}: {formatAmount(Math.abs(hub.vatSummary.net))}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6 h-auto">
            <TabsTrigger value="dashboard" className="text-xs py-2"><BarChart3 className="h-3 w-3 mr-1 hidden sm:inline" />Özet</TabsTrigger>
            <TabsTrigger value="income" className="text-xs py-2"><TrendingUp className="h-3 w-3 mr-1 hidden sm:inline" />Gelir</TabsTrigger>
            <TabsTrigger value="expense" className="text-xs py-2"><TrendingDown className="h-3 w-3 mr-1 hidden sm:inline" />Gider</TabsTrigger>
            <TabsTrigger value="statement" className="text-xs py-2"><FileText className="h-3 w-3 mr-1 hidden sm:inline" />Tablo</TabsTrigger>
            <TabsTrigger value="detailed" className="text-xs py-2"><FileText className="h-3 w-3 mr-1 hidden sm:inline" />Resmi</TabsTrigger>
            <TabsTrigger value="financing" className="text-xs py-2"><CreditCard className="h-3 w-3 mr-1 hidden sm:inline" />Finans</TabsTrigger>
          </TabsList>

          {/* Tab 1: Dashboard */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="flex justify-end">
              <Button 
                onClick={handleDashboardPdf} 
                disabled={isDashboardPdfGenerating} 
                size="sm" 
                variant="outline"
                className="gap-1"
              >
                {isDashboardPdfGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Grafik PDF
              </Button>
            </div>
            <div ref={dashboardRef} className="space-y-4 bg-background p-4 rounded-lg">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Aylık Gelir vs Gider - {year}</CardTitle></CardHeader>
                <CardContent>
                  <div ref={trendChartRef}>
                    <MonthlyTrendChart data={monthlyData} formatAmount={(n) => formatAmount(n, undefined, year)} />
                  </div>
                </CardContent>
              </Card>
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Hizmet Bazlı Gelir</CardTitle></CardHeader>
                  <CardContent>
                    <div ref={incomeChartRef}>
                      <ServiceRevenueChart data={incomeAnalysis.serviceRevenue} formatAmount={(n) => formatAmount(n, undefined, year)} />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Gider Kategorileri</CardTitle></CardHeader>
                  <CardContent>
                    <div ref={expenseChartRef}>
                      <ExpenseCategoryChart data={expenseAnalysis.topCategories} formatAmount={(n) => formatAmount(n, undefined, year)} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Income */}
          <TabsContent value="income" className="space-y-4">
            <div className="flex justify-end">
              <Button 
                onClick={handleIncomePdf} 
                disabled={isIncomePdfGenerating} 
                size="sm" 
                variant="outline"
                className="gap-1"
              >
                {isIncomePdfGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Grafik PDF
              </Button>
            </div>
            <div ref={incomeRef} className="bg-background p-4 rounded-lg">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Hizmet Bazlı Gelir Dağılımı</CardTitle></CardHeader>
                <CardContent><ServiceRevenueChart data={incomeAnalysis.serviceRevenue} formatAmount={(n) => formatAmount(n, undefined, year)} /></CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 3: Expense */}
          <TabsContent value="expense" className="space-y-4">
            <div className="flex justify-end">
              <Button 
                onClick={handleExpensePdf} 
                disabled={isExpensePdfGenerating} 
                size="sm" 
                variant="outline"
                className="gap-1"
              >
                {isExpensePdfGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Grafik PDF
              </Button>
            </div>
            <div ref={expenseRef} className="space-y-4 bg-background p-4 rounded-lg">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Gider Kategorileri</CardTitle></CardHeader>
                <CardContent><ExpenseCategoryChart data={expenseAnalysis.topCategories} formatAmount={(n) => formatAmount(n, undefined, year)} /></CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Sabit Gider</p>
                    <p className="text-lg font-bold">{formatAmount(hub.expenseSummary.fixed)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Değişken Gider</p>
                    <p className="text-lg font-bold">{formatAmount(hub.expenseSummary.variable)}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Tab 4: Income Statement */}
          <TabsContent value="statement" className="space-y-3">
            <div className="flex justify-end">
              <Button 
                onClick={handleIncomeStatementPdf} 
                disabled={isIncomeStatementPdfGenerating} 
                size="sm" 
                variant="outline"
                className="gap-1"
              >
                {isIncomeStatementPdfGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                PDF
              </Button>
            </div>
            <IncomeStatementTable 
              lines={incomeStatement.lines} 
              year={year}
              formatAmount={(n) => formatAmount(n, undefined, year)}
            />
          </TabsContent>

          {/* Tab 5: Detailed Income Statement (Official Format) */}
          <TabsContent value="detailed" className="space-y-3">
            <div className="flex justify-end">
              <Button 
                onClick={handleDetailedPdf} 
                disabled={isDetailedPdfGenerating} 
                size="sm" 
                variant="outline"
                className="gap-1"
              >
                {isDetailedPdfGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
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
                disabled={isFinancingPdfGenerating} 
                size="sm" 
                variant="outline"
                className="gap-1"
              >
                {isFinancingPdfGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                PDF
              </Button>
            </div>
            {/* Partner Account */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <CardTitle className="text-sm">Ortak Cari Hesabı</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ortaktan Tahsilat</span>
                  <span className="text-green-600">+{formatAmount(hub.partnerSummary.deposits)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ortağa Ödeme</span>
                  <span className="text-red-600">-{formatAmount(hub.partnerSummary.withdrawals)}</span>
                </div>
                <hr />
                <div className="flex justify-between font-medium">
                  <span>Net Bakiye</span>
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
                  <CardTitle className="text-sm">Kredi Takibi</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Toplam Kredi</span>
                    <span className="font-medium">{formatAmount(hub.financingSummary.creditDetails.totalCredit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ödenen Taksit</span>
                    <span className="text-green-600">-{formatAmount(hub.financingSummary.creditOut)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Leasing Ödemesi</span>
                    <span className="text-green-600">-{formatAmount(hub.financingSummary.leasingOut)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-medium">
                    <span>Kalan Borç</span>
                    <span className="text-red-600">{formatAmount(hub.financingSummary.remainingDebt)}</span>
                  </div>
                </div>
                
                {hub.financingSummary.creditDetails.totalCredit > 0 && (
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Ödeme İlerlemesi</span>
                      <span>
                        {hub.financingSummary.creditDetails.paidMonths > 0 
                          ? `${hub.financingSummary.creditDetails.paidMonths} / ${hub.financingSummary.creditDetails.paidMonths + hub.financingSummary.creditDetails.remainingMonths} ay`
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
                        Aylık Taksit: {formatAmount(hub.financingSummary.creditDetails.monthlyPayment)}
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
                  <CardTitle className="text-sm">Yatırımlar</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {hub.investmentSummary.vehicles > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Car className="h-3 w-3" /> Araçlar
                    </span>
                    <span className="font-medium">{formatAmount(hub.investmentSummary.vehicles)}</span>
                  </div>
                )}
                {hub.investmentSummary.equipment > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ekipman</span>
                    <span className="font-medium">{formatAmount(hub.investmentSummary.equipment)}</span>
                  </div>
                )}
                {hub.investmentSummary.other > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Diğer</span>
                    <span className="font-medium">{formatAmount(hub.investmentSummary.other)}</span>
                  </div>
                )}
                <hr />
                <div className="flex justify-between font-medium">
                  <span>Toplam Yatırım</span>
                  <span>{formatAmount(hub.investmentSummary.total)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Fixed Expenses Summary */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  <CardTitle className="text-sm">Sabit Gider Takibi</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aylık Sabit Gider</span>
                  <span className="font-medium">{formatAmount(hub.fixedExpenses.monthlyFixed)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aylık Taksitler</span>
                  <span className="font-medium">{formatAmount(hub.fixedExpenses.monthlyInstallments)}</span>
                </div>
                <hr />
                <div className="flex justify-between font-medium">
                  <span>Toplam Aylık</span>
                  <span className="text-red-600">{formatAmount(hub.fixedExpenses.totalMonthly)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Yıllık Projeksiyon</span>
                  <span>{formatAmount(hub.fixedExpenses.yearlyProjected)}</span>
                </div>
                
                {hub.fixedExpenses.installmentDetails.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Aktif Taksitler:</p>
                    {hub.fixedExpenses.installmentDetails.map((item, i) => (
                      <div key={i} className="bg-muted/50 rounded p-2 text-xs">
                        <div className="flex justify-between">
                          <span className="font-medium">{item.definition.expense_name}</span>
                          <span>{formatAmount(item.monthlyAmount)}/ay</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground mt-1">
                          <span>Kalan: {item.remainingMonths} ay</span>
                          <span>{formatAmount(item.remainingTotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <BottomTabBar />
    </div>
  );
}
