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
import { fixTextSpacingForPdf } from '@/lib/pdf/core/htmlPreparation';

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

// PDF renk şeması (CSS gradient için)
const slidePdfColors: Record<number, { primary: string; secondary: string }> = {
  1: { primary: '#3b82f6', secondary: '#6366f1' },   // Blue to Indigo
  2: { primary: '#ef4444', secondary: '#f97316' },   // Red to Orange
  3: { primary: '#22c55e', secondary: '#10b981' },   // Green to Emerald
  4: { primary: '#a855f7', secondary: '#ec4899' },   // Purple to Pink
  5: { primary: '#f59e0b', secondary: '#eab308' }    // Amber to Yellow
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
    // Boşlukları non-breaking space ile değiştirerek html2canvas'ın yutmasını engelle
    const forceSpacing = (text: string): string => {
      return text.replace(/ /g, '\u00A0');
    };
    
    setIsGeneratingPdf(true);
    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      
      const pdf = new jsPDF({ 
        orientation: 'landscape', 
        unit: 'mm', 
        format: 'a4' 
      });
      
      const pageWidth = 297;
      const pageHeight = 210;
      
      // Create temporary container for rendering
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = 'position: fixed; left: -9999px; top: 0; z-index: -1;';
      document.body.appendChild(tempContainer);
      
      // Render each slide
      for (let i = 0; i < slides.length; i++) {
        const slideData = slides[i];
        const slideNumber = slideData.slide_number;
        const colors = slidePdfColors[slideNumber] || slidePdfColors[1];
        const iconLabel = slideIconLabels[slideNumber] || '📊';
        
        // Create slide HTML
        const slideElement = document.createElement('div');
        slideElement.style.cssText = `
          width: 1120px;
          height: 794px;
          padding: 48px;
          background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: white;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        `;
        
        slideElement.innerHTML = `
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
            <div style="width: 56px; height: 56px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px;">
              ${iconLabel}
            </div>
            <div>
              <div style="font-size: 14px; opacity: 0.8; text-transform: uppercase;">Slide ${slideNumber} / ${slides.length}</div>
              <h1 style="font-size: 32px; font-weight: 700; margin: 4px 0 0 0;">${forceSpacing(slideData.title)}</h1>
            </div>
          </div>
          
          <div style="background: rgba(255,255,255,0.15); border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
            <div style="font-size: 22px; font-weight: 600; line-height: 1.4;">${forceSpacing(slideData.key_message)}</div>
          </div>
          
          <div style="flex: 1; display: flex; flex-direction: column; gap: 12px;">
            ${slideData.content_bullets.map((bullet, idx) => `
              <div style="display: flex; align-items: flex-start; gap: 12px; background: rgba(255,255,255,0.1); border-radius: 8px; padding: 14px 18px;">
                <div style="min-width: 28px; height: 28px; background: rgba(255,255,255,0.25); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;">${idx + 1}</div>
                <div style="font-size: 16px; line-height: 1.5; flex: 1;">${forceSpacing(bullet)}</div>
              </div>
            `).join('')}
          </div>
          
          ${slideData.speaker_notes ? `
            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
              <div style="font-size: 12px; text-transform: uppercase; opacity: 0.7; margin-bottom: 8px;">📝 Konuşmacı Notları</div>
              <div style="font-size: 14px; line-height: 1.6; opacity: 0.9; font-style: italic;">${forceSpacing(slideData.speaker_notes)}</div>
            </div>
          ` : ''}
        `;
        
        tempContainer.appendChild(slideElement);
        
        // Kelime aralıklarını düzelt (html2canvas spacing fix)
        fixTextSpacingForPdf(slideElement);
        
        const canvas = await html2canvas(slideElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: null
        });
        
        if (i > 0) pdf.addPage();
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
        
        tempContainer.removeChild(slideElement);
      }
      
      // Add Executive Summary page
      if (pitchDeck.executive_summary) {
        const summaryElement = document.createElement('div');
        summaryElement.style.cssText = `
          width: 1120px;
          height: 794px;
          padding: 48px;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: white;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        `;
        
        summaryElement.innerHTML = `
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 32px;">
            <div style="width: 64px; height: 64px; background: rgba(59, 130, 246, 0.3); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 32px;">📋</div>
            <div>
              <h1 style="font-size: 36px; font-weight: 700; margin: 0;">Executive Summary</h1>
              <div style="font-size: 16px; opacity: 0.7; margin-top: 4px;">Yatırımcıya gönderilecek e-posta özeti</div>
            </div>
          </div>
          
          <div style="flex: 1; background: rgba(255,255,255,0.05); border-radius: 16px; padding: 32px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 16px; line-height: 1.8; white-space: pre-wrap;">${forceSpacing(pitchDeck.executive_summary)}</div>
          </div>
          
          <div style="margin-top: 24px; text-align: center; opacity: 0.5; font-size: 12px;">
            Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        `;
        
        tempContainer.appendChild(summaryElement);
        
        // Kelime aralıklarını düzelt (html2canvas spacing fix)
        fixTextSpacingForPdf(summaryElement);
        
        const canvas = await html2canvas(summaryElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: null
        });
        
        pdf.addPage();
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
        
        tempContainer.removeChild(summaryElement);
      }
      
      // Cleanup
      document.body.removeChild(tempContainer);
      
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
