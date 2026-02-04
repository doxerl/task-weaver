

# Finance Dashboard Hatası - Tam Çözüm Planı

## Sorun Analizi

**Hata:** `TypeError: Cannot read properties of undefined (reading 'length')`

**Stack trace gösteriyor:**
```
at areHookInputsEqual → useEffect → useQuery 
  → useYearlyBalanceSheet (satır 20)
    → useBalanceSheet
      → FinanceDashboard (satır 39)
```

**Gerçek kök sebepler:**

### 1. Conditional Return Sonrası Hook Çağrısı (React Kuralı İhlali)

`useVatCalculations.ts` içinde satır 90-119'da conditional early return var:

```typescript
if (isAnyLocked && !isLoading) {
  return { ... };  // ← Early return
}

return useMemo(() => { ... }); // ← Bu useMemo early return'dan sonra çağrılıyor!
```

Bu, React'ın "hooks must be called in the same order" kuralını ihlal ediyor.

### 2. QueryKey Stabilizasyonu Eksik Hook'lar

Önceki düzeltmede sadece bazı hook'lar güncellendi. Aşağıdaki hook'larda queryKey hâlâ inline:

| Dosya | Satır | Mevcut Durum |
|-------|-------|--------------|
| `useBankTransactions.ts` | 14 | `queryKey: [...] as const` (inline) |
| `useCategories.ts` | 13 | `queryKey: [...] as const` (inline) |
| `useReceipts.ts` | 69 | `queryKey: [...] as const` (inline) |
| `useFinancialSettings.ts` | ? | Kontrol edilmeli |
| `useExchangeRates.ts` | ? | Kontrol edilmeli |

### 3. Hook Zinciri Döngüsü

Hook'lar arasında karmaşık bağımlılık zinciri var:
```
FinanceDashboard
├── useFinancialCalculations
│   ├── useBankTransactions
│   ├── useReceipts
│   ├── useCategories
│   └── useOfficialIncomeStatement
├── useVatCalculations
│   ├── useReceipts
│   ├── useBankTransactions
│   └── useOfficialDataStatus ← Bu hook diğerlerini de çağırıyor
├── useBalanceSheet
│   ├── useYearlyBalanceSheet
│   ├── useFinancialDataHub (10+ alt hook)
│   └── useIncomeStatement
└── useCostCenterAnalysis
    └── useFinancialDataHub
```

HMR sırasında bu karmaşık zincir bozuluyor.

---

## Çözüm Planı

### Adım 1: useVatCalculations - Conditional Return Düzeltmesi

**Sorun:** `useMemo` conditional return'dan sonra çağrılıyor

**Çözüm:** `useMemo`'yu koşuldan ÖNCE çağır, içeride conditional logic kullan

```typescript
// ÖNCE (HATALI)
if (isAnyLocked && !isLoading) {
  return { ... };
}
return useMemo(() => { ... }, [deps]);

// SONRA (DOĞRU)
return useMemo(() => {
  if (isAnyLocked && !isLoading) {
    return { ... }; // Early return useMemo İÇİNDE
  }
  // Normal logic
  return { ... };
}, [deps, isAnyLocked, isLoading]);
```

### Adım 2: Tüm Kritik Hook'larda QueryKey Stabilizasyonu

Aşağıdaki dosyalarda `queryKey`'i `useMemo` ile stabilize et:

| Dosya | Değişiklik |
|-------|------------|
| `useBankTransactions.ts` | `useMemo` ile queryKey stabilizasyonu |
| `useCategories.ts` | `useMemo` ile queryKey stabilizasyonu |
| `useReceipts.ts` | `useMemo` ile queryKey stabilizasyonu |
| `useFinancialSettings.ts` | Kontrol ve gerekirse stabilizasyon |
| `useExchangeRates.ts` | Kontrol ve gerekirse stabilizasyon |
| `useFixedExpenses.ts` | Kontrol ve gerekirse stabilizasyon |

**Örnek pattern:**
```typescript
import { useMemo } from 'react';

const userId = user?.id ?? null;

// Stable queryKey reference
const queryKey = useMemo(
  () => ['bank-transactions', userId, year] as const,
  [userId, year]
);

const { data, isLoading } = useQuery({
  queryKey,
  // ...
});
```

