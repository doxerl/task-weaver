export interface ProjectionItem {
  id: string;
  category: string;
  baseAmount: number;      // 2025 actual (USD)
  projectedAmount: number; // 2026 target (USD)
  description: string;
  isNew: boolean;
  startMonth?: number;     // 1-12 for new items
}

export interface InvestmentItem {
  id: string;
  name: string;
  amount: number;          // USD
  description: string;
  month: number;           // 1-12
}

export interface SimulationScenario {
  id: string;
  name: string;
  revenues: ProjectionItem[];
  expenses: ProjectionItem[];
  investments: InvestmentItem[];
  assumedExchangeRate: number;  // TL/USD for display
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SimulationSummary {
  base: {
    totalRevenue: number;
    totalExpense: number;
    netProfit: number;
    profitMargin: number;
  };
  projected: {
    totalRevenue: number;
    totalExpense: number;
    netProfit: number;
    profitMargin: number;
  };
  growth: {
    revenueGrowth: number;
    expenseGrowth: number;
    profitGrowth: number;
  };
  capitalNeeds: {
    totalInvestment: number;
    projectedProfit: number;
    netCapitalNeed: number;
  };
}

// 2025 Reference Data (USD) - based on actual bank data
export const BASE_REVENUES_2025: Omit<ProjectionItem, 'id' | 'projectedAmount' | 'description' | 'isNew'>[] = [
  { category: 'SBT Tracker', baseAmount: 70290 },
  { category: 'Leadership Denetim', baseAmount: 55454 },
  { category: 'Danışmanlık', baseAmount: 17819 },
  { category: 'ZDHC InCheck', baseAmount: 3219 },
];

export const BASE_EXPENSES_2025: Omit<ProjectionItem, 'id' | 'projectedAmount' | 'description' | 'isNew'>[] = [
  { category: 'Personel (Brüt+SGK)', baseAmount: 48272 },
  { category: 'Yazılım/Abonelik', baseAmount: 16291 },
  { category: 'Kira', baseAmount: 9165 },
  { category: 'Seyahat', baseAmount: 3535 },
  { category: 'Pazarlama/Fuar', baseAmount: 1967 },
  { category: 'Telekomünikasyon', baseAmount: 2529 },
  { category: 'Muhasebe', baseAmount: 2291 },
  { category: 'Danışmanlık Gideri', baseAmount: 4350 },
  { category: 'Diğer', baseAmount: 10185 },
];

export const TOTAL_BASE_REVENUE_2025 = BASE_REVENUES_2025.reduce((sum, r) => sum + r.baseAmount, 0);
export const TOTAL_BASE_EXPENSE_2025 = BASE_EXPENSES_2025.reduce((sum, e) => sum + e.baseAmount, 0);
export const NET_PROFIT_2025 = TOTAL_BASE_REVENUE_2025 - TOTAL_BASE_EXPENSE_2025;
