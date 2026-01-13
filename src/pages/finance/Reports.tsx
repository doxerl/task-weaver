import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, FileDown, BarChart3, PieChart, FileText, Users, Loader2, Receipt } from 'lucide-react';
import { useFinancialCalculations } from '@/hooks/finance/useFinancialCalculations';
import { useIncomeAnalysis } from '@/hooks/finance/useIncomeAnalysis';
import { useExpenseAnalysis } from '@/hooks/finance/useExpenseAnalysis';
import { useIncomeStatement } from '@/hooks/finance/useIncomeStatement';
import { useVatCalculations } from '@/hooks/finance/useVatCalculations';
import { usePdfExport } from '@/hooks/finance/usePdfExport';
import { MonthlyTrendChart } from '@/components/finance/charts/MonthlyTrendChart';
import { ServiceRevenueChart } from '@/components/finance/charts/ServiceRevenueChart';
import { ExpenseCategoryChart } from '@/components/finance/charts/ExpenseCategoryChart';
import { IncomeStatementTable } from '@/components/finance/tables/IncomeStatementTable';
import { BottomTabBar } from '@/components/BottomTabBar';
import { ReportPeriod, FullReportData, MonthlyDataPoint, MONTH_NAMES_SHORT_TR } from '@/types/reports';
import { toast } from 'sonner';

const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);

