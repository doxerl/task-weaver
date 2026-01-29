
## Kapsamlı Değerleme Motoru İmplementasyon Planı

### Genel Bakış

5 Yıllık Projeksiyon tablosuna **EBITDA** ve **EBITDA Multiple** kolonları ekleyeceğiz ve mevcut Revenue Multiple metoduna ek olarak **3 farklı değerleme yöntemi** entegre edeceğiz:

1. **Piyasa Çarpanları (Market Multiples)** - Sektör bazlı ciro/EBITDA çarpanları
2. **DCF (Discounted Cash Flow)** - İndirgenmiş nakit akışı analizi  
3. **VC Metodu** - Yatırımcı beklentisi bazlı değerleme

Bu 3 yöntemin **ağırlıklı ortalaması** ile final değerleme hesaplanacak.

---

### Mimari Değişiklikler

```text
┌─────────────────────────────────────────────────────────────────┐
│  YENİ DEĞERLEME MOTORU MİMARİSİ                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MultiYearProjection (genişletilmiş)                           │
│  ├── revenue, expenses, netProfit                              │
│  ├── ebitda (YENİ)                                             │
│  ├── ebitdaMargin (YENİ)                                       │
│  ├── freeCashFlow (YENİ - DCF için)                            │
│  │                                                             │
│  ├── valuations (YENİ - ağırlıklı değerleme)                   │
│  │   ├── revenueMultiple: Ciro x Çarpan                        │
│  │   ├── ebitdaMultiple: EBITDA x Çarpan                       │
│  │   ├── dcf: İndirgenmiş nakit akışı                          │
│  │   ├── vcMethod: Exit / ROI                                  │
│  │   └── weighted: Ağırlıklı ortalama                          │
│  │                                                             │
│  └── companyValuation → weighted değerden gelir                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 1. Tip Güncellemeleri

**Dosya: `src/types/simulation.ts`**

```typescript
// Yeni interface: Değerleme Çıktıları
interface ValuationBreakdown {
  revenueMultiple: number;    // Ciro x Çarpan
  ebitdaMultiple: number;     // EBITDA x Çarpan  
  dcf: number;                // İndirgenmiş FCF
  vcMethod: number;           // Exit Değeri / ROI
  weighted: number;           // Ağırlıklı ortalama
}

// MultiYearProjection genişletmesi
interface MultiYearProjection {
  // ... mevcut alanlar ...
  ebitda: number;             // YENİ: EBITDA
  ebitdaMargin: number;       // YENİ: EBITDA marjı (%)
  freeCashFlow: number;       // YENİ: Serbest nakit akışı
  valuations: ValuationBreakdown; // YENİ: Tüm değerleme metodları
}

// Değerleme konfigürasyonu
interface ValuationConfiguration {
  discountRate: number;        // DCF iskonto oranı (örn: 0.30)
  terminalGrowthRate: number;  // Terminal büyüme oranı (örn: 0.03)
  expectedROI: number;         // VC beklenen ROI (örn: 10x)
  weights: {                   // Ağırlıklar
    revenueMultiple: number;   // 0.30
    ebitdaMultiple: number;    // 0.25  
    dcf: number;               // 0.30
    vcMethod: number;          // 0.15
  };
}

// Sektör EBITDA çarpanları
const SECTOR_EBITDA_MULTIPLES: Record<string, number> = {
  'saas': 15,
  'fintech': 12,
  'ecommerce': 8,
  'marketplace': 10,
  'default': 10
};
```

---

### 2. Değerleme Hesaplama Fonksiyonları

**Dosya: `src/lib/valuationCalculator.ts` (YENİ)**

```typescript
// EBITDA hesaplama (basitleştirilmiş)
const calculateEBITDA = (
  revenue: number, 
  expenses: number
): number => {
  const operatingProfit = revenue - expenses;
  // EBITDA ≈ Operating Profit + %15 depreciation assumption
  return operatingProfit * 1.15; 
};

// Free Cash Flow (FCF) hesaplama
const calculateFCF = (
  ebitda: number,
  capexRatio: number = 0.10,  // Cironun %10'u CapEx
  revenue: number
): number => {
  const capex = revenue * capexRatio;
  const taxRate = 0.22; // Kurumlar vergisi
  return (ebitda * (1 - taxRate)) - capex;
};

