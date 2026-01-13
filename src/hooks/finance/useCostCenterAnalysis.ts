import { useMemo } from 'react';
import { useFinancialDataHub } from './useFinancialDataHub';

export interface CostCenterData {
  costCenter: 'DELIVERY' | 'ADMIN' | 'SALES';
  label: string;
  description: string;
  totalAmount: number;
  transactionCount: number;
  categories: {
    code: string;
    name: string;
    amount: number;
    count: number;
  }[];
  percentOfTotal: number;
}

export interface KkegData {
  totalKkeg: number;
  items: {
    categoryCode: string;
    categoryName: string;
    amount: number;
    count: number;
    description: string;
  }[];
  percentOfExpenses: number;
}

export interface CostCenterAnalysis {
  costCenters: CostCenterData[];
  kkeg: KkegData;
  totalExpenses: number;
  deliveryRatio: number; // Delivery as % of total (cost efficiency)
  adminRatio: number;
  salesRatio: number;
  isLoading: boolean;
}

export function useCostCenterAnalysis(year: number): CostCenterAnalysis {
  const hub = useFinancialDataHub(year);

  return useMemo(() => {
    // Group expenses by cost center
    const deliveryExpenses: Map<string, { name: string; amount: number; count: number }> = new Map();
    const adminExpenses: Map<string, { name: string; amount: number; count: number }> = new Map();
    const salesExpenses: Map<string, { name: string; amount: number; count: number }> = new Map();
    const kkegItems: Map<string, { name: string; amount: number; count: number; description: string }> = new Map();

    let totalDelivery = 0;
    let totalAdmin = 0;
    let totalSales = 0;
    let totalKkeg = 0;

    // Process all expenses
    hub.expense.forEach(tx => {
      const costCenter = tx.costCenter;
      const categoryCode = tx.categoryCode || 'DIGER_OUT';
      const categoryName = tx.categoryName || 'Diğer';
      const amount = Math.abs(tx.net);

      // Track KKEG separately
      if (tx.isKkeg) {
        const existing = kkegItems.get(categoryCode);
        if (existing) {
          existing.amount += amount;
          existing.count += 1;
        } else {
          kkegItems.set(categoryCode, {
            name: categoryName,
            amount,
            count: 1,
            description: getKkegDescription(categoryCode),
          });
        }
        totalKkeg += amount;
      }

      // Group by cost center
      if (costCenter === 'DELIVERY') {
        const existing = deliveryExpenses.get(categoryCode);
        if (existing) {
          existing.amount += amount;
          existing.count += 1;
        } else {
          deliveryExpenses.set(categoryCode, { name: categoryName, amount, count: 1 });
        }
        totalDelivery += amount;
      } else if (costCenter === 'SALES') {
        const existing = salesExpenses.get(categoryCode);
        if (existing) {
          existing.amount += amount;
          existing.count += 1;
        } else {
          salesExpenses.set(categoryCode, { name: categoryName, amount, count: 1 });
        }
        totalSales += amount;
      } else {
        // Default to ADMIN
        const existing = adminExpenses.get(categoryCode);
        if (existing) {
          existing.amount += amount;
          existing.count += 1;
        } else {
          adminExpenses.set(categoryCode, { name: categoryName, amount, count: 1 });
        }
        totalAdmin += amount;
      }
    });

    const totalExpenses = totalDelivery + totalAdmin + totalSales;

    // Build cost center data
    const costCenters: CostCenterData[] = [
      {
        costCenter: 'DELIVERY',
        label: 'Teslimat Maliyetleri',
        description: 'Müşteri projesi/hizmeti için doğrudan yapılan giderler (622)',
        totalAmount: totalDelivery,
        transactionCount: Array.from(deliveryExpenses.values()).reduce((sum, c) => sum + c.count, 0),
        categories: Array.from(deliveryExpenses.entries())
          .map(([code, data]) => ({ code, name: data.name, amount: data.amount, count: data.count }))
          .sort((a, b) => b.amount - a.amount),
        percentOfTotal: totalExpenses > 0 ? (totalDelivery / totalExpenses) * 100 : 0,
      },
      {
        costCenter: 'ADMIN',
        label: 'Genel Yönetim Giderleri',
        description: 'Ofis, personel, muhasebe, hukuk ve idari giderler (632)',
        totalAmount: totalAdmin,
        transactionCount: Array.from(adminExpenses.values()).reduce((sum, c) => sum + c.count, 0),
        categories: Array.from(adminExpenses.entries())
          .map(([code, data]) => ({ code, name: data.name, amount: data.amount, count: data.count }))
          .sort((a, b) => b.amount - a.amount),
        percentOfTotal: totalExpenses > 0 ? (totalAdmin / totalExpenses) * 100 : 0,
      },
      {
        costCenter: 'SALES',
        label: 'Pazarlama & Satış Giderleri',
        description: 'Reklam, fuar, pazarlama ve satış ekibi giderleri (631)',
        totalAmount: totalSales,
        transactionCount: Array.from(salesExpenses.values()).reduce((sum, c) => sum + c.count, 0),
        categories: Array.from(salesExpenses.entries())
          .map(([code, data]) => ({ code, name: data.name, amount: data.amount, count: data.count }))
          .sort((a, b) => b.amount - a.amount),
        percentOfTotal: totalExpenses > 0 ? (totalSales / totalExpenses) * 100 : 0,
      },
    ];

    // Build KKEG data
    const kkeg: KkegData = {
      totalKkeg,
      items: Array.from(kkegItems.entries())
        .map(([code, data]) => ({
          categoryCode: code,
          categoryName: data.name,
          amount: data.amount,
          count: data.count,
          description: data.description,
        }))
        .sort((a, b) => b.amount - a.amount),
      percentOfExpenses: totalExpenses > 0 ? (totalKkeg / totalExpenses) * 100 : 0,
    };

    return {
      costCenters,
      kkeg,
      totalExpenses,
      deliveryRatio: totalExpenses > 0 ? (totalDelivery / totalExpenses) * 100 : 0,
      adminRatio: totalExpenses > 0 ? (totalAdmin / totalExpenses) * 100 : 0,
      salesRatio: totalExpenses > 0 ? (totalSales / totalExpenses) * 100 : 0,
      isLoading: hub.isLoading,
    };
  }, [hub.expense, hub.isLoading]);
}

// Helper to get KKEG descriptions
function getKkegDescription(categoryCode: string): string {
  const descriptions: Record<string, string> = {
    TEMSIL: 'Temsil ve ağırlama giderleri (belirli limitler aşıldığında)',
    KKEG: 'Kanunen kabul edilmeyen giderler',
    CEZA: 'Vergi cezaları ve gecikme faizleri',
  };
  return descriptions[categoryCode] || 'Vergi matrahından düşülemeyen gider';
}
