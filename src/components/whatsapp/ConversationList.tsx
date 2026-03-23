import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, ArrowUpDown } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Conversation, TabType, Profile } from './types';

function formatTime(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Ontem';
  return format(d, 'dd/MM', { locale: ptBR });
}

function priorityIcon(p: string | null | undefined) {
  if (p === 'urgent') return '⚡';
  if (p === 'high') return '🔴';
  return '';
}

interface Props {
  conversations: Conversation[];
  selectedConv: Conversation | null;
  profiles: Profile[];
  onSelect: (c: Conversation) => void;
  onNewConversation: () => void;
}

export default function ConversationList({ conversations, selectedConv, profiles, onSelect, onNewConversation }: Props) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<TabType>('active');
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');
  const [filterAssigned, setFilterAssigned] = useState<string>('all');

  const isGroup = (c: Conversation) => c.phone.includes('@g.us') || /[a-zA-Z]/.test(c.phone.replace('@g.us', '').replace('@s.whatsapp.net', '').replace('@c.us', ''));
  const isFinished = (c: Conversation) => (c as any).status === 'finished';

  const tabConversations = conversations.filter(c => {
    if (tab === 'groups') return isGroup(c);
    if (tab === 'finished') return !isGroup(c) && isFinished(c);
    return !isGroup(c) && !isFinished(c);
  });

  const filtered = tabConversations.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || (c.contact_name?.toLowerCase().includes(q)) || c.phone.includes(q);
    const matchAssigned = filterAssigned === 'all' || (c as any).assigned_to === filterAssigned;
    return matchSearch && matchAssigned;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') {
      const order: Record<string, number> = { urgent: 0, high: 1, normal: 2 };
      const pa = order[(a as any).priority || 'normal'] ?? 2;
      const pb = order[(b as any).priority || 'normal'] ?? 2;
      if (pa !== pb) return pa - pb;
    }
    return new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime();
  });

  const countActive = conversations.filter(c => !isGroup(c) && !isFinished(c)).length;
  const countFinished = conversations.filter(c => !isGroup(c) && isFinished(c)).length;
  const countGroups = conversations.filter(c => isGroup(c)).length;

  return (
    <div className="flex flex-col h-full border-r border-border/50">
      {/* Header */}
      <div className="p-3 border-b border-border/50 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">WhatsApp</h2>
          <Button size="sm" onClick={onNewConversation} className="gap-1">
            <Plus className="h-4 w-4" /> Nova
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar conversa..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-muted/30 border-border/50" />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-3 pt-2">
        <Tabs value={tab} onValueChange={v => setTab(v as TabType)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="active" className="text-xs gap-1">
              Ativas <Badge variant="secondary" className="h-5 min-w-5 text-[10px]">{countActive}</Badge>
            </TabsTrigger>
            <TabsTrigger value="finished" className="text-xs gap-1">
              Finalizadas <Badge variant="secondary" className="h-5 min-w-5 text-[10px]">{countFinished}</Badge>
            </TabsTrigger>
            <TabsTrigger value="groups" className="text-xs gap-1">
              Grupos <Badge variant="secondary" className="h-5 min-w-5 text-[10px]">{countGroups}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters */}
      <div className="px-3 py-2 flex gap-2">
        <Select value={filterAssigned} onValueChange={setFilterAssigned}>
          <SelectTrigger className="h-8 text-xs flex-1 bg-muted/30 border-border/50">
            <SelectValue placeholder="Atendente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {profiles.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"
          onClick={() => setSortBy(s => s === 'date' ? 'priority' : 'date')}
          title={sortBy === 'date' ? 'Ordenar por prioridade' : 'Ordenar por data'}>
          <ArrowUpDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {sorted.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">Nenhuma conversa</p>
        )}
        {sorted.map(conv => (
          <button key={conv.id} onClick={() => onSelect(conv)}
            className={`w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left
              ${selectedConv?.id === conv.id ? 'bg-muted/50' : ''}`}>
            <Avatar className="h-10 w-10 shrink-0">
              {conv.contact_photo && <AvatarImage src={conv.contact_photo} />}
              <AvatarFallback className="bg-primary/20 text-primary text-sm">
                {(conv.contact_name || conv.phone).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-foreground truncate">
                  {priorityIcon((conv as any).priority)}{' '}
                  {conv.contact_name || conv.phone}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                  {formatTime(conv.last_message_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground truncate">{conv.last_message || ''}</span>
                {(conv.unread_count || 0) > 0 && (
                  <Badge className="ml-1 h-5 min-w-5 flex items-center justify-center text-[10px] bg-primary text-primary-foreground shrink-0">
                    {conv.unread_count}
                  </Badge>
                )}
              </div>
            </div>
          </button>
        ))}
      </ScrollArea>
    </div>
  );
}
