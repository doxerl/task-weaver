import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MonthlyDataPoint } from '@/types/reports';
import { useMemo } from 'react';

interface MonthlyTrendChartProps {
  data: MonthlyDataPoint[];
  formatAmount?: (value: number) => string;
}

const defaultFormatCurrency = (value: number) => {
  if (value >= 1000000) return `₺${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₺${(value / 1000).toFixed(0)}K`;
  return `₺${value.toFixed(0)}`;
};

export function MonthlyTrendChart({ data, formatAmount }: MonthlyTrendChartProps) {
  // Create short format based on whether we have custom formatAmount
  const formatShort = useMemo(() => {
    if (formatAmount) {
      return (value: number) => {
        const formatted = formatAmount(value);
        const isUsd = formatted.includes('$');
        const symbol = isUsd ? '$' : '₺';
        if (value >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${symbol}${(value / 1000).toFixed(0)}K`;
        return `${symbol}${value.toFixed(0)}`;
      };
    }
    return defaultFormatCurrency;
  }, [formatAmount]);

  const tooltipFormatter = useMemo(() => {
    const formatter = formatAmount || ((v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v));
    return (value: number, name: string) => [formatter(value), name === 'income' ? 'Gelir' : name === 'expense' ? 'Gider' : 'Net'];
  }, [formatAmount]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="monthName" tick={{ fontSize: 12, fill: '#64748b' }} />
        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={formatShort} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={formatShort} />
        <Tooltip
          formatter={tooltipFormatter}
          labelFormatter={(label) => `${label}`}
          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}
        />
        <Legend formatter={(value) => value === 'income' ? 'Gelir' : value === 'expense' ? 'Gider' : 'Net Kâr'} />
        <Bar yAxisId="left" dataKey="income" fill="#16a34a" name="income" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="left" dataKey="expense" fill="#ef4444" name="expense" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={2} name="net" dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
