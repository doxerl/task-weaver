

## Kilitli Resmi Veri - Dinamik Verilerin Devre Dışı Bırakılması

### Genel Bakış

Kilitli resmi veri (Gelir Tablosu veya Bilanço) olduğunda, tüm dinamik veri kaynaklarının (banka işlemleri, fişler, manuel girişler) hesaplamalara dahil edilmemesi gerekiyor. Bu, resmi muhasebe verilerinin "Source of Truth" olarak korunmasını sağlar.

### Mimari Yaklaşım

Merkezi bir hook oluşturarak tüm kod tabanında tutarlı kontrol sağlanacak.

```text
                    useOfficialDataStatus (Merkezi)
                              |
        +---------------------+---------------------+
        |                     |                     |
useFinancialCalculations  useFinancialDataHub   useIncomeStatement
        |                     |                     |
        +---------------------------------------------+
                              |
          isOfficiallyLocked = true olduğunda:
          - Banka işlemleri kullanılmaz
          - Fişler dahil edilmez
          - Manuel girişler etkisiz
          - Sadece resmi veriler gösterilir
```

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `src/hooks/finance/useOfficialDataStatus.ts` | **YENİ** - Merkezi kilit durumu hook'u |
| `src/hooks/finance/useFinancialCalculations.ts` | Kilitli durumda boş dinamik veri |
| `src/hooks/finance/useFinancialDataHub.ts` | Kilitli durumda boş işlem listesi |
| `src/hooks/finance/useVatCalculations.ts` | Kilitli durumda resmi KDV kullan |
| `src/hooks/finance/useExpenseAnalysis.ts` | Kilitli durumda resmi giderler |
| `src/hooks/finance/useIncomeAnalysis.ts` | Kilitli durumda resmi gelirler |
| `src/hooks/finance/useCashFlowStatement.ts` | Kilitli durumda hesaplama atla |
| `src/pages/finance/ManualEntry.tsx` | Kilitli uyarısı ve form disable |
| `src/pages/finance/BankTransactions.tsx` | Kilitli uyarısı göster |
| `src/pages/finance/Receipts.tsx` | Kilitli banner ekle |
| `src/pages/finance/BankImport.tsx` | Yükleme engelle |
| `src/hooks/finance/index.ts` | Yeni hook export |

---

### Teknik Detaylar

#### 1. Merkezi Hook: `useOfficialDataStatus.ts`

Tüm resmi veri kilit durumlarını tek noktadan kontrol eden hook:

```typescript
import { useOfficialIncomeStatement } from './useOfficialIncomeStatement';
import { useYearlyBalanceSheet } from './useYearlyBalanceSheet';

export interface OfficialDataStatus {
  isIncomeStatementLocked: boolean;
  isBalanceSheetLocked: boolean;
  isAnyLocked: boolean;        // Herhangi biri kilitli
  isFullyLocked: boolean;      // İkisi de kilitli
  lockedModules: string[];     // ['income_statement', 'balance_sheet']
  isLoading: boolean;
}

export function useOfficialDataStatus(year: number): OfficialDataStatus {
  const { isLocked: incomeStatementLocked, isLoading: incomeLoading } = 
    useOfficialIncomeStatement(year);
  const { isLocked: balanceSheetLocked, isLoading: balanceLoading } = 
    useYearlyBalanceSheet(year);
  
  const lockedModules: string[] = [];
  if (incomeStatementLocked) lockedModules.push('income_statement');
  if (balanceSheetLocked) lockedModules.push('balance_sheet');
  
  return {
    isIncomeStatementLocked: incomeStatementLocked,
    isBalanceSheetLocked: balanceSheetLocked,
    isAnyLocked: incomeStatementLocked || balanceSheetLocked,
    isFullyLocked: incomeStatementLocked && balanceSheetLocked,
    lockedModules,
    isLoading: incomeLoading || balanceLoading,
  };
}
```

#### 2. Hook Güncellemeleri

**useFinancialCalculations.ts:**
```typescript
import { useOfficialDataStatus } from './useOfficialDataStatus';

export function useFinancialCalculations(year: number) {
  const { isAnyLocked } = useOfficialDataStatus(year);
  
  // Kilitli değilse normal banka işlemlerini yükle
  const { transactions, isLoading: txLoading } = useBankTransactions(
    isAnyLocked ? undefined : year  // Kilitliyse veri çekme
  );
  
  return useMemo(() => {
    if (isAnyLocked && officialStatement) {
      // Sadece resmi veriyi kullan
      return { ...officialData, isOfficial: true };
    }
    
    // Dinamik hesaplama (mevcut kod)
    // ...
  }, [isAnyLocked, ...]);
}
```

