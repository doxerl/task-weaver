/**
 * Unit Economics Engine
 * LTV, CAC, NRR calculations and driver-based revenue projections
 * 
 * @module unitEconomicsEngine
 */

import type {
  BusinessModelType,
  UnitEconomicsInputV2,
  ProjectionItem,
  QuarterlyAmounts,
} from '@/types/simulation';

// =====================================================
// CORE UNIT ECONOMICS CALCULATIONS
// =====================================================

/**
 * Calculate Customer Lifetime Value (LTV)
 * LTV = (ARPA × Gross Margin) / Monthly Churn Rate
 */
export const calculateLTVFromDrivers = (
  arpa: number,
  grossMargin: number,
  monthlyChurnRate: number
): number => {
  if (monthlyChurnRate <= 0) {
    // No churn = infinite LTV, cap at 10 years
    return arpa * grossMargin * 120;
  }
  return (arpa * grossMargin) / monthlyChurnRate;
};

/**
 * Calculate Net Revenue Retention (NRR)
 * NRR = (Starting MRR + Expansion - Contraction - Churn) / Starting MRR
 */
export const calculateNRR = (
  startingMRR: number,
  expansionMRR: number,
  contractionMRR: number,
  churnedMRR: number
): number => {
  if (startingMRR <= 0) return 0;
  return (startingMRR + expansionMRR - contractionMRR - churnedMRR) / startingMRR;
};

/**
 * Calculate CAC Payback Period in months
 */
export const calculateCACPayback = (
  cac: number,
  arpa: number,
  grossMargin: number
): number => {
  const monthlyContribution = arpa * grossMargin;
  if (monthlyContribution <= 0) return Infinity;
  return cac / monthlyContribution;
};

/**
 * Calculate LTV/CAC Ratio
 * Healthy SaaS: 3:1 or higher
 */
export const calculateLTVCACRatio = (ltv: number, cac: number): number => {
  if (cac <= 0) return 0;
  return ltv / cac;
};

/**
 * Calculate Magic Number (SaaS efficiency)
 * Magic Number = Net New ARR / S&M Spend (prior quarter)
 */
export const calculateMagicNumber = (
  netNewARR: number,
  priorQuarterSMSpend: number
): number => {
  if (priorQuarterSMSpend <= 0) return 0;
  return netNewARR / priorQuarterSMSpend;
};

/**
 * Calculate Burn Multiple
 * Burn Multiple = Net Burn / Net New ARR
 * Lower is better (<1 is excellent)
 */
export const calculateBurnMultiple = (
  netBurn: number,
  netNewARR: number
): number => {
  if (netNewARR <= 0) return Infinity;
  return Math.abs(netBurn) / netNewARR;
};

// =====================================================
// SAAS PROJECTIONS
// =====================================================

interface SaaSProjectionInputs {
  currentMRR: number;
  monthlyGrowthRate: number;
  grossMargin: number;
  logoChurn: number;
  nrr: number;
  cac: number;
  arpa: number;
}

/**
 * Project SaaS revenue for 12 months
 */
export const projectSaaSRevenue = (
  inputs: SaaSProjectionInputs,
  months: number = 12
): {
  month: number;
  mrr: number;
  arr: number;
  newCustomers: number;
  churnedCustomers: number;
  netCustomers: number;
  totalCustomers: number;
}[] => {
  const projections: ReturnType<typeof projectSaaSRevenue> = [];
  let currentMRR = inputs.currentMRR;
  let totalCustomers = Math.round(currentMRR / inputs.arpa);
  
  for (let month = 1; month <= months; month++) {
    // New MRR from growth
    const newMRR = currentMRR * inputs.monthlyGrowthRate;
    const newCustomers = Math.round(newMRR / inputs.arpa);
    
    // Churned MRR
    const churnedMRR = currentMRR * inputs.logoChurn;
    const churnedCustomers = Math.round(churnedMRR / inputs.arpa);
    
    // Expansion/Contraction from NRR
    const retainedMRR = (currentMRR - churnedMRR) * inputs.nrr;
    
    // New MRR
    currentMRR = retainedMRR + newMRR;
    totalCustomers = totalCustomers + newCustomers - churnedCustomers;
    
    projections.push({
      month,
      mrr: currentMRR,
      arr: currentMRR * 12,
      newCustomers,
      churnedCustomers,
      netCustomers: newCustomers - churnedCustomers,
      totalCustomers: Math.max(0, totalCustomers),
    });
  }
  
  return projections;
};

