import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import type {
  SimulationScenario,
  NextYearProjection,
  EditableProjectionItem,
  FocusProjectInfo,
  InvestmentAllocation,
} from '@/types/simulation';
import type { UnifiedAnalysisResult } from '@/hooks/finance/useUnifiedAnalysis';

/**
 * Deal Configuration for investment analysis
 */
export interface DealConfiguration {
  investmentAmount: number;
  equityPercentage: number;
  useOfFunds: {
    product: number;
    marketing: number;
    hiring: number;
    operations: number;
  };
}

/**
 * Scenario summary calculations
 */
export interface ScenarioSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

/**
 * Quarterly amounts for comparison
 */
export interface QuarterlyData {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

/**
 * Simulation Context State
 */
interface SimulationState {
  // Scenario State
  scenarioA: SimulationScenario | null;
  scenarioB: SimulationScenario | null;
  summaryA: ScenarioSummary | null;
  summaryB: ScenarioSummary | null;

  // Quarterly Data
  quarterlyA: QuarterlyData | null;
  quarterlyB: QuarterlyData | null;
  quarterlyRevenueA: QuarterlyData | null;
  quarterlyRevenueB: QuarterlyData | null;
  quarterlyExpenseA: QuarterlyData | null;
  quarterlyExpenseB: QuarterlyData | null;

  // Analysis State
  analysisData: UnifiedAnalysisResult | null;
  isAnalyzing: boolean;

  // Projection State
  editableRevenueProjection: EditableProjectionItem[];
  editableExpenseProjection: EditableProjectionItem[];
  aiNextYearProjection: NextYearProjection | null;

  // Deal Configuration
  dealConfig: DealConfiguration;

  // Focus Projects
  focusProjects: FocusProjectInfo[];
  investmentAllocation: InvestmentAllocation | null;

  // UI State
  showPitchDeck: boolean;
  pitchDeckEditMode: boolean;
}

/**
 * Simulation Context Actions
 */
interface SimulationActions {
  // Scenario Actions
  setScenarioA: (scenario: SimulationScenario | null) => void;
  setScenarioB: (scenario: SimulationScenario | null) => void;
  setSummaryA: (summary: ScenarioSummary | null) => void;
  setSummaryB: (summary: ScenarioSummary | null) => void;

  // Quarterly Actions
  setQuarterlyA: (data: QuarterlyData | null) => void;
  setQuarterlyB: (data: QuarterlyData | null) => void;
  setQuarterlyRevenueA: (data: QuarterlyData | null) => void;
  setQuarterlyRevenueB: (data: QuarterlyData | null) => void;
  setQuarterlyExpenseA: (data: QuarterlyData | null) => void;
  setQuarterlyExpenseB: (data: QuarterlyData | null) => void;

