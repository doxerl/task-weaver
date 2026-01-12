import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Receipt, TrendingUp, TrendingDown, AlertTriangle, FileDown, Calculator } from 'lucide-react';
import { useVatCalculations } from '@/hooks/finance/useVatCalculations';
import { BottomTabBar } from '@/components/BottomTabBar';
import { Skeleton } from '@/components/ui/skeleton';

const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);

const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export default function VatReport() {
  const [year, setYear] = useState(new Date().getFullYear());
  const vat = useVatCalculations(year);

  if (vat.isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
        <BottomTabBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/finance/reports">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">KDV Raporu</h1>
          </div>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* KDV Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-xs">Hesaplanan KDV</span>
              </div>
              <p className="text-lg font-bold text-purple-600">{formatCurrency(vat.totalCalculatedVat)}</p>
              <p className="text-xs text-muted-foreground mt-1">{vat.issuedCount} kesilen fatura</p>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingDown className="h-4 w-4 text-green-600" />
                <span className="text-xs">İndirilecek KDV</span>
              </div>
              <p className="text-lg font-bold text-green-600">{formatCurrency(vat.totalDeductibleVat)}</p>
              <p className="text-xs text-muted-foreground mt-1">{vat.receivedCount} alınan fiş/fatura</p>
            </CardContent>
          </Card>
        </div>

        {/* Net VAT Card */}
        <Card className={`${vat.netVatPayable >= 0 ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'}`}>
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
              <Calculator className="h-5 w-5" />
              <span className="text-sm font-medium">
                {vat.netVatPayable >= 0 ? 'Net KDV Borcu' : 'Net KDV Alacağı'}
              </span>
            </div>
            <p className={`text-3xl font-bold ${vat.netVatPayable >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
              {formatCurrency(Math.abs(vat.netVatPayable))}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Hesaplanan ({formatCurrency(vat.totalCalculatedVat)}) - İndirilecek ({formatCurrency(vat.totalDeductibleVat)})
            </p>
          </CardContent>
        </Card>

        {/* Missing VAT Warning */}
        {vat.missingVatCount > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <Link to="/finance/receipts" className="underline">
                {vat.missingVatCount} belgede KDV bilgisi eksik
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Monthly Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Aylık KDV Detayı
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Ay</TableHead>
                    <TableHead className="text-right">Hesaplanan</TableHead>
                    <TableHead className="text-right">İndirilecek</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {months.map((month, idx) => {
                    const data = vat.byMonth[idx + 1];
                    if (!data || (data.calculatedVat === 0 && data.deductibleVat === 0)) return null;
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{month}</TableCell>
                        <TableCell className="text-right text-purple-600">
                          {formatCurrency(data.calculatedVat)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(data.deductibleVat)}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${data.netVat >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                          {formatCurrency(data.netVat)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Total Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>TOPLAM</TableCell>
                    <TableCell className="text-right text-purple-600">
                      {formatCurrency(vat.totalCalculatedVat)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(vat.totalDeductibleVat)}
                    </TableCell>
                    <TableCell className={`text-right ${vat.netVatPayable >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      {formatCurrency(vat.netVatPayable)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* VAT Rate Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">KDV Oran Dağılımı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[20, 10, 1].map(rate => {
              const data = vat.byVatRate[rate];
              if (!data || (data.calculatedVat === 0 && data.deductibleVat === 0)) return null;
              return (
                <div key={rate} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold bg-primary/10 text-primary px-2 py-1 rounded">
                      %{rate}
                    </span>
                    <div className="text-xs text-muted-foreground">
                      {data.issuedCount + data.receivedCount} belge
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-purple-600">Hes: {formatCurrency(data.calculatedVat)}</div>
                    <div className="text-green-600">İnd: {formatCurrency(data.deductibleVat)}</div>
                  </div>
                </div>
              );
            })}
            {vat.byVatRate[0] && (vat.byVatRate[0].calculatedVat > 0 || vat.byVatRate[0].deductibleVat > 0) && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold bg-muted text-muted-foreground px-2 py-1 rounded">
                    Diğer
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {vat.byVatRate[0].issuedCount + vat.byVatRate[0].receivedCount} belge
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-purple-600">Hes: {formatCurrency(vat.byVatRate[0].calculatedVat)}</div>
                  <div className="text-green-600">İnd: {formatCurrency(vat.byVatRate[0].deductibleVat)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Download Button */}
        <Button variant="outline" className="w-full" disabled>
          <FileDown className="h-4 w-4 mr-2" />
          PDF İndir (Yakında)
        </Button>
      </div>
      <BottomTabBar />
    </div>
  );
}
