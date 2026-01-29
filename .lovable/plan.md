

## Gelir Tablosu Onaylandıktan Sonra ₺0 Gösterme Sorunu

### Problem Analizi

Veritabanı incelemesinde veriler **doğru kaydedilmiş**:
- `net_sales: 5,276,940`
- `gross_profit: 2,309,151.95`
- `operating_profit: -517,015.08`

Ancak UI'da ₺0 gösteriyor çünkü:

| Sorun | Detay |
|-------|-------|
| Hook sadece 3 alan çekiyor | `select('source, file_url, file_name')` |
| Accounts boş set ediliyor | `accounts: []` - onaylı kayıtlar için boş |
| Summary accounts'tan hesaplanıyor | `calculateSummary()` boş array'den 0 buluyor |
| DB'deki değerler kullanılmıyor | `net_sales, gross_profit, operating_profit` hiç okunmuyor |

---

### Çözüm

#### 1. Hook'ta Veritabanından Tüm Özet Alanlarını Çek

`useIncomeStatementUpload.ts` - Query güncellemesi:

```typescript
const { data: existingData, isLoading: isLoadingExisting } = useQuery({
  queryKey: ['income-statement-upload', year, userId],
  queryFn: async () => {
    if (!userId) return null;
    const { data } = await supabase
      .from('yearly_income_statements')
      .select('source, file_url, file_name, net_sales, gross_profit, operating_profit')
      .eq('user_id', userId)
      .eq('year', year)
      .maybeSingle();
    return data;
  },
  enabled: !!userId,
});
```

#### 2. UploadState Interface'ine Özet Alanları Ekle

```typescript
interface UploadState {
  fileName: string | null;
  accounts: IncomeStatementAccount[];
  mappedData: Record<string, number>;
  warnings: string[];
  isApproved: boolean;
  // Yeni: Veritabanından gelen özet değerler
  savedSummary?: {
    netSales: number;
    grossProfit: number;
    operatingProfit: number;
  };
}
```

#### 3. Mevcut Veri Yüklenirken Özet Değerleri Set Et

```typescript
useEffect(() => {
  if (existingData?.source === 'mizan_upload' && existingData.file_name) {
    setUploadState({
      fileName: existingData.file_name,
      accounts: [], // Accounts parse'lanmış ve kaydedilmiş
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

#### 4. UI Bileşeninde Özet Değerleri Kullan

`IncomeStatementUploader.tsx` - Summary hesaplama güncellemesi:

```typescript
// Onaylı kayıtlar için veritabanından gelen değerleri kullan
// Onaylanmamış dosyalar için accounts'tan hesapla
const summary = uploadState?.isApproved && uploadState?.savedSummary
  ? uploadState.savedSummary  // DB'den gelen değerler
  : calculateSummary();        // Accounts'tan hesaplanan değerler
```

#### 5. Hesap Sayısı Gösterimi Düzelt

Onaylı kayıtlar için "0 hesap parse edildi" yerine daha anlamlı bir mesaj:

```typescript
<p className="text-sm text-muted-foreground">
  {uploadState.isApproved 
    ? 'Veriler veritabanına kaydedildi'
    : `${uploadState.accounts.length} hesap parse edildi`
  }
</p>
```

---

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `src/hooks/finance/useIncomeStatementUpload.ts` | Query'ye özet alanları ekle, state'e savedSummary ekle |
| `src/components/finance/IncomeStatementUploader.tsx` | Özet gösterimini savedSummary'den al |

---

### Beklenen Sonuç

| Senaryo | Önceki | Sonraki |
|---------|--------|---------|
| Sayfa yenilemesi sonrası | ₺0 gösteriyor | ₺5,276,940 gösterir |
| Sekme değişimi sonrası | ₺0 gösteriyor | Gerçek değerler görünür |
| Hesap sayısı | "0 hesap parse edildi" | "Veriler veritabanına kaydedildi" |
| Önizle butonu | Boş tablo | Onaylı kayıtlar için gizlenebilir veya bilgi gösterilebilir |

