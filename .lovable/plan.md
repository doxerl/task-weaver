

# Baz Yil Verilerinin Gercek Kaynaklardan Alinmasi

## Sorun
Karsilastirma sayfasindaki "2025 Baz Yil" verileri senaryo icindeki `baseAmount` alanlarindan hesaplaniyor. Bu degerler senaryo olusturulurken kaydedilen anlık goruntudur ve guncel olmayabilir.

- Senaryo baseAmount toplami: $147.9K gelir, $121.4K gider, $26.5K kar
- Reports sayfasi gercek verisi: $147,862 gelir, $121,409 gider, $24,268 kar

Fark ozellikle net kar'da belirgin ($26.5K vs $24.3K).

## Cozum
`ScenarioComparisonPage.tsx` icinde `useIncomeStatement` hook'unu `forceRealtime: true` ile cagirarak gercek finansal verileri kullanmak.

### Dosya: `src/pages/finance/ScenarioComparisonPage.tsx`

**1) Import ekle:**
```typescript
import { useIncomeStatement } from '@/hooks/finance/useIncomeStatement';
```

**2) Hook cagirisi ekle (mevcut hook'larin yanina):**
```typescript
const baseYear = (scenarioA?.targetYear || 2026) - 1;
const incomeStatement = useIncomeStatement(baseYear, { forceRealtime: true });
```

**3) `baseYearTotals` useMemo'yu guncelle:**
Mevcut `baseAmount` toplama mantigi yerine `incomeStatement.statement` verisini kullan:

```typescript
const baseYearTotals = useMemo(() => {
  if (!scenarioA) return null;
  const baseYr = (scenarioA.targetYear || 2026) - 1;
  
  // Gercek gelir tablosu verisi varsa onu kullan, yoksa senaryo baseAmount'a dusus
  const stmt = incomeStatement.statement;
  if (stmt) {
    const totalRevenue = stmt.netSales;
    const totalExpense = stmt.costOfSales + stmt.operatingExpenses.total;
    const netProfit = stmt.netProfit;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    return { baseYear: baseYr, totalRevenue, totalExpense, netProfit, profitMargin };
  }
  
  // Fallback: senaryo baseAmount verileri
  const totalRevenue = scenarioA.revenues.reduce((sum, r) => sum + (r.baseAmount || 0), 0);
  const totalExpense = scenarioA.expenses.reduce((sum, e) => sum + (e.baseAmount || 0), 0);
  const netProfit = totalRevenue - totalExpense;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  return { baseYear: baseYr, totalRevenue, totalExpense, netProfit, profitMargin };
}, [scenarioA, incomeStatement.statement]);
```

**4) Kalem bazli karsilastirma (`baseYearItemized`) degismeyecek** - her bir kalemin `baseAmount` degeri Reports sayfasindan topluca alinabilecek bir veri degil (kalem bazli mapping yok), bu nedenle mevcut `baseAmount` mantigi kalacak. Sadece toplam satirlar gercek veriyle uyumlu olacak.

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `src/pages/finance/ScenarioComparisonPage.tsx` | `useIncomeStatement` import ve hook eklenmesi, `baseYearTotals` hesaplamasinin gercek veriye cekilmesi |

## Sonuc
- Summary kartlarindaki baz yil rakamlari Reports sayfasiyla birebir ayni olacak
- InvestmentTab'a gonderilen baz yil verileri de gercek kaynaklardan gelecek
- Kalem bazli karsilastirma mevcut senaryo `baseAmount` verisini kullanmaya devam edecek (en iyi mevcut kaynak)
