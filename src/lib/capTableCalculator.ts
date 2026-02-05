/**
 * Cap Table Calculator Engine
 * Investor-Grade dilution modeling, exit waterfall, and ownership calculations
 * 
 * @module capTableCalculator
 */

import type {
  CapTableEntry,
  DealTermsV2,
  CapTableConfig,
  ExitWaterfallResult,
  DilutionPathEntry,
  FutureRoundAssumption,
} from '@/types/simulation';

// =====================================================
// CAP TABLE CALCULATIONS
// =====================================================

/**
 * Calculate post-money cap table after investment
 */
export const calculatePostMoneyCapTable = (
  currentCapTable: CapTableEntry[],
  investmentAmount: number,
  dealTerms: DealTermsV2
): CapTableEntry[] => {
  // Determine pre vs post money valuation
  const preMoneyValuation = dealTerms.pre_money ?? 
    (dealTerms.post_money ? dealTerms.post_money - investmentAmount : 0);
  const postMoneyValuation = dealTerms.post_money ?? 
    (preMoneyValuation + investmentAmount);
  
  if (postMoneyValuation <= 0) {
    console.warn('[capTableCalculator] Invalid valuation, returning original cap table');
    return currentCapTable;
  }

  // Calculate new investor ownership
  const investorOwnership = investmentAmount / postMoneyValuation;
  
  // Calculate new option pool if expanding
  const existingEsop = currentCapTable.find(e => e.holder.toLowerCase().includes('esop') || e.holder.toLowerCase().includes('option'));
  const existingEsopPct = existingEsop?.percentage ?? 0;
  const newEsopPct = dealTerms.option_pool_new ?? 0;
  const totalEsopPct = existingEsopPct + newEsopPct;
  
  // Dilution factor for existing shareholders
  // New ESOP is typically created pre-money, so it dilutes founders
  const dilutionFromInvestor = 1 - investorOwnership;
  const dilutionFromNewEsop = dealTerms.option_pool_new > 0 
    ? 1 - dealTerms.option_pool_new 
    : 1;
  const totalDilution = dilutionFromInvestor * dilutionFromNewEsop;

  // Build new cap table
  const newCapTable: CapTableEntry[] = [];

  // Dilute existing shareholders
  for (const entry of currentCapTable) {
    if (entry.holder.toLowerCase().includes('esop') || entry.holder.toLowerCase().includes('option')) {
      // ESOP is kept separate, will be updated
      continue;
    }
    
    newCapTable.push({
      holder: entry.holder,
      shares: entry.shares, // Shares don't change, just percentage
      percentage: entry.percentage * totalDilution,
      type: entry.type,
    });
  }

  // Add new investor
  newCapTable.push({
    holder: 'New Investor',
    shares: 0, // Would need share count calculation
    percentage: investorOwnership,
    type: 'preferred',
  });

  // Add/update ESOP
  if (totalEsopPct > 0) {
    newCapTable.push({
      holder: 'ESOP',
      shares: 0,
      percentage: totalEsopPct * dilutionFromInvestor,
      type: 'options',
    });
  }

  // Normalize to ensure 100%
  const totalPct = newCapTable.reduce((sum, e) => sum + e.percentage, 0);
  if (Math.abs(totalPct - 1) > 0.001) {
    const normFactor = 1 / totalPct;
    return newCapTable.map(e => ({
      ...e,
      percentage: e.percentage * normFactor,
    }));
  }

  return newCapTable;
};

/**
 * Calculate dilution path through multiple funding rounds
 * Simulates: Seed → Series A → Series B → Exit
 */
export const calculateDilutionPath = (
  currentCapTable: CapTableEntry[],
  futureRounds: FutureRoundAssumption[],
  esopExpansionPerRound: number = 0.05
): DilutionPathEntry[] => {
  const path: DilutionPathEntry[] = [];
  
  // Initial state
  let runningCapTable = [...currentCapTable];
  const founderEntry = runningCapTable.find(e => 
    e.holder.toLowerCase().includes('founder') || e.type === 'common'
  );
  
  path.push({
    round: 'Current',
    ownership: founderEntry?.percentage ?? 0,
    valuation: 0, // Unknown at current state
    cumulativeDilution: 0,
  });

  let cumulativeDilution = 0;

  for (const round of futureRounds) {
    // Apply dilution from this round
    const roundDilution = round.dilution_pct + esopExpansionPerRound;
    const remainingOwnership = 1 - roundDilution;
    
    // Update all existing shareholders
    runningCapTable = runningCapTable.map(entry => ({
      ...entry,
      percentage: entry.percentage * remainingOwnership,
    }));

    // Add new investor for this round
    runningCapTable.push({
      holder: `${round.round} Investor`,
      shares: 0,
      percentage: round.dilution_pct,
      type: 'preferred',
    });

    // Add ESOP expansion
    const existingEsop = runningCapTable.find(e => e.holder === 'ESOP');
    if (existingEsop) {
      existingEsop.percentage += esopExpansionPerRound;
    } else {
      runningCapTable.push({
        holder: 'ESOP',
        shares: 0,
        percentage: esopExpansionPerRound,
        type: 'options',
      });
    }

    cumulativeDilution = 1 - (1 - cumulativeDilution) * remainingOwnership;
    
    const updatedFounder = runningCapTable.find(e => 
      e.holder.toLowerCase().includes('founder') || e.type === 'common'
    );

    path.push({
      round: round.round,
      ownership: updatedFounder?.percentage ?? 0,
      valuation: round.expected_valuation ?? 0,
      cumulativeDilution,
      investmentAmount: round.investment_amount,
    });
  }

  return path;
};

