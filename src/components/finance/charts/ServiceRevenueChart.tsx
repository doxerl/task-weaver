import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ServiceRevenue } from '@/types/reports';

interface ServiceRevenueChartProps {
  data: ServiceRevenue[];
}

const formatCurrency = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);

export function ServiceRevenueChart({ data }: ServiceRevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="amount"
          nameKey="name"
          label={({ name, percentage }) => `${name}: %${percentage.toFixed(0)}`}
          labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
