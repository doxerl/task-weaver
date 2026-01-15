import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileDown, Settings, CheckCircle, AlertTriangle, Loader2, Info, BarChart3, Lock, Unlock, Shield } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useBalanceSheet } from '@/hooks/finance/useBalanceSheet';
import { useFinancialSettings } from '@/hooks/finance/useFinancialSettings';
import { useFixedExpenses } from '@/hooks/finance/useFixedExpenses';
import { usePdfEngine } from '@/hooks/finance/usePdfEngine';
import { toast } from '@/hooks/use-toast';
import { BottomTabBar } from '@/components/BottomTabBar';
import { DetailedBalanceSheet } from '@/components/finance/DetailedBalanceSheet';
import { CurrencyToggle } from '@/components/finance/CurrencyToggle';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';
import { BalanceAssetChart } from '@/components/finance/charts/BalanceAssetChart';
import { BalanceLiabilityChart } from '@/components/finance/charts/BalanceLiabilityChart';
import { toast as sonnerToast } from 'sonner';

export default function BalanceSheet() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  
  const { 
    balanceSheet, 
    isLoading, 
    uncategorizedCount, 
    uncategorizedTotal, 
    isLocked, 
    lockBalance, 
    isUpdating,
    operatingProfit,
    incomeSummaryNet,
    expenseSummaryNet,
    cashFlowSummary
  } = useBalanceSheet(year);
  const { settings, upsertSettings } = useFinancialSettings();
  const { summary: fixedExpensesSummary } = useFixedExpenses();
  const { currency, formatAmount, yearlyAverageRate, getAvailableMonthsCount } = useCurrency();
  const { generateBalanceSheetPdfData, generateBalanceChartPdf, isGenerating: isPdfGenerating, progress: pdfEngineProgress } = usePdfEngine();
  
  // Create format function for balance sheet values (uses yearly average)
  const formatValue = (n: number) => formatAmount(n, undefined, year);
  const availableMonths = getAvailableMonthsCount(year);

  // Row component for consistent styling - uses formatValue from context
  const BalanceRow = ({ 
    label, 
    value, 
    level = 0, 
    isTotal = false, 
    isNegative = false,
    isSectionTotal = false,
    isMainTotal = false,
  }: { 
    label: string; 
    value: number; 
    level?: number; 
    isTotal?: boolean; 
    isNegative?: boolean;
    isSectionTotal?: boolean;
    isMainTotal?: boolean;
  }) => {
    const paddingLeft = level * 16;
    
    if (isMainTotal) {
      return (
        <div className="flex justify-between font-bold text-base border-t-2 border-b-2 py-2 my-2">
          <span>{label}</span>
          <span>{formatValue(value)}</span>
        </div>
      );
    }
    
    if (isSectionTotal) {
      return (
        <div className="flex justify-between font-semibold text-sm border-t pt-1 mt-1">
          <span>{label}</span>
          <span>{formatValue(value)}</span>
        </div>
      );
    }
    
    if (isTotal) {
      return (
        <div className="flex justify-between font-medium text-sm">
          <span style={{ paddingLeft }}>{label}</span>
          <span>{formatValue(value)}</span>
        </div>
      );
    }
    
    return (
      <div className={cn(
        "flex justify-between text-sm",
        isNegative && "text-destructive"
      )}>
        <span style={{ paddingLeft }}>{label}</span>
        <span>{isNegative ? `(${formatValue(Math.abs(value))})` : formatValue(value)}</span>
      </div>
    );
  };

  const handleExportPdf = async () => {
    try {
      // Data-driven PDF - jspdf-autotable ile
      // Sayfa sonu kontrolü, başlık tekrarı, Türkçe metin desteği
      const success = await generateBalanceSheetPdfData(
        balanceSheet,
        year,
        formatValue,
        { currency }
      );
      
      if (success) {
        toast({
          title: 'PDF oluşturuldu',
          description: `Bilanço PDF olarak indirildi (${currency}).`,
        });
      } else {
        toast({
          title: 'Hata',
          description: 'PDF oluşturulurken bir hata oluştu.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Hata',
        description: 'PDF oluşturulurken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };

  const handleGraphicPdf = async () => {
    if (!chartRef.current) return;
    try {
      await generateBalanceChartPdf(chartRef, year, currency);
      sonnerToast.success(`Bilanço grafik PDF oluşturuldu (${currency})`);
    } catch (error) {
      console.error('Graphic PDF export error:', error);
      sonnerToast.error('PDF oluşturulamadı');
    }
  };
  
  const [formData, setFormData] = useState({
    paid_capital: settings.paid_capital,
    unpaid_capital: (settings as any).unpaid_capital || 0,
    retained_earnings: settings.retained_earnings,
    legal_reserves: (settings as any).legal_reserves || 0,
    cash_on_hand: settings.cash_on_hand,
    trade_receivables: settings.trade_receivables,
    other_vat: (settings as any).other_vat || 0,
    vehicles_value: settings.vehicles_value,
    fixtures_value: (settings as any).fixtures_value || settings.equipment_value,
    accumulated_depreciation: settings.accumulated_depreciation,
    trade_payables: settings.trade_payables,
    personnel_payables: (settings as any).personnel_payables || 0,
    tax_payables: (settings as any).tax_payables || 0,
    social_security_payables: (settings as any).social_security_payables || 0,
    deferred_tax_liabilities: (settings as any).deferred_tax_liabilities || 0,
    // 2024 açılış değerleri
    opening_bank_balance: (settings as any).opening_bank_balance || 0,
    partner_payables: (settings as any).partner_payables || 0,
    tax_provision: (settings as any).tax_provision || 0,
    // Amortisman alanları
    vehicles_purchase_date: settings.vehicles_purchase_date || '',
    vehicles_useful_life_years: settings.vehicles_useful_life_years || 5,
    fixtures_purchase_date: settings.fixtures_purchase_date || '',
    fixtures_useful_life_years: settings.fixtures_useful_life_years || 5,
  });

  // Sync formData when settings load - use stable reference to prevent infinite loops
  useEffect(() => {
    // Only update if settings have an actual ID (from database) or if not loading
    if (settings.id || !isLoading) {
      setFormData({
        paid_capital: settings.paid_capital,
        unpaid_capital: (settings as any).unpaid_capital || 0,
        retained_earnings: settings.retained_earnings,
        legal_reserves: (settings as any).legal_reserves || 0,
        cash_on_hand: settings.cash_on_hand,
        trade_receivables: settings.trade_receivables,
        other_vat: (settings as any).other_vat || 0,
        vehicles_value: settings.vehicles_value,
        fixtures_value: (settings as any).fixtures_value || settings.equipment_value,
        accumulated_depreciation: settings.accumulated_depreciation,
        trade_payables: settings.trade_payables,
        personnel_payables: (settings as any).personnel_payables || 0,
        tax_payables: (settings as any).tax_payables || 0,
        social_security_payables: (settings as any).social_security_payables || 0,
        deferred_tax_liabilities: (settings as any).deferred_tax_liabilities || 0,
        // 2024 açılış değerleri
        opening_bank_balance: (settings as any).opening_bank_balance || 0,
        partner_payables: (settings as any).partner_payables || 0,
        tax_provision: (settings as any).tax_provision || 0,
        // Amortisman alanları
        vehicles_purchase_date: settings.vehicles_purchase_date || '',
        vehicles_useful_life_years: settings.vehicles_useful_life_years || 5,
        fixtures_purchase_date: settings.fixtures_purchase_date || '',
        fixtures_useful_life_years: settings.fixtures_useful_life_years || 5,
      });
    }
  }, [settings.id, isLoading]);

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

  // Get data from balance sheet
  const { totalAssets, totalLiabilities, isBalanced, difference } = balanceSheet;

  // Check for negative bank balance
  const bankBalance = balanceSheet.currentAssets.banks;
  const hasNegativeBankBalance = bankBalance < 0;
  
  // Check for missing asset purchase dates
  const hasMissingPurchaseDates = 
    (settings.vehicles_value > 0 && !settings.vehicles_purchase_date) ||
    ((settings as any).fixtures_value > 0 && !settings.fixtures_purchase_date);

  // Prepare chart data
  const assetChartData = {
    cashAndBanks: balanceSheet.currentAssets.cash + balanceSheet.currentAssets.banks,
    receivables: balanceSheet.currentAssets.receivables,
    partnerReceivables: balanceSheet.currentAssets.partnerReceivables || 0,
    vatReceivable: balanceSheet.currentAssets.vatReceivable,
    otherVat: (balanceSheet.currentAssets as any).otherVat || 0,
    fixedAssetsNet: balanceSheet.fixedAssets.total,
  };

  const liabilityChartData = {
    shortTermTotal: balanceSheet.shortTermLiabilities.total,
    longTermTotal: balanceSheet.longTermLiabilities.total,
    equityTotal: balanceSheet.equity.total,
    loanInstallments: balanceSheet.shortTermLiabilities.loanInstallments,
    tradePayables: balanceSheet.shortTermLiabilities.payables,
    partnerPayables: balanceSheet.shortTermLiabilities.partnerPayables,
    vatPayable: balanceSheet.shortTermLiabilities.vatPayable,
    bankLoans: balanceSheet.longTermLiabilities.bankLoans,
    paidCapital: balanceSheet.equity.paidCapital - ((balanceSheet.equity as any).unpaidCapital || 0),
    retainedEarnings: balanceSheet.equity.retainedEarnings,
    currentProfit: balanceSheet.equity.currentProfit,
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/finance" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold flex-1">Bilanço</h1>
          <CurrencyToggle year={year} />
          {/* Lock/Unlock button */}
          {!isLocked ? (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => lockBalance(true)}
              disabled={isUpdating}
              title="Bu yılı resmi onaylı olarak kilitle"
            >
              <Lock className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => lockBalance(false)}
              disabled={isUpdating}
              className="text-green-600"
              title="Kilidi aç"
            >
              <Unlock className="h-4 w-4" />
            </Button>
          )}
          {/* Settings - only show when not locked */}
          {!isLocked && (
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
                {/* Özkaynaklar */}
                <div className="border-b pb-3 mb-3">
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground">ÖZKAYNAKLAR</h4>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Sermaye (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.paid_capital}
                        onChange={e => setFormData(p => ({ ...p, paid_capital: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Ödenmemiş Sermaye (-) (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.unpaid_capital}
                        onChange={e => setFormData(p => ({ ...p, unpaid_capital: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Yasal Yedekler (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.legal_reserves}
                        onChange={e => setFormData(p => ({ ...p, legal_reserves: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Geçmiş Yıllar Kârları (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.retained_earnings}
                        onChange={e => setFormData(p => ({ ...p, retained_earnings: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Dönen Varlıklar */}
                <div className="border-b pb-3 mb-3">
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground">DÖNEN VARLIKLAR</h4>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Kasa (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.cash_on_hand}
                        onChange={e => setFormData(p => ({ ...p, cash_on_hand: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Ticari Alacaklar - Alıcılar (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.trade_receivables}
                        onChange={e => setFormData(p => ({ ...p, trade_receivables: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Diğer KDV (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.other_vat}
                        onChange={e => setFormData(p => ({ ...p, other_vat: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Duran Varlıklar */}
                <div className="border-b pb-3 mb-3">
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground">DURAN VARLIKLAR</h4>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Taşıtlar (2024 ve öncesi) (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.vehicles_value}
                        onChange={e => setFormData(p => ({ ...p, vehicles_value: Number(e.target.value) }))}
                      />
                      <p className="text-xs text-muted-foreground">Yıl içi alımlar otomatik eklenir</p>
                    </div>
                    <div className="space-y-1">
                      <Label>Taşıtlar Alım Tarihi</Label>
                      <Input 
                        type="date" 
                        value={formData.vehicles_purchase_date}
                        onChange={e => setFormData(p => ({ ...p, vehicles_purchase_date: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">Otomatik amortisman için alım tarihi girin</p>
                    </div>
                    <div className="space-y-1">
                      <Label>Taşıtlar Faydalı Ömür (Yıl)</Label>
                      <Input 
                        type="number" 
                        value={formData.vehicles_useful_life_years}
                        min={1}
                        max={50}
                        onChange={e => setFormData(p => ({ ...p, vehicles_useful_life_years: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Demirbaşlar (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.fixtures_value}
                        onChange={e => setFormData(p => ({ ...p, fixtures_value: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Demirbaşlar Alım Tarihi</Label>
                      <Input 
                        type="date" 
                        value={formData.fixtures_purchase_date}
                        onChange={e => setFormData(p => ({ ...p, fixtures_purchase_date: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">Otomatik amortisman için alım tarihi girin</p>
                    </div>
                    <div className="space-y-1">
                      <Label>Demirbaşlar Faydalı Ömür (Yıl)</Label>
                      <Input 
                        type="number" 
                        value={formData.fixtures_useful_life_years}
                        min={1}
                        max={50}
                        onChange={e => setFormData(p => ({ ...p, fixtures_useful_life_years: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Birikmiş Amortismanlar (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.accumulated_depreciation}
                        onChange={e => setFormData(p => ({ ...p, accumulated_depreciation: Number(e.target.value) }))}
                        disabled={!!(formData.vehicles_purchase_date || formData.fixtures_purchase_date)}
                      />
                      {(formData.vehicles_purchase_date || formData.fixtures_purchase_date) && (
                        <p className="text-xs text-green-600">✓ Alım tarihi girildiği için otomatik hesaplanıyor</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Kısa Vadeli Borçlar */}
                <div className="border-b pb-3 mb-3">
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground">KISA VADELİ BORÇLAR</h4>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Satıcılar (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.trade_payables}
                        onChange={e => setFormData(p => ({ ...p, trade_payables: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Ortaklara Borçlar (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.partner_payables}
                        onChange={e => setFormData(p => ({ ...p, partner_payables: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Personele Borçlar (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.personnel_payables}
                        onChange={e => setFormData(p => ({ ...p, personnel_payables: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Ödenecek Vergi ve Fonlar (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.tax_payables}
                        onChange={e => setFormData(p => ({ ...p, tax_payables: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Ödenecek SGK Kesintileri (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.social_security_payables}
                        onChange={e => setFormData(p => ({ ...p, social_security_payables: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Vadesi Geçmiş Ert. Vergi (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.deferred_tax_liabilities}
                        onChange={e => setFormData(p => ({ ...p, deferred_tax_liabilities: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Dön.Karı Vergi Karşılığı (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.tax_provision}
                        onChange={e => setFormData(p => ({ ...p, tax_provision: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>
                
                {/* 2024 Açılış Bakiyeleri */}
                <div className="border-b pb-3 mb-3">
                  <h4 className="font-medium mb-3 text-sm text-muted-foreground">2024 AÇILIŞ BAKİYELERİ</h4>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Açılış Banka Bakiyesi (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.opening_bank_balance}
                        onChange={e => setFormData(p => ({ ...p, opening_bank_balance: Number(e.target.value) }))}
                      />
                      <p className="text-xs text-muted-foreground">2024 yıl sonu banka bakiyesi (2025 açılış)</p>
                    </div>
                  </div>
                </div>
                
                <Button onClick={handleSaveSettings} className="w-full mt-4">
                  Kaydet
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          )}
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Uncategorized Transaction Warning */}
        {uncategorizedCount > 0 && (
          <Alert variant="destructive" className="mb-0">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Kategorisiz İşlem Var</AlertTitle>
            <AlertDescription>
              {uncategorizedCount} adet işlem ({formatValue(uncategorizedTotal)}) kategorilendirilememiş.{' '}
              <Link to="/finance/bank-transactions" className="underline font-medium">
                Kategorilendirmeye Git
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* USD Mode Info Alert */}
        {currency === 'USD' && (
          <Alert variant="default" className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              USD gösterimi {year} yılı ortalama kuru ile hesaplanmıştır.
              {availableMonths < 12 && ` (${availableMonths}/12 ay kur verisi mevcut)`}
            </AlertDescription>
          </Alert>
        )}

        {/* Date indicator with lock status */}
        <div className="text-center">
          <p className="text-base font-semibold flex items-center justify-center gap-2">
            31.12.{year} TARİHLİ BİLANÇO
            {currency === 'USD' && <span className="text-muted-foreground">(USD)</span>}
            {isLocked && (
              <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                <Shield className="h-3 w-3" />
                Resmi Onaylı
              </span>
            )}
          </p>
        </div>

        {/* Locked Year Alert */}
        {isLocked && (
          <Alert variant="default" className="bg-green-50 dark:bg-green-950/20 border-green-200">
            <Shield className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Bu yıl resmi onaylı bilanço olarak kilitlenmiştir. Değerler değiştirilemez ve hesaplama yapılmaz.
            </AlertDescription>
          </Alert>
        )}

        {/* Negative Bank Balance Warning */}
        {hasNegativeBankBalance && !isLocked && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Banka Bakiyesi Negatif</AlertTitle>
            <AlertDescription>
              Banka hesabı negatif ({formatValue(bankBalance)}) görünüyor. Bu genellikle yanlış açılış bakiyesinden kaynaklanır.{' '}
              <button 
                onClick={() => setSettingsOpen(true)}
                className="underline font-medium hover:no-underline"
              >
                Açılış bakiyesini düzeltin
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Missing Purchase Date Warning */}
        {hasMissingPurchaseDates && !isLocked && (
          <Alert variant="default" className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Eksik Alım Tarihi</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Duran varlıklar için alım tarihi girilmemiş. Amortisman hesaplaması yapılabilmesi için{' '}
              <button 
                onClick={() => setSettingsOpen(true)}
                className="underline font-medium hover:no-underline"
              >
                alım tarihlerini girin
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Operating P&L Card */}
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                📊 Faaliyet Kar/Zararı
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gelirler</span>
                <span className="text-green-600">{formatValue(incomeSummaryNet)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Giderler</span>
                <span className="text-destructive">{formatValue(Math.abs(expenseSummaryNet))}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Faaliyet Karı</span>
                <span className={operatingProfit >= 0 ? "text-green-600" : "text-destructive"}>
                  {formatValue(operatingProfit)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Cash Flow Card */}
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                💰 Nakit Akışı
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Girişler</span>
                <span className="text-green-600">{formatValue(cashFlowSummary.inflows)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Çıkışlar</span>
                <span className="text-destructive">{formatValue(Math.abs(cashFlowSummary.outflows))}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Net Nakit</span>
                <span className={cashFlowSummary.net >= 0 ? "text-green-600" : "text-destructive"}>
                  {formatValue(cashFlowSummary.net)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Outflow Breakdown */}
        {Math.abs(cashFlowSummary.outflows) > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Nakit Çıkış Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div className="p-2 bg-muted/50 rounded text-center">
                  <div className="font-medium">Giderler</div>
                  <div>{formatValue(cashFlowSummary.outflowsByType.expenses)}</div>
                </div>
                <div className="p-2 bg-muted/50 rounded text-center">
                  <div className="font-medium">Ortak Ödemeleri</div>
                  <div>{formatValue(cashFlowSummary.outflowsByType.partnerPayments)}</div>
                </div>
                <div className="p-2 bg-muted/50 rounded text-center">
                  <div className="font-medium">Yatırımlar</div>
                  <div>{formatValue(cashFlowSummary.outflowsByType.investments)}</div>
                </div>
                <div className="p-2 bg-muted/50 rounded text-center">
                  <div className="font-medium">Finansman</div>
                  <div>{formatValue(cashFlowSummary.outflowsByType.financing)}</div>
                </div>
                <div className="p-2 bg-muted/50 rounded text-center">
                  <div className="font-medium">Diğer</div>
                  <div>{formatValue(cashFlowSummary.outflowsByType.other)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                {isBalanced ? 'Aktif = Pasif (Denklik Sağlandı)' : `Denklik Farkı: ${formatValue(difference)}`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Summary vs Detailed */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary">Özet Bilanço</TabsTrigger>
            <TabsTrigger value="detailed">Ayrıntılı Bilanço</TabsTrigger>
          </TabsList>
          
          {/* PDF için yakalanacak içerik */}
          <div ref={contentRef} className="bg-background">
          <TabsContent value="summary" className="space-y-4 mt-4">

            {/* Asset & Liability Distribution Charts */}
            <div ref={chartRef} className="grid md:grid-cols-2 gap-4 p-4 bg-background rounded-lg">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-green-600">Varlık Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                  <BalanceAssetChart data={assetChartData} formatAmount={formatValue} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-600">Kaynak Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                  <BalanceLiabilityChart data={liabilityChartData} formatAmount={formatValue} />
                </CardContent>
              </Card>
            </div>

        {/* AKTİF (VARLIKLAR) */}
        <Card>
          <CardHeader className="pb-2 bg-primary/10">
            <CardTitle className="text-center text-primary">
              AKTİF (VARLIKLAR)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {/* I - DÖNEN VARLIKLAR */}
            <div>
              <div className="font-semibold text-sm mb-2">I - DÖNEN VARLIKLAR</div>
              
              {/* A - Hazır Değerler */}
              <div className="mb-2">
                <BalanceRow 
                  label="A - Hazır Değerler" 
                  value={balanceSheet.currentAssets.cash + balanceSheet.currentAssets.banks} 
                  isTotal 
                />
                <BalanceRow label="1 - Kasa" value={balanceSheet.currentAssets.cash} level={2} />
                <BalanceRow label="3 - Bankalar" value={balanceSheet.currentAssets.banks} level={2} />
              </div>
              
              {/* C - Ticari Alacaklar */}
              <div className="mb-2">
                <BalanceRow 
                  label="C - Ticari Alacaklar" 
                  value={balanceSheet.currentAssets.receivables} 
                  isTotal 
                />
                <BalanceRow label="1 - Alıcılar" value={balanceSheet.currentAssets.receivables} level={2} />
              </div>
              
              {/* D - Diğer Alacaklar - Ortaklardan Alacaklar */}
              {balanceSheet.currentAssets.partnerReceivables > 0 && (
                <div className="mb-2">
                  <BalanceRow 
                    label="D - Diğer Alacaklar" 
                    value={balanceSheet.currentAssets.partnerReceivables} 
                    isTotal 
                  />
                  <BalanceRow label="1 - Ortaklardan Alacaklar" value={balanceSheet.currentAssets.partnerReceivables} level={2} />
                </div>
              )}
              
              {/* H - Diğer Dönen Varlıklar */}
              <div className="mb-2">
                <BalanceRow 
                  label="H - Diğer Dönen Varlıklar" 
                  value={balanceSheet.currentAssets.vatReceivable + ((balanceSheet.currentAssets as any).otherVat || 0)} 
                  isTotal 
                />
                <BalanceRow label="2 - İndirilecek KDV" value={balanceSheet.currentAssets.vatReceivable} level={2} />
                {((balanceSheet.currentAssets as any).otherVat || 0) > 0 && (
                  <BalanceRow label="3 - Diğer KDV" value={(balanceSheet.currentAssets as any).otherVat || 0} level={2} />
                )}
              </div>
              
              <BalanceRow 
                label="DÖNEN VARLIKLAR TOPLAMI" 
                value={balanceSheet.currentAssets.total} 
                isSectionTotal 
              />
            </div>

            {/* II - DURAN VARLIKLAR */}
            <div>
              <div className="font-semibold text-sm mb-2">II - DURAN VARLIKLAR</div>
              
              {/* D - Maddi Duran Varlıklar */}
              <div className="mb-2">
                <BalanceRow 
                  label="D - Maddi Duran Varlıklar" 
                  value={balanceSheet.fixedAssets.total} 
                  isTotal 
                />
                <BalanceRow label="5 - Taşıtlar" value={balanceSheet.fixedAssets.vehicles} level={2} />
                <BalanceRow label="6 - Demirbaşlar" value={balanceSheet.fixedAssets.equipment} level={2} />
                <BalanceRow 
                  label="8 - Birikmiş Amortismanlar (-)" 
                  value={balanceSheet.fixedAssets.depreciation} 
                  level={2} 
                  isNegative 
                />
              </div>
              
              <BalanceRow 
                label="DURAN VARLIKLAR TOPLAMI" 
                value={balanceSheet.fixedAssets.total} 
                isSectionTotal 
              />
            </div>

            <BalanceRow 
              label="AKTİF (VARLIKLAR) TOPLAMI" 
              value={totalAssets} 
              isMainTotal 
            />
          </CardContent>
        </Card>

        {/* PASİF (KAYNAKLAR) */}
        <Card>
          <CardHeader className="pb-2 bg-secondary/30">
            <CardTitle className="text-center text-secondary-foreground">
              PASİF (KAYNAKLAR)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {/* I - KISA VADELİ YABANCI KAYNAKLAR */}
            <div>
              <div className="font-semibold text-sm mb-2">I - KISA VADELİ YABANCI KAYNAKLAR</div>
              
              {/* A - Mali Borçlar */}
              {balanceSheet.shortTermLiabilities.loanInstallments > 0 && (
                <div className="mb-2">
                  <BalanceRow 
                    label="A - Mali Borçlar" 
                    value={balanceSheet.shortTermLiabilities.loanInstallments} 
                    isTotal 
                  />
                  <BalanceRow label="1 - Banka Kredileri" value={balanceSheet.shortTermLiabilities.loanInstallments} level={2} />
                </div>
              )}
              
              {/* B - Ticari Borçlar */}
              <div className="mb-2">
                <BalanceRow 
                  label="B - Ticari Borçlar" 
                  value={balanceSheet.shortTermLiabilities.payables} 
                  isTotal 
                />
                <BalanceRow label="1 - Satıcılar" value={balanceSheet.shortTermLiabilities.payables} level={2} />
              </div>
              
              {/* C - Diğer Borçlar */}
              {(balanceSheet.shortTermLiabilities.partnerPayables > 0 || (balanceSheet.shortTermLiabilities as any).personnelPayables > 0) && (
                <div className="mb-2">
                  <BalanceRow 
                    label="C - Diğer Borçlar" 
                    value={balanceSheet.shortTermLiabilities.partnerPayables + ((balanceSheet.shortTermLiabilities as any).personnelPayables || 0)} 
                    isTotal 
                  />
                  {balanceSheet.shortTermLiabilities.partnerPayables > 0 && (
                    <BalanceRow label="1 - Ortaklara Borçlar" value={balanceSheet.shortTermLiabilities.partnerPayables} level={2} />
                  )}
                  {((balanceSheet.shortTermLiabilities as any).personnelPayables || 0) > 0 && (
                    <BalanceRow label="4 - Personele Borçlar" value={(balanceSheet.shortTermLiabilities as any).personnelPayables || 0} level={2} />
                  )}
                </div>
              )}
              
              {/* F - Ödenecek Vergi ve Diğer Yükümlülükler */}
              {(balanceSheet.shortTermLiabilities.taxPayable > 0 || (balanceSheet.shortTermLiabilities as any).taxPayables > 0 || (balanceSheet.shortTermLiabilities as any).socialSecurityPayables > 0) && (
                <div className="mb-2">
                  <BalanceRow 
                    label="F - Ödenecek Vergi ve Diğer Yükümlülükler" 
                    value={(balanceSheet.shortTermLiabilities as any).taxPayables || 0 + (balanceSheet.shortTermLiabilities as any).socialSecurityPayables || 0} 
                    isTotal 
                  />
                  {((balanceSheet.shortTermLiabilities as any).taxPayables || 0) > 0 && (
                    <BalanceRow label="1 - Ödenecek Vergi ve Fonlar" value={(balanceSheet.shortTermLiabilities as any).taxPayables || 0} level={2} />
                  )}
                  {((balanceSheet.shortTermLiabilities as any).socialSecurityPayables || 0) > 0 && (
                    <BalanceRow label="2 - Ödenecek Sosyal Güvenlik Kesintileri" value={(balanceSheet.shortTermLiabilities as any).socialSecurityPayables || 0} level={2} />
                  )}
                </div>
              )}
              
              {/* I - Diğer Kısa Vadeli Yabancı Kaynaklar */}
              {balanceSheet.shortTermLiabilities.vatPayable > 0 && (
                <div className="mb-2">
                  <BalanceRow 
                    label="I - Diğer Kısa Vadeli Yabancı Kaynaklar" 
                    value={balanceSheet.shortTermLiabilities.vatPayable} 
                    isTotal 
                  />
                  <BalanceRow label="1 - Hesaplanan KDV" value={balanceSheet.shortTermLiabilities.vatPayable} level={2} />
                </div>
              )}
              
              <BalanceRow 
                label="KISA VADELİ YABANCI KAY. TOPLAMI" 
                value={balanceSheet.shortTermLiabilities.total} 
                isSectionTotal 
              />
            </div>

            {/* II - UZUN VADELİ YABANCI KAYNAKLAR */}
            {balanceSheet.longTermLiabilities.total > 0 && (
              <div>
                <div className="font-semibold text-sm mb-2">II - UZUN VADELİ YABANCI KAYNAKLAR</div>
                
                <div className="mb-2">
                  <BalanceRow 
                    label="A - Mali Borçlar" 
                    value={balanceSheet.longTermLiabilities.bankLoans} 
                    isTotal 
                  />
                  <BalanceRow label="1 - Banka Kredileri" value={balanceSheet.longTermLiabilities.bankLoans} level={2} />
                </div>
                
                <BalanceRow 
                  label="UZUN VADELİ YABANCI KAY. TOPLAMI" 
                  value={balanceSheet.longTermLiabilities.total} 
                  isSectionTotal 
                />
              </div>
            )}

            {/* III - ÖZKAYNAKLAR */}
            <div>
              <div className="font-semibold text-sm mb-2">III - ÖZKAYNAKLAR</div>
              
              {/* A - Ödenmiş Sermaye */}
              <div className="mb-2">
                <BalanceRow 
                  label="A - Ödenmiş Sermaye" 
                  value={balanceSheet.equity.paidCapital - ((balanceSheet.equity as any).unpaidCapital || 0)} 
                  isTotal 
                />
                <BalanceRow label="1 - Sermaye" value={balanceSheet.equity.paidCapital} level={2} />
                {((balanceSheet.equity as any).unpaidCapital || 0) > 0 && (
                  <BalanceRow 
                    label="2 - Ödenmemiş Sermaye (-)" 
                    value={(balanceSheet.equity as any).unpaidCapital || 0} 
                    level={2} 
                    isNegative 
                  />
                )}
              </div>
              
              {/* C - Kar Yedekleri */}
              {((balanceSheet.equity as any).legalReserves || 0) > 0 && (
                <div className="mb-2">
                  <BalanceRow 
                    label="C - Kar Yedekleri" 
                    value={(balanceSheet.equity as any).legalReserves || 0} 
                    isTotal 
                  />
                  <BalanceRow label="1 - Yasal Yedekler" value={(balanceSheet.equity as any).legalReserves || 0} level={2} />
                </div>
              )}
              
              {/* D - Geçmiş Yıllar Karları */}
              {balanceSheet.equity.retainedEarnings !== 0 && (
                <div className="mb-2">
                  <BalanceRow 
                    label="D - Geçmiş Yıllar Karları" 
                    value={balanceSheet.equity.retainedEarnings} 
                    isTotal 
                  />
                  <BalanceRow label="1 - Geçmiş Yıllar Karları" value={balanceSheet.equity.retainedEarnings} level={2} />
                </div>
              )}
              
              {/* F - Dönem Net Karı (Zararı) */}
              <div className="mb-2">
                <BalanceRow 
                  label="F - Dönem Net Karı (Zararı)" 
                  value={balanceSheet.equity.currentProfit} 
                  isTotal 
                />
                {balanceSheet.equity.currentProfit >= 0 ? (
                  <BalanceRow label="1 - Dönem Net Karı" value={balanceSheet.equity.currentProfit} level={2} />
                ) : (
                  <BalanceRow 
                    label="2 - Dönem Net Zararı (-)" 
                    value={Math.abs(balanceSheet.equity.currentProfit)} 
                    level={2} 
                    isNegative 
                  />
                )}
              </div>
              
              <BalanceRow 
                label="ÖZKAYNAKLAR TOPLAMI" 
                value={balanceSheet.equity.total} 
                isSectionTotal 
              />
            </div>

            <BalanceRow 
              label="PASİF (KAYNAKLAR) TOPLAMI" 
              value={totalLiabilities} 
              isMainTotal 
            />
          </CardContent>
        </Card>
          </TabsContent>
          
          <TabsContent value="detailed" className="mt-4">
            <DetailedBalanceSheet balanceSheet={balanceSheet} year={year} formatAmount={formatValue} />
          </TabsContent>
          </div>
        </Tabs>

        {/* Export Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleExportPdf} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-5 w-5 mr-2" />
            )}
            {isGenerating ? pdfProgress || 'PDF Oluşturuluyor...' : 'Tablo PDF'}
          </Button>
          <Button onClick={handleGraphicPdf} disabled={isPdfGenerating} variant="outline">
            {isPdfGenerating && pdfEngineProgress.stage.includes('Grafik') ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="h-5 w-5 mr-2" />
            )}
            {isPdfGenerating && pdfEngineProgress.stage.includes('Grafik') ? 'Oluşturuluyor...' : 'Grafik PDF'}
          </Button>
        </div>
      </div>
      <BottomTabBar />
    </div>
  );
}
