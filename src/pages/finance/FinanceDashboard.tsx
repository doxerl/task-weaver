import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useYear } from '@/contexts/YearContext';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Wallet, FileSpreadsheet, Camera, FileText, AlertTriangle, ArrowLeft, PenLine, Building2, Receipt, Scale, Truck, BarChart3, Shield, Loader2 } from 'lucide-react';
import { useFinancialCalculations } from '@/hooks/finance/useFinancialCalculations';
import { useVatCalculations } from '@/hooks/finance/useVatCalculations';
import { useBalanceSheet } from '@/hooks/finance/useBalanceSheet';
import { useCostCenterAnalysis } from '@/hooks/finance/useCostCenterAnalysis';
import { useIncomeStatement } from '@/hooks/finance/useIncomeStatement';
import { BottomTabBar } from '@/components/BottomTabBar';
import { AppHeader } from '@/components/AppHeader';

export default function FinanceDashboard() {
  const { t } = useTranslation(['finance', 'common']);
  const { selectedYear: year, setSelectedYear: setYear } = useYear();
  
  // All hooks must be called in the same order every render
  const calc = useFinancialCalculations(year);
  const vat = useVatCalculations(year);
  const { balanceSheet, isLoading: balanceLoading } = useBalanceSheet(year);
  const costCenter = useCostCenterAnalysis(year);
  const incomeStatement = useIncomeStatement(year);

  // Loading guard - show loading state while any critical hook is loading
  const isAnyLoading = calc.isLoading || vat.isLoading || balanceLoading || 
                       costCenter.isLoading || incomeStatement.isLoading;

  if (isAnyLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
  const formatCompact = (n: number) => new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader
        title={t('dashboard.title')}
        icon={<Wallet className="h-5 w-5 text-primary" />}
        badge={incomeStatement.isOfficial && (
          <Badge variant="default" className="bg-green-600">
            <Shield className="h-3 w-3 mr-1" />
            {t('dashboard.officialData')}
          </Badge>
        )}
        rightContent={
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      <div className="p-4 space-y-6">

        {/* Quick Actions */}
        <div className="grid grid-cols-6 gap-2">
          <Link to="/finance/bank-import">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-center">{t('dashboard.tabs.bank')}</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/finance/receipts/upload">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <Camera className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-center">{t('dashboard.tabs.receipt')}</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/finance/manual-entry">
            <Card className="hover:bg-accent transition-colors cursor-pointer border-primary/50">
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <PenLine className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-center">{t('dashboard.tabs.manual')}</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/finance/official-data">
            <Card className="hover:bg-accent transition-colors cursor-pointer border-green-500/50">
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <Shield className="h-5 w-5 text-green-600" />
                <span className="text-xs font-medium text-center">{t('dashboard.tabs.official')}</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/finance/vat-report">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <Receipt className="h-5 w-5 text-purple-500" />
                <span className="text-xs font-medium text-center">{t('dashboard.tabs.vat')}</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/finance/reports">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-center">{t('dashboard.tabs.report')}</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Revenue & VAT Summary - Net vs Gross */}
        <Card className="border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">{t('dashboard.revenueSummary')}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t('dashboard.grossRevenue')}</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(calc.totalIncome)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('dashboard.netRevenue')}</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(calc.netRevenue)}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t('dashboard.grossExpense')}</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(calc.totalExpenses)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('dashboard.netExpense')}</p>
                <p className="text-lg font-bold text-red-700">{formatCurrency(calc.netCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">{t('dashboard.netProfit')}</span>
              </div>
              <p className={`text-lg font-bold ${calc.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(calc.operatingProfit)}
              </p>
              <p className="text-xs text-muted-foreground">{t('dashboard.margin')}: {calc.profitMargin.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wallet className="h-4 w-4" />
                <span className="text-xs">{t('dashboard.partnerBalance')}</span>
              </div>
              <p className={`text-lg font-bold ${calc.netPartnerBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(calc.netPartnerBalance)}
              </p>
              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                <p>{t('dashboard.given')}: {formatCurrency(calc.partnerOut)}</p>
                <p>{t('dashboard.received')}: {formatCurrency(calc.partnerIn)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* VAT Summary Card - Enhanced */}
        {!vat.isLoading && (
          <Link to="/finance/vat-report">
            <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/50 dark:hover:bg-purple-950/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  <Receipt className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">{t('dashboard.vatSummary')}</span>
                  <ArrowLeft className="h-4 w-4 rotate-180 ml-auto" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('vat.calculated')}</p>
                    <p className="text-sm font-bold text-red-600">{formatCurrency(vat.totalCalculatedVat)}</p>
                    <p className="text-[10px] text-muted-foreground">{vat.issuedCount + vat.bankIncomeCount} {t('common:items')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('vat.deductible')}</p>
                    <p className="text-sm font-bold text-blue-600">{formatCurrency(vat.totalDeductibleVat)}</p>
                    <p className="text-[10px] text-muted-foreground">{vat.receivedCount + vat.bankExpenseCount} {t('common:items')}</p>
                  </div>
                  <div className="border-l border-purple-200 dark:border-purple-800 pl-3">
                    <p className="text-xs text-muted-foreground">{t('common:net')} {vat.netVatPayable >= 0 ? t('vat.debt') : t('vat.credit')}</p>
                    <p className={`text-sm font-bold ${vat.netVatPayable >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(Math.abs(vat.netVatPayable))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* KKEG Summary Card */}
        {costCenter.kkeg.totalKkeg > 0 && (
          <Link to="/finance/cost-center">
            <Card className="border-destructive/50 bg-destructive/5 hover:bg-destructive/10 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">{t('dashboard.kkegWarning')}</span>
                  <ArrowLeft className="h-4 w-4 rotate-180 ml-auto" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-destructive">{formatCurrency(costCenter.kkeg.totalKkeg)}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.nonDeductible')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatCurrency(costCenter.kkeg.totalKkeg * 0.25)}</p>
                    <p className="text-xs text-muted-foreground">{t('dashboard.estimatedTax')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Cost Center Summary Card */}
        <Link to="/finance/cost-center">
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10 hover:bg-blue-100/50 dark:hover:bg-blue-950/20 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">{t('dashboard.costCenter')}</span>
                <ArrowLeft className="h-4 w-4 rotate-180 ml-auto" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Truck className="h-3 w-3 text-blue-600" />
                    <p className="text-xs text-muted-foreground">{t('dashboard.delivery')}</p>
                  </div>
                  <p className="text-sm font-bold">{formatCompact(costCenter.costCenters.find(c => c.costCenter === 'DELIVERY')?.totalAmount || 0)}</p>
                  <p className="text-[10px] text-muted-foreground">{costCenter.deliveryRatio.toFixed(0)}%</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <Building2 className="h-3 w-3 text-purple-600" />
                    <p className="text-xs text-muted-foreground">{t('dashboard.admin')}</p>
                  </div>
                  <p className="text-sm font-bold">{formatCompact(costCenter.costCenters.find(c => c.costCenter === 'ADMIN')?.totalAmount || 0)}</p>
                  <p className="text-[10px] text-muted-foreground">{costCenter.adminRatio.toFixed(0)}%</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <TrendingUp className="h-3 w-3 text-orange-600" />
                    <p className="text-xs text-muted-foreground">{t('dashboard.sales')}</p>
                  </div>
                  <p className="text-sm font-bold">{formatCompact(costCenter.costCenters.find(c => c.costCenter === 'SALES')?.totalAmount || 0)}</p>
                  <p className="text-[10px] text-muted-foreground">{costCenter.salesRatio.toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Financing Info - Shown separately */}
        {calc.financingIn > 0 && (
          <Card className="border-dashed border-blue-300 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">{t('dashboard.financing')}: {formatCurrency(calc.financingIn)}</p>
                  <p className="text-xs text-muted-foreground italic">* {t('dashboard.notIncluded')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Balance Sheet Summary */}
        {!balanceLoading && balanceSheet && (
          <Link to="/finance/balance-sheet">
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-950/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Scale className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t('balanceSheet.summary')}</p>
                      <div className="flex gap-4 mt-1">
                        <div>
                          <p className="text-xs text-muted-foreground">{t('balanceSheet.assets')}</p>
                          <p className="text-sm font-semibold text-green-600">{formatCompact(balanceSheet.totalAssets)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('balanceSheet.liabilities')}</p>
                          <p className="text-sm font-semibold text-red-600">{formatCompact(balanceSheet.totalLiabilities)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('balanceSheet.equity')}</p>
                          <p className={`text-sm font-semibold ${balanceSheet.equity.total >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatCompact(balanceSheet.equity.total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Warning */}
        {calc.uncategorizedCount > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <Link to="/finance/bank-transactions" className="underline">
                {t('transactions.uncategorizedCount', { count: calc.uncategorizedCount })}
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Links */}
        <div className="space-y-2">
          <Link to="/finance/simulation">
            <Card className="hover:bg-accent transition-colors border-primary/30 bg-primary/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="font-medium">{t('simulation.title')}</span>
                </div>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/finance/bank-transactions">
            <Card className="hover:bg-accent transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <span>{t('transactions.title')}</span>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/finance/receipts">
            <Card className="hover:bg-accent transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <span>{t('receipts.title')}</span>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
      <BottomTabBar />
    </div>
  );
}