  // Analysis Actions
  setAnalysisData: (data: UnifiedAnalysisResult | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;

  // Projection Actions
  setEditableRevenueProjection: (items: EditableProjectionItem[]) => void;
  setEditableExpenseProjection: (items: EditableProjectionItem[]) => void;
  setAiNextYearProjection: (projection: NextYearProjection | null) => void;
  updateRevenueProjection: (index: number, field: 'q1' | 'q2' | 'q3' | 'q4', value: number) => void;
  updateExpenseProjection: (index: number, field: 'q1' | 'q2' | 'q3' | 'q4', value: number) => void;

  // Deal Configuration Actions
  setDealConfig: (config: DealConfiguration) => void;
  updateDealConfig: (updates: Partial<DealConfiguration>) => void;

  // Focus Project Actions
  setFocusProjects: (projects: FocusProjectInfo[]) => void;
  setInvestmentAllocation: (allocation: InvestmentAllocation | null) => void;

  // UI Actions
  setShowPitchDeck: (show: boolean) => void;
  setPitchDeckEditMode: (editMode: boolean) => void;

  // Computed getters
  getEditedProjectionOverride: () => { totalRevenue: number; totalExpenses: number } | null;
}

/**
 * Combined Context Type
 */
type SimulationContextType = SimulationState & SimulationActions;

/**
 * Default deal configuration
 */
const DEFAULT_DEAL_CONFIG: DealConfiguration = {
  investmentAmount: 150000,
  equityPercentage: 15,
  useOfFunds: {
    product: 40,
    marketing: 25,
    hiring: 25,
    operations: 10,
  },
};

/**
 * Initial state
 */
const initialState: SimulationState = {
  scenarioA: null,
  scenarioB: null,
  summaryA: null,
  summaryB: null,
  quarterlyA: null,
  quarterlyB: null,
  quarterlyRevenueA: null,
  quarterlyRevenueB: null,
  quarterlyExpenseA: null,
  quarterlyExpenseB: null,
  analysisData: null,
  isAnalyzing: false,
  editableRevenueProjection: [],
  editableExpenseProjection: [],
  aiNextYearProjection: null,
  dealConfig: DEFAULT_DEAL_CONFIG,
  focusProjects: [],
  investmentAllocation: null,
  showPitchDeck: false,
  pitchDeckEditMode: false,
};

/**
 * Create Context
 */
const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

/**
 * Provider Props
 */
interface SimulationProviderProps {
  children: ReactNode;
  initialDealConfig?: DealConfiguration;
}

/**
 * Simulation Provider Component
 */
export function SimulationProvider({ children, initialDealConfig }: SimulationProviderProps) {
  // Scenario State
  const [scenarioA, setScenarioA] = useState<SimulationScenario | null>(null);
  const [scenarioB, setScenarioB] = useState<SimulationScenario | null>(null);
  const [summaryA, setSummaryA] = useState<ScenarioSummary | null>(null);
  const [summaryB, setSummaryB] = useState<ScenarioSummary | null>(null);

  // Quarterly State
  const [quarterlyA, setQuarterlyA] = useState<QuarterlyData | null>(null);
  const [quarterlyB, setQuarterlyB] = useState<QuarterlyData | null>(null);
  const [quarterlyRevenueA, setQuarterlyRevenueA] = useState<QuarterlyData | null>(null);
  const [quarterlyRevenueB, setQuarterlyRevenueB] = useState<QuarterlyData | null>(null);
  const [quarterlyExpenseA, setQuarterlyExpenseA] = useState<QuarterlyData | null>(null);
  const [quarterlyExpenseB, setQuarterlyExpenseB] = useState<QuarterlyData | null>(null);

  // Analysis State
  const [analysisData, setAnalysisData] = useState<UnifiedAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Projection State
  const [editableRevenueProjection, setEditableRevenueProjection] = useState<EditableProjectionItem[]>([]);
  const [editableExpenseProjection, setEditableExpenseProjection] = useState<EditableProjectionItem[]>([]);
  const [aiNextYearProjection, setAiNextYearProjection] = useState<NextYearProjection | null>(null);

  // Deal Configuration
  const [dealConfig, setDealConfig] = useState<DealConfiguration>(
    initialDealConfig || DEFAULT_DEAL_CONFIG
  );

  // Focus Projects
  const [focusProjects, setFocusProjects] = useState<FocusProjectInfo[]>([]);
  const [investmentAllocation, setInvestmentAllocation] = useState<InvestmentAllocation | null>(null);

  // UI State
  const [showPitchDeck, setShowPitchDeck] = useState(false);
  const [pitchDeckEditMode, setPitchDeckEditMode] = useState(false);

  // Actions
  const updateDealConfig = useCallback((updates: Partial<DealConfiguration>) => {
    setDealConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const updateRevenueProjection = useCallback((index: number, field: 'q1' | 'q2' | 'q3' | 'q4', value: number) => {
    setEditableRevenueProjection(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          [field]: value,
          total: (field === 'q1' ? value : updated[index].q1) +
                 (field === 'q2' ? value : updated[index].q2) +
                 (field === 'q3' ? value : updated[index].q3) +
                 (field === 'q4' ? value : updated[index].q4),
          userEdited: true,
        };
      }
      return updated;
    });
  }, []);

