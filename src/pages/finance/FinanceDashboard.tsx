import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Wallet, FileSpreadsheet, Camera, FileText, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useFinancialCalculations } from '@/hooks/finance/useFinancialCalculations';
import { BottomTabBar } from '@/components/BottomTabBar';

const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);

export default function FinanceDashboard() {
  const [year, setYear] = useState(new Date().getFullYear());
  const calc = useFinancialCalculations(year);

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
        <div className="grid grid-cols-3 gap-3">
          <Link to="/finance/bank-import">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium text-center">Banka</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/finance/receipts/upload">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <Camera className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium text-center">Fiş</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/finance/reports">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
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
            </CardContent>
          </Card>
        </div>

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
