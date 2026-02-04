import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  Sparkles,
  Globe,
  BarChart3,
  TrendingUp,
  DollarSign,
  Wallet,
  Calculator,
  Users,
  Target,
  Download,
  Loader2,
  FileDown
} from 'lucide-react';
import { PitchDeck, PitchSlide, getExecutiveSummaryText, EnhancedExecutiveSummary } from '@/types/simulation';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import pptxgen from 'pptxgenjs';
import { turkishToAscii } from '@/lib/pdf/fonts/roboto-base64';

// Helper to check if executive summary is enhanced
const isEnhancedSummary = (summary: string | EnhancedExecutiveSummary | undefined): summary is EnhancedExecutiveSummary => {
  return typeof summary === 'object' && summary !== null && 'short_pitch' in summary;
};

interface PitchDeckViewProps {
  pitchDeck: PitchDeck;
  onClose?: () => void;
}

// 10 Slayt İkonları
const slideIcons: Record<number, React.ReactNode> = {
  1: <Rocket className="h-5 w-5" />,       // Problem
  2: <Sparkles className="h-5 w-5" />,     // Çözüm
  3: <Globe className="h-5 w-5" />,        // Pazar
  4: <BarChart3 className="h-5 w-5" />,    // İş Modeli
  5: <TrendingUp className="h-5 w-5" />,   // Traction
  6: <DollarSign className="h-5 w-5" />,   // Büyüme Planı
  7: <Wallet className="h-5 w-5" />,       // Use of Funds
  8: <Calculator className="h-5 w-5" />,   // Finansal
  9: <Users className="h-5 w-5" />,        // Ekip
  10: <Target className="h-5 w-5" />       // The Ask
};

// 10 Slayt Renkleri
const slideColors: Record<number, string> = {
  1: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
  2: 'from-purple-500/20 to-violet-500/20 border-purple-500/30',
  3: 'from-cyan-500/20 to-teal-500/20 border-cyan-500/30',
  4: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
  5: 'from-orange-500/20 to-amber-500/20 border-orange-500/30',
  6: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
  7: 'from-yellow-500/20 to-lime-500/20 border-yellow-500/30',
  8: 'from-indigo-500/20 to-blue-500/20 border-indigo-500/30',
  9: 'from-teal-500/20 to-green-500/20 border-teal-500/30',
  10: 'from-red-500/20 to-orange-500/20 border-red-500/30'
};

// Google-style minimal color palette - 10 slides
const slidePdfColors: Record<number, { accent: string; accentLight: string }> = {
  1: { accent: '#4285F4', accentLight: '#E8F0FE' },   // Blue - Problem
  2: { accent: '#9334E6', accentLight: '#F3E8FD' },   // Purple - Çözüm
  3: { accent: '#00ACC1', accentLight: '#E0F7FA' },   // Cyan - Pazar
  4: { accent: '#34A853', accentLight: '#E6F4EA' },   // Green - İş Modeli
  5: { accent: '#FB8C00', accentLight: '#FFF3E0' },   // Orange - Traction
  6: { accent: '#E91E63', accentLight: '#FCE4EC' },   // Pink - Büyüme
  7: { accent: '#FBBC04', accentLight: '#FEF7E0' },   // Yellow - Funds
  8: { accent: '#3949AB', accentLight: '#E8EAF6' },   // Indigo - Finansal
  9: { accent: '#00897B', accentLight: '#E0F2F1' },   // Teal - Ekip
  10: { accent: '#EA4335', accentLight: '#FCE8E6' }   // Red - The Ask
};

// 10 Slayt Emoji Etiketleri
const slideIconLabels: Record<number, string> = {
  1: '🚀',  // Problem
  2: '✨',  // Çözüm
  3: '🌐',  // Pazar
  4: '📊',  // İş Modeli
  5: '📈',  // Traction
  6: '💹',  // Büyüme
  7: '💰',  // Funds
  8: '🧮',  // Finansal
  9: '👥',  // Ekip
  10: '🎯'  // The Ask
};

