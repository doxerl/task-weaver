

# Tablo Hucreleri Bos Gorunme Sorunu

## Sorun Kaynagi

`print.css` dosyasinda ekledigimiz kural:
```css
.cursor-pointer {
  display: none !important;
}
```

Bu kural cok genis kapsamli. `EditableProjectionTable` bileseninde Q1-Q4 hucreleri `cursor-pointer` sinifina sahip (tiklanarak duzenleme icin):
```tsx
<div className="cursor-pointer hover:bg-muted/50 rounded px-2 py-1 text-xs">
  {formatCompactUSD(item[quarter])}
</div>
```

Bu yuzden tum ceyreklik degerler print'te gizleniyor, sadece Toplam sutunu gorunuyor.

## Cozum

### Dosya: `src/lib/pdf/styles/print.css`

`.cursor-pointer` kuralini kaldir ve yerine daha spesifik kurallar koy. Asil hedef AIAnalysisSummaryCard icindeki aksyon kartlariydi - onlar zaten `print-hidden` sinifiyla gizlendi. Gereksiz `.cursor-pointer` kuralini kaldirmak yeterli.

```css
/* KALDIRILACAK: */
.cursor-pointer {
  display: none !important;
}
```

Bu tek degisiklik sorunu cozer. Aksyon kartlari zaten `print-hidden` ile gizleniyor, `.cursor-pointer` kurali gereksiz ve zarar veriyor.

## Degisecek Dosyalar

| Dosya | Degisiklik |
|-------|------------|
| `src/lib/pdf/styles/print.css` | `.cursor-pointer` gizleme kuralini kaldir |

## Sonuc
Q1-Q4 tablo hucreleri print/PDF'te tekrar gorunur olacak.

