import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useAuthContext } from '@/contexts/AuthContext';

interface VoiceInputProps {
  mode: 'plan' | 'actual';
  date: Date;
  onSuccess: () => void;
}

export function VoiceInput({ mode, date, onSuccess }: VoiceInputProps) {
  const navigate = useNavigate();
  const { session } = useAuthContext();
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied' | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check microphone permission on mount
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' as PermissionName })
        .then(permissionStatus => {
          setMicPermission(permissionStatus.state as 'prompt' | 'granted' | 'denied');
          
          permissionStatus.onchange = () => {
            setMicPermission(permissionStatus.state as 'prompt' | 'granted' | 'denied');
          };
        })
        .catch(() => {
          setMicPermission('prompt');
        });
    }
  }, []);

  const requestMicPermission = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
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

  const startRecording = async () => {
    // Get or request microphone permission
    let stream = streamRef.current;
    
    if (!stream || !stream.active) {
      stream = await requestMicPermission();
      if (!stream) return;
      streamRef.current = stream;
    }

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
        processAudio();
      };

      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      toast.info('Dinleniyor... Konuşmaya başlayın');
    } catch (error) {
      console.error('Start recording error:', error);
      toast.error('Kayıt başlatılamadı');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
      
      const payload = {
        text: text.trim(),
        date: format(date, 'yyyy-MM-dd'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        now: new Date().toISOString()
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
        toast.success(data.message || 'Başarıyla eklendi!');
        setText('');
        onSuccess();
      } else if (data?.warnings?.length > 0) {
        toast.warning(data.warnings.join(', '));
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

  return (
    <>
      {/* Floating Mic FAB - Fixed bottom right on mobile */}
      <div className="fixed bottom-6 right-4 z-50 md:hidden">
        {/* Ripple animation when recording */}
        {isRecording && (
          <>
            <span className="absolute inset-0 h-20 w-20 animate-ping rounded-full bg-destructive/40" />
            <span className="absolute inset-0 h-20 w-20 animate-pulse rounded-full bg-destructive/20" />
          </>
        )}
        <Button
          variant={isRecording ? 'destructive' : 'default'}
          onClick={toggleRecording}
          disabled={isMicDisabled}
          title={isRecording ? 'Kaydı durdur' : 'Sesli komut (Whisper)'}
          className="relative h-20 w-20 rounded-full shadow-2xl"
        >
          {isTranscribing ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : isRecording ? (
            <MicOff className="h-10 w-10" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </Button>
      </div>

      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="min-h-[50px] md:min-h-[70px] resize-none text-sm"
          disabled={isDisabled}
        />
        
        <div className="flex items-center gap-2">
          {/* Send Button */}
          <Button 
            onClick={handleSubmit}
            disabled={!text.trim() || isDisabled}
            className="flex-1 h-10 md:h-10"
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
            title={isRecording ? 'Kaydı durdur' : 'Sesli komut (Whisper)'}
            className="hidden md:flex h-10 w-10 shrink-0"
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
