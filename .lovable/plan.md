
## Hibrit Finansal Veri Sistemi - Resmi Veri Önceliği ve Entegrasyonu

### Mevcut Durum Analizi

Sistemde iki tip veri kaynagi var:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    VERİ KAYNAKLARI                              │
├─────────────────────────────────────────────────────────────────┤
│ 1. DİNAMİK VERİLER (Mevcut)                                    │
│    - bank_transactions tablosundan gelir/gider                 │
│    - receipts tablosundan faturalar                            │
│    - payroll_accruals tablosundan bordro                       │
│    → useFinancialDataHub, useIncomeStatement                   │
├─────────────────────────────────────────────────────────────────┤
│ 2. RESMİ VERİLER (Yeni - /finance/official-data)              │
│    - yearly_income_statements (is_locked + source)             │
│    - yearly_balance_sheets (is_locked)                         │
│    - official_trial_balances (mizan)                           │
│    → useOfficialIncomeStatement, useYearlyBalanceSheet         │
└─────────────────────────────────────────────────────────────────┘
```

### Hedef: Hibrit Veri Akışı

**Koşul:** Resmi veri kilitliyse (is_locked = true), tüm raporlar ve sayfalar resmi verileri kullanacak.

```text
┌─────────────────────────────────────────────────────────────────┐
│                    VERİ AKIŞ HİYERARŞİSİ                        │
├─────────────────────────────────────────────────────────────────┤
│ Öncelik 1: Kilitli Resmi Veri (is_locked = true)               │
│ Öncelik 2: Onaylanmış Yükleme (source = 'mizan_upload')        │
│ Öncelik 3: Dinamik Hesaplama (bank_transactions + receipts)    │
└─────────────────────────────────────────────────────────────────┘
```

---

### 1. Yeni Merkezi Hibrit Hook: useHybridFinancialData

Tum finansal verileri tek bir noktadan yoneten, kilit durumunu kontrol eden merkezi hook:

**Dosya:** `src/hooks/finance/useHybridFinancialData.ts`

```typescript
export function useHybridFinancialData(year: number) {
  // Resmi veri hook'lari
  const { officialStatement, isLocked: isIncomeLocked } = useOfficialIncomeStatement(year);
  const { yearlyBalance, isLocked: isBalanceLocked } = useYearlyBalanceSheet(year);
  
  // Dinamik veri hook'lari
  const dynamicIncomeStatement = useIncomeStatement(year);
  const dynamicHub = useFinancialDataHub(year);
  
  // Hibrit veri secimi
  const incomeStatement = useMemo(() => {
    if (isIncomeLocked && officialStatement) {
      // Resmi verileri dinamik format'a donustur
      return convertOfficialToStatement(officialStatement);
    }
    return dynamicIncomeStatement.statement;
  }, [isIncomeLocked, officialStatement, dynamicIncomeStatement.statement]);
  
  return {
    incomeStatement,
    balanceSheet: isBalanceLocked ? yearlyBalance : dynamicHub.balanceData,
    isOfficialData: isIncomeLocked || isBalanceLocked,
    officialBadge: { income: isIncomeLocked, balance: isBalanceLocked },
    // ... diger veriler
  };
}
```

---

### 2. Etkilenen Sayfalar ve Hook Guncellemeleri

| Sayfa/Hook | Mevcut Veri Kaynagi | Guncellenecek | Islem |
|------------|---------------------|---------------|-------|
| `/finance` (Dashboard) | useFinancialCalculations | Evet | Hibrit hook kullan |
| `/finance/reports` | useIncomeStatement | Evet | Hibrit hook kullan |
| `/finance/balance-sheet` | useBalanceSheet | Zaten is_locked kontrolu var | Kontrol et |
| `/finance/simulation` | useGrowthSimulation | Evet | Baz yil verisi hibrit olacak |
| `/finance/cost-center` | useCostCenterAnalysis | Hayir | Dinamik kalabilir |
| `/finance/vat-report` | useVatCalculations | Hayir | Dinamik kalabilir (KDV farkli) |

---

### 3. useIncomeStatement Hook Guncellemesi

Mevcut hook dinamik hesaplama yapiyor. Yeni versiyon:

```typescript
export function useIncomeStatement(year: number) {
  const { officialStatement, isLocked } = useOfficialIncomeStatement(year);
  const hub = useFinancialDataHub(year);
  const { summary: payrollSummary } = usePayrollAccruals(year);

  const statement = useMemo((): IncomeStatementData => {
    // RESMI VERI ONCELIK!
    if (isLocked && officialStatement) {
      return {
        grossSales: {
          yurtici: officialStatement.gross_sales_domestic || 0,
          yurtdisi: officialStatement.gross_sales_export || 0,
          diger: officialStatement.gross_sales_other || 0,
          total: (officialStatement.gross_sales_domestic || 0) + 
                 (officialStatement.gross_sales_export || 0) + 
                 (officialStatement.gross_sales_other || 0),
          // Legacy alanlar
          sbt: 0, ls: 0, zdhc: 0, danis: 0,
        },
        salesReturns: officialStatement.sales_returns || 0,
        netSales: officialStatement.net_sales || 0,
        costOfSales: (officialStatement.cost_of_goods_sold || 0) + 
                     (officialStatement.cost_of_merchandise_sold || 0) + 
                     (officialStatement.cost_of_services_sold || 0),
        grossProfit: officialStatement.gross_profit || 0,
        operatingExpenses: {
          pazarlama: officialStatement.marketing_expenses || 0,
          genelYonetim: officialStatement.general_admin_expenses || 0,
          total: (officialStatement.rd_expenses || 0) + 
                 (officialStatement.marketing_expenses || 0) + 
                 (officialStatement.general_admin_expenses || 0),
          // Alt kategoriler bos
          personel: 0, kira: 0, ulasim: 0, telekom: 0, 
          sigorta: 0, ofis: 0, muhasebe: 0, yazilim: 0, banka: 0, diger: 0,
        },
        operatingProfit: officialStatement.operating_profit || 0,
        // ... diger alanlar
        netProfit: officialStatement.net_profit || 0,
        profitMargin: officialStatement.net_sales > 0 
          ? (officialStatement.net_profit / officialStatement.net_sales) * 100 
          : 0,
      };
    }
    
    // Dinamik hesaplama (mevcut kod)
    // ...
  }, [isLocked, officialStatement, hub, payrollSummary]);

  return {
    statement,
    isLoading: hub.isLoading,
    isOfficial: isLocked, // UI'da badge gostermek icin
  };
}
```

---

### 4. useGrowthSimulation Baz Yil Verisi Guncellemesi

Simulasyon, baz yil (targetYear - 1) verilerini resmi kaynaklardan almali:

```typescript
// Gercek baz yil verilerini veritabanindan cek
const actualBaseYear = targetYear - 1;
const { statement: baseYearStatement, isOfficial } = useIncomeStatement(actualBaseYear);

