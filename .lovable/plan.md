
## Çok Yıllı Yatırım Simülatörü - Yıl Bağımlı Sermaye Hesaplama Planı

### Problem Analizi

Mevcut sistem tek yıl için yatırım ihtiyacı hesaplıyor. Kullanıcının istediği:

```text
┌─────────────────────────────────────────────────────────────────┐
│  ÖNCEKİ YIL AKIŞI (2026)                                       │
├─────────────────────────────────────────────────────────────────┤
│  • Yatırım Alındı: $150K                                       │
│  • Yıl Sonu Kar: $33.9K                                        │
│  • Devir Edilecek: $33.9K (2027'ye açılış bakiyesi)            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SONRAKI YIL HESAPLAMASI (2027)                                │
├─────────────────────────────────────────────────────────────────┤
│  • Hedef Gelir: $700K                                          │
│  • Toplam Gider: $460K                                         │
│  • Brüt Açık: $460K - $700K = -$240K (kar) veya $0             │
│                                                                 │
│  ANCAK çeyreklik nakit akışı düzensiz:                         │
│  ├── Q1-Q2: Personel sabit harcıyor → Nakit çıkışı             │
│  ├── Gelir Q3-Q4'te yoğunlaşabilir                             │
│  └── Ara dönem sermaye ihtiyacı: ~$250K                        │
│                                                                 │
│  2027 Sermaye İhtiyacı = Q1-Q2 Açığı - Devir Kar               │
│  Örnek: $250K - $33.9K = $216.1K ek yatırım gerekli            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  5 YILLIK PROJEKSİYON (CANLI VERİ AKIŞI)                       │
├─────────────────────────────────────────────────────────────────┤
│  Yıl  │ Açılış │ Gelir │ Gider │ Net │ Sermaye İhtiyacı        │
│  ─────┼────────┼───────┼───────┼─────┼─────────────────        │
│  2026 │ $0     │ $308K │ $273K │ $34K│ $150K (ilk yatırım)     │
│  2027 │ $34K   │ $700K │ $460K │$240K│ $216K (ara dönem)       │
│  2028 │ $274K  │ $1.1M │ $680K │$420K│ $0 (kendi kendini fin.) │
│  2029 │ $694K  │ $1.6M │ $880K │$720K│ $0                      │
│  2030 │ $1.4M  │ $2.1M │ $1.1M │$1M  │ $0                      │
│  ─────┴────────┴───────┴───────┴─────┴─────────────────        │
│  Ağırlıklı Değerleme: $2.7M (DCF + EBITDA + Revenue + VC)      │
└─────────────────────────────────────────────────────────────────┘
```

---

### Teknik Değişiklikler

#### 1. Yeni Tip: MultiYearCapitalPlan

**Dosya:** `src/types/simulation.ts`

```typescript
/** Çok yıllı sermaye planı */
export interface MultiYearCapitalPlan {
  years: YearCapitalRequirement[];
  totalRequiredInvestment: number;
  cumulativeEndingCash: number;
  selfSustainingFromYear: number | null;
}

/** Tek yıl sermaye ihtiyacı detayı */
export interface YearCapitalRequirement {
  year: number;
  openingCash: number;           // Önceki yıldan devir
  projectedRevenue: number;
  projectedExpenses: number;
  projectedNetProfit: number;
  quarterlyDeficit: {            // Çeyreklik nakit açıkları
    q1: number;
    q2: number;
    q3: number;
    q4: number;
  };
  peakDeficit: number;           // Death Valley (en derin açık)
  peakDeficitQuarter: string;    // Hangi çeyrekte
  requiredCapital: number;       // Bu yıl gereken ek sermaye
  endingCash: number;            // Yıl sonu bakiye
  isSelfSustaining: boolean;     // Kendi kendini finanse ediyor mu
  weightedValuation: number;     // Ağırlıklı değerleme (DCF+EBITDA vb)
}
```

---

