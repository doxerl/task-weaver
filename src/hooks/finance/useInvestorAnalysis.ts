import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  SimulationScenario, 
  DealConfiguration, 
  CapitalRequirement, 
  MultiYearProjection,
  ExitPlan,
  AIInvestorAnalysis,
  DEFAULT_DEAL_CONFIG,
  AnalysisHistoryItem,
  GrowthConfiguration,
  SECTOR_NORMALIZED_GROWTH,
  InvestmentScenarioComparison,
  ExtendedRunwayInfo,
  InvestmentTier,
  ValuationConfiguration,
  ValuationBreakdown,
  MultiYearCapitalPlan,
  YearCapitalRequirement
} from '@/types/simulation';
import { toast } from 'sonner';
import { generateScenarioHash, checkDataChanged } from '@/lib/scenarioHash';
import { getProjectionYears } from '@/utils/yearCalculations';
import {
  calculateEBITDA,
  calculateEBITDAMargin,
  calculateFCF,
  calculateDCFValuation,
  calculateVCValuation,
  calculateWeightedValuation,
  getEBITDAMultiple,
  DEFAULT_VALUATION_CONFIG
} from '@/lib/valuationCalculator';

interface QuarterlyData {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

interface ScenarioSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

// Calculate "Death Valley" - the deepest cumulative cash deficit
// Enhanced with year-end balance, 2-year projections, and investment tiers
export const calculateCapitalNeeds = (
  quarterlyData: QuarterlyData,
  safetyMargin: number = 0.20,
  year2GrowthRate: number = 0.15
): CapitalRequirement => {
  const flows = [quarterlyData.q1, quarterlyData.q2, quarterlyData.q3, quarterlyData.q4];
  
  // 1. Year 1 Death Valley hesabı
  let cumulative = 0;
  let minBalance = 0;
  let criticalQuarter = '';
  
  flows.forEach((flow, index) => {
    cumulative += flow;
    if (cumulative < minBalance) {
      minBalance = cumulative;
      criticalQuarter = `Q${index + 1}`;
    }
  });

  // 2. Yıl sonu bakiyesi (Faz 1)
  const yearEndBalance = flows.reduce((a, b) => a + b, 0);
  const yearEndDeficit = yearEndBalance < 0;
  
  // 3. Break-even noktası (Faz 1)
  let breakEvenQuarter: string | null = null;
  let cumulativeForBreakeven = 0;
  flows.forEach((flow, index) => {
    cumulativeForBreakeven += flow;
    if (!breakEvenQuarter && cumulativeForBreakeven > 0) {
      breakEvenQuarter = `Q${index + 1}`;
    }
  });
  
  // 4. Year 2 projeksiyon (Faz 2)
  const y2Flows = flows.map(f => f * (1 + year2GrowthRate));
  let y2Cumulative = yearEndBalance;
  let y2MinBalance = yearEndBalance;
  let y2CriticalQuarter = '';
  
  y2Flows.forEach((flow, index) => {
    y2Cumulative += flow;
    if (y2Cumulative < y2MinBalance) {
      y2MinBalance = y2Cumulative;
      y2CriticalQuarter = `Y2-Q${index + 1}`;
    }
  });
  
  // 5. Combined 2-year death valley
  const combinedDeathValley = Math.min(minBalance, y2MinBalance);
  const combinedCriticalPeriod = minBalance <= y2MinBalance ? criticalQuarter : y2CriticalQuarter;
  
  // 6. Aylık burn rate
  const monthlyBurn = yearEndBalance < 0 ? Math.abs(yearEndBalance) / 12 : 0;
  
  // 7. Gerekli yatırım = max(death valley, yıl sonu açık) + güvenlik marjı (Faz 1)
  const deathValleyNeed = Math.abs(minBalance);
  const yearEndNeed = Math.abs(Math.min(0, yearEndBalance));
  const baseNeed = Math.max(deathValleyNeed, yearEndNeed);
  const calculationBasis = baseNeed === 0 ? 'none' 
    : deathValleyNeed >= yearEndNeed ? 'death_valley' : 'year_end';
  
  // 8. Extended runway info (Faz 2)
  const extendedRunway: ExtendedRunwayInfo = {
    year1DeathValley: minBalance,
    year2DeathValley: y2MinBalance,
    combinedDeathValley,
    combinedCriticalPeriod: combinedCriticalPeriod || 'N/A',
    month18Runway: monthlyBurn > 0 ? (baseNeed / monthlyBurn) >= 18 : true,
    month24Runway: monthlyBurn > 0 ? (baseNeed / monthlyBurn) >= 24 : true
  };
  
  // 9. 3 Seçenekli yatırım önerisi (Faz 2)
  const investmentTiers: InvestmentTier[] = [
    {
      tier: 'minimum',
      label: 'Minimum (Survival)',
      amount: baseNeed > 0 ? baseNeed * 1.15 : 0,
      runwayMonths: monthlyBurn > 0 ? Math.ceil((baseNeed * 1.15) / monthlyBurn) : 999,
      description: 'Yıl sonuna kadar hayatta kalma',
      safetyMargin: 0.15
    },
    {
      tier: 'recommended',
      label: 'Önerilen (Growth)',
      amount: combinedDeathValley < 0 ? Math.abs(combinedDeathValley) * 1.25 : 0,
      runwayMonths: monthlyBurn > 0 ? Math.ceil((Math.abs(combinedDeathValley) * 1.25) / monthlyBurn) : 999,
      description: '18 ay runway + büyüme tamponu',
      safetyMargin: 0.25
    },
    {
      tier: 'aggressive',
      label: 'Agresif (Scale)',
      amount: combinedDeathValley < 0 ? Math.abs(combinedDeathValley) * 1.50 : 0,
      runwayMonths: monthlyBurn > 0 ? Math.ceil((Math.abs(combinedDeathValley) * 1.50) / monthlyBurn) : 999,
      description: '24 ay runway + işe alım + agresif büyüme',
      safetyMargin: 0.50
    }
  ];
  
  return {
    minCumulativeCash: minBalance,
    criticalQuarter: criticalQuarter || 'N/A',
    requiredInvestment: baseNeed > 0 ? baseNeed * (1 + safetyMargin) : 0,
    burnRateMonthly: monthlyBurn,
    runwayMonths: monthlyBurn > 0 ? Math.ceil(baseNeed / monthlyBurn) : 999,
    selfSustaining: minBalance >= 0 && yearEndBalance >= 0,
    yearEndBalance,
    yearEndDeficit,
    breakEvenQuarter,
    calculationBasis,
    extendedRunway,
    investmentTiers
  };
};

// =====================================================
// MULTI-YEAR CAPITAL NEEDS CALCULATION
// =====================================================

/**
 * Calculate multi-year capital needs with year-dependent carry-forward logic.
 * This function simulates quarterly cash flow for each year in the 5-year projection,
 * calculating opening balance from previous year's ending cash.
 */
export const calculateMultiYearCapitalNeeds = (
  exitPlan: ExitPlan,
  year1Investment: number,      // 1. yıl alınan yatırım
  year1NetProfit: number,       // 1. yıl net kar (senaryo net profit)
  safetyMargin: number = 0.20   // Güvenlik marjı %
): MultiYearCapitalPlan => {
  const years: YearCapitalRequirement[] = [];
  let carryForwardCash = year1NetProfit;  // Devir nakit
  let totalRequiredInvestment = year1Investment;
  let selfSustainingFromYear: number | null = null;
  
  // Revenue quarterly distribution (back-loaded)
  const revenueQuarterlyRatios = { q1: 0.15, q2: 0.20, q3: 0.30, q4: 0.35 };
  // Expense quarterly distribution (evenly distributed)
  const expenseQuarterlyRatios = { q1: 0.25, q2: 0.25, q3: 0.25, q4: 0.25 };
  
  exitPlan.allYears?.forEach((yearProjection, index) => {
    const year = yearProjection.actualYear;
    const openingCash = index === 0 ? year1NetProfit : carryForwardCash;
    
    // Çeyreklik nakit akışı simülasyonu
    const quarterlyRevenue = {
      q1: yearProjection.revenue * revenueQuarterlyRatios.q1,
      q2: yearProjection.revenue * revenueQuarterlyRatios.q2,
      q3: yearProjection.revenue * revenueQuarterlyRatios.q3,
      q4: yearProjection.revenue * revenueQuarterlyRatios.q4,
    };
    
    const quarterlyExpense = {
      q1: yearProjection.expenses * expenseQuarterlyRatios.q1,
      q2: yearProjection.expenses * expenseQuarterlyRatios.q2,
      q3: yearProjection.expenses * expenseQuarterlyRatios.q3,
      q4: yearProjection.expenses * expenseQuarterlyRatios.q4,
    };
    
    // Çeyreklik kümülatif nakit akışı
    let cumulative = openingCash;
    let peakDeficit = openingCash; // Start from opening
    let peakDeficitQuarter = 'Q0';
    const quarterlyDeficit = { q1: 0, q2: 0, q3: 0, q4: 0 };
    
    const quarters = ['q1', 'q2', 'q3', 'q4'] as const;
    quarters.forEach((q, i) => {
      const netFlow = quarterlyRevenue[q] - quarterlyExpense[q];
      cumulative += netFlow;
      
      if (cumulative < peakDeficit) {
        peakDeficit = cumulative;
        peakDeficitQuarter = `Q${i + 1}`;
      }
      
      quarterlyDeficit[q] = cumulative < 0 ? Math.abs(cumulative) : 0;
    });
    
    // Bu yıl gereken ek sermaye
    const requiredCapital = peakDeficit < 0 
      ? Math.abs(peakDeficit) * (1 + safetyMargin)  // Güvenlik marjı ile
      : 0;
    
    // Yıl sonu bakiye
    const endingCash = openingCash + yearProjection.netProfit;
    
    // Kendi kendini finanse ediyor mu?
    const isSelfSustaining = peakDeficit >= 0;
    if (isSelfSustaining && selfSustainingFromYear === null) {
      selfSustainingFromYear = year;
    }
    
    years.push({
      year,
      openingCash,
      projectedRevenue: yearProjection.revenue,
      projectedExpenses: yearProjection.expenses,
      projectedNetProfit: yearProjection.netProfit,
      quarterlyDeficit,
      peakDeficit,
      peakDeficitQuarter: peakDeficitQuarter === 'Q0' ? 'N/A' : peakDeficitQuarter,
      requiredCapital,
      endingCash,
      isSelfSustaining,
      weightedValuation: yearProjection.valuations?.weighted || yearProjection.companyValuation,
    });
    
    // Bir sonraki yıla devir (yıl sonu bakiyesi + gerekli ek sermaye)
    carryForwardCash = endingCash + requiredCapital;
    if (requiredCapital > 0) {
      totalRequiredInvestment += requiredCapital;
    }
  });
  
  return {
    years,
    totalRequiredInvestment,
    cumulativeEndingCash: carryForwardCash,
    selfSustainingFromYear,
  };
};

// İki Aşamalı Büyüme Modeli ile 3-5 yıllık finansal projeksiyon
// Enhanced with EBITDA, DCF, VC valuations
export const projectFutureRevenue = (
  year1Revenue: number, 
  year1Expenses: number,
  growthConfig: GrowthConfiguration, 
  sectorMultiple: number,
  scenarioTargetYear?: number,  // Optional: senaryo yılı, verilmezse getProjectionYears() kullanılır
  valuationConfig: ValuationConfiguration = DEFAULT_VALUATION_CONFIG,
  sector: string = 'default'
): { year3: MultiYearProjection; year5: MultiYearProjection; allYears: MultiYearProjection[] } => {
  const { year1: defaultYear } = getProjectionYears();
  const scenarioYear = scenarioTargetYear || defaultYear;
  const years: MultiYearProjection[] = [];
  let revenue = year1Revenue;
  let expenses = year1Expenses;
  let cumulativeProfit = 0;
  
  // Get EBITDA multiple for sector
  const ebitdaMultiple = getEBITDAMultiple(sector);
  
  // First pass: Calculate basic projections and collect FCF data
  const fcfProjections: number[] = [];
  const yearlyData: Array<{ revenue: number; expenses: number }> = [];
  
  // Debug: Log inputs
  console.log('[projectFutureRevenue] Inputs:', {
    year1Revenue,
    year1Expenses,
    aggressiveGrowthRate: growthConfig.aggressiveGrowthRate,
    normalizedGrowthRate: growthConfig.normalizedGrowthRate,
    sectorMultiple,
    ebitdaMultiple,
    valuationConfig
  });
  
  for (let i = 1; i <= 5; i++) {
    let effectiveGrowthRate: number;
    let growthStage: 'aggressive' | 'normalized';
    
    if (i <= growthConfig.transitionYear) {
      // Agresif Aşama (Year 1-2): Kullanıcı hedefi, hafif decay ile
      const aggressiveDecay = Math.max(0.7, 1 - (i * 0.15));
      effectiveGrowthRate = growthConfig.aggressiveGrowthRate * aggressiveDecay;
      growthStage = 'aggressive';
    } else {
      // Normalize Aşama (Year 3-5): Sektör ortalaması, stabil
      const normalDecay = Math.max(0.8, 1 - ((i - growthConfig.transitionYear) * 0.05));
      effectiveGrowthRate = growthConfig.normalizedGrowthRate * normalDecay;
      growthStage = 'normalized';
    }
    
    revenue = revenue * (1 + effectiveGrowthRate);
    expenses = expenses * (1 + (effectiveGrowthRate * 0.6)); // Giderler gelirden daha yavaş büyür
    const netProfit = revenue - expenses;
    cumulativeProfit += netProfit;
    
    // Calculate EBITDA and FCF for this year
    const ebitda = calculateEBITDA(revenue, expenses);
    const ebitdaMargin = calculateEBITDAMargin(ebitda, revenue);
    const fcf = calculateFCF(ebitda, revenue, valuationConfig.capexRatio, valuationConfig.taxRate);
    fcfProjections.push(fcf);
    yearlyData.push({ revenue, expenses });
    
    // Calculate individual valuations (DCF and VC will be added in second pass)
    const revenueMultipleVal = revenue * sectorMultiple;
    const ebitdaMultipleVal = ebitda * ebitdaMultiple;
    
    years.push({
      year: i,
      actualYear: scenarioYear + i,  // 2027, 2028, 2029, 2030, 2031
      revenue,
      expenses,
      netProfit,
      cumulativeProfit,
      companyValuation: revenueMultipleVal, // Temporary, will be updated
      appliedGrowthRate: effectiveGrowthRate,
      growthStage,
      // NEW fields
      ebitda,
      ebitdaMargin,
      freeCashFlow: fcf,
      valuations: {
        revenueMultiple: revenueMultipleVal,
        ebitdaMultiple: ebitdaMultipleVal,
        dcf: 0, // Will be calculated after loop
        vcMethod: 0, // Will be calculated after loop
        weighted: 0 // Will be calculated after loop
      }
    });
  }
  
  // Second pass: Calculate DCF and VC valuations
  const dcfValue = calculateDCFValuation(
    fcfProjections,
    valuationConfig.discountRate,
    valuationConfig.terminalGrowthRate
  );
  
  // Year 5 exit value for VC method
  const year5RevenueMultiple = years[4]?.valuations?.revenueMultiple || 0;
  const vcValue = calculateVCValuation(year5RevenueMultiple, valuationConfig.expectedROI);
  
  // Update each year with DCF, VC, and weighted valuations
  years.forEach((year, i) => {
    if (year.valuations) {
      // Distribute DCF and VC values proportionally across years
      const yearRatio = (i + 1) / 5;
      year.valuations.dcf = dcfValue * yearRatio;
      year.valuations.vcMethod = vcValue * yearRatio;
      
      // Calculate weighted valuation
      year.valuations.weighted = calculateWeightedValuation(
        year.valuations,
        valuationConfig.weights
      );
      
      // Update company valuation to use weighted value
      year.companyValuation = year.valuations.weighted;
    }
  });
  
  // Debug: Log results
  console.log('[projectFutureRevenue] Results:', {
    year3Valuation: years[2]?.companyValuation,
    year5Valuation: years[4]?.companyValuation,
    year5Revenue: years[4]?.revenue,
    dcfValue,
    vcValue,
    year5Valuations: years[4]?.valuations
  });
  
  return { 
    year3: years[2], 
    year5: years[4],
    allYears: years
  };
};

// Calculate Exit Plan for investors with Two-Stage Growth Model
export const calculateExitPlan = (
  deal: DealConfiguration,
  year1Revenue: number,
  year1Expenses: number,
  userGrowthRate: number,
  sector: string = 'default',
  scenarioTargetYear?: number  // Optional: senaryo yılı, verilmezse getProjectionYears() kullanılır
): ExitPlan => {
  const { year1: defaultYear1, year3: defaultYear3, year5: defaultYear5 } = getProjectionYears();
  const year1 = scenarioTargetYear || defaultYear1;
  const year3 = year1 + 3;
  const year5 = year1 + 5;
  
  // İki aşamalı konfigürasyon oluştur
  const growthConfig: GrowthConfiguration = {
    aggressiveGrowthRate: Math.min(Math.max(userGrowthRate, 0.10), 1.0), // Min %10, Max %100
    normalizedGrowthRate: SECTOR_NORMALIZED_GROWTH[sector] || SECTOR_NORMALIZED_GROWTH['default'],
    transitionYear: 2,
    rawUserGrowthRate: userGrowthRate
  };
  
  const postMoney = deal.investmentAmount / (deal.equityPercentage / 100);
  const projections = projectFutureRevenue(year1Revenue, year1Expenses, growthConfig, deal.sectorMultiple, year1);
  
  const investorShare3 = projections.year3.companyValuation * (deal.equityPercentage / 100);
  const investorShare5 = projections.year5.companyValuation * (deal.equityPercentage / 100);
  
  // Find break-even year
  let breakEvenYear: number | null = null;
  for (const year of projections.allYears) {
    if (year.cumulativeProfit >= 0 && breakEvenYear === null) {
      breakEvenYear = year.year;
    }
  }
  
  const moic5YearCalc = investorShare5 / deal.investmentAmount;
  
  // Debug: Log MOIC calculation
  console.log('[calculateExitPlan] MOIC Calculation:', {
    year5Valuation: projections.year5.companyValuation,
    equityPercentage: deal.equityPercentage,
    investorShare5,
    investmentAmount: deal.investmentAmount,
    moic5Year: moic5YearCalc,
    // Sanity check
    expectedMOIC: (projections.year5.companyValuation * (deal.equityPercentage / 100)) / deal.investmentAmount
  });
  
  // Sanity check: MOIC should reasonably be < 100x for most scenarios
  if (moic5YearCalc > 100) {
    console.warn('[calculateExitPlan] Abnormally high MOIC detected:', moic5YearCalc, 'Check inputs!');
  }
  
  return {
    postMoneyValuation: postMoney,
    year3Projection: projections.year3,
    year5Projection: projections.year5,
    investorShare3Year: investorShare3,
    investorShare5Year: investorShare5,
    moic3Year: investorShare3 / deal.investmentAmount,
    moic5Year: moic5YearCalc,
    breakEvenYear,
    potentialAcquirers: [], // AI tarafından doldurulacak
    exitStrategy: 'unknown',
    yearLabels: {
      scenarioYear: year1,   // 2026
      moic3Year: year3,      // 2029
      moic5Year: year5       // 2031
    },
    growthConfig,
    allYears: projections.allYears
  };
};

// =====================================================
// INVESTMENT SCENARIO COMPARISON (Yatırım Al vs Alama)
// =====================================================

interface ScenarioInputs {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  baseRevenue: number; // For organic growth calculation
}

/**
 * Calculates the investment scenario comparison:
 * - What happens if we get investment (Positive Scenario A)
 * - What happens if we don't get investment (Negative Scenario B)
 * - Opportunity cost and future impact
 */
export const calculateInvestmentScenarioComparison = (
  scenarioA: ScenarioInputs, // Positive - Yatırım alırsak
  scenarioB: ScenarioInputs, // Negative - Yatırım alamazsak
  exitPlan: ExitPlan,
  sectorMultiple: number,
  scenarioTargetYear?: number  // Optional: senaryo yılı, verilmezse getProjectionYears() kullanılır
): InvestmentScenarioComparison => {
  const { year1: defaultYear } = getProjectionYears();
  const year1 = scenarioTargetYear || defaultYear;
  
  // Growth rates
  const growthRateA = scenarioA.baseRevenue > 0 
    ? (scenarioA.totalRevenue - scenarioA.baseRevenue) / scenarioA.baseRevenue 
    : 0;
  const growthRateB = scenarioB.baseRevenue > 0 
    ? (scenarioB.totalRevenue - scenarioB.baseRevenue) / scenarioB.baseRevenue 
    : 0;
  
  // Organic growth rate (for withoutInvestment projections)
  const organicGrowthRate = Math.max(growthRateB, 0.05); // Minimum %5 organic growth
  
  // Gelir ve kâr kayıpları
  const revenueLoss = scenarioA.totalRevenue - scenarioB.totalRevenue;
  const profitLoss = scenarioA.netProfit - scenarioB.netProfit;
  const growthRateDiff = growthRateA - growthRateB;
  
  // Yüzdesel kayıp
  const percentageLoss = scenarioA.totalRevenue > 0 
    ? (revenueLoss / scenarioA.totalRevenue) * 100 
    : 0;
  
  // Risk seviyesi
  const lossRatio = revenueLoss / Math.max(scenarioA.totalRevenue, 1);
  const riskLevel = lossRatio > 0.5 ? 'critical' as const : 
                    lossRatio > 0.3 ? 'high' as const : 
                    lossRatio > 0.15 ? 'medium' as const : 'low' as const;
  
  // 5 yıllık projeksiyon - Yatırımlı (exitPlan'dan)
  const year1WithInvestment = scenarioA.totalRevenue * sectorMultiple;
  const year3WithInvestment = exitPlan.year3Projection?.companyValuation || year1WithInvestment * 2.5;
  const year5WithInvestment = exitPlan.year5Projection?.companyValuation || year1WithInvestment * 5;
  
  // 5 yıllık projeksiyon - Yatırımsız (organik büyüme ile)
  const year1WithoutInvestment = scenarioB.totalRevenue * sectorMultiple;
  let revenueWithout = scenarioB.totalRevenue;
  const yearlyProjections: Array<{
    year: number;
    yearLabel: string;
    withInvestment: number;
    withoutInvestment: number;
    difference: number;
  }> = [];
  
  // Year 0 (current scenario year)
  yearlyProjections.push({
    year: 0,
    yearLabel: `${year1} (Senaryo)`,
    withInvestment: year1WithInvestment,
    withoutInvestment: year1WithoutInvestment,
    difference: year1WithInvestment - year1WithoutInvestment
  });
  
  // Years 1-5
  for (let i = 1; i <= 5; i++) {
    revenueWithout = revenueWithout * (1 + organicGrowthRate);
    const valuationWithout = revenueWithout * sectorMultiple;
    const valuationWith = exitPlan.allYears?.[i-1]?.companyValuation || year1WithInvestment * (1 + i * 0.5);
    
    yearlyProjections.push({
      year: i,
      yearLabel: `${year1 + i}`,
      withInvestment: valuationWith,
      withoutInvestment: valuationWithout,
      difference: valuationWith - valuationWithout
    });
  }
  
  const year3WithoutInvestment = yearlyProjections[3]?.withoutInvestment || scenarioB.totalRevenue * Math.pow(1 + organicGrowthRate, 3) * sectorMultiple;
  const year5WithoutInvestment = yearlyProjections[5]?.withoutInvestment || scenarioB.totalRevenue * Math.pow(1 + organicGrowthRate, 5) * sectorMultiple;
  
  // Değerleme kaybı (5Y)
  const valuationLoss = year5WithInvestment - year5WithoutInvestment;
  
  return {
    withInvestment: {
      totalRevenue: scenarioA.totalRevenue,
      totalExpenses: scenarioA.totalExpenses,
      netProfit: scenarioA.netProfit,
      profitMargin: scenarioA.profitMargin,
      exitValuation: year5WithInvestment,
      moic5Year: exitPlan.moic5Year || 0,
      growthRate: growthRateA,
    },
    withoutInvestment: {
      totalRevenue: scenarioB.totalRevenue,
      totalExpenses: scenarioB.totalExpenses,
      netProfit: scenarioB.netProfit,
      profitMargin: scenarioB.profitMargin,
      organicGrowthRate,
    },
    opportunityCost: {
      revenueLoss,
      profitLoss,
      valuationLoss,
      growthRateDiff,
      percentageLoss,
      riskLevel,
    },
    futureImpact: {
      year1WithInvestment,
      year1WithoutInvestment,
      year3WithInvestment,
      year3WithoutInvestment,
      year5WithInvestment,
      year5WithoutInvestment,
      cumulativeDifference: valuationLoss,
      yearlyProjections,
    },
  };
};

interface CachedInvestorInfo {
  id: string;
  updatedAt: Date;
}

export function useInvestorAnalysis() {
  const [dealConfig, setDealConfig] = useState<DealConfiguration>(DEFAULT_DEAL_CONFIG);
  const [investorAnalysis, setInvestorAnalysis] = useState<AIInvestorAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedInfo, setCachedInfo] = useState<CachedInvestorInfo | null>(null);
  const [isCacheLoading, setIsCacheLoading] = useState(false);
  