// =====================================================
// E-COMMERCE PROJECTIONS
// =====================================================

interface EcomProjectionInputs {
  monthlyTraffic: number;
  conversionRate: number;
  averageOrderValue: number;
  repeatRate: number;
  returnRate: number;
  fulfillmentCostPerOrder: number;
  trafficGrowthRate: number;
}

/**
 * Project e-commerce revenue for 12 months
 */
export const projectEcomRevenue = (
  inputs: EcomProjectionInputs,
  months: number = 12
): {
  month: number;
  traffic: number;
  orders: number;
  grossRevenue: number;
  returns: number;
  netRevenue: number;
  fulfillmentCost: number;
  contribution: number;
}[] => {
  const projections: ReturnType<typeof projectEcomRevenue> = [];
  let currentTraffic = inputs.monthlyTraffic;
  let repeatCustomerBase = 0;
  
  for (let month = 1; month <= months; month++) {
    // New orders from traffic
    const newOrders = Math.round(currentTraffic * inputs.conversionRate);
    
    // Repeat orders from existing customers
    const repeatOrders = Math.round(repeatCustomerBase * inputs.repeatRate);
    
    // Total orders
    const totalOrders = newOrders + repeatOrders;
    
    // Revenue
    const grossRevenue = totalOrders * inputs.averageOrderValue;
    const returns = grossRevenue * inputs.returnRate;
    const netRevenue = grossRevenue - returns;
    
    // Costs
    const fulfillmentCost = totalOrders * inputs.fulfillmentCostPerOrder;
    const contribution = netRevenue - fulfillmentCost;
    
    projections.push({
      month,
      traffic: currentTraffic,
      orders: totalOrders,
      grossRevenue,
      returns,
      netRevenue,
      fulfillmentCost,
      contribution,
    });
    
    // Update for next month
    currentTraffic *= (1 + inputs.trafficGrowthRate);
    repeatCustomerBase += newOrders * 0.3; // 30% become potential repeat customers
  }
  
  return projections;
};

// =====================================================
// CONSULTING PROJECTIONS
// =====================================================

interface ConsultingProjectionInputs {
  billableHeadcount: number;
  utilization: number;
  blendedRate: number;
  projectMargin: number;
  headcountGrowthRate: number;
  billableHoursPerMonth: number;
}

/**
 * Project consulting revenue for 12 months
 */
export const projectConsultingRevenue = (
  inputs: ConsultingProjectionInputs,
  months: number = 12
): {
  month: number;
  headcount: number;
  billableHours: number;
  revenue: number;
  directCosts: number;
  grossProfit: number;
  margin: number;
}[] => {
  const projections: ReturnType<typeof projectConsultingRevenue> = [];
  let currentHeadcount = inputs.billableHeadcount;
  
  for (let month = 1; month <= months; month++) {
    const billableHours = currentHeadcount * inputs.billableHoursPerMonth * inputs.utilization;
    const revenue = billableHours * inputs.blendedRate;
    const directCosts = revenue * (1 - inputs.projectMargin);
    const grossProfit = revenue - directCosts;
    
    projections.push({
      month,
      headcount: Math.round(currentHeadcount * 10) / 10,
      billableHours: Math.round(billableHours),
      revenue,
      directCosts,
      grossProfit,
      margin: inputs.projectMargin,
    });
    
    // Headcount growth (apply every 3 months for realism)
    if (month % 3 === 0) {
      currentHeadcount *= (1 + inputs.headcountGrowthRate);
    }
  }
  
  return projections;
};

