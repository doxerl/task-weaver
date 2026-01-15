// Amortisman Hesaplama Modülü
// Türk Vergi Usul Kanunu'na uygun doğrusal (normal) amortisman hesaplama

export interface DepreciationInput {
  assetValue: number;
  purchaseDate: string | null;
  usefulLifeYears: number;
  method: 'straight_line' | 'declining_balance';
  asOfDate: string; // Bilanço tarihi (genellikle yıl sonu)
}

export interface DepreciationResult {
  annualDepreciation: number;      // Yıllık amortisman
  accumulatedDepreciation: number; // Birikmiş amortisman
  netBookValue: number;            // Net defter değeri
  monthsUsed: number;              // Kullanılan ay sayısı
  yearsUsed: number;               // Kullanılan yıl sayısı (tam)
  isFullyDepreciated: boolean;     // Amortisman tamamlandı mı?
}

/**
 * Doğrusal amortisman hesaplama
 * VUK'a göre duran varlıklar kullanım süreleri boyunca eşit tutarlarda amortismana tabi tutulur.
 * 
 * Örnek: 3,459,470 TL değerinde taşıt, 5 yıl faydalı ömür
 * - Yıllık amortisman: 3,459,470 / 5 = 691,894 TL
 * - 2 yıl sonunda birikmiş amortisman: 691,894 x 2 = 1,383,788 TL
 */
export function calculateDepreciation(input: DepreciationInput): DepreciationResult {
  const { assetValue, purchaseDate, usefulLifeYears, method, asOfDate } = input;
  
  // Alım tarihi veya değer yoksa hesaplama yapma
  if (!purchaseDate || assetValue <= 0 || usefulLifeYears <= 0) {
    return { 
      annualDepreciation: 0, 
      accumulatedDepreciation: 0, 
      netBookValue: assetValue,
      monthsUsed: 0,
      yearsUsed: 0,
      isFullyDepreciated: false
    };
  }
  
  const purchase = new Date(purchaseDate);
  const asOf = new Date(asOfDate);
  
  // Eğer varlık henüz alınmamışsa (gelecek tarih)
  if (purchase > asOf) {
    return { 
      annualDepreciation: 0, 
      accumulatedDepreciation: 0, 
      netBookValue: assetValue,
      monthsUsed: 0,
      yearsUsed: 0,
      isFullyDepreciated: false
    };
  }
  
  // Ay bazında süre hesaplama (VUK'a göre kıst amortisman uygulanabilir)
  const diffMs = asOf.getTime() - purchase.getTime();
  const monthsUsed = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44)));
  const yearsUsed = Math.floor(monthsUsed / 12);
  
  const totalMonths = usefulLifeYears * 12;
  const effectiveMonths = Math.min(monthsUsed, totalMonths);
  
  if (method === 'straight_line') {
    // Doğrusal amortisman: Değer / Yıl
    const annualDepreciation = assetValue / usefulLifeYears;
    
    // Ay bazında birikmiş amortisman
    const accumulatedDepreciation = (annualDepreciation / 12) * effectiveMonths;
    
    // Net defter değeri (0'ın altına düşemez)
    const netBookValue = Math.max(0, assetValue - accumulatedDepreciation);
    
    const isFullyDepreciated = monthsUsed >= totalMonths;
    
    return { 
      annualDepreciation, 
      accumulatedDepreciation, 
      netBookValue, 
      monthsUsed,
      yearsUsed,
      isFullyDepreciated
    };
  }
  
  // Azalan bakiyeler yöntemi (gelecekte eklenebilir)
  // VUK'a göre normal amortisman oranının 2 katı uygulanır
  // Örnek: 5 yıl için normal oran %20, azalan bakiyeler %40
  
  // Şimdilik doğrusal hesaplama döndür
  const annualDepreciation = assetValue / usefulLifeYears;
  const accumulatedDepreciation = (annualDepreciation / 12) * effectiveMonths;
  const netBookValue = Math.max(0, assetValue - accumulatedDepreciation);
  
  return { 
    annualDepreciation, 
    accumulatedDepreciation, 
    netBookValue, 
    monthsUsed,
    yearsUsed,
    isFullyDepreciated: monthsUsed >= totalMonths
  };
}

/**
 * Birden fazla varlık için toplam amortisman hesaplama
 */
export function calculateTotalDepreciation(
  assets: Array<{ 
    value: number; 
    purchaseDate: string | null; 
    usefulLife: number; 
    name: string 
  }>,
  asOfDate: string
): { 
  total: DepreciationResult; 
  byAsset: Array<{ name: string; result: DepreciationResult }> 
} {
  const results = assets.map(asset => ({
    name: asset.name,
    result: calculateDepreciation({
      assetValue: asset.value,
      purchaseDate: asset.purchaseDate,
      usefulLifeYears: asset.usefulLife,
      method: 'straight_line',
      asOfDate
    })
  }));
  
  const total: DepreciationResult = {
    annualDepreciation: results.reduce((sum, r) => sum + r.result.annualDepreciation, 0),
    accumulatedDepreciation: results.reduce((sum, r) => sum + r.result.accumulatedDepreciation, 0),
    netBookValue: results.reduce((sum, r) => sum + r.result.netBookValue, 0),
    monthsUsed: Math.max(...results.map(r => r.result.monthsUsed), 0),
    yearsUsed: Math.max(...results.map(r => r.result.yearsUsed), 0),
    isFullyDepreciated: results.every(r => r.result.isFullyDepreciated)
  };
  
  return { total, byAsset: results };
}
