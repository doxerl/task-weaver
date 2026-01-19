import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { FinancialRatios, SECTOR_BENCHMARKS_DATA } from '@/types/simulation';

interface FinancialRatiosPanelProps {
  ratios: FinancialRatios;
}

export function FinancialRatiosPanel({ ratios }: FinancialRatiosPanelProps) {
  const benchmarks = SECTOR_BENCHMARKS_DATA['B2B Services'];
  
  const getRatioStatus = (value: number, benchmark: { good: number; average: number; poor: number }, higherIsBetter: boolean = true) => {
    if (higherIsBetter) {
      if (value >= benchmark.good) return { status: 'good', label: 'İyi', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      if (value >= benchmark.average) return { status: 'average', label: 'Orta', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
      return { status: 'poor', label: 'Dikkat', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    } else {
      if (value <= benchmark.good) return { status: 'good', label: 'İyi', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      if (value <= benchmark.average) return { status: 'average', label: 'Orta', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
      return { status: 'poor', label: 'Dikkat', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    }
  };

  const getProgressValue = (value: number, max: number = 3) => {
    return Math.min((value / max) * 100, 100);
  };

  const ratioGroups = [
    {
      title: 'Likidite Oranları',
      icon: <TrendingUp className="h-4 w-4 text-blue-400" />,
      items: [
        { 
          label: 'Cari Oran', 
          value: ratios.liquidity.currentRatio,
          format: (v: number) => v.toFixed(2),
          benchmark: benchmarks.currentRatio,
          higherIsBetter: true,
          tooltip: 'Dönen Varlık / Kısa Vadeli Borç'
        },
        { 
          label: 'Asit-Test Oranı', 
          value: ratios.liquidity.quickRatio,
          format: (v: number) => v.toFixed(2),
          benchmark: benchmarks.quickRatio,
          higherIsBetter: true,
          tooltip: '(Dönen Varlık - Stok) / Kısa Vadeli Borç'
        },
        { 
          label: 'Nakit Oranı', 
          value: ratios.liquidity.cashRatio,
          format: (v: number) => v.toFixed(2),
          benchmark: { good: 0.5, average: 0.3, poor: 0.1 },
          higherIsBetter: true,
          tooltip: 'Nakit / Kısa Vadeli Borç'
        },
      ]
    },
    {
      title: 'Borçluluk Oranları',
      icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
      items: [
        { 
          label: 'Borç/Özkaynak', 
          value: ratios.leverage.debtToEquity,
          format: (v: number) => v.toFixed(2),
          benchmark: benchmarks.debtToEquity,
          higherIsBetter: false,
          tooltip: 'Toplam Borç / Özkaynak'
        },
        { 
          label: 'Borç/Varlık', 
          value: ratios.leverage.debtToAssets,
          format: (v: number) => `%${(v * 100).toFixed(0)}`,
          benchmark: { good: 0.3, average: 0.5, poor: 0.7 },
          higherIsBetter: false,
          tooltip: 'Toplam Borç / Toplam Varlık'
        },
        { 
          label: 'Alacak/Varlık', 
          value: ratios.leverage.receivablesRatio,
          format: (v: number) => `%${(v * 100).toFixed(0)}`,
          benchmark: { good: 0.15, average: 0.25, poor: 0.35 },
          higherIsBetter: false,
          tooltip: 'Ticari Alacaklar / Toplam Varlık'
        },
      ]
    },
    {
      title: 'Karlılık Oranları',
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
      items: [
        { 
          label: 'ROA', 
          value: ratios.profitability.returnOnAssets,
          format: (v: number) => `%${v.toFixed(1)}`,
          benchmark: { good: 15, average: 10, poor: 5 },
          higherIsBetter: true,
          tooltip: 'Net Kâr / Toplam Varlık'
        },
        { 
          label: 'ROE', 
          value: ratios.profitability.returnOnEquity,
          format: (v: number) => `%${v.toFixed(1)}`,
          benchmark: benchmarks.returnOnEquity,
          higherIsBetter: true,
          tooltip: 'Net Kâr / Özkaynak'
        },
        { 
          label: 'Net Marj', 
          value: ratios.profitability.netMargin,
          format: (v: number) => `%${v.toFixed(1)}`,
          benchmark: benchmarks.netMargin,
          higherIsBetter: true,
          tooltip: 'Net Kâr / Gelir'
        },
      ]
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Finansal Oranlar (B2B Services Benchmark)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ratioGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              {group.icon}
              {group.title}
            </div>
            <div className="grid gap-2">
              {group.items.map((item, iIdx) => {
                const status = getRatioStatus(item.value, item.benchmark, item.higherIsBetter);
                return (
                  <div key={iIdx} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground" title={item.tooltip}>
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {item.format(item.value)}
                      </span>
                      <Badge variant="outline" className={`text-xs ${status.color}`}>
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Benchmark:</span> B2B Services sektör ortalamaları referans alınmıştır
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
