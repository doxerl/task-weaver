

## Bilimsel Finansal Modelleme ile AI Prompt Güncellemesi

### Mevcut Durum

Prompt şu anda keyfi büyüme oranları kullanıyor:
- Odak proje: %50-100 (neden bu aralık? Bilimsel değil)
- Diğer projeler: %10-30 (yatırım etkisi yansımıyor)
- Giderler: %10-25 (operating leverage yok sayılıyor)

### Çözüm: Bilimsel Finansal Model

4 temel finansal prensip uygulanacak:

```text
1. INVESTMENT-DRIVEN GROWTH (Yatırım → Gelir Formülü)
   Product_Investment = Total_Investment × Product_Ratio
   Revenue_Uplift = Product_Investment × Revenue_Multiplier
   Growth_Rate = Revenue_Uplift / Current_Revenue

   Multiplier'lar (Sektör Bazlı):
   - SaaS/Yazılım: 2.0-2.5x
   - Danışmanlık: 1.2-1.5x
   - Ürün: 1.8-2.2x

2. NON-FOCUS ISOLATION (İzolasyon İlkesi)
   - Odak proje: Formül hesaplaması
   - Diğer projeler: %0 büyüme (baz yıl değeri korunur)
   - Amaç: Yatırımın spesifik etkisini NET göstermek

3. J-CURVE EFFECT (Zamanlama Gecikmesi)
   - Q1: %10 etki (yatırım harcanıyor)
   - Q2: %25 etki (müşteri kazanımı başlıyor)
   - Q3: %65 etki (momentum)
   - Q4: %100 etki (tam ölçekleme)

4. OPERATING LEVERAGE (Verimlilik)
   - Sabit giderler: %5-10 artış (step-fixed costs)
   - Değişken giderler: Gelir artışı × 0.4-0.6
   - Hedef: Kâr marjı iyileşmesi
```

### Değiştirilecek Bölümler

#### 1. FOCUS_PROJECT_RULES (satır 209-235)

Mevcut vague kurallar yerine bilimsel formüller:

```typescript
const FOCUS_PROJECT_RULES = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 ODAK PROJE ANALİZİ - BİLİMSEL FİNANSAL MODEL:

📊 1. INVESTMENT → REVENUE PIPELINE (Yatırımın Gelire Dönüşümü):

FORMÜL:
┌─────────────────────────────────────────────────────────────────┐
│ Product_Investment = Total_Investment × Product_Ratio          │
│ Revenue_Uplift = Product_Investment × Revenue_Multiplier       │
│ Growth_Rate = Revenue_Uplift / Current_Revenue                 │
└─────────────────────────────────────────────────────────────────┘

REVENUE MULTIPLIER (Sektöre Göre):
├── SaaS/Yazılım (ölçeklenebilir): 2.0x - 2.5x
├── Danışmanlık (insan bağımlı): 1.2x - 1.5x
└── Ürün/Lisans: 1.8x - 2.2x

ÖRNEK HESAPLAMA:
$200K Yatırım × %40 Ürün = $80K → Ürün Geliştirme
$80K × 2.0 (SaaS) = $160K Ek Gelir
Büyüme = $160K ÷ $243K (mevcut) = %65.8

📉 2. NON-FOCUS İZOLASYON KURALI (KRİTİK!):

⚠️ Yatırım odak projelere yönlendirildiğinden:
- ODAK PROJELER: Yukarıdaki formülle hesaplanan büyüme
- DİĞER TÜM PROJELER: %0 BÜYÜME - BAZ YIL DEĞERLERİ AYNEN KORUNUR!

NEDEN?
1. Yatırımın spesifik etkisini NET gösterir
2. Yatırımcı sorusu: "Bu para tam olarak nereye gidiyor?"
3. Cevap: Sadece odak projelerdeki büyüme farkı!

📈 3. J-CURVE EFFECT (Zamanlama):

Büyümeyi çeyreklere lineer dağıtma! Yatırım önce "yakar", sonra "kazandırır":
- Q1: %10 etki (yatırım harcanıyor, organizasyonel hazırlık)
- Q2: %25 etki (müşteri kazanımı başlıyor)
- Q3: %65 etki (momentum, ağızdan ağıza)
- Q4: %100 etki (tam ölçekleme)

📊 4. OPERATING LEVERAGE (Gider Modeli):

Gelir %50 artarsa, giderler %50 artmamalı!
- SABİT GİDERLER (Kira, Sunucu, Lisans): %5-10 artış
- DEĞİŞKEN GİDERLER (Personel, Pazarlama): Gelir artışı × 0.4-0.6
- HEDEF: Kâr marjının iyileşmesi (Margin Expansion)

NOT: Margin expansion olmayan büyüme, yatırımcı için değersizdir.
`;
```

#### 2. KALEM BAZLI PROJEKSİYON (satır 431-436)

```typescript
// Mevcut (keyfi):
// - Odak proje: +50-100% büyüme
// - Diğer gelir kalemleri: +10-30% normal büyüme

// Yeni (bilimsel):
📊 KALEM BAZLI PROJEKSİYON (BİLİMSEL MODEL):

