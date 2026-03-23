import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onRecorded: (blob: Blob) => void;
  disabled?: boolean;
}

export default function AudioRecorder({ onRecorded, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunks.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: 'audio/webm;codecs=opus' });
        onRecorded(blob);
        setDuration(0);
      };
      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      toast.error('Não foi possível acessar o microfone');
    }
  }, [onRecorded]);

  const stop = useCallback(() => {
    mediaRecorder.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const formatDur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return recording ? (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-destructive text-xs font-medium animate-pulse">
        <div className="w-2 h-2 rounded-full bg-destructive" />
        {formatDur(duration)}
      </div>
      <Button type="button" size="icon" variant="destructive" className="h-9 w-9" onClick={stop}>
        <Square className="h-4 w-4" />
      </Button>
    </div>
  ) : (
    <Button type="button" variant="ghost" size="icon" className="shrink-0 mb-0.5 h-9 w-9"
      onClick={start} disabled={disabled} title="Gravar áudio">
      <Mic className="h-4 w-4" />
    </Button>
  );
}
