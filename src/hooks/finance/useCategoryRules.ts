import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { TransactionCategory, ParsedTransaction } from '@/types/finance';

export interface UserCategoryRule {
  id: string;
  user_id: string;
  pattern: string;
  category_id: string | null;
  rule_type: 'contains' | 'startsWith' | 'exact' | 'regex';
  amount_condition: 'positive' | 'negative' | 'any';
  is_partner_rule: boolean;
  partner_type: 'OUT' | 'IN' | 'BOTH' | null;
  description: string | null;
  priority: number;
  is_active: boolean;
  hit_count: number;
  last_hit_at: string | null;
  created_at: string;
  updated_at: string;
  category?: TransactionCategory;
}

export interface RuleMatchResult {
  transactionIndex: number;
  categoryId: string | null;
  categoryCode: string;
  categoryType: string;
  confidence: number;
  source: 'user_rule' | 'keyword' | 'context_rule' | 'amount_rule' | 'excel_label' | 'ai';
  reasoning: string;
  affectsPnl: boolean;
  balanceImpact: string;
  counterparty?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// NEGATİF PATTERN'LER - FİRMA ADI TUZAKLARI
// Bu pattern'ler eşleşirse, ilgili kategoriye ATANMAmalı
// ═══════════════════════════════════════════════════════════════════════════
const NEGATIVE_PATTERNS: Record<string, RegExp[]> = {
  'HISSE': [
    /LİMİTED ŞİRKETİ?/i,
    /ANONİM ŞİRKETİ?/i,
    /TİCARET A\.?Ş\.?/i,
    /SANAYİ VE TİCARET/i,
    /TEKSTİL/i,
    /BOYA/i,
    /KONFEKSİYON/i,
    /SAN\. ?TİC\./i
  ],
  'ORTAK_OUT': [
    /KESİNTİ VE EKLERİ/i,
    /FAİZ TAHSİLATI/i,
    /KOMİSYON/i,
    /MASRAF/i,
    /BANKA/i
  ],
  'ORTAK_IN': [
    /KESİNTİ VE EKLERİ/i,
    /FAİZ/i,
    /MEVDUAT/i
  ],
  'EGITIM_IN': [
    // "ALFA ZEN EĞİTİM DENETİM" firma adı, eğitim hizmeti değil!
    /ALFA ZEN/i,
    /EĞİTİM DENETİM/i,
    /EĞİTİM VE DENETİM/i,
    /DENETİM VE DANIŞMANLIK/i
  ],
  'IADE': [
    /MEVDUAT GERİ/i,
    /VADELİ HESAP/i,
    /FAİZ GELİR/i
  ]
};

// Check if pattern matches description based on rule type
function matchesPattern(description: string, pattern: string, ruleType: string): boolean {
  const desc = description.toUpperCase();
  const pat = pattern.toUpperCase();
  
  switch (ruleType) {
    case 'contains':
      return desc.includes(pat);
    case 'startsWith':
      return desc.startsWith(pat);
    case 'exact':
      return desc === pat;
    case 'regex':
      try {
        return new RegExp(pattern, 'i').test(description);
      } catch {
        return false;
      }
    default:
      return desc.includes(pat);
  }
}

// Check if amount matches condition
function matchesAmountCondition(amount: number, condition: string): boolean {
  switch (condition) {
    case 'positive':
      return amount > 0;
    case 'negative':
      return amount < 0;
    case 'any':
    default:
      return true;
  }
}

// Check if category type matches amount direction
function isAmountDirectionValid(amount: number, category: TransactionCategory): boolean {
  const type = category.type;
  const code = category.code;
  
  // Income types should have positive amounts
  if (type === 'INCOME' || code.endsWith('_IN')) {
    return amount > 0;
  }
  
  // Expense/outgoing types should have negative amounts
  if (type === 'EXPENSE' || code.endsWith('_OUT')) {
    return amount < 0;
  }
  
  // Partner, Financing, Excluded - check by code suffix
  if (code.endsWith('_IN')) return amount > 0;
  if (code.endsWith('_OUT')) return amount < 0;
  
  // For ambiguous categories, accept any
  return true;
}

// Determine affects_pnl based on category type
function getAffectsPnl(categoryType: string, categoryCode: string): boolean {
  if (categoryType === 'PARTNER') return false;
  if (categoryType === 'EXCLUDED') return false;
  if (categoryCode === 'KREDI_IN' || categoryCode === 'KREDI_OUT') return false;
  if (categoryCode === 'IC_TRANSFER' || categoryCode === 'NAKIT_CEKME') return false;
  return true;
}

// Determine balance impact
function getBalanceImpact(amount: number, categoryType: string): string {
  if (categoryType === 'INCOME') return 'equity_increase';
  if (categoryType === 'EXPENSE') return 'equity_decrease';
  if (categoryType === 'PARTNER') return amount > 0 ? 'liability_decrease' : 'liability_increase';
  if (categoryType === 'FINANCING') return amount > 0 ? 'liability_increase' : 'liability_decrease';
  return 'none';
}

// Extract counterparty from description
function extractCounterparty(tx: ParsedTransaction): string | null {
  if (tx.counterparty) return tx.counterparty;
  
  const desc = tx.description || '';
  // Try to extract company name patterns
  const patterns = [
    /^([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü\s]+(?:TEKSTİL|BOYA|SAN|TİC|A\.?Ş\.?|LTD))/i,
    /^([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ\s]{3,})/
  ];
  
  for (const pattern of patterns) {
    const match = desc.match(pattern);
    if (match && match[1].length > 5) {
      return match[1].trim();
    }
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT-AWARE KURALLAR
// Bağlama göre spesifik kategorileme
// ═══════════════════════════════════════════════════════════════════════════
function matchContextRules(tx: ParsedTransaction, categories: TransactionCategory[]): RuleMatchResult | null {
  const desc = (tx.description || '').toUpperCase();
  const amount = Math.abs(tx.amount || 0);
  const isPositive = (tx.amount || 0) > 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // ORTAK: EMRE AKÇAOĞLU (Hardcoded Partner)
  // Havale/EFT işlemleri - kesinlikle SEYAHAT olmamalı!
  // ═══════════════════════════════════════════════════════════════════════════
  if (/EMRE AKÇAOĞLU|EMRE AKCAOGLU|EMRE AKCAOĞLU|EMRE AKÇAOGLU/i.test(desc)) {
    const categoryCode = isPositive ? 'ORTAK_IN' : 'ORTAK_OUT';
    const cat = categories.find(c => c.code === categoryCode);
    if (cat) {
      console.log(`✅ Context: TX[${tx.index}] "EMRE AKÇAOĞLU" → ${categoryCode}`);
      return {
        transactionIndex: tx.index,
        categoryId: cat.id,
        categoryCode: categoryCode,
        categoryType: 'PARTNER',
        confidence: 1.0,
        source: 'context_rule',
        reasoning: `Ortak EMRE AKÇAOĞLU → ${isPositive ? 'sermaye girişi' : 'ödeme'}`,
        affectsPnl: false,
        balanceImpact: isPositive ? 'liability_decrease' : 'liability_increase',
        counterparty: 'EMRE AKÇAOĞLU'
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // İADE: Negatif tutar + İADE kelimesi (MEVDUAT/FAİZ/DEPOSIT hariç)
  // ═══════════════════════════════════════════════════════════════════════════
  if (/\bİADE\b|\bIADE\b|REFUND|RETURN\b/i.test(desc) && !isPositive) {
    const isExcluded = /MEVDUAT|VADELİ HESAP|FAİZ|DEPOSIT|TAAHHÜT/i.test(desc);
    if (!isExcluded) {
      const cat = categories.find(c => c.code === 'IADE');
      if (cat) {
        console.log(`✅ Context: TX[${tx.index}] "İADE" pattern → IADE`);
        return {
          transactionIndex: tx.index,
          categoryId: cat.id,
          categoryCode: 'IADE',
          categoryType: 'EXPENSE',
          confidence: 0.95,
          source: 'context_rule',
          reasoning: `İade pattern (mevduat/faiz hariç)`,
          affectsPnl: true,
          balanceImpact: 'equity_decrease',
          counterparty: extractCounterparty(tx)
        };
      }
    }
  }

  // BANKA KESİNTİSİ: "KESİNTİ VE EKLERİ" + küçük tutar (< 100 TL)
  if (desc.startsWith('KESİNTİ VE EKLERİ') && amount < 100) {
    const cat = categories.find(c => c.code === 'BANKA');
    if (cat) {
      console.log(`✅ Context: TX[${tx.index}] "KESİNTİ VE EKLERİ" → BANKA`);
      return {
        transactionIndex: tx.index,
        categoryId: cat.id,
        categoryCode: 'BANKA',
        categoryType: 'EXPENSE',
        confidence: 1.0,
        source: 'context_rule',
        reasoning: `"KESİNTİ VE EKLERİ" + tutar ${amount.toFixed(2)} TL < 100 TL`,
        affectsPnl: true,
        balanceImpact: 'equity_decrease',
        counterparty: null
      };
    }
  }

  // SİGORTA: Sigorta şirketi/ürünü + gider (negatif tutar)
  if (/EUREKO|ALLIANZ|AXA|MAPFRE|HDI|SOMPO|KASKO|POLİÇE|SİGORTA PRİM|TRAFİK SİGORTA|DASK/i.test(desc) && !isPositive && amount < 50000) {
    const cat = categories.find(c => c.code === 'SIGORTA');
    if (cat) {
      console.log(`✅ Context: TX[${tx.index}] Sigorta pattern → SIGORTA`);
      return {
        transactionIndex: tx.index,
        categoryId: cat.id,
        categoryCode: 'SIGORTA',
        categoryType: 'EXPENSE',
        confidence: 0.98,
        source: 'context_rule',
        reasoning: `Sigorta şirketi/ürünü + gider`,
        affectsPnl: true,
        balanceImpact: 'equity_decrease',
        counterparty: extractCounterparty(tx)
      };
    }
  }

  // KREDİ ÖDEME: O4- prefix (otomatik ödeme talimatı)
  if (desc.startsWith('O4-') && amount > 10000) {
    const cat = categories.find(c => c.code === 'KREDI_OUT');
    if (cat) {
      console.log(`✅ Context: TX[${tx.index}] "O4-" prefix → KREDI_OUT`);
      return {
        transactionIndex: tx.index,
        categoryId: cat.id,
        categoryCode: 'KREDI_OUT',
        categoryType: 'FINANCING',
        confidence: 1.0,
        source: 'context_rule',
        reasoning: `"O4-" prefix (ticari kredi taksit)`,
        affectsPnl: false,
        balanceImpact: 'liability_decrease',
        counterparty: null
      };
    }
  }

  // FAİZ GİDERİ
  if (/FAİZ TAHSİLATI|KREDİLİ HESAP FAİZ|FAİZ KESINTI/i.test(desc) && !isPositive) {
    const cat = categories.find(c => c.code === 'FAIZ_OUT');
    if (cat) {
      console.log(`✅ Context: TX[${tx.index}] Faiz pattern → FAIZ_OUT`);
      return {
        transactionIndex: tx.index,
        categoryId: cat.id,
        categoryCode: 'FAIZ_OUT',
        categoryType: 'FINANCING',
        confidence: 1.0,
        source: 'context_rule',
        reasoning: `Faiz tahsilatı keyword`,
        affectsPnl: true,
        balanceImpact: 'equity_decrease',
        counterparty: null
      };
    }
  }

  // DÖVİZ SATIŞ: Pozitif tutar + döviz pattern
  if (/DÖVİZ SATIŞ|FX SELL|EUR:|USD:|GBP:/i.test(desc) && isPositive) {
    const cat = categories.find(c => c.code === 'DOVIZ_IN');
    if (cat) {
      console.log(`✅ Context: TX[${tx.index}] Döviz satış → DOVIZ_IN`);
      return {
        transactionIndex: tx.index,
        categoryId: cat.id,
        categoryCode: 'DOVIZ_IN',
        categoryType: 'INCOME',
        confidence: 0.98,
        source: 'context_rule',
        reasoning: `Döviz satış pattern`,
        affectsPnl: true,
        balanceImpact: 'equity_increase',
        counterparty: null
      };
    }
  }

  // HGS/ULAŞIM: HGS pattern + makul tutar
  if (/\bHGS\b|\bOGS\b|OTOYOL|KÖPRÜ GEÇİŞ|AVRASYA|GEBZE|OSMANGAZİ/i.test(desc) && !isPositive && amount < 10000) {
    const cat = categories.find(c => c.code === 'HGS');
    if (cat) {
      console.log(`✅ Context: TX[${tx.index}] HGS pattern → HGS`);
      return {
        transactionIndex: tx.index,
        categoryId: cat.id,
        categoryCode: 'HGS',
        categoryType: 'EXPENSE',
        confidence: 0.98,
        source: 'context_rule',
        reasoning: `HGS/Ulaşım pattern`,
        affectsPnl: true,
        balanceImpact: 'equity_decrease',
        counterparty: null
      };
    }
  }

  // TELEKOM: Telefon şirketi pattern
  if (/TURKCELL|TRKCLL|VODAFONE|TÜRK TELEKOM|TURK TELEKOM|SUPERONLINE/i.test(desc) && !isPositive && amount < 5000) {
    const cat = categories.find(c => c.code === 'TELEKOM');
    if (cat) {
      console.log(`✅ Context: TX[${tx.index}] Telekomünikasyon → TELEKOM`);
      return {
        transactionIndex: tx.index,
        categoryId: cat.id,
        categoryCode: 'TELEKOM',
        categoryType: 'EXPENSE',
        confidence: 0.98,
        source: 'context_rule',
        reasoning: `Telekomünikasyon şirketi`,
        affectsPnl: true,
        balanceImpact: 'equity_decrease',
        counterparty: extractCounterparty(tx)
      };
    }
  }

  // KARGO: Kargo şirketi pattern
  if (/ARAS KARGO|MNG KARGO|YURTIÇI KARGO|UPS|DHL|FEDEX|PTT KARGO/i.test(desc) && !isPositive && amount < 5000) {
    const cat = categories.find(c => c.code === 'KARGO');
    if (cat) {
      console.log(`✅ Context: TX[${tx.index}] Kargo şirketi → KARGO`);
      return {
        transactionIndex: tx.index,
        categoryId: cat.id,
        categoryCode: 'KARGO',
        categoryType: 'EXPENSE',
        confidence: 0.98,
        source: 'context_rule',
        reasoning: `Kargo şirketi`,
        affectsPnl: true,
        balanceImpact: 'equity_decrease',
        counterparty: extractCounterparty(tx)
      };
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXCEL ETİKET → KATEGORİ EŞLEŞTİRME
// Excel dosyasındaki "Etiket" sütunu değerlerini kategori kodlarına eşler
// ═══════════════════════════════════════════════════════════════════════════
const EXCEL_LABEL_TO_CATEGORY: Record<string, { code: string; confidence: number }> = {
  // Para hareketleri
  'PARA TRANSFERİ': { code: 'IC_TRANSFER', confidence: 0.9 },
  'PARA TRANSFERI': { code: 'IC_TRANSFER', confidence: 0.9 },
  'HAVALE': { code: 'IC_TRANSFER', confidence: 0.85 },
  'EFT': { code: 'IC_TRANSFER', confidence: 0.85 },
  'TRANSFER': { code: 'IC_TRANSFER', confidence: 0.8 },
  
  // Banka işlemleri
  'FAİZ / KOMİSYON': { code: 'BANKA', confidence: 0.95 },
  'FAIZ / KOMISYON': { code: 'BANKA', confidence: 0.95 },
  'FAİZ/KOMİSYON': { code: 'BANKA', confidence: 0.95 },
  'FAIZ/KOMISYON': { code: 'BANKA', confidence: 0.95 },
  'FAİZ': { code: 'FAIZ_OUT', confidence: 0.9 },
  'FAIZ': { code: 'FAIZ_OUT', confidence: 0.9 },
  'KOMİSYON': { code: 'BANKA', confidence: 0.9 },
  'KOMISYON': { code: 'BANKA', confidence: 0.9 },
  'BANKA': { code: 'BANKA', confidence: 0.85 },
  
  // Giderler
  'SİGORTA': { code: 'SIGORTA', confidence: 0.95 },
  'SIGORTA': { code: 'SIGORTA', confidence: 0.95 },
  'ULAŞIM': { code: 'HGS', confidence: 0.9 },
  'ULASIM': { code: 'HGS', confidence: 0.9 },
  'TELEKOMÜNİKASYON': { code: 'TELEKOM', confidence: 0.95 },
  'TELEKOMÜNIKASYON': { code: 'TELEKOM', confidence: 0.95 },
  'TELEKOMUNIKASYON': { code: 'TELEKOM', confidence: 0.95 },
  'KARGO': { code: 'KARGO', confidence: 0.95 },
  'VERGİ': { code: 'VERGI', confidence: 0.95 },
  'VERGI': { code: 'VERGI', confidence: 0.95 },
  'EĞİTİM': { code: 'EGITIM_OUT', confidence: 0.85 },
  'EGITIM': { code: 'EGITIM_OUT', confidence: 0.85 },
  'PERSONEL': { code: 'PERSONEL', confidence: 0.95 },
  'KİRA': { code: 'KIRA_OUT', confidence: 0.9 },
  'KIRA': { code: 'KIRA_OUT', confidence: 0.9 },
  'YEMEK': { code: 'YEMEK', confidence: 0.9 },
  'OFİS': { code: 'OFIS', confidence: 0.9 },
  'OFIS': { code: 'OFIS', confidence: 0.9 },
  'HUKUK': { code: 'HUKUK', confidence: 0.95 },
  'MUHASEBE': { code: 'MUHASEBE', confidence: 0.95 },
  'DANIŞMANLIK': { code: 'DANISMANLIK', confidence: 0.9 },
  'DANISMANLIK': { code: 'DANISMANLIK', confidence: 0.9 },
  
  // Gelirler (pozitif tutar kontrolü gerekir)
  'GELİR': { code: 'DIGER_IN', confidence: 0.7 },
  'GELIR': { code: 'DIGER_IN', confidence: 0.7 },
  'TAHSİLAT': { code: 'DIGER_IN', confidence: 0.75 },
  'TAHSILAT': { code: 'DIGER_IN', confidence: 0.75 },
  
  // Diğer
  'DİĞER': { code: 'DIGER_OUT', confidence: 0.5 },
  'DIGER': { code: 'DIGER_OUT', confidence: 0.5 },
  'DİĞER GİDER': { code: 'DIGER_OUT', confidence: 0.6 },
  'DIGER GIDER': { code: 'DIGER_OUT', confidence: 0.6 },
};

/**
 * Excel etiket sütununu kategoriye eşler
 * Context kurallarından sonra, keyword'lerden önce çalışır
 */
function matchExcelLabel(tx: ParsedTransaction, categories: TransactionCategory[]): RuleMatchResult | null {
  const label = tx.excelLabel?.trim().toUpperCase();
  if (!label) return null;
  
  // Exact match dene
  let mapping = EXCEL_LABEL_TO_CATEGORY[label];
  
  // Fuzzy match: label içinde keyword ara
  if (!mapping) {
    for (const [key, value] of Object.entries(EXCEL_LABEL_TO_CATEGORY)) {
      if (label.includes(key) || key.includes(label)) {
        mapping = value;
        break;
      }
    }
  }
  
  if (!mapping) return null;
  
  const amount = tx.amount || 0;
  let categoryCode = mapping.code;
  
  // Tutar yönüne göre kategori ayarla
  // Örnek: "DİĞER" etiketi varsa, + tutar için DIGER_IN, - tutar için DIGER_OUT
  if (categoryCode === 'DIGER_OUT' && amount > 0) {
    categoryCode = 'DIGER_IN';
  }
  if (categoryCode === 'DIGER_IN' && amount < 0) {
    categoryCode = 'DIGER_OUT';
  }
  // EĞİTİM için de benzer mantık
  if (categoryCode === 'EGITIM_OUT' && amount > 0) {
    categoryCode = 'EGITIM_IN';
  }
  if (categoryCode === 'EGITIM_IN' && amount < 0) {
    categoryCode = 'EGITIM_OUT';
  }
  // FAİZ için de benzer mantık
  if (categoryCode === 'FAIZ_OUT' && amount > 0) {
    categoryCode = 'FAIZ_IN';
  }
  if (categoryCode === 'FAIZ_IN' && amount < 0) {
    categoryCode = 'FAIZ_OUT';
  }
  // KİRA için de benzer mantık
  if (categoryCode === 'KIRA_OUT' && amount > 0) {
    categoryCode = 'KIRA_IN';
  }
  if (categoryCode === 'KIRA_IN' && amount < 0) {
    categoryCode = 'KIRA_OUT';
  }
  
  const cat = categories.find(c => c.code === categoryCode);
  if (!cat) {
    console.log(`⚠️ ExcelLabel: TX[${tx.index}] "${label}" → ${categoryCode} (kategori bulunamadı)`);
    return null;
  }
  
  console.log(`✅ ExcelLabel: TX[${tx.index}] "${label}" → ${categoryCode}`);
  
  return {
    transactionIndex: tx.index,
    categoryId: cat.id,
    categoryCode: categoryCode,
    categoryType: cat.type,
    confidence: mapping.confidence,
    source: 'excel_label',
    reasoning: `Excel etiketi: "${tx.excelLabel}"`,
    affectsPnl: getAffectsPnl(cat.type, cat.code),
    balanceImpact: getBalanceImpact(amount, cat.type),
    counterparty: extractCounterparty(tx)
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ALFA ZEN GELİR KATEGORİLEME (Güncel Fiyatlandırma)
// ═══════════════════════════════════════════════════════════════════════════
function categorizeAlfaZenIncome(tx: ParsedTransaction, categories: TransactionCategory[]): RuleMatchResult | null {
  const desc = (tx.description || '').toUpperCase();
  const amount = tx.amount || 0;
  
  // Sadece pozitif tutarlar
  if (amount <= 0) return null;

  // ═══════════════════════════════════════════════════════════════════════
  // ADIM 1: Kesin keyword eşleştirme (en yüksek güven)
  // ═══════════════════════════════════════════════════════════════════════
  
  // LEADERSHIP: Direkt L&S firmasına yapılan denetimler
  if (/LEADERSHIP|LEADERSHİP|L&S|L%S|PERFORMANCE.*VER|SUST.*AUDIT/i.test(desc)) {
    const cat = categories.find(c => c.code === 'L&S');
    if (cat) {
      console.log(`✅ AlfaZen: TX[${tx.index}] Leadership keyword → L&S`);
      return {
        transactionIndex: tx.index,
        categoryId: cat.id,
        categoryCode: 'L&S',
        categoryType: 'INCOME',
        confidence: 1.0,
        source: 'keyword',
        reasoning: 'Leadership keyword eşleşmesi',
        affectsPnl: true,
        balanceImpact: 'equity_increase',
        counterparty: extractCounterparty(tx)
      };
    }
  }
  
  // SBT TRACKER: Daraltılmış keywords
  if (/\bSBT\b|SBT TRACKER|KARBON YÖNETİM|YAZILIM HİZ|YAZ HIZ BED/i.test(desc)) {
    const cat = categories.find(c => c.code === 'SBT');
    if (cat) {
      console.log(`✅ AlfaZen: TX[${tx.index}] SBT keyword → SBT`);
      return {
        transactionIndex: tx.index,
        categoryId: cat.id,
        categoryCode: 'SBT',
        categoryType: 'INCOME',
        confidence: 1.0,
        source: 'keyword',
        reasoning: 'SBT Tracker keyword eşleşmesi',
        affectsPnl: true,
        balanceImpact: 'equity_increase',
        counterparty: extractCounterparty(tx)
      };
    }
  }
  
  // ZDHC: InCheck doğrulama
  if (/ZDHC|INCHECK|IN-CHECK|IN CHECK|MRSL|GATEWAY|KİMYASAL.*DOĞ/i.test(desc)) {
    const cat = categories.find(c => c.code === 'ZDHC');
    if (cat) {
      console.log(`✅ AlfaZen: TX[${tx.index}] ZDHC keyword → ZDHC`);
      return {
        transactionIndex: tx.index,
        categoryId: cat.id,
        categoryCode: 'ZDHC',
        categoryType: 'INCOME',
        confidence: 1.0,
        source: 'keyword',
        reasoning: 'ZDHC InCheck keyword eşleşmesi',
        affectsPnl: true,
        balanceImpact: 'equity_increase',
        counterparty: extractCounterparty(tx)
      };
    }
  }
  
  // EĞİTİM: SADECE gerçek eğitim hizmetleri (firma adı DEĞİL)
  // "ALFA ZEN EĞİTİM" firma adıdır, eğitim hizmeti değil!
  const hasEducationKeyword = /EĞİTİM HİZ|TRAINING FEE|SEMİNER KATILIM|WORKSHOP FEE/i.test(desc);
  const isCompanyName = /ALFA ZEN|EĞİTİM DENETİM|EĞİTİM VE DENETİM/i.test(desc);
  
  if (hasEducationKeyword && !isCompanyName) {
    const cat = categories.find(c => c.code === 'EGITIM_IN');
    if (cat) {
      console.log(`✅ AlfaZen: TX[${tx.index}] Eğitim hizmeti → EGITIM_IN`);
      return {
        transactionIndex: tx.index,
        categoryId: cat.id,
        categoryCode: 'EGITIM_IN',
        categoryType: 'INCOME',
        confidence: 0.90,
        source: 'keyword',
        reasoning: 'Eğitim hizmeti keyword (firma adı değil)',
        affectsPnl: true,
        balanceImpact: 'equity_increase',
        counterparty: extractCounterparty(tx)
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ADIM 2: Tekstil/Sanayi firması kontrolü
  // ═══════════════════════════════════════════════════════════════════════
  
  const isIndustryCompany = /TEKSTİL|BOYA|APRE|DENİM|DOKUMA|KONFEKSİYON|SANAYİ|FABRİKA|KİMYA|İPLİK|ÖRME|TRİKO|ORME|KONFEKS|İPEK|BASMA|KUMAŞ/i.test(desc);
  
  if (!isIndustryCompany) {
    return null; // Sanayi firması değilse AI'a bırak
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ADIM 3: ALFA ZEN GÜNCEL TUTAR KURALLARI
  // 
  // Fiyatlandırma (2025):
  // - L&S: 200K+ TL (toplu denetim ödemeleri, L&S firmasına direkt)
  // - SBT Tracker: 
  //   - Büyük projeler: 120K+ TL
  //   - Küçük üreticiler: 70K-120K TL
  // - ZDHC InCheck: 30K-70K TL
  // ═══════════════════════════════════════════════════════════════════════
  
  let categoryCode: string;
  let categoryName: string;
  let confidence: number;
  
  if (amount >= 200000) {
    // 200K+ = L&S toplu denetim ödemesi
    categoryCode = 'L&S';
    categoryName = 'Leadership & Sustainability (toplu)';
    confidence = 0.92;
  } else if (amount >= 120000) {
    // 120K-200K = SBT Tracker büyük proje
    categoryCode = 'SBT';
    categoryName = 'SBT Tracker (büyük proje)';
    confidence = 0.90;
  } else if (amount >= 70000) {
    // 70K-120K = Muhtemelen SBT küçük üretici
    categoryCode = 'SBT';
    categoryName = 'SBT Tracker (küçük üretici)';
    confidence = 0.80; // Düşük güven - ZDHC de olabilir
  } else if (amount >= 30000) {
    // 30K-70K = ZDHC InCheck
    categoryCode = 'ZDHC';
    categoryName = 'ZDHC InCheck';
    confidence = 0.85;
  } else {
    // 30K altı = Küçük ZDHC veya diğer
    categoryCode = 'ZDHC';
    categoryName = 'ZDHC InCheck (küçük)';
    confidence = 0.75; // Düşük güven
  }
  
  const cat = categories.find(c => c.code === categoryCode);
  if (cat) {
    console.log(`✅ AlfaZen: TX[${tx.index}] Sanayi firması + ${amount.toLocaleString('tr-TR')} TL → ${categoryCode}`);
    return {
      transactionIndex: tx.index,
      categoryId: cat.id,
      categoryCode,
      categoryType: 'INCOME',
      confidence,
      source: 'amount_rule',
      reasoning: `Sanayi firması + ${amount.toLocaleString('tr-TR')} TL → ${categoryName}`,
      affectsPnl: true,
      balanceImpact: 'equity_increase',
      counterparty: extractCounterparty(tx)
    };
  }
  
  return null;
}

// Check if negative pattern blocks this category
function isBlockedByNegativePattern(desc: string, categoryCode: string): boolean {
  const patterns = NEGATIVE_PATTERNS[categoryCode];
  if (!patterns) return false;
  
  return patterns.some(pattern => pattern.test(desc));
}

/**
 * Categorize transactions using rules and keywords (client-side)
 * Returns matched transactions and those that need AI categorization
 */
export async function categorizeWithRules(
  transactions: ParsedTransaction[],
  userId: string,
  categories: TransactionCategory[]
): Promise<{ matched: RuleMatchResult[]; needsAI: ParsedTransaction[] }> {
  console.log('📊 categorizeWithRules started:', {
    transactionCount: transactions.length,
    categoryCount: categories.length,
    categoriesWithKeywords: categories.filter(c => c.keywords?.length > 0).length
  });

  // 1. Fetch user rules
  const { data: userRules } = await supabase
    .from('user_category_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('priority', { ascending: true });

  // 2. Sort categories by match_priority (lower = higher priority)
  const sortedCategories = [...categories].sort((a, b) => {
    const prioA = (a as any).match_priority ?? 100;
    const prioB = (b as any).match_priority ?? 100;
    return prioA - prioB;
  });

  const matched: RuleMatchResult[] = [];
  const needsAI: ParsedTransaction[] = [];
  const ruleHits: Map<string, number> = new Map();

  for (const tx of transactions) {
    const desc = tx.description || '';
    const amount = tx.amount || 0;
    let found = false;

    // ═══════════════════════════════════════════════════════════════════
    // STAGE 1: User rules (highest priority)
    // ═══════════════════════════════════════════════════════════════════
    for (const rule of userRules || []) {
      if (!matchesAmountCondition(amount, rule.amount_condition)) continue;
      if (!matchesPattern(desc, rule.pattern, rule.rule_type)) continue;

      // Handle partner rules specially
      if (rule.is_partner_rule) {
        const categoryCode = amount < 0 ? 'ORTAK_OUT' : 'ORTAK_IN';
        const partnerCat = categories.find(c => c.code === categoryCode);
        
        matched.push({
          transactionIndex: tx.index,
          categoryId: partnerCat?.id || null,
          categoryCode,
          categoryType: 'PARTNER',
          confidence: 1.0,
          source: 'user_rule',
          reasoning: `Ortak kuralı: "${rule.pattern}"`,
          affectsPnl: false,
          balanceImpact: getBalanceImpact(amount, 'PARTNER'),
          counterparty: rule.pattern
        });
        console.log(`✅ UserRule: TX[${tx.index}] "${desc.substring(0, 40)}..." → ${categoryCode} (ortak kuralı)`);
      } else if (rule.category_id) {
        const cat = categories.find(c => c.id === rule.category_id);
        if (cat) {
          matched.push({
            transactionIndex: tx.index,
            categoryId: cat.id,
            categoryCode: cat.code,
            categoryType: cat.type,
            confidence: 1.0,
            source: 'user_rule',
            reasoning: `Kural: "${rule.pattern}"`,
            affectsPnl: getAffectsPnl(cat.type, cat.code),
            balanceImpact: getBalanceImpact(amount, cat.type)
          });
          console.log(`✅ UserRule: TX[${tx.index}] "${desc.substring(0, 40)}..." → ${cat.code}`);
        }
      }

      // Track hit count for later update
      ruleHits.set(rule.id, (ruleHits.get(rule.id) || 0) + 1);
      found = true;
      break;
    }
    if (found) continue;

    // ═══════════════════════════════════════════════════════════════════
    // STAGE 2: Context rules (BANKA kesintileri, sigorta, HGS vb.)
    // ═══════════════════════════════════════════════════════════════════
    const contextMatch = matchContextRules(tx, sortedCategories);
    if (contextMatch) {
      matched.push(contextMatch);
      found = true;
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════
    // STAGE 3: Excel label matching (Banka etiketleri)
    // ═══════════════════════════════════════════════════════════════════
    const excelLabelMatch = matchExcelLabel(tx, sortedCategories);
    if (excelLabelMatch) {
      matched.push(excelLabelMatch);
      found = true;
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════
    // STAGE 4: Keyword matching (SPESİFİKLİK ÖNCELİKLİ)
    // Tüm eşleşmeleri topla, en uzun keyword'ü seç
    // ═══════════════════════════════════════════════════════════════════
    interface KeywordMatch {
      category: TransactionCategory;
      keyword: string;
      keywordLength: number;
    }

    const allKeywordMatches: KeywordMatch[] = [];

    for (const cat of sortedCategories) {
      if (!cat.keywords || cat.keywords.length === 0) continue;
      
      // Skip categories with high match_priority (like ORTAK, HISSE)
      const matchPriority = (cat as any).match_priority ?? 100;
      if (matchPriority >= 999) continue;
      
      for (const kw of cat.keywords) {
        if (desc.toUpperCase().includes(kw.toUpperCase())) {
          // Check amount direction validity
          if (!isAmountDirectionValid(amount, cat)) continue;
          
          // Check negative patterns
          if (isBlockedByNegativePattern(desc, cat.code)) {
            console.log(`⛔ Negative pattern blocked: TX[${tx.index}] "${kw}" → ${cat.code}`);
            continue;
          }
          
          allKeywordMatches.push({
            category: cat,
            keyword: kw,
            keywordLength: kw.length
          });
        }
      }
    }

    // En uzun (en spesifik) keyword'ü seç
    if (allKeywordMatches.length > 0) {
      allKeywordMatches.sort((a, b) => b.keywordLength - a.keywordLength);
      const bestMatch = allKeywordMatches[0];
      
      matched.push({
        transactionIndex: tx.index,
        categoryId: bestMatch.category.id,
        categoryCode: bestMatch.category.code,
        categoryType: bestMatch.category.type,
        confidence: 0.95,
        source: 'keyword',
        reasoning: `Keyword: "${bestMatch.keyword}" (${allKeywordMatches.length} eşleşmeden en spesifik)`,
        affectsPnl: getAffectsPnl(bestMatch.category.type, bestMatch.category.code),
        balanceImpact: getBalanceImpact(amount, bestMatch.category.type)
      });
      console.log(`✅ Keyword: TX[${tx.index}] "${desc.substring(0, 40)}..." → ${bestMatch.category.code} (keyword: "${bestMatch.keyword}")`);
      found = true;
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════
    // STAGE 5: Alfa Zen income rules (tekstil/sanayi firması + tutar)
    // ═══════════════════════════════════════════════════════════════════
    const alfaZenMatch = categorizeAlfaZenIncome(tx, sortedCategories);
    if (alfaZenMatch) {
      matched.push(alfaZenMatch);
      found = true;
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════
    // STAGE 6: Send to AI
    // ═══════════════════════════════════════════════════════════════════
    needsAI.push(tx);
  }

  // Update hit counts asynchronously (fire and forget)
  if (ruleHits.size > 0) {
    for (const [ruleId, hits] of ruleHits) {
      supabase
        .from('user_category_rules')
        .update({ 
          hit_count: hits, 
          last_hit_at: new Date().toISOString() 
        })
        .eq('id', ruleId)
        .then(() => {});
    }
  }

  console.log('📊 categorizeWithRules completed:', {
    matched: matched.length,
    needsAI: needsAI.length,
    bySource: {
      user_rule: matched.filter(m => m.source === 'user_rule').length,
      context_rule: matched.filter(m => m.source === 'context_rule').length,
      excel_label: matched.filter(m => m.source === 'excel_label').length,
      keyword: matched.filter(m => m.source === 'keyword').length,
      amount_rule: matched.filter(m => m.source === 'amount_rule').length
    }
  });

  return { matched, needsAI };
}

export function useCategoryRules() {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading, error } = useQuery({
    queryKey: ['user-category-rules', userId] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_category_rules')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('priority', { ascending: true });
      
      if (error) throw error;
      return data as UserCategoryRule[];
    },
    enabled: !!userId
  });

  const createRule = useMutation({
    mutationFn: async (data: Partial<UserCategoryRule>) => {
      const { error } = await supabase
        .from('user_category_rules')
        .insert({
          user_id: userId,
          pattern: data.pattern || '',
          category_id: data.category_id || null,
          rule_type: data.rule_type || 'contains',
          amount_condition: data.amount_condition || 'any',
          is_partner_rule: data.is_partner_rule || false,
          partner_type: data.partner_type || null,
          description: data.description || null,
          priority: data.priority || 100,
          is_active: true
        });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-category-rules'] })
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...data }: Partial<UserCategoryRule> & { id: string }) => {
      const { error } = await supabase
        .from('user_category_rules')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-category-rules'] })
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_category_rules')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-category-rules'] })
  });

  return {
    rules,
    isLoading,
    error,
    createRule,
    updateRule,
    deleteRule
  };
}