#### 2. Yeni Hesaplama Fonksiyonu: calculateMultiYearCapitalNeeds

**Dosya:** `src/hooks/finance/useInvestorAnalysis.ts`

Bu fonksiyon 5 yıllık projeksiyon üzerinden yıl bazlı sermaye ihtiyacını hesaplayacak:

```typescript
export const calculateMultiYearCapitalNeeds = (
  exitPlan: ExitPlan,
  year1Investment: number,      // 1. yıl alınan yatırım
  year1NetProfit: number,       // 1. yıl net kar
  quarterlyDataByYear?: Map<number, QuarterlyData>  // Opsiyonel çeyreklik veri
): MultiYearCapitalPlan => {
  const years: YearCapitalRequirement[] = [];
  let carryForwardCash = year1NetProfit;  // Devir nakit
  let totalRequiredInvestment = year1Investment;
  let selfSustainingFromYear: number | null = null;
  
  exitPlan.allYears?.forEach((yearProjection, index) => {
    const year = yearProjection.actualYear;
    const openingCash = index === 0 ? year1NetProfit : carryForwardCash;
    
    // Çeyreklik nakit akışı simülasyonu
    // Giderler sabit dağılım, gelirler arka çeyreklere yoğun varsayımı
    const quarterlyRevenue = {
      q1: yearProjection.revenue * 0.15,  // Q1: %15
      q2: yearProjection.revenue * 0.20,  // Q2: %20
      q3: yearProjection.revenue * 0.30,  // Q3: %30
      q4: yearProjection.revenue * 0.35,  // Q4: %35
    };
    
    const quarterlyExpense = {
      q1: yearProjection.expenses * 0.25,  // Sabit dağılım
      q2: yearProjection.expenses * 0.25,
      q3: yearProjection.expenses * 0.25,
      q4: yearProjection.expenses * 0.25,
    };
    
    // Çeyreklik kümülatif nakit akışı
    let cumulative = openingCash;
    let peakDeficit = 0;
    let peakDeficitQuarter = 'Q1';
    const quarterlyDeficit = { q1: 0, q2: 0, q3: 0, q4: 0 };
    
    ['q1', 'q2', 'q3', 'q4'].forEach((q, i) => {
      const netFlow = quarterlyRevenue[q] - quarterlyExpense[q];
      cumulative += netFlow;
      
      if (cumulative < peakDeficit) {
        peakDeficit = cumulative;
        peakDeficitQuarter = `Q${i + 1}`;
      }
      
      quarterlyDeficit[q] = cumulative < 0 ? Math.abs(cumulative) : 0;
    });
    
    // Bu yıl gereken ek sermaye
    const requiredCapital = peakDeficit < 0 
      ? Math.abs(peakDeficit) * 1.20  // %20 güvenlik marjı
      : 0;
    
    // Yıl sonu bakiye
    const endingCash = openingCash + yearProjection.netProfit;
    
    // Kendi kendini finanse ediyor mu?
    const isSelfSustaining = peakDeficit >= 0;
    if (isSelfSustaining && selfSustainingFromYear === null) {
      selfSustainingFromYear = year;
    }
    
    years.push({
      year,
      openingCash,
      projectedRevenue: yearProjection.revenue,
      projectedExpenses: yearProjection.expenses,
      projectedNetProfit: yearProjection.netProfit,
      quarterlyDeficit,
      peakDeficit,
      peakDeficitQuarter,
      requiredCapital,
      endingCash,
      isSelfSustaining,
      weightedValuation: yearProjection.valuations?.weighted || yearProjection.companyValuation,
    });
    
    // Bir sonraki yıla devir
    carryForwardCash = endingCash;
    totalRequiredInvestment += requiredCapital;
  });
  
  return {
    years,
    totalRequiredInvestment,
    cumulativeEndingCash: carryForwardCash,
    selfSustainingFromYear,
  };
};
```

---

#### 3. UI Güncellemesi: InvestmentTab.tsx

