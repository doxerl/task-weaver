
# Düzeltme Planı: Investment Deal Simulator ve Focus Projects Veri Kaydetme Sorunu

## Problem Özeti

Kullanıcı, "Investment Deal Simulator" ve "Investment Focus Projects" bölümlerinde yaptığı değişikliklerin senaryolara kaydedilmediğini ve AI analizinin bu bilgileri almadığını bildirdi.

**Tespit Edilen Kök Neden:**
1. Veritabanında `deal_config: null` ve `focus_projects: []` kalıyor
2. `GrowthSimulation.tsx`'deki `handleSave` fonksiyonu doğru parametrelerle çalışıyor ANCAK:
   - Kullanıcı değişiklik yapıp kaydetmeden karşılaştırma sayfasına gidebiliyor
   - DealSimulator/FocusProjectSelector bileşenlerinde **otomatik kaydetme** yok
3. Bileşenler state'i güncelliyor ama veritabanına persist etmiyor

## Çözüm Stratejisi

### Seçenek 1: Otomatik Kaydetme (Auto-Save) - ÖNERİLEN
Kullanıcı değişiklik yaptığında debounced auto-save ile veritabanına kaydet.

### Seçenek 2: Uyarı Sistemi
Kullanıcı kaydedilmemiş değişikliklerle sayfadan ayrılmaya çalıştığında uyarı göster.

### Seçenek 3: Inline Save Butonu
Her bileşene ayrı bir "Kaydet" butonu ekle.

**Tercih:** Seçenek 1 (Otomatik Kaydetme) - En iyi UX

## Teknik Uygulama

### Adım 1: Değişiklik Takip State'i Ekle (GrowthSimulation.tsx)
```typescript
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
```

### Adım 2: Değişiklik Handler'larına Flag Ekle
```typescript
const handleDealConfigChange = (field, value) => {
  // ... mevcut setter
  setHasUnsavedChanges(true);
};

const handleFocusProjectsChange = (projects) => {
  setFocusProjects(projects);
  setHasUnsavedChanges(true);
};
```

### Adım 3: Debounced Auto-Save Ekle
```typescript
useEffect(() => {
  if (!hasUnsavedChanges || !scenariosHook.currentScenarioId) return;
  
  const timer = setTimeout(async () => {
    await handleSave();
    setHasUnsavedChanges(false);
  }, 2000); // 2 saniye debounce
  
  return () => clearTimeout(timer);
}, [hasUnsavedChanges, investmentAmount, equityPercentage, focusProjects, ...]);
```

### Adım 4: UI Göstergesi Ekle
```typescript
{hasUnsavedChanges && (
  <Badge variant="outline" className="text-amber-400">
    <Loader2 className="h-3 w-3 animate-spin mr-1" />
    Kaydediliyor...
  </Badge>
)}
```

### Adım 5: Sayfa Çıkış Uyarısı (Fallback)
```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [hasUnsavedChanges]);
```

## Dosya Değişiklikleri

| Dosya | Değişiklik |
|-------|-----------|
| `src/pages/finance/GrowthSimulation.tsx` | Auto-save logic, unsaved changes tracking |
| `src/components/simulation/DealSimulatorCard.tsx` | onChange callback'leri parent'a bildirimi |
| `src/components/simulation/FocusProjectSelector.tsx` | onChange callback'leri parent'a bildirimi |

## Ek İyileştirmeler

1. **Toast Bildirimi**: Auto-save sonrası "✓ Değişiklikler kaydedildi" göster
2. **Kaydetme Göstergesi**: Header'da küçük bir spinner/checkmark
3. **Hata Durumu**: Kaydetme başarısız olursa uyarı göster

## Veri Akışı (Düzeltilmiş)

```text
DealSimulatorCard / FocusProjectSelector
    ↓ (onChange)
GrowthSimulation State Güncelle
    ↓ (setHasUnsavedChanges(true))
2 saniye debounce bekle
    ↓
handleSave() → useScenarios.saveScenario()
    ↓
simulation_scenarios tablosu güncellendi
    ↓ (refetch)
ScenarioComparisonPage: scenarioA.focusProjects ✓
    ↓
AI Analizi tam verilerle çalışır ✓
```
