

# Finansal Modelleme Düzeltme Planı: Yatırımcı Kalitesine Geçiş

Bu plan, paylaşılan 12 kritik sorunun çözümünü ve eksik 8 modülün eklenmesini kapsayan kapsamlı bir yol haritasıdır.

---

## Faz 1: Kritik Formül Düzeltmeleri (Öncelik: Acil)

### 1.1 Net Nakit Akışı İşaret Hatası Düzeltmesi

**Sorun:** `useAdvancedCapitalAnalysis.ts` satır 171 ve 258'de:
```typescript
const netCashFlow = revenue - expense - investment;
```

**Analiz:**
- Mevcut kodda "investment" = CapEx/büyüme yatırımı (nakit çıkışı) olarak kullanılıyor
- Bu durumda formül doğru, ancak terminoloji belirsiz
- Funding inflow (yatırımcı parası) geldiğinde bu pozitif olmalı

**Çözüm:**
1. `InvestmentItem` tipini ikiye ayır:
   - `capitalExpenditure` (CapEx) - nakit çıkışı
   - `fundingInflow` - yatırımcı girişi (nakit girişi)

2. Formül düzeltmesi:
```typescript
// ÖNCE (belirsiz)
const netCashFlow = revenue - expense - investment;

// SONRA (net)
const operatingCashFlow = revenue - expense - cogs;
const netCashFlow = operatingCashFlow - capex + fundingInflow;
```

**Dosyalar:**
- `src/types/simulation.ts` - Yeni tipler ekle
- `src/hooks/finance/useAdvancedCapitalAnalysis.ts` - Formül güncelle
- `src/components/simulation/QuarterlyChart.tsx` - Ayrımı yansıt

---

### 1.2 EBITDA Formülü Düzeltmesi

**Sorun:** `PdfValuationPage.tsx` satır 44:
```typescript
const ebitda = netProfit * 1.15; // YANLIŞ!
```

**Analiz:**
- EBITDA = Revenue - COGS - Opex (D&A hariç)
- Net Profit'e %15 eklemek kavramsal olarak yanlış
- `valuationCalculator.ts`'deki `calculateEBITDA` fonksiyonu doğru: `return revenue - expenses`

**Çözüm:**
```typescript
// ÖNCE
const ebitda = netProfit * 1.15;

// SONRA
// EBITDA = Revenue - Expenses (zaten calculateEBITDA'da doğru)
import { calculateEBITDA } from '@/lib/valuationCalculator';
const ebitda = calculateEBITDA(revenue, expenses);
```

**Dosyalar:**
- `src/components/simulation/pdf/PdfValuationPage.tsx` - Düzelt
- Tüm EBITDA kullanımlarını `calculateEBITDA` ile standartlaştır

---

### 1.3 Kapanış Nakit = Açılış + Net Kâr Hatası

**Sorun:** Bazı hesaplamalarda net kâr, nakit akışı ile karıştırılıyor.

**Analiz:**
- `useAdvancedCapitalAnalysis.ts` satır 172: `const closingBalance = openingBalance + netCashFlow;` ✓ DOĞRU
- Ancak bazı bileşenlerde "profit" yerine "cash" kullanılıyor

**Çözüm:**
- Tüm `closingBalance` hesaplamalarını kontrol et
- Terminolojiyi netleştir: `netCashFlow` vs `netProfit`

---

### 1.4 Negatif EBITDA Durumunda Değerleme

**Mevcut Durum:** `valuationCalculator.ts` satır 351-368'de zaten handle ediliyor ✓

```typescript
// EBITDA negatifse ağırlığı diğer metodlara dağıt
if (valuations.ebitdaMultiple <= 0) {
  const redistributeWeight = adjustedWeights.ebitdaMultiple;
  adjustedWeights.ebitdaMultiple = 0;
  // ... ağırlık yeniden dağıtımı
}
```