🎯 ODAK PROJE HESAPLAMASI:
Adım 1: Investment_Product = Total_Investment × Product_Ratio
Adım 2: Revenue_Uplift = Investment_Product × Multiplier (SaaS:2.0, Service:1.3)
Adım 3: Growth = Revenue_Uplift / Current_Revenue

📉 NON-FOCUS KURALI (ZORUNLU):
- Odak OLMAYAN projeler: %0 büyüme, BAZ YIL DEĞERLERİ KORUNUR
- Yatırımın spesifik etkisini göstermek için KRİTİK

⏱️ J-CURVE (Çeyreklik Dağılım):
- Q1: Yıllık büyümenin %10'u
- Q2: Yıllık büyümenin %25'i
- Q3: Yıllık büyümenin %65'i
- Q4: Yıllık büyümenin %100'ü

📊 GİDER MODELİ (Operating Leverage):
- Sabit giderler: %5-10 artış
- Değişken giderler: Gelir artışı × 0.5
- Yatırım doğrudan etkisi: Personel ($X) + Pazarlama ($Y)
```

#### 3. itemized_revenues Schema (satır 1091-1106)

```typescript
// Mevcut:
description: "Apply 30-65% growth per category."

// Yeni:
description: "SCIENTIFIC MODEL: 
(1) FOCUS PROJECTS: Calculate growth = (Investment × Product_Ratio × Multiplier) / Current_Revenue. 
    Multipliers: SaaS=2.0, Services=1.3, Product=1.8. Result typically 50-120%.
(2) NON-FOCUS PROJECTS: EXACTLY 0% growth - use base scenario values unchanged!
    This isolates investment impact on selected projects.
(3) J-CURVE: Q1=10%, Q2=25%, Q3=65%, Q4=100% of annual growth.
(4) Sum of totals MUST match summary.total_revenue."
```

#### 4. growth_rate Field (satır 1103)

```typescript
// Mevcut:
growth_rate: { type: "number", description: "Growth rate vs base scenario (e.g., 0.45 for 45%)" }

// Yeni:
growth_rate: { 
  type: "number", 
  description: "Investment-calculated growth. FOCUS projects: formula result (0.5-1.2). NON-FOCUS: MUST be exactly 0.0 to isolate investment impact." 
}
```

#### 5. itemized_expenses Schema (satır 1108-1124)

```typescript
// Mevcut:
description: "Apply 10-25% growth per category."

// Yeni:
description: "OPERATING LEVERAGE MODEL:
(1) FIXED COSTS (Rent, Insurance, Licenses): 5-10% growth (inflation only)
(2) VARIABLE COSTS (Personnel, Marketing): Revenue_Growth × 0.4-0.6
(3) INVESTMENT DIRECT IMPACT: Add allocated amounts for hiring + marketing
(4) GOAL: Margin expansion - expenses grow slower than revenue!"
```

### Değiştirilecek Dosya

| Dosya | Satırlar | Değişiklik |
|-------|----------|------------|
| `supabase/functions/unified-scenario-analysis/index.ts` | 209-235 | FOCUS_PROJECT_RULES - Bilimsel formüller ekle |
| `supabase/functions/unified-scenario-analysis/index.ts` | 431-436 | KALEM BAZLI PROJEKSİYON - Formül tabanlı kurallar |
| `supabase/functions/unified-scenario-analysis/index.ts` | 1091-1106 | itemized_revenues schema - Scientific model açıklaması |
| `supabase/functions/unified-scenario-analysis/index.ts` | 1103 | growth_rate field - 0.0 for non-focus zorunluluğu |
| `supabase/functions/unified-scenario-analysis/index.ts` | 1108-1124 | itemized_expenses schema - Operating leverage modeli |

### Beklenen Sonuç

**Örnek Hesaplama (SBT Tracker Odak Proje):**

```text
INPUT:
- Yatırım: $200,000
- Product Ratio: %40 ($80,000)
- Revenue Multiplier: 2.0 (SaaS)
- SBT Tracker Mevcut: $243,000

HESAPLAMA:
Revenue_Uplift = $80,000 × 2.0 = $160,000
Growth_Rate = $160,000 / $243,000 = 65.8%
SBT Tracker 2027 = $243,000 × 1.658 = $402,594

J-CURVE DAĞILIMI:
- Q1: $243K + ($160K × 0.10) = $259K
- Q2: $243K + ($160K × 0.25) = $283K
- Q3: $243K + ($160K × 0.65) = $347K
- Q4: $243K + ($160K × 1.00) = $403K
```

**Karşılaştırma Tablosu:**

| Proje | Mevcut (Keyfi) | Yeni (Bilimsel) |
|-------|---------------|-----------------|
| SBT Tracker (ODAK) | +50-100% (keyfi) | +65.8% (hesaplanmış) |
| Leadership Denetim | +10-30% (keyfi) | %0 (izole etki) |
| Danışmanlık | +10-30% (keyfi) | %0 (izole etki) |
| ZDHC InCheck | +10-30% (keyfi) | %0 (izole etki) |

**Yatırımcı Mesajı:**
```text
"$200K yatırımın $80K'sı SBT Tracker geliştirmeye gidiyor.
 SaaS modeli sayesinde bu $160K ek gelire dönüşüyor (2.0x multiplier).
 Diğer projeler mevcut seviyede - böylece yatırımın net etkisi görünüyor."
```

