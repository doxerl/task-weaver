import { useState, useCallback } from 'react';
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

export function useScenarioAIAnalysis() {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      return transformedData;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'AI analizi başarısız';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    analysis,
    isLoading,
    error,
    analyzeScenarios,
    clearAnalysis
  };
}
