import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SimulationScenario, AIAnalysisResult, AnalysisHistoryItem } from '@/types/simulation';
import { toast } from 'sonner';
import { generateScenarioHash, checkDataChanged } from '@/lib/scenarioHash';

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

interface CachedAnalysis {
  id: string;
  analysis: AIAnalysisResult;
  updatedAt: Date;
}

export function useScenarioAIAnalysis() {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedInfo, setCachedInfo] = useState<{ id: string; updatedAt: Date } | null>(null);
  const [isCacheLoading, setIsCacheLoading] = useState(false);
  
  // New states for data change detection and history
  const [dataChanged, setDataChanged] = useState(false);
  const [savedHashes, setSavedHashes] = useState<{ hashA: string | null; hashB: string | null }>({ hashA: null, hashB: null });
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Load cached analysis from database
  const loadCachedAnalysis = useCallback(async (
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
        .select('id, insights, recommendations, quarterly_analysis, updated_at, scenario_a_data_hash, scenario_b_data_hash')
        .eq('user_id', user.id)
        .eq('scenario_a_id', scenarioAId)
        .eq('scenario_b_id', scenarioBId)
        .eq('analysis_type', 'scenario_comparison')
        .maybeSingle();

      if (fetchError) {
        console.error('Error loading cached analysis:', fetchError);
        setIsCacheLoading(false);
        return false;
      }

      if (data && data.insights && data.recommendations && data.quarterly_analysis) {
        const cachedAnalysis: AIAnalysisResult = {
          insights: data.insights as unknown as AIAnalysisResult['insights'],
          recommendations: data.recommendations as unknown as AIAnalysisResult['recommendations'],
          quarterly_analysis: data.quarterly_analysis as unknown as AIAnalysisResult['quarterly_analysis'],
        };
        setAnalysis(cachedAnalysis);
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
      console.error('Error loading cached analysis:', e);
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
        .eq('analysis_type', 'scenario_comparison')
        .order('created_at', { ascending: false })
        .limit(5);

      if (fetchError) {
        console.error('Error loading analysis history:', fetchError);
        setIsHistoryLoading(false);
        return;
      }

      const historyItems: AnalysisHistoryItem[] = (data || []).map(item => ({
        id: item.id,
        createdAt: new Date(item.created_at),
        analysisType: item.analysis_type as 'scenario_comparison' | 'investor_pitch',
        insights: item.insights as unknown as AnalysisHistoryItem['insights'],
        recommendations: item.recommendations as unknown as AnalysisHistoryItem['recommendations'],
        quarterlyAnalysis: item.quarterly_analysis as unknown as AnalysisHistoryItem['quarterlyAnalysis'],
        scenarioADataHash: item.scenario_a_data_hash || undefined,
        scenarioBDataHash: item.scenario_b_data_hash || undefined,
      }));

      setAnalysisHistory(historyItems);
    } catch (e) {
      console.error('Error loading analysis history:', e);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  // Save to history
  const saveToHistory = useCallback(async (
    result: AIAnalysisResult,
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
        analysis_type: 'scenario_comparison',
        insights: result.insights as any,
        recommendations: result.recommendations as any,
        quarterly_analysis: result.quarterly_analysis as any,
        scenario_a_data_hash: hashA,
        scenario_b_data_hash: hashB,
      });

      // Refresh history
      await loadAnalysisHistory(scenarioA.id, scenarioB.id);
    } catch (e) {
      console.error('Error saving to history:', e);
    }
  }, [loadAnalysisHistory]);

  // Save analysis to database (main cache)
  const saveAnalysis = useCallback(async (
    result: AIAnalysisResult,
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
        .upsert({
          user_id: user.id,
          scenario_a_id: scenarioA.id,
          scenario_b_id: scenarioB.id,
          analysis_type: 'scenario_comparison',
          insights: result.insights as any,
          recommendations: result.recommendations as any,
          quarterly_analysis: result.quarterly_analysis as any,
          scenario_a_data_hash: hashA,
          scenario_b_data_hash: hashB,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,scenario_a_id,scenario_b_id,analysis_type'
        })
        .select('id, updated_at')
        .single();

      if (upsertError) {
        console.error('Error saving analysis:', upsertError);
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
      await saveToHistory(result, scenarioA, scenarioB);
    } catch (e) {
      console.error('Error saving analysis:', e);
    }
  }, [saveToHistory]);

  const analyzeScenarios = useCallback(async (
    scenarioA: SimulationScenario,
    scenarioB: SimulationScenario,
    summaryA: ScenarioSummary,
    summaryB: ScenarioSummary,
    quarterlyA: QuarterlyData,
    quarterlyB: QuarterlyData
  ): Promise<AIAnalysisResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-scenarios', {
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
            differences: {
              revenue: summaryB.totalRevenue - summaryA.totalRevenue,
              revenuePercent: summaryA.totalRevenue !== 0 
                ? ((summaryB.totalRevenue - summaryA.totalRevenue) / summaryA.totalRevenue * 100).toFixed(1)
                : '0',
              expenses: summaryB.totalExpenses - summaryA.totalExpenses,
              expensesPercent: summaryA.totalExpenses !== 0
                ? ((summaryB.totalExpenses - summaryA.totalExpenses) / summaryA.totalExpenses * 100).toFixed(1)
                : '0',
              profit: summaryB.netProfit - summaryA.netProfit,
              profitPercent: summaryA.netProfit !== 0 
                ? ((summaryB.netProfit - summaryA.netProfit) / Math.abs(summaryA.netProfit) * 100).toFixed(1) 
                : 'N/A'
            }
          },
          quarterly: { 
            scenarioA: quarterlyA, 
            scenarioB: quarterlyB 
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

      // Validate response structure
      if (!data?.insights || !data?.recommendations || !data?.quarterly_analysis) {
        throw new Error('Geçersiz AI yanıtı');
      }

      // Transform the renamed properties from API back to type-compatible names
      const transformedData: AIAnalysisResult = {
        insights: data.insights,
        recommendations: data.recommendations.map((rec: any) => ({
          priority: rec.priority,
          title: rec.recommendation_title || rec.title,
          description: rec.recommendation_description || rec.description,
          action_plan: rec.action_steps || rec.action_plan || [],
          expected_outcome: rec.expected_result || rec.expected_outcome,
          risk_mitigation: rec.risk_notes || rec.risk_mitigation,
          timeframe: rec.time_estimate || rec.timeframe
        })),
        quarterly_analysis: data.quarterly_analysis
      };

      setAnalysis(transformedData);
      toast.success('AI analizi tamamlandı');

      // Save to database with hashes
      if (scenarioA.id && scenarioB.id) {
        await saveAnalysis(transformedData, scenarioA, scenarioB);
      }

      return transformedData;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'AI analizi başarısız';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [saveAnalysis]);

  // Restore a historical analysis
  const restoreHistoricalAnalysis = useCallback((historyItem: AnalysisHistoryItem) => {
    if (historyItem.insights && historyItem.recommendations && historyItem.quarterlyAnalysis) {
      const restoredAnalysis: AIAnalysisResult = {
        insights: historyItem.insights,
        recommendations: historyItem.recommendations,
        quarterly_analysis: historyItem.quarterlyAnalysis
      };
      setAnalysis(restoredAnalysis);
      setCachedInfo({
        id: historyItem.id,
        updatedAt: historyItem.createdAt
      });
      toast.success('Geçmiş analiz geri yüklendi');
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
    setCachedInfo(null);
    setDataChanged(false);
    setSavedHashes({ hashA: null, hashB: null });
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
    analyzeScenarios,
    loadCachedAnalysis,
    loadAnalysisHistory,
    checkDataChanges,
    restoreHistoricalAnalysis,
    clearAnalysis
  };
}
