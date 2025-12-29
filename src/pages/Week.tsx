import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Settings, Download } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isToday, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useWeekData } from '@/hooks/useWeekData';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getISOWeekData } from '@/lib/weekUtils';
import { BottomTabBar } from '@/components/BottomTabBar';

export default function Week() {
  const navigate = useNavigate();
  const { profile, session } = useAuthContext();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [exporting, setExporting] = useState(false);
  
  const { weekData, loading } = useWeekData(currentWeekStart);
  const { weekNumber, weekYear } = getISOWeekData(currentWeekStart);

  const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const handleThisWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));


  const handleExport = async () => {
    if (!session) {
      toast({ title: 'Lütfen önce giriş yapın', variant: 'destructive' });
      navigate('/auth');
      return;
    }

    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-week', {
        body: { 
          weekStart: format(currentWeekStart, 'yyyy-MM-dd'),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      });

      if (error) throw error;

      if (data.xlsxBase64) {
        // Convert base64 to binary
        const binaryString = atob(data.xlsxBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create blob and download
        const blob = new Blob([bytes], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${data.filename}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
      }

      toast({ 
        title: 'Export başarılı', 
        description: `${data.weekNumber}. Hafta - ${data.planCount} plan, ${data.actualCount} kayıt` 
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Export başarısız', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const isCurrentWeek = isSameDay(currentWeekStart, startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleDayClick = (date: Date) => {
    navigate(`/today?date=${format(date, 'yyyy-MM-dd')}`);
  };

  // Calculate stats
  const totalPlanned = weekData.reduce((sum, day) => sum + day.planItems.length, 0);
  const totalActual = weekData.reduce((sum, day) => sum + day.actualEntries.length, 0);
  const activeDays = weekData.filter(day => day.planItems.length > 0 || day.actualEntries.length > 0).length;
  const completionRate = totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center justify-between md:justify-start gap-4">
            <h1 className="text-lg md:text-xl font-semibold">
              Merhaba, {profile?.first_name || 'Kullanıcı'}
            </h1>
            {/* Week Badge - Large and prominent */}
            <Badge variant="outline" className="text-sm md:text-base px-3 py-1 font-bold">
              {weekYear}-W{weekNumber.toString().padStart(2, '0')}
            </Badge>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="text-xs md:text-sm">
              <Download className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{exporting ? 'İndiriliyor...' : 'Excel Export'}</span>
              <span className="sm:hidden">{exporting ? '...' : 'Excel'}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} title="Ayarlar">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-7xl mx-auto py-4 md:py-6 px-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isCurrentWeek && (
              <Button variant="outline" size="sm" onClick={handleThisWeek}>
                Bu Hafta
              </Button>
            )}
          </div>
          
          <h2 className="text-sm md:text-lg font-semibold text-right">
            {format(currentWeekStart, 'd MMM', { locale: tr })} - {format(weekEnd, 'd MMM yyyy', { locale: tr })}
          </h2>
        </div>

        {/* Week Grid - Responsive: 2 cols mobile, 7 cols desktop */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 md:gap-3">
          {weekData.map((day) => {
            const dayIsToday = isToday(day.date);
            const dayTotalPlanned = day.planItems.length;
            const dayTotalActual = day.actualEntries.length;
            
            return (
              <Card 
                key={day.date.toISOString()}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  dayIsToday ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleDayClick(day.date)}
              >
                <CardHeader className="pb-2 px-2 md:px-3 pt-2 md:pt-3">
                  <CardTitle className="text-xs md:text-sm flex items-center justify-between">
                    <span className={dayIsToday ? 'text-primary font-bold' : ''}>
                      {format(day.date, 'EEE', { locale: tr })}
                    </span>
                    <span className={`text-base md:text-lg ${dayIsToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                      {format(day.date, 'd')}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 md:px-3 pb-2 md:pb-3">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {dayTotalPlanned > 0 && (
                      <Badge variant="outline" className="text-[10px] md:text-xs">
                        {dayTotalPlanned} plan
                      </Badge>
                    )}
                    {dayTotalActual > 0 && (
                      <Badge variant="secondary" className="text-[10px] md:text-xs">
                        {dayTotalActual} kayıt
                      </Badge>
                    )}
                  </div>
                  
                  <ScrollArea className="h-[80px] md:h-[120px]">
                    <div className="space-y-1">
                      {day.planItems.slice(0, 3).map(item => (
                        <div 
                          key={item.id} 
                          className="text-[10px] md:text-xs p-1 md:p-1.5 rounded bg-primary/10 truncate"
                          title={item.title}
                        >
                          <span className="text-muted-foreground">
                            {format(new Date(item.start_at), 'HH:mm')}
                          </span>
                          {' '}
                          {item.title}
                        </div>
                      ))}
                      {day.planItems.length > 3 && (
                        <div className="text-[10px] md:text-xs text-muted-foreground text-center">
                          +{day.planItems.length - 3} daha
                        </div>
                      )}
                      {day.planItems.length === 0 && day.actualEntries.length === 0 && (
                        <div className="text-[10px] md:text-xs text-muted-foreground text-center py-2 md:py-4">
                          Boş
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 md:mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  {totalPlanned}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">Toplam Plan</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-secondary-foreground">
                  {totalActual}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">Toplam Kayıt</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold">
                  {activeDays}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">Aktif Gün</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">
                  %{completionRate}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">Uyum Oranı</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <BottomTabBar />
    </div>
  );
}