**İyileştirme:** UI'da bu durumu açıkça göster
- "EBITDA negatif olduğu için bu metod devre dışı" uyarısı ekle

---

### 1.5 DCF Vergi Düzeltmesi

**Mevcut Durum:** `valuationCalculator.ts` satır 279-283'te zaten handle ediliyor ✓

```typescript
// CRITICAL: If EBITDA is negative, effective tax rate is 0
const effectiveTaxRate = ebitda > 0 ? taxRate : 0;
```

**Eksik:** Working capital change (ΔNWC)

**Çözüm:**
```typescript
// SONRA
const calculateFCF = (
  ebitda: number,
  revenue: number,
  capexRatio: number,
  taxRate: number,
  previousRevenue?: number, // ΔNWC hesabı için
  nwcPercentage: number = 0.10 // Gelirin %10'u NWC
): number => {
  const capex = revenue * capexRatio;
  const effectiveTaxRate = ebitda > 0 ? taxRate : 0;
  
  // NET WORKING CAPITAL DEĞİŞİMİ (yeni)
  const nwcCurrent = revenue * nwcPercentage;
  const nwcPrevious = (previousRevenue || revenue) * nwcPercentage;
  const deltaNWC = nwcCurrent - nwcPrevious;

  return (ebitda * (1 - effectiveTaxRate)) - capex - deltaNWC;
};
```

---

## Faz 2: Terminoloji ve UI Düzeltmeleri

### 2.1 "Quarterly Capital Table" → "Operating Plan & Cash Flow"

**Sorun:** "Capital Table" yatırımcı jargonunda hisse dağılımı tablosudur.

**Çözüm:**
1. Bileşen adını değiştir: `QuarterlyCapitalTable.tsx` → `QuarterlyCashFlowTable.tsx`
2. i18n anahtarlarını güncelle:
```json
// simulation.json
{
  "quarterlyTable": {
    "title": "Çeyreklik Operasyonel Plan ve Nakit Akışı"
  }
}
```

**Dosyalar:**
- `src/components/simulation/QuarterlyCapitalTable.tsx` - Yeniden adlandır
- `src/i18n/locales/*/simulation.json` - Çevirileri güncelle

---

### 2.2 Dilution (Seyreltme) Modellemesi

**Mevcut Durum:** Zaten implement edilmiş! ✓

`src/types/simulation.ts` satır 311-401:
- `DilutionConfiguration` interface
- `calculateOwnershipAtExit` fonksiyonu
- `calculateExitProceeds` fonksiyonu (waterfall dahil)

`src/lib/valuationService.ts` satır 306-361:
- `calculateMOICWithDilution` fonksiyonu

**Eksik:** UI'da dilution ayarlarını gösterme

**Çözüm:**
```typescript
// DealSimulatorCard.tsx'e ekle
<div className="space-y-2">
  <Label>Beklenen Gelecek Turlar</Label>
  <Slider
    value={[dilutionConfig.expectedFutureRounds]}
    onValueChange={([v]) => setDilutionConfig({ ...dilutionConfig, expectedFutureRounds: v })}
    min={0}
    max={4}
    step={1}
  />
  <p className="text-xs">
    Exit'te Tahmini Sahiplik: {ownershipAtExit.toFixed(1)}%
  </p>
</div>
```

---

## Faz 3: Gider Modeli İyileştirmesi

### 3.1 Fixed + Variable Gider Ayrımı

**Mevcut Durum:** `useAdvancedCapitalAnalysis.ts` satır 27-36'da temel ayrım var ✓

```typescript
const FIXED_EXPENSE_CATEGORIES = [
  'Personel', 'Kira', 'Muhasebe', 'Yazılım', 'Abonelik', ...
];
```

**Eksik:**
- Variable expenses COGS ile ilişkilendirilmemiş
- Sensitivity analizinde gider sabit tutuluyor

