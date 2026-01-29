import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FileSpreadsheet, BarChart3, Shield, Calculator } from 'lucide-react';
import { TrialBalanceUploader } from '@/components/finance/TrialBalanceUploader';
import { OfficialIncomeStatementForm } from '@/components/finance/OfficialIncomeStatementForm';
import { useYear } from '@/contexts/YearContext';
import { useOfficialIncomeStatement } from '@/hooks/finance/useOfficialIncomeStatement';

export default function OfficialData() {
  const navigate = useNavigate();
  const { selectedYear, setSelectedYear } = useYear();
  const [activeTab, setActiveTab] = useState('mizan');
  
  const { isLocked } = useOfficialIncomeStatement(selectedYear);

  const years = [2024, 2025, 2026];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/finance')}>
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
            {isLocked && (
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
            </TabsTrigger>
            <TabsTrigger value="income" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Gelir Tablosu
            </TabsTrigger>
            <TabsTrigger value="balance" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Bilanço
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mizan" className="mt-6">
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

          <TabsContent value="income" className="mt-6">
            <OfficialIncomeStatementForm year={selectedYear} />
          </TabsContent>

          <TabsContent value="balance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Bilanço Yönetimi</CardTitle>
                <CardDescription>
                  Bilanço verileri için mevcut Bilanço sayfasını kullanın
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate('/finance/balance-sheet')}>
                  Bilanço Sayfasına Git
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