// =====================================================
// DRIVER TO LINE ITEM DISTRIBUTION
// =====================================================

/**
 * Distribute driver-based total to existing line items
 * Maintains existing category proportions
 */
export const distributeToLineItems = (
  driverTotal: number,
  existingItems: ProjectionItem[],
  baseField: 'baseAmount' | 'projectedAmount' = 'baseAmount'
): ProjectionItem[] => {
  const existingTotal = existingItems.reduce((sum, item) => sum + item[baseField], 0);
  
  if (existingTotal <= 0) {
    // No existing distribution, create single item
    return [{
      id: 'driver-generated',
      category: 'Driver-Based Revenue',
      baseAmount: baseField === 'baseAmount' ? driverTotal : 0,
      projectedAmount: baseField === 'projectedAmount' ? driverTotal : 0,
      description: 'Generated from unit economics drivers',
      isNew: false,
    }];
  }
  
  // Distribute proportionally
  return existingItems.map(item => ({
    ...item,
    projectedAmount: baseField === 'projectedAmount'
      ? driverTotal * (item[baseField] / existingTotal)
      : item.projectedAmount,
    baseAmount: baseField === 'baseAmount'
      ? driverTotal * (item[baseField] / existingTotal)
      : item.baseAmount,
  }));
};

/**
 * Convert monthly projections to quarterly amounts
 */
export const monthlyToQuarterly = (monthlyValues: number[]): QuarterlyAmounts => {
  const q1 = (monthlyValues[0] ?? 0) + (monthlyValues[1] ?? 0) + (monthlyValues[2] ?? 0);
  const q2 = (monthlyValues[3] ?? 0) + (monthlyValues[4] ?? 0) + (monthlyValues[5] ?? 0);
  const q3 = (monthlyValues[6] ?? 0) + (monthlyValues[7] ?? 0) + (monthlyValues[8] ?? 0);
  const q4 = (monthlyValues[9] ?? 0) + (monthlyValues[10] ?? 0) + (monthlyValues[11] ?? 0);
  
  return { q1, q2, q3, q4 };
};

// =====================================================
// UNIFIED PROJECTION FROM DRIVERS
// =====================================================

/**
 * Project revenue from unit economics drivers based on business model
 */
