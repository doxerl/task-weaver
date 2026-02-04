

# Finance Dashboard Hatası - Kesin Çözüm Planı

## Sorun Özeti

**Hata:** `TypeError: Cannot read properties of undefined (reading 'length')`

**Konum:** `areHookInputsEqual` fonksiyonunda - React hook'larının dependency array karşılaştırması sırasında oluşuyor.

**Stack Trace:**
```
useClearResetErrorBoundary (@tanstack_react-query)
  → useBaseQuery
    → useQuery  
      → useYearlyBalanceSheet (satır 54)
        → useBalanceSheet (satır 48)
          → FinanceDashboard (satır 39)
```

## Kök Sebep Analizi

Bu hata, React'ın hook dependency array'lerini karşılaştırırken bir önceki render'daki array ile mevcut render'daki array'in farklı yapıda olmasından kaynaklanıyor.

### Tespit Edilen Sorunlar

1. **HMR (Hot Module Replacement) State Bozulması**: Kod değişikliği sonrası modüller yeniden yüklenirken, TanStack Query'nin internal state'i ile React'ın hook sırası arasında uyumsuzluk oluşuyor.

2. **QueryKey Tutarsızlığı**: Bazı hook'larda `queryKey` array'i `as const` ile typed, bazılarında değil. Bu, TypeScript seviyesinde tutarlılık sağlasa da, runtime'da array referanslarının stabilitesini etkileyebilir.

3. **Potansiyel Undefined Value**: `userId` değeri `user?.id ?? null` olarak stabilize edilmiş olsa da, authentication state geçişleri sırasında React'ın hook sırasını takip etme mekanizması bozulabiliyor.

## Çözüm Stratejisi

### Adım 1: Tarayıcı Cache ve Sayfa Yenilemesi

En basit çözüm olarak önce:
- Tarayıcı cache'ini temizle
- Sayfayı tam yenile (Ctrl+Shift+R veya Cmd+Shift+R)

Bu genellikle HMR kaynaklı hook state bozulmalarını çözer.

### Adım 2: QueryClient Konfigürasyonu Güncelleme (Gerekirse)

Eğer Adım 1 sorunu çözmezse, `src/main.tsx` veya `src/App.tsx` dosyasında QueryClient'ı daha defensive ayarlarla yapılandır:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Stale data'yı hemen silme - geçiş sırasında cache'i koru
      staleTime: 5 * 60 * 1000,
    },
  },
});
```

### Adım 3: useYearlyBalanceSheet Hook'unda Defensive Guard

`src/hooks/finance/useYearlyBalanceSheet.ts` dosyasında query'yi daha defensive yap:

**Mevcut (satır 54-70):**
```typescript
const { data: yearlyBalance, isLoading } = useQuery({
  queryKey: ['yearly-balance-sheet', userId, year] as const,
  queryFn: async () => {
    if (!userId) return null;
    // ...
  },
  enabled: !!userId,
});
```

**Güncellenmiş:**
```typescript
// Stable queryKey reference
const queryKey = useMemo(
  () => ['yearly-balance-sheet', userId, year] as const,
  [userId, year]
);

const { data: yearlyBalance, isLoading } = useQuery({
  queryKey,
  queryFn: async () => {
    if (!userId) return null;
    // ...
  },
  enabled: !!userId,
  // Auth geçişlerinde stale data'yı koru
  staleTime: 30 * 1000,
});
```

### Adım 4: Kritik Hook'larda useMemo ile QueryKey Stabilizasyonu

Aşağıdaki hook'larda `queryKey`'i `useMemo` ile stabilize et:

| Dosya | Satır |
|-------|-------|
| `useYearlyBalanceSheet.ts` | 54-55 |
| `useOfficialDataStatus.ts` | 28-29, 45-46 |
| `useOfficialIncomeStatement.ts` | 111-112 |
| `usePreviousYearBalance.ts` | 50-51 |
| `usePayrollAccruals.ts` | 11-12 |

### Adım 5: FinanceDashboard'da Loading Guard

`src/pages/finance/FinanceDashboard.tsx` dosyasında, tüm hook'lar yüklenmeden önce loading state göster:

```typescript
export default function FinanceDashboard() {
  const { t } = useTranslation(['finance', 'common']);
  const { selectedYear: year, setSelectedYear: setYear } = useYear();
  
  // Tüm hook'ları çağır (sıra değişmemeli)
  const calc = useFinancialCalculations(year);
  const vat = useVatCalculations(year);
  const { balanceSheet, isLoading: balanceLoading } = useBalanceSheet(year);
  const costCenter = useCostCenterAnalysis(year);
  const incomeStatement = useIncomeStatement(year);

  // Herhangi bir hook yükleniyorsa loading göster
  const isAnyLoading = calc.isLoading || vat.isLoading || balanceLoading || 
                       costCenter.isLoading || incomeStatement.isLoading;

  if (isAnyLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ... geri kalan JSX
}
```

## Dosya Değişiklikleri

| Dosya | Değişiklik |
|-------|------------|
| `src/hooks/finance/useYearlyBalanceSheet.ts` | `useMemo` ile queryKey stabilizasyonu |
| `src/hooks/finance/useOfficialDataStatus.ts` | `useMemo` ile queryKey stabilizasyonu |
| `src/hooks/finance/useOfficialIncomeStatement.ts` | `useMemo` ile queryKey stabilizasyonu |
| `src/pages/finance/FinanceDashboard.tsx` | Loading guard ekleme |

## Test Adımları

1. Değişiklikleri uygula
2. Tarayıcı cache'ini temizle (DevTools → Application → Clear Site Data)
3. Sayfayı tam yenile
4. `/finance` sayfasına git
5. Sayfa hatasız yüklenmeli
6. Yıl değiştir - hata olmamalı
7. Çıkış yap ve tekrar giriş yap - hata olmamalı

## Öncelik

1. **İlk olarak**: Kullanıcıya sayfayı yenilemesini öner (HMR sorunu olabilir)
2. **Eğer devam ederse**: QueryKey stabilizasyonunu uygula
3. **Son çare**: FinanceDashboard'da loading guard ekle

## Tahmini Süre

- QueryKey stabilizasyonu: ~15 dakika
- Loading guard: ~5 dakika
- Test: ~10 dakika
- **Toplam: ~30 dakika**

