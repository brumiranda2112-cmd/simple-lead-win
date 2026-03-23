import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  open: boolean;
  onClose: () => void;
  onSend: (phone: string, message: string) => void;
  sending: boolean;
}

export default function NewConversationModal({ open, onClose, onSend, sending }: Props) {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!phone.trim() || !message.trim()) return;
    onSend(phone.trim(), message.trim());
    setPhone('');
    setMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova conversa</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Número WhatsApp</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="5511999999999" />
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Olá..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSend} disabled={sending || !phone.trim() || !message.trim()}>
            {sending ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
