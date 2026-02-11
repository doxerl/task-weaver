
# PDF'te "AI tarafindan olusturuldu" Metnini Gizleme

## Sorun
`EditableProjectionTable` bileseninde `description` prop'u "AI tarafindan olusturuldu - duzenleyebilirsiniz" metnini gosteriyor. Bu metin interaktif bir bilgi olup PDF'te yer almamali.

## Cozum

### Dosya: `src/components/simulation/EditableProjectionTable.tsx`
Satir 66-68'deki `CardDescription` elementine `print-hidden` sinifi ekle:

```tsx
// Onceki:
<CardDescription className="text-xs mt-1">{description}</CardDescription>

// Sonraki:
<CardDescription className="text-xs mt-1 print-hidden">{description}</CardDescription>
```

Bu tek degisiklik, "AI tarafindan olusturuldu - duzenleyebilirsiniz" metnini PDF'ten gizlerken UI'da gorunur birakir.

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `src/components/simulation/EditableProjectionTable.tsx` | `CardDescription`'a `print-hidden` sinifi ekle |
