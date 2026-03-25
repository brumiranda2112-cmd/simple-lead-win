import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, UserPlus, PhoneOff, ArrowRightLeft, MoreVertical, BellOff, Ban, Clock, Kanban, Trash2 } from 'lucide-react';
import type { Conversation, Profile } from './types';
import LabelsPicker from './LabelsPicker';

interface Props {
  conversation: Conversation;
  profiles: Profile[];
  onBack: () => void;
  onCreateLead: () => void;
  onCreateClient: () => void;
  onFinish: () => void;
  onTransfer: () => void;
  onPriorityChange: (priority: string) => void;
  onMarkUnread: () => void;
  onSchedule: () => void;
  onLabelsUpdate: (labels: string[]) => void;
}

export default function ChatHeader({ conversation, profiles, onBack, onCreateLead, onCreateClient, onFinish, onTransfer, onPriorityChange, onMarkUnread, onSchedule, onLabelsUpdate }: Props) {
  const assignedProfile = profiles.find(p => p.id === conversation.assigned_to);

  return (
    <div className="flex items-center gap-2 p-3 border-b border-border/50 bg-card/50 flex-wrap">
      <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={onBack}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <Avatar className="h-9 w-9 shrink-0">
        {conversation.contact_photo && <AvatarImage src={conversation.contact_photo} />}
        <AvatarFallback className="bg-primary/20 text-primary text-xs">
          {(conversation.contact_name || conversation.phone).slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">
          {conversation.contact_name || conversation.phone}
        </p>
        <p className="text-xs text-muted-foreground">
          {conversation.phone}
          {assignedProfile && <span className="ml-2 text-primary">• {assignedProfile.name}</span>}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Select value={conversation.priority || 'normal'} onValueChange={onPriorityChange}>
          <SelectTrigger className="h-8 w-[110px] text-xs bg-muted/30 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">🔴 Alta</SelectItem>
            <SelectItem value="urgent">⚡ Urgente</SelectItem>
          </SelectContent>
        </Select>

        <LabelsPicker
          conversationId={conversation.id}
          currentLabels={(conversation as any).labels || []}
          onUpdate={onLabelsUpdate}
        />

        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onTransfer}>
          <ArrowRightLeft className="h-3.5 w-3.5" /> Transferir
        </Button>

        <Button variant="destructive" size="sm" className="h-8 text-xs gap-1" onClick={onFinish}>
          <PhoneOff className="h-3.5 w-3.5" /> Finalizar
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Kanban className="h-3.5 w-3.5" /> Kanban
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCreateLead}>
              <UserPlus className="h-4 w-4 mr-2" /> Criar Lead
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateClient}>
              <UserPlus className="h-4 w-4 mr-2" /> Criar Cliente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onSchedule}>
              <Clock className="h-4 w-4 mr-2" /> Agendar Mensagem
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMarkUnread}>
              <BellOff className="h-4 w-4 mr-2" /> Marcar como não lida
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Ban className="h-4 w-4 mr-2" /> Bloquear contato
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
