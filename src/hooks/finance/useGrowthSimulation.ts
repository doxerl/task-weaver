import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  ProjectionItem, 
  InvestmentItem, 
  SimulationScenario, 
  SimulationSummary,
} from '@/types/simulation';
import { useFinancialDataHub } from './useFinancialDataHub';
import { useCurrency } from '@/contexts/CurrencyContext';

const generateId = () => Math.random().toString(36).substr(2, 9);

// Category mapping from database codes to simulation categories
const REVENUE_CATEGORY_MAP: Record<string, string> = {
  'SBT': 'SBT Tracker',
  'LSD': 'Leadership Denetim',
  'DANISMANLIK': 'Danışmanlık',
  'ZDHC': 'ZDHC InCheck',
};

const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  'PERSONEL': 'Personel (Brüt+SGK)',
  'YAZILIM': 'Yazılım/Abonelik',
  'KIRA': 'Kira',
  'SEYAHAT': 'Seyahat',
  'PAZARLAMA': 'Pazarlama/Fuar',
  'FUAR': 'Pazarlama/Fuar',
  'TELEKOM': 'Telekomünikasyon',
  'MUHASEBE': 'Muhasebe',
  'DIĞER': 'Diğer',
};

function mapCategoryCode(code: string | null, mapping: Record<string, string>, defaultCategory: string): string {
  if (!code) return defaultCategory;
  const upperCode = code.toUpperCase();
  
  for (const [key, value] of Object.entries(mapping)) {
    if (upperCode.includes(key)) {
      return value;
    }
  }
  
  return defaultCategory;
}

