/**
 * Cap Table Editor Component
 * Visual editor for managing equity ownership and investment rounds
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PieChart,
  Users,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  DollarSign,
} from 'lucide-react';
import type { CapTableEntry, FutureRoundAssumption } from '@/types/simulation';
import { formatCurrency } from '@/lib/formatters';

interface CapTableEditorProps {
  entries: CapTableEntry[];
  rounds: FutureRoundAssumption[];
  onEntriesChange: (entries: CapTableEntry[]) => void;
  onRoundsChange: (rounds: FutureRoundAssumption[]) => void;
  preMoneyValuation?: number;
  currency?: 'TRY' | 'USD';
}

export function CapTableEditor({
  entries,
  rounds,
  onEntriesChange,
  onRoundsChange,
  preMoneyValuation = 0,
  currency = 'TRY',
}: CapTableEditorProps) {
  const { t } = useTranslation(['simulation', 'common']);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [isAddingRound, setIsAddingRound] = useState(false);

  // New entry form state
  const [newHolder, setNewHolder] = useState('');
  const [newShares, setNewShares] = useState(0);
  const [newType, setNewType] = useState<CapTableEntry['type']>('common');

  // New round form state
  const [newRoundName, setNewRoundName] = useState('');
  const [newDilution, setNewDilution] = useState(0);
  const [newInvestment, setNewInvestment] = useState(0);

  // Calculate totals
  const totals = useMemo(() => {
    const totalShares = entries.reduce((sum, e) => sum + e.shares, 0);
    const totalPercentage = entries.reduce((sum, e) => sum + e.percentage, 0);
    
    return {
      totalShares,
      totalPercentage,
      pricePerShare: totalShares > 0 ? preMoneyValuation / totalShares : 0,
    };
  }, [entries, preMoneyValuation]);

  const handleAddEntry = () => {
    if (!newHolder || newShares <= 0) return;
    
    const newTotalShares = totals.totalShares + newShares;
    
    // Recalculate all percentages
    const updatedEntries = entries.map(e => ({
      ...e,
      percentage: (e.shares / newTotalShares) * 100,
    }));
    
    const entry: CapTableEntry = {
      holder: newHolder,
      shares: newShares,
      percentage: (newShares / newTotalShares) * 100,
      type: newType,
    };
    
    onEntriesChange([...updatedEntries, entry]);
    setNewHolder('');
    setNewShares(0);
    setNewType('common');
    setIsAddingEntry(false);
  };

  const handleDeleteEntry = (holder: string) => {
    const remaining = entries.filter(e => e.holder !== holder);
    const newTotalShares = remaining.reduce((sum, e) => sum + e.shares, 0);
    
    const updated = remaining.map(e => ({
      ...e,
      percentage: newTotalShares > 0 ? (e.shares / newTotalShares) * 100 : 0,
    }));
    
    onEntriesChange(updated);
  };

  const handleAddRound = () => {
    if (!newRoundName || newDilution <= 0) return;
    
    const round: FutureRoundAssumption = {
      round: newRoundName,
      dilution_pct: newDilution / 100,
      investment_amount: newInvestment || undefined,
    };
    
    onRoundsChange([...rounds, round]);
    setNewRoundName('');
    setNewDilution(0);
    setNewInvestment(0);
    setIsAddingRound(false);
  };

  const getTypeColor = (type: CapTableEntry['type']) => {
    switch (type) {
      case 'common': return 'bg-primary/10 text-primary';
      case 'preferred': return 'bg-emerald-500/10 text-emerald-500';
      case 'options': return 'bg-blue-500/10 text-blue-500';
      case 'safe': return 'bg-amber-500/10 text-amber-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              {t('simulation:capTable.shareholders')}
            </div>
            <p className="text-2xl font-bold mt-1">{entries.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <PieChart className="h-4 w-4" />
              {t('simulation:capTable.totalShares')}
            </div>
            <p className="text-2xl font-bold mt-1">
              {totals.totalShares.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" />
              {t('simulation:capTable.pricePerShare')}
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(totals.pricePerShare, currency)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              {t('simulation:capTable.rounds')}
            </div>
            <p className="text-2xl font-bold mt-1">{rounds.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cap Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              {t('simulation:capTable.title')}
            </CardTitle>
            <CardDescription>
              {t('simulation:capTable.description')}
            </CardDescription>
          </div>
          
          <Dialog open={isAddingEntry} onOpenChange={setIsAddingEntry}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                {t('simulation:capTable.addShareholder')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('simulation:capTable.addShareholder')}</DialogTitle>
                <DialogDescription>
                  {t('simulation:capTable.addShareholderDesc')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t('simulation:capTable.holder')}</Label>
                  <Input
                    value={newHolder}
                    onChange={e => setNewHolder(e.target.value)}
                    placeholder={t('simulation:capTable.holderPlaceholder')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{t('simulation:capTable.type')}</Label>
                  <Select value={newType} onValueChange={v => setNewType(v as CapTableEntry['type'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="common">{t('simulation:capTable.types.common')}</SelectItem>
                      <SelectItem value="preferred">{t('simulation:capTable.types.preferred')}</SelectItem>
                      <SelectItem value="options">{t('simulation:capTable.types.options')}</SelectItem>
                      <SelectItem value="safe">{t('simulation:capTable.types.safe')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('simulation:capTable.shares')}</Label>
                  <Input
                    type="number"
                    value={newShares || ''}
                    onChange={e => setNewShares(Number(e.target.value))}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingEntry(false)}>
                  {t('common:cancel')}
                </Button>
                <Button onClick={handleAddEntry}>
                  {t('common:add')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('simulation:capTable.holder')}</TableHead>
                <TableHead>{t('simulation:capTable.type')}</TableHead>
                <TableHead className="text-right">{t('simulation:capTable.shares')}</TableHead>
                <TableHead className="text-right">{t('simulation:capTable.ownership')}</TableHead>
                <TableHead className="text-right">{t('simulation:capTable.value')}</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t('simulation:capTable.noEntries')}
                  </TableCell>
                </TableRow>
              ) : (
                entries.map(entry => (
                  <TableRow key={entry.holder}>
                    <TableCell className="font-medium">{entry.holder}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getTypeColor(entry.type)}>
                        {t(`simulation:capTable.types.${entry.type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {entry.shares.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {entry.percentage.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(entry.shares * totals.pricePerShare, currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteEntry(entry.holder)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {entries.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('simulation:capTable.total')}</span>
                <div className="flex gap-8">
                  <span className="font-medium">{totals.totalShares.toLocaleString()} {t('simulation:capTable.shares')}</span>
                  <span className="font-medium">{totals.totalPercentage.toFixed(2)}%</span>
                  <span className="font-medium">{formatCurrency(preMoneyValuation, currency)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Future Rounds */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('simulation:capTable.futureRounds')}
            </CardTitle>
            <CardDescription>
              {t('simulation:capTable.roundsDescription')}
            </CardDescription>
          </div>
          
          <Dialog open={isAddingRound} onOpenChange={setIsAddingRound}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Plus className="h-4 w-4" />
                {t('simulation:capTable.addRound')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('simulation:capTable.addRound')}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t('simulation:capTable.roundName')}</Label>
                  <Input
                    value={newRoundName}
                    onChange={e => setNewRoundName(e.target.value)}
                    placeholder="Series A"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{t('simulation:capTable.dilutionPct')}</Label>
                  <Input
                    type="number"
                    value={newDilution || ''}
                    onChange={e => setNewDilution(Number(e.target.value))}
                    placeholder="15"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('simulation:capTable.dilutionHint')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('simulation:capTable.investmentAmount')}</Label>
                  <Input
                    type="number"
                    value={newInvestment || ''}
                    onChange={e => setNewInvestment(Number(e.target.value))}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingRound(false)}>
                  {t('common:cancel')}
                </Button>
                <Button onClick={handleAddRound}>
                  {t('common:add')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent>
          {rounds.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t('simulation:capTable.noRounds')}
            </p>
          ) : (
            <div className="space-y-3">
              {rounds.map((round, index) => (
                <div
                  key={round.round}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{round.round}</p>
                      <p className="text-sm text-muted-foreground">
                        {(round.dilution_pct * 100).toFixed(0)}% dilution
                      </p>
                    </div>
                  </div>
                  {round.investment_amount && (
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(round.investment_amount, currency)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CapTableEditor;
