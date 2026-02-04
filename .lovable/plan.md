
# Kapsamlı SWOT Analizi: Hook Stabilizasyon Sorunu

## Yönetici Özeti

Domain üzerinden erişim sırasında oluşan `TypeError: Cannot read properties of undefined (reading 'length')` hatası, React TanStack Query'nin hook bağımlılıkları karşılaştırması sırasında (`areHookInputsEqual`) gerçekleşmektedir. Temel sebep: **`user?.id` değerinin auth durumu değişimleri sırasında `undefined` ile `string` arasında salınması** ve bu durumun query key dizilerini kararsız hale getirmesidir.

---

## 1. STRENGTHS (Güçlü Yönler)

### 1.1 Mimari Temeller
- **AuthContext Pattern**: Merkezi auth yönetimi mevcut (`useAuthContext`)
- **ProtectedRoute**: Kimlik doğrulama kontrolü route seviyesinde uygulanıyor
- **TanStack Query v5**: Modern cache yönetimi ve otomatik yeniden deneme mekanizması

### 1.2 Kısmi Düzeltmeler Uygulanmış
Bazı hook'larda stabilizasyon pattern'i zaten mevcut:
```typescript
// ✅ DOĞRU - useYearlyBalanceSheet.ts
const userId = user?.id ?? null;
queryKey: ['yearly-balance-sheet', userId, year] as const

// ✅ DOĞRU - usePreviousYearBalance.ts  
const userId = user?.id ?? null;
queryKey: ['previous-year-balance', userId, year] as const

// ✅ DOĞRU - useOfficialIncomeStatement.ts
const userId = user?.id ?? null;
queryKey: ['official-income-statement', year, userId] as const

// ✅ DOĞRU - useOfficialDataStatus.ts
const userId = user?.id ?? null;
queryKey: ['official-income-statement-lock', userId, year] as const
```

### 1.3 Default Value Pattern
`useBalanceSheet.ts` dosyasında `EMPTY_BALANCE_DATA` ve `EMPTY_CASH_FLOW_SUMMARY` modül seviyesinde tanımlanmış - bu doğru yaklaşım.

---

## 2. WEAKNESSES (Zayıf Yönler)

### 2.1 Kritik: Tutarsız userId Stabilizasyonu
**13 finansal hook'tan yalnızca 4 tanesi stabilize edilmiş!** Geri kalan 9 hook hala `user?.id` kullanıyor:

| Hook Dosyası | Durum | Risk |
|-------------|-------|------|
| `useBankTransactions.ts` | ❌ `user?.id` | Yüksek |
| `useReceipts.ts` | ❌ `user?.id` | Yüksek |
| `useCategories.ts` | ❌ `user?.id` | Yüksek |
| `usePayrollAccruals.ts` | ❌ `user?.id` | Yüksek |
| `useFinancialSettings.ts` | ❌ `user?.id` | Yüksek |
| `useFixedExpenses.ts` | ❌ `user?.id` | Yüksek |
| `useCategoryRules.ts` | ❌ `user?.id` | Yüksek |
| `useManualEntry.ts` | ❌ `user?.id` | Yüksek |
| `useTrialBalance.ts` | ❌ `user?.id` | Orta |
| `useBankImportSession.ts` | ❌ `user?.id` | Orta |
| `useBalanceSheetUpload.ts` | ❌ `user?.id` | Orta |
| `useWeeklyRetrospective.ts` | ❌ `user?.id` | Orta |

### 2.2 Hook Çağırım Zinciri Sorunu
`useFinancialDataHub` 7 alt hook'u çağırıyor:
```
useFinancialDataHub(year)
  ├── useBankTransactions(year)     ❌ user?.id
  ├── useReceipts(year)             ❌ user?.id  
  ├── useCategories()               ❌ user?.id
  ├── useFinancialSettings()        ❌ user?.id
  ├── useFixedExpenses()            ❌ user?.id
  ├── usePayrollAccruals(year)      ❌ user?.id
  └── usePreviousYearBalance(year-1) ✅ userId stabilized
```

Bu zincirde TEK BİR kararsız hook, tüm zinciri çökertebilir.

### 2.3 `as const` Eksikliği
Stabilize edilmemiş hook'larda `queryKey` array'leri `as const` ile işaretlenmemiş:
```typescript
// ❌ YANLIŞ
queryKey: ['bank-transactions', user?.id, year]

// ✅ DOĞRU  
queryKey: ['bank-transactions', userId, year] as const
```

