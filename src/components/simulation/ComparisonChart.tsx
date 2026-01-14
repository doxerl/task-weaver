import { useMemo, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ProjectionItem } from '@/types/simulation';

interface ComparisonChartProps {
  revenues: ProjectionItem[];
  expenses: ProjectionItem[];
  baseYear: number;
  targetYear: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
];

function formatUSD(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3">
        <p className="font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatUSD(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface ProcessedPieData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

function processPieData(items: ProjectionItem[], threshold: number = 0.03): ProcessedPieData[] {
  const total = items.reduce((sum, item) => sum + item.projectedAmount, 0);
  if (total === 0) return [];

  const withPercentage = items
    .filter(item => item.projectedAmount > 0)
    .map(item => ({
      name: item.category,
      value: item.projectedAmount,
      percentage: item.projectedAmount / total,
    }))
    .sort((a, b) => b.value - a.value);

  const mainItems = withPercentage.filter(item => item.percentage >= threshold);
  const otherItems = withPercentage.filter(item => item.percentage < threshold);

  const result: ProcessedPieData[] = mainItems.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
    percentage: item.percentage * 100,
  }));

  if (otherItems.length > 0) {
    const otherTotal = otherItems.reduce((sum, item) => sum + item.value, 0);
    const otherPercentage = otherTotal / total;
    result.push({
      name: 'Diğer',
      value: otherTotal,
      color: 'hsl(var(--muted-foreground))',
      percentage: otherPercentage * 100,
    });
  }

  return result;
}

interface PieLegendProps {
  data: ProcessedPieData[];
}

function PieLegend({ data }: PieLegendProps) {
  return (
    <div className="grid grid-cols-1 gap-1.5 mt-3 px-2">
      {data.map((item, index) => (
        <div key={index} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: item.color }} 
            />
            <span className="truncate text-muted-foreground">{item.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className="font-medium">{formatUSD(item.value)}</span>
            <span className="text-muted-foreground w-10 text-right">{item.percentage.toFixed(0)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export const ComparisonChart = forwardRef<HTMLDivElement, ComparisonChartProps>(
  function ComparisonChart({ revenues, expenses, baseYear, targetYear }, ref) {
    const revenueChartData = useMemo(() => 
      revenues.map(r => ({
        name: r.category.length > 20 ? r.category.substring(0, 18) + '...' : r.category,
        fullName: r.category,
        base: r.baseAmount,
        target: r.projectedAmount,
      })),
      [revenues]
    );

    const expenseChartData = useMemo(() => 
      expenses.map(e => ({
        name: e.category.length > 20 ? e.category.substring(0, 18) + '...' : e.category,
        fullName: e.category,
        base: e.baseAmount,
        target: e.projectedAmount,
      })),
      [expenses]
    );

    const revenuePieData = useMemo(() => processPieData(revenues), [revenues]);
    const expensePieData = useMemo(() => processPieData(expenses), [expenses]);

    const revenueBarHeight = Math.max(250, revenues.length * 40);
    const expenseBarHeight = Math.max(280, expenses.length * 35);

    return (
      <div ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-background p-4">
        {/* Revenue Comparison Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gelir Karşılaştırması</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={revenueBarHeight}>
              <BarChart data={revenueChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={formatUSD} className="text-xs" axisLine={false} tickLine={false} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={140} 
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="base" fill="hsl(var(--muted-foreground))" name={`${baseYear} Gerçek`} radius={[0, 4, 4, 0]} />
                <Bar dataKey="target" fill="hsl(var(--primary))" name={`${targetYear} Hedef`} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Distribution Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{targetYear} Gelir Dağılımı</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={revenuePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {revenuePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatUSD(value)} />
              </PieChart>
            </ResponsiveContainer>
            <PieLegend data={revenuePieData} />
          </CardContent>
        </Card>

        {/* Expense Comparison Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gider Karşılaştırması</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={expenseBarHeight}>
              <BarChart data={expenseChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                <XAxis type="number" tickFormatter={formatUSD} className="text-xs" axisLine={false} tickLine={false} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={140} 
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="base" fill="hsl(var(--muted-foreground))" name={`${baseYear} Gerçek`} radius={[0, 4, 4, 0]} />
                <Bar dataKey="target" fill="hsl(var(--destructive))" name={`${targetYear} Plan`} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Distribution Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{targetYear} Gider Dağılımı</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={expensePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {expensePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatUSD(value)} />
              </PieChart>
            </ResponsiveContainer>
            <PieLegend data={expensePieData} />
          </CardContent>
        </Card>
      </div>
    );
  }
);
