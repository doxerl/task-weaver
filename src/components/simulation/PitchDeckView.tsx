import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Presentation,
  MessageSquare,
  FileText,
  Rocket,
  AlertTriangle,
  DollarSign,
  Calculator,
  Users,
  Download,
  Loader2
} from 'lucide-react';
import { PitchDeck, PitchSlide } from '@/types/simulation';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface PitchDeckViewProps {
  pitchDeck: PitchDeck;
  onClose?: () => void;
}

const slideIcons: Record<number, React.ReactNode> = {
  1: <Rocket className="h-5 w-5" />,
  2: <AlertTriangle className="h-5 w-5" />,
  3: <DollarSign className="h-5 w-5" />,
  4: <Calculator className="h-5 w-5" />,
  5: <Users className="h-5 w-5" />
};

const slideColors: Record<number, string> = {
  1: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
  2: 'from-red-500/20 to-orange-500/20 border-red-500/30',
  3: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
  4: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
  5: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30'
};

// PDF renk şeması (RGB)
const slidePdfColors: Record<number, { primary: [number, number, number]; light: [number, number, number] }> = {
  1: { primary: [59, 130, 246], light: [219, 234, 254] },   // Blue
  2: { primary: [239, 68, 68], light: [254, 226, 226] },    // Red
  3: { primary: [34, 197, 94], light: [220, 252, 231] },    // Green
  4: { primary: [168, 85, 247], light: [243, 232, 255] },   // Purple
  5: { primary: [245, 158, 11], light: [254, 243, 199] }    // Amber
};

const slideIconLabels: Record<number, string> = {
  1: '🚀',
  2: '⚠️',
  3: '💰',
  4: '🧮',
  5: '👥'
};

