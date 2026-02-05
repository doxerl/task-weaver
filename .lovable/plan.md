

# Deal Simulator ve Focus Projects'i Dikey Sıralama

## Mevcut Durum
Ekran görüntüsünde görüldüğü gibi, "Investment Deal Simulator" ve "Investment Focus Projects" kartları yan yana (`lg:grid-cols-2`) görüntüleniyor ve UI sıkışık görünüyor.

## Çözüm
Bu iki bölümü **alt alta (dikey)** sıralayarak tam ekran genişliğinde göstereceğiz.

## Değişiklik

### Dosya: `src/pages/finance/GrowthSimulation.tsx`

**Satır 621:**
```tsx
// Mevcut (yan yana):
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

// Yeni (alt alta - tam genişlik):
<div className="space-y-4">
```

Bu değişiklikle:
- Her iki kart da tam ekran genişliğinde görünecek
- Daha fazla alan kullanılabilecek
- Mobilde zaten tek kolon olan görünüm masaüstünde de korunacak

