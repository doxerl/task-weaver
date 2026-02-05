import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import i18n from '@/i18n';

// Utility for exponential backoff delays
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Retry configuration
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 2000, // 2s, 4s, 8s
  RETRYABLE_ERRORS: ['FunctionsFetchError', 'FunctionsHttpError', 'TypeError'] // Network/fetch errors
} as const;
import {
  SimulationScenario,
  DealConfiguration,
  CapitalRequirement,
  ExitPlan,
  UnifiedAnalysisResult,
  AnalysisHistoryItem,
  QuarterlyAmounts,
  YearlyBalanceSheet,
  QuarterlyItemizedData,
  FocusProjectInfo,
  InvestmentAllocation,
  EditableProjectionItem,
  AIScenarioInsight,
  AIRecommendation,
  QuarterlyAIAnalysis,
  PitchDeck,
  NextYearProjection,
  // Type guards
  isValidInsightArray,
  isValidRecommendationArray,
  isValidQuarterlyAnalysis,
  isValidPitchDeck,
  isValidNextYearProjection,
  isValidInvestmentAllocation,
  isValidEditableProjectionArray,
  safeArray
} from '@/types/simulation';
import { generateScenarioHash } from '@/lib/scenarioHash';
import { useAuthContext } from '@/contexts/AuthContext';

interface ScenarioSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

interface CachedAnalysisInfo {
  id: string;
  updatedAt: Date;
  // Focus project settings from cache
  focusProjects?: string[];
  focusProjectPlan?: string;
  investmentAllocation?: InvestmentAllocation;
  // Edited projections from cache
  editedRevenueProjection?: EditableProjectionItem[];
  editedExpenseProjection?: EditableProjectionItem[];
  projectionUserEdited?: boolean;
}