export function PitchDeckView({ pitchDeck, onClose }: PitchDeckViewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const slides = pitchDeck.slides || [];
  const slide = slides[currentSlide];

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleCopyExecutiveSummary = async () => {
    try {
      await navigator.clipboard.writeText(pitchDeck.executive_summary);
      setCopied(true);
      toast.success('Executive summary kopyalandı!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kopyalama başarısız');
    }
  };

  const handleDownloadPdf = async () => {
    if (!slides.length) return;
    
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF({ 
        orientation: 'landscape', 
        unit: 'mm', 
        format: 'a4' 
      });
      
      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      // Her slayt için sayfa oluştur
      slides.forEach((slideData, index) => {
        if (index > 0) pdf.addPage();
        
        const colors = slidePdfColors[slideData.slide_number] || slidePdfColors[1];
        const icon = slideIconLabels[slideData.slide_number] || '📄';
        
        // Arka plan gradient efekti (açık renk)
        pdf.setFillColor(colors.light[0], colors.light[1], colors.light[2]);
        pdf.rect(0, 0, pageWidth, 50, 'F');
        
        // Header bar
        pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        pdf.rect(0, 0, pageWidth, 8, 'F');
        
        // Slide numarası ve icon
        pdf.setFontSize(24);
        pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        pdf.text(`${icon} Slide ${slideData.slide_number}`, margin, 28);
        
        // Başlık
        pdf.setFontSize(20);
        pdf.setTextColor(30, 30, 30);
        pdf.text(slideData.title, margin, 42);
        
        // Key Message (vurgulu kutu)
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(margin, 52, contentWidth, 20, 3, 3, 'F');
        pdf.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(margin, 52, contentWidth, 20, 3, 3, 'S');
        
        pdf.setFontSize(12);
        pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        const keyMessageLines = pdf.splitTextToSize(slideData.key_message, contentWidth - 10);
        pdf.text(keyMessageLines, margin + 5, 64);
        
        // Content Bullets
        pdf.setFontSize(11);
        pdf.setTextColor(50, 50, 50);
        let yPos = 85;
        
        slideData.content_bullets.forEach((bullet, bulletIndex) => {
          // Numara dairesi
          pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          pdf.circle(margin + 4, yPos - 1.5, 4, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(9);
          pdf.text(String(bulletIndex + 1), margin + 2.5, yPos);
          
          // Bullet text
          pdf.setTextColor(50, 50, 50);
          pdf.setFontSize(11);
          const bulletLines = pdf.splitTextToSize(bullet, contentWidth - 20);
          pdf.text(bulletLines, margin + 15, yPos);
          yPos += bulletLines.length * 6 + 4;
        });
        
        // Speaker Notes (alt kısım)
        if (slideData.speaker_notes) {
          pdf.setDrawColor(200, 200, 200);
          pdf.line(margin, pageHeight - 40, pageWidth - margin, pageHeight - 40);
          
          pdf.setFontSize(9);
          pdf.setTextColor(120, 120, 120);
          pdf.text('Konusmaci Notlari:', margin, pageHeight - 32);
          
          pdf.setFontSize(10);
          pdf.setTextColor(80, 80, 80);
          const notesLines = pdf.splitTextToSize(slideData.speaker_notes, contentWidth);
          pdf.text(notesLines.slice(0, 3), margin, pageHeight - 25);
        }
        
        // Sayfa numarası
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`${slideData.slide_number} / ${slides.length}`, pageWidth - margin - 10, pageHeight - 10);
      });
      
      // Executive Summary sayfası
      pdf.addPage();
      
      // Header
      pdf.setFillColor(59, 130, 246);
      pdf.rect(0, 0, pageWidth, 8, 'F');
      
      pdf.setFontSize(24);
      pdf.setTextColor(59, 130, 246);
      pdf.text('📋 Executive Summary', margin, 30);
      
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Yatirimciya gonderilecek e-posta ozeti', margin, 42);
      
      // Summary content
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(margin, 50, contentWidth, pageHeight - 70, 5, 5, 'F');
      
      pdf.setFontSize(11);
      pdf.setTextColor(50, 50, 50);
      const summaryLines = pdf.splitTextToSize(pitchDeck.executive_summary, contentWidth - 20);
      pdf.text(summaryLines, margin + 10, 65);
      
      // Footer
      pdf.setFontSize(9);
      pdf.setTextColor(150, 150, 150);
      const today = new Date().toLocaleDateString('tr-TR');
      pdf.text(`Olusturulma Tarihi: ${today}`, margin, pageHeight - 10);
      pdf.text(`${slides.length + 1} / ${slides.length + 1}`, pageWidth - margin - 10, pageHeight - 10);
      
      // PDF'i indir
      pdf.save('Yatirimci_Pitch_Deck.pdf');
      toast.success('Pitch Deck PDF olarak indirildi!');
      
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      toast.error('PDF oluşturulurken hata oluştu');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!slides.length) {
    return (
      <Card className="p-8 text-center">
        <Presentation className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Henüz pitch deck oluşturulmadı</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Slide Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Presentation className="h-5 w-5 text-primary" />
          <span className="font-medium">Yatırımcı Sunumu</span>
          <Badge variant="secondary" className="ml-2">
            {currentSlide + 1} / {slides.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSpeakerNotes(!showSpeakerNotes)}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            {showSpeakerNotes ? 'Notları Gizle' : 'Konuşmacı Notları'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="gap-2"
          >
            {isGeneratingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            PDF İndir
          </Button>
        </div>
      </div>

      {/* Slide Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {slides.map((s, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`flex-shrink-0 w-20 h-14 rounded-lg border-2 transition-all ${
              index === currentSlide
                ? 'border-primary bg-primary/10'
                : 'border-border/50 bg-card hover:border-primary/50'
            }`}
          >
            <div className="flex flex-col items-center justify-center h-full gap-1">
              {slideIcons[s.slide_number] || <FileText className="h-4 w-4" />}
              <span className="text-[10px] text-muted-foreground">{s.slide_number}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Current Slide */}
      {slide && (
        <Card className={`bg-gradient-to-br ${slideColors[slide.slide_number] || 'from-card to-card'} border`}>
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-background/80 rounded-lg">
                {slideIcons[slide.slide_number] || <FileText className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">{slide.title}</CardTitle>
                <CardDescription className="mt-1 text-base font-medium text-foreground/80">
                  {slide.key_message}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {slide.content_bullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold mt-0.5">
                    {index + 1}
                  </span>
                  <span className="flex-1">{bullet}</span>
                </li>
              ))}
            </ul>

            {showSpeakerNotes && (
              <>
                <Separator />
                <div className="bg-background/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Konuşmacı Notları
                  </div>
                  <p className="text-sm italic">{slide.speaker_notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentSlide === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Önceki
        </Button>
        <div className="flex gap-1">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide ? 'bg-primary w-6' : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentSlide === slides.length - 1}
          className="gap-2"
        >
          Sonraki
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Executive Summary */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Executive Summary
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyExecutiveSummary}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Kopyalandı
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Kopyala
                </>
              )}
            </Button>
          </div>
          <CardDescription>Yatırımcıya gönderilecek e-posta özeti</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32">
            <p className="text-sm leading-relaxed">{pitchDeck.executive_summary}</p>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