5 Yıllık Projeksiyon tablosuna yeni kolonlar eklenecek:

```tsx
{/* 5 Yıllık Sermaye Planı Tablosu - Güncellenmiş */}
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Yıl</TableHead>
      <TableHead className="text-right">Açılış</TableHead>      {/* YENİ */}
      <TableHead className="text-right">Gelir</TableHead>
      <TableHead className="text-right">Gider</TableHead>
      <TableHead className="text-right">Net Kar</TableHead>
      <TableHead className="text-right">Death Valley</TableHead> {/* YENİ */}
      <TableHead className="text-right">Sermaye İhtiyacı</TableHead> {/* YENİ */}
      <TableHead className="text-right">Yıl Sonu</TableHead>    {/* YENİ */}
      <TableHead className="text-right">Değerleme</TableHead>
      <TableHead className="text-right">MOIC</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {multiYearPlan.years.map((year, i) => (
      <TableRow key={year.year}>
        <TableCell>{year.year}</TableCell>
        <TableCell className="text-right text-muted-foreground">
          {formatCompactUSD(year.openingCash)}
        </TableCell>
        <TableCell className="text-right">
          {formatCompactUSD(year.projectedRevenue)}
        </TableCell>
        <TableCell className="text-right">
          {formatCompactUSD(year.projectedExpenses)}
        </TableCell>
        <TableCell className="text-right">
          {formatCompactUSD(year.projectedNetProfit)}
        </TableCell>
        <TableCell className="text-right">
          {year.peakDeficit < 0 ? (
            <span className="text-red-500">
              {formatCompactUSD(year.peakDeficit)} ({year.peakDeficitQuarter})
            </span>
          ) : (
            <span className="text-emerald-500">-</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          {year.requiredCapital > 0 ? (
            <Badge variant="outline" className="text-amber-500">
              {formatCompactUSD(year.requiredCapital)}
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/20 text-emerald-400">
              Yok
            </Badge>
          )}
        </TableCell>
        <TableCell className="text-right font-mono">
          {formatCompactUSD(year.endingCash)}
        </TableCell>
        <TableCell className="text-right font-mono font-bold text-primary">
          {formatCompactUSD(year.weightedValuation)}
        </TableCell>
        <TableCell>
          <Badge>{moic.toFixed(1)}x</Badge>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

#### 4. Yatırım Anlaşması Simülatörü Güncelleme

"Önerilen" yatırım miktarı artık yıl bazlı hesaplanacak:

```tsx
{/* Yatırım Tutarı Input Alanı - Güncellenmiş */}
<div className="space-y-2">
  <Label className="text-xs">Yatırım Tutarı</Label>
  <Input
    type="number"
    value={dealConfig.investmentAmount}
    onChange={(e) => onDealConfigChange({ investmentAmount: Number(e.target.value) })}
  />
  
  {/* Yıl bazlı öneri */}
  <div className="text-xs space-y-1">
    <p className="text-muted-foreground">
      <strong>{scenarioTargetYear}:</strong> {formatCompactUSD(multiYearPlan.years[0]?.requiredCapital || 0)}
      <span className="ml-1 text-[10px]">(ilk yıl sermaye)</span>
    </p>
    {multiYearPlan.years[1]?.requiredCapital > 0 && (
      <p className="text-amber-500">
        <strong>{scenarioTargetYear + 1}:</strong> {formatCompactUSD(multiYearPlan.years[1].requiredCapital)}
        <span className="ml-1 text-[10px]">(ek sermaye gerekli)</span>
      </p>
    )}
    {multiYearPlan.selfSustainingFromYear && (
      <p className="text-emerald-500">
        <CheckCircle2 className="inline h-3 w-3 mr-1" />
        {multiYearPlan.selfSustainingFromYear}'dan itibaren kendi kendini finanse ediyor
      </p>
    )}
  </div>