  // New states for data change detection and history
  const [dataChanged, setDataChanged] = useState(false);
  const [savedHashes, setSavedHashes] = useState<{ hashA: string | null; hashB: string | null }>({ hashA: null, hashB: null });
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const updateDealConfig = useCallback((updates: Partial<DealConfiguration>) => {
    setDealConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Load cached investor analysis from database
  const loadCachedInvestorAnalysis = useCallback(async (
    scenarioAId: string,
    scenarioBId: string
  ): Promise<boolean> => {
    setIsCacheLoading(true);
    setDataChanged(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsCacheLoading(false);
        return false;
      }

      const { data, error: fetchError } = await supabase
        .from('scenario_ai_analyses')
        .select('id, investor_analysis, deal_config, updated_at, scenario_a_data_hash, scenario_b_data_hash')
        .eq('user_id', user.id)
        .eq('scenario_a_id', scenarioAId)
        .eq('scenario_b_id', scenarioBId)
        .eq('analysis_type', 'investor_pitch')
        .maybeSingle();

      if (fetchError) {
        console.error('Error loading cached investor analysis:', fetchError);
        setIsCacheLoading(false);
        return false;
      }

      if (data && data.investor_analysis) {
        setInvestorAnalysis(data.investor_analysis as unknown as AIInvestorAnalysis);
        if (data.deal_config) {
          setDealConfig(data.deal_config as unknown as DealConfiguration);
        }
        setCachedInfo({
          id: data.id,
          updatedAt: new Date(data.updated_at),
        });
        
        // Store saved hashes for change detection
        setSavedHashes({
          hashA: data.scenario_a_data_hash || null,
          hashB: data.scenario_b_data_hash || null
        });
        
        setIsCacheLoading(false);
        return true;
      }

      setIsCacheLoading(false);
      return false;
    } catch (e) {
      console.error('Error loading cached investor analysis:', e);
      setIsCacheLoading(false);
      return false;
    }
  }, []);

  // Check if scenario data has changed since last analysis
  const checkDataChanges = useCallback((
    scenarioA: SimulationScenario,
    scenarioB: SimulationScenario
  ): boolean => {
    if (!savedHashes.hashA || !savedHashes.hashB) {
      setDataChanged(false);
      return false;
    }
    
    const currentHashA = generateScenarioHash(scenarioA);
    const currentHashB = generateScenarioHash(scenarioB);
    
    const hasChanged = checkDataChanged(currentHashA, savedHashes.hashA) || 
                       checkDataChanged(currentHashB, savedHashes.hashB);
    
    setDataChanged(hasChanged);
    return hasChanged;
  }, [savedHashes]);

  // Load analysis history
  const loadAnalysisHistory = useCallback(async (
    scenarioAId: string,
    scenarioBId: string
  ): Promise<void> => {
    setIsHistoryLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsHistoryLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('scenario_analysis_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('scenario_a_id', scenarioAId)
        .eq('scenario_b_id', scenarioBId)
        .eq('analysis_type', 'investor_pitch')
        .order('created_at', { ascending: false })
        .limit(5);

      if (fetchError) {
        console.error('Error loading investor analysis history:', fetchError);
        setIsHistoryLoading(false);
        return;
      }

      const historyItems: AnalysisHistoryItem[] = (data || []).map(item => ({
        id: item.id,
        createdAt: new Date(item.created_at),
        analysisType: item.analysis_type as 'scenario_comparison' | 'investor_pitch',
        investorAnalysis: item.investor_analysis as unknown as AnalysisHistoryItem['investorAnalysis'],
        dealConfig: item.deal_config as unknown as AnalysisHistoryItem['dealConfig'],
        scenarioADataHash: item.scenario_a_data_hash || undefined,
        scenarioBDataHash: item.scenario_b_data_hash || undefined,
      }));

      setAnalysisHistory(historyItems);
    } catch (e) {
      console.error('Error loading investor analysis history:', e);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  // Save to history
  const saveToHistory = useCallback(async (
    result: AIInvestorAnalysis,
    config: DealConfiguration,
    scenarioA: SimulationScenario,
    scenarioB: SimulationScenario
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !scenarioA.id || !scenarioB.id) return;

      const hashA = generateScenarioHash(scenarioA);
      const hashB = generateScenarioHash(scenarioB);

      await supabase.from('scenario_analysis_history').insert({
        user_id: user.id,
        scenario_a_id: scenarioA.id,
        scenario_b_id: scenarioB.id,
        analysis_type: 'investor_pitch',
        investor_analysis: result as any,
        deal_config: config as any,
        scenario_a_data_hash: hashA,
        scenario_b_data_hash: hashB,
      });

      // Refresh history
      await loadAnalysisHistory(scenarioA.id, scenarioB.id);
    } catch (e) {
      console.error('Error saving investor analysis to history:', e);
    }
  }, [loadAnalysisHistory]);

  // Save investor analysis to database
  const saveInvestorAnalysis = useCallback(async (
    result: AIInvestorAnalysis,
    config: DealConfiguration,
    scenarioA: SimulationScenario,
    scenarioB: SimulationScenario
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !scenarioA.id || !scenarioB.id) return;

      const hashA = generateScenarioHash(scenarioA);
      const hashB = generateScenarioHash(scenarioB);

      const { data, error: upsertError } = await supabase
        .from('scenario_ai_analyses')
        .upsert([{
          user_id: user.id,
          scenario_a_id: scenarioA.id,
          scenario_b_id: scenarioB.id,
          analysis_type: 'investor_pitch',
          investor_analysis: result as any,
          deal_config: config as any,
          scenario_a_data_hash: hashA,
          scenario_b_data_hash: hashB,
          updated_at: new Date().toISOString(),
        }], {
          onConflict: 'user_id,scenario_a_id,scenario_b_id,analysis_type'
        })
        .select('id, updated_at')
        .single();

      if (upsertError) {
        console.error('Error saving investor analysis:', upsertError);
        return;
      }

      if (data) {
        setCachedInfo({
          id: data.id,
          updatedAt: new Date(data.updated_at),
        });
        setSavedHashes({ hashA, hashB });
        setDataChanged(false);
      }

      // Also save to history
      await saveToHistory(result, config, scenarioA, scenarioB);
    } catch (e) {
      console.error('Error saving investor analysis:', e);
    }
  }, [saveToHistory]);

