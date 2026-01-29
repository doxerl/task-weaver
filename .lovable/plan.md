

## Bilanço Yükleme State Korunma Sorunu Düzeltme

### Problem Özeti

Kullanıcı bilanço dosyasını yükleyip parse ettikten sonra sekme değiştirdiğinde (örn. "Gelir Tablosu" sekmesine geçip geri geldiğinde), yüklenen veriler kayboluyor. Bunun nedeni:

1. **React Component Unmount**: Radix UI Tabs, aktif olmayan sekmelerin içeriğini DOM'dan kaldırır
2. **Local State Kaybı**: Hook'taki `uploadResult`, `fileName`, `fileUrl` state'leri component unmount olunca sıfırlanır
3. **Veritabanı Senkronizasyonu Yok**: Parse sonucu henüz veritabanına kaydedilmeden sekme değişince kaybolur

---

### Çözüm Yaklaşımları

İki yaklaşım var, ben **Yaklaşım 2**'yi öneriyorum:

#### Yaklaşım 1: Tabs'ı `forceMount` ile Kullanma
- Tüm sekmeleri her zaman render etmek (ama gizli tutmak)
- Dezavantaj: Gereksiz render ve performans maliyeti

#### Yaklaşım 2: State'i Parent'a Taşıma (Önerilen)
- Parse sonucunu `OfficialData` sayfasında tutma
- Component unmount olsa bile state korunur
- Daha temiz ve performanslı

---

### Çözüm Detayları

#### 1. OfficialData Sayfasında State Tutma

`src/pages/finance/OfficialData.tsx`:

```typescript
// Bilanço upload state'i parent'ta tut
const [balanceUploadResult, setBalanceUploadResult] = useState<BalanceSheetUploadResult | null>(null);
const [balanceFileName, setBalanceFileName] = useState<string | null>(null);
const [balanceFileUrl, setBalanceFileUrl] = useState<string | null>(null);

// BalanceSheetUploader'a prop olarak geçir
<BalanceSheetUploader 
  year={selectedYear}
  externalState={{
    uploadResult: balanceUploadResult,
    setUploadResult: setBalanceUploadResult,
    fileName: balanceFileName,
    setFileName: setBalanceFileName,
    fileUrl: balanceFileUrl,
    setFileUrl: setBalanceFileUrl,
  }}
/>
```

#### 2. Hook'u Dış State'i Kabul Edecek Şekilde Güncelleme

`src/hooks/finance/useBalanceSheetUpload.ts`:

```typescript
interface ExternalState {
  uploadResult: BalanceSheetUploadResult | null;
  setUploadResult: (result: BalanceSheetUploadResult | null) => void;
  fileName: string | null;
  setFileName: (name: string | null) => void;
  fileUrl: string | null;
  setFileUrl: (url: string | null) => void;
}

export function useBalanceSheetUpload(year: number, externalState?: ExternalState) {
  // Dış state varsa onu kullan, yoksa internal state kullan
  const [internalUploadResult, setInternalUploadResult] = useState<BalanceSheetUploadResult | null>(null);
  const [internalFileName, setInternalFileName] = useState<string | null>(null);
  const [internalFileUrl, setInternalFileUrl] = useState<string | null>(null);

  // State seçimi
  const uploadResult = externalState?.uploadResult ?? internalUploadResult;
  const setUploadResult = externalState?.setUploadResult ?? setInternalUploadResult;
  const fileName = externalState?.fileName ?? internalFileName;
  const setFileName = externalState?.setFileName ?? setInternalFileName;
  const fileUrl = externalState?.fileUrl ?? internalFileUrl;
  const setFileUrl = externalState?.setFileUrl ?? setInternalFileUrl;
  
  // ... rest of the hook uses these unified state variables
}
```

#### 3. BalanceSheetUploader Component'i Güncelleme

`src/components/finance/BalanceSheetUploader.tsx`:

```typescript
interface BalanceSheetUploaderProps {
  year: number;
  externalState?: {
    uploadResult: BalanceSheetUploadResult | null;
    setUploadResult: (result: BalanceSheetUploadResult | null) => void;
    fileName: string | null;
    setFileName: (name: string | null) => void;
    fileUrl: string | null;
    setFileUrl: (url: string | null) => void;
  };
}

export function BalanceSheetUploader({ year, externalState }: BalanceSheetUploaderProps) {
  // Hook'a external state'i geçir
  const {
    uploadBalanceSheet,
    approveAndSave,
    // ...
  } = useBalanceSheetUpload(year, externalState);
  // ...
}
```

---

### Alternatif Basit Çözüm: Tabs forceMount

Eğer yukarıdaki çözüm çok karmaşık gelirse, daha basit bir çözüm:

`src/pages/finance/OfficialData.tsx`:

```typescript
<TabsContent value="balance" className="mt-6" forceMount hidden={activeTab !== 'balance'}>
  {/* ... */}
</TabsContent>
```

Bu yöntemle component her zaman mount kalır, sadece CSS ile gizlenir.

---

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `src/pages/finance/OfficialData.tsx` | State'i parent'a taşı veya forceMount ekle |
| `src/hooks/finance/useBalanceSheetUpload.ts` | External state desteği ekle |
| `src/components/finance/BalanceSheetUploader.tsx` | Props ile external state kabul et |

---

### Önerilen Çözüm

**Basit çözüm için `forceMount` öneriyorum** - hızlı ve etkili. Tek satır değişiklik:

```tsx
<TabsContent value="balance" className="mt-6" forceMount hidden={activeTab !== 'balance'}>
```

Bu değişiklik ile:
- Component unmount olmaz
- State korunur
- Minimum kod değişikliği gerekir

Aynı değişiklik `income` sekmesi için de yapılabilir.

---

### Beklenen Sonuç

| Senaryo | Önceki | Sonraki |
|---------|--------|---------|
| Dosya yükle → Sekme değiştir → Geri gel | Veri kaybolur | Veri korunur |
| Parse sonucu | Sıfırlanır | State'te kalır |
| Kullanıcı deneyimi | Frustrasyonlu | Sorunsuz |