// Summary hesaplamasinda resmi veri kullan
const realBaseData = useMemo(() => {
  if (!baseYearStatement) return null;
  
  const stmt = baseYearStatement;
  const totalExpenseTRY = (stmt.costOfSales || 0) + (stmt.operatingExpenses?.total || 0);
  const totalRevenueTRY = stmt.netSales || 0;
  
  // Kur donusumu
  const baseYearRate = baseYearExchangeRates.yearlyAverageRate;
  
  return {
    totalExpenseUSD: Math.round(totalExpenseTRY / baseYearRate),
    totalRevenueUSD: Math.round(totalRevenueTRY / baseYearRate),
    isOfficial, // UI'da badge goster
  };
}, [baseYearStatement, isOfficial, baseYearExchangeRates]);
```

---

### 5. OfficialData Sayfasina Kilit Ozelliği Ekleme

Her sekmeye kilitleme/kilidi acma butonu:

```typescript
// Gelir Tablosu sekmesi
<TabsContent value="income">
  <div className="flex justify-between items-center mb-4">
    <h3>Gelir Tablosu</h3>
    {existingData && (
      <Button
        variant={isIncomeLocked ? "destructive" : "default"}
        size="sm"
        onClick={() => isIncomeLocked ? unlockStatement() : lockStatement()}
      >
        <Lock className="h-4 w-4 mr-2" />
        {isIncomeLocked ? 'Kilidi Aç' : 'Kilitle (Resmi)'}
      </Button>
    )}
  </div>
  {/* Uploader veya Form */}
