import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ExpenseCategory } from '@/types/reports';
import { useMemo } from 'react';
import { formatCompact } from '@/lib/formatters';

interface ExpenseCategoryChartProps {
  data: ExpenseCategory[];
  formatAmount?: (value: number) => string;
  formatCompactAmount?: (value: number) => string;
}

const defaultFormatFullCurrency = (value: number) => new Intl.NumberFormat('tr-TR', { 
  style: 'currency', 
  currency: 'TRY', 
  maximumFractionDigits: 0 
}).format(value);

// PDF uyumluluğu için hex renk değerleri (CSS değişkenleri html2canvas'ta çalışmıyor)
const GRADIENT_COLORS = [
  '#2563eb', // chart-1 (blue-600)
  '#16a34a', // chart-2 (green-600)
  '#ea580c', // chart-3 (orange-600)
  '#8b5cf6', // chart-4 (violet-500)
  '#ec4899', // chart-5 (pink-500)
  '#64748b', // muted-foreground (slate-500)
  '#94a3b8', // muted (slate-400)
];

export function ExpenseCategoryChart({ data, formatAmount, formatCompactAmount }: ExpenseCategoryChartProps) {
  const formatter = formatAmount || defaultFormatFullCurrency;
  
  // Use provided compact formatter or default to TRY
  const compactFormatter = useMemo(() => {
    if (formatCompactAmount) {
      return formatCompactAmount;
    }
    return (value: number) => formatCompact(value, 'TRY');
  }, [formatCompactAmount]);

  const top7 = useMemo(() => {
    return data.slice(0, 7).map((item, index) => ({
      ...item,
      displayName: item.name,
      color: GRADIENT_COLORS[index] || GRADIENT_COLORS[GRADIENT_COLORS.length - 1]
    }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={380}>
      <BarChart 
        data={top7} 
        layout="vertical" 
        margin={{ top: 10, right: 60, left: 10, bottom: 10 }}
      >
        <XAxis 
          type="number" 
          tick={{ fontSize: 10, fill: '#64748b' }} 
          tickFormatter={compactFormatter} 
          axisLine={false}
          tickLine={false}
        />
        <YAxis 
          type="category" 
          dataKey="displayName" 
          tick={{ fontSize: 11, fill: '#0f172a' }} 
          width={220} 
          axisLine={false}
          tickLine={false}
        />
        <Tooltip 
          formatter={(value: number) => formatter(value)} 
          contentStyle={{ 
            backgroundColor: '#ffffff', 
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '8px 12px'
          }}
          labelFormatter={(label) => {
            const item = top7.find(d => d.displayName === label);
            return item?.name || label;
          }}
        />
        <Bar 
          dataKey="amount" 
          radius={[0, 6, 6, 0]}
          fill="#2563eb"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
