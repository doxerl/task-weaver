
# Kalan Stabilizasyon Sorunu: useScenarios Hook

## Problem Tespiti

`/finance/simulation` sayfasında "Bir Hata Oluştu" hatası alınmasının sebebi, `useScenarios` hook'unda `userId` stabilizasyonunun eksik olmasıdır.

**Sorun detayı:**

`useScenarios.ts` dosyasında (satır 31-33):
```typescript
export function useScenarios() {
  const { user } = useAuth();
  // ❌ userId stabilizasyonu yok!
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
```

Bu hook şu işlemlerde `user?.id` kullanıyor:
- `fetchScenarios` callback'inde (satır 40)
- `saveScenario` callback'inde (satır 79, 97)
- `deleteScenario` callback'inde (satır 152)

## Hook Kullanım Zinciri

```text
GrowthSimulation.tsx
  ├── useGrowthSimulation()
  │     ├── useFinancialDataHub()  ✅ (alt hook'ları stabilize)
  │     ├── usePayrollAccruals()   ✅
  │     ├── useIncomeStatement()   ✅
  │     └── useExchangeRates()     ✅ (user gerektirmiyor)
  ├── useScenarios()               ❌ SORUNLU
  └── usePdfEngine()               ✅ (user gerektirmiyor)
```

## Çözüm Planı

### Aşama 1: useScenarios.ts Stabilizasyonu (TEK DOSYA)

**Değişiklik:**

```typescript
// ÖNCE (satır 31-35)
export function useScenarios() {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  ...

// SONRA
export function useScenarios() {
  const { user } = useAuth();
  const userId = user?.id ?? null;  // ✅ Stabilize
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  ...
```

**Güncellenmesi gereken yerler:**

1. **fetchScenarios** (satır 40): `if (!user) return;` → `if (!userId) return;`

2. **saveScenario** (satır 79): `if (!user)` → `if (!userId)` ve `user.id` → `userId`

3. **deleteScenario** (satır 152): `if (!user) return false;` → `if (!userId) return false;`

## Teknik Detaylar

| Dosya | Değişiklik Tipi | Satır Aralığı |
|-------|----------------|---------------|
| `useScenarios.ts` | `userId` stabilizasyonu ekle | 31-35 |
| `useScenarios.ts` | `fetchScenarios` güncelle | 40-41 |
| `useScenarios.ts` | `saveScenario` güncelle | 79-97 |
| `useScenarios.ts` | `deleteScenario` güncelle | 152-153 |

## Beklenen Sonuç

1. `/finance/simulation` sayfası blank screen olmadan yüklenecek
2. Senaryo kaydetme/silme/listeleme işlemleri çalışacak
3. Auth state değişimlerinde crash olmayacak

## Tahmini Süre

**~5 dakika** (tek dosya değişikliği)
