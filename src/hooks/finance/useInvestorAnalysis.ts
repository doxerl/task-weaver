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

  const updateDealConfig = useCallback((updates: Partial<DealConfiguration>) => {
    setDealConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Load cached investor analysis from database
  const loadCachedInvestorAnalysis = useCallback(async (
    scenarioAId: string,
    scenarioBId: string
  ): Promise<boolean> => {
    setIsCacheLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsCacheLoading(false);
        return false;
      }

      const { data, error: fetchError } = await supabase
        .from('scenario_ai_analyses')
        .select('id, investor_analysis, deal_config, updated_at')
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

  // Save investor analysis to database
  const saveInvestorAnalysis = useCallback(async (
    result: AIInvestorAnalysis,
    config: DealConfiguration,
    scenarioAId: string,
    scenarioBId: string
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: upsertError } = await supabase
        .from('scenario_ai_analyses')
        .upsert([{
          user_id: user.id,
          scenario_a_id: scenarioAId,
          scenario_b_id: scenarioBId,
          analysis_type: 'investor_pitch',
          investor_analysis: result as any,
          deal_config: config as any,
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
      }
    } catch (e) {
      console.error('Error saving investor analysis:', e);
    }
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

      // Save to database
      if (scenarioA.id && scenarioB.id) {
        await saveInvestorAnalysis(analysis, dealConfig, scenarioA.id, scenarioB.id);
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

  const clearAnalysis = useCallback(() => {
    setInvestorAnalysis(null);
    setError(null);
    setCachedInfo(null);
  }, []);

  return {
    dealConfig,
    updateDealConfig,
    investorAnalysis,
    isLoading,
    isCacheLoading,
    error,
    cachedInfo,
    analyzeForInvestors,
    loadCachedInvestorAnalysis,
    clearAnalysis,
    calculateCapitalNeeds,
    calculateExitPlan,
    projectFutureRevenue,
  };
}