**useFinancialDataHub.ts:**
```typescript
export function useFinancialDataHub(year: number) {
  const { isAnyLocked } = useOfficialDataStatus(year);
  
  // Kilitliyse boş veri döndür
  if (isAnyLocked) {
    return createEmptyHub();
  }
  
  // Mevcut dinamik hesaplama
  // ...
}
```

**useVatCalculations.ts:**
```typescript
export function useVatCalculations(year: number) {
  const { isAnyLocked } = useOfficialDataStatus(year);
  
  return useMemo(() => {
    if (isAnyLocked) {
      // KDV hesaplamaları için resmi veri yok
      // Uyarı mesajı ile boş dön
      return {
        ...emptyVatData,
        isOfficial: true,
        officialWarning: 'Resmi veri modunda KDV dinamik hesaplanmaz'
      };
    }
    // Normal hesaplama
  }, [isAnyLocked, ...]);
}
```

#### 3. Sayfa Güncellemeleri

**ManualEntry.tsx:**
```tsx
import { useOfficialDataStatus } from '@/hooks/finance/useOfficialDataStatus';

export default function ManualEntry() {
  const { isAnyLocked, lockedModules } = useOfficialDataStatus(year);
  
  // Kilitli uyarısı
  if (isAnyLocked) {
    return (
      <div className="p-4">
        <Alert variant="warning" className="bg-amber-50 border-amber-200">
          <Shield className="h-4 w-4" />
          <AlertTitle>Resmi Veri Modu Aktif</AlertTitle>
          <AlertDescription>
            {year} yılı için resmi veriler kilitli olduğundan manuel giriş yapılamaz.
            Kilitli modüller: {lockedModules.join(', ')}
          </AlertDescription>
        </Alert>
        
        <Button asChild variant="outline" className="mt-4">
          <Link to="/finance/official-data">
            Resmi Veri Sayfasına Git
          </Link>
        </Button>
      </div>
    );
  }
  
  // Normal form (mevcut kod)
}
```

**BankTransactions.tsx:**
```tsx
export default function BankTransactions() {
  const { isAnyLocked } = useOfficialDataStatus(year);
  
  return (
    <div>
      {isAnyLocked && (
        <Alert variant="default" className="mb-4 bg-green-50 border-green-200">
          <Shield className="h-4 w-4 text-green-600" />
          <AlertDescription>
            Resmi veri modu aktif. Banka işlemleri hesaplamalara dahil edilmiyor.
          </AlertDescription>
        </Alert>
      )}
      
      {/* İşlem listesi - salt okunur göster */}
      {/* Kategori değiştirme ve silme butonları disabled */}
    </div>
  );
}
```

**BankImport.tsx (veya ilgili sayfa):**
```tsx
export default function BankImport() {
  const { isAnyLocked } = useOfficialDataStatus(year);
  
  if (isAnyLocked) {
    return (
      <Alert variant="warning">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Resmi veri modu aktif. Yeni banka ekstresi yüklenemez.
          Kilit açmak için Resmi Veri sayfasına gidin.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Normal yükleme formu
}
```

---

### Davranış Matrisi

| Senaryo | Banka İşlemleri | Fişler | Manuel Giriş | Hesaplamalar |
|---------|-----------------|--------|--------------|--------------|
| Hiçbir kilit yok | Aktif | Aktif | Aktif | Dinamik |
| Gelir Tablosu Kilitli | Göster (read-only) | Göster (read-only) | Devre dışı | Resmi G.T. + Dinamik Bilanço |
| Bilanço Kilitli | Göster (read-only) | Göster (read-only) | Devre dışı | Dinamik G.T. + Resmi Bilanço |
| Her ikisi kilitli | Göster (read-only) | Göster (read-only) | Devre dışı | Tamamen Resmi |

---

### UI/UX İyileştirmeleri

1. **Banner Gösterimi**: Tüm finans sayfalarında kilitli durumu gösteren yeşil banner
2. **Form Disable**: Manuel giriş formları tamamen devre dışı
3. **Buton Disable**: Kategori değiştirme, silme, düzenleme butonları disabled
4. **Tooltip**: Neden devre dışı olduğunu açıklayan tooltip
5. **Navigasyon**: "Resmi Veri Sayfasına Git" butonu ile kolay erişim

---

### Beklenen Sonuç

**Öncesi:**
- Resmi veri kilitlense bile dashboard'da banka işlemleri toplanıyor
- Manuel girişler resmi verilere ekleniyor
- Tutarsız hesaplamalar

**Sonrası:**
- Kilitli resmi veri = tek kaynak (Source of Truth)
- Dinamik veriler hesaplamalara dahil edilmiyor
- UI'da net uyarılar ve engeller
- Kullanıcı karışıklığı önleniyor

