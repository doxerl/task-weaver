import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ExpenseCategory } from '@/types/reports';

interface ExpenseCategoryChartProps {
  data: ExpenseCategory[];
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `₺${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₺${(value / 1000).toFixed(0)}K`;
  return `₺${value.toFixed(0)}`;
};

export function ExpenseCategoryChart({ data }: ExpenseCategoryChartProps) {
  const top10 = data.slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={formatCurrency} className="fill-muted-foreground" />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} className="fill-muted-foreground" />
        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
        <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
          {top10.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
