import { format } from 'date-fns';
import { FileText, Check, CheckCheck } from 'lucide-react';
import type { Message } from './types';

function StatusIcon({ status }: { status: string | null }) {
  if (status === 'delivered' || status === 'read') return <CheckCheck className="h-3 w-3 inline-block ml-1" />;
  if (status === 'sent') return <Check className="h-3 w-3 inline-block ml-1" />;
  return null;
}

interface Props {
  message: Message;
  onImageClick: (url: string) => void;
}

export default function MessageBubble({ message: msg, onImageClick }: Props) {
  const type = msg.type || 'text';

  const renderContent = () => {
    if (type === 'image' && msg.media_url) {
      return (
        <div>
          <img src={msg.media_url} alt="imagem"
            className="max-w-[240px] rounded-lg mb-1 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => onImageClick(msg.media_url!)} />
          {msg.body && msg.body !== '📷 Imagem' && <p className="text-sm">{msg.body}</p>}
        </div>
      );
    }
    if (type === 'video' && msg.media_url) {
      return (
        <div>
          <video src={msg.media_url} controls className="max-w-[240px] rounded-lg mb-1" />
          {msg.body && msg.body !== '🎥 Vídeo' && <p className="text-sm">{msg.body}</p>}
        </div>
      );
    }
    if (type === 'audio' && msg.media_url) {
      return <audio src={msg.media_url} controls className="max-w-[240px]" />;
    }
    if (type === 'document' && msg.media_url) {
      return (
        <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm underline">
          <FileText className="h-4 w-4" />
          {msg.body || 'Documento'}
        </a>
      );
    }
    return <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>;
  };

  return (
    <div className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${
        msg.from_me
          ? 'bg-primary text-primary-foreground rounded-br-md'
          : 'bg-muted text-foreground rounded-bl-md'
      }`}>
        {renderContent()}
        <p className={`text-[10px] mt-1 text-right ${msg.from_me ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
          {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : ''}
          {msg.from_me && <StatusIcon status={msg.status} />}
        </p>
      </div>
    </div>
  );
}