export function PitchDeckView({ pitchDeck, onClose }: PitchDeckViewProps) {
  const { t, i18n } = useTranslation(['simulation', 'common']);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingPptx, setIsGeneratingPptx] = useState(false);

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
      const summaryText = getExecutiveSummaryText(pitchDeck.executive_summary);
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      toast.success(t('simulation:pitchDeck.summaryCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('simulation:pitchDeck.copyFailed'));
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
      
      // Helper: Hex to RGB
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
      };
      
      // Helper: Word wrap text
      const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
        pdf.setFontSize(fontSize);
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        words.forEach(word => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = pdf.getTextWidth(testLine);
          if (testWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine) lines.push(currentLine);
        return lines;
      };
      
      // Render each slide - Google-style minimal design
      for (let i = 0; i < slides.length; i++) {
        const slideData = slides[i];
        const slideNumber = slideData.slide_number;
        const colors = slidePdfColors[slideNumber] || slidePdfColors[1];
        const iconLabel = slideIconLabels[slideNumber] || '>';
        
        if (i > 0) pdf.addPage();
        
        // White background
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Left accent stripe (Google style)
        const accentColor = hexToRgb(colors.accent);
        pdf.setFillColor(accentColor.r, accentColor.g, accentColor.b);
        pdf.rect(0, 0, 6, pageHeight, 'F');
        
        // Slide number - subtle gray
        pdf.setTextColor(158, 158, 158);
        pdf.setFontSize(10);
        pdf.setFont('Helvetica', 'normal');
        pdf.text(`${slideNumber} / ${slides.length}`, pageWidth - margin - 15, margin);
        
        // Icon with accent background
        const accentLightColor = hexToRgb(colors.accentLight);
        pdf.setFillColor(accentLightColor.r, accentLightColor.g, accentLightColor.b);
        pdf.circle(margin + 10, margin + 18, 10, 'F');
        pdf.setFontSize(14);
        pdf.setTextColor(accentColor.r, accentColor.g, accentColor.b);
        pdf.text(iconLabel, margin + 6.5, margin + 21);
        
        // Title - dark gray
        pdf.setFontSize(28);
        pdf.setFont('Helvetica', 'bold');
        pdf.setTextColor(33, 33, 33);
        const titleText = turkishToAscii(slideData.title);
        pdf.text(titleText, margin + 28, margin + 23);
        
        // Key message in light accent box
        let currentY = margin + 38;
        pdf.setFillColor(accentLightColor.r, accentLightColor.g, accentLightColor.b);
        const keyMessageLines = wrapText(turkishToAscii(slideData.key_message), contentWidth - 20, 13);
        const keyBoxHeight = 12 + (keyMessageLines.length - 1) * 6;
        pdf.roundedRect(margin, currentY, contentWidth, keyBoxHeight, 3, 3, 'F');
        
        pdf.setFontSize(13);
        pdf.setFont('Helvetica', 'bold');
        pdf.setTextColor(66, 66, 66);
        keyMessageLines.forEach((line, idx) => {
          pdf.text(line, margin + 10, currentY + 8 + (idx * 6));
        });
        
        currentY += keyBoxHeight + 12;
        
        // Bullet points - clean list
        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(12);
        
        slideData.content_bullets.forEach((bullet, idx) => {
          const bulletLines = wrapText(turkishToAscii(bullet), contentWidth - 20, 12);
          
          // Accent colored number circle
          pdf.setFillColor(accentColor.r, accentColor.g, accentColor.b);
          pdf.circle(margin + 5, currentY + 2, 4, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(10);
          pdf.setFont('Helvetica', 'bold');
          pdf.text(`${idx + 1}`, margin + 3.2, currentY + 4);
          
          // Bullet text - dark gray
          pdf.setTextColor(66, 66, 66);
          pdf.setFont('Helvetica', 'normal');
          pdf.setFontSize(12);
          bulletLines.forEach((line, lineIdx) => {
            pdf.text(line, margin + 14, currentY + 4 + (lineIdx * 6));
          });
          
          currentY += 8 + (bulletLines.length - 1) * 6 + 6;
        });
        
        // Speaker notes - bottom section with gray divider
        if (slideData.speaker_notes) {
          const notesY = pageHeight - 28;
          
          // Light gray divider line
          pdf.setDrawColor(224, 224, 224);
          pdf.setLineWidth(0.3);
          pdf.line(margin, notesY - 8, pageWidth - margin, notesY - 8);
          
          pdf.setFontSize(9);
          pdf.setFont('Helvetica', 'italic');
          pdf.setTextColor(117, 117, 117);
          pdf.text(turkishToAscii(t('simulation:pitchDeck.speakerNotes') + ':'), margin, notesY);
          
          pdf.setFontSize(10);
          pdf.setFont('Helvetica', 'normal');
          const notesLines = wrapText(turkishToAscii(slideData.speaker_notes), contentWidth, 10);
          notesLines.slice(0, 2).forEach((line, idx) => {
            pdf.text(line, margin, notesY + 5 + (idx * 4));
          });
        }
      }
      
      // Executive Summary page - Google style (white background)
      if (pitchDeck.executive_summary) {
        pdf.addPage();
        
        // White background
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Left accent stripe (Google Blue)
        pdf.setFillColor(66, 133, 244);
        pdf.rect(0, 0, 6, pageHeight, 'F');
        
        // Header
        pdf.setTextColor(33, 33, 33);
        pdf.setFontSize(28);
        pdf.setFont('Helvetica', 'bold');
        pdf.text(turkishToAscii(t('simulation:pitchDeck.executiveSummary')), margin, margin + 15);

        pdf.setFontSize(12);
        pdf.setFont('Helvetica', 'normal');
        pdf.setTextColor(117, 117, 117);
        pdf.text(turkishToAscii(t('simulation:pitchDeck.emailSummaryDescription')), margin, margin + 25);
        
        // Light gray divider
        pdf.setDrawColor(224, 224, 224);
        pdf.setLineWidth(0.5);
        pdf.line(margin, margin + 32, pageWidth - margin, margin + 32);
        
        // Summary content - clean text on white
        pdf.setTextColor(66, 66, 66);
        pdf.setFontSize(11);
        const summaryText = getExecutiveSummaryText(pitchDeck.executive_summary);
        const summaryLines = wrapText(turkishToAscii(summaryText), contentWidth, 11);
        summaryLines.forEach((line, idx) => {
          if (margin + 45 + (idx * 6) < pageHeight - 25) {
            pdf.text(line, margin, margin + 45 + (idx * 6));
          }
        });
        
        // Footer
        pdf.setFontSize(9);
        pdf.setTextColor(158, 158, 158);
        const dateLocale = i18n.language === 'tr' ? 'tr-TR' : 'en-US';
        const dateText = `${t('simulation:pitchDeck.createdDate')}: ${new Date().toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })}`;
        pdf.text(turkishToAscii(dateText), pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      pdf.save(t('simulation:pitchDeck.pdfFilename') + '.pdf');
      toast.success(t('simulation:pitchDeck.pdfDownloaded'));

    } catch (error) {
      console.error('PDF creation error:', error);
      toast.error(t('simulation:pitchDeck.pdfError'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPptx = async () => {
    if (!slides.length) return;

    setIsGeneratingPptx(true);
    try {
      const pptx = new pptxgen();

      // Presentation settings
      pptx.author = 'PlannerDeck';
      pptx.title = t('simulation:pitchDeck.investorPresentation');
      pptx.subject = 'Investor Pitch Deck';
      pptx.company = 'PlannerDeck';
      pptx.layout = 'LAYOUT_16x9';

      // Define master slide with consistent styling
      pptx.defineSlideMaster({
        title: 'PITCH_MASTER',
        background: { color: 'FFFFFF' },
        objects: [
          // Left accent stripe
          { rect: { x: 0, y: 0, w: 0.15, h: '100%', fill: { color: '4285F4' } } },
        ],
      });

      // Slide colors matching PDF
      const pptxSlideColors: Record<number, string> = {
        1: '4285F4',  // Blue - Problem
        2: '9334E6',  // Purple - Solution
        3: '00ACC1',  // Cyan - Market
        4: '34A853',  // Green - Business Model
        5: 'FB8C00',  // Orange - Traction
        6: 'E91E63',  // Pink - Growth
        7: 'FBBC04',  // Yellow - Funds
        8: '3949AB',  // Indigo - Financial
        9: '00897B',  // Teal - Team
        10: 'EA4335', // Red - The Ask
      };

      // Create slides
      for (const slideData of slides) {
        const slideNumber = slideData.slide_number;
        const accentColor = pptxSlideColors[slideNumber] || '4285F4';

        const slide = pptx.addSlide({ masterName: 'PITCH_MASTER' });

        // Override left stripe color per slide
        slide.addShape('rect', {
          x: 0,
          y: 0,
          w: 0.15,
          h: '100%',
          fill: { color: accentColor },
        });

        // Slide number
        slide.addText(`${slideNumber} / ${slides.length}`, {
          x: 8.5,
          y: 0.3,
          w: 1,
          h: 0.3,
          fontSize: 10,
          color: '9E9E9E',
          align: 'right',
        });

        // Icon circle with emoji
        const iconLabel = slideIconLabels[slideNumber] || '>';
        slide.addShape('ellipse', {
          x: 0.4,
          y: 0.4,
          w: 0.5,
          h: 0.5,
          fill: { color: accentColor, transparency: 80 },
        });
        slide.addText(iconLabel, {
          x: 0.4,
          y: 0.45,
          w: 0.5,
          h: 0.4,
          fontSize: 16,
          align: 'center',
          valign: 'middle',
        });

        // Title
        slide.addText(slideData.title, {
          x: 1.0,
          y: 0.4,
          w: 8,
          h: 0.5,
          fontSize: 28,
          bold: true,
          color: '212121',
        });

        // Key message box
        slide.addShape('roundRect', {
          x: 0.4,
          y: 1.1,
          w: 9,
          h: 0.6,
          fill: { color: accentColor, transparency: 90 },
          rectRadius: 0.1,
        });
        slide.addText(slideData.key_message, {
          x: 0.5,
          y: 1.15,
          w: 8.8,
          h: 0.5,
          fontSize: 13,
          bold: true,
          color: '424242',
        });

        // Bullet points
        let bulletY = 1.9;
        slideData.content_bullets.forEach((bullet, idx) => {
          // Number circle
          slide.addShape('ellipse', {
            x: 0.4,
            y: bulletY,
            w: 0.25,
            h: 0.25,
            fill: { color: accentColor },
          });
          slide.addText(`${idx + 1}`, {
            x: 0.4,
            y: bulletY,
            w: 0.25,
            h: 0.25,
            fontSize: 10,
            bold: true,
            color: 'FFFFFF',
            align: 'center',
            valign: 'middle',
          });

          // Bullet text
          slide.addText(bullet, {
            x: 0.75,
            y: bulletY,
            w: 8.5,
            h: 0.4,
            fontSize: 12,
            color: '424242',
            valign: 'top',
          });

          bulletY += 0.5;
        });

        // Speaker notes - in PowerPoint's notes panel (not on slide)
        if (slideData.speaker_notes) {
          slide.addNotes(slideData.speaker_notes);
        }
      }

      // Executive Summary slide
      if (pitchDeck.executive_summary) {
        const summarySlide = pptx.addSlide({ masterName: 'PITCH_MASTER' });

        // Blue stripe
        summarySlide.addShape('rect', {
          x: 0,
          y: 0,
          w: 0.15,
          h: '100%',
          fill: { color: '4285F4' },
        });

        // Title
        summarySlide.addText(t('simulation:pitchDeck.executiveSummary'), {
          x: 0.4,
          y: 0.4,
          w: 8,
          h: 0.5,
          fontSize: 28,
          bold: true,
          color: '212121',
        });

        // Subtitle
        summarySlide.addText(t('simulation:pitchDeck.emailSummaryDescription'), {
          x: 0.4,
          y: 0.95,
          w: 8,
          h: 0.3,
          fontSize: 12,
          color: '757575',
        });

        // Divider line
        summarySlide.addShape('line', {
          x: 0.4,
          y: 1.4,
          w: 9,
          h: 0,
          line: { color: 'E0E0E0', width: 1 },
        });

        // Summary content
        const summaryText = getExecutiveSummaryText(pitchDeck.executive_summary);
        summarySlide.addText(summaryText, {
          x: 0.4,
          y: 1.6,
          w: 9,
          h: 3.5,
          fontSize: 11,
          color: '424242',
          valign: 'top',
        });

        // Date footer
        const dateLocale = i18n.language === 'tr' ? 'tr-TR' : 'en-US';
        const dateText = `${t('simulation:pitchDeck.createdDate')}: ${new Date().toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })}`;
        summarySlide.addText(dateText, {
          x: 0,
          y: 5,
          w: '100%',
          h: 0.3,
          fontSize: 9,
          color: '9E9E9E',
          align: 'center',
        });
      }

      // Save the file
      await pptx.writeFile({ fileName: t('simulation:pitchDeck.pptxFilename') + '.pptx' });
      toast.success(t('simulation:pitchDeck.pptxDownloaded'));

    } catch (error) {
      console.error('PPTX creation error:', error);
      toast.error(t('simulation:pitchDeck.pptxError'));
    } finally {
      setIsGeneratingPptx(false);
    }
  };

  if (!slides.length) {
    return (
      <Card className="p-8 text-center">
        <Presentation className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">{t('simulation:pitchDeck.noPitchDeck')}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Slide Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Presentation className="h-5 w-5 text-primary" />
          <span className="font-medium">{t('simulation:pitchDeck.investorPresentation')}</span>
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
            {showSpeakerNotes ? t('simulation:pitchDeck.hideNotes') : t('simulation:pitchDeck.speakerNotes')}
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
            {t('simulation:pitchDeck.downloadPdf')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPptx}
            disabled={isGeneratingPptx}
            className="gap-2"
          >
            {isGeneratingPptx ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            {t('simulation:pitchDeck.downloadPptx')}
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
                    {t('simulation:pitchDeck.speakerNotes')}
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
          {t('simulation:pitchDeck.previous')}
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
          {t('simulation:pitchDeck.next')}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Executive Summary */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('simulation:pitchDeck.executiveSummary')}
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
                  {t('simulation:pitchDeck.copied')}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  {t('simulation:pitchDeck.copy')}
                </>
              )}
            </Button>
          </div>
          <CardDescription>{t('simulation:pitchDeck.emailSummaryDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-32">
            {isEnhancedSummary(pitchDeck.executive_summary) ? (
              <div className="text-sm leading-relaxed space-y-2">
                <p>{pitchDeck.executive_summary.short_pitch}</p>
                {pitchDeck.executive_summary.scenario_comparison && (
                  <p className="text-xs text-muted-foreground border-t pt-2">
                    📊 {pitchDeck.executive_summary.scenario_comparison}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm leading-relaxed">{pitchDeck.executive_summary}</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
