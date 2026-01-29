
## Gelir Tablosu Önizleme Düzeltme Planı

### Problem Özeti

Gelir tablosu önizleme dialogu açıldığında tablo boş görünüyor çünkü:

| Sorun | Detay |
|-------|-------|
| Eksik Kolon | `yearly_income_statements` tablosunda `raw_accounts` kolonu yok |
| Veri Kaybı | Parse edilen hesaplar veritabanına kaydedilmiyor |
| Önizleme Boş | Veritabanından geri yüklendiğinde `accounts: []` set ediliyor |

Bilanço için aynı işlem düzgün çalışıyor çünkü `yearly_balance_sheets` tablosunda `raw_accounts` kolonu mevcut.

---

### Çözüm 1: Veritabanı Migration

```sql
ALTER TABLE yearly_income_statements
ADD COLUMN IF NOT EXISTS raw_accounts JSONB DEFAULT NULL;
```

Bu kolon parse edilen hesapları JSON olarak saklayacak.

---

### Çözüm 2: Hook Güncellemesi

`src/hooks/finance/useIncomeStatementUpload.ts` dosyasında değişiklikler:

#### 2a. Query'ye `raw_accounts` ekle

```typescript
const { data: existingData } = useQuery({
  queryKey: ['income-statement-upload', year, userId],
  queryFn: async () => {
    if (!userId) return null;
    const { data } = await supabase
      .from('yearly_income_statements')
      .select('source, file_url, file_name, net_sales, gross_profit, operating_profit, raw_accounts')
      .eq('user_id', userId)
      .eq('year', year)
      .maybeSingle();
    return data;
  },
  enabled: !!userId,
});
```

#### 2b. useEffect'te raw_accounts'ı kullan

```typescript
useEffect(() => {
  if (existingData?.source === 'mizan_upload' && existingData.file_name) {
    // raw_accounts varsa önizleme için kullan
    const accounts = existingData.raw_accounts 
      ? (existingData.raw_accounts as unknown as IncomeStatementAccount[])
      : [];
    
    setUploadState({
      fileName: existingData.file_name,
      accounts, // Artık boş değil!
      mappedData: {},
      warnings: [],
      isApproved: true,
      savedSummary: {
        netSales: existingData.net_sales || 0,
        grossProfit: existingData.gross_profit || 0,
        operatingProfit: existingData.operating_profit || 0,
      },
    });
  }
}, [existingData]);
```

#### 2c. Kaydetme sırasında raw_accounts'ı ekle

```typescript
const approveIncomeStatement = useCallback(async () => {
  // ...
  
  const payload = {
    ...formData,
    ...totals,
    user_id: userId,
    year,
    source: 'mizan_upload',
    file_name: uploadState.fileName,
    raw_accounts: JSON.stringify(uploadState.accounts), // YENİ
    updated_at: new Date().toISOString(),
  };
  
  // ...
}, [userId, uploadState, year, queryClient]);
```

---

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| Veritabanı Migration | `raw_accounts JSONB` kolonu ekle |
| `src/hooks/finance/useIncomeStatementUpload.ts` | raw_accounts kaydet ve yükle |

---

### Beklenen Sonuç

| Senaryo | Önceki | Sonraki |
|---------|--------|---------|
| Önizleme açıldığında | Boş tablo | Hesaplar görünür |
| Sekme değişince | Veri kaybolur | Veri korunur |
| Sayfa yenilenince | Veri kaybolur | Veritabanından yüklenir |

---

### Teknik Detaylar

Bilanço yüklemede aynı pattern kullanılıyor ve düzgün çalışıyor:

```typescript
// useBalanceSheetUpload.ts (ÇALIŞAN)
.select('source, file_name, file_url, raw_accounts, is_locked, total_assets, total_liabilities')

// Kaydetme:
raw_accounts: rawAccountsJson,
```

Aynı pattern gelir tablosu için de uygulanacak.