export const projectRevenueFromDrivers = (
  businessModel: BusinessModelType,
  drivers: UnitEconomicsInputV2,
  months: number = 12
): {
  monthlyRevenue: number[];
  annualRevenue: number;
  quarterly: QuarterlyAmounts;
  keyMetrics: Record<string, number>;
} => {
  let monthlyRevenue: number[] = [];
  let keyMetrics: Record<string, number> = {};
  
  switch (businessModel) {
    case 'B2B_SaaS':
    case 'B2C_SaaS': {
      const mrr = drivers.mrr ?? (drivers.arr ? drivers.arr / 12 : 0);
      const arpa = drivers.arpa ?? 100;
      const grossMargin = drivers.gross_margin ?? 0.75;
      const logoChurn = drivers.logo_churn ?? 0.03;
      const nrr = drivers.nrr ?? 1.0;
      const cac = drivers.cac ?? 500;
      
      // Estimate monthly growth from LTV/CAC dynamics
      const ltv = calculateLTVFromDrivers(arpa, grossMargin, logoChurn);
      const ltvCacRatio = calculateLTVCACRatio(ltv, cac);
      const monthlyGrowthRate = Math.min(0.15, ltvCacRatio > 3 ? 0.08 : 0.04);
      
      const projections = projectSaaSRevenue({
        currentMRR: mrr,
        monthlyGrowthRate,
        grossMargin,
        logoChurn,
        nrr,
        cac,
        arpa,
      }, months);
      
      monthlyRevenue = projections.map(p => p.mrr);
      keyMetrics = {
        ltv,
        cac,
        ltvCacRatio,
        paybackMonths: calculateCACPayback(cac, arpa, grossMargin),
        endingMRR: projections[projections.length - 1]?.mrr ?? 0,
        endingARR: (projections[projections.length - 1]?.mrr ?? 0) * 12,
      };
      break;
    }
    
    case 'ECOM': {
      const traffic = drivers.traffic ?? 10000;
      const conversion = drivers.conversion ?? 0.02;
      const aov = drivers.aov ?? 50;
      const repeatRate = drivers.repeat_rate ?? 0.2;
      const returnRate = drivers.return_rate ?? 0.05;
      const fulfillmentCost = drivers.fulfillment_cost ?? 5;
      
      const projections = projectEcomRevenue({
        monthlyTraffic: traffic,
        conversionRate: conversion,
        averageOrderValue: aov,
        repeatRate,
        returnRate,
        fulfillmentCostPerOrder: fulfillmentCost,
        trafficGrowthRate: 0.05,
      }, months);
      
      monthlyRevenue = projections.map(p => p.netRevenue);
      keyMetrics = {
        avgOrders: projections.reduce((sum, p) => sum + p.orders, 0) / months,
        avgRevenue: projections.reduce((sum, p) => sum + p.netRevenue, 0) / months,
        avgContribution: projections.reduce((sum, p) => sum + p.contribution, 0) / months,
      };
      break;
    }
    
    case 'CONSULTING': {
      const headcount = drivers.billable_hc ?? 5;
      const utilization = drivers.utilization ?? 0.75;
      const blendedRate = drivers.blended_rate ?? 150;
      const projectMargin = drivers.project_margin ?? 0.40;
      
      const projections = projectConsultingRevenue({
        billableHeadcount: headcount,
        utilization,
        blendedRate,
        projectMargin,
        headcountGrowthRate: 0.10,
        billableHoursPerMonth: 160,
      }, months);
      
      monthlyRevenue = projections.map(p => p.revenue);
      keyMetrics = {
        avgHeadcount: projections.reduce((sum, p) => sum + p.headcount, 0) / months,
        avgUtilization: utilization,
        avgMargin: projectMargin,
      };
      break;
    }
    
    default:
      // Generic fallback
      monthlyRevenue = Array(months).fill(0);
  }
  
  const annualRevenue = monthlyRevenue.reduce((sum, m) => sum + m, 0);
  const quarterly = monthlyToQuarterly(monthlyRevenue);
  
  return {
    monthlyRevenue,
    annualRevenue,
    quarterly,
    keyMetrics,
  };
};

// =====================================================
// CALCULATION TRACE
// =====================================================

/**
 * Generate calculation trace for unit economics
 */
export const generateUnitEconomicsCalcTrace = (
  metric: 'ltv' | 'cac_payback' | 'nrr' | 'magic_number',
  inputs: Record<string, number>,
  result: number
): string => {
  switch (metric) {
    case 'ltv':
      return `LTV = ($${inputs.arpa} × ${(inputs.grossMargin * 100).toFixed(0)}%) / ${(inputs.churn * 100).toFixed(1)}% = $${result.toFixed(0)}`;
    
    case 'cac_payback':
      return `CAC Payback = $${inputs.cac} / ($${inputs.arpa} × ${(inputs.grossMargin * 100).toFixed(0)}%) = ${result.toFixed(1)} months`;
    
    case 'nrr':
      return `NRR = ($${inputs.starting} + $${inputs.expansion} - $${inputs.contraction} - $${inputs.churned}) / $${inputs.starting} = ${(result * 100).toFixed(0)}%`;
    
    case 'magic_number':
      return `Magic Number = $${inputs.netNewARR} / $${inputs.smSpend} = ${result.toFixed(2)}`;
    
    default:
      return 'Unit Economics Calculation';
  }
};
