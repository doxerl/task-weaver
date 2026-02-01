
## Toplu Silme Fonksiyonu - /finance/receipts/upload

### Genel Bakış

ReceiptUpload sayfasına checkbox ile belge seçimi ve toplu silme özelliği eklenecek.

### Kullanıcı Deneyimi

```
+--------------------------------------------------+
|  ☐ 2 belge seçildi           [Seçimi Temizle] [🗑️ Sil] |
+--------------------------------------------------+
|  ☑ Satıcı A - ₺1,500.00                    [...]  |
|  ☐ Satıcı B - ₺2,300.00                    [...]  |
|  ☑ Satıcı C - ₺890.00                      [...]  |
+--------------------------------------------------+
```

- Kart üzerindeki checkbox tıklandığında belge seçilir
- Seçim yapıldığında üstte seçim bar'ı görünür
- "Sil" butonu tıklandığında onay dialog'u açılır
- Silme işlemi sonrası seçim temizlenir

### Teknik Değişiklikler

#### 1. useReceipts.ts - Toplu Silme Fonksiyonu

Yeni `deleteMultipleReceipts` mutation eklenecek:

```typescript
const deleteMultipleReceipts = useMutation({
  mutationFn: async (ids: string[]) => {
    const { error } = await supabase
      .from('receipts')
      .delete()
      .in('id', ids);
    if (error) throw error;
    return ids.length;
  },
  onSuccess: (count) => {
    queryClient.invalidateQueries({ queryKey: ['receipts'] });
    toast({ title: `${count} belge silindi` });
  }
});
```

#### 2. UploadedReceiptCard.tsx - Seçim Checkbox'ı

Props'a selection desteği eklenecek:

```typescript
interface UploadedReceiptCardProps {
  receipt: Receipt;
  // ... mevcut props
  isSelectable?: boolean;        // Seçim modu aktif mi
  isSelected?: boolean;          // Bu kart seçili mi
  onSelectionChange?: (id: string, selected: boolean) => void;
}
```

Kart sol üstüne ek checkbox eklenecek (mevcut "Rapora dahil et" checkbox'ından farklı).

#### 3. ReceiptUpload.tsx - State ve UI

Yeni state'ler:

```typescript
const [selectedReceiptIds, setSelectedReceiptIds] = useState<Set<string>>(new Set());
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const isSelectionMode = selectedReceiptIds.size > 0;
```

Seçim bar'ı (liste üstünde):

```typescript
{isSelectionMode && (
  <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-3 flex items-center justify-between">
    <span className="text-sm font-medium">
      {selectedReceiptIds.size} belge seçildi
    </span>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={clearSelection}>
        Seçimi Temizle
      </Button>
      <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
        <Trash2 className="h-4 w-4 mr-1" />
        Sil ({selectedReceiptIds.size})
      </Button>
    </div>
  </div>
)}
```

Onay dialog'u:

```typescript
<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
        <Trash2 className="h-5 w-5" />
        Toplu Silme Onayı
      </AlertDialogTitle>
      <AlertDialogDescription>
        <strong>{selectedReceiptIds.size}</strong> belge kalıcı olarak silinecek.
        Bu işlem geri alınamaz!
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>İptal</AlertDialogCancel>
      <AlertDialogAction 
        className="bg-destructive hover:bg-destructive/90"
        onClick={handleBulkDelete}
      >
        Evet, Sil
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|-------|------------|
| `src/hooks/finance/useReceipts.ts` | `deleteMultipleReceipts` mutation ekle |
| `src/components/finance/UploadedReceiptCard.tsx` | Selection checkbox ve props ekle |
| `src/pages/finance/ReceiptUpload.tsx` | Selection state, bar, dialog, handler'lar ekle |

### Akış

1. Kullanıcı kart üzerindeki checkbox'ı tıklar
2. `selectedReceiptIds` state'i güncellenir
3. Seçim bar'ı görünür hale gelir
4. "Sil" butonuna tıklanır
5. Onay dialog'u açılır
6. "Evet, Sil" tıklanır
7. `deleteMultipleReceipts.mutate(Array.from(selectedReceiptIds))` çağrılır
8. Silme sonrası `selectedReceiptIds` temizlenir
9. Toast ile sonuç bildirilir

### Beklenen Sonuç

- Kullanıcılar birden fazla belgeyi hızlıca seçip silebilir
- Onay dialog'u yanlışlıkla silmeyi önler
- Seçim bar'ı kaç belgenin seçili olduğunu net gösterir
- Mevcut tek silme işlevi de korunur
