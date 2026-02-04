

# Finance Dashboard Hata Düzeltme Planı

## Sorun Analizi

**Hata:** `TypeError: Cannot read properties of undefined (reading 'length')`

**Konum:** `FinanceDashboard.tsx` satır 39 → `useBalanceSheet` → `useYearlyBalanceSheet`

**Kök Neden:** Hook'larda `useAuth` ve `useAuthContext` karışık kullanımı

### Tutarsız Hook Kullanımı

| Dosya | Mevcut | Olması Gereken |
|-------|--------|----------------|
| `useFixedExpenses.ts` | `useAuth` | `useAuthContext` |
| `useTrialBalance.ts` | `useAuth` | `useAuthContext` |
| `useIncomeStatementUpload.ts` | `useAuth` | `useAuthContext` |
| `useUnifiedAnalysis.ts` | `useAuth` | `useAuthContext` |
| `useScenarios.ts` | `useAuth` | `useAuthContext` |
| `useBalanceSheetUpload.ts` | `useAuth` | `useAuthContext` |

**Neden önemli:**
- `useAuth` doğrudan Supabase auth state'ini okur
- `useAuthContext` ise tek bir Provider üzerinden paylaşılan state kullanır
- Karışık kullanım, React hook sırasını bozarak TanStack Query'de hatalara yol açar

## Çözüm

6 dosyada `useAuth` import'unu `useAuthContext` ile değiştir.

### Değişiklik Detayları

**Her dosyada:**

```typescript
// ÖNCESİ
import { useAuth } from '@/hooks/useAuth';
// ...
const { user } = useAuth();

// SONRASI
import { useAuthContext } from '@/contexts/AuthContext';
// ...
const { user } = useAuthContext();
```

### Dosya Listesi

| Dosya | Satır |
|-------|-------|
| `src/hooks/finance/useFixedExpenses.ts` | 3, 39 |
| `src/hooks/finance/useTrialBalance.ts` | 3, ~15 |
| `src/hooks/finance/useIncomeStatementUpload.ts` | 3, ~15 |
| `src/hooks/finance/useUnifiedAnalysis.ts` | 45, ~60 |
| `src/hooks/finance/useScenarios.ts` | 3, ~15 |
| `src/hooks/finance/useBalanceSheetUpload.ts` | 4, ~20 |

## Tahmini Süre

- 6 dosya x 2 satır = ~5 dakika

## Başarı Kriterleri

1. `/finance` sayfası hatasız açılır
2. Tüm hook'lar `useAuthContext` kullanır
3. Authentication geçişlerinde hook state bozulması olmaz

