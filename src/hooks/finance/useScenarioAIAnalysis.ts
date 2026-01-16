import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SimulationScenario, AIAnalysisResult } from '@/types/simulation';
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

  // Load cached analysis from database
  const loadCachedAnalysis = useCallback(async (
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
        .select('id, insights, recommendations, quarterly_analysis, updated_at')
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

  // Save analysis to database
  const saveAnalysis = useCallback(async (
    result: AIAnalysisResult,
    scenarioAId: string,
    scenarioBId: string
  ): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: upsertError } = await supabase
        .from('scenario_ai_analyses')
        .upsert({
          user_id: user.id,
          scenario_a_id: scenarioAId,
          scenario_b_id: scenarioBId,
          analysis_type: 'scenario_comparison',
          insights: result.insights as any,
          recommendations: result.recommendations as any,
          quarterly_analysis: result.quarterly_analysis as any,
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
      }
    } catch (e) {
      console.error('Error saving analysis:', e);
    }
  }, []);

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

      // Save to database
      if (scenarioA.id && scenarioB.id) {
        await saveAnalysis(transformedData, scenarioA.id, scenarioB.id);
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

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
    setCachedInfo(null);
  }, []);

  return {
    analysis,
    isLoading,
    isCacheLoading,
    error,
    cachedInfo,
    analyzeScenarios,
    loadCachedAnalysis,
    clearAnalysis
  };
}