</div>
```

---

#### 5. Veri Akışı Diyagramı

```text
┌─────────────────────────────────────────────────────────────────┐
│  VERİ AKIŞI                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  calculateExitPlan()                                           │
│  └── allYears[0..4] = { revenue, expenses, netProfit,          │
│                         valuations: { weighted } }              │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  calculateMultiYearCapitalNeeds(exitPlan, investmentY1, profitY1)
│  └── years[0..4] = {                                           │
│        openingCash: previousYear.endingCash,                   │
│        quarterlyDeficit: { q1, q2, q3, q4 },                   │
│        peakDeficit: min(cumulative),                           │
│        requiredCapital: abs(peakDeficit) * 1.20,               │
│        endingCash: openingCash + netProfit,                    │
│        weightedValuation: valuations.weighted                  │
│      }                                                         │
│                                                                 │
│  ↓                                                              │
│                                                                 │
│  InvestmentTab UI                                               │
│  ├── "Önerilen" input = multiYearPlan.years[0].requiredCapital │
│  ├── 5Y Tablo: Açılış | Gelir | Gider | Net | DV | Sermaye    │
│  └── Uyarı: "2028'den itibaren ek sermaye gerekmez"           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Değiştirilecek / Oluşturulacak Dosyalar

| Dosya | İşlem |
|-------|-------|
| `src/types/simulation.ts` | Yeni tipler: MultiYearCapitalPlan, YearCapitalRequirement |
| `src/hooks/finance/useInvestorAnalysis.ts` | Yeni fonksiyon: calculateMultiYearCapitalNeeds |
| `src/components/simulation/InvestmentTab.tsx` | Tablo güncelleme: Açılış, Death Valley, Sermaye İhtiyacı kolonları |

---

### Örnek Hesaplama

**Girdi:**
- 2026 Yatırım: $150K
- 2026 Net Kar: $33.9K
- 2027 Gelir: $700K, Gider: $460K

**Çeyreklik Dağılım (2027):**

| Çeyrek | Gelir | Gider | Net | Kümülatif |
|--------|-------|-------|-----|-----------|
| Açılış | - | - | - | $33.9K |
| Q1 | $105K | $115K | -$10K | $23.9K |
| Q2 | $140K | $115K | +$25K | $48.9K |
| Q3 | $210K | $115K | +$95K | $143.9K |
| Q4 | $245K | $115K | +$130K | $273.9K |

**Sonuç:**
- 2027 Death Valley: $23.9K (Q1'de en düşük, ama hala pozitif)
- 2027 Sermaye İhtiyacı: $0 (açılış bakiyesi yeterli)
- 2027 Yıl Sonu: $273.9K
- Kendi Kendini Finanse Etme: 2027'den itibaren ✅

**Ancak daha agresif büyüme senaryosunda:**

| Çeyrek | Gelir | Gider | Net | Kümülatif |
|--------|-------|-------|-----|-----------|
| Açılış | - | - | - | $33.9K |
| Q1 | $70K | $150K | -$80K | -$46.1K ❌ |
| Q2 | $100K | $150K | -$50K | -$96.1K ❌ |
| Q3 | $180K | $150K | +$30K | -$66.1K |
| Q4 | $350K | $150K | +$200K | $133.9K |

**Sonuç:**
- 2027 Death Valley: -$96.1K (Q2'de)
- 2027 Sermaye İhtiyacı: $96.1K × 1.20 = **$115.3K**
- 2027 Yıl Sonu: $133.9K

---

### Beklenen Sonuç

| Özellik | Önceki | Sonraki |
|---------|--------|---------|
| Sermaye hesaplama | Tek yıl | 5 yıl bağımlı |
| Devir kar | Yok | Önceki yıldan otomatik |
| Çeyreklik death valley | Yok | Her yıl için hesaplanıyor |
| Ek yatırım önerisi | Sabit | Yıl bazlı dinamik |
| Self-sustaining uyarısı | Yok | "X yılından itibaren" |
