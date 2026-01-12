import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, TrendingUp, TrendingDown, Wallet, FileDown } from 'lucide-react';
import { useFinancialCalculations } from '@/hooks/finance/useFinancialCalculations';
import { BottomTabBar } from '@/components/BottomTabBar';

const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);
const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export default function Reports() {
  const [year, setYear] = useState(new Date().getFullYear());
  const calc = useFinancialCalculations(year);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Link to="/finance" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold flex-1">Finansal Rapor</h1>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-green-50 dark:bg-green-950">
            <CardContent className="p-4">
              <TrendingUp className="h-5 w-5 text-green-600 mb-2" />
              <p className="text-xs text-muted-foreground">Toplam Gelir</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(calc.totalIncome)}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950">
            <CardContent className="p-4">
              <TrendingDown className="h-5 w-5 text-red-600 mb-2" />
              <p className="text-xs text-muted-foreground">Toplam Gider</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(calc.totalExpenses)}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">İşletme Kârı</span>
              <span className={`text-lg font-bold ${calc.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(calc.operatingProfit)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Kâr Marjı</span>
              <span className="font-medium">{calc.profitMargin.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-4 w-4" />
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

        {/* Monthly Table */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Aylık Özet</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Ay</th>
                    <th className="text-right py-2">Gelir</th>
                    <th className="text-right py-2">Gider</th>
                    <th className="text-right py-2">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(calc.byMonth).map(([month, data]) => {
                    const net = data.income - data.expense;
                    return (
                      <tr key={month} className="border-b last:border-0">
                        <td className="py-2">{months[parseInt(month) - 1]}</td>
                        <td className="text-right text-green-600">{formatCurrency(data.income)}</td>
                        <td className="text-right text-red-600">{formatCurrency(data.expense)}</td>
                        <td className={`text-right font-medium ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <button className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-medium">
          <FileDown className="h-5 w-5" />
          PDF İndir
        </button>
      </div>
      <BottomTabBar />
    </div>
  );
}
