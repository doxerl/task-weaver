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
  SECTOR_NORMALIZED_GROWTH
} from '@/types/simulation';
import { toast } from 'sonner';
import { generateScenarioHash, checkDataChanged } from '@/lib/scenarioHash';
import { getProjectionYears } from '@/utils/yearCalculations';

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

// İki Aşamalı Büyüme Modeli ile 3-5 yıllık finansal projeksiyon
export const projectFutureRevenue = (
  year1Revenue: number, 
  year1Expenses: number,
  growthConfig: GrowthConfiguration, 
  sectorMultiple: number
): { year3: MultiYearProjection; year5: MultiYearProjection; allYears: MultiYearProjection[] } => {
  const { year1: scenarioYear } = getProjectionYears();
  const years: MultiYearProjection[] = [];
  let revenue = year1Revenue;
  let expenses = year1Expenses;
  let cumulativeProfit = 0;
  
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
    
    years.push({
      year: i,
      actualYear: scenarioYear + i,  // 2027, 2028, 2029, 2030, 2031
      revenue,
      expenses,
      netProfit,
      cumulativeProfit,
      companyValuation: revenue * sectorMultiple,
      appliedGrowthRate: effectiveGrowthRate,
      growthStage
    });
  }
  
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
  sector: string = 'default'
): ExitPlan => {
  const { year1, year3, year5 } = getProjectionYears();
  
  // İki aşamalı konfigürasyon oluştur
  const growthConfig: GrowthConfiguration = {
    aggressiveGrowthRate: Math.min(Math.max(userGrowthRate, 0.10), 1.0), // Min %10, Max %100
    normalizedGrowthRate: SECTOR_NORMALIZED_GROWTH[sector] || SECTOR_NORMALIZED_GROWTH['default'],
    transitionYear: 2,
    rawUserGrowthRate: userGrowthRate
  };
  
  const postMoney = deal.investmentAmount / (deal.equityPercentage / 100);
  const projections = projectFutureRevenue(year1Revenue, year1Expenses, growthConfig, deal.sectorMultiple);
  
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
