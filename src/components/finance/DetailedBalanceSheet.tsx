import { BalanceSheet } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DetailedBalanceSheetProps {
  balanceSheet: BalanceSheet;
  year: number;
  formatAmount: (n: number) => string;
}

export function DetailedBalanceSheet({ balanceSheet, year, formatAmount }: DetailedBalanceSheetProps) {
  // Detailed balance row with account code support
  const DetailedRow = ({ 
    code,
    label, 
    value, 
    level = 0, 
    isNegative = false,
    isSubTotal = false,
    isSectionTotal = false,
    isMainTotal = false,
    showZero = true,
  }: { 
    code?: string;
    label: string; 
    value: number; 
    level?: number; 
    isNegative?: boolean;
    isSubTotal?: boolean;
    isSectionTotal?: boolean;
    isMainTotal?: boolean;
    showZero?: boolean;
  }) => {
    if (!showZero && value === 0) return null;
    
    const paddingLeft = level * 16;
    const displayValue = isNegative ? `(${formatAmount(Math.abs(value))})` : formatAmount(value);
    
    if (isMainTotal) {
      return (
        <div className="flex justify-between font-bold text-sm border-t-2 border-b-2 border-primary/30 py-2 my-2 bg-primary/5">
          <span className="pl-1">{label}</span>
          <span className="pr-1">{displayValue}</span>
        </div>
      );
    }
    
    if (isSectionTotal) {
      return (
        <div className="flex justify-between font-semibold text-xs border-t border-muted-foreground/30 pt-1 mt-1 bg-muted/30">
          <span className="pl-1">{label}</span>
          <span className="pr-1">{displayValue}</span>
        </div>
      );
    }
    
    if (isSubTotal) {
      return (
        <div className="flex justify-between font-medium text-xs">
          <span style={{ paddingLeft }}>{code && <span className="text-muted-foreground mr-1">{code}</span>}{label}</span>
          <span>{displayValue}</span>
        </div>
      );
    }
    
    return (
      <div className={cn(
        "flex justify-between text-xs py-0.5",
        isNegative && "text-destructive"
      )}>
        <span style={{ paddingLeft }}>
          {code && <span className="text-muted-foreground mr-1">{code}</span>}
          {label}
        </span>
        <span>{displayValue}</span>
      </div>
    );
  };

  // Section header
  const SectionHeader = ({ roman, title }: { roman: string; title: string }) => (
    <div className="font-bold text-xs py-1 mt-2 first:mt-0 bg-muted/50 px-1">
      {roman} - {title}
    </div>
  );

  // Sub-section header (A, B, C, etc.)
  const SubSectionHeader = ({ letter, title, total }: { letter: string; title: string; total: number }) => (
    <div className="flex justify-between font-medium text-xs py-0.5 pl-2">
      <span>{letter} - {title}</span>
      <span>{formatAmount(total)}</span>
    </div>
  );
  const { 
    currentAssets, 
    fixedAssets, 
    totalAssets,
    shortTermLiabilities, 
    longTermLiabilities, 
    equity, 
    totalLiabilities 
  } = balanceSheet;

  // Calculate sub-totals
  const readyValuesTotal = currentAssets.cash + currentAssets.banks;
  const tradeReceivablesTotal = currentAssets.receivables;
  const otherReceivablesTotal = currentAssets.partnerReceivables || 0;
  const inventoryTotal = currentAssets.inventory || 0;
  const otherCurrentTotal = currentAssets.vatReceivable + ((currentAssets as any).otherVat || 0);
  
  const tangibleAssetsTotal = fixedAssets.vehicles + fixedAssets.equipment - fixedAssets.depreciation;
  
  const financialDebtsTotal = shortTermLiabilities.loanInstallments || 0;
  const tradePayablesTotal = shortTermLiabilities.payables;
  const otherDebtsTotal = (shortTermLiabilities.partnerPayables || 0) + 
    ((shortTermLiabilities as any).personnelPayables || 0);
  const taxLiabilitiesTotal = ((shortTermLiabilities as any).taxPayables || 0) + 
    ((shortTermLiabilities as any).socialSecurityPayables || 0);
  const otherShortTermTotal = shortTermLiabilities.vatPayable || 0;
  
  const paidCapitalTotal = equity.paidCapital - ((equity as any).unpaidCapital || 0);
  const profitReservesTotal = (equity as any).legalReserves || 0;
  
  return (
    <div className="space-y-4">
      {/* AKTİF (VARLIKLAR) */}
      <Card>
        <CardHeader className="py-2 bg-primary/10">
          <CardTitle className="text-center text-primary text-sm">
            AKTİF (VARLIKLAR)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 space-y-1 text-xs">
          {/* I - DÖNEN VARLIKLAR */}
          <SectionHeader roman="I" title="DÖNEN VARLIKLAR" />
          
          {/* A - Hazır Değerler */}
          <SubSectionHeader letter="A" title="Hazır Değerler" total={readyValuesTotal} />
          <DetailedRow code="100" label="Kasa" value={currentAssets.cash} level={2} />
          <DetailedRow code="102" label="Bankalar" value={currentAssets.banks} level={2} />
          <DetailedRow code="102.01" label="Vadesiz Mevduat" value={currentAssets.banks} level={3} />
          <DetailedRow code="102.02" label="Vadeli Mevduat" value={0} level={3} />
          <DetailedRow code="108" label="Diğer Hazır Değerler" value={0} level={2} />
          
          {/* B - Menkul Kıymetler */}
          <SubSectionHeader letter="B" title="Menkul Kıymetler" total={0} />
          <DetailedRow code="110" label="Hisse Senetleri" value={0} level={2} />
          <DetailedRow code="111" label="Özel Kesim Tahvil..." value={0} level={2} />
          
          {/* C - Ticari Alacaklar */}
          <SubSectionHeader letter="C" title="Ticari Alacaklar" total={tradeReceivablesTotal} />
          <DetailedRow code="120" label="Alıcılar" value={currentAssets.receivables} level={2} />
          <DetailedRow code="120.01" label="Yurtiçi Alıcılar" value={currentAssets.receivables} level={3} />
          <DetailedRow code="120.02" label="Yurtdışı Alıcılar" value={0} level={3} />
          <DetailedRow code="121" label="Alacak Senetleri" value={0} level={2} />
          <DetailedRow code="126" label="Verilen Depozito ve Teminatlar" value={0} level={2} />
          <DetailedRow code="127" label="Diğer Ticari Alacaklar" value={0} level={2} />
          <DetailedRow code="128" label="Şüpheli Ticari Alacaklar" value={0} level={2} />
          <DetailedRow code="129" label="Şüpheli Tic.Ala.Karş.(-)" value={0} level={2} isNegative />
          
          {/* D - Diğer Alacaklar */}
          <SubSectionHeader letter="D" title="Diğer Alacaklar" total={otherReceivablesTotal} />
          <DetailedRow code="131" label="Ortaklardan Alacaklar" value={currentAssets.partnerReceivables || 0} level={2} />
          <DetailedRow code="132" label="İştiraklerden Alacaklar" value={0} level={2} />
          <DetailedRow code="135" label="Personelden Alacaklar" value={0} level={2} />
          <DetailedRow code="136" label="Diğer Çeşitli Alacaklar" value={0} level={2} />
          <DetailedRow code="137" label="Diğer Alacak Sen.Red.(-)" value={0} level={2} isNegative />
          <DetailedRow code="138" label="Şüpheli Diğer Alacaklar" value={0} level={2} />
          <DetailedRow code="139" label="Şüpheli Diğ.Ala.Karş.(-)" value={0} level={2} isNegative />
          
          {/* E - Stoklar */}
          <SubSectionHeader letter="E" title="Stoklar" total={inventoryTotal} />
          <DetailedRow code="150" label="İlk Madde ve Malzeme" value={0} level={2} />
          <DetailedRow code="151" label="Yarı Mamuller-Üretim" value={0} level={2} />
          <DetailedRow code="152" label="Mamuller" value={0} level={2} />
          <DetailedRow code="153" label="Ticari Mallar" value={currentAssets.inventory || 0} level={2} />
          <DetailedRow code="157" label="Diğer Stoklar" value={0} level={2} />
          <DetailedRow code="158" label="Stok Değer Düş.Karş.(-)" value={0} level={2} isNegative />
          <DetailedRow code="159" label="Verilen Sipariş Avansları" value={0} level={2} />
          
          {/* F - Yıllara Yaygın İnşaat... */}
          <SubSectionHeader letter="F" title="Yıllara Yaygın İnşaat ve Onarım Maliyetleri" total={0} />
          <DetailedRow code="170" label="Yıllara Yaygın İnş.Onar.Mal." value={0} level={2} />
          
          {/* G - Gelecek Aylara Ait Giderler... */}
          <SubSectionHeader letter="G" title="Gelecek Aylara Ait Giderler ve Gelir Tahakkukları" total={0} />
          <DetailedRow code="180" label="Gelecek Aylara Ait Giderler" value={0} level={2} />
          <DetailedRow code="181" label="Gelir Tahakkukları" value={0} level={2} />
          
          {/* H - Diğer Dönen Varlıklar */}
          <SubSectionHeader letter="H" title="Diğer Dönen Varlıklar" total={otherCurrentTotal} />
          <DetailedRow code="190" label="Devreden KDV" value={0} level={2} />
          <DetailedRow code="191" label="İndirilecek KDV" value={currentAssets.vatReceivable} level={2} />
          <DetailedRow code="192" label="Diğer KDV" value={(currentAssets as any).otherVat || 0} level={2} />
          <DetailedRow code="193" label="Peşin Ödenen Vergi ve Fonlar" value={0} level={2} />
          <DetailedRow code="195" label="İş Avansları" value={0} level={2} />
          <DetailedRow code="196" label="Personel Avansları" value={0} level={2} />
          <DetailedRow code="197" label="Sayım ve Tesellüm Noksanları" value={0} level={2} />
          <DetailedRow code="199" label="Diğer Dönen Varlıklar" value={0} level={2} />
          
          <DetailedRow 
            label="DÖNEN VARLIKLAR TOPLAMI" 
            value={currentAssets.total} 
            isSectionTotal 
          />
          
          {/* II - DURAN VARLIKLAR */}
          <SectionHeader roman="II" title="DURAN VARLIKLAR" />
          
          {/* A - Ticari Alacaklar */}
          <SubSectionHeader letter="A" title="Ticari Alacaklar" total={0} />
          <DetailedRow code="220" label="Alıcılar" value={0} level={2} />
          <DetailedRow code="221" label="Alacak Senetleri" value={0} level={2} />
          <DetailedRow code="226" label="Verilen Depozito ve Teminatlar" value={0} level={2} />
          
          {/* B - Diğer Alacaklar */}
          <SubSectionHeader letter="B" title="Diğer Alacaklar" total={0} />
          <DetailedRow code="231" label="Ortaklardan Alacaklar" value={0} level={2} />
          <DetailedRow code="232" label="İştiraklerden Alacaklar" value={0} level={2} />
          <DetailedRow code="235" label="Personelden Alacaklar" value={0} level={2} />
          
          {/* C - Mali Duran Varlıklar */}
          <SubSectionHeader letter="C" title="Mali Duran Varlıklar" total={0} />
          <DetailedRow code="240" label="Bağlı Menkul Kıymetler" value={0} level={2} />
          <DetailedRow code="242" label="İştirakler" value={0} level={2} />
          <DetailedRow code="245" label="Bağlı Ortaklıklar" value={0} level={2} />
          
          {/* D - Maddi Duran Varlıklar */}
          <SubSectionHeader letter="D" title="Maddi Duran Varlıklar" total={tangibleAssetsTotal} />
          <DetailedRow code="250" label="Arazi ve Arsalar" value={0} level={2} />
          <DetailedRow code="251" label="Yeraltı ve Yerüstü Düzenleri" value={0} level={2} />
          <DetailedRow code="252" label="Binalar" value={0} level={2} />
          <DetailedRow code="253" label="Tesis, Makine ve Cihazlar" value={0} level={2} />
          <DetailedRow code="254" label="Taşıtlar" value={fixedAssets.vehicles} level={2} />
          <DetailedRow code="255" label="Demirbaşlar" value={fixedAssets.equipment} level={2} />
          <DetailedRow code="256" label="Diğer Maddi Duran Varlıklar" value={0} level={2} />
          <DetailedRow code="257" label="Birikmiş Amortismanlar (-)" value={fixedAssets.depreciation} level={2} isNegative />
          <DetailedRow code="258" label="Yapılmakta Olan Yatırımlar" value={0} level={2} />
          <DetailedRow code="259" label="Verilen Avanslar" value={0} level={2} />
          
          {/* E - Maddi Olmayan Duran Varlıklar */}
          <SubSectionHeader letter="E" title="Maddi Olmayan Duran Varlıklar" total={0} />
          <DetailedRow code="260" label="Haklar" value={0} level={2} />
          <DetailedRow code="261" label="Şerefiye" value={0} level={2} />
          <DetailedRow code="262" label="Kuruluş ve Örgütlenme Giderleri" value={0} level={2} />
          <DetailedRow code="263" label="Araştırma ve Geliştirme Giderleri" value={0} level={2} />
          <DetailedRow code="264" label="Özel Maliyetler" value={0} level={2} />
          <DetailedRow code="267" label="Diğer Maddi Olmayan Dur.Var." value={0} level={2} />
          <DetailedRow code="268" label="Birikmiş Amortismanlar (-)" value={0} level={2} isNegative />
          
          {/* F - Özel Tükenmeye Tabi Varlıklar */}
          <SubSectionHeader letter="F" title="Özel Tükenmeye Tabi Varlıklar" total={0} />
          <DetailedRow code="271" label="Arama Giderleri" value={0} level={2} />
          <DetailedRow code="272" label="Hazırlık ve Geliştirme Giderleri" value={0} level={2} />
          <DetailedRow code="278" label="Birikmiş Tükenme Payları (-)" value={0} level={2} isNegative />
          
          {/* G - Gelecek Yıllara Ait Giderler... */}
          <SubSectionHeader letter="G" title="Gelecek Yıllara Ait Giderler ve Gelir Tahakkukları" total={0} />
          <DetailedRow code="280" label="Gelecek Yıllara Ait Giderler" value={0} level={2} />
          <DetailedRow code="281" label="Gelir Tahakkukları" value={0} level={2} />
          
          {/* H - Diğer Duran Varlıklar */}
          <SubSectionHeader letter="H" title="Diğer Duran Varlıklar" total={0} />
          <DetailedRow code="291" label="Gelecek Yıll.Ait Giderler" value={0} level={2} />
          <DetailedRow code="293" label="Gelecek Yıllar İhtiyacı Stoklar" value={0} level={2} />
          <DetailedRow code="294" label="Elden Çıkarılacak Stoklar..." value={0} level={2} />
          <DetailedRow code="295" label="Peşin Ödenen Vergi ve Fonlar" value={0} level={2} />
          <DetailedRow code="297" label="Diğer Çeşitli Duran Varlıklar" value={0} level={2} />
          <DetailedRow code="298" label="Stok Değ.Düş.Karş.(-)" value={0} level={2} isNegative />
          <DetailedRow code="299" label="Birikmiş Amortismanlar (-)" value={0} level={2} isNegative />
          
          <DetailedRow 
            label="DURAN VARLIKLAR TOPLAMI" 
            value={fixedAssets.total} 
            isSectionTotal 
          />
          
          <DetailedRow 
            label="AKTİF (VARLIKLAR) TOPLAMI" 
            value={totalAssets} 
            isMainTotal 
          />
        </CardContent>
      </Card>

      {/* PASİF (KAYNAKLAR) */}
      <Card>
        <CardHeader className="py-2 bg-secondary/30">
          <CardTitle className="text-center text-secondary-foreground text-sm">
            PASİF (KAYNAKLAR)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 space-y-1 text-xs">
          {/* I - KISA VADELİ YABANCI KAYNAKLAR */}
          <SectionHeader roman="I" title="KISA VADELİ YABANCI KAYNAKLAR" />
          
          {/* A - Mali Borçlar */}
          <SubSectionHeader letter="A" title="Mali Borçlar" total={financialDebtsTotal} />
          <DetailedRow code="300" label="Banka Kredileri" value={shortTermLiabilities.loanInstallments || 0} level={2} />
          <DetailedRow code="303" label="Uzun Vad.Kred.Ana.Tak.ve Fa." value={0} level={2} />
          <DetailedRow code="304" label="Tahvil Ana.Borç Tak.ve Faizi" value={0} level={2} />
          <DetailedRow code="305" label="Çık.Tah.ve Bon.Ana.Tak.ve Fa." value={0} level={2} />
          <DetailedRow code="306" label="Çıkarılmış Diğer Men.Kıy.Ana.Borç Tak." value={0} level={2} />
          <DetailedRow code="308" label="Menkul Kıy.İhraç Farkı (-)" value={0} level={2} isNegative />
          <DetailedRow code="309" label="Diğer Mali Borçlar" value={0} level={2} />
          
          {/* B - Ticari Borçlar */}
          <SubSectionHeader letter="B" title="Ticari Borçlar" total={tradePayablesTotal} />
          <DetailedRow code="320" label="Satıcılar" value={shortTermLiabilities.payables} level={2} />
          <DetailedRow code="320.01" label="Yurtiçi Satıcılar" value={shortTermLiabilities.payables} level={3} />
          <DetailedRow code="320.02" label="Yurtdışı Satıcılar" value={0} level={3} />
          <DetailedRow code="321" label="Borç Senetleri" value={0} level={2} />
          <DetailedRow code="322" label="Borç Sen.Reeskontu (-)" value={0} level={2} isNegative />
          <DetailedRow code="326" label="Alınan Depozito ve Teminatlar" value={0} level={2} />
          <DetailedRow code="329" label="Diğer Ticari Borçlar" value={0} level={2} />
          
          {/* C - Diğer Borçlar */}
          <SubSectionHeader letter="C" title="Diğer Borçlar" total={otherDebtsTotal} />
          <DetailedRow code="331" label="Ortaklara Borçlar" value={shortTermLiabilities.partnerPayables || 0} level={2} />
          <DetailedRow code="332" label="İştiraklere Borçlar" value={0} level={2} />
          <DetailedRow code="333" label="Bağlı Ortaklıklara Borçlar" value={0} level={2} />
          <DetailedRow code="335" label="Personele Borçlar" value={(shortTermLiabilities as any).personnelPayables || 0} level={2} />
          <DetailedRow code="336" label="Diğer Çeşitli Borçlar" value={0} level={2} />
          <DetailedRow code="337" label="Diğer Borç Sen.Reeskontu (-)" value={0} level={2} isNegative />
          
          {/* D - Alınan Avanslar */}
          <SubSectionHeader letter="D" title="Alınan Avanslar" total={0} />
          <DetailedRow code="340" label="Alınan Sipariş Avansları" value={0} level={2} />
          <DetailedRow code="349" label="Alınan Diğer Avanslar" value={0} level={2} />
          
          {/* E - Yıllara Yaygın İnşaat... */}
          <SubSectionHeader letter="E" title="Yıllara Yaygın İnşaat ve Onarım Hakediş Bedelleri" total={0} />
          <DetailedRow code="350" label="Yıllara Yaygın İnş.Onar.Hak.Bed." value={0} level={2} />
          
          {/* F - Ödenecek Vergi ve Diğer Yükümlülükler */}
          <SubSectionHeader letter="F" title="Ödenecek Vergi ve Diğer Yükümlülükler" total={taxLiabilitiesTotal} />
          <DetailedRow code="360" label="Ödenecek Vergi ve Fonlar" value={(shortTermLiabilities as any).taxPayables || 0} level={2} />
          <DetailedRow code="361" label="Ödenecek Sosyal Güvenlik Kes." value={(shortTermLiabilities as any).socialSecurityPayables || 0} level={2} />
          <DetailedRow code="368" label="Vad.Geç.Ert.veya Tak.Ver.Yük." value={0} level={2} />
          <DetailedRow code="369" label="Öd.Diğ.Yük." value={0} level={2} />
          
          {/* G - Borç ve Gider Karşılıkları */}
          <SubSectionHeader letter="G" title="Borç ve Gider Karşılıkları" total={0} />
          <DetailedRow code="370" label="Dön.Karı Ver.ve Diğ.Yas.Yük.Kar." value={0} level={2} />
          <DetailedRow code="371" label="Dön.Karının Peş.Öd.Ver.ve Diğ.Yük.(-)" value={0} level={2} isNegative />
          <DetailedRow code="372" label="Kıdem Tazminatı Karşılığı" value={0} level={2} />
          <DetailedRow code="373" label="Mal.Sor.Taz.Karş." value={0} level={2} />
          <DetailedRow code="379" label="Diğer Borç ve Gider Karşılıkları" value={0} level={2} />
          
          {/* H - Gelecek Aylara Ait Gelirler... */}
          <SubSectionHeader letter="H" title="Gelecek Aylara Ait Gelirler ve Gider Tahakkukları" total={0} />
          <DetailedRow code="380" label="Gelecek Aylara Ait Gelirler" value={0} level={2} />
          <DetailedRow code="381" label="Gider Tahakkukları" value={0} level={2} />
          
          {/* I - Diğer Kısa Vadeli Yabancı Kaynaklar */}
          <SubSectionHeader letter="I" title="Diğer Kısa Vadeli Yabancı Kaynaklar" total={otherShortTermTotal} />
          <DetailedRow code="391" label="Hesaplanan KDV" value={shortTermLiabilities.vatPayable || 0} level={2} />
          <DetailedRow code="392" label="Diğer KDV" value={0} level={2} />
          <DetailedRow code="393" label="Merkez ve Şubeler Cari Hesabı" value={0} level={2} />
          <DetailedRow code="397" label="Sayım ve Tesellüm Fazlaları" value={0} level={2} />
          <DetailedRow code="399" label="Diğer K.V.Y.K." value={0} level={2} />
          
          <DetailedRow 
            label="KISA VADELİ YABANCI KAYNAKLAR TOPLAMI" 
            value={shortTermLiabilities.total} 
            isSectionTotal 
          />
          
          {/* II - UZUN VADELİ YABANCI KAYNAKLAR */}
          <SectionHeader roman="II" title="UZUN VADELİ YABANCI KAYNAKLAR" />
          
          {/* A - Mali Borçlar */}
          <SubSectionHeader letter="A" title="Mali Borçlar" total={longTermLiabilities.bankLoans} />
          <DetailedRow code="400" label="Banka Kredileri" value={longTermLiabilities.bankLoans} level={2} />
          <DetailedRow code="405" label="Çıkarılmış Tahviller" value={0} level={2} />
          <DetailedRow code="407" label="Çıkarılmış Diğer Men.Kıy." value={0} level={2} />
          <DetailedRow code="408" label="Men.Kıy.İhraç Farkı (-)" value={0} level={2} isNegative />
          <DetailedRow code="409" label="Diğer Mali Borçlar" value={0} level={2} />
          
          {/* B - Ticari Borçlar */}
          <SubSectionHeader letter="B" title="Ticari Borçlar" total={0} />
          <DetailedRow code="420" label="Satıcılar" value={0} level={2} />
          <DetailedRow code="421" label="Borç Senetleri" value={0} level={2} />
          <DetailedRow code="422" label="Borç Sen.Reeskontu (-)" value={0} level={2} isNegative />
          <DetailedRow code="426" label="Alınan Depozito ve Teminatlar" value={0} level={2} />
          <DetailedRow code="429" label="Diğer Ticari Borçlar" value={0} level={2} />
          
          {/* C - Diğer Borçlar */}
          <SubSectionHeader letter="C" title="Diğer Borçlar" total={0} />
          <DetailedRow code="431" label="Ortaklara Borçlar" value={0} level={2} />
          <DetailedRow code="432" label="İştiraklere Borçlar" value={0} level={2} />
          <DetailedRow code="433" label="Bağlı Ortaklıklara Borçlar" value={0} level={2} />
          <DetailedRow code="436" label="Diğer Çeşitli Borçlar" value={0} level={2} />
          <DetailedRow code="437" label="Diğer Borç Sen.Reeskontu (-)" value={0} level={2} isNegative />
          <DetailedRow code="438" label="Kamuya Olan Ertelenmiş veya Tak.Borçlar" value={0} level={2} />
          
          {/* D - Alınan Avanslar */}
          <SubSectionHeader letter="D" title="Alınan Avanslar" total={0} />
          <DetailedRow code="440" label="Alınan Sipariş Avansları" value={0} level={2} />
          <DetailedRow code="449" label="Alınan Diğer Avanslar" value={0} level={2} />
          
          {/* E - Borç ve Gider Karşılıkları */}
          <SubSectionHeader letter="E" title="Borç ve Gider Karşılıkları" total={0} />
          <DetailedRow code="472" label="Kıdem Tazminatı Karşılığı" value={0} level={2} />
          <DetailedRow code="479" label="Diğer Borç ve Gider Karşılıkları" value={0} level={2} />
          
          {/* F - Gelecek Yıllara Ait Gelirler... */}
          <SubSectionHeader letter="F" title="Gelecek Yıllara Ait Gelirler ve Gider Tahakkukları" total={0} />
          <DetailedRow code="480" label="Gelecek Yıllara Ait Gelirler" value={0} level={2} />
          <DetailedRow code="481" label="Gider Tahakkukları" value={0} level={2} />
          
          {/* G - Diğer Uzun Vadeli Yabancı Kaynaklar */}
          <SubSectionHeader letter="G" title="Diğer Uzun Vadeli Yabancı Kaynaklar" total={0} />
          <DetailedRow code="492" label="Gelecek Yıll.Ait Ertelenen..." value={0} level={2} />
          <DetailedRow code="493" label="Tesise Katılım Payları" value={0} level={2} />
          <DetailedRow code="499" label="Diğer U.V.Y.K." value={0} level={2} />
          
          <DetailedRow 
            label="UZUN VADELİ YABANCI KAYNAKLAR TOPLAMI" 
            value={longTermLiabilities.total} 
            isSectionTotal 
          />
          
          {/* III - ÖZKAYNAKLAR */}
          <SectionHeader roman="III" title="ÖZKAYNAKLAR" />
          
          {/* A - Ödenmiş Sermaye */}
          <SubSectionHeader letter="A" title="Ödenmiş Sermaye" total={paidCapitalTotal} />
          <DetailedRow code="500" label="Sermaye" value={equity.paidCapital} level={2} />
          <DetailedRow code="501" label="Ödenmemiş Sermaye (-)" value={(equity as any).unpaidCapital || 0} level={2} isNegative />
          
          {/* B - Sermaye Yedekleri */}
          <SubSectionHeader letter="B" title="Sermaye Yedekleri" total={0} />
          <DetailedRow code="520" label="Hisse Senetleri İhraç Primleri" value={0} level={2} />
          <DetailedRow code="521" label="Hisse Senedi İptal Karları" value={0} level={2} />
          <DetailedRow code="522" label="M.D.V.Yeniden Değerleme Artışları" value={0} level={2} />
          <DetailedRow code="523" label="İştirakler Yeniden Değ.Artışları" value={0} level={2} />
          <DetailedRow code="524" label="Maliyet Artışları Fonu" value={0} level={2} />
          <DetailedRow code="529" label="Diğer Sermaye Yedekleri" value={0} level={2} />
          
          {/* C - Kar Yedekleri */}
          <SubSectionHeader letter="C" title="Kar Yedekleri" total={profitReservesTotal} />
          <DetailedRow code="540" label="Yasal Yedekler" value={(equity as any).legalReserves || 0} level={2} />
          <DetailedRow code="541" label="Statü Yedekleri" value={0} level={2} />
          <DetailedRow code="542" label="Olağanüstü Yedekler" value={0} level={2} />
          <DetailedRow code="548" label="Diğer Kar Yedekleri" value={0} level={2} />
          <DetailedRow code="549" label="Özel Fonlar" value={0} level={2} />
          
          {/* D - Geçmiş Yıllar Karları */}
          <SubSectionHeader letter="D" title="Geçmiş Yıllar Karları" total={equity.retainedEarnings > 0 ? equity.retainedEarnings : 0} />
          <DetailedRow code="570" label="Geçmiş Yıllar Karları" value={equity.retainedEarnings > 0 ? equity.retainedEarnings : 0} level={2} />
          
          {/* E - Geçmiş Yıllar Zararları (-) */}
          <SubSectionHeader letter="E" title="Geçmiş Yıllar Zararları (-)" total={equity.retainedEarnings < 0 ? Math.abs(equity.retainedEarnings) : 0} />
          <DetailedRow code="580" label="Geçmiş Yıllar Zararları (-)" value={equity.retainedEarnings < 0 ? Math.abs(equity.retainedEarnings) : 0} level={2} isNegative />
          
          {/* F - Dönem Net Karı (Zararı) */}
          <SubSectionHeader letter="F" title="Dönem Net Karı (Zararı)" total={equity.currentProfit} />
          <DetailedRow code="590" label="Dönem Net Karı" value={equity.currentProfit >= 0 ? equity.currentProfit : 0} level={2} />
          <DetailedRow code="591" label="Dönem Net Zararı (-)" value={equity.currentProfit < 0 ? Math.abs(equity.currentProfit) : 0} level={2} isNegative />
          
          <DetailedRow 
            label="ÖZKAYNAKLAR TOPLAMI" 
            value={equity.total} 
            isSectionTotal 
          />
          
          <DetailedRow 
            label="PASİF (KAYNAKLAR) TOPLAMI" 
            value={totalLiabilities} 
            isMainTotal 
          />
        </CardContent>
      </Card>

      {/* NAZIM HESAPLAR */}
      <Card>
        <CardHeader className="py-2 bg-muted/50">
          <CardTitle className="text-center text-muted-foreground text-sm">
            NAZIM HESAPLAR
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 space-y-1 text-xs">
          <SectionHeader roman="IV" title="NAZIM HESAPLAR" />
          
          <SubSectionHeader letter="A" title="Borçlu Nazım Hesaplar" total={0} />
          <DetailedRow code="900" label="Verilen Teminatlar" value={0} level={2} />
          <DetailedRow code="910" label="Teminat Mektupları" value={0} level={2} />
          
          <SubSectionHeader letter="B" title="Alacaklı Nazım Hesaplar" total={0} />
          <DetailedRow code="920" label="Alınan Teminatlar" value={0} level={2} />
          <DetailedRow code="930" label="Teminat Mektubu Karşılıkları" value={0} level={2} />
          
          <DetailedRow 
            label="NAZIM HESAPLAR TOPLAMI" 
            value={0} 
            isSectionTotal 
          />
        </CardContent>
      </Card>
    </div>
  );
}