/**
 * Calculate exit waterfall distribution
 * Handles liquidation preferences, participation rights, and pro-rata
 */
export const calculateExitWaterfall = (
  exitValue: number,
  capTable: CapTableEntry[],
  dealTerms: DealTermsV2,
  investmentAmount: number
): ExitWaterfallResult => {
  const proceeds: { holder: string; proceeds: number; moic: number }[] = [];
  let remainingValue = exitValue;

  // Find preferred shareholders (investors)
  const preferredHolders = capTable.filter(e => e.type === 'preferred' || e.type === 'safe');
  const commonHolders = capTable.filter(e => e.type === 'common');
  const esopHolders = capTable.filter(e => e.type === 'options');

  // Step 1: Liquidation preference payout
  let liquidationPreferencePayout = 0;
  const liqPrefMultiplier = parseLiqPref(dealTerms.liq_pref);

  for (const holder of preferredHolders) {
    // Assume proportional investment for each preferred holder
    const holderInvestment = investmentAmount * (holder.percentage / 
      preferredHolders.reduce((sum, h) => sum + h.percentage, 0));
    const preferenceAmount = holderInvestment * liqPrefMultiplier;
    
    liquidationPreferencePayout += Math.min(preferenceAmount, remainingValue);
    remainingValue = Math.max(0, remainingValue - preferenceAmount);
  }

  // Step 2: Distribute remaining to common (and participating preferred)
  const isParticipating = dealTerms.liq_pref.includes('participating');
  
  if (isParticipating) {
    // Participating preferred: investors get preference + pro-rata of remainder
    for (const holder of preferredHolders) {
      const holderInvestment = investmentAmount * (holder.percentage / 
        preferredHolders.reduce((sum, h) => sum + h.percentage, 0));
      const preferenceAmount = holderInvestment * liqPrefMultiplier;
      const proRataShare = remainingValue * holder.percentage;
      const totalProceeds = preferenceAmount + proRataShare;
      
      proceeds.push({
        holder: holder.holder,
        proceeds: totalProceeds,
        moic: holderInvestment > 0 ? totalProceeds / holderInvestment : 0,
      });
    }
    
    // Common shareholders get their pro-rata of remainder
    for (const holder of commonHolders) {
      const proRataShare = remainingValue * holder.percentage;
      proceeds.push({
        holder: holder.holder,
        proceeds: proRataShare,
        moic: 0, // No investment for common
      });
    }
  } else {
    // Non-participating: investors choose max(preference, pro-rata)
    // For simplicity, assume they convert if exit is high enough
    
    const totalEquity = capTable.reduce((sum, h) => sum + h.percentage, 0);
    
    for (const holder of preferredHolders) {
      const holderInvestment = investmentAmount * (holder.percentage / 
        preferredHolders.reduce((sum, h) => sum + h.percentage, 0));
      const preferenceAmount = holderInvestment * liqPrefMultiplier;
      const proRataShare = exitValue * holder.percentage;
      
      // Choose higher of preference or pro-rata (conversion)
      const totalProceeds = Math.max(preferenceAmount, proRataShare);
      
      proceeds.push({
        holder: holder.holder,
        proceeds: totalProceeds,
        moic: holderInvestment > 0 ? totalProceeds / holderInvestment : 0,
      });
    }
    
    // Common shareholders
    for (const holder of commonHolders) {
      const proRataShare = exitValue * holder.percentage;
      proceeds.push({
        holder: holder.holder,
        proceeds: proRataShare,
        moic: 0,
      });
    }
  }

  // ESOP (simplified - treated as common)
  for (const holder of esopHolders) {
    const proRataShare = (isParticipating ? remainingValue : exitValue) * holder.percentage;
    proceeds.push({
      holder: holder.holder,
      proceeds: proRataShare,
      moic: 0,
    });
  }

  return {
    exit_value: exitValue,
    liquidation_preference_payout: liquidationPreferencePayout,
    remaining_for_common: remainingValue,
    proceeds_by_holder: proceeds,
  };
};