  const updateExpenseProjection = useCallback((index: number, field: 'q1' | 'q2' | 'q3' | 'q4', value: number) => {
    setEditableExpenseProjection(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          [field]: value,
          total: (field === 'q1' ? value : updated[index].q1) +
                 (field === 'q2' ? value : updated[index].q2) +
                 (field === 'q3' ? value : updated[index].q3) +
                 (field === 'q4' ? value : updated[index].q4),
          userEdited: true,
        };
      }
      return updated;
    });
  }, []);

  const getEditedProjectionOverride = useCallback(() => {
    const hasRevenueEdits = editableRevenueProjection.some(item => item.userEdited);
    const hasExpenseEdits = editableExpenseProjection.some(item => item.userEdited);

    if (!hasRevenueEdits && !hasExpenseEdits) return null;

    return {
      totalRevenue: editableRevenueProjection.reduce((sum, item) =>
        sum + item.q1 + item.q2 + item.q3 + item.q4, 0
      ),
      totalExpenses: editableExpenseProjection.reduce((sum, item) =>
        sum + item.q1 + item.q2 + item.q3 + item.q4, 0
      ),
    };
  }, [editableRevenueProjection, editableExpenseProjection]);

  // Memoized context value
  const value = useMemo<SimulationContextType>(() => ({
    // State
    scenarioA,
    scenarioB,
    summaryA,
    summaryB,
    quarterlyA,
    quarterlyB,
    quarterlyRevenueA,
    quarterlyRevenueB,
    quarterlyExpenseA,
    quarterlyExpenseB,
    analysisData,
    isAnalyzing,
    editableRevenueProjection,
    editableExpenseProjection,
    aiNextYearProjection,
    dealConfig,
    focusProjects,
    investmentAllocation,
    showPitchDeck,
    pitchDeckEditMode,

    // Actions
    setScenarioA,
    setScenarioB,
    setSummaryA,
    setSummaryB,
    setQuarterlyA,
    setQuarterlyB,
    setQuarterlyRevenueA,
    setQuarterlyRevenueB,
    setQuarterlyExpenseA,
    setQuarterlyExpenseB,
    setAnalysisData,
    setIsAnalyzing,
    setEditableRevenueProjection,
    setEditableExpenseProjection,
    setAiNextYearProjection,
    updateRevenueProjection,
    updateExpenseProjection,
    setDealConfig,
    updateDealConfig,
    setFocusProjects,
    setInvestmentAllocation,
    setShowPitchDeck,
    setPitchDeckEditMode,
    getEditedProjectionOverride,
  }), [
    scenarioA,
    scenarioB,
    summaryA,
    summaryB,
    quarterlyA,
    quarterlyB,
    quarterlyRevenueA,
    quarterlyRevenueB,
    quarterlyExpenseA,
    quarterlyExpenseB,
    analysisData,
    isAnalyzing,
    editableRevenueProjection,
    editableExpenseProjection,
    aiNextYearProjection,
    dealConfig,
    focusProjects,
    investmentAllocation,
    showPitchDeck,
    pitchDeckEditMode,
    updateDealConfig,
    updateRevenueProjection,
    updateExpenseProjection,
    getEditedProjectionOverride,
  ]);

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
}

/**
 * Hook to use simulation context
 */
export function useSimulation(): SimulationContextType {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}

/**
 * Hook to use only scenario data (for components that only need scenarios)
 */
export function useScenarioData() {
  const { scenarioA, scenarioB, summaryA, summaryB } = useSimulation();
  return { scenarioA, scenarioB, summaryA, summaryB };
}

/**
 * Hook to use only quarterly data
 */
export function useQuarterlyData() {
  const {
    quarterlyA,
    quarterlyB,
    quarterlyRevenueA,
    quarterlyRevenueB,
    quarterlyExpenseA,
    quarterlyExpenseB,
  } = useSimulation();
  return {
    quarterlyA,
    quarterlyB,
    quarterlyRevenueA,
    quarterlyRevenueB,
    quarterlyExpenseA,
    quarterlyExpenseB,
  };
}

/**
 * Hook to use only analysis data
 */
export function useAnalysisData() {
  const { analysisData, isAnalyzing, setAnalysisData, setIsAnalyzing } = useSimulation();
  return { analysisData, isAnalyzing, setAnalysisData, setIsAnalyzing };
}

/**
 * Hook to use only deal configuration
 */
export function useDealConfiguration() {
  const { dealConfig, setDealConfig, updateDealConfig } = useSimulation();
  return { dealConfig, setDealConfig, updateDealConfig };
}

/**
 * Hook to use only projection data
 */
export function useProjectionData() {
  const {
    editableRevenueProjection,
    editableExpenseProjection,
    aiNextYearProjection,
    setEditableRevenueProjection,
    setEditableExpenseProjection,
    setAiNextYearProjection,
    updateRevenueProjection,
    updateExpenseProjection,
    getEditedProjectionOverride,
  } = useSimulation();
  return {
    editableRevenueProjection,
    editableExpenseProjection,
    aiNextYearProjection,
    setEditableRevenueProjection,
    setEditableExpenseProjection,
    setAiNextYearProjection,
    updateRevenueProjection,
    updateExpenseProjection,
    getEditedProjectionOverride,
  };
}

export { DEFAULT_DEAL_CONFIG };
export type { SimulationContextType, SimulationState, SimulationActions };