**Çözüm:**
```typescript
// Yeni tip: expense_type
interface EnhancedExpenseItem extends ProjectionItem {
  expenseType: 'fixed' | 'variable' | 'semi-variable';
  elasticity: number; // 0 = tamamen sabit, 1 = gelirle 1:1 değişken
  linkedToRevenue: boolean; // COGS için true
}

// Sensitivity hesaplaması
const calculateSensitivityExpense = (
  baseExpense: number,
  revenueChange: number,
  expenses: EnhancedExpenseItem[]
) => {
  let adjustedExpense = 0;
  expenses.forEach(exp => {
    const change = revenueChange * exp.elasticity;
    adjustedExpense += exp.baseAmount * (1 + change);
  });
  return adjustedExpense;
};
```

**Dosyalar:**
- `src/types/simulation.ts` - `EnhancedExpenseItem` ekle
- `src/hooks/finance/useAdvancedCapitalAnalysis.ts` - Gider hesaplamasını güncelle
- `src/components/simulation/SensitivityTable.tsx` - Variable expense desteği

---

### 3.2 COGS Modeli

**Mevcut Durum:** COGS ayrı modellenmemiş.

**Çözüm:**
```typescript
// constants/simulation.ts'e ekle
export const DEFAULT_GROSS_MARGIN = {
  SAAS: 0.75,      // %75 gross margin
  SERVICES: 0.55,  // %55 gross margin
  ECOMMERCE: 0.30, // %30 gross margin
  PRODUCT: 0.60,   // %60 gross margin
} as const;

// Quarterly gider hesabı
const calculateQuarterlyExpenses = (
  quarterlyRevenue: QuarterlyAmounts,
  fixedExpenses: number,
  grossMargin: number
) => {
  const quarterlyFixed = fixedExpenses / 4;
  return {
    q1: quarterlyFixed + (quarterlyRevenue.q1 * (1 - grossMargin)),
    q2: quarterlyFixed + (quarterlyRevenue.q2 * (1 - grossMargin)),
    q3: quarterlyFixed + (quarterlyRevenue.q3 * (1 - grossMargin)),
    q4: quarterlyFixed + (quarterlyRevenue.q4 * (1 - grossMargin)),
  };
};
```

---

## Faz 4: J-Curve Parametrelendirme

**Mevcut Durum:** `constants/simulation.ts` satır 122-133'te sektör bazlı J-Curve var ✓

```typescript
export const SECTOR_J_CURVES = {
  SAAS: { q1: 0.10, q2: 0.25, q3: 0.65, q4: 1.00 },
  SERVICES: { q1: 0.20, q2: 0.45, q3: 0.75, q4: 1.00 },
  PRODUCT: { q1: 0.05, q2: 0.15, q3: 0.50, q4: 1.00 },
  ECOMMERCE: { q1: 0.25, q2: 0.40, q3: 0.60, q4: 1.00 },
};
```

**Eksik:** UI'da seçim yapılabilir olmalı

**Çözüm:**
- Senaryo oluşturma formuna "İş Modeli" seçici ekle
- Seçime göre J-Curve otomatik ayarlansın

---

## Faz 5: Investment Tier Düzeltmesi

**Mevcut Durum:** `src/types/simulation.ts` satır 434-442'de tier yapısı var

**Sorun:** "2 yıllık kombine death valley" runway'ı yanlış temsil edebilir

**Çözüm:**
```typescript
// Daha doğru tier hesabı
const calculateInvestmentTiers = (
  monthlyBurn: number,
  currentCash: number,
  minCashBuffer: number = 3 // ay
): InvestmentTier[] => {
  return [
    {
      tier: 'minimum',
      label: 'Hayatta Kalma',
      runwayMonths: 12,
      amount: Math.max(0, (monthlyBurn * 12) + (monthlyBurn * minCashBuffer) - currentCash),
      safetyMargin: 0.15,
      description: '12 ay runway + 3 ay buffer'
    },
    {
      tier: 'recommended',
      label: 'Büyüme',
      runwayMonths: 18,
      amount: Math.max(0, (monthlyBurn * 18) + (monthlyBurn * 6) - currentCash),
      safetyMargin: 0.25,
      description: '18 ay runway + milestone bütçesi'
    },
    {
      tier: 'aggressive',
      label: 'Ölçeklendirme',
      runwayMonths: 24,
      amount: Math.max(0, (monthlyBurn * 24) + (monthlyBurn * 6) - currentCash),
      safetyMargin: 0.50,
      description: '24 ay runway + hiring plan'
    }
  ];
};
```

