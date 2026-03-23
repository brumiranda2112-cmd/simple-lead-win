import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search } from 'lucide-react';
import type { Profile } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  profiles: Profile[];
  onTransfer: (userId: string) => void;
}

export default function TransferModal({ open, onClose, profiles, onTransfer }: Props) {
  const [search, setSearch] = useState('');
  const filtered = profiles.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir conversa</DialogTitle>
        </DialogHeader>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar usuário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {filtered.map(p => (
            <button key={p.id} onClick={() => { onTransfer(p.id); onClose(); }}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left">
              <Avatar className="h-8 w-8">
                {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                <AvatarFallback className="bg-primary/20 text-primary text-xs">{p.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.email}</p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário encontrado</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
