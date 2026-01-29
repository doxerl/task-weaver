

## Gelir Tablosu ve Bilanço Yükleme Verilerinin Kaybolması Sorunu

### Problem Analizi

Yüklenen ve parse edilen veriler sekmeler arası geçişte kayboluyor çünkü:

| Bileşen | Sorun |
|---------|-------|
| `useIncomeStatementUpload` | Sadece `useState` kullanıyor, veritabanından okumuyor |
| `useBalanceSheetUpload` | Aynı sorun - sadece local state |
| Sekme değişimi | Bileşen unmount olunca state sıfırlanıyor |
| Sayfa yenilemesi | Local state kaybolduğu için veriler görünmüyor |

### Veritabanı Durumu

Her iki tabloda da gerekli alanlar mevcut:
- `yearly_income_statements`: `source`, `file_url` alanları var
- `yearly_balance_sheets`: `source`, `file_name`, `file_url`, `raw_accounts` alanları var

Ancak hook'lar bu verileri başlangıçta okumuyorlar.

---

### Çözüm Planı

#### 1. `useIncomeStatementUpload` Hook'unu Güncelle

Mevcut durumu veritabanından oku ve upload state'i ile senkronize et:

```typescript
// Hook başlangıcına eklenecek
const { data: existingData, isLoading: isLoadingExisting } = useQuery({
  queryKey: ['income-statement-upload', year, userId],
  queryFn: async () => {
    const { data } = await supabase
      .from('yearly_income_statements')
      .select('source, file_url, file_name')
      .eq('user_id', userId)
      .eq('year', year)
      .maybeSingle();
    return data;
  },
  enabled: !!userId,
});

// Mevcut veri varsa uploadState'i başlat
useEffect(() => {
  if (existingData?.source === 'mizan_upload') {
    setUploadState({
      fileName: existingData.file_name,
      accounts: [], // Önceden parse edilmiş
      mappedData: {},
      warnings: [],
      isApproved: true, // Zaten kayıtlı
    });
  }
}, [existingData]);
```

#### 2. `useBalanceSheetUpload` Hook'unu Güncelle

Aynı mantıkla mevcut upload'u oku:

```typescript
// Hook başlangıcına eklenecek
const { data: existingUpload, isLoading: isLoadingExisting } = useQuery({
  queryKey: ['balance-sheet-upload', year, user?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('yearly_balance_sheets')
      .select('source, file_name, file_url, raw_accounts, is_locked')
      .eq('user_id', user.id)
      .eq('year', year)
      .maybeSingle();
    return data;
  },
  enabled: !!user?.id,
});

// Mevcut dosya yüklemesi varsa göster
useEffect(() => {
  if (existingUpload?.source === 'file_upload' && existingUpload.raw_accounts) {
    setUploadResult({
      accounts: existingUpload.raw_accounts,
      summary: { ... }
    });
    setFileName(existingUpload.file_name);
    setFileUrl(existingUpload.file_url);
  }
}, [existingUpload]);
```

#### 3. Gelir Tablosu için `file_name` Alanı Ekle

`yearly_income_statements` tablosunda `file_name` eksik, eklenecek:

```sql
ALTER TABLE yearly_income_statements 
ADD COLUMN IF NOT EXISTS file_name text;
```

#### 4. Gelir Tablosu Upload Hook'unda Dosya Bilgisini Kaydet

`approveIncomeStatement` fonksiyonunda dosya adını da kaydet:

```typescript
const payload = {
  ...formData,
  ...totals,
  user_id: userId,
  year,
  source: 'mizan_upload',
  file_name: uploadState.fileName, // Bu eksikti
  updated_at: new Date().toISOString(),
};
```

---

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `src/hooks/finance/useIncomeStatementUpload.ts` | useQuery ile mevcut veriyi oku, dosya adını kaydet |
| `src/hooks/finance/useBalanceSheetUpload.ts` | useQuery ile mevcut upload'u oku |
| Veritabanı migrasyonu | `yearly_income_statements` tablosuna `file_name` ekle |

---

### Davranış Sonrası

| Senaryo | Sonuç |
|---------|-------|
| Dosya yüklendi, sekme değişti | ❌ Kaybolur (henüz onaylanmamış) |
| Dosya yüklendi + onaylandı, sekme değişti | ✅ Veritabanından yüklenir |
| Sayfa yenilendi | ✅ Onaylı dosyalar görünür |
| Yeni dosya yüklemek için | "Sil" butonuyla mevcut yükleme kaldırılır |

**Not:** Onaylanmamış (henüz kaydedilmemiş) dosyalar sekme değişiminde kaybolacak - bu beklenen davranış. Kullanıcı dosya yükledikten sonra "Onayla" butonuna basmalı.

---

### Alternatif: Anlık Kayıt (Draft Mode)

Eğer onaylanmamış dosyaların da korunması istenirse:

1. "draft" status ile geçici kayıt yapılabilir
2. Tabloya `status` alanı eklenebilir ('draft' | 'approved')
3. Draft kayıtlar sekme değişiminde korunur
4. Onay ile 'approved' statüsüne geçer

Bu yaklaşım daha karmaşık ama daha iyi UX sağlar.

