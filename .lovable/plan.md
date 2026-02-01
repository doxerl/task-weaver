

## /finance/reports Sayfasında Dinamik Veri Gösterimi

### Sorun Analizi

Son değişikliklerle birlikte `useIncomeAnalysis` ve `useExpenseAnalysis` hook'larına `isAnyLocked` kontrolü eklendi. Resmi veri kilitliyken:

- Etiketlenmiş banka işlemleri atlanıyor
- Sadece resmi gelir tablosundaki özet veriler döndürülüyor (gross_sales_domestic, general_admin_expenses vs.)
- Detaylı hizmet dağılımları (L&S, SBT, DANIS), müşteri gelirleri ve aylık dağılımlar kayboluyor

**Reports sayfası resmi verilerden bağımsız olmalı** - her zaman etiketlenmiş banka işlemlerini ve fişleri göstermeli.

### Mimari Yaklaşım

Hook'lara `forceRealtime` parametresi ekleyerek resmi veri kontrolünü atlama imkanı sağlanacak.

```
useIncomeAnalysis(year, { forceRealtime: true })
                           ↓
         isAnyLocked kontrolünü atla
                           ↓
         Her zaman banka işlemlerini kullan
```

### Değişiklikler

#### 1. `useIncomeAnalysis.ts` - forceRealtime Parametresi

Hook'a opsiyonel `forceRealtime` parametresi eklenecek:

```typescript
interface IncomeAnalysisOptions {
  forceRealtime?: boolean;  // true olursa resmi veri kontrolü atlanır
}

export function useIncomeAnalysis(year: number, options?: IncomeAnalysisOptions) {
  const { forceRealtime = false } = options || {};
  const { isAnyLocked } = useOfficialDataStatus(year);
  
  // ...
  
  return useMemo(() => {
    // forceRealtime = true ise resmi veri kontrolünü atla
    if (!forceRealtime && isAnyLocked && officialStatement) {
      // Resmi veri modunda basitleştirilmiş veri dön
      return { ... };
    }
    
    // HER ZAMAN dinamik hesaplama
    // ...banka işlemleri ve fişlerden hesapla...
  }, [...]);
}
```

#### 2. `useExpenseAnalysis.ts` - forceRealtime Parametresi

Aynı şekilde:

```typescript
interface ExpenseAnalysisOptions {
  forceRealtime?: boolean;
}

export function useExpenseAnalysis(year: number, options?: ExpenseAnalysisOptions) {
  const { forceRealtime = false } = options || {};
  
  return useMemo(() => {
    if (!forceRealtime && isAnyLocked && officialStatement) {
      return { ...officialData };
    }
    
    // Dinamik hesaplama
  }, [...]);
}
```

#### 3. `Reports.tsx` - forceRealtime Kullanımı

Reports sayfası hook'ları `forceRealtime: true` ile çağıracak:

```typescript
export default function Reports() {
  // Reports sayfası HER ZAMAN dinamik veri göstermeli
  const incomeAnalysis = useIncomeAnalysis(year, { forceRealtime: true });
  const expenseAnalysis = useExpenseAnalysis(year, { forceRealtime: true });
  
  // ... mevcut kod ...
}
```

### Davranış Matrisi

| Sayfa | Resmi Kilitli | forceRealtime | Sonuç |
|-------|---------------|---------------|-------|
| Dashboard | Evet | false (varsayılan) | Resmi veri |
| Dashboard | Hayır | false | Dinamik |
| Reports | Evet | **true** | **Dinamik** |
| Reports | Hayır | true | Dinamik |

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `src/hooks/finance/useIncomeAnalysis.ts` | `forceRealtime` parametresi ekle |
| `src/hooks/finance/useExpenseAnalysis.ts` | `forceRealtime` parametresi ekle |
| `src/pages/finance/Reports.tsx` | Hook'ları `{ forceRealtime: true }` ile çağır |

### Beklenen Sonuç

- Reports sayfası resmi veri kilitli olsa bile etiketlenmiş banka işlemlerini gösterecek
- Hizmet dağılımları (L&S, SBT, DANIS, ZDHC), müşteri gelirleri ve aylık grafikler geri gelecek
- Dashboard ve diğer sayfalar resmi veri önceliğini koruyacak

