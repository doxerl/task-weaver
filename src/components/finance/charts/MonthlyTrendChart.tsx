import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MonthlyDataPoint } from '@/types/reports';
import { useMemo } from 'react';

interface MonthlyTrendChartProps {
  data: MonthlyDataPoint[];
  formatAmount?: (value: number) => string;
}

// Service colors (dark → light, bottom → top)
const SERVICE_COLORS = {
  leadership: '#166534',    // Dark green (bottom)
  sbtTracker: '#16a34a',    // Green
  danismanlik: '#22c55e',   // Light green
  zdhcOther: '#86efac',     // Lightest green (top)
};

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
    return (value: number, name: string) => {
      const labels: Record<string, string> = {
        'incomeByService.leadership': 'Leadership',
        'incomeByService.sbtTracker': 'SBT Tracker',
        'incomeByService.danismanlik': 'Danışmanlık',
        'incomeByService.zdhcOther': 'ZDHC ve Diğerleri',
        'expense': 'Gider',
        'net': 'Net Kâr',
      };
      return [formatter(value), labels[name] || name];
    };
  }, [formatAmount]);

  const legendFormatter = (value: string) => {
    const labels: Record<string, string> = {
      'incomeByService.leadership': 'Leadership',
      'incomeByService.sbtTracker': 'SBT Tracker',
      'incomeByService.danismanlik': 'Danışmanlık',
      'incomeByService.zdhcOther': 'ZDHC ve Diğerleri',
      'expense': 'Gider',
      'net': 'Net Kâr',
    };
    return labels[value] || value;
  };

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
        <Legend formatter={legendFormatter} />
        {/* Stacked Income Bars - order matters: first added = bottom */}
        <Bar 
          yAxisId="left" 
          dataKey="incomeByService.leadership" 
          stackId="income"
          fill={SERVICE_COLORS.leadership} 
          name="incomeByService.leadership"
        />
        <Bar 
          yAxisId="left" 
          dataKey="incomeByService.sbtTracker" 
          stackId="income"
          fill={SERVICE_COLORS.sbtTracker} 
          name="incomeByService.sbtTracker"
        />
        <Bar 
          yAxisId="left" 
          dataKey="incomeByService.danismanlik" 
          stackId="income"
          fill={SERVICE_COLORS.danismanlik} 
          name="incomeByService.danismanlik"
        />
        <Bar 
          yAxisId="left" 
          dataKey="incomeByService.zdhcOther" 
          stackId="income"
          fill={SERVICE_COLORS.zdhcOther} 
          name="incomeByService.zdhcOther"
          radius={[4, 4, 0, 0]}
        />
        {/* Expense Bar */}
        <Bar yAxisId="left" dataKey="expense" fill="#ef4444" name="expense" radius={[4, 4, 0, 0]} />
        {/* Net Line */}
        <Line yAxisId="right" type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={2} name="net" dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
