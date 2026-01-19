import { useState, useCallback, useMemo } from 'react';
import { SimulationScenario } from '@/types/simulation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateScenarioHash } from '@/lib/scenarioHash';

export interface GrowthAnalysisResult {
  growthInsights: Array<{
    title: string;
    description: string;
    category: string;
    confidence: number;
  }>;
  projectRecommendations: Array<{
    title: string;
    description: string;
    expectedGrowth?: number;
  }>;
  roiInsights: Array<{
    title: string;
    description: string;
  }>;
  milestones: Array<{
    quarter: string;
    year: number;
    title: string;
    description: string;
    target?: string;
    type: 'revenue' | 'product' | 'team' | 'market';
  }>;
  milestoneRecommendations: Array<{
    title: string;
    description: string;
  }>;
}

interface CachedInfo {
  id: string;
  updatedAt: Date;
}

export function useGrowthAnalysis(
  baseScenario: SimulationScenario | null,
  growthScenario: SimulationScenario | null
) {
  const [analysis, setAnalysis] = useState<GrowthAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedInfo, setCachedInfo] = useState<CachedInfo | null>(null);
  const [cachedHash, setCachedHash] = useState<string | null>(null);
  
  // Mevcut veri hash'i
  const currentHash = useMemo(() => {
    if (!baseScenario || !growthScenario) return null;
    const baseHash = generateScenarioHash(baseScenario);
    const growthHash = generateScenarioHash(growthScenario);
    return `${baseHash}-${growthHash}`;
  }, [baseScenario, growthScenario]);
  
  // Veri değişti mi?
  const dataChanged = useMemo(() => {
    if (!cachedHash || !currentHash) return false;
    return cachedHash !== currentHash;
  }, [cachedHash, currentHash]);
  
  // Analizi çalıştır
  const runAnalysis = useCallback(async () => {
    if (!baseScenario || !growthScenario) {
      toast.error('İki senaryo seçilmelidir');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-growth-scenario', {
        body: {
          baseScenario,
          growthScenario,
        },
      });
      
      if (fnError) throw fnError;
      
      if (data?.analysis) {
        setAnalysis(data.analysis);
        setCachedInfo({
          id: data.analysisId || 'temp',
          updatedAt: new Date(),
        });
        setCachedHash(currentHash);
        toast.success('Büyüme analizi tamamlandı');
      }
    } catch (err) {
      console.error('Growth analysis error:', err);
      const message = err instanceof Error ? err.message : 'Analiz başarısız';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [baseScenario, growthScenario, currentHash]);
  
  return {
    analysis,
    isLoading,
    error,
    runAnalysis,
    cachedInfo,
    dataChanged,
  };
}