  const analyzeForInvestors = useCallback(async (
    scenarioA: SimulationScenario,
    scenarioB: SimulationScenario,
    summaryA: ScenarioSummary,
    summaryB: ScenarioSummary,
    quarterlyA: QuarterlyData,
    quarterlyB: QuarterlyData
  ): Promise<AIInvestorAnalysis | null> => {
    setIsLoading(true);
    setError(null);

    const capitalNeedA = calculateCapitalNeeds(quarterlyA);
    const capitalNeedB = calculateCapitalNeeds(quarterlyB);
    
    // Calculate growth rate from scenario B
    const growthRate = summaryA.totalRevenue > 0 
      ? (summaryB.totalRevenue - summaryA.totalRevenue) / summaryA.totalRevenue 
      : 0.3;
    
    const exitPlan = calculateExitPlan(dealConfig, summaryB.totalRevenue, summaryB.totalExpenses, growthRate);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-investor-pitch', {
        body: {
          scenarioA: { 
            name: scenarioA.name, 
            baseYear: scenarioA.baseYear, 
            targetYear: scenarioA.targetYear 
          },
          scenarioB: { 
            name: scenarioB.name, 
            baseYear: scenarioB.baseYear, 
            targetYear: scenarioB.targetYear 
          },
          metrics: {
            scenarioA: summaryA,
            scenarioB: summaryB,
          },
          capitalNeeds: {
            scenarioA: capitalNeedA,
            scenarioB: capitalNeedB,
          },
          dealConfig: {
            investmentAmount: dealConfig.investmentAmount,
            equityPercentage: dealConfig.equityPercentage,
            postMoneyValuation: exitPlan.postMoneyValuation,
            sectorMultiple: dealConfig.sectorMultiple,
          },
          projections: {
            year3: exitPlan.year3Projection,
            year5: exitPlan.year5Projection,
            moic3Year: exitPlan.moic3Year,
            moic5Year: exitPlan.moic5Year,
            growthRate,
          }
        }
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('AI analizi şu an yoğun. Lütfen birkaç saniye bekleyin.');
        } else if (data.error.includes('credits')) {
          toast.error('AI kredisi yetersiz. Lütfen hesabınıza bakiye ekleyin.');
        } else {
          toast.error(`AI analizi başarısız: ${data.error}`);
        }
        setError(data.error);
        return null;
      }