</TabsContent>
```

---

### 6. UI'da "Resmi Veri" Badge'i Gosterme

Tum finansal sayfalarda resmi veri kullanildiginda badge goster:

```typescript
// FinanceDashboard, Reports, BalanceSheet sayfalarinda
{isOfficial && (
  <Badge variant="default" className="bg-green-600">
    <Shield className="h-3 w-3 mr-1" />
    Resmi Veri
  </Badge>
)}
```

---

### 7. Route Navigasyonu Kontrolu

Dashboard'dan resmi veri sayfasina yonlendirme zaten mevcut:

```typescript
<Link to="/finance/official-data">
  <Card className="border-green-500/50">
    <Shield className="h-5 w-5 text-green-600" />
    <span>Resmi</span>
  </Card>
</Link>
```

---

### Degistirilecek Dosyalar

| Dosya | Degisiklik Turu | Oncelik |
|-------|-----------------|---------|
| `src/hooks/finance/useIncomeStatement.ts` | Resmi veri onceligi ekle | Yuksek |
| `src/hooks/finance/useBalanceSheet.ts` | Mevcut is_locked kontrolunu dogrula | Orta |
| `src/hooks/finance/useGrowthSimulation.ts` | Baz yil verisini hibrit yap | Yuksek |
| `src/hooks/finance/useFinancialCalculations.ts` | Hibrit veri desteği | Orta |
| `src/pages/finance/OfficialData.tsx` | Kilit butonlari ekle | Yuksek |
| `src/pages/finance/FinanceDashboard.tsx` | Resmi veri badge'i | Dusuk |
| `src/pages/finance/Reports.tsx` | Resmi veri badge'i | Dusuk |
| `src/components/finance/OfficialIncomeStatementForm.tsx` | Kilit butonu | Orta |
| `src/components/finance/OfficialBalanceSheetForm.tsx` | Kilit butonu | Orta |

---

### Teknik Detaylar

**Veritabani Kontrolu:**
- `yearly_income_statements.is_locked` - Gelir tablosu kilidi
- `yearly_balance_sheets.is_locked` - Bilanco kilidi
- Her iki tabloda da `source` alani mevcut ('manual', 'mizan_upload', 'file_upload')

**Mevcut Kilit Mekanizmasi:**
- `useOfficialIncomeStatement` hook'unda `lockStatement()` ve `unlockStatement()` fonksiyonlari mevcut
- `useYearlyBalanceSheet` hook'unda `lockBalance(true/false)` fonksiyonu mevcut

**Eksik Olan:**
- `useIncomeStatement` hook'u resmi verileri kontrol etmiyor
- `useGrowthSimulation` baz yil icin resmi verileri kullanmiyor
- UI'da kilit durumu gosterilmiyor

---

### Beklenen Sonuc

| Senaryo | Onceki | Sonraki |
|---------|--------|---------|
| Resmi gelir tablosu kilitli | Dinamik veri | Resmi veri |
| Resmi bilanco kilitli | Zaten calisiyor | Kontrol edildi |
| Simulasyon baz yili | Dinamik | Resmi varsa resmi |
| Dashboard ozet | Dinamik | Resmi varsa resmi |
| Reports sayfasi | Dinamik | Resmi varsa resmi |
| UI'da gosterim | Belirsiz | "Resmi Veri" badge'i |