### 2.4 Loading State Race Condition
`useAuth` hook'unda session kontrolü asenkron:
```typescript
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setUser(session?.user ?? null);
    setLoading(false);  // Bu satır ÖNCE çalışabilir
  });
}, []);
```
Bu durum, `loading=false` iken `user=null` olduğu kısa bir pencere yaratabilir.

---

## 3. OPPORTUNITIES (Fırsatlar)

### 3.1 Merkezi Pattern Oluşturma
Tek bir `useStableUserId` hook'u oluşturulabilir:
```typescript
// src/hooks/useStableUserId.ts
export function useStableUserId() {
  const { user } = useAuthContext();
  return user?.id ?? null;
}
```

### 3.2 ESLint Rule
Proje için özel bir ESLint kuralı ile `queryKey` içinde `user?.id` kullanımı engellenebilir.

### 3.3 Factory Pattern
Query hook'ları için factory fonksiyonu:
```typescript
function createUserQuery<T>(options: {
  queryKey: (userId: string | null) => QueryKey;
  queryFn: (userId: string) => Promise<T>;
}) {
  return function useQuery() {
    const userId = useStableUserId();
    return useTanStackQuery({
      queryKey: options.queryKey(userId),
      queryFn: () => options.queryFn(userId!),
      enabled: !!userId,
    });
  };
}
```

---

## 4. THREATS (Tehditler)

### 4.1 Cascade Failure Riski
Bir hook çökerse, onu kullanan tüm component'ler de çöker:
```
useBalanceSheet (crash)
  └── FinanceDashboard (blank screen)
  └── BalanceSheet (blank screen)  
  └── GrowthSimulation (blank screen)
  └── ScenarioComparisonPage (blank screen)
```

### 4.2 Domain vs Preview Ortam Farkı
Domain erişiminde session restore daha yavaş olabilir (CDN, cookie gecikmesi), bu da race condition penceresini genişletir.

### 4.3 Gelecek Hook Ekleme Riski
Yeni hook'lar eklenirken aynı pattern'in unutulması muhtemel.

---

## 5. Önerilen Çözüm Planı

### Aşama 1: Acil Düzeltme (9 hook)
Aşağıdaki dosyalarda `userId` stabilizasyonu uygulanmalı:

1. `src/hooks/finance/useBankTransactions.ts`
2. `src/hooks/finance/useReceipts.ts`
3. `src/hooks/finance/useCategories.ts`
4. `src/hooks/finance/usePayrollAccruals.ts`
5. `src/hooks/finance/useFinancialSettings.ts`
6. `src/hooks/finance/useFixedExpenses.ts`
7. `src/hooks/finance/useCategoryRules.ts`
8. `src/hooks/finance/useManualEntry.ts`
9. `src/hooks/finance/useTrialBalance.ts`
10. `src/hooks/finance/useBankImportSession.ts`
11. `src/hooks/finance/useBalanceSheetUpload.ts`
12. `src/hooks/useWeeklyRetrospective.ts`

Her dosyada:
```typescript
// ÖNCE
const { user } = useAuthContext();
// ...
queryKey: ['xxx', user?.id, ...],

// SONRA
const { user } = useAuthContext();
const userId = user?.id ?? null;
// ...
queryKey: ['xxx', userId, ...] as const,
```

### Aşama 2: Mutation'larda Stabilizasyon
`onSuccess` callback'lerinde `user?.id` yerine stabilize edilmiş `userId` kullanılmalı:
```typescript
// useYearlyBalanceSheet.ts satır 105 ve 129
onSuccess: () => {
  queryClient.invalidateQueries({ 
    queryKey: ['yearly-balance-sheet', userId, year]  // ✅ user?.id değil
  });
}
```

### Aşama 3: useExchangeRates Kontrolü
`useReceipts.ts` içinde kullanılan `useExchangeRates` hook'u da kontrol edilmeli.

---

## 6. Tahmini İş Yükü

| Görev | Dosya Sayısı | Tahmini Süre |
|-------|-------------|--------------|
| userId stabilizasyonu | 12 | ~30 dakika |
| Mutation callback düzeltmeleri | 4 | ~10 dakika |
| Test ve doğrulama | - | ~15 dakika |
| **Toplam** | | **~55 dakika** |

---

## 7. Başarı Kriterleri

1. ✅ Domain üzerinden giriş yapıldığında blank screen olmamalı
2. ✅ Console'da `Cannot read properties of undefined (reading 'length')` hatası görülmemeli
3. ✅ Auth state değişimlerinde (login/logout) crash olmamalı
4. ✅ Tüm finansal sayfalar (/finance/*) normal yüklenmeli

---

**Onay sonrası tüm hook'larda userId stabilizasyonu uygulanacaktır.**
