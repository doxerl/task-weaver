import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ServiceRevenue } from '@/types/reports';
import { useMemo } from 'react';

interface ServiceRevenueChartProps {
  data: ServiceRevenue[];
  formatAmount?: (value: number) => string;
}

const defaultFormatCurrency = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--muted-foreground))',
];

export function ServiceRevenueChart({ data, formatAmount }: ServiceRevenueChartProps) {
  const formatter = formatAmount || defaultFormatCurrency;

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
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
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
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors gap-2"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: item.color }} 
                />
                <span className="text-sm font-medium truncate">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-semibold whitespace-nowrap">
                  {formatter(item.amount)}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
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
