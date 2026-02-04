import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileSpreadsheet, BarChart3, Shield, Calculator, Upload, Edit, Lock, Unlock, CheckCircle } from 'lucide-react';
import { TrialBalanceUploader } from '@/components/finance/TrialBalanceUploader';
import { IncomeStatementUploader } from '@/components/finance/IncomeStatementUploader';
import { OfficialIncomeStatementForm } from '@/components/finance/OfficialIncomeStatementForm';
import { OfficialBalanceSheetForm } from '@/components/finance/OfficialBalanceSheetForm';
import { BalanceSheetUploader } from '@/components/finance/BalanceSheetUploader';
import { useYear } from '@/contexts/YearContext';
import { useOfficialIncomeStatement } from '@/hooks/finance/useOfficialIncomeStatement';
import { useYearlyBalanceSheet } from '@/hooks/finance/useYearlyBalanceSheet';
import { useTrialBalance } from '@/hooks/finance/useTrialBalance';

export default function OfficialData() {
  const navigate = useNavigate();
  const { selectedYear, setSelectedYear } = useYear();
  const [activeTab, setActiveTab] = useState('mizan');
  const [incomeMode, setIncomeMode] = useState<'upload' | 'manual'>('upload');
  const [balanceMode, setBalanceMode] = useState<'upload' | 'manual'>('upload');
  
  const { 
    isLocked: isIncomeLocked, 
    officialStatement,
    lockStatement: lockIncome, 
    unlockStatement: unlockIncome,
    isUpdating: isIncomeUpdating 
  } = useOfficialIncomeStatement(selectedYear);
  
  const { 
    isLocked: isBalanceLocked, 
    yearlyBalance,
    lockBalance, 
    isUpdating: isBalanceUpdating 
  } = useYearlyBalanceSheet(selectedYear);
  
  const { trialBalance } = useTrialBalance(selectedYear);

  const years = [2024, 2025, 2026];
  
  // Veri var mı kontrolü
  const hasIncomeData = !!officialStatement;
  const hasBalanceData = !!yearlyBalance;
  const hasMizanData = !!trialBalance?.is_approved;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Resmi Finansal Veriler</h1>
              <p className="text-muted-foreground text-sm">
                Muhasebeciden gelen resmi verileri yönetin
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select 
              value={selectedYear.toString()} 
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(isIncomeLocked || isBalanceLocked) && (
              <Badge variant="default" className="bg-green-600">
                <Shield className="h-3 w-3 mr-1" />
                Resmi Veri Aktif
              </Badge>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Calculator className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Hibrit Finansal Sistem
                </p>
                <p className="text-blue-700 dark:text-blue-300 mt-1">
                  Resmi veriler kilitlendiğinde, tüm raporlar bu verileri kullanır. 
                  Aksi halde banka işlemleri ve faturalardan dinamik hesaplama yapılır.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mizan" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Mizan
              {hasMizanData && <CheckCircle className="h-3 w-3 text-green-600" />}
            </TabsTrigger>
            <TabsTrigger value="income" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Gelir Tablosu
              {isIncomeLocked && <Lock className="h-3 w-3 text-green-600" />}
            </TabsTrigger>
            <TabsTrigger value="balance" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Bilanço
              {isBalanceLocked && <Lock className="h-3 w-3 text-green-600" />}
            </TabsTrigger>
          </TabsList>

          {/* forceMount + hidden ile component'ler unmount olmaz, state korunur */}
          <TabsContent value="mizan" className="mt-6" forceMount hidden={activeTab !== 'mizan'}>
            <div className="space-y-6">
              <TrialBalanceUploader year={selectedYear} />
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Nasıl Çalışır?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>1. Muhasebeciden aldığınız mizan Excel dosyasını yükleyin</p>
                  <p>2. Sistem hesap kodlarını otomatik olarak tanıyacaktır</p>
                  <p>3. Önizleme yaparak verileri kontrol edin</p>
                  <p>4. "Onayla ve Aktar" ile verileri gelir tablosuna aktarın</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="income" className="mt-6" forceMount hidden={activeTab !== 'income'}>
            <div className="space-y-4">
              {/* Lock Status Banner */}
              {hasIncomeData && (
                <Card className={`${isIncomeLocked ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isIncomeLocked ? (
                          <>
                            <Lock className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium text-green-900 dark:text-green-100">Gelir Tablosu Kilitli</p>
                              <p className="text-sm text-green-700 dark:text-green-300">Tüm raporlar resmi verileri kullanıyor</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <Unlock className="h-5 w-5 text-amber-600" />
                            <div>
                              <p className="font-medium text-amber-900 dark:text-amber-100">Gelir Tablosu Kilitsiz</p>
                              <p className="text-sm text-amber-700 dark:text-amber-300">Raporlar dinamik verilerden hesaplanıyor</p>
                            </div>
                          </>
                        )}
                      </div>
                      <Button 
                        variant={isIncomeLocked ? "destructive" : "default"}
                        size="sm"
                        onClick={() => isIncomeLocked ? unlockIncome() : lockIncome()}
                        disabled={isIncomeUpdating || !hasIncomeData}
                      >
                        {isIncomeLocked ? (
                          <>
                            <Unlock className="h-4 w-4 mr-2" />
                            Kilidi Aç
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Kilitle (Resmi)
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Mode selector */}
              <div className="flex gap-2">
                <Button 
                  variant={incomeMode === 'upload' ? 'default' : 'outline'}
                  onClick={() => setIncomeMode('upload')}
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Dosya Yükle
                </Button>
                <Button 
                  variant={incomeMode === 'manual' ? 'default' : 'outline'}
                  onClick={() => setIncomeMode('manual')}
                  size="sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Manuel Giriş
                </Button>
              </div>
              
              {incomeMode === 'upload' ? (
                <IncomeStatementUploader year={selectedYear} />
              ) : (
                <OfficialIncomeStatementForm year={selectedYear} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="balance" className="mt-6" forceMount hidden={activeTab !== 'balance'}>
            <div className="space-y-4">
              {/* Lock Status Banner */}
              {hasBalanceData && (
                <Card className={`${isBalanceLocked ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' : 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isBalanceLocked ? (
                          <>
                            <Lock className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium text-green-900 dark:text-green-100">Bilanço Kilitli</p>
                              <p className="text-sm text-green-700 dark:text-green-300">Tüm raporlar resmi verileri kullanıyor</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <Unlock className="h-5 w-5 text-amber-600" />
                            <div>
                              <p className="font-medium text-amber-900 dark:text-amber-100">Bilanço Kilitsiz</p>
                              <p className="text-sm text-amber-700 dark:text-amber-300">Raporlar dinamik verilerden hesaplanıyor</p>
                            </div>
                          </>
                        )}
                      </div>
                      <Button 
                        variant={isBalanceLocked ? "destructive" : "default"}
                        size="sm"
                        onClick={() => lockBalance(!isBalanceLocked)}
                        disabled={isBalanceUpdating || !hasBalanceData}
                      >
                        {isBalanceLocked ? (
                          <>
                            <Unlock className="h-4 w-4 mr-2" />
                            Kilidi Aç
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Kilitle (Resmi)
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Mode selector */}
              <div className="flex gap-2">
                <Button 
                  variant={balanceMode === 'upload' ? 'default' : 'outline'}
                  onClick={() => setBalanceMode('upload')}
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Dosya Yükle
                </Button>
                <Button 
                  variant={balanceMode === 'manual' ? 'default' : 'outline'}
                  onClick={() => setBalanceMode('manual')}
                  size="sm"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Manuel Giriş
                </Button>
              </div>
              
              {balanceMode === 'upload' ? (
                <BalanceSheetUploader year={selectedYear} />
              ) : (
                <OfficialBalanceSheetForm year={selectedYear} />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
