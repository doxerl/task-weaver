import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  SimulationScenario, 
  DealConfiguration, 
  CapitalRequirement, 
  ExitPlan,
  UnifiedAnalysisResult,
  AnalysisHistoryItem,
  QuarterlyAmounts,
  YearlyBalanceSheet,
  QuarterlyItemizedData
} from '@/types/simulation';
import { generateScenarioHash } from '@/lib/scenarioHash';
import { useAuth } from '@/hooks/useAuth';

interface ScenarioSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

interface CachedAnalysisInfo {
  id: string;
  updatedAt: Date;
}

export function useUnifiedAnalysis() {
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<UnifiedAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCacheLoading, setIsCacheLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedInfo, setCachedInfo] = useState<CachedAnalysisInfo | null>(null);
  const [dataChanged, setDataChanged] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Load cached analysis from database
  const loadCachedAnalysis = useCallback(async (scenarioAId: string, scenarioBId: string): Promise<boolean> => {
    if (!user?.id) return false;
    setIsCacheLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('scenario_ai_analyses')
        .select('*')
        .eq('user_id', user.id)
        .eq('scenario_a_id', scenarioAId)
        .eq('scenario_b_id', scenarioBId)
        .eq('analysis_type', 'unified')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('Error loading cached unified analysis:', fetchError);
        return false;
      }

      if (data) {
        const result: UnifiedAnalysisResult = {
          insights: (data.insights as any) || [],
          recommendations: (data.recommendations as any) || [],
          quarterly_analysis: (data.quarterly_analysis as any) || { overview: '', critical_periods: [], seasonal_trends: [], growth_trajectory: '' },
          deal_analysis: {
            deal_score: data.deal_score || 0,
            valuation_verdict: (data.valuation_verdict as 'premium' | 'fair' | 'cheap') || 'fair',
            investor_attractiveness: '',
            risk_factors: []
          },
          pitch_deck: (data.pitch_deck as any) || { slides: [], executive_summary: '' },
          next_year_projection: (data.next_year_projection as any) || null
        };
        
        setAnalysis(result);
        setCachedInfo({
          id: data.id,
          updatedAt: new Date(data.updated_at || data.created_at || new Date())
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error loading cached unified analysis:', err);
      return false;
    } finally {
      setIsCacheLoading(false);
    }
  }, [user?.id]);

  // Check if data has changed since last analysis
  const checkDataChanges = useCallback((scenarioA: SimulationScenario, scenarioB: SimulationScenario): boolean => {
    if (!cachedInfo) return false;
    // Simple check - in production, compare hashes
    return false; // Assume no change for now
  }, [cachedInfo]);

  // Load analysis history
  const loadAnalysisHistory = useCallback(async (scenarioAId: string, scenarioBId: string): Promise<void> => {
    if (!user?.id) return;
    setIsHistoryLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('scenario_analysis_history')
        .select('*')
        .eq('user_id', user.id)
        .eq('scenario_a_id', scenarioAId)
        .eq('scenario_b_id', scenarioBId)
        .eq('analysis_type', 'unified')
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) {
        console.error('Error loading unified analysis history:', fetchError);
        return;
      }

      if (data) {
        const history: AnalysisHistoryItem[] = data.map(item => {
          const itemAny = item as any;
          return {
            id: item.id,
            createdAt: new Date(item.created_at || new Date()),
            analysisType: 'unified' as const,
            insights: (item.insights as any) || [],
            recommendations: (item.recommendations as any) || [],
            quarterlyAnalysis: (item.quarterly_analysis as any),
            dealAnalysis: itemAny.deal_score ? {
              deal_score: itemAny.deal_score as number,
              valuation_verdict: (itemAny.valuation_verdict as 'premium' | 'fair' | 'cheap') || 'fair',
              investor_attractiveness: '',
              risk_factors: []
            } : undefined,
            pitchDeck: itemAny.pitch_deck,
            nextYearProjection: itemAny.next_year_projection,
            dealConfig: (item.deal_config as any)
          };
        });
        setAnalysisHistory(history);
      }
    } catch (err) {
      console.error('Error loading unified analysis history:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [user?.id]);

  // Save to history
  const saveToHistory = useCallback(async (
    result: UnifiedAnalysisResult,
    scenarioA: SimulationScenario,
    scenarioB: SimulationScenario,
    dealConfig: DealConfiguration
  ): Promise<void> => {
    if (!user?.id || !scenarioA.id || !scenarioB.id) return;

    try {
      await supabase.from('scenario_analysis_history').insert({
        user_id: user.id,
        scenario_a_id: scenarioA.id,
        scenario_b_id: scenarioB.id,
        analysis_type: 'unified',
        insights: result.insights as any,
        recommendations: result.recommendations as any,
        quarterly_analysis: result.quarterly_analysis as any,
        deal_score: result.deal_analysis.deal_score,
        valuation_verdict: result.deal_analysis.valuation_verdict,
        pitch_deck: result.pitch_deck as any,
        next_year_projection: result.next_year_projection as any,
        deal_config: dealConfig as any,
        scenario_a_data_hash: generateScenarioHash(scenarioA),
        scenario_b_data_hash: generateScenarioHash(scenarioB)
      });
    } catch (err) {
      console.error('Error saving to unified analysis history:', err);
    }
  }, [user?.id]);

  // Save analysis to database
  const saveAnalysis = useCallback(async (
    result: UnifiedAnalysisResult,
    scenarioA: SimulationScenario,
    scenarioB: SimulationScenario,
    dealConfig: DealConfiguration
  ): Promise<void> => {
    if (!user?.id || !scenarioA.id || !scenarioB.id) return;

    try {
      const { data, error: upsertError } = await supabase
        .from('scenario_ai_analyses')
        .upsert({
          user_id: user.id,
          scenario_a_id: scenarioA.id,
          scenario_b_id: scenarioB.id,
          analysis_type: 'unified',
          insights: result.insights as any,
          recommendations: result.recommendations as any,
          quarterly_analysis: result.quarterly_analysis as any,
          deal_score: result.deal_analysis.deal_score,
          valuation_verdict: result.deal_analysis.valuation_verdict,
          pitch_deck: result.pitch_deck as any,
          next_year_projection: result.next_year_projection as any,
          deal_config_snapshot: dealConfig as any,
          scenario_a_data_hash: generateScenarioHash(scenarioA),
          scenario_b_data_hash: generateScenarioHash(scenarioB),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,scenario_a_id,scenario_b_id,analysis_type'
        })
        .select()
        .single();

      if (upsertError) {
        console.error('Error saving unified analysis:', upsertError);
      } else if (data) {
        setCachedInfo({
          id: data.id,
          updatedAt: new Date()
        });
        setDataChanged(false);
        // Also save to history
        await saveToHistory(result, scenarioA, scenarioB, dealConfig);
      }
    } catch (err) {
      console.error('Error saving unified analysis:', err);
    }
  }, [user?.id, saveToHistory]);

  // Fetch historical balance sheet from database
  const fetchHistoricalBalance = useCallback(async (targetYear: number): Promise<YearlyBalanceSheet | null> => {
    if (!user?.id) return null;
    
    const previousYear = targetYear - 1;
    
    const { data, error } = await supabase
      .from('yearly_balance_sheets')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', previousYear)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching historical balance:', error);
      return null;
    }
    
    // Map DB result to YearlyBalanceSheet type
    if (data) {
      const balance: YearlyBalanceSheet = {
        id: data.id,
        user_id: data.user_id,
        year: data.year,
        cash_on_hand: data.cash_on_hand,
        bank_balance: data.bank_balance,
        trade_receivables: data.trade_receivables,
        trade_payables: data.trade_payables,
        total_assets: data.total_assets,
        total_liabilities: data.total_liabilities,
        current_profit: data.current_profit,
        retained_earnings: data.retained_earnings,
        paid_capital: data.paid_capital,
        bank_loans: data.bank_loans,
        is_locked: data.is_locked
      };
      return balance;
    }
    
    return null;
  }, [user?.id]);

  // Main analysis function
  const runUnifiedAnalysis = useCallback(async (
    scenarioA: SimulationScenario,
    scenarioB: SimulationScenario,
    summaryA: ScenarioSummary,
    summaryB: ScenarioSummary,
    quarterlyA: QuarterlyAmounts,
    quarterlyB: QuarterlyAmounts,
    dealConfig: DealConfiguration,
    exitPlan: ExitPlan,
    capitalNeeds: CapitalRequirement,
    historicalBalance: YearlyBalanceSheet | null,
    quarterlyItemized: QuarterlyItemizedData | null
  ): Promise<UnifiedAnalysisResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('unified-scenario-analysis', {
        body: {
          scenarioA,
          scenarioB,
          metrics: {
            scenarioA: summaryA,
            scenarioB: summaryB
          },
          quarterly: {
            a: quarterlyA,
            b: quarterlyB
          },
          dealConfig,
          exitPlan,
          capitalNeeds,
          historicalBalance,
          quarterlyItemized
        }
      });

      if (invokeError) {
        throw invokeError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const result = data as UnifiedAnalysisResult;
      setAnalysis(result);
      
      // Save to database
      await saveAnalysis(result, scenarioA, scenarioB, dealConfig);
      
      toast.success('Kapsamlı AI analizi tamamlandı!');
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analiz sırasında bir hata oluştu';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [saveAnalysis]);

  // Restore historical analysis
  const restoreHistoricalAnalysis = useCallback((historyItem: AnalysisHistoryItem): void => {
    if (historyItem.insights && historyItem.recommendations && historyItem.quarterlyAnalysis) {
      setAnalysis({
        insights: historyItem.insights,
        recommendations: historyItem.recommendations,
        quarterly_analysis: historyItem.quarterlyAnalysis,
        deal_analysis: historyItem.dealAnalysis || {
          deal_score: 0,
          valuation_verdict: 'fair',
          investor_attractiveness: '',
          risk_factors: []
        },
        pitch_deck: historyItem.pitchDeck || { slides: [], executive_summary: '' },
        next_year_projection: historyItem.nextYearProjection || {
          strategy_note: '',
          quarterly: {
            q1: { revenue: 0, expenses: 0, cash_flow: 0, key_event: '' },
            q2: { revenue: 0, expenses: 0, cash_flow: 0, key_event: '' },
            q3: { revenue: 0, expenses: 0, cash_flow: 0, key_event: '' },
            q4: { revenue: 0, expenses: 0, cash_flow: 0, key_event: '' }
          },
          summary: { total_revenue: 0, total_expenses: 0, net_profit: 0, ending_cash: 0 }
        }
      });
      setCachedInfo({
        id: historyItem.id,
        updatedAt: historyItem.createdAt
      });
      toast.success('Geçmiş analiz geri yüklendi');
    }
  }, []);

  // Clear analysis
  const clearAnalysis = useCallback((): void => {
    setAnalysis(null);
    setCachedInfo(null);
    setDataChanged(false);
    setError(null);
    setAnalysisHistory([]);
  }, []);

  return {
    analysis,
    isLoading,
    isCacheLoading,
    error,
    cachedInfo,
    dataChanged,
    analysisHistory,
    isHistoryLoading,
    runUnifiedAnalysis,
    fetchHistoricalBalance,
    loadCachedAnalysis,
    loadAnalysisHistory,
    checkDataChanges,
    restoreHistoricalAnalysis,
    clearAnalysis
  };
}
