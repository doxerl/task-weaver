import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface LiabilityData {
  shortTermTotal: number;
  longTermTotal: number;
  equityTotal: number;
  // Detailed breakdown
  loanInstallments: number;
  tradePayables: number;
  partnerPayables: number;
  vatPayable: number;
  bankLoans: number;
  paidCapital: number;
  retainedEarnings: number;
  currentProfit: number;
}

interface BalanceLiabilityChartProps {
  data: LiabilityData;
  formatAmount?: (value: number) => string;
}

const defaultFormatCurrency = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);

// Blue/Purple color palette for liabilities/equity
const COLORS = [
  'hsl(220, 70%, 50%)',  // Blue - Short-term liabilities
  'hsl(240, 60%, 55%)',  // Indigo - Long-term liabilities
  'hsl(280, 55%, 50%)',  // Purple - Equity
];

export function BalanceLiabilityChart({ data, formatAmount }: BalanceLiabilityChartProps) {
  const formatter = formatAmount || defaultFormatCurrency;

  const chartData = useMemo(() => {
    const items = [
      { name: 'Kısa Vadeli Borçlar', value: data.shortTermTotal, color: COLORS[0] },
      { name: 'Uzun Vadeli Borçlar', value: data.longTermTotal, color: COLORS[1] },
      { name: 'Özkaynaklar', value: data.equityTotal, color: COLORS[2] },
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
        Kaynak verisi bulunamadı
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

      {/* Legend with breakdown - inline styles for PDF compatibility */}
      <div className="space-y-3 text-xs">
        {chartData.map((item, index) => (
          <div key={index}>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium" style={{ color: '#0f172a' }}>{item.name}</span>
              <span className="ml-auto" style={{ color: '#64748b' }}>{item.percentage}%</span>
              <span className="font-medium" style={{ color: '#0f172a' }}>{formatter(item.value)}</span>
            </div>
            
            {/* Detailed breakdown */}
            {item.name === 'Kısa Vadeli Borçlar' && (
              <div className="pl-5 space-y-0.5" style={{ color: '#64748b' }}>
                {data.loanInstallments > 0 && (
                  <div className="flex justify-between">
                    <span>Banka Kredileri (KV)</span>
                    <span>{formatter(data.loanInstallments)}</span>
                  </div>
                )}
                {data.tradePayables > 0 && (
                  <div className="flex justify-between">
                    <span>Satıcılar</span>
                    <span>{formatter(data.tradePayables)}</span>
                  </div>
                )}
                {data.partnerPayables > 0 && (
                  <div className="flex justify-between">
                    <span>Ortaklara Borçlar</span>
                    <span>{formatter(data.partnerPayables)}</span>
                  </div>
                )}
                {data.vatPayable > 0 && (
                  <div className="flex justify-between">
                    <span>Hesaplanan KDV</span>
                    <span>{formatter(data.vatPayable)}</span>
                  </div>
                )}
              </div>
            )}
            
            {item.name === 'Uzun Vadeli Borçlar' && data.bankLoans > 0 && (
              <div className="pl-5 space-y-0.5" style={{ color: '#64748b' }}>
                <div className="flex justify-between">
                  <span>Banka Kredileri (UV)</span>
                  <span>{formatter(data.bankLoans)}</span>
                </div>
              </div>
            )}
            
            {item.name === 'Özkaynaklar' && (
              <div className="pl-5 space-y-0.5" style={{ color: '#64748b' }}>
                {data.paidCapital > 0 && (
                  <div className="flex justify-between">
                    <span>Ödenmiş Sermaye</span>
                    <span>{formatter(data.paidCapital)}</span>
                  </div>
                )}
                {data.retainedEarnings !== 0 && (
                  <div className="flex justify-between">
                    <span>Geçmiş Yıllar Kârları</span>
                    <span>{formatter(data.retainedEarnings)}</span>
                  </div>
                )}
                {data.currentProfit !== 0 && (
                  <div className="flex justify-between">
                    <span>Dönem Net Kârı</span>
                    <span style={{ color: data.currentProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                      {formatter(data.currentProfit)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Total - inline styles for PDF compatibility */}
      <div className="flex justify-between items-center pt-2 border-t text-sm">
        <span className="font-medium" style={{ color: '#0f172a' }}>Toplam Kaynaklar</span>
        <span className="font-bold" style={{ color: '#2563eb' }}>{formatter(total)}</span>
      </div>
    </div>
  );
}
