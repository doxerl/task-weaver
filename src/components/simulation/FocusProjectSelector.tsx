import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, DollarSign, Users, Megaphone, Settings } from 'lucide-react';
import { ProjectionItem, FocusProjectInfo, InvestmentAllocation } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';

interface FocusProjectSelectorProps {
  revenues: ProjectionItem[];
  focusProject: string;
  focusProjectPlan: string;
  investmentAllocation: InvestmentAllocation;
  onFocusProjectChange: (project: string) => void;
  onFocusProjectPlanChange: (plan: string) => void;
  onInvestmentAllocationChange: (allocation: InvestmentAllocation) => void;
}

export const FocusProjectSelector = ({
  revenues,
  focusProject,
  focusProjectPlan,
  investmentAllocation,
  onFocusProjectChange,
  onFocusProjectPlanChange,
  onInvestmentAllocationChange
}: FocusProjectSelectorProps) => {
  const selectedRevenue = revenues.find(r => r.category === focusProject);
  const totalAllocation = 
    investmentAllocation.product + 
    investmentAllocation.marketing + 
    investmentAllocation.hiring + 
    investmentAllocation.operations;
  
  const handleAllocationChange = (field: keyof InvestmentAllocation, value: number) => {
    onInvestmentAllocationChange({
      ...investmentAllocation,
      [field]: value
    });
  };
  
  const allocationItems = [
    { key: 'product' as const, label: 'Ürün Geliştirme', icon: Settings, color: 'text-blue-400' },
    { key: 'marketing' as const, label: 'Pazarlama', icon: Megaphone, color: 'text-purple-400' },
    { key: 'hiring' as const, label: 'Personel', icon: Users, color: 'text-green-400' },
    { key: 'operations' as const, label: 'Operasyonel', icon: DollarSign, color: 'text-orange-400' },
  ];
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" />
          Yatırım Odak Projesi
        </CardTitle>
        <CardDescription className="text-xs">
          Yatırımın hangi proje/ürün için kullanılacağını belirtin. AI analizi bu projeye odaklanacak.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project Selection */}
        <div className="space-y-2">
          <Label className="text-xs">Ana Yatırım Projesi</Label>
          <Select value={focusProject} onValueChange={onFocusProjectChange}>
            <SelectTrigger>
              <SelectValue placeholder="Proje seçin..." />
            </SelectTrigger>
            <SelectContent>
              {revenues.map(r => (
                <SelectItem key={r.category} value={r.category}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>{r.category}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatCompactUSD(r.projectedAmount)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedRevenue && (
            <div className="flex items-center gap-4 p-2 bg-muted/30 rounded-lg mt-2">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Mevcut Gelir</p>
                <p className="font-semibold">{formatCompactUSD(selectedRevenue.baseAmount)}</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Hedef Gelir</p>
                <p className="font-semibold text-primary">{formatCompactUSD(selectedRevenue.projectedAmount)}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Growth Plan */}
        <div className="space-y-2">
          <Label className="text-xs">Büyüme Planı</Label>
          <Textarea
            value={focusProjectPlan}
            onChange={(e) => onFocusProjectPlanChange(e.target.value)}
            placeholder="Bu proje için büyüme planınızı açıklayın. Örn: SBT Tracker'ı tekstil sektörü dışına genişletme, ISO 14064 modülü ekleme, enterprise müşterilere odaklanma..."
            rows={3}
            className="text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Bu açıklama AI analizinde kullanılacak ve projeksiyonlara yansıtılacak.
          </p>
        </div>
        
        {/* Investment Allocation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Yatırım Kullanım Dağılımı</Label>
            <span className={`text-xs font-medium ${totalAllocation === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              Toplam: %{totalAllocation}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {allocationItems.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-3 w-3 ${item.color}`} />
                    <Label className="text-[10px] text-muted-foreground">{item.label}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      min={0}
                      max={100}
                      value={investmentAllocation[item.key]} 
                      onChange={(e) => handleAllocationChange(item.key, Number(e.target.value))}
                      className="h-8 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Visual Progress Bars */}
          <div className="space-y-2 pt-2">
            {allocationItems.map(item => (
              <div key={item.key} className="flex items-center gap-2">
                <span className="text-[10px] w-20 text-muted-foreground truncate">{item.label}</span>
                <Progress 
                  value={investmentAllocation[item.key]} 
                  className="h-1.5 flex-1" 
                />
                <span className="text-[10px] w-8 text-right">{investmentAllocation[item.key]}%</span>
              </div>
            ))}
          </div>
          
          {totalAllocation !== 100 && (
            <p className="text-[10px] text-amber-400">
              ⚠️ Toplam dağılım %100 olmalıdır. Şu an: %{totalAllocation}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
