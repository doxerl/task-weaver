import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Receipt, TrendingUp, TrendingDown, AlertTriangle, FileDown, Calculator, Building2, CreditCard, Loader2 } from 'lucide-react';
import { useVatCalculations } from '@/hooks/finance/useVatCalculations';
import { useVatReportPdf } from '@/hooks/finance/useVatReportPdf';
import { BottomTabBar } from '@/components/BottomTabBar';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/contexts/CurrencyContext';
import { toast } from 'sonner';

const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export default function VatReport() {
  const [year, setYear] = useState(new Date().getFullYear());
  const vat = useVatCalculations(year);
  const { currency, formatAmount, yearlyAverageRate } = useCurrency();
  const { generatePdf, isGenerating } = useVatReportPdf();

  const fmt = (value: number) => formatAmount(value, undefined, year);

  const handleExportPdf = async () => {
    try {
      await generatePdf(vat, year, {
        currency,
        formatAmount: fmt,
        yearlyAverageRate,
      });
      toast.success(`KDV Raporu PDF oluşturuldu (${currency})`);
    } catch {
      toast.error('PDF oluşturulamadı');
    }
  };

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
          <div className="flex items-center gap-2">
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleExportPdf} disabled={isGenerating || vat.isLoading} size="sm" className="gap-1">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              PDF
            </Button>
          </div>
        </div>

        {/* KDV Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-xs">Hesaplanan KDV</span>
              </div>
              <p className="text-lg font-bold text-purple-600">{fmt(vat.totalCalculatedVat)}</p>
              <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                <span>{vat.issuedCount} fatura</span>
                <span>•</span>
                <span>{vat.bankIncomeCount} banka</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingDown className="h-4 w-4 text-green-600" />
                <span className="text-xs">İndirilecek KDV</span>
              </div>
              <p className="text-lg font-bold text-green-600">{fmt(vat.totalDeductibleVat)}</p>
              <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                <span>{vat.receivedCount} fatura</span>
                <span>•</span>
                <span>{vat.bankExpenseCount} banka</span>
              </div>
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
              {fmt(Math.abs(vat.netVatPayable))}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Hesaplanan ({fmt(vat.totalCalculatedVat)}) - İndirilecek ({fmt(vat.totalDeductibleVat)})
            </p>
          </CardContent>
        </Card>

        {/* Source Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kaynak Bazlı KDV Dağılımı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Receipts/Invoices */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Faturalar</span>
                  <Badge variant="secondary" className="text-xs">
                    {vat.bySource.receipts.count} belge
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Hesaplanan:</span>
                  <span className="ml-2 font-medium text-purple-600">
                    {fmt(vat.receiptCalculatedVat)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">İndirilecek:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {fmt(vat.receiptDeductibleVat)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Bank Transactions */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Banka İşlemleri</span>
                  <Badge variant="secondary" className="text-xs">
                    {vat.bySource.bank.count} işlem
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Hesaplanan:</span>
                  <span className="ml-2 font-medium text-purple-600">
                    {fmt(vat.bankCalculatedVat)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">İndirilecek:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {fmt(vat.bankDeductibleVat)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                * Banka işlemleri is_commercial=true filtresiyle, KDV oranına göre hesaplanmıştır
              </p>
            </div>
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
              <CreditCard className="h-4 w-4" />
              Aylık KDV Detayı
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="combined" className="w-full">
              <div className="px-4 pt-2">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="combined" className="text-xs">Toplam</TabsTrigger>
                  <TabsTrigger value="receipts" className="text-xs">Faturalar</TabsTrigger>
                  <TabsTrigger value="bank" className="text-xs">Banka</TabsTrigger>
                </TabsList>
              </div>
              
              {/* Combined View */}
              <TabsContent value="combined" className="m-0">
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
                              {fmt(data.calculatedVat)}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {fmt(data.deductibleVat)}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${data.netVat >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                              {fmt(data.netVat)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Total Row */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>TOPLAM</TableCell>
                        <TableCell className="text-right text-purple-600">
                          {fmt(vat.totalCalculatedVat)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {fmt(vat.totalDeductibleVat)}
                        </TableCell>
                        <TableCell className={`text-right ${vat.netVatPayable >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                          {fmt(vat.netVatPayable)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              {/* Receipts Only View */}
              <TabsContent value="receipts" className="m-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Ay</TableHead>
                        <TableHead className="text-right">Kesilen</TableHead>
                        <TableHead className="text-right">Alınan</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {months.map((month, idx) => {
                        const data = vat.byMonth[idx + 1];
                        const receiptCalc = (data?.calculatedVat || 0) - (data?.bankCalculatedVat || 0);
                        const receiptDed = (data?.deductibleVat || 0) - (data?.bankDeductibleVat || 0);
                        if (!data || (receiptCalc === 0 && receiptDed === 0)) return null;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {month}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({data.issuedCount + data.receivedCount})
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-purple-600">
                              {fmt(receiptCalc)}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {fmt(receiptDed)}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${receiptCalc - receiptDed >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                              {fmt(receiptCalc - receiptDed)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>TOPLAM</TableCell>
                        <TableCell className="text-right text-purple-600">
                          {fmt(vat.receiptCalculatedVat)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {fmt(vat.receiptDeductibleVat)}
                        </TableCell>
                        <TableCell className={`text-right ${vat.receiptCalculatedVat - vat.receiptDeductibleVat >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                          {fmt(vat.receiptCalculatedVat - vat.receiptDeductibleVat)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              {/* Bank Only View */}
              <TabsContent value="bank" className="m-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Ay</TableHead>
                        <TableHead className="text-right">Gelirden</TableHead>
                        <TableHead className="text-right">Giderden</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {months.map((month, idx) => {
                        const data = vat.byMonth[idx + 1];
                        if (!data || (data.bankCalculatedVat === 0 && data.bankDeductibleVat === 0)) return null;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {month}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({data.bankIncomeCount + data.bankExpenseCount})
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-purple-600">
                              {fmt(data.bankCalculatedVat)}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {fmt(data.bankDeductibleVat)}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${data.bankCalculatedVat - data.bankDeductibleVat >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                              {fmt(data.bankCalculatedVat - data.bankDeductibleVat)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>TOPLAM</TableCell>
                        <TableCell className="text-right text-purple-600">
                          {fmt(vat.bankCalculatedVat)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {fmt(vat.bankDeductibleVat)}
                        </TableCell>
                        <TableCell className={`text-right ${vat.bankCalculatedVat - vat.bankDeductibleVat >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                          {fmt(vat.bankCalculatedVat - vat.bankDeductibleVat)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* VAT Rate Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fatura KDV Oran Dağılımı</CardTitle>
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
                    <div className="text-purple-600">Hes: {fmt(data.calculatedVat)}</div>
                    <div className="text-green-600">İnd: {fmt(data.deductibleVat)}</div>
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
                  <div className="text-purple-600">Hes: {fmt(vat.byVatRate[0].calculatedVat)}</div>
                  <div className="text-green-600">İnd: {fmt(vat.byVatRate[0].deductibleVat)}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
      <BottomTabBar />
    </div>
  );
}