---

## Faz 6: Yeni Modüller (Eksik 8 Parça)

### 6.1 Gerçek Cap Table Modülü (Yeni)

```typescript
// types/capTable.ts
interface CapTableEntry {
  shareholderName: string;
  shareholderType: 'founder' | 'investor' | 'esop' | 'advisor';
  sharesOwned: number;
  ownershipPercentage: number;
  investmentAmount?: number;
  vestingSchedule?: VestingSchedule;
}

interface CapTable {
  totalShares: number;
  fullyDilutedShares: number;
  entries: CapTableEntry[];
  esopPool: {
    allocated: number;
    unallocated: number;
    total: number;
  };
}
```

### 6.2 Use of Funds Paneli (Yeni)

```typescript
interface UseOfFunds {
  product: { amount: number; percentage: number; milestones: string[] };
  marketing: { amount: number; percentage: number; milestones: string[] };
  hiring: { amount: number; percentage: number; headcount: number };
  operations: { amount: number; percentage: number; };
  reserve: { amount: number; percentage: number; };
}
```

### 6.3 Unit Economics Paneli (Yeni)

```typescript
interface UnitEconomics {
  cac: number;              // Customer Acquisition Cost
  ltv: number;              // Lifetime Value
  ltvCacRatio: number;      // LTV:CAC (hedef: >3)
  paybackMonths: number;    // CAC payback period
  grossMargin: number;      // Gross margin %
  netRevenueRetention: number; // NRR % (hedef: >100%)
  burnMultiple: number;     // Net Burn / Net New ARR
  magicNumber: number;      // (New ARR Q) / (S&M Q-1)
}
```

### 6.4 Assumptions Console (Yeni)

Tüm varsayımların tek yerden yönetimi:

```typescript
interface AssumptionsConsole {
  growth: {
    revenueGrowthRate: number;
    expenseElasticity: number;
    jCurveProfile: 'saas' | 'services' | 'product' | 'ecommerce' | 'custom';
  };
  valuation: {
    sectorMultiple: number;
    ebitdaMultiple: number;
    discountRate: number;
    terminalGrowth: number;
    weights: ValuationWeights;
  };
  dilution: DilutionConfiguration;
  taxAndCompliance: {
    corporateTaxRate: number;
    vatRate: number;
    effectiveTaxRate: number;
  };
}
```

---

## Uygulama Yol Haritası

```text
+---------------------------------------------------------------+
| FAZ 1: Kritik Formül Düzeltmeleri (1-2 hafta)                 |
+---------------------------------------------------------------+
| - Net Nakit Akışı işaret düzeltmesi                           |
| - EBITDA formülü standartlaştırma                             |
| - DCF'e ΔNWC ekleme                                           |
| - Negatif EBITDA UI uyarısı                                   |
+---------------------------------------------------------------+
                              |
                              v
+---------------------------------------------------------------+
| FAZ 2: Terminoloji ve UI (1 hafta)                            |
+---------------------------------------------------------------+
| - QuarterlyCapitalTable → QuarterlyCashFlowTable              |
| - i18n güncellemeleri                                         |
| - Dilution ayarları UI'a ekleme                               |
+---------------------------------------------------------------+
                              |
                              v
+---------------------------------------------------------------+
| FAZ 3: Gider Modeli (1-2 hafta)                               |
+---------------------------------------------------------------+
| - Fixed + Variable ayrımı                                     |
| - COGS modeli                                                 |
| - Sensitivity'de dinamik gider                                |
+---------------------------------------------------------------+
                              |
                              v
+---------------------------------------------------------------+
| FAZ 4-5: Parametreler ve Tier'lar (1 hafta)                   |
+---------------------------------------------------------------+
| - J-Curve sektör seçimi UI                                    |
| - Investment Tier runway bazlı hesaplama                      |
+---------------------------------------------------------------+
                              |
                              v
+---------------------------------------------------------------+
| FAZ 6: Yeni Modüller (2-3 hafta)                              |
+---------------------------------------------------------------+
| - Cap Table modülü                                            |
| - Use of Funds paneli                                         |
| - Unit Economics paneli                                       |
| - Assumptions Console                                         |
+---------------------------------------------------------------+
```

