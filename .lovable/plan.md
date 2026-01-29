

## Gelir Tablosu Sekmesine Dosya Yükleme + AI Parsing Ekleme

### Mevcut Durum

| Sekme | Mevcut Özellikler |
|-------|-------------------|
| **Mizan** | Dosya yükleme + AI parsing + önizleme + onaylama |
| **Gelir Tablosu** | Sadece manuel form (dosya yükleme yok) |
| **Bilanço** | Sadece manuel form |

### Hedef

Gelir Tablosu sekmesini Mizan sekmesi gibi yapılandırarak:
- Excel/PDF dosya yükleme
- AI ile 6xx hesap kodlarını parse etme
- Önizleme tablosu ile kontrol
- "Onayla ve Aktar" ile verileri kaydetme

---

### Kullanıcı Arayüzü Tasarımı

```
┌────────────────────────────────────────────────────────────┐
│ Gelir Tablosu Sekmesi                                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  [📤 Dosya Yükle]  [📝 Manuel Giriş]   ← Mod seçimi       │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ "Dosya Yükle" seçili ise:                                 │
│ ┌────────────────────────────────────────────────────────┐ │
│ │      📤 Excel/PDF sürükle veya dosya seç              │ │
│ │                                                        │ │
│ │      Desteklenen: .xlsx, .xls, .pdf                   │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ Dosya yüklendikten sonra:                                  │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 📄 mizan-2025.xlsx                    [Onay Bekliyor]  │ │
│ │ 15 hesap parse edildi                                  │ │
│ ├────────────────────────────────────────────────────────┤ │
│ │ Net Satışlar:      ₺ 2.850.000                        │ │
│ │ Satışların Maliyeti: ₺ 1.200.000                      │ │
│ │ Faaliyet Giderleri:  ₺ 450.000                        │ │
│ │ Net Kâr:           ₺ 1.200.000                        │ │
│ ├────────────────────────────────────────────────────────┤ │
│ │ [👁 Önizle]  [✓ Onayla ve Aktar]  [🗑 Sil]           │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ "Manuel Giriş" seçili ise:                                │
│ (Mevcut OfficialIncomeStatementForm gösterilir)           │
└────────────────────────────────────────────────────────────┘
```

---

### Teknik Uygulama Planı

#### 1. Yeni Edge Function: `parse-income-statement`

Gelir tablosu dosyalarını AI ile parse etmek için yeni edge function.

**Dosya:** `supabase/functions/parse-income-statement/index.ts`

**Özellikler:**
- Excel parsing (XLSX kütüphanesi ile)
- PDF parsing (Lovable AI Gateway ile)
- 6xx hesap kodlarını tanıma
- Türk sayı formatı desteği (1.234.567,89)
- Yapılandırılmış JSON çıktısı

**AI Prompt:**
```
Türk Tekdüzen Hesap Planı gelir tablosu hesaplarını parse et.

HESAP KODLARI:
- 600-602: Brüt Satışlar (Alacak = Gelir)
- 610-611: Satış İndirimleri (Borç = Gider)
- 620-622: Satışların Maliyeti (Borç = Gider)
- 630-632: Faaliyet Giderleri (Borç = Gider)
- 640-649: Diğer Faaliyet Gelirleri (Alacak = Gelir)
- 650-659: Diğer Faaliyet Giderleri (Borç = Gider)
- 660-661: Finansman Giderleri (Borç = Gider)
- 671-679: Olağandışı Gelirler (Alacak = Gelir)
- 681-689: Olağandışı Giderler (Borç = Gider)
- 691-692: Vergi Karşılıkları (Borç = Gider)
```

#### 2. Yeni Bileşen: `IncomeStatementUploader`

`TrialBalanceUploader` benzeri dosya yükleme bileşeni.

**Dosya:** `src/components/finance/IncomeStatementUploader.tsx`

**Özellikler:**
- Drag & drop dosya yükleme alanı
- Excel ve PDF desteği
- Yükleme sırasında loading durumu
- Parse edilen verilerin özet gösterimi
- Önizleme dialog'u (hesap bazında tablo)
- "Onayla ve Aktar" butonu
- Silme işlemi

#### 3. Yeni Hook: `useIncomeStatementUpload`

Upload ve approval işlemlerini yönetecek hook.

**Dosya:** `src/hooks/finance/useIncomeStatementUpload.ts`

**İşlevler:**
- `uploadIncomeStatement(file)`: Dosya yükle ve parse et
- `approveIncomeStatement()`: Verileri kaydet
- `deleteUpload()`: Yüklenen veriyi sil
- Geçici veri durumu yönetimi

#### 4. `OfficialData.tsx` Güncellemesi

Gelir Tablosu sekmesine mod seçici ekle.

**Değişiklikler:**
```typescript
const [incomeMode, setIncomeMode] = useState<'upload' | 'manual'>('upload');

// Gelir Tablosu sekmesinde:
<TabsContent value="income">
  <div className="flex gap-2 mb-4">
    <Button 
      variant={incomeMode === 'upload' ? 'default' : 'outline'}
      onClick={() => setIncomeMode('upload')}
    >
      <Upload className="h-4 w-4 mr-2" />
      Dosya Yükle
    </Button>
    <Button 
      variant={incomeMode === 'manual' ? 'default' : 'outline'}
      onClick={() => setIncomeMode('manual')}
    >
      <Edit className="h-4 w-4 mr-2" />
      Manuel Giriş
    </Button>
  </div>
  
  {incomeMode === 'upload' ? (
    <IncomeStatementUploader year={selectedYear} />
  ) : (
    <OfficialIncomeStatementForm year={selectedYear} />
  )}
</TabsContent>
```

---

### Veritabanı Değişikliği

Yeni bir tablo oluşturulmayacak. Mevcut `yearly_income_statements` tablosu kullanılacak. Parse edilen veriler geçici olarak state'te tutulup, onaylandığında bu tabloya kaydedilecek.

Alternatif olarak, geçici veriyi tutmak için `official_income_statement_uploads` tablosu eklenebilir (Mizan'daki `official_trial_balances` gibi).

---

### Değiştirilecek/Oluşturulacak Dosyalar

| Dosya | İşlem | Açıklama |
|-------|-------|----------|
| `supabase/functions/parse-income-statement/index.ts` | Yeni | AI ile gelir tablosu parsing |
| `src/components/finance/IncomeStatementUploader.tsx` | Yeni | Dosya yükleme bileşeni |
| `src/hooks/finance/useIncomeStatementUpload.ts` | Yeni | Upload hook |
| `src/pages/finance/OfficialData.tsx` | Güncelle | Mod seçici ve uploader ekle |
| `supabase/config.toml` | Güncelle | Yeni edge function config |

---

### Uygulama Sırası

| Sıra | Görev | Açıklama |
|------|-------|----------|
| 1 | Edge Function | `parse-income-statement` oluştur |
| 2 | Hook | `useIncomeStatementUpload` oluştur |
| 3 | Bileşen | `IncomeStatementUploader` oluştur |
| 4 | Sayfa | `OfficialData.tsx` güncelle |
| 5 | Config | `supabase/config.toml` güncelle |

---

### Beklenen Sonuçlar

- Gelir Tablosu sekmesinde dosya yükleme seçeneği
- Muhasebeciden gelen Excel/PDF dosyaları AI ile parse edilir
- 6xx hesap kodları otomatik tanınır ve field'lara eşlenir
- Önizleme tablosu ile verileri kontrol edebilme
- "Onayla ve Aktar" ile verileri kalıcı olarak kaydetme
- Manuel giriş seçeneği korunur