export default function Reports() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState<ReportPeriod>('yearly');
  
  const calc = useFinancialCalculations(year);
  const incomeAnalysis = useIncomeAnalysis(year);
  const expenseAnalysis = useExpenseAnalysis(year);
  const incomeStatement = useIncomeStatement(year);
  const vatCalc = useVatCalculations(year);
  const { generatePdf, isGenerating } = usePdfExport();

  // Combine monthly data
  const monthlyData = useMemo((): MonthlyDataPoint[] => {
    const months = Object.entries(calc.byMonth || {});
    let cumulative = 0;
    return months.map(([m, data]) => {
      const net = data.income - data.expense;
      cumulative += net;
      return {
        month: parseInt(m),
        monthName: MONTH_NAMES_SHORT_TR[parseInt(m) - 1],
        income: data.income,
        expense: data.expense,
        net,
        cumulativeProfit: cumulative,
      };
    });
  }, [calc.byMonth]);

  const handleExportPdf = async () => {
    const reportData: FullReportData = {
      year,
      period,
      generatedAt: new Date().toISOString(),
      kpis: {
        totalIncome: { value: calc.totalIncome, trend: 'neutral' },
        totalExpenses: { value: calc.totalExpenses, trend: 'neutral' },
        netProfit: { value: calc.operatingProfit, trend: calc.operatingProfit >= 0 ? 'up' : 'down' },
        profitMargin: { value: calc.profitMargin, trend: 'neutral' },
      },
      monthlyData,
      serviceRevenue: incomeAnalysis.serviceRevenue,
      expenseCategories: expenseAnalysis.expenseCategories,
      incomeStatement: incomeStatement.statement,
      partnerAccount: {
        transactions: [],
        totalDebit: calc.partnerOut,
        totalCredit: calc.partnerIn,
        balance: calc.netPartnerBalance,
      },
      financing: {
        creditUsed: calc.financingIn,
        creditPaid: calc.financingOut,
        leasingPaid: 0,
        interestPaid: 0,
        remainingDebt: 0,
      },
    };

    try {
      await generatePdf(reportData);
      toast.success('PDF başarıyla oluşturuldu');
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
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleExportPdf} disabled={isGenerating} size="sm" className="gap-1">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            PDF
          </Button>
        </div>

        {/* KPI Cards - Row 1: Income/Expense */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-green-50 dark:bg-green-950/30">
            <CardContent className="p-3">
              <TrendingUp className="h-4 w-4 text-green-600 mb-1" />
              <p className="text-xs text-muted-foreground">Net Gelir (KDV Hariç)</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(calc.netRevenue)}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/30">
            <CardContent className="p-3">
              <TrendingDown className="h-4 w-4 text-red-600 mb-1" />
              <p className="text-xs text-muted-foreground">Net Gider (KDV Hariç)</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(calc.netCost + calc.receiptTotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <Wallet className="h-4 w-4 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Net Kâr</p>
              <p className={`text-lg font-bold ${calc.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(calc.operatingProfit)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <BarChart3 className="h-4 w-4 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Kâr Marjı</p>
              <p className="text-lg font-bold">{calc.profitMargin.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards - Row 2: VAT Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="p-3">
              <Receipt className="h-4 w-4 text-blue-600 mb-1" />
              <p className="text-xs text-muted-foreground">Hesaplanan KDV</p>
              <p className="text-base font-bold text-blue-600">{formatCurrency(vatCalc.totalCalculatedVat)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Fatura: {formatCurrency(vatCalc.receiptCalculatedVat)} | Banka: {formatCurrency(vatCalc.bankCalculatedVat)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 dark:bg-orange-950/30">
            <CardContent className="p-3">
              <Receipt className="h-4 w-4 text-orange-600 mb-1" />
              <p className="text-xs text-muted-foreground">İndirilecek KDV</p>
              <p className="text-base font-bold text-orange-600">{formatCurrency(vatCalc.totalDeductibleVat)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Fatura: {formatCurrency(vatCalc.receiptDeductibleVat)} | Banka: {formatCurrency(vatCalc.bankDeductibleVat)}
              </p>
            </CardContent>
          </Card>
          <Card className={vatCalc.netVatPayable >= 0 ? 'bg-purple-50 dark:bg-purple-950/30' : 'bg-green-50 dark:bg-green-950/30'}>
            <CardContent className="p-3">
              <Wallet className="h-4 w-4 text-purple-600 mb-1" />
              <p className="text-xs text-muted-foreground">Net KDV</p>
              <p className={`text-base font-bold ${vatCalc.netVatPayable >= 0 ? 'text-purple-600' : 'text-green-600'}`}>
                {vatCalc.netVatPayable >= 0 ? 'Ödenecek' : 'Devreden'}: {formatCurrency(Math.abs(vatCalc.netVatPayable))}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="dashboard" className="text-xs py-2"><BarChart3 className="h-3 w-3 mr-1 hidden sm:inline" />Özet</TabsTrigger>
            <TabsTrigger value="income" className="text-xs py-2"><TrendingUp className="h-3 w-3 mr-1 hidden sm:inline" />Gelir</TabsTrigger>
            <TabsTrigger value="expense" className="text-xs py-2"><TrendingDown className="h-3 w-3 mr-1 hidden sm:inline" />Gider</TabsTrigger>
            <TabsTrigger value="statement" className="text-xs py-2"><FileText className="h-3 w-3 mr-1 hidden sm:inline" />Tablo</TabsTrigger>
            <TabsTrigger value="partner" className="text-xs py-2"><Users className="h-3 w-3 mr-1 hidden sm:inline" />Ortak</TabsTrigger>
          </TabsList>

          {/* Tab 1: Dashboard */}
          <TabsContent value="dashboard" className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Aylık Gelir vs Gider</CardTitle></CardHeader>
              <CardContent><MonthlyTrendChart data={monthlyData} /></CardContent>
            </Card>
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Hizmet Bazlı Gelir</CardTitle></CardHeader>
                <CardContent><ServiceRevenueChart data={incomeAnalysis.serviceRevenue} /></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Gider Kategorileri</CardTitle></CardHeader>
                <CardContent><ExpenseCategoryChart data={expenseAnalysis.topCategories} /></CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 2: Income */}
          <TabsContent value="income" className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Hizmet Bazlı Gelir Dağılımı</CardTitle></CardHeader>
              <CardContent><ServiceRevenueChart data={incomeAnalysis.serviceRevenue} /></CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Expense */}
          <TabsContent value="expense" className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Gider Kategorileri</CardTitle></CardHeader>
              <CardContent><ExpenseCategoryChart data={expenseAnalysis.topCategories} /></CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Sabit Gider</p>
                  <p className="text-lg font-bold">{formatCurrency(expenseAnalysis.fixedExpense)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Değişken Gider</p>
                  <p className="text-lg font-bold">{formatCurrency(expenseAnalysis.variableExpense)}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 4: Income Statement */}
          <TabsContent value="statement">
            <IncomeStatementTable lines={incomeStatement.lines} year={year} />
          </TabsContent>

          {/* Tab 5: Partner */}
          <TabsContent value="partner" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Ortak Cari</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ortaktan Tahsilat</span>
                    <span className="text-green-600">+{formatCurrency(calc.partnerIn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ortağa Ödeme</span>
                    <span className="text-red-600">-{formatCurrency(calc.partnerOut)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-medium">
                    <span>Net Bakiye</span>
                    <span className={calc.netPartnerBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(calc.netPartnerBalance)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">Finansman Durumu</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kredi Kullanımı</span>
                    <span className="text-green-600">+{formatCurrency(calc.financingIn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kredi Ödemesi</span>
                    <span className="text-red-600">-{formatCurrency(calc.financingOut)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <BottomTabBar />
    </div>
  );
}
