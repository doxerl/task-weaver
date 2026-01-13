import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ArrowLeft, FileDown, Settings, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useBalanceSheet } from '@/hooks/finance/useBalanceSheet';
import { useFinancialSettings } from '@/hooks/finance/useFinancialSettings';
import { BottomTabBar } from '@/components/BottomTabBar';
import { cn } from '@/lib/utils';

const formatCurrency = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);

export default function BalanceSheet() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const { balanceSheet, isLoading } = useBalanceSheet(year);
  const { settings, upsertSettings } = useFinancialSettings();
  
  const [formData, setFormData] = useState({
    paid_capital: settings.paid_capital,
    retained_earnings: settings.retained_earnings,
    cash_on_hand: settings.cash_on_hand,
    inventory_value: settings.inventory_value,
    equipment_value: settings.equipment_value,
    vehicles_value: settings.vehicles_value,
    accumulated_depreciation: settings.accumulated_depreciation,
    bank_loans: settings.bank_loans,
    trade_receivables: settings.trade_receivables,
    trade_payables: settings.trade_payables,
  });

  const handleSaveSettings = () => {
    upsertSettings.mutate(formData);
    setSettingsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { currentAssets, fixedAssets, totalAssets, shortTermLiabilities, longTermLiabilities, equity, totalLiabilities, isBalanced, difference } = balanceSheet;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/finance" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold flex-1">Bilanço</h1>
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Bilanço Ayarları</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Ödenmiş Sermaye (₺)</Label>
                  <Input 
                    type="number" 
                    value={formData.paid_capital}
                    onChange={e => setFormData(p => ({ ...p, paid_capital: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Geçmiş Yıllar Kârları (₺)</Label>
                  <Input 
                    type="number" 
                    value={formData.retained_earnings}
                    onChange={e => setFormData(p => ({ ...p, retained_earnings: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kasa (₺)</Label>
                  <Input 
                    type="number" 
                    value={formData.cash_on_hand}
                    onChange={e => setFormData(p => ({ ...p, cash_on_hand: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stoklar (₺)</Label>
                  <Input 
                    type="number" 
                    value={formData.inventory_value}
                    onChange={e => setFormData(p => ({ ...p, inventory_value: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Demirbaşlar (₺)</Label>
                  <Input 
                    type="number" 
                    value={formData.equipment_value}
                    onChange={e => setFormData(p => ({ ...p, equipment_value: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Taşıtlar (₺)</Label>
                  <Input 
                    type="number" 
                    value={formData.vehicles_value}
                    onChange={e => setFormData(p => ({ ...p, vehicles_value: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Birikmiş Amortisman (₺)</Label>
                  <Input 
                    type="number" 
                    value={formData.accumulated_depreciation}
                    onChange={e => setFormData(p => ({ ...p, accumulated_depreciation: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Banka Kredileri (₺)</Label>
                  <Input 
                    type="number" 
                    value={formData.bank_loans}
                    onChange={e => setFormData(p => ({ ...p, bank_loans: Number(e.target.value) }))}
                  />
                </div>
                
                {/* Bilanço Kalemleri - Manuel Giriş */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground">
                    Ticari Alacak/Borç (Fatura Eşleştirmesi Yoksa)
                  </h4>
                  <div className="space-y-2">
                    <Label>Ticari Alacaklar (₺)</Label>
                    <Input 
                      type="number" 
                      value={formData.trade_receivables}
                      onChange={e => setFormData(p => ({ ...p, trade_receivables: Number(e.target.value) }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Müşterilerden tahsil edilmemiş fatura tutarları
                    </p>
                  </div>
                  <div className="space-y-2 mt-3">
                    <Label>Ticari Borçlar (₺)</Label>
                    <Input 
                      type="number" 
                      value={formData.trade_payables}
                      onChange={e => setFormData(p => ({ ...p, trade_payables: Number(e.target.value) }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Tedarikçilere ödenmemiş fatura tutarları
                    </p>
                  </div>
                </div>
                
                <Button onClick={handleSaveSettings} className="w-full mt-4">
                  Kaydet
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Date indicator */}
        <p className="text-sm text-muted-foreground text-center">
          31 Aralık {year} itibarıyla
        </p>

        {/* Balance Check */}
        <Card className={cn(
          isBalanced ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
        )}>
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
              <span className="text-sm font-medium">
                {isBalanced ? 'Aktif = Pasif (Denklik Sağlandı)' : `Denklik Farkı: ${formatCurrency(difference)}`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* ASSETS */}
        <Card>
          <CardHeader className="pb-2 bg-blue-50 dark:bg-blue-950/20">
            <CardTitle className="text-center text-blue-700 dark:text-blue-400">
              AKTİF (VARLIKLAR)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Current Assets */}
            <div>
              <h3 className="font-medium text-sm mb-2">I. DÖNEN VARLIKLAR</h3>
              <div className="space-y-1 text-sm pl-4">
                <div className="text-muted-foreground mb-1">A. Hazır Değerler</div>
                <div className="flex justify-between pl-4">
                  <span>1. Kasa</span>
                  <span>{formatCurrency(currentAssets.cash)}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span>2. Bankalar</span>
                  <span>{formatCurrency(currentAssets.banks)}</span>
                </div>
                <div className="text-muted-foreground mb-1 mt-2">B. Ticari Alacaklar</div>
                <div className="flex justify-between pl-4">
                  <span>1. Müşterilerden Alacaklar</span>
                  <span>{formatCurrency(currentAssets.receivables)}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span>2. Ortaklardan Alacaklar</span>
                  <span>{formatCurrency(currentAssets.partnerReceivables)}</span>
                </div>
                {currentAssets.vatReceivable > 0 && (
                  <div className="flex justify-between pl-4">
                    <span>3. Devreden KDV</span>
                    <span>{formatCurrency(currentAssets.vatReceivable)}</span>
                  </div>
                )}
                <div className="flex justify-between mt-2">
                  <span>C. Stoklar</span>
                  <span>{formatCurrency(currentAssets.inventory)}</span>
                </div>
              </div>
              <div className="flex justify-between font-medium border-t mt-2 pt-2">
                <span>TOPLAM DÖNEN VARLIKLAR</span>
                <span>{formatCurrency(currentAssets.total)}</span>
              </div>
            </div>

            {/* Fixed Assets */}
            <div>
              <h3 className="font-medium text-sm mb-2">II. DURAN VARLIKLAR</h3>
              <div className="space-y-1 text-sm pl-4">
                <div className="text-muted-foreground mb-1">A. Maddi Duran Varlıklar</div>
                <div className="flex justify-between pl-4">
                  <span>1. Demirbaşlar</span>
                  <span>{formatCurrency(fixedAssets.equipment)}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span>2. Taşıtlar</span>
                  <span>{formatCurrency(fixedAssets.vehicles)}</span>
                </div>
                <div className="flex justify-between pl-4 text-destructive">
                  <span>3. Birikmiş Amortismanlar (-)</span>
                  <span>-{formatCurrency(fixedAssets.depreciation)}</span>
                </div>
              </div>
              <div className="flex justify-between font-medium border-t mt-2 pt-2">
                <span>TOPLAM DURAN VARLIKLAR</span>
                <span>{formatCurrency(fixedAssets.total)}</span>
              </div>
            </div>

            {/* Total Assets */}
            <div className="flex justify-between font-bold text-lg border-t-2 pt-2 text-blue-700 dark:text-blue-400">
              <span>TOPLAM AKTİF</span>
              <span>{formatCurrency(totalAssets)}</span>
            </div>
          </CardContent>
        </Card>

        {/* LIABILITIES */}
        <Card>
          <CardHeader className="pb-2 bg-purple-50 dark:bg-purple-950/20">
            <CardTitle className="text-center text-purple-700 dark:text-purple-400">
              PASİF (KAYNAKLAR)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Short Term Liabilities */}
            <div>
              <h3 className="font-medium text-sm mb-2">I. KISA VADELİ YABANCI KAYNAKLAR</h3>
              <div className="space-y-1 text-sm pl-4">
                <div className="text-muted-foreground mb-1">A. Ticari Borçlar</div>
                <div className="flex justify-between pl-4">
                  <span>1. Satıcılara Borçlar</span>
                  <span>{formatCurrency(shortTermLiabilities.payables)}</span>
                </div>
                <div className="text-muted-foreground mb-1 mt-2">B. Ödenecek Vergi ve Fonlar</div>
                <div className="flex justify-between pl-4">
                  <span>1. Ödenecek KDV</span>
                  <span>{formatCurrency(shortTermLiabilities.vatPayable)}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span>C. Ortaklara Borçlar</span>
                  <span>{formatCurrency(shortTermLiabilities.partnerPayables)}</span>
                </div>
                {shortTermLiabilities.loanInstallments > 0 && (
                  <div className="flex justify-between mt-2">
                    <span>D. Kredi Taksitleri (12 Aylık)</span>
                    <span>{formatCurrency(shortTermLiabilities.loanInstallments)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between font-medium border-t mt-2 pt-2">
                <span>TOPLAM KISA VADELİ</span>
                <span>{formatCurrency(shortTermLiabilities.total)}</span>
              </div>
            </div>

            {/* Long Term Liabilities */}
            <div>
              <h3 className="font-medium text-sm mb-2">II. UZUN VADELİ YABANCI KAYNAKLAR</h3>
              <div className="space-y-1 text-sm pl-4">
                <div className="flex justify-between">
                  <span>A. Banka Kredileri</span>
                  <span>{formatCurrency(longTermLiabilities.bankLoans)}</span>
                </div>
              </div>
              <div className="flex justify-between font-medium border-t mt-2 pt-2">
                <span>TOPLAM UZUN VADELİ</span>
                <span>{formatCurrency(longTermLiabilities.total)}</span>
              </div>
            </div>

            {/* Equity */}
            <div>
              <h3 className="font-medium text-sm mb-2">III. ÖZKAYNAKLAR</h3>
              <div className="space-y-1 text-sm pl-4">
                <div className="flex justify-between">
                  <span>A. Ödenmiş Sermaye</span>
                  <span>{formatCurrency(equity.paidCapital)}</span>
                </div>
                <div className="flex justify-between">
                  <span>B. Geçmiş Yıllar Kârları</span>
                  <span>{formatCurrency(equity.retainedEarnings)}</span>
                </div>
                <div className="flex justify-between">
                  <span>C. Dönem Net Kârı</span>
                  <span className={equity.currentProfit >= 0 ? "text-green-600" : "text-destructive"}>
                    {formatCurrency(equity.currentProfit)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between font-medium border-t mt-2 pt-2">
                <span>TOPLAM ÖZKAYNAKLAR</span>
                <span>{formatCurrency(equity.total)}</span>
              </div>
            </div>

            {/* Total Liabilities */}
            <div className="flex justify-between font-bold text-lg border-t-2 pt-2 text-purple-700 dark:text-purple-400">
              <span>TOPLAM PASİF</span>
              <span>{formatCurrency(totalLiabilities)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Export */}
        <Button className="w-full" disabled>
          <FileDown className="h-5 w-5 mr-2" />
          PDF İndir
        </Button>
      </div>
      <BottomTabBar />
    </div>
  );
}
