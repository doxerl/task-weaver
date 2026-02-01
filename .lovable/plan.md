

## /finance Dashboard'ında Resmi Veri Entegrasyonu

### Mevcut Durum Analizi

Dashboard'da farklı hook'lar kullanılıyor ve bunların resmi veri desteği tutarsız:

| Hook | Resmi Veri | Dashboard Kullanımı |
|------|------------|---------------------|
| `useIncomeStatement` | Var (isLocked kontrolu) | Sadece "Resmi Veri" badge icin |
| `useFinancialCalculations` | **YOK** | Ciro Ozeti, Net Kar, Ortak Cari |
| `useVatCalculations` | Yok | KDV Ozeti |
| `useBalanceSheet` | Yok | Bilanco Ozeti |

Ekran goruntusundeki degerler (`7.106.084,28`, `5.922.838,50` vs.) `useFinancialCalculations` hook'undan geliyor ve bu hook sadece banka islemlerinden dinamik hesaplama yapiyor - **resmi verileri kullanmiyor**.

### Cozum Plani

#### 1. `useFinancialCalculations` Hook'unu Guncelle

**Dosya: `src/hooks/finance/useFinancialCalculations.ts`**

Hibrit mantik ekle: Eger resmi gelir tablosu kilitliyse, oradan degerleri al.

```typescript
import { useOfficialIncomeStatement } from './useOfficialIncomeStatement';

export function useFinancialCalculations(year: number) {
  const { officialStatement, isLocked } = useOfficialIncomeStatement(year);
  
  // ... mevcut hook kodlari ...
  
  return useMemo(() => {
    // ONCELIK 1: Resmi veri kilitliyse onu kullan!
    if (isLocked && officialStatement) {
      const netSales = officialStatement.net_sales || 0;
      const grossSales = (officialStatement.gross_sales_domestic || 0) + 
                         (officialStatement.gross_sales_export || 0) + 
                         (officialStatement.gross_sales_other || 0);
      
      // Resmi veriden hesapla
      const operatingExpenses = (officialStatement.rd_expenses || 0) +
                               (officialStatement.marketing_expenses || 0) +
                               (officialStatement.general_admin_expenses || 0);
      
      return {
        totalIncome: grossSales,
        netRevenue: netSales,
        totalExpenses: operatingExpenses + (officialStatement.cost_of_goods_sold || 0),
        netCost: /* ... */,
        operatingProfit: officialStatement.net_profit || 0,
        profitMargin: netSales > 0 ? (officialStatement.net_profit / netSales) * 100 : 0,
        // Diger alanlar icin banka islemlerinden hesaplama devam eder
        partnerOut, partnerIn, financingIn, financingOut, // dinamik
        isLoading: false,
        isOfficial: true,
      };
    }
    
    // ONCELIK 2: Dinamik hesaplama (mevcut kod)
    // ... mevcut kod ...
  }, [...]);
}
```

#### 2. Return Type'a `isOfficial` Ekle

Hook'un dondurdugu nesneye `isOfficial: boolean` alani ekle:

```typescript
return {
  // ... mevcut alanlar ...
  isOfficial: isLocked,
};
```

#### 3. Dashboard'da Gosterim Iyilestirmesi (Opsiyonel)

**Dosya: `src/pages/finance/FinanceDashboard.tsx`**

Resmi veri aktifken kartlarda kucuk bir ikon goster:

```tsx
<div className="flex items-center gap-2">
  <span className="text-xs text-muted-foreground">Brut Ciro</span>
  {calc.isOfficial && <Shield className="h-3 w-3 text-green-600" />}
</div>
```

### Dikkat Edilmesi Gerekenler

1. **Ortak Cari ve Finansman**: Bu degerler resmi gelir tablosunda yok. Bunlar icin banka islemlerinden hesaplama devam etmeli.

2. **KDV Ozeti**: Resmi veriden KDV bilgisi gelmez, dinamik hesaplama devam etmeli.

3. **Hibrit Yaklasim**: Bazi alanlar resmi veriden (ciro, kar), bazi alanlar dinamik (ortak cari, KDV).

### Degistirilecek Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `src/hooks/finance/useFinancialCalculations.ts` | Resmi veri entegrasyonu ekle |
| `src/pages/finance/FinanceDashboard.tsx` | (opsiyonel) Resmi veri ikonu ekle |

### Beklenen Sonuc

**Oncesi (mevcut):**
- Dashboard: Banka islemlerinden dinamik hesaplama
- Degerler: ₺7.106.084,28 (brut ciro)
- "Resmi Veri" badge: Gosteriliyor ama degerler dinamik

**Sonrasi:**
- Dashboard: Eger resmi veri kilitliyse, oradan gelen degerleri goster
- Degerler: Resmi gelir tablosundaki net satislar
- Kart basliklarinda kucuk "Shield" ikonu ile resmi veri oldugu belirtilir

### Test Senaryosu

1. `/finance/official-data` sayfasina git
2. Gelir tablosu yukle ve kilitle
3. `/finance` dashboard'a don
4. Ciro Ozeti kartindaki degerlerin resmi veriden geldigini dogrula
5. "Resmi Veri" badge'inin gorundugunun ve degerlerin tutarli oldugunu kontrol et

