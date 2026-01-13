import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileDown, Settings, CheckCircle, AlertTriangle, Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useBalanceSheet } from '@/hooks/finance/useBalanceSheet';
import { useFinancialSettings } from '@/hooks/finance/useFinancialSettings';
import { useFixedExpenses } from '@/hooks/finance/useFixedExpenses';
import { captureElementToPdf } from '@/lib/pdfCapture';
import { toast } from '@/hooks/use-toast';
import { BottomTabBar } from '@/components/BottomTabBar';
import { DetailedBalanceSheet } from '@/components/finance/DetailedBalanceSheet';
import { CurrencyToggle } from '@/components/finance/CurrencyToggle';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

export default function BalanceSheet() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  
  const { balanceSheet, isLoading, uncategorizedCount, uncategorizedTotal } = useBalanceSheet(year);
  const { settings, upsertSettings } = useFinancialSettings();
  const { summary: fixedExpensesSummary } = useFixedExpenses();
  const { currency, formatAmount, yearlyAverageRate, getAvailableMonthsCount } = useCurrency();
  
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
    if (!contentRef.current) {
      toast({
        title: 'Hata',
        description: 'PDF içeriği bulunamadı.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setPdfProgress('');
    
    const isSummary = activeTab === 'summary';
    
    try {
      const success = await captureElementToPdf(contentRef.current, {
        filename: `Bilanco_${year}_${isSummary ? 'Ozet' : 'Ayrintili'}.pdf`,
        orientation: 'portrait',
        margin: 10,
        scale: 2,
        waitTime: 1000,
        fitToPage: isSummary, // Özet bilanço tek sayfaya sığsın
        onProgress: setPdfProgress,
      });
      
      if (success) {
        toast({
          title: 'PDF oluşturuldu',
          description: 'Bilanço PDF olarak indirildi.',
        });
      } else {
        throw new Error('PDF oluşturulamadı');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Hata',
        description: 'PDF oluşturulurken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setPdfProgress('');
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
                      <Label>Demirbaşlar (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.fixtures_value}
                        onChange={e => setFormData(p => ({ ...p, fixtures_value: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Birikmiş Amortismanlar (₺)</Label>
                      <Input 
                        type="number" 
                        value={formData.accumulated_depreciation}
                        onChange={e => setFormData(p => ({ ...p, accumulated_depreciation: Number(e.target.value) }))}
                      />
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

        {/* Date indicator */}
        <div className="text-center">
          <p className="text-base font-semibold">
            31.12.{year} TARİHLİ BİLANÇO
            {currency === 'USD' && <span className="text-muted-foreground ml-2">(USD)</span>}
          </p>
        </div>

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

        {/* Export */}
        <Button className="w-full" onClick={handleExportPdf} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <FileDown className="h-5 w-5 mr-2" />
          )}
          {isGenerating ? pdfProgress || 'PDF Oluşturuluyor...' : 'PDF İndir'}
        </Button>
      </div>
      <BottomTabBar />
    </div>
  );
}