/**
 * Calculate ownership at exit accounting for future dilution
 * Enhanced version of existing function with more parameters
 */
export const calculateOwnershipAtExitV2 = (
  entryOwnership: number,
  futureRounds: FutureRoundAssumption[],
  esopExpansionPerRound: number = 0.05
): number => {
  let currentOwnership = entryOwnership;

  for (const round of futureRounds) {
    const roundDilution = round.dilution_pct + esopExpansionPerRound;
    currentOwnership *= (1 - roundDilution);
  }

  return currentOwnership;
};

/**
 * Calculate IRR (Internal Rate of Return) using Newton-Raphson method
 */
export const calculateIRR = (
  cashFlows: number[], // Negative for investments, positive for returns
  periods: number = 5,
  maxIterations: number = 100,
  tolerance: number = 0.0001
): number => {
  if (cashFlows.length === 0) return 0;

  let irr = 0.1; // Initial guess: 10%

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivativeNpv = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const discountFactor = Math.pow(1 + irr, t);
      npv += cashFlows[t] / discountFactor;
      if (t > 0) {
        derivativeNpv -= (t * cashFlows[t]) / Math.pow(1 + irr, t + 1);
      }
    }

    if (Math.abs(npv) < tolerance) {
      return irr;
    }

    if (derivativeNpv === 0) {
      break;
    }

    irr = irr - npv / derivativeNpv;
  }

  return irr;
};

/**
 * Calculate MOIC (Multiple on Invested Capital)
 */
export const calculateMOIC = (
  exitProceeds: number,
  investmentAmount: number
): number => {
  if (investmentAmount <= 0) return 0;
  return exitProceeds / investmentAmount;
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Parse liquidation preference string to multiplier
 */
const parseLiqPref = (liqPref: string): number => {
  if (liqPref.includes('2x')) return 2;
  if (liqPref.includes('1.5x')) return 1.5;
  return 1; // Default 1x
};

/**
 * Create default cap table for a startup
 */
export const createDefaultCapTable = (founderPercentage: number = 0.9): CapTableEntry[] => [
  {
    holder: 'Founders',
    shares: 9000000,
    percentage: founderPercentage,
    type: 'common',
  },
  {
    holder: 'ESOP',
    shares: 1000000,
    percentage: 1 - founderPercentage,
    type: 'options',
  },
];

/**
 * Create default deal terms
 */
export const createDefaultDealTerms = (): DealTermsV2 => ({
  instrument: 'Equity',
  pre_money: 3000000,
  option_pool_existing: 0.10,
  option_pool_new: 0.05,
  liq_pref: '1x_non_participating',
  pro_rata: true,
  founder_vesting: { years: 4, cliff_years: 1 },
  anti_dilution: 'none',
});

/**
 * Create default future round assumptions
 */
export const createDefaultFutureRounds = (): FutureRoundAssumption[] => [
  { 
    round: 'Seed', 
    dilution_pct: 0.15, 
    investment_amount: 500000,
    expected_valuation: 5000000,
  },
  { 
    round: 'Series A', 
    dilution_pct: 0.20, 
    investment_amount: 3000000,
    expected_valuation: 15000000,
  },
  { 
    round: 'Series B', 
    dilution_pct: 0.15, 
    investment_amount: 10000000,
    expected_valuation: 50000000,
  },
];

/**
 * Generate calculation trace for transparency
 */
export const generateCapTableCalcTrace = (
  operation: 'post_money' | 'dilution_path' | 'exit_waterfall',
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>
): string => {
  switch (operation) {
    case 'post_money':
      return `Post-Money Cap Table: Investment $${inputs.investment} / Post-Money $${inputs.postMoney} = ${((inputs.investment as number) / (inputs.postMoney as number) * 100).toFixed(1)}% ownership`;
    
    case 'dilution_path':
      return `Dilution Path: ${(outputs.rounds as string[])?.join(' → ')} | Final Founder Ownership: ${((outputs.finalOwnership as number) * 100).toFixed(1)}%`;
    
    case 'exit_waterfall':
      return `Exit Waterfall: $${inputs.exitValue} exit → Liq Pref $${outputs.liqPref} + Common $${outputs.commonShare}`;
    
    default:
      return 'Cap Table Calculation';
  }
};
