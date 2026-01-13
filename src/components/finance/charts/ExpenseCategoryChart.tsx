import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ExpenseCategory } from '@/types/reports';
import { useMemo } from 'react';

interface ExpenseCategoryChartProps {
  data: ExpenseCategory[];
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `₺${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₺${(value / 1000).toFixed(0)}K`;
  return `₺${value.toFixed(0)}`;
};

const formatFullCurrency = (value: number) => new Intl.NumberFormat('tr-TR', { 
  style: 'currency', 
  currency: 'TRY', 
  maximumFractionDigits: 0 
}).format(value);

const truncateName = (name: string, max: number = 18) => 
  name.length > max ? name.slice(0, max) + '...' : name;

// Gradient blue colors from dark to light
const GRADIENT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--muted))',
];

export function ExpenseCategoryChart({ data }: ExpenseCategoryChartProps) {
  const top7 = useMemo(() => {
    return data.slice(0, 7).map((item, index) => ({
      ...item,
      displayName: truncateName(item.name),
      color: GRADIENT_COLORS[index] || GRADIENT_COLORS[GRADIENT_COLORS.length - 1]
    }));
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart 
        data={top7} 
        layout="vertical" 
        margin={{ top: 5, right: 50, left: 5, bottom: 5 }}
      >
        <XAxis 
          type="number" 
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
          tickFormatter={formatCurrency} 
          axisLine={false}
          tickLine={false}
        />
        <YAxis 
          type="category" 
          dataKey="displayName" 
          tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} 
          width={120} 
          axisLine={false}
          tickLine={false}
        />
        <Tooltip 
          formatter={(value: number) => formatFullCurrency(value)} 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))', 
            border: '1px solid hsl(var(--border))',
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
          fill="hsl(var(--chart-1))"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
