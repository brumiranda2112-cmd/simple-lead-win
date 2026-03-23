import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Paperclip, Zap, Smile } from 'lucide-react';
import { QUICK_REPLIES, EMOJI_LIST } from './types';

interface Props {
  onSend: (text: string) => void;
  onFileSelect: (file: File) => void;
  sending: boolean;
}

export default function MessageInput({ onSend, onFileSelect, sending }: Props) {
  const [newMsg, setNewMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!newMsg.trim()) return;
    onSend(newMsg.trim());
    setNewMsg('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-3 border-t border-border/50 bg-card/50">
      <div className="flex items-end gap-1.5">
        <input ref={fileInputRef} type="file" className="hidden"
          accept="image/jpeg,image/png,image/gif,video/mp4,audio/mpeg,audio/ogg,application/pdf"
          onChange={handleFile} />

        {/* Quick Replies */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="shrink-0 mb-0.5 h-9 w-9" disabled={sending}>
              <Zap className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" side="top">
            <p className="text-xs font-medium text-muted-foreground mb-2">Respostas rápidas</p>
            <div className="space-y-1">
              {QUICK_REPLIES.map((qr, i) => (
                <button key={i} onClick={() => { setNewMsg(qr.text); }}
                  className="w-full text-left text-xs p-2 rounded hover:bg-muted/50 transition-colors">
                  <span className="font-medium text-foreground">{qr.label}</span>
                  <span className="block text-muted-foreground truncate">{qr.text}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Emoji */}
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="shrink-0 mb-0.5 h-9 w-9" disabled={sending}>
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" side="top">
            <div className="grid grid-cols-5 gap-1">
              {EMOJI_LIST.map((e, i) => (
                <button key={i} onClick={() => setNewMsg(prev => prev + e)}
                  className="text-xl p-1.5 rounded hover:bg-muted/50 transition-colors">
                  {e}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Attach */}
        <Button type="button" variant="ghost" size="icon" className="shrink-0 mb-0.5 h-9 w-9"
          onClick={() => fileInputRef.current?.click()} disabled={sending}>
          <Paperclip className="h-4 w-4" />
        </Button>

        <Textarea value={newMsg} onChange={e => setNewMsg(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem..." disabled={sending} rows={1}
          className="flex-1 bg-muted/30 border-border/50 min-h-[40px] max-h-[120px] resize-none" />

        <Button type="button" size="icon" disabled={sending || !newMsg.trim()}
          className="shrink-0 mb-0.5" onClick={handleSend}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
