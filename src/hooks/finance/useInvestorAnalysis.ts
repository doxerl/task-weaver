import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  SimulationScenario, 
  DealConfiguration, 
  CapitalRequirement, 
  MultiYearProjection,
  ExitPlan,
  AIInvestorAnalysis,
  DEFAULT_DEAL_CONFIG
} from '@/types/simulation';
import { toast } from 'sonner';

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
export const calculateCapitalNeeds = (quarterlyData: QuarterlyData): CapitalRequirement => {
  const flows = [quarterlyData.q1, quarterlyData.q2, quarterlyData.q3, quarterlyData.q4];
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

  const totalFlow = flows.reduce((a, b) => a + b, 0);
  const monthlyBurn = totalFlow < 0 ? Math.abs(totalFlow) / 12 : 0;
  
  return {
    minCumulativeCash: minBalance,
    criticalQuarter: criticalQuarter || 'N/A',
    requiredInvestment: minBalance < 0 ? Math.abs(minBalance) * 1.2 : 0, // +20% safety
    burnRateMonthly: monthlyBurn,
    runwayMonths: monthlyBurn > 0 ? Math.ceil(Math.abs(minBalance) / monthlyBurn) : 999,
    selfSustaining: minBalance >= 0
  };
};

// Project 3-5 year financials with decaying growth rate
export const projectFutureRevenue = (
  year1Revenue: number, 
  year1Expenses: number,
  growthRate: number, 
  sectorMultiple: number
): { year3: MultiYearProjection; year5: MultiYearProjection; allYears: MultiYearProjection[] } => {
  const years: MultiYearProjection[] = [];
  let revenue = year1Revenue;
  let expenses = year1Expenses;
  let cumulativeProfit = 0;
  
  for (let i = 1; i <= 5; i++) {
    const decayFactor = Math.max(0.4, 1 - (i * 0.1)); // Büyüme yıldan yıla yavaşlar, min %40
    revenue = revenue * (1 + growthRate * decayFactor);
    expenses = expenses * (1 + (growthRate * 0.5) * decayFactor); // Giderler daha yavaş büyür
    const netProfit = revenue - expenses;
    cumulativeProfit += netProfit;
    
    years.push({
      year: i,
      revenue,
      expenses,
      netProfit,
      cumulativeProfit,
      companyValuation: revenue * sectorMultiple
    });
  }
  
  return { 
    year3: years[2], 
    year5: years[4],
    allYears: years
  };
};

// Calculate Exit Plan for investors
export const calculateExitPlan = (
  deal: DealConfiguration,
  year1Revenue: number,
  year1Expenses: number,
  growthRate: number
): ExitPlan => {
  const postMoney = deal.investmentAmount / (deal.equityPercentage / 100);
  const projections = projectFutureRevenue(year1Revenue, year1Expenses, growthRate, deal.sectorMultiple);
  
  const investorShare3 = projections.year3.companyValuation * (deal.equityPercentage / 100);
  const investorShare5 = projections.year5.companyValuation * (deal.equityPercentage / 100);
  
  // Find break-even year
  let breakEvenYear: number | null = null;
  for (const year of projections.allYears) {
    if (year.cumulativeProfit >= 0 && breakEvenYear === null) {
      breakEvenYear = year.year;
    }
  }
  
  return {
    postMoneyValuation: postMoney,
    year3Projection: projections.year3,
    year5Projection: projections.year5,
    investorShare3Year: investorShare3,
    investorShare5Year: investorShare5,
    moic3Year: investorShare3 / deal.investmentAmount,
    moic5Year: investorShare5 / deal.investmentAmount,
    breakEvenYear,
    potentialAcquirers: [], // AI tarafından doldurulacak
    exitStrategy: 'unknown'
  };
};

export function useInvestorAnalysis() {
  const [dealConfig, setDealConfig] = useState<DealConfiguration>(DEFAULT_DEAL_CONFIG);
  const [investorAnalysis, setInvestorAnalysis] = useState<AIInvestorAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateDealConfig = useCallback((updates: Partial<DealConfiguration>) => {
    setDealConfig(prev => ({ ...prev, ...updates }));
  }, []);

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
      return analysis;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Yatırımcı analizi başarısız';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [dealConfig]);

  const clearAnalysis = useCallback(() => {
    setInvestorAnalysis(null);
    setError(null);
  }, []);

  return {
    dealConfig,
    updateDealConfig,
    investorAnalysis,
    isLoading,
    error,
    analyzeForInvestors,
    clearAnalysis,
    calculateCapitalNeeds,
    calculateExitPlan,
    projectFutureRevenue,
  };
}
