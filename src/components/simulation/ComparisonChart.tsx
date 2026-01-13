import { useMemo, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ProjectionItem } from '@/types/simulation';

interface ComparisonChartProps {
  revenues: ProjectionItem[];
  expenses: ProjectionItem[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
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

export const ComparisonChart = forwardRef<HTMLDivElement, ComparisonChartProps>(
  function ComparisonChart({ revenues, expenses }, ref) {
    const revenueChartData = useMemo(() => 
      revenues.map(r => ({
        name: r.category.length > 15 ? r.category.substring(0, 12) + '...' : r.category,
        fullName: r.category,
        '2025': r.baseAmount,
        '2026': r.projectedAmount,
      })),
      [revenues]
    );

    const expenseChartData = useMemo(() => 
      expenses.map(e => ({
        name: e.category.length > 15 ? e.category.substring(0, 12) + '...' : e.category,
        fullName: e.category,
        '2025': e.baseAmount,
        '2026': e.projectedAmount,
      })),
      [expenses]
    );

    const revenuePieData = useMemo(() => 
      revenues
        .filter(r => r.projectedAmount > 0)
        .map(r => ({
          name: r.category,
          value: r.projectedAmount,
        })),
      [revenues]
    );

    const expensePieData = useMemo(() => 
      expenses
        .filter(e => e.projectedAmount > 0)
        .map(e => ({
          name: e.category,
          value: e.projectedAmount,
        })),
      [expenses]
    );

    return (
      <div ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-background p-4">
        {/* Revenue Comparison Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gelir Karşılaştırması</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={formatUSD} className="text-xs" />
                <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="2025" fill="hsl(var(--muted-foreground))" name="2025 Gerçek" />
                <Bar dataKey="2026" fill="hsl(var(--primary))" name="2026 Hedef" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Distribution Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">2026 Gelir Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={revenuePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name.substring(0, 10)}${name.length > 10 ? '...' : ''} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {revenuePieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatUSD(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Comparison Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gider Karşılaştırması</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={expenseChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={formatUSD} className="text-xs" />
                <YAxis type="category" dataKey="name" width={100} className="text-xs" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="2025" fill="hsl(var(--muted-foreground))" name="2025 Gerçek" />
                <Bar dataKey="2026" fill="hsl(var(--destructive))" name="2026 Plan" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Distribution Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">2026 Gider Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={expensePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name.substring(0, 8)}${name.length > 8 ? '...' : ''} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {expensePieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatUSD(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  }
);