// DCF Değerleme (5 yıllık FCF + Terminal Value)
const calculateDCFValuation = (
  fcfProjections: number[],
  discountRate: number,
  terminalGrowthRate: number
): number => {
  // 1. Her yılın FCF'ini bugüne indirgee
  let pvFCF = 0;
  fcfProjections.forEach((fcf, i) => {
    pvFCF += fcf / Math.pow(1 + discountRate, i + 1);
  });
  
  // 2. Terminal Value (Gordon Growth Model)
  const terminalFCF = fcfProjections[fcfProjections.length - 1];
  const terminalValue = (terminalFCF * (1 + terminalGrowthRate)) / 
                        (discountRate - terminalGrowthRate);
  const pvTerminal = terminalValue / Math.pow(1 + discountRate, 5);
  
  return pvFCF + pvTerminal;
};

// VC Metodu Değerleme
const calculateVCValuation = (
  projectedExitValue: number,
  expectedROI: number
): number => {
  return projectedExitValue / expectedROI;
};

// Ağırlıklı Değerleme
const calculateWeightedValuation = (
  valuations: Omit<ValuationBreakdown, 'weighted'>,
  weights: ValuationConfiguration['weights']
): number => {
  return (
    valuations.revenueMultiple * weights.revenueMultiple +
    valuations.ebitdaMultiple * weights.ebitdaMultiple +
    valuations.dcf * weights.dcf +
    valuations.vcMethod * weights.vcMethod
  );
};
```

---

### 3. Projeksiyon Fonksiyonu Güncelleme

**Dosya: `src/hooks/finance/useInvestorAnalysis.ts`**

`projectFutureRevenue` fonksiyonunu güncelleyeceğiz:

```typescript
export const projectFutureRevenue = (
  year1Revenue: number, 
  year1Expenses: number,
  growthConfig: GrowthConfiguration, 
  sectorMultiple: number,
  scenarioTargetYear?: number,
  valuationConfig: ValuationConfiguration = DEFAULT_VALUATION_CONFIG // YENİ
): { ... } => {
  const fcfProjections: number[] = [];
  
  for (let i = 1; i <= 5; i++) {
    // ... mevcut revenue/expense hesaplamaları ...
    
    // YENİ: EBITDA hesapla
    const ebitda = calculateEBITDA(revenue, expenses);
    const ebitdaMargin = (ebitda / revenue) * 100;
    
    // YENİ: FCF hesapla
    const fcf = calculateFCF(ebitda, 0.10, revenue);
    fcfProjections.push(fcf);
    
    // YENİ: Tüm değerleme metodları
    const ebitdaMultiple = SECTOR_EBITDA_MULTIPLES[sector] || 10;
    
    const valuations: ValuationBreakdown = {
      revenueMultiple: revenue * sectorMultiple,
      ebitdaMultiple: ebitda * ebitdaMultiple,
      dcf: 0, // Döngü sonunda hesaplanacak
      vcMethod: 0, // Döngü sonunda hesaplanacak
      weighted: 0
    };
    
    years.push({
      year: i,
      actualYear: scenarioYear + i,
      revenue,
      expenses,
      netProfit,
      cumulativeProfit,
      ebitda,        // YENİ
      ebitdaMargin,  // YENİ
      freeCashFlow: fcf, // YENİ
      valuations,    // YENİ
      companyValuation: valuations.revenueMultiple, // Geçici, sonra güncellenir
      appliedGrowthRate: effectiveGrowthRate,
      growthStage
    });
  }
  
  // Döngü sonrası: DCF ve VC değerlemelerini hesapla
  const dcfValue = calculateDCFValuation(
    fcfProjections, 
    valuationConfig.discountRate,
    valuationConfig.terminalGrowthRate
  );
  
  // Year 5 exit değeri üzerinden VC metodu
  const year5RevenueMultiple = years[4].valuations.revenueMultiple;
  const vcValue = calculateVCValuation(year5RevenueMultiple, valuationConfig.expectedROI);
  
  // Her yıl için weighted değerlemeyi güncelle
  years.forEach((year, i) => {
    // DCF ve VC değerlerini yıllar arasında dağıt
    const yearRatio = (i + 1) / 5;
    year.valuations.dcf = dcfValue * yearRatio;
    year.valuations.vcMethod = vcValue * yearRatio;
    year.valuations.weighted = calculateWeightedValuation(
      year.valuations, 
      valuationConfig.weights
    );
    year.companyValuation = year.valuations.weighted;
  });
  
  return { year3: years[2], year5: years[4], allYears: years };
};
```

---

### 4. UI Güncellemeleri

**Dosya: `src/components/simulation/InvestmentTab.tsx`**

5 Yıllık Projeksiyon tablosuna yeni kolonlar:

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Yıl</TableHead>
      <TableHead>Aşama</TableHead>
      <TableHead className="text-right">Büyüme</TableHead>
      <TableHead className="text-right">Gelir</TableHead>
      <TableHead className="text-right">EBITDA</TableHead>           {/* YENİ */}
      <TableHead className="text-right">EBITDA Marjı</TableHead>     {/* YENİ */}
      <TableHead className="text-right">Rev. Mult.</TableHead>       {/* YENİ */}
      <TableHead className="text-right">EBITDA Mult.</TableHead>     {/* YENİ */}
      <TableHead className="text-right">DCF</TableHead>              {/* YENİ */}
      <TableHead className="text-right">Değerleme (Ağırlıklı)</TableHead>
      <TableHead className="text-right">MOIC</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {exitPlan.allYears.map((year) => (
      <TableRow key={year.year}>
        <TableCell>{year.actualYear}</TableCell>
        <TableCell><Badge>...</Badge></TableCell>
        <TableCell className="text-right">+{...}%</TableCell>
        <TableCell className="text-right">{formatCompactUSD(year.revenue)}</TableCell>
        <TableCell className="text-right">{formatCompactUSD(year.ebitda)}</TableCell>
        <TableCell className="text-right">%{year.ebitdaMargin.toFixed(1)}</TableCell>
        <TableCell className="text-right text-muted-foreground">
          {formatCompactUSD(year.valuations.revenueMultiple)}
        </TableCell>
        <TableCell className="text-right text-muted-foreground">
          {formatCompactUSD(year.valuations.ebitdaMultiple)}
        </TableCell>
        <TableCell className="text-right text-muted-foreground">
          {formatCompactUSD(year.valuations.dcf)}
        </TableCell>
        <TableCell className="text-right font-mono font-bold">
          {formatCompactUSD(year.valuations.weighted)}
        </TableCell>
        <TableCell className="text-right"><Badge>{moic}x</Badge></TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

### 5. Değerleme Metodları Özet Kartı

**Yeni Bileşen: `ValuationMethodsCard.tsx`**

```tsx
<Card className="border-primary/20">
  <CardHeader>
    <CardTitle className="text-sm flex items-center gap-2">
      <Calculator className="h-4 w-4" />
      Değerleme Metodları Karşılaştırması
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-4 gap-3">
      {/* Revenue Multiple */}
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-center gap-2 mb-2">
          <BarChart className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-medium">Ciro Çarpanı</span>
        </div>
        <div className="text-lg font-bold text-blue-600">
          {formatCompactUSD(valuations.revenueMultiple)}
        </div>
        <div className="text-[10px] text-muted-foreground">
          Ciro x {sectorMultiple}x
        </div>
        <Badge className="mt-1 text-[10px]">Ağırlık: %30</Badge>
      </div>
      
      {/* EBITDA Multiple */}
      <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-purple-500" />
          <span className="text-xs font-medium">EBITDA Çarpanı</span>
        </div>
        <div className="text-lg font-bold text-purple-600">
          {formatCompactUSD(valuations.ebitdaMultiple)}
        </div>
        <div className="text-[10px] text-muted-foreground">
          EBITDA x {ebitdaMultiple}x
        </div>
        <Badge className="mt-1 text-[10px]">Ağırlık: %25</Badge>
      </div>
      
      {/* DCF */}
      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-medium">DCF</span>
        </div>
        <div className="text-lg font-bold text-emerald-600">
          {formatCompactUSD(valuations.dcf)}
        </div>
        <div className="text-[10px] text-muted-foreground">
          İskonto: %{(discountRate * 100).toFixed(0)}
        </div>
        <Badge className="mt-1 text-[10px]">Ağırlık: %30</Badge>
      </div>
      
      {/* VC Method */}
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Rocket className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-medium">VC Metodu</span>
        </div>
        <div className="text-lg font-bold text-amber-600">
          {formatCompactUSD(valuations.vcMethod)}
        </div>
        <div className="text-[10px] text-muted-foreground">
          Exit / {expectedROI}x ROI
        </div>
        <Badge className="mt-1 text-[10px]">Ağırlık: %15</Badge>
      </div>
    </div>
    
    {/* Weighted Result */}
    <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
      <div className="flex justify-between items-center">
        <span className="font-medium">Ağırlıklı Değerleme (5. Yıl)</span>
        <span className="text-2xl font-bold text-primary">
          {formatCompactUSD(valuations.weighted)}
        </span>
      </div>
    </div>
  </CardContent>