---

## Dosya Değişiklikleri Özeti

| Dosya | İşlem | Öncelik |
|-------|-------|---------|
| `src/hooks/finance/useAdvancedCapitalAnalysis.ts` | Formül düzelt, COGS ekle | Kritik |
| `src/lib/valuationCalculator.ts` | ΔNWC ekle | Kritik |
| `src/components/simulation/pdf/PdfValuationPage.tsx` | EBITDA düzelt | Kritik |
| `src/components/simulation/QuarterlyCapitalTable.tsx` | Yeniden adlandır | Orta |
| `src/components/simulation/DealSimulatorCard.tsx` | Dilution UI ekle | Orta |
| `src/components/simulation/SensitivityTable.tsx` | Variable expense | Orta |
| `src/types/simulation.ts` | Yeni tipler ekle | Orta |
| `src/constants/simulation.ts` | Gross margin, J-Curve params | Düşük |
| `src/types/capTable.ts` (YENİ) | Cap Table modülü | Yeni |
| `src/types/unitEconomics.ts` (YENİ) | Unit Economics | Yeni |
| `src/components/simulation/CapTableCard.tsx` (YENİ) | UI bileşeni | Yeni |
| `src/components/simulation/UnitEconomicsPanel.tsx` (YENİ) | UI bileşeni | Yeni |
| `src/components/simulation/AssumptionsConsole.tsx` (YENİ) | Varsayımlar paneli | Yeni |

---

## Teknik Notlar

### Mevcut Kodda Doğru Olanlar
1. EBITDA hesabı `valuationCalculator.ts`'de doğru
2. Negatif EBITDA ağırlık redistribüsyonu mevcut
3. Vergi = 0 (negatif EBITDA) mevcut
4. Dilution modeli tam implement edilmiş
5. Sektör bazlı J-Curve'ler tanımlı
6. Stage-based valuation weights mevcut

### Düzeltme Gereken Yerler
1. `PdfValuationPage.tsx`'de `netProfit * 1.15` hatası
2. Investment vs CapEx terminoloji belirsizliği
3. Sensitivity'de sabit gider varsayımı
4. Working capital change (ΔNWC) eksik
5. UI'da dilution ayarları gösterilmiyor

---

## Tahmini Süre

| Faz | Süre |
|-----|------|
| Faz 1: Kritik Formüller | 5-7 gün |
| Faz 2: Terminoloji/UI | 3-4 gün |
| Faz 3: Gider Modeli | 5-7 gün |
| Faz 4-5: Parametreler | 3-4 gün |
| Faz 6: Yeni Modüller | 10-15 gün |
| **Toplam** | **4-6 hafta** |

---

## Başarı Kriterleri

1. Net Nakit Akışı formülü terminolojik olarak net
2. EBITDA her yerde tutarlı hesaplanıyor
3. Sensitivity'de giderler dinamik değişiyor
4. Death Valley ve Runway doğru hesaplanıyor
5. MOIC dilution ile gerçekçi
6. Cap Table modülü çalışıyor
7. Unit Economics paneli görüntüleniyor
8. Tüm varsayımlar tek yerden yönetilebiliyor

