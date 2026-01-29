import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, Lock, Unlock, Calculator } from 'lucide-react';
import { useOfficialIncomeStatement, calculateStatementTotals } from '@/hooks/finance/useOfficialIncomeStatement';
import { INCOME_STATEMENT_GROUPS, YearlyIncomeStatementFormData } from '@/types/officialFinance';
import { formatFullTRY } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

interface OfficialIncomeStatementFormProps {
  year: number;
}

export function OfficialIncomeStatementForm({ year }: OfficialIncomeStatementFormProps) {
  const { 
    officialStatement, 
    isLoading, 
    isLocked,
    emptyStatement,
    upsertStatement, 
    lockStatement, 
    unlockStatement,
    isUpdating,
  } = useOfficialIncomeStatement(year);

  const [formData, setFormData] = useState<Partial<YearlyIncomeStatementFormData>>(emptyStatement);

  // Initialize form with existing data
  useEffect(() => {
    if (officialStatement) {
      setFormData(officialStatement);
    } else {
      setFormData(emptyStatement);
    }
  }, [officialStatement, emptyStatement]);

  // Calculate totals on the fly
  const totals = useMemo(() => calculateStatementTotals(formData), [formData]);

  const handleInputChange = (field: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
  };

  const handleSave = async () => {
    await upsertStatement(formData);
  };

  const handleLock = async () => {
    await upsertStatement(formData);
    await lockStatement();
  };

  const handleUnlock = async () => {
    await unlockStatement();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {year} Yılı Resmi Gelir Tablosu
              {isLocked && (
                <Badge variant="default" className="bg-green-600">
                  <Lock className="h-3 w-3 mr-1" />
                  Kilitli
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Tekdüzen hesap planına göre gelir tablosu verilerini girin
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isLocked ? (
              <Button variant="outline" onClick={handleUnlock} disabled={isUpdating}>
                <Unlock className="h-4 w-4 mr-2" />
                Kilidi Aç
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleSave} disabled={isUpdating}>
                  <Save className="h-4 w-4 mr-2" />
                  Kaydet
                </Button>
                <Button onClick={handleLock} disabled={isUpdating}>
                  <Lock className="h-4 w-4 mr-2" />
                  Kaydet ve Kilitle
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {INCOME_STATEMENT_GROUPS.map((group, groupIdx) => (
          <div key={groupIdx}>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3">
              {group.title}
            </h3>
            <div className="grid gap-3">
              {group.accounts.map((account) => (
                <div key={account.code} className="flex items-center gap-3">
                  <Label className="w-8 text-xs text-muted-foreground">{account.code}</Label>
                  <Label className="w-56 text-sm">{account.name}</Label>
                  <div className="flex-1 max-w-xs">
                    <Input
                      type="text"
                      inputMode="decimal"
                      disabled={isLocked}
                      value={String((formData as any)[account.field] || '')}
                      onChange={(e) => handleInputChange(account.field, e.target.value)}
                      className="text-right"
                      placeholder="0"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">₺</span>
                </div>
              ))}
            </div>
            {groupIdx < INCOME_STATEMENT_GROUPS.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}

        {/* Summary Section */}
        <Separator />
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Hesaplanan Toplamlar
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span>Net Satışlar:</span>
              <span className="font-semibold">{formatFullTRY(totals.net_sales)}</span>
            </div>
            <div className="flex justify-between">
              <span>Brüt Kâr:</span>
              <span className="font-semibold">{formatFullTRY(totals.gross_profit)}</span>
            </div>
            <div className="flex justify-between">
              <span>Faaliyet Kârı:</span>
              <span className="font-semibold">{formatFullTRY(totals.operating_profit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Net Kâr:</span>
              <span className={`font-bold ${totals.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatFullTRY(totals.net_profit)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
