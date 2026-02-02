
## Dil Değiştirme Toggle'ı - Her Sayfada Header'da Görünme Planı

### Mevcut Durum
- `LanguageToggle` component'i hazır (`src/components/LanguageSelector.tsx`)
- Her sayfa kendi header'ını yönetiyor (ortak layout yok)
- BottomTabBar tüm sayfalarda ortak kullanılıyor

### Çözüm Yaklaşımı
`LanguageToggle`'ı mevcut her header'a manuel eklemek yerine, yeniden kullanılabilir bir `AppHeader` component'i oluşturup tüm sayfalarda kullanacağız.

### Oluşturulacak Dosya

**`src/components/AppHeader.tsx`**
- Props: `title`, `subtitle?`, `backPath?`, `backLabel?`, `rightContent?`, `children?`
- Otomatik olarak sağ üstte LanguageToggle içerecek
- Sticky header styling (backdrop-blur)
- Responsive tasarım

```
┌─────────────────────────────────────────────────────┐
│  ← Geri   [Sayfa Başlığı]     🌐🇹🇷  [Ek Butonlar]  │
└─────────────────────────────────────────────────────┘
```

### Güncellenecek Sayfalar

| Sayfa | Dosya | Header Değişikliği |
|-------|-------|-------------------|
| Finance Dashboard | `src/pages/finance/FinanceDashboard.tsx` | Header yok → AppHeader ekle |
| Growth Simulation | `src/pages/finance/GrowthSimulation.tsx` | Mevcut header → AppHeader |
| Scenario Comparison | `src/pages/finance/ScenarioComparisonPage.tsx` | Mevcut header → AppHeader |
| Today | `src/pages/Today.tsx` | Mevcut header → AppHeader |
| Week | `src/pages/Week.tsx` | Mevcut header → AppHeader |
| Settings | `src/pages/Settings.tsx` | Mevcut header → AppHeader |

### Teknik Detaylar

**1. AppHeader Component Yapısı:**
```tsx
// src/components/AppHeader.tsx
interface AppHeaderProps {
  title: string;
  subtitle?: string;
  backPath?: string;
  backLabel?: string;
  rightContent?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  backPath,
  backLabel,
  rightContent,
  icon,
  badge
}: AppHeaderProps) {
  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-4">
            {backPath && (
              <Link to={backPath}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                  {backLabel}
                </Button>
              </Link>
            )}
            <div className="flex items-center gap-2">
              {icon}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{title}</h1>
                  {badge}
                </div>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Right: Language Toggle + Custom Content */}
          <div className="flex items-center gap-2">
            <LanguageToggle />
            {rightContent}
          </div>
        </div>
      </div>
    </header>
  );
}
```

**2. Sayfa Güncelleme Örneği (FinanceDashboard):**
```tsx
// Önce:
<div className="min-h-screen bg-background pb-20">
  <div className="p-4 space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">Finans</h1>
      ...
    </div>

// Sonra:
<div className="min-h-screen bg-background pb-20">
  <AppHeader 
    title="Finans" 
    icon={<Wallet className="h-5 w-5 text-primary" />}
    badge={incomeStatement.isOfficial && <Badge>Resmi Veri</Badge>}
    rightContent={
      <Select value={String(year)} onValueChange={...}>
        ...
      </Select>
    }
  />
  <div className="p-4 space-y-6">
    ...
```

### Uygulama Sırası

1. **AppHeader component oluştur** → `src/components/AppHeader.tsx`
2. **FinanceDashboard güncelle** (en basit sayfa)
3. **GrowthSimulation güncelle** (kompleks header)
4. **ScenarioComparisonPage güncelle**
5. **Today sayfası güncelle**
6. **Week sayfası güncelle**
7. **Settings sayfası güncelle**

### Görsel Sonuç

Her sayfada sağ üstte şu görünüm olacak:

```
🌐 🇹🇷   [Diğer Butonlar]
```

Tıklandığında:
```
🌐 🇬🇧   [Diğer Butonlar]
```

### Avantajlar
- Tek component, tüm sayfalarda tutarlı görünüm
- Gelecekte header'a eklenen her özellik otomatik tüm sayfalara yansır
- LanguageToggle her zaman aynı pozisyonda
- Mevcut sayfa-özel butonlar `rightContent` ile korunur
