/**
 * Senaryo için yıl etiketli görüntü adı
 * Örnek: "2026 Pozitif Senaryo", "2027 Büyüme Senaryosu"
 */
export const getScenarioDisplayLabel = (scenario: { name: string; targetYear?: number }): string => {
  if (!scenario.targetYear) return scenario.name;
  return `${scenario.targetYear} ${scenario.name}`;
};

/**
 * Senaryo tipi badge'i için etiket ve renk
 */
export const getScenarioTypeBadge = (scenario: { 
  targetYear?: number; 
  scenarioType?: string 
}): {
  label: string;
  variant: 'positive' | 'negative' | 'growth';
  colorClass: string;
} => {
  const currentYear = new Date().getFullYear();
  const targetYear = scenario.targetYear || currentYear;
  
  // Gelecek yıl projeksiyonu = büyüme senaryosu (mavi)
  if (targetYear > currentYear + 1) {
    return { 
      label: `${targetYear} Büyüme`, 
      variant: 'growth',
      colorClass: 'border-blue-500 text-blue-600 bg-blue-500/10'
    };
  }
  
  // Negatif senaryo
  if (scenario.scenarioType === 'negative') {
    return { 
      label: `${targetYear} Negatif`, 
      variant: 'negative',
      colorClass: 'border-red-500 text-red-600 bg-red-500/10'
    };
  }
  
  // Pozitif senaryo (varsayılan)
  return { 
    label: `${targetYear} Pozitif`, 
    variant: 'positive',
    colorClass: 'border-green-500 text-green-600 bg-green-500/10'
  };
};

/**
 * İki senaryo arasındaki ilişki türünü belirle
 */
export const getScenarioRelationshipLabel = (
  scenarioA: { targetYear?: number },
  scenarioB: { targetYear?: number }
): 'successor_projection' | 'year_over_year' | 'positive_vs_negative' => {
  if (!scenarioA.targetYear || !scenarioB.targetYear) {
    return 'positive_vs_negative';
  }
  
  if (scenarioA.targetYear > scenarioB.targetYear) {
    return 'successor_projection'; // A sonraki yıl
  }
  
  if (scenarioA.targetYear !== scenarioB.targetYear) {
    return 'year_over_year';
  }
  
  return 'positive_vs_negative';
};
