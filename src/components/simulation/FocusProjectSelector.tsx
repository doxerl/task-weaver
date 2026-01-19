import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, DollarSign, Users, Megaphone, Settings, AlertCircle } from 'lucide-react';
import { ProjectionItem, InvestmentAllocation } from '@/types/simulation';
import { formatCompactUSD } from '@/lib/formatters';

interface FocusProjectSelectorProps {
  revenues: ProjectionItem[];
  focusProjects: string[];
  focusProjectPlan: string;
  investmentAllocation: InvestmentAllocation;
  onFocusProjectsChange: (projects: string[]) => void;
  onFocusProjectPlanChange: (plan: string) => void;
  onInvestmentAllocationChange: (allocation: InvestmentAllocation) => void;
}

export const FocusProjectSelector = ({
  revenues,
  focusProjects,
  focusProjectPlan,
  investmentAllocation,
  onFocusProjectsChange,
  onFocusProjectPlanChange,
  onInvestmentAllocationChange
}: FocusProjectSelectorProps) => {
  const selectedRevenues = revenues.filter(r => focusProjects.includes(r.category));
  
  // Combined totals for selected projects
  const combinedCurrentRevenue = selectedRevenues.reduce((sum, r) => sum + r.baseAmount, 0);
  const combinedProjectedRevenue = selectedRevenues.reduce((sum, r) => sum + r.projectedAmount, 0);
  const growthPercent = combinedCurrentRevenue > 0 
    ? ((combinedProjectedRevenue - combinedCurrentRevenue) / combinedCurrentRevenue) * 100 
    : 0;
  
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
  
  const handleProjectToggle = (category: string, checked: boolean) => {
    if (checked) {
      onFocusProjectsChange([...focusProjects, category]);
    } else {
      onFocusProjectsChange(focusProjects.filter(p => p !== category));
    }
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
          Yatırım Odak Projeleri
          {focusProjects.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {focusProjects.length} proje seçili
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          Yatırımın hangi projeler için kullanılacağını belirtin (max 2 proje). AI analizi seçili projelere odaklanacak.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project Selection - Checkbox List */}
        <div className="space-y-2">
          <Label className="text-xs">Yatırım Projeleri (max 2 seçim)</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {revenues.map(r => {
              const isSelected = focusProjects.includes(r.category);
              const isDisabled = !isSelected && focusProjects.length >= 2;
              
              return (
                <div 
                  key={r.category} 
                  className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                    isSelected 
                      ? 'bg-primary/10 border-primary/30' 
                      : isDisabled 
                        ? 'bg-muted/30 border-border/30 opacity-50' 
                        : 'bg-muted/50 border-border hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id={r.category}
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={(checked) => handleProjectToggle(r.category, checked as boolean)}
                    />
                    <label 
                      htmlFor={r.category} 
                      className={`text-sm cursor-pointer ${isDisabled ? 'cursor-not-allowed' : ''}`}
                    >
                      {r.category}
                    </label>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatCompactUSD(r.baseAmount)}</span>
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-primary">{formatCompactUSD(r.projectedAmount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Selected Projects Summary */}
        {selectedRevenues.length > 0 && (
          <div className="space-y-3">
            <Label className="text-xs">Seçili Projeler Özeti</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedRevenues.map(r => (
                <div key={r.category} className="p-2 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm font-medium truncate">{r.category}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{formatCompactUSD(r.baseAmount)}</span>
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-primary font-medium">{formatCompactUSD(r.projectedAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Combined Totals */}
            <div className="flex items-center gap-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Toplam Mevcut</p>
                <p className="font-semibold">{formatCompactUSD(combinedCurrentRevenue)}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Toplam Hedef</p>
                <p className="font-semibold text-emerald-400">{formatCompactUSD(combinedProjectedRevenue)}</p>
              </div>
              <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                +{growthPercent.toFixed(0)}%
              </Badge>
            </div>
          </div>
        )}
        
        {focusProjects.length === 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <p className="text-xs text-amber-400">En az 1 proje seçin</p>
          </div>
        )}
        
        {/* Growth Plan */}
        <div className="space-y-2">
          <Label className="text-xs">Büyüme Planı</Label>
          <Textarea
            value={focusProjectPlan}
            onChange={(e) => onFocusProjectPlanChange(e.target.value)}
            placeholder="Seçili projeler için büyüme planınızı açıklayın. Örn: SBT Tracker'ı tekstil sektörü dışına genişletme, ISO 14064 modülü ekleme, enterprise müşterilere odaklanma..."
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