      const analysis: AIInvestorAnalysis = {
        capitalStory: data.capital_story || '',
        opportunityCost: data.opportunity_cost || '',
        investorROI: data.investor_roi || '',
        exitNarrative: data.exit_narrative || '',
        potentialAcquirers: data.potential_acquirers || [],
        riskFactors: data.risk_factors || [],
        keyMetrics: {
          capitalEfficiency: data.capital_efficiency || 0,
          paybackMonths: data.payback_months || 0,
          burnMultiple: data.burn_multiple || 0,
        },
        recommendedExit: data.recommended_exit || 'hold'
      };

      setInvestorAnalysis(analysis);
      toast.success('Yatırımcı analizi tamamlandı');

      // Save to database with hashes
      if (scenarioA.id && scenarioB.id) {
        await saveInvestorAnalysis(analysis, dealConfig, scenarioA, scenarioB);
      }

      return analysis;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Yatırımcı analizi başarısız';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [dealConfig, saveInvestorAnalysis]);

  // Restore a historical analysis
  const restoreHistoricalAnalysis = useCallback((historyItem: AnalysisHistoryItem) => {
    if (historyItem.investorAnalysis) {
      setInvestorAnalysis(historyItem.investorAnalysis);
      if (historyItem.dealConfig) {
        setDealConfig(historyItem.dealConfig);
      }
      setCachedInfo({
        id: historyItem.id,
        updatedAt: historyItem.createdAt
      });
      toast.success('Geçmiş yatırımcı analizi geri yüklendi');
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setInvestorAnalysis(null);
    setError(null);
    setCachedInfo(null);
    setDataChanged(false);
    setSavedHashes({ hashA: null, hashB: null });
  }, []);

  return {
    dealConfig,
    updateDealConfig,
    investorAnalysis,
    isLoading,
    isCacheLoading,
    error,
    cachedInfo,
    dataChanged,
    analysisHistory,
    isHistoryLoading,
    analyzeForInvestors,
    loadCachedInvestorAnalysis,
    loadAnalysisHistory,
    checkDataChanges,
    restoreHistoricalAnalysis,
    clearAnalysis,
    calculateCapitalNeeds,
    calculateExitPlan,
    projectFutureRevenue,
  };
}
