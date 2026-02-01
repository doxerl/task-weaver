

## /finance/reports - Giderlerin Görünmeme Sorunu

### Sorun Analizi

Veritabanı sorgusundan görüldüğü üzere, 2025 yılı için resmi gelir tablosunda:

| Alan | Değer |
|------|-------|
| `net_sales` | 5,282,460.22 ₺ |
| `cost_of_goods_sold` | **0** |
| `cost_of_merchandise_sold` | **0** |
| `cost_of_services_sold` | **0** |
| `marketing_expenses` | **0** |
| `general_admin_expenses` | **0** |
| `net_profit` | 4,839,674.89 ₺ |
| `is_locked` | **true** |

Kullanıcı resmi gelir tablosuna sadece gelir ve kâr değerlerini girmiş, gider detaylarını boş bırakmış.

**KPI kartlarındaki "Net Gider (KDV Hariç)"** değeri `useIncomeStatement` hook'undan geliyor:
```tsx
formatAmount((incomeStatement.statement?.costOfSales || 0) + 
             (incomeStatement.statement?.operatingExpenses.total || 0))
```

`useIncomeStatement` kilitli resmi veriyi kullandığında, gider alanları 0 olduğu için ₺0 gösteriyor.

### Çözüm

`useIncomeStatement` hook'una da `forceRealtime` parametresi eklenerek, Reports sayfasının her zaman dinamik veri kullanması sağlanacak.

### Değişiklikler

#### 1. `useIncomeStatement.ts` - forceRealtime Parametresi

```typescript
interface IncomeStatementOptions {
  forceRealtime?: boolean;
}

export function useIncomeStatement(year: number, options?: IncomeStatementOptions) {
  const { forceRealtime = false } = options || {};
  
  // RESMİ VERİ KONTROLÜ
  const { officialStatement, isLocked, isLoading: isOfficialLoading } = 
    useOfficialIncomeStatement(year);
  
  const statement = useMemo(() => {
    // forceRealtime = true ise resmi veri kontrolünü atla
    if (!forceRealtime && isLocked && officialStatement) {
      return convertOfficialToStatement(officialStatement);
    }
    
    // Dinamik hesaplama (mevcut kod)
    // ...
  }, [..., forceRealtime]);
  
  return {
    statement,
    isLoading: ...,
    isOfficial: !forceRealtime && isLocked, // forceRealtime varsa official sayılmaz
    lines,
  };
}
```

#### 2. `Reports.tsx` - forceRealtime Kullanımı

```typescript
// Mevcut
const incomeStatement = useIncomeStatement(year);

// Güncellenecek
const incomeStatement = useIncomeStatement(year, { forceRealtime: true });
```

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `src/hooks/finance/useIncomeStatement.ts` | `forceRealtime` parametresi ekle |
| `src/pages/finance/Reports.tsx` | `useIncomeStatement` çağrısına `{ forceRealtime: true }` ekle |

### Davranış Matrisi (Güncellenmiş)

| Hook | Dashboard | Reports |
|------|-----------|---------|
| `useIncomeStatement` | Resmi veri | **forceRealtime: true** → Dinamik |
| `useIncomeAnalysis` | Resmi veri | **forceRealtime: true** → Dinamik |
| `useExpenseAnalysis` | Resmi veri | **forceRealtime: true** → Dinamik |

### Beklenen Sonuç

- Reports sayfasındaki KPI kartları dinamik verilerden hesaplanacak
- "Net Gider (KDV Hariç)" banka işlemlerinden toplanacak
- Gider grafikleri ve detayları doğru gösterilecek
- Dashboard ise resmi veri önceliğini koruyacak