</Card>
```

---

### 6. Değerleme Konfigürasyon UI

Deal Configuration kartına yeni ayarlar eklenecek:

```tsx
{/* Discount Rate Slider */}
<div className="space-y-2">
  <Label className="text-xs">
    DCF İskonto Oranı: %{(valuationConfig.discountRate * 100).toFixed(0)}
  </Label>
  <Slider
    value={[valuationConfig.discountRate * 100]}
    onValueChange={([v]) => updateValuationConfig({ discountRate: v / 100 })}
    min={15}
    max={50}
    step={5}
  />
  <p className="text-[10px] text-muted-foreground">
    Startup risk: %30-40, Olgun şirket: %15-25
  </p>
</div>

{/* Expected ROI */}
<div className="space-y-2">
  <Label className="text-xs">
    VC Beklenen ROI: {valuationConfig.expectedROI}x
  </Label>
  <Slider
    value={[valuationConfig.expectedROI]}
    onValueChange={([v]) => updateValuationConfig({ expectedROI: v })}
    min={5}
    max={20}
    step={1}
  />
</div>
```

---

### Değiştirilecek / Oluşturulacak Dosyalar

| Dosya | İşlem |
|-------|-------|
| `src/types/simulation.ts` | Genişletme: MultiYearProjection, ValuationBreakdown, ValuationConfiguration |
| `src/lib/valuationCalculator.ts` | **YENİ**: EBITDA, DCF, VC, Weighted hesaplama fonksiyonları |
| `src/hooks/finance/useInvestorAnalysis.ts` | Güncelleme: projectFutureRevenue genişletmesi |
| `src/components/simulation/InvestmentTab.tsx` | Güncelleme: Tablo kolonları + ValuationMethodsCard |
| `src/components/simulation/ValuationMethodsCard.tsx` | **YENİ**: Değerleme metodları karşılaştırma kartı |
| `src/pages/finance/ScenarioComparisonPage.tsx` | Güncelleme: Yeni bileşeni entegre et |

---

### Varsayılan Değerler

```typescript
const DEFAULT_VALUATION_CONFIG: ValuationConfiguration = {
  discountRate: 0.30,           // %30 startup risk
  terminalGrowthRate: 0.03,     // %3 terminal büyüme
  expectedROI: 10,              // 10x VC beklentisi
  weights: {
    revenueMultiple: 0.30,      // Ciro çarpanı ağırlığı
    ebitdaMultiple: 0.25,       // EBITDA çarpanı ağırlığı
    dcf: 0.30,                  // DCF ağırlığı
    vcMethod: 0.15              // VC metodu ağırlığı
  }
};

const SECTOR_EBITDA_MULTIPLES: Record<string, number> = {
  'SaaS': 15,
  'Fintech': 12,
  'E-ticaret': 8,
  'Marketplace': 10,
  'B2B': 10,
  'B2C': 8,
  'default': 10
};
```

---

### Beklenen Sonuç

| Özellik | Önceki | Sonraki |
|---------|--------|---------|
| Değerleme metodu | Sadece Revenue Multiple | 4 metot + ağırlıklı ortalama |
| EBITDA görünürlüğü | Yok | Tablo + marj gösterimi |
| DCF analizi | Yok | Tam NPV hesaplaması |
| VC perspektifi | Yok | Exit/ROI bazlı değerleme |
| Konfigürasyon | Sektör çarpanı | İskonto, ROI, ağırlıklar ayarlanabilir |
