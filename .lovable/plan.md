

# Baz Yil Verilerinin Karsilastirma Sayfasina Eklenmesi

## Ozet
Karsilastirma sayfasina iki temel iyilestirme yapilacak:
1. Pozitif/Negatif senaryo karsilastirmasinin yaninda baz yil (2025) gelir ve gider kalemleri de goruntulenecek
2. 5 Yillik Projeksiyon Tablosu, baz yil (2025) ve senaryo yili (2026) satirlarini da icerecek sekilde genisletilecek

---

## Degisiklik 1: Baz Yil Gelir/Gider Kalemlerinin Gosterilmesi

### Mevcut Durum
- `ScenarioComparisonPage.tsx` icinde summary kartlari sadece Senaryo A ve Senaryo B'nin `projectedAmount` degerlerini gosteriyor
- Her senaryonun `revenues[].baseAmount` ve `expenses[].baseAmount` alanlari zaten baz yil (2025) verisini tasiyor

### Yapilacak Degisiklik: `ScenarioComparisonPage.tsx`

**a) Summary kartlarina baz yil satiri eklenmesi:**
- `metrics` useMemo'ya baz yil toplam gelir/gider verileri eklenecek
- Her kart icinde Senaryo A ve B'nin yaninda baz yil degeri de gosterilecek
- Baz yil verileri `scenarioA.revenues.reduce((sum, r) => sum + r.baseAmount, 0)` seklinde hesaplanacak

**b) Yeni bir "Baz Yil vs Senaryolar" kalem bazli karsilastirma tablosu:**
- Mevcut `quarterlyItemized` benzeri bir useMemo ile baz yil kalem verileri cikarilacak
- Gelir kalemleri tablosu: Kalem adi | 2025 (Baz) | Pozitif | Negatif | Degisim %
- Gider kalemleri tablosu: Ayni format
- Bu tablo, mevcut summary kartlarindan hemen sonra (SECTION 1 sonrasi) yerlestirilecek

### Teknik Detay
```
Baz yil verisi kaynagi:
- scenarioA.revenues[i].baseAmount -> 2025 gelir kalemi
- scenarioA.expenses[i].baseAmount -> 2025 gider kalemi
- scenarioB.revenues[i].baseAmount -> ayni 2025 verisi (her iki senaryoda ortaktir)
```

---

## Degisiklik 2: 5 Yillik Projeksiyon Tablosuna Baz ve Senaryo Yili Eklenmesi

### Mevcut Durum
- `InvestmentTab.tsx` icindeki 5 Yillik Projeksiyon Tablosu sadece `exitPlan.allYears` verisini gosteriyor
- `allYears` dizisi scenarioTargetYear + 1'den basliyor (ornegin 2027-2031)
- Baz yil (2025) ve senaryo yili (2026) verileri tabloda yok

### Yapilacak Degisiklik: `InvestmentTab.tsx`

**5 Yillik tablonun basina iki ek satir eklenmesi:**

| Yil | Acilis | Gelir | Gider | Net Kar | Death Valley | Sermaye | Yil Sonu | Degerleme | MOIC |
|-----|--------|-------|-------|---------|-------------|---------|----------|-----------|------|
| **2025 (Baz)** | - | baseRevenue | baseExpense | baseProfit | - | - | - | - | - |
| **2026 (Senaryo)** | - | summaryA.totalRevenue | summaryA.totalExpense | summaryA.netProfit | mevcut | mevcut | mevcut | mevcut | mevcut |
| 2027 | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| ... | | | | | | | | | |

- Baz yil (2025) satiri: `scenarioA.revenues.reduce(baseAmount)` ve `scenarioA.expenses.reduce(baseAmount)` kullanilarak
- Senaryo yili (2026) satiri: Mevcut `summaryA` verileri kullanilarak
- Bu satirlar projection hesaplamalarina dahil OLMAYACAK (sadece gorsel referans)
- InvestmentTab props'una yeni alanlar eklenecek: `baseYearRevenue`, `baseYearExpenses`, `baseYear`, `scenarioYear`

---

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `src/pages/finance/ScenarioComparisonPage.tsx` | Baz yil hesaplamalari (useMemo), kalem bazli karsilastirma tablosu eklenmesi, InvestmentTab'a yeni props gecirilmesi |
| `src/components/simulation/InvestmentTab.tsx` | Props genisletilmesi, 5 yillik tabloya baz + senaryo yili satirlarinin eklenmesi |

## Goruntulenecek Yeni UI Elemanlari

1. Summary kartlarina kucuk "Baz: $XXX" etiketi
2. Yeni Accordion veya Card: "Baz Yil Karsilastirmasi" - gelir ve gider kalemleri tablo halinde
3. 5 Yillik Projeksiyon Tablosu: 2 ek satir (vurgulu arka plan ile ayirt edilecek)

