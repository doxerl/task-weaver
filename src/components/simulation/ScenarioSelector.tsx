import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  FolderOpen, 
  Trash2, 
  Copy, 
  Check,
  Loader2,
  TrendingUp,
  TrendingDown,
  Rocket
} from 'lucide-react';
import { SimulationScenario } from '@/types/simulation';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getScenarioTypeBadge } from '@/utils/scenarioLabels';

interface ScenarioSelectorProps {
  scenarios: SimulationScenario[];
  currentScenarioId: string | null;
  isLoading: boolean;
  onSelect: (scenario: SimulationScenario) => void;
  onDelete: (id: string) => Promise<boolean>;
  onDuplicate: (id: string) => Promise<string | null>;
}

export function ScenarioSelector({
  scenarios,
  currentScenarioId,
  isLoading,
  onSelect,
  onDelete,
  onDuplicate,
}: ScenarioSelectorProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setIsDeleting(true);
    await onDelete(deleteId);
    setIsDeleting(false);
    setDeleteId(null);
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDuplicatingId(id);
    await onDuplicate(id);
    setDuplicatingId(null);
  };

  if (scenarios.length === 0 && !isLoading) {
    return null;
  }

  // Group scenarios by type
  const positiveScenarios = scenarios.filter(s => s.scenarioType !== 'negative');
  const negativeScenarios = scenarios.filter(s => s.scenarioType === 'negative');

  const renderScenarioItem = (scenario: SimulationScenario) => {
    const badgeInfo = getScenarioTypeBadge(scenario);
    
    const getBadgeIcon = () => {
      if (badgeInfo.variant === 'growth') return <Rocket className="h-2.5 w-2.5 mr-0.5" />;
      if (badgeInfo.variant === 'positive') return <TrendingUp className="h-2.5 w-2.5 mr-0.5" />;
      return <TrendingDown className="h-2.5 w-2.5 mr-0.5" />;
    };
    
    return (
      <DropdownMenuItem
        key={scenario.id}
        className="flex items-center justify-between cursor-pointer p-3"
        onClick={() => onSelect(scenario)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {currentScenarioId === scenario.id && (
              <Check className="h-3 w-3 text-primary shrink-0" />
            )}
            <span className="font-medium truncate">
              {scenario.targetYear} {scenario.name}
            </span>
            <Badge 
              variant="outline" 
              className={`text-[10px] px-1.5 py-0 shrink-0 ${badgeInfo.colorClass}`}
            >
              {getBadgeIcon()}
              {badgeInfo.label} v{scenario.version || 1}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {scenario.updatedAt && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(scenario.updatedAt), 'd MMM yyyy HH:mm', { locale: tr })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => handleDuplicate(scenario.id, e)}
            disabled={duplicatingId === scenario.id}
          >
            {duplicatingId === scenario.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(scenario.id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </DropdownMenuItem>
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" disabled={isLoading}>
            <FolderOpen className="h-4 w-4" />
            Senaryolar
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          {scenarios.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Kayıtlı senaryo yok
            </div>
          ) : (
            <>
              {positiveScenarios.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Pozitif Senaryolar
                  </div>
                  {positiveScenarios.map(renderScenarioItem)}
                </>
              )}
              
              {positiveScenarios.length > 0 && negativeScenarios.length > 0 && (
                <DropdownMenuSeparator />
              )}
              
              {negativeScenarios.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-red-600 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    Negatif Senaryolar
                  </div>
                  {negativeScenarios.map(renderScenarioItem)}
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Senaryoyu Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu senaryoyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
