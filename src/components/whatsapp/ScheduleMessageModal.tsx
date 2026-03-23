import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Clock } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  phone: string;
  conversationId: string;
}

export default function ScheduleMessageModal({ open, onClose, phone, conversationId }: Props) {
  const [message, setMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!message.trim() || !scheduledAt) { toast.error('Preencha todos os campos'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('scheduled_messages').insert({
        phone,
        message: message.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
        conversation_id: conversationId,
      } as any);
      if (error) throw error;
      toast.success('Mensagem agendada!');
      setMessage('');
      setScheduledAt('');
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Agendar Mensagem
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Texto da mensagem..." rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Data e Hora</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Agendar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
