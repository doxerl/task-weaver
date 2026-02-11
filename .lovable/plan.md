
# Baz Yil Verilerinin TRY -> USD Donusumu

## Sorun
`useIncomeStatement` hook'u TRY (Turk Lirasi) cinsinden deger donduruyor. Ancak karsilastirma sayfasindaki tum degerler USD cinsinden gosteriliyor (`formatCompactUSD`). Donus yapilmadan gosterildigi icin:

- $5.8M olarak gorunen deger aslinda 5.8M TRY (yaklasik $148K USD)
- $4.8M olarak gorunen deger aslinda 4.8M TRY (yaklasik $123K USD)

Senaryo verileri (`baseAmount`) zaten USD'ye cevrilmis olarak kaydediliyordu, bu yuzden onceki kodda sorun yoktu. Ancak `useIncomeStatement` ham TRY verisi donduruyor.

## Cozum

### Dosya: `src/pages/finance/ScenarioComparisonPage.tsx`

**1) Baz yil icin ayri exchange rate hook'u ekle:**

Mevcut `useExchangeRates` sadece senaryo yili (2026) icin cagiriliyor. Baz yil (2025) icin de ayri bir cagri gerekiyor:

```typescript
const { yearlyAverageRate: baseYearRate } = useExchangeRates(baseYearNumber);
```

**2) `baseYearTotals` useMemo icinde TRY -> USD donusumu ekle:**

```typescript
const stmt = incomeStatement.statement;
if (stmt && (stmt.netSales > 0 || stmt.costOfSales > 0)) {
  const rate = baseYearRate || 39; // Fallback kur
  const totalRevenue = stmt.netSales / rate;
  const totalExpense = (stmt.costOfSales + stmt.operatingExpenses.total) / rate;
  const netProfit = stmt.netProfit / rate;
  // ...
}
```

**3) Dependency array'e `baseYearRate` ekle.**

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `src/pages/finance/ScenarioComparisonPage.tsx` | Baz yil icin `useExchangeRates` eklenmesi, TRY degerlerinin USD'ye cevrildigi bolumun guncellenmesi |

## Beklenen Sonuc
- 2025 Baz satiri: ~$148K gelir, ~$121K gider, ~$24K kar (Reports sayfasiyla eslesecek)
