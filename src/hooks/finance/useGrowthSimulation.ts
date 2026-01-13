import { useState, useCallback, useMemo } from 'react';
import { 
  ProjectionItem, 
  InvestmentItem, 
  SimulationScenario, 
  SimulationSummary,
  BASE_REVENUES_2025,
  BASE_EXPENSES_2025,
  TOTAL_BASE_REVENUE_2025,
  TOTAL_BASE_EXPENSE_2025,
  NET_PROFIT_2025
} from '@/types/simulation';

const generateId = () => Math.random().toString(36).substr(2, 9);

const createInitialRevenues = (): ProjectionItem[] => 
  BASE_REVENUES_2025.map(r => ({
    ...r,
    id: generateId(),
    projectedAmount: r.baseAmount,
    description: '',
    isNew: false,
  }));

const createInitialExpenses = (): ProjectionItem[] => 
  BASE_EXPENSES_2025.map(e => ({
    ...e,
    id: generateId(),
    projectedAmount: e.baseAmount,
    description: '',
    isNew: false,
  }));

export function useGrowthSimulation() {
  const [scenarioName, setScenarioName] = useState('Varsayılan Senaryo');
  const [revenues, setRevenues] = useState<ProjectionItem[]>(createInitialRevenues);
  const [expenses, setExpenses] = useState<ProjectionItem[]>(createInitialExpenses);
  const [investments, setInvestments] = useState<InvestmentItem[]>([]);
  const [assumedExchangeRate, setAssumedExchangeRate] = useState(45);
  const [notes, setNotes] = useState('');

  // Calculate summary
  const summary: SimulationSummary = useMemo(() => {
    const totalProjectedRevenue = revenues.reduce((sum, r) => sum + r.projectedAmount, 0);
    const totalProjectedExpense = expenses.reduce((sum, e) => sum + e.projectedAmount, 0);
    const totalInvestment = investments.reduce((sum, i) => sum + i.amount, 0);
    const projectedProfit = totalProjectedRevenue - totalProjectedExpense;

    return {
      base: {
        totalRevenue: TOTAL_BASE_REVENUE_2025,
        totalExpense: TOTAL_BASE_EXPENSE_2025,
        netProfit: NET_PROFIT_2025,
        profitMargin: (NET_PROFIT_2025 / TOTAL_BASE_REVENUE_2025) * 100,
      },
      projected: {
        totalRevenue: totalProjectedRevenue,
        totalExpense: totalProjectedExpense,
        netProfit: projectedProfit,
        profitMargin: totalProjectedRevenue > 0 ? (projectedProfit / totalProjectedRevenue) * 100 : 0,
      },
      growth: {
        revenueGrowth: TOTAL_BASE_REVENUE_2025 > 0 
          ? ((totalProjectedRevenue - TOTAL_BASE_REVENUE_2025) / TOTAL_BASE_REVENUE_2025) * 100 
          : 0,
        expenseGrowth: TOTAL_BASE_EXPENSE_2025 > 0 
          ? ((totalProjectedExpense - TOTAL_BASE_EXPENSE_2025) / TOTAL_BASE_EXPENSE_2025) * 100 
          : 0,
        profitGrowth: NET_PROFIT_2025 > 0 
          ? ((projectedProfit - NET_PROFIT_2025) / NET_PROFIT_2025) * 100 
          : 0,
      },
      capitalNeeds: {
        totalInvestment,
        projectedProfit,
        netCapitalNeed: Math.max(0, totalInvestment - projectedProfit),
      },
    };
  }, [revenues, expenses, investments]);

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
    setRevenues(createInitialRevenues());
    setExpenses(createInitialExpenses());
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
