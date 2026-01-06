import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Mic, MicOff, Send, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useAuthContext } from '@/contexts/AuthContext';

interface ExistingPlan {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  type: string;
}

interface VoiceInputProps {
  mode: 'plan' | 'actual';
  date: Date;
  onSuccess: () => void;
  embedded?: boolean;
  autoStart?: boolean;
  existingPlans?: ExistingPlan[];
}

export function VoiceInput({ mode, date, onSuccess, embedded = false, autoStart = false, existingPlans = [] }: VoiceInputProps) {
  const navigate = useNavigate();
  const { session } = useAuthContext();
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied' | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);


  // Check microphone permission on mount (without opening stream)
  useEffect(() => {
    const checkPermission = async () => {
      if (navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setMicPermission(permissionStatus.state as 'prompt' | 'granted' | 'denied');
          
          permissionStatus.onchange = () => {
            setMicPermission(permissionStatus.state as 'prompt' | 'granted' | 'denied');
          };
          // Don't open stream here - only check permission status
        } catch {
          setMicPermission('prompt');
        }
      }
    };

    checkPermission();
  }, []);

  // Auto-start recording when autoStart prop is true
  const hasAutoStarted = useRef(false);
  useEffect(() => {
    if (autoStart && !hasAutoStarted.current && !isRecording && !isTranscribing) {
      hasAutoStarted.current = true;
      startRecording();
    }
  }, [autoStart]);

  const requestMicPermission = async (): Promise<MediaStream | null> => {
    // Always close any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      streamRef.current = stream;
      return stream;
    } catch (error) {
      setMicPermission('denied');
      toast.error('Mikrofon izni reddedildi');
      return null;
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      toast.error('Ses kaydı bulunamadı');
      return;
    }

    setIsTranscribing(true);
    setShowRecordingModal(false);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('Audio blob size:', audioBlob.size, 'bytes');
      
      if (audioBlob.size < 1000) {
        toast.error('Ses kaydı çok kısa');
        return;
      }

      const base64Audio = await blobToBase64(audioBlob);
      console.log('Sending audio to transcribe-audio function...');

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio }
      });

      if (error) {
        console.error('Transcription error:', error);
        toast.error('Transkripsiyon hatası: ' + error.message);
        return;
      }

      if (data?.text) {
        setText(prev => prev ? prev + ' ' + data.text : data.text);
        toast.success('Ses metne dönüştürüldü');
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (error) {
      console.error('Process audio error:', error);
      toast.error('Ses işleme hatası');
    } finally {
      setIsTranscribing(false);
      audioChunksRef.current = [];
    }
  };

  const stopSilenceDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    silenceStartRef.current = null;
    setAudioLevel(0);
  }, []);

  const startSilenceDetection = useCallback((stream: MediaStream, onSilence: () => void) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    
    microphone.connect(analyser);
    analyser.fftSize = 256;
    
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const SILENCE_THRESHOLD = 0.02;
    const SILENCE_DURATION = 2000; // 2 seconds
    
    const checkAudioLevel = () => {
      if (!analyserRef.current) return;
      
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength / 255;
      
      setAudioLevel(average);
      
      if (average < SILENCE_THRESHOLD) {
        // Silence detected
        if (!silenceStartRef.current) {
          silenceStartRef.current = Date.now();
        } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION) {
          // 2 seconds of silence = speech ended
          onSilence();
          return;
        }
      } else {
        // Sound detected - reset silence timer
        silenceStartRef.current = null;
      }
      
      animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
    };
    
    checkAudioLevel();
  }, []);

  const startRecording = async () => {
    // Always request a fresh stream for each recording
    const stream = await requestMicPermission();
    if (!stream) return;

    audioChunksRef.current = [];

    try {
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus' 
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopSilenceDetection();
        processAudio();
      };

      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setShowRecordingModal(true);
      
      // Start silence detection for auto-stop
      startSilenceDetection(stream, () => {
        stopRecording();
      });
      
    } catch (error) {
      console.error('Start recording error:', error);
      toast.error('Kayıt başlatılamadı');
    }
  };

  const stopRecording = useCallback(() => {
    stopSilenceDetection();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    // Immediately close stream to stop browser mic indicator
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [stopSilenceDetection]);

  const cancelRecording = useCallback(() => {
    stopSilenceDetection();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setShowRecordingModal(false);
    // Immediately close stream to stop browser mic indicator
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [stopSilenceDetection]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSilenceDetection();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [stopSilenceDetection]);

  const handleSubmit = async () => {
    if (!session) {
      toast.error('Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.', {
        action: {
          label: 'Giriş Yap',
          onClick: () => navigate('/auth')
        }
      });
      return;
    }

    if (!text.trim()) {
      toast.error('Lütfen bir komut girin');
      return;
    }

    setIsProcessing(true);

    try {
      const functionName = mode === 'plan' ? 'parse-plan' : 'parse-actual';
      
      const now = new Date();
      const timezoneOffset = now.getTimezoneOffset(); // e.g., -180 for UTC+3
      
      const payload = {
        text: text.trim(),
        date: format(date, 'yyyy-MM-dd'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        now: now.toISOString(),
        timezoneOffset: timezoneOffset,
        localTime: format(now, "yyyy-MM-dd'T'HH:mm:ssXXX"), // Local time with offset
        existingPlans: mode === 'plan' ? existingPlans : [] // Only send for plan mode
      };

      console.log('Calling edge function:', functionName, payload);

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload
      });
      
      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        
        if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('JWT')) {
          toast.error('Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.', {
            action: {
              label: 'Giriş Yap',
              onClick: () => navigate('/auth')
            }
          });
          return;
        }
        
        toast.error('İşlem başarısız: ' + error.message);
        return;
      }

      if (data?.success) {
        // Show warnings as info toasts (plan modifications)
        if (data?.warnings?.length > 0) {
          data.warnings.forEach((warning: string) => {
            toast.info(warning, { duration: 4000 });
          });
        }
        toast.success(data.message || 'Başarıyla eklendi!');
        setText('');
        onSuccess();
      } else if (data?.clarifyingQuestions?.length > 0) {
        toast.info(data.clarifyingQuestions[0]);
      } else {
        toast.error(data?.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Bağlantı hatası');
    } finally {
      setIsProcessing(false);
    }
  };

  const placeholder = mode === 'plan' 
    ? 'Örn: "Yarın saat 10\'da müşteri toplantısı ekle"'
    : 'Örn: "Şu an rapor yazıyorum"';

  const isDisabled = isProcessing || isTranscribing;
  const isMicDisabled = isDisabled || micPermission === 'denied';

  // Audio level bars for visualization
  const renderAudioBars = () => {
    const bars = 12;
    return (
      <div className="flex items-end justify-center gap-1 h-24">
        {[...Array(bars)].map((_, i) => {
          const heightMultiplier = Math.sin((i / bars) * Math.PI); // Bell curve
          const baseHeight = 20;
          const dynamicHeight = audioLevel * 200 * heightMultiplier;
          const height = Math.max(baseHeight, baseHeight + dynamicHeight);
          
          return (
            <div
              key={i}
              className="w-2 bg-primary rounded-full transition-all duration-75"
              style={{ height: `${Math.min(height, 96)}px` }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Full Screen Recording Modal - Mobile */}
      <Dialog open={showRecordingModal} onOpenChange={(open) => {
        if (!open && isRecording) {
          cancelRecording();
        }
      }}>
        <DialogContent className="h-[100dvh] w-screen max-w-none p-0 border-0 rounded-none flex flex-col items-center justify-center bg-background">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={cancelRecording}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Main content */}
          <div className="flex flex-col items-center justify-center flex-1 px-8">
            {/* Animated mic with pulse */}
            <div className="relative mb-8">
              {isRecording && (
                <>
                  <span className="absolute inset-0 h-32 w-32 animate-ping rounded-full bg-primary/30" />
                  <span className="absolute inset-0 h-32 w-32 animate-pulse rounded-full bg-primary/20" />
                </>
              )}
              <div className="relative h-32 w-32 rounded-full bg-primary flex items-center justify-center">
                {isTranscribing ? (
                  <Loader2 className="h-16 w-16 text-primary-foreground animate-spin" />
                ) : (
                  <Mic className="h-16 w-16 text-primary-foreground" />
                )}
              </div>
            </div>

            {/* Audio level visualization */}
            {isRecording && renderAudioBars()}

            {/* Status text */}
            <p className="mt-8 text-xl font-medium text-foreground">
              {isTranscribing ? 'Dönüştürülüyor...' : 'Dinleniyor...'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">
              {isTranscribing 
                ? 'Ses metne dönüştürülüyor' 
                : 'Konuşmayı bitirdiğinizde otomatik duracak (2 sn sessizlik)'}
            </p>

            {/* Cancel button */}
            <Button
              variant="outline"
              size="lg"
              onClick={cancelRecording}
              className="mt-8"
            >
              İptal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Mic FAB - Fixed bottom right on mobile (only when not embedded) */}
      {!embedded && (
        <div className="fixed bottom-20 right-4 z-50 md:hidden">
          {/* Ripple animation when recording */}
          {isRecording && (
            <>
              <span className="absolute inset-0 h-16 w-16 animate-ping rounded-full bg-destructive/40" />
              <span className="absolute inset-0 h-16 w-16 animate-pulse rounded-full bg-destructive/20" />
            </>
          )}
          <Button
            variant={isRecording ? 'destructive' : 'default'}
            onClick={toggleRecording}
            disabled={isMicDisabled}
            title={isRecording ? 'Kaydı durdur' : 'Sesli komut'}
            className="relative h-16 w-16 rounded-full shadow-2xl"
          >
            {isTranscribing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="min-h-[44px] md:min-h-[60px] resize-none text-base"
          disabled={isDisabled}
        />
        
        <div className="flex items-center gap-2">
          {/* Send Button */}
          <Button 
            onClick={handleSubmit}
            disabled={!text.trim() || isDisabled}
            className="flex-1 h-10"
            size="sm"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">İşleniyor...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {mode === 'plan' ? 'Plan Ekle' : 'Kaydet'}
              </>
            )}
          </Button>
          
          {/* Desktop Mic Button */}
          <Button
            variant={isRecording ? 'destructive' : 'default'}
            onClick={toggleRecording}
            disabled={isMicDisabled}
            title={isRecording ? 'Kaydı durdur' : 'Sesli komut'}
            className={embedded ? "h-10 w-10 shrink-0" : "hidden md:flex h-10 w-10 shrink-0"}
          >
            {isTranscribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
