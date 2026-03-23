import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Tag } from 'lucide-react';

interface LabelItem {
  id: string;
  name: string;
  color: string;
}

interface Props {
  conversationId: string;
  currentLabels: string[];
  onUpdate: (labels: string[]) => void;
}

export default function LabelsPicker({ conversationId, currentLabels, onUpdate }: Props) {
  const [labels, setLabels] = useState<LabelItem[]>([]);

  useEffect(() => {
    supabase.from('labels').select('*').order('name').then(({ data }) => {
      setLabels((data as LabelItem[]) || []);
    });
  }, []);

  const toggle = async (name: string) => {
    const newLabels = currentLabels.includes(name)
      ? currentLabels.filter(l => l !== name)
      : [...currentLabels, name];
    await supabase.from('whatsapp_conversations').update({ labels: newLabels } as any).eq('id', conversationId);
    onUpdate(newLabels);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Etiquetas">
          <Tag className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <p className="text-xs font-medium text-muted-foreground mb-2">Etiquetas</p>
        <div className="space-y-1">
          {labels.map(l => (
            <button key={l.id} onClick={() => toggle(l.name)}
              className={`w-full flex items-center gap-2 text-xs p-2 rounded hover:bg-muted/50 transition-colors ${
                currentLabels.includes(l.name) ? 'bg-muted/50 font-medium' : ''
              }`}>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
              <span>{l.name}</span>
              {currentLabels.includes(l.name) && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
