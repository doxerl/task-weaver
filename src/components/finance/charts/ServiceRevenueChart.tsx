import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ServiceRevenue } from '@/types/reports';
import { useMemo } from 'react';
import { formatCompactUSD, formatCompactTRY } from '@/lib/formatters';

interface ServiceRevenueChartProps {
  data: ServiceRevenue[];
  formatAmount?: (value: number) => string;
}

const defaultFormatCurrency = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);

// PDF uyumluluğu için hex renk değerleri (CSS değişkenleri html2canvas'ta çalışmıyor)
const COLORS = [
  '#2563eb', // chart-1 (blue-600)
  '#16a34a', // chart-2 (green-600)
  '#ea580c', // chart-3 (orange-600)
  '#8b5cf6', // chart-4 (violet-500)
  '#ec4899', // chart-5 (pink-500)
  '#64748b', // muted-foreground (slate-500)
];

export function ServiceRevenueChart({ data, formatAmount }: ServiceRevenueChartProps) {
  const formatter = formatAmount || defaultFormatCurrency;

  // Compact formatter for legend display
  const formatCompact = useMemo(() => {
    return (value: number) => {
      if (formatAmount) {
        const sample = formatAmount(1);
        const isUsd = sample.includes('$');
        return isUsd ? formatCompactUSD(value) : formatCompactTRY(value);
      }
      return formatCompactTRY(value);
    };
  }, [formatAmount]);

  // Group small items (< 3%) into "Diğer"
  const processedData = useMemo(() => {
    const threshold = 3;
    const mainItems = data.filter(d => d.percentage >= threshold);
    const otherItems = data.filter(d => d.percentage < threshold);
    
    const result = mainItems.map((item, index) => ({
      ...item,
      color: COLORS[index % COLORS.length]
    }));

    if (otherItems.length > 0) {
      const otherTotal = otherItems.reduce((sum, d) => sum + d.amount, 0);
      const otherPercentage = otherItems.reduce((sum, d) => sum + d.percentage, 0);
      result.push({
        name: 'Diğer',
        amount: otherTotal,
        percentage: otherPercentage,
        color: COLORS[COLORS.length - 1]
      } as ServiceRevenue & { color: string });
    }
    
    return result;
  }, [data]);

  return (
    <div className="flex flex-col gap-4">
      {/* Donut Chart */}
      <div className="w-full h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={processedData}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
              dataKey="amount"
              nameKey="name"
              label={false}
              labelLine={false}
            >
              {processedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => formatter(value)} 
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 12px'
              }} 
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend Grid */}
      <div className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {processedData.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-2 rounded-lg transition-colors gap-2"
              style={{ backgroundColor: 'transparent' }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: item.color }} 
                />
                <span className="text-sm font-medium" style={{ color: '#334155' }}>
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-semibold whitespace-nowrap">
                  {formatCompact(item.amount)}
                </span>
                <span className="text-xs whitespace-nowrap" style={{ color: '#64748b' }}>
                  ({item.percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