export function useUnifiedAnalysis() {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;
  const [analysis, setAnalysis] = useState<UnifiedAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCacheLoading, setIsCacheLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedInfo, setCachedInfo] = useState<CachedAnalysisInfo | null>(null);
  const [dataChanged, setDataChanged] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  // Hash'leri kaydet - veri değişikliği kontrolü için
  const [savedHashes, setSavedHashes] = useState<{ hashA: string | null; hashB: string | null }>({ hashA: null, hashB: null });

  // Load cached analysis from database
  const loadCachedAnalysis = useCallback(async (scenarioAId: string, scenarioBId: string): Promise<boolean> => {
    if (!userId) return false;
    setIsCacheLoading(true);

    try {
      // Backward compatibility: hem 'unified' hem de eski 'scenario_comparison' ve 'investor_pitch' tiplerini ara
      const { data, error: fetchError } = await supabase
        .from('scenario_ai_analyses')
        .select('*')
        .eq('user_id', userId)
        .eq('scenario_a_id', scenarioAId)
        .eq('scenario_b_id', scenarioBId)
        .in('analysis_type', ['unified', 'scenario_comparison', 'investor_pitch'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('Error loading cached unified analysis:', fetchError);
        return false;
      }

      if (data) {
        // Cache validation: Eksik unified analiz verisi kontrolü
        // Eski format (scenario_comparison, investor_pitch) kayıtlarında bu alanlar boş
        const isValidUnifiedCache =
          data.deal_score !== null &&
          data.pitch_deck !== null &&
          data.next_year_projection !== null;

        if (!isValidUnifiedCache) {
          console.log('Found incomplete cached analysis (old format), treating as no cache');
          setIsCacheLoading(false);
          return false; // Cache yok gibi davran
        }

        // Type-safe extraction with type guards
        const investorAnalysis = data.investor_analysis as Record<string, unknown> | null;
        const defaultQuarterlyAnalysis: QuarterlyAIAnalysis = {
          overview: '',
          critical_periods: [],
          seasonal_trends: [],
          growth_trajectory: ''
        };
        const defaultPitchDeck: PitchDeck = { slides: [], executive_summary: '' };
        const defaultInvestmentAllocation: InvestmentAllocation = {
          product: 40,
          marketing: 30,
          hiring: 20,
          operations: 10
        };

        const result: UnifiedAnalysisResult = {
          insights: isValidInsightArray(data.insights) ? data.insights : [],
          recommendations: isValidRecommendationArray(data.recommendations) ? data.recommendations : [],
          quarterly_analysis: isValidQuarterlyAnalysis(data.quarterly_analysis)
            ? data.quarterly_analysis
            : defaultQuarterlyAnalysis,
          deal_analysis: {
            deal_score: data.deal_score || 0,
            valuation_verdict: (data.valuation_verdict as 'premium' | 'fair' | 'cheap') || 'fair',
            investor_attractiveness: (investorAnalysis?.investor_attractiveness as string) || '',
            risk_factors: safeArray(investorAnalysis?.risk_factors as string[] | undefined)
          },
          pitch_deck: isValidPitchDeck(data.pitch_deck) ? data.pitch_deck : defaultPitchDeck,
          next_year_projection: isValidNextYearProjection(data.next_year_projection)
            ? data.next_year_projection
            : null as unknown as NextYearProjection
        };

        setAnalysis(result);

        // Extract cached focus project info with type guards
        const cachedData = data as Record<string, unknown>;
        setCachedInfo({
          id: data.id,
          updatedAt: new Date((data.updated_at || data.created_at || new Date()) as string),
          // Focus project settings from cache
          focusProjects: safeArray(cachedData.focus_projects as string[] | undefined),
          focusProjectPlan: (cachedData.focus_project_plan as string) || '',
          investmentAllocation: isValidInvestmentAllocation(cachedData.investment_allocation)
            ? cachedData.investment_allocation
            : defaultInvestmentAllocation,
          // Edited projections from cache
          editedRevenueProjection: isValidEditableProjectionArray(cachedData.edited_revenue_projection)
            ? cachedData.edited_revenue_projection
            : [],
          editedExpenseProjection: isValidEditableProjectionArray(cachedData.edited_expense_projection)
            ? cachedData.edited_expense_projection
            : [],
          projectionUserEdited: (cachedData.projection_user_edited as boolean) || false
        });
        // Hash'leri kaydet - veri değişikliği kontrolü için
        setSavedHashes({
          hashA: data.scenario_a_data_hash || null,
          hashB: data.scenario_b_data_hash || null
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
  }, [userId]);

  // Check if data has changed since last analysis
  const checkDataChanges = useCallback((scenarioA: SimulationScenario, scenarioB: SimulationScenario): boolean => {
    // Eğer kaydedilmiş hash yoksa, veri değişikliği kontrolü yapılamaz
    if (!savedHashes.hashA || !savedHashes.hashB) {
      setDataChanged(false);
      return false;
    }
    
    // Mevcut senaryo hash'lerini hesapla
    const currentHashA = generateScenarioHash(scenarioA);
    const currentHashB = generateScenarioHash(scenarioB);
    
    // Hash'leri karşılaştır
    const hasChanged = currentHashA !== savedHashes.hashA || currentHashB !== savedHashes.hashB;
    setDataChanged(hasChanged);
    return hasChanged;
  }, [savedHashes]);

  // Load analysis history
  const loadAnalysisHistory = useCallback(async (scenarioAId: string, scenarioBId: string): Promise<void> => {
    if (!userId) return;
    setIsHistoryLoading(true);

    try {
      // Backward compatibility: tüm analiz tiplerini getir
      const { data, error: fetchError } = await supabase
        .from('scenario_analysis_history')
        .select('*')
        .eq('user_id', userId)
        .eq('scenario_a_id', scenarioAId)
        .eq('scenario_b_id', scenarioBId)
        .in('analysis_type', ['unified', 'scenario_comparison', 'investor_pitch'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) {
        console.error('Error loading unified analysis history:', fetchError);
        return;
      }

      if (data) {
        const history: AnalysisHistoryItem[] = data.map(item => {
          // Type-safe extraction from database row
          const itemData = item as Record<string, unknown>;
          const investorAnalysis = itemData.investor_analysis as Record<string, unknown> | null;

          return {
            id: item.id,
            createdAt: new Date((item.created_at || new Date()) as string),
            analysisType: (item.analysis_type as 'unified' | 'scenario_comparison' | 'investor_pitch') || 'unified',
            insights: isValidInsightArray(item.insights) ? item.insights : [],
            recommendations: isValidRecommendationArray(item.recommendations) ? item.recommendations : [],
            quarterlyAnalysis: isValidQuarterlyAnalysis(item.quarterly_analysis)
              ? item.quarterly_analysis
              : undefined,
            // investor_analysis JSON'dan okuma (eski format için uyumluluk)
            investorAnalysis: investorAnalysis ? {
              capitalStory: (investorAnalysis.capitalStory as string) || '',
              exitNarrative: (investorAnalysis.exitNarrative as string) || '',
              investorROI: (investorAnalysis.investorROI as string) || '',
              keyMetrics: investorAnalysis.keyMetrics as {
                capitalEfficiency: number;
                paybackMonths: number;
                burnMultiple: number;
              } | undefined,
              opportunityCost: (investorAnalysis.opportunityCost as string) || '',
              potentialAcquirers: safeArray(investorAnalysis.potentialAcquirers as string[] | undefined),
              recommendedExit: investorAnalysis.recommendedExit as 'series_b' | 'strategic_sale' | 'ipo' | 'hold' | undefined,
              riskFactors: safeArray(investorAnalysis.riskFactors as string[] | undefined)
            } : undefined,
            dealConfig: itemData.deal_config as DealConfiguration | undefined
          };
        });
        setAnalysisHistory(history);
      }
    } catch (err) {
      console.error('Error loading unified analysis history:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [userId]);

  // Save to history
  const saveToHistory = useCallback(async (
    result: UnifiedAnalysisResult,
    scenarioA: SimulationScenario,
    scenarioB: SimulationScenario,
    dealConfig: DealConfiguration
  ): Promise<void> => {
    if (!userId || !scenarioA.id || !scenarioB.id) return;

    try {
      // Tabloda olmayan sütunları kaldırdık (deal_score, valuation_verdict, pitch_deck, next_year_projection)
      // Tüm deal verilerini investor_analysis JSON içine koyuyoruz
      const historyInsertData = {
        user_id: userId,
        scenario_a_id: scenarioA.id,
        scenario_b_id: scenarioB.id,
        analysis_type: 'unified' as const,
        insights: result.insights as unknown as Json,
        recommendations: result.recommendations as unknown as Json,
        quarterly_analysis: result.quarterly_analysis as unknown as Json,
        investor_analysis: {
          deal_score: result.deal_analysis.deal_score,
          valuation_verdict: result.deal_analysis.valuation_verdict,
          investor_attractiveness: result.deal_analysis.investor_attractiveness,
          risk_factors: result.deal_analysis.risk_factors,
          pitch_deck: result.pitch_deck,
          next_year_projection: result.next_year_projection
        } as unknown as Json,
        deal_config: dealConfig as unknown as Json,
        scenario_a_data_hash: generateScenarioHash(scenarioA),
        scenario_b_data_hash: generateScenarioHash(scenarioB)
      };

      const { error: insertError } = await supabase
        .from('scenario_analysis_history')
        .insert(historyInsertData);
      
      if (insertError) {
        console.error('History insert failed:', insertError);
      }
    } catch (err) {
      console.error('Error saving to unified analysis history:', err);
    }
  }, [userId]);

  // Save analysis to database
  const saveAnalysis = useCallback(async (
    result: UnifiedAnalysisResult,
    scenarioA: SimulationScenario,
    scenarioB: SimulationScenario,
    dealConfig: DealConfiguration,
    focusProjectInfo?: FocusProjectInfo
  ): Promise<void> => {
    if (!userId || !scenarioA.id || !scenarioB.id) return;

    try {
      // Construct upsert data with proper typing
      const defaultInvestmentAllocation: InvestmentAllocation = {
        product: 40,
        marketing: 30,
        hiring: 20,
        operations: 10
      };

      const upsertData = {
        user_id: userId,
        scenario_a_id: scenarioA.id,
        scenario_b_id: scenarioB.id,
        analysis_type: 'unified' as const,
        insights: result.insights as unknown as Json,
        recommendations: result.recommendations as unknown as Json,
        quarterly_analysis: result.quarterly_analysis as unknown as Json,
        deal_score: Math.round(result.deal_analysis.deal_score),
        valuation_verdict: result.deal_analysis.valuation_verdict,
        investor_analysis: {
          investor_attractiveness: result.deal_analysis.investor_attractiveness,
          risk_factors: result.deal_analysis.risk_factors
        } as unknown as Json,
        pitch_deck: result.pitch_deck as unknown as Json,
        next_year_projection: result.next_year_projection as unknown as Json,
        deal_config_snapshot: dealConfig as unknown as Json,
        scenario_a_data_hash: generateScenarioHash(scenarioA),
        scenario_b_data_hash: generateScenarioHash(scenarioB),
        // Focus project settings (new columns)
        focus_projects: focusProjectInfo?.projects?.map(p => p.projectName) || [],
        focus_project_plan: focusProjectInfo?.growthPlan || '',
        investment_allocation: (focusProjectInfo?.investmentAllocation || defaultInvestmentAllocation) as unknown as Json,
        updated_at: new Date().toISOString()
      };

      const { data, error: upsertError } = await supabase
        .from('scenario_ai_analyses')
        .upsert(upsertData, {
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
  }, [userId, saveToHistory]);

  // Fetch historical balance sheet from database and convert TL to USD
  const fetchHistoricalBalance = useCallback(async (targetYear: number, averageExchangeRate: number): Promise<YearlyBalanceSheet | null> => {
    if (!userId) return null;
    
    const previousYear = targetYear - 1;
    
    const { data, error } = await supabase
      .from('yearly_balance_sheets')
      .select('*')
      .eq('user_id', userId)
      .eq('year', previousYear)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching historical balance:', error);
      return null;
    }
    
    // Convert TL to USD using average exchange rate
    const convertToUsd = (valueTL: number | null): number => {
      if (!valueTL || averageExchangeRate <= 0) return 0;
      return Math.round(valueTL / averageExchangeRate);
    };
    
    // Map DB result to YearlyBalanceSheet type with USD conversion
    if (data) {
      const balance: YearlyBalanceSheet = {
        id: data.id,
        user_id: data.user_id,
        year: data.year,
        cash_on_hand: convertToUsd(data.cash_on_hand),
        bank_balance: convertToUsd(data.bank_balance),
        trade_receivables: convertToUsd(data.trade_receivables),
        trade_payables: convertToUsd(data.trade_payables),
        total_assets: convertToUsd(data.total_assets),
        total_liabilities: convertToUsd(data.total_liabilities),
        current_profit: convertToUsd(data.current_profit),
        retained_earnings: convertToUsd(data.retained_earnings),
        paid_capital: convertToUsd(data.paid_capital),
        bank_loans: convertToUsd(data.bank_loans),
        is_locked: data.is_locked
      };
      return balance;
    }
    
    return null;
  }, [userId]);

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
    quarterlyItemized: QuarterlyItemizedData | null,
    exchangeRate: number,
    focusProjectInfo?: FocusProjectInfo,
    capTableEntries?: any[],
    workingCapitalConfig?: any
  ): Promise<UnifiedAnalysisResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // exitPlan.allYears çok büyük olabilir (30+ yıl) - sadece ilk 5 yılı gönder
      // Bu payload boyutunu azaltır ve Edge Function timeout'unu önler
      const trimmedExitPlan = {
        ...exitPlan,
        allYears: exitPlan.allYears?.slice(0, 5) || []
      };

      // Get current language from i18n (prioritize i18n.language, fallback to localStorage, default to 'en')
      const currentLanguage = typeof window !== 'undefined'
        ? (i18n.language || localStorage.getItem('language') || 'en').substring(0, 2)
        : 'en';

      // Request body with Cap Table and Working Capital
      const requestBody = {
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
        exitPlan: trimmedExitPlan,
        capitalNeeds,
        historicalBalance,
        quarterlyItemized,
        exchangeRate,
        focusProjectInfo,
        language: currentLanguage, // 'en' or 'tr'
        // NEW: Cap Table and Working Capital from scenario
        capTableEntries: capTableEntries || scenarioA.capTableEntries || [],
        workingCapitalConfig: workingCapitalConfig || scenarioA.workingCapitalConfig || null
      };

      // Retry wrapper for Edge Function call with exponential backoff
      let lastError: Error | null = null;
      let data: UnifiedAnalysisResult | null = null;

      for (let attempt = 0; attempt < RETRY_CONFIG.MAX_RETRIES; attempt++) {
        try {
          const { data: responseData, error: invokeError } = await supabase.functions.invoke(
            'unified-scenario-analysis',
            { body: requestBody }
          );

          if (invokeError) {
            // Check if error is retryable (network/fetch errors)
            const errorName = invokeError.name || invokeError.constructor?.name || '';
            const isRetryable = RETRY_CONFIG.RETRYABLE_ERRORS.some(e =>
              errorName.includes(e) || invokeError.message?.includes('fetch')
            );

            if (isRetryable && attempt < RETRY_CONFIG.MAX_RETRIES - 1) {
              const delayMs = RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, attempt);
              console.warn(`Edge function call failed (attempt ${attempt + 1}/${RETRY_CONFIG.MAX_RETRIES}), retrying in ${delayMs}ms...`, invokeError);
              await sleep(delayMs);
              continue;
            }
            throw invokeError;
          }

          if (responseData?.error) {
            throw new Error(responseData.error);
          }

          data = responseData as UnifiedAnalysisResult;
          break; // Success, exit retry loop
        } catch (retryError) {
          lastError = retryError instanceof Error ? retryError : new Error(String(retryError));

          // Only retry on network-type errors
          const errorName = lastError.name || '';
          const isRetryable = RETRY_CONFIG.RETRYABLE_ERRORS.some(e =>
            errorName.includes(e) || lastError!.message?.includes('fetch') || lastError!.message?.includes('network')
          );

          if (isRetryable && attempt < RETRY_CONFIG.MAX_RETRIES - 1) {
            const delayMs = RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, attempt);
            console.warn(`Edge function call failed (attempt ${attempt + 1}/${RETRY_CONFIG.MAX_RETRIES}), retrying in ${delayMs}ms...`, lastError);
            await sleep(delayMs);
            continue;
          }
          throw lastError;
        }
      }

      if (!data) {
        throw lastError || new Error('Analysis failed after retries');
      }

      const result = data as UnifiedAnalysisResult;
      setAnalysis(result);
      
      // Save to database with focus project info
      await saveAnalysis(result, scenarioA, scenarioB, dealConfig, focusProjectInfo);
      
      const successMsg = currentLanguage === 'en' ? 'Comprehensive AI analysis completed!' : 'Kapsamlı AI analizi tamamlandı!';
      toast.success(successMsg);
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
    // Farklı analiz tiplerini destekle - insights/recommendations yoksa bile restore et
    const hasValidData = historyItem.insights || historyItem.investorAnalysis;
    
    if (hasValidData) {
      setAnalysis({
        insights: historyItem.insights || [],
        recommendations: historyItem.recommendations || [],
        quarterly_analysis: historyItem.quarterlyAnalysis || { 
          overview: '', 
          critical_periods: [], 
          seasonal_trends: [], 
          growth_trajectory: '' 
        },
        deal_analysis: {
          deal_score: 0,
          valuation_verdict: 'fair',
          investor_attractiveness: historyItem.investorAnalysis?.capitalStory || '',
          risk_factors: historyItem.investorAnalysis?.riskFactors || []
        },
        pitch_deck: { slides: [], executive_summary: '' },
        next_year_projection: {
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
    } else {
      toast.error('Geri yüklenecek analiz verisi bulunamadı');
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

  // Save edited projections to database
  const saveEditedProjections = useCallback(async (
    scenarioAId: string,
    scenarioBId: string,
    editedRevenueProjection: EditableProjectionItem[],
    editedExpenseProjection: EditableProjectionItem[]
  ): Promise<void> => {
    if (!userId) return;

    const hasEdits = editedRevenueProjection.some(i => i.userEdited) ||
                     editedExpenseProjection.some(i => i.userEdited);

    try {
      const updateData = {
        edited_revenue_projection: editedRevenueProjection,
        edited_expense_projection: editedExpenseProjection,
        projection_user_edited: hasEdits,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('scenario_ai_analyses')
        .update(updateData as Record<string, unknown>)
        .eq('user_id', userId)
        .eq('scenario_a_id', scenarioAId)
        .eq('scenario_b_id', scenarioBId)
        .eq('analysis_type', 'unified');

      if (updateError) {
        console.error('Error saving edited projections:', updateError);
      }
    } catch (err) {
      console.error('Error saving edited projections:', err);
    }
  }, [userId]);

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
    clearAnalysis,
    saveEditedProjections
  };
}