### Adım 3: FinanceDashboard Loading Guard Güçlendirme

Mevcut loading guard'ı güçlendir - tüm hook'lar hazır olana kadar bekleme:

```typescript
export default function FinanceDashboard() {
  const { user } = useAuthContext();
  
  // Auth kontrolü - kullanıcı yoksa loading göster
  if (!user) {
    return <LoadingSpinner />;
  }
  
  // ... hook çağrıları
  
  // Herhangi bir hook yükleniyorsa veya hata varsa
  const isAnyLoading = calc.isLoading || vat.isLoading || balanceLoading || ...;
  
  if (isAnyLoading) {
    return <LoadingSpinner />;
  }
  
  // ... render
}
```

---

## Dosya Değişiklikleri Listesi

| Dosya | İşlem | Öncelik |
|-------|-------|---------|
| `src/hooks/finance/useVatCalculations.ts` | Conditional return düzelt | ⚡ Kritik |
| `src/hooks/finance/useBankTransactions.ts` | queryKey stabilizasyonu | ⚡ Kritik |
| `src/hooks/finance/useCategories.ts` | queryKey stabilizasyonu | ⚡ Kritik |
| `src/hooks/finance/useReceipts.ts` | queryKey stabilizasyonu | ⚡ Kritik |
| `src/hooks/finance/useFinancialSettings.ts` | Kontrol + stabilizasyon | Orta |
| `src/hooks/finance/useExchangeRates.ts` | Kontrol + stabilizasyon | Orta |
| `src/hooks/finance/useFixedExpenses.ts` | Kontrol + stabilizasyon | Orta |
| `src/pages/finance/FinanceDashboard.tsx` | Auth guard ekle | Orta |

---

## Teknik Detaylar

### useVatCalculations Düzeltme Detayı

```typescript
// Satır 82-352 arası değişecek
export function useVatCalculations(year: number): VatCalculations & { isOfficial: boolean; officialWarning?: string } {
  const { receipts, isLoading: receiptsLoading } = useReceipts(year);
  const { transactions, isLoading: txLoading } = useBankTransactions(year);
  const { isAnyLocked } = useOfficialDataStatus(year);
  
  const isLoading = receiptsLoading || txLoading;

  // useMemo HER ZAMAN çağrılmalı - koşul içeride
  return useMemo(() => {
    // Official data locked ise boş döndür
    if (isAnyLocked && !isLoading) {
      return {
        totalCalculatedVat: 0,
        // ... tüm alanlar
        isOfficial: true,
        officialWarning: 'Resmi veri modunda KDV dinamik hesaplanmaz',
      };
    }

    // Loading state
    if (isLoading || !receipts) {
      return {
        // ... loading state
        isLoading: true,
        isOfficial: false,
      };
    }

    // Normal hesaplama
    // ... mevcut hesaplama kodu
    
    return { ... };
  }, [receipts, transactions, isLoading, isAnyLocked]);
}
```

---

## Test Adımları

1. Değişiklikleri uygula
2. Tarayıcı cache'ini temizle (DevTools → Application → Clear Site Data)
3. Sayfayı tam yenile (Ctrl+Shift+R)
4. `/finance` sayfasına git
5. Sayfa hatasız yüklenmeli
6. Yıl değiştir - hata olmamalı
7. Çıkış yap ve tekrar giriş yap - hata olmamalı
8. Sayfayı birkaç kez yenile - tutarlı davranış

---

## Tahmini Süre

| Adım | Süre |
|------|------|
| useVatCalculations düzeltme | ~10 dk |
| 3 kritik hook stabilizasyonu | ~10 dk |
| Diğer hook'ları kontrol | ~10 dk |
| FinanceDashboard güçlendirme | ~5 dk |
| Test | ~10 dk |
| **Toplam** | **~45 dakika** |

---

## Başarı Kriterleri

1. `/finance` sayfası hatasız yüklenir
2. HMR sonrası sayfa çökmez
3. Yıl değişikliği sorunsuz çalışır
4. Giriş/çıkış geçişleri sorunsuz
5. Console'da React hook uyarısı yok