export function useGrowthSimulation() {
  const hub = useFinancialDataHub(2025);
  const { yearlyAverageRate } = useCurrency();
  
  const [scenarioName, setScenarioName] = useState('Varsayılan Senaryo');
  const [revenues, setRevenues] = useState<ProjectionItem[]>([]);
  const [expenses, setExpenses] = useState<ProjectionItem[]>([]);
  const [investments, setInvestments] = useState<InvestmentItem[]>([]);
  const [assumedExchangeRate, setAssumedExchangeRate] = useState(45);
  const [notes, setNotes] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Calculate base data from hub when available
  const baseData = useMemo(() => {
    if (hub.isLoading || !yearlyAverageRate) {
      return null;
    }

    const rate = yearlyAverageRate;

    // Group income by category
    const revenueGroups: Record<string, number> = {};
    hub.income.forEach(tx => {
      const category = mapCategoryCode(tx.categoryCode, REVENUE_CATEGORY_MAP, 'Diğer Gelir');
      revenueGroups[category] = (revenueGroups[category] || 0) + Math.abs(tx.gross);
    });

    // Group expenses by category
    const expenseGroups: Record<string, number> = {};
    hub.expense.forEach(tx => {
      const category = mapCategoryCode(tx.categoryCode, EXPENSE_CATEGORY_MAP, 'Diğer');
      expenseGroups[category] = (expenseGroups[category] || 0) + Math.abs(tx.gross);
    });

    // Convert to USD
    const revenuesUsd = Object.entries(revenueGroups).map(([category, amount]) => ({
      category,
      baseAmount: Math.round(amount / rate),
    }));

    const expensesUsd = Object.entries(expenseGroups).map(([category, amount]) => ({
      category,
      baseAmount: Math.round(amount / rate),
    }));

    // Sort by amount descending
    revenuesUsd.sort((a, b) => b.baseAmount - a.baseAmount);
    expensesUsd.sort((a, b) => b.baseAmount - a.baseAmount);

    return {
      revenues: revenuesUsd,
      expenses: expensesUsd,
      totalRevenue: revenuesUsd.reduce((sum, r) => sum + r.baseAmount, 0),
      totalExpense: expensesUsd.reduce((sum, e) => sum + e.baseAmount, 0),
    };
  }, [hub.isLoading, hub.income, hub.expense, yearlyAverageRate]);

  // Initialize revenues and expenses when base data is available
  useEffect(() => {
    if (baseData && !isInitialized) {
      const initialRevenues: ProjectionItem[] = baseData.revenues.map(r => ({
        id: generateId(),
        category: r.category,
        baseAmount: r.baseAmount,
        projectedAmount: r.baseAmount,
        description: '',
        isNew: false,
      }));

      const initialExpenses: ProjectionItem[] = baseData.expenses.map(e => ({
        id: generateId(),
        category: e.category,
        baseAmount: e.baseAmount,
        projectedAmount: e.baseAmount,
        description: '',
        isNew: false,
      }));

      setRevenues(initialRevenues);
      setExpenses(initialExpenses);
      setIsInitialized(true);
    }
  }, [baseData, isInitialized]);

  // Calculate summary
  const summary: SimulationSummary = useMemo(() => {
    const baseRevenue = baseData?.totalRevenue || 0;
    const baseExpense = baseData?.totalExpense || 0;
    const baseProfit = baseRevenue - baseExpense;

    const totalProjectedRevenue = revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    const totalProjectedExpense = expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
    const totalInvestment = investments.reduce((sum, i) => sum + i.amount, 0);
    const projectedProfit = totalProjectedRevenue - totalProjectedExpense;

    return {
      base: {
        totalRevenue: baseRevenue,
        totalExpense: baseExpense,
        netProfit: baseProfit,
        profitMargin: baseRevenue > 0 ? (baseProfit / baseRevenue) * 100 : 0,
      },
      projected: {
        totalRevenue: totalProjectedRevenue,
        totalExpense: totalProjectedExpense,
        netProfit: projectedProfit,
        profitMargin: totalProjectedRevenue > 0 ? (projectedProfit / totalProjectedRevenue) * 100 : 0,
      },
      growth: {
        revenueGrowth: baseRevenue > 0 
          ? ((totalProjectedRevenue - baseRevenue) / baseRevenue) * 100 
          : 0,
        expenseGrowth: baseExpense > 0 
          ? ((totalProjectedExpense - baseExpense) / baseExpense) * 100 
          : 0,
        profitGrowth: baseProfit > 0 
          ? ((projectedProfit - baseProfit) / baseProfit) * 100 
          : 0,
      },
      capitalNeeds: {
        totalInvestment,
        projectedProfit,
        netCapitalNeed: Math.max(0, totalInvestment - projectedProfit),
      },
    };
  }, [baseData, revenues, expenses, investments]);

  // Revenue operations
  const updateRevenue = useCallback((id: string, updates: Partial<ProjectionItem>) => {
    setRevenues(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const addRevenue = useCallback((item: Omit<ProjectionItem, 'id'>) => {
    setRevenues(prev => [...prev, { ...item, id: generateId() }]);
  }, []);

  const removeRevenue = useCallback((id: string) => {
    setRevenues(prev => prev.filter(r => r.id !== id));
  }, []);

  // Expense operations
  const updateExpense = useCallback((id: string, updates: Partial<ProjectionItem>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const addExpense = useCallback((item: Omit<ProjectionItem, 'id'>) => {
    setExpenses(prev => [...prev, { ...item, id: generateId() }]);
  }, []);

  const removeExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  // Investment operations
  const addInvestment = useCallback((item: Omit<InvestmentItem, 'id'>) => {
    setInvestments(prev => [...prev, { ...item, id: generateId() }]);
  }, []);

  const updateInvestment = useCallback((id: string, updates: Partial<InvestmentItem>) => {
    setInvestments(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  }, []);

  const removeInvestment = useCallback((id: string) => {
    setInvestments(prev => prev.filter(i => i.id !== id));
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setIsInitialized(false);
    setInvestments([]);
    setAssumedExchangeRate(45);
    setNotes('');
    setScenarioName('Varsayılan Senaryo');
  }, []);

  // Get current scenario
  const getCurrentScenario = useCallback((): SimulationScenario => ({
    id: generateId(),
    name: scenarioName,
    revenues,
    expenses,
    investments,
    assumedExchangeRate,
    notes,
  }), [scenarioName, revenues, expenses, investments, assumedExchangeRate, notes]);

  // Load scenario
  const loadScenario = useCallback((scenario: SimulationScenario) => {
    setScenarioName(scenario.name);
    setRevenues(scenario.revenues);
    setExpenses(scenario.expenses);
    setInvestments(scenario.investments);
    setAssumedExchangeRate(scenario.assumedExchangeRate);
    setNotes(scenario.notes);
    setIsInitialized(true);
  }, []);

  return {
    // State
    scenarioName,
    setScenarioName,
    revenues,
    expenses,
    investments,
    assumedExchangeRate,
    setAssumedExchangeRate,
    notes,
    setNotes,
    summary,
    isLoading: hub.isLoading || !isInitialized,

    // Revenue operations
    updateRevenue,
    addRevenue,
    removeRevenue,

    // Expense operations
    updateExpense,
    addExpense,
    removeExpense,

    // Investment operations
    addInvestment,
    updateInvestment,
    removeInvestment,

    // Scenario operations
    resetToDefaults,
    getCurrentScenario,
    loadScenario,
  };
}
