import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ArrowLeft, 
  Truck, 
  Building2, 
  Megaphone, 
  ChevronDown, 
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Wallet
} from 'lucide-react';
import { useCostCenterAnalysis } from '@/hooks/finance/useCostCenterAnalysis';
import { useFinancialDataHub } from '@/hooks/finance/useFinancialDataHub';
import { BottomTabBar } from '@/components/BottomTabBar';
import { useCurrency } from '@/contexts/CurrencyContext';

const COST_CENTER_ICONS = {
  DELIVERY: Truck,
  ADMIN: Building2,
  SALES: Megaphone,
};

const COST_CENTER_COLORS = {
  DELIVERY: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
  ADMIN: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30',
  SALES: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
};

const PROGRESS_COLORS = {
  DELIVERY: 'bg-blue-500',
  ADMIN: 'bg-purple-500',
  SALES: 'bg-orange-500',
};

export default function CostCenterAnalysis() {
  const [year, setYear] = useState(new Date().getFullYear());
  const analysis = useCostCenterAnalysis(year);
  const hub = useFinancialDataHub(year);
  const { formatAmount } = useCurrency();
  const [expandedCenters, setExpandedCenters] = useState<Set<string>>(new Set());

  const toggleCenter = (center: string) => {
    const newSet = new Set(expandedCenters);
    if (newSet.has(center)) {
      newSet.delete(center);
    } else {
      newSet.add(center);
    }
    setExpandedCenters(newSet);
  };

  // Calculate gross margin (Revenue - Delivery Cost)
  const grossMargin = hub.incomeSummary.net - analysis.costCenters.find(c => c.costCenter === 'DELIVERY')?.totalAmount || 0;
  const grossMarginPercent = hub.incomeSummary.net > 0 ? (grossMargin / hub.incomeSummary.net) * 100 : 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Link to="/finance/reports" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold flex-1">Maliyet Merkezi Analizi</h1>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-green-50 dark:bg-green-950/30">
            <CardContent className="p-3">
              <TrendingUp className="h-4 w-4 text-green-600 mb-1" />
              <p className="text-xs text-muted-foreground">Net Gelir</p>
              <p className="text-lg font-bold text-green-600">{formatAmount(hub.incomeSummary.net)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <Wallet className="h-4 w-4 text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Brüt Marj</p>
              <p className={`text-lg font-bold ${grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatAmount(grossMargin)}
              </p>
              <p className="text-xs text-muted-foreground">{grossMarginPercent.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Cost Center Distribution Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Gider Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.costCenters.map((center) => {
              const Icon = COST_CENTER_ICONS[center.costCenter];
              const colorClass = PROGRESS_COLORS[center.costCenter];
              
              return (
                <div key={center.costCenter} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{center.label}</span>
                    </div>
                    <span className="font-medium">{center.percentOfTotal.toFixed(1)}%</span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`absolute inset-y-0 left-0 ${colorClass} rounded-full transition-all`}
                      style={{ width: `${center.percentOfTotal}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Cost Center Details */}
        <div className="space-y-3">
          {analysis.costCenters.map((center) => {
            const Icon = COST_CENTER_ICONS[center.costCenter];
            const cardColorClass = COST_CENTER_COLORS[center.costCenter];
            const isExpanded = expandedCenters.has(center.costCenter);

            return (
              <Card key={center.costCenter} className={cardColorClass}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleCenter(center.costCenter)}>
                  <CollapsibleTrigger className="w-full">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5" />
                          <div className="text-left">
                            <p className="font-semibold">{center.label}</p>
                            <p className="text-xs text-muted-foreground">{center.transactionCount} işlem</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-bold">{formatAmount(center.totalAmount)}</p>
                            <p className="text-xs text-muted-foreground">{center.percentOfTotal.toFixed(1)}%</p>
                          </div>
                          <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 px-4">
                      <p className="text-xs text-muted-foreground mb-3">{center.description}</p>
                      <div className="space-y-2">
                        {center.categories.slice(0, 10).map((cat) => (
                          <div key={cat.code} className="flex items-center justify-between text-sm bg-background/50 rounded px-2 py-1">
                            <span>{cat.name}</span>
                            <div className="text-right">
                              <span className="font-medium">{formatAmount(cat.amount)}</span>
                              <span className="text-xs text-muted-foreground ml-2">({cat.count})</span>
                            </div>
                          </div>
                        ))}
                        {center.categories.length > 10 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{center.categories.length - 10} kategori daha
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>

        {/* KKEG Summary Card */}
        {analysis.kkeg.totalKkeg > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                KKEG (Kanunen Kabul Edilmeyen Giderler)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Toplam KKEG</p>
                  <p className="text-lg font-bold text-destructive">{formatAmount(analysis.kkeg.totalKkeg)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Giderlerin</p>
                  <p className="text-lg font-bold">{analysis.kkeg.percentOfExpenses.toFixed(1)}%</p>
                </div>
              </div>
              
              <div className="bg-destructive/10 rounded-lg p-3 text-xs text-destructive">
                <p className="font-medium mb-1">⚠️ Vergi Matrahı Etkisi</p>
                <p>Bu giderler kurumlar vergisi matrahından düşülemez. Tahmini ek vergi yükü: <span className="font-bold">{formatAmount(analysis.kkeg.totalKkeg * 0.25)}</span> (KV %25 ile)</p>
              </div>

              {analysis.kkeg.items.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-destructive/20">
                  <p className="text-xs font-medium text-muted-foreground">Detay:</p>
                  {analysis.kkeg.items.map((item) => (
                    <div key={item.categoryCode} className="flex items-center justify-between text-sm">
                      <div>
                        <span>{item.categoryName}</span>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-destructive">{formatAmount(item.amount)}</span>
                        <p className="text-xs text-muted-foreground">{item.count} işlem</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty KKEG state */}
        {analysis.kkeg.totalKkeg === 0 && (
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">KKEG Bulunmuyor</p>
                <p className="text-xs text-muted-foreground">Tüm giderler vergi matrahından düşülebilir durumda</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profitability Insight */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Karlılık İçgörüsü</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net Gelir</span>
              <span className="font-medium text-green-600">{formatAmount(hub.incomeSummary.net)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Teslimat Maliyeti (622)</span>
              <span className="font-medium text-red-600">
                -{formatAmount(analysis.costCenters.find(c => c.costCenter === 'DELIVERY')?.totalAmount || 0)}
              </span>
            </div>
            <hr />
            <div className="flex justify-between font-medium">
              <span>Brüt Kâr</span>
              <span className={grossMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatAmount(grossMargin)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Genel Yönetim (632)</span>
              <span className="font-medium text-red-600">
                -{formatAmount(analysis.costCenters.find(c => c.costCenter === 'ADMIN')?.totalAmount || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pazarlama & Satış (631)</span>
              <span className="font-medium text-red-600">
                -{formatAmount(analysis.costCenters.find(c => c.costCenter === 'SALES')?.totalAmount || 0)}
              </span>
            </div>
            <hr />
            <div className="flex justify-between font-bold">
              <span>Faaliyet Kârı</span>
              <span className={hub.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatAmount(hub.operatingProfit)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      <BottomTabBar />
    </div>
  );
}
