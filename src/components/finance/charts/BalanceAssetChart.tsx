import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface AssetData {
  cashAndBanks: number;
  receivables: number;
  partnerReceivables: number;
  vatReceivable: number;
  otherVat: number;
  fixedAssetsNet: number;
}

interface BalanceAssetChartProps {
  data: AssetData;
  formatAmount?: (value: number) => string;
}

const defaultFormatCurrency = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);

// Green color palette for assets
const COLORS = [
  'hsl(142, 71%, 45%)',  // Green - Cash & Banks
  'hsl(142, 60%, 55%)',  // Light Green - Receivables
  'hsl(160, 60%, 45%)',  // Teal - Partner Receivables
  'hsl(175, 55%, 50%)',  // Cyan - VAT Receivable
  'hsl(190, 50%, 55%)',  // Light Cyan - Other VAT
  'hsl(100, 45%, 50%)',  // Lime - Fixed Assets
];

export function BalanceAssetChart({ data, formatAmount }: BalanceAssetChartProps) {
  const formatter = formatAmount || defaultFormatCurrency;

  const chartData = useMemo(() => {
    const items = [
      { name: 'Hazır Değerler', value: data.cashAndBanks, color: COLORS[0] },
      { name: 'Ticari Alacaklar', value: data.receivables, color: COLORS[1] },
      { name: 'Ortaklardan Alacaklar', value: data.partnerReceivables, color: COLORS[2] },
      { name: 'İndirilecek KDV', value: data.vatReceivable, color: COLORS[3] },
      { name: 'Diğer KDV', value: data.otherVat, color: COLORS[4] },
      { name: 'Duran Varlıklar (Net)', value: data.fixedAssetsNet, color: COLORS[5] },
    ].filter(item => item.value > 0);

    const total = items.reduce((sum, item) => sum + item.value, 0);
    return items.map(item => ({
      ...item,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0',
    }));
  }, [data]);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Varlık verisi bulunamadı
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={false}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatter(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend - inline styles for PDF compatibility */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate" style={{ color: '#64748b' }}>{item.name}</span>
            <span className="font-medium ml-auto" style={{ color: '#0f172a' }}>{item.percentage}%</span>
          </div>
        ))}
      </div>

      {/* Total - inline styles for PDF compatibility */}
      <div className="flex justify-between items-center pt-2 border-t text-sm">
        <span className="font-medium" style={{ color: '#0f172a' }}>Toplam Varlıklar</span>
        <span className="font-bold" style={{ color: '#16a34a' }}>{formatter(total)}</span>
      </div>
    </div>
  );
}
