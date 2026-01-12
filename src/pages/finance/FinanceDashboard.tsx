import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Wallet, FileSpreadsheet, Camera, FileText, AlertTriangle, ArrowLeft, PenLine, Building2, Receipt, Scale, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useFinancialCalculations } from '@/hooks/finance/useFinancialCalculations';
import { useVatCalculations } from '@/hooks/finance/useVatCalculations';
import { useBalanceSheet } from '@/hooks/finance/useBalanceSheet';
import { BottomTabBar } from '@/components/BottomTabBar';

const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
const formatCompact = (n: number) => new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

const ChangeIndicator = ({ current, previous, inverse = false }: { current: number; previous: number; inverse?: boolean }) => {
  if (previous === 0) return null;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const isPositive = inverse ? change < 0 : change > 0;
  
  return (
    <span className={`inline-flex items-center text-[10px] ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {change > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(change).toFixed(0)}%
    </span>
  );
};

export default function FinanceDashboard() {
  const [year, setYear] = useState(new Date().getFullYear());
  const calc = useFinancialCalculations(year);
  const vat = useVatCalculations(year);
  const { balanceSheet, isLoading: balanceLoading } = useBalanceSheet(year);
  const { balanceSheet: prevBalanceSheet } = useBalanceSheet(year - 1);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Finans</h1>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-5 gap-2">
          <Link to="/finance/bank-import">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-center">Banka</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/finance/receipts/upload">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <Camera className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-center">Fiş</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/finance/manual-entry">
            <Card className="hover:bg-accent transition-colors cursor-pointer border-primary/50">
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <PenLine className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-center">Manuel</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/finance/vat-report">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <Receipt className="h-5 w-5 text-purple-500" />
                <span className="text-xs font-medium text-center">KDV</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/finance/reports">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardContent className="p-3 flex flex-col items-center gap-1">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-center">Rapor</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Gelir</span>
              </div>
              <p className="text-lg font-bold text-green-600">{formatCurrency(calc.totalIncome)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs">Gider</span>
              </div>
              <p className="text-lg font-bold text-red-600">{formatCurrency(calc.totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">Kâr</span>
              </div>
              <p className={`text-lg font-bold ${calc.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(calc.operatingProfit)}
              </p>
              <p className="text-xs text-muted-foreground">{calc.profitMargin.toFixed(1)}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Wallet className="h-4 w-4" />
                <span className="text-xs">Ortak Cari</span>
              </div>
              <p className={`text-lg font-bold ${calc.netPartnerBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(calc.netPartnerBalance)}
              </p>
              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                <p>Verilen: {formatCurrency(calc.partnerOut)}</p>
                <p>Alınan: {formatCurrency(calc.partnerIn)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* VAT Summary Card */}
        {!vat.isLoading && (vat.totalCalculatedVat > 0 || vat.totalDeductibleVat > 0) && (
          <Link to="/finance/vat-report">
            <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 hover:bg-purple-100/50 dark:hover:bg-purple-950/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium">Net KDV {vat.netVatPayable >= 0 ? 'Borcu' : 'Alacağı'}</p>
                      <p className={`text-lg font-bold ${vat.netVatPayable >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {formatCurrency(Math.abs(vat.netVatPayable))}
                      </p>
                    </div>
                  </div>
                  <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Financing Info - Shown separately */}
        {calc.financingIn > 0 && (
          <Card className="border-dashed border-blue-300 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Finansman: {formatCurrency(calc.financingIn)}</p>
                  <p className="text-xs text-muted-foreground italic">* Toplama dahil değildir</p>
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
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Bilanço Özeti</p>
                        {prevBalanceSheet && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            vs {year - 1}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 mt-1">
                        <div>
                          <p className="text-xs text-muted-foreground">Varlıklar</p>
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-semibold text-green-600">{formatCompact(balanceSheet.totalAssets)}</p>
                            {prevBalanceSheet && (
                              <ChangeIndicator current={balanceSheet.totalAssets} previous={prevBalanceSheet.totalAssets} />
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Borçlar</p>
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-semibold text-red-600">{formatCompact(balanceSheet.totalLiabilities)}</p>
                            {prevBalanceSheet && (
                              <ChangeIndicator current={balanceSheet.totalLiabilities} previous={prevBalanceSheet.totalLiabilities} inverse />
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Özkaynak</p>
                          <div className="flex items-center gap-1">
                            <p className={`text-sm font-semibold ${balanceSheet.equity.total >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {formatCompact(balanceSheet.equity.total)}
                            </p>
                            {prevBalanceSheet && (
                              <ChangeIndicator current={balanceSheet.equity.total} previous={prevBalanceSheet.equity.total} />
                            )}
                          </div>
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
                {calc.uncategorizedCount} kategorisiz işlem var
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Links */}
        <div className="space-y-2">
          <Link to="/finance/bank-transactions">
            <Card className="hover:bg-accent transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <span>Banka İşlemleri</span>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/finance/receipts">
            <Card className="hover:bg-accent transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <span>Fiş/Faturalar</span>
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </CardContent>
            </Card>
          </Link>
          <Link to="/finance/categories">
            <Card className="hover:bg-accent transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <span>Kategoriler</span>
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
