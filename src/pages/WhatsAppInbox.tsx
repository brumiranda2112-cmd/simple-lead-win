import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Send, Search, User, Paperclip, UserPlus, ArrowLeft, Play, FileText, Image as ImageIcon } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { sendMessage, getConversations, getMessages, markAsRead } from '@/lib/whatsappService';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Conversation = Tables<'whatsapp_conversations'>;
type Message = Tables<'whatsapp_messages'>;

function formatTime(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Ontem';
  return format(d, 'dd/MM', { locale: ptBR });
}

export default function WhatsAppInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const data = await getMessages(convId);
      setMessages(data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, () => {
        loadConversations();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        const newMessage = payload.new as Message;
        if (selectedConv && newMessage.conversation_id === selectedConv.id) {
          setMessages(prev => [...prev, newMessage]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadConversations, selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    setMobileShowChat(true);
    await loadMessages(conv.id);
    if ((conv.unread_count || 0) > 0) {
      await markAsRead(conv.id);
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    }
  };

  const handleSend = async () => {
    if (!newMsg.trim() || !selectedConv) return;
    setSending(true);
    try {
      await sendMessage(selectedConv.phone, newMsg.trim());
      setNewMsg('');
    } catch (e: any) {
      toast.error('Erro ao enviar: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  const handleCreateLead = () => {
    if (!selectedConv) return;
    const leads = JSON.parse(localStorage.getItem('crm_leads') || '[]');
    const newLead = {
      id: crypto.randomUUID(),
      name: leadName || selectedConv.contact_name || selectedConv.phone,
      email: leadEmail,
      phone: selectedConv.phone,
      status: 'lead_qualificado',
      value: 0,
      notes: 'Lead criado via WhatsApp Inbox',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      leadType: 'lead',
    };
    leads.push(newLead);
    localStorage.setItem('crm_leads', JSON.stringify(leads));
    // Link lead_id to conversation
    supabase.from('whatsapp_conversations').update({ lead_id: newLead.id }).eq('id', selectedConv.id);
    toast.success('Lead criado com sucesso!');
    setShowLeadModal(false);
    setLeadName('');
    setLeadEmail('');
  };

  const filtered = conversations.filter(c => {
    const q = search.toLowerCase();
    return !q || (c.contact_name?.toLowerCase().includes(q)) || c.phone.includes(q);
  });

  const renderMessageContent = (msg: Message) => {
    const type = msg.type || 'text';
    if (type === 'image' && msg.media_url) {
      return (
        <div>
          <img src={msg.media_url} alt="imagem" className="max-w-[240px] rounded-lg mb-1" />
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

  const convList = (
    <div className="flex flex-col h-full border-r border-border/50">
      <div className="p-3 border-b border-border/50">
        <h2 className="text-lg font-bold mb-2 text-foreground">WhatsApp</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar conversa..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-muted/30 border-border/50" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">Nenhuma conversa</p>
        )}
        {filtered.map(conv => (
          <button key={conv.id} onClick={() => selectConversation(conv)}
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

  const chatView = selectedConv ? (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border/50 bg-card/50">
        <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setMobileShowChat(false)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-9 w-9">
          {selectedConv.contact_photo && <AvatarImage src={selectedConv.contact_photo} />}
          <AvatarFallback className="bg-primary/20 text-primary text-xs">
            {(selectedConv.contact_name || selectedConv.phone).slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{selectedConv.contact_name || selectedConv.phone}</p>
          <p className="text-xs text-muted-foreground">{selectedConv.phone}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          setLeadName(selectedConv.contact_name || '');
          setShowLeadModal(true);
        }}>
          <UserPlus className="h-4 w-4 mr-1" /> Criar Lead
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2 max-w-2xl mx-auto">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                msg.from_me
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted text-foreground rounded-bl-md'
              }`}>
                {renderMessageContent(msg)}
                <p className={`text-[10px] mt-1 text-right ${msg.from_me ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : ''}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border/50 bg-card/50">
        <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
          <Input value={newMsg} onChange={e => setNewMsg(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="flex-1 bg-muted/30 border-border/50" disabled={sending} />
          <Button type="submit" size="icon" disabled={sending || !newMsg.trim()} className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  ) : (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <User className="h-16 w-16 mx-auto mb-4 opacity-30" />
        <p>Selecione uma conversa</p>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      <div className="flex-1 flex overflow-hidden rounded-lg border border-border/50 bg-card/30">
        {/* Desktop: both panels. Mobile: toggle */}
        <div className={`w-full md:w-80 lg:w-96 shrink-0 ${mobileShowChat ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
          {convList}
        </div>
        <div className={`flex-1 ${!mobileShowChat ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
          {chatView}
        </div>
      </div>

      {/* Create Lead Modal */}
      <Dialog open={showLeadModal} onOpenChange={setShowLeadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Lead a partir do contato</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={leadName} onChange={e => setLeadName(e.target.value)} placeholder="Nome do lead" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={leadEmail} onChange={e => setLeadEmail(e.target.value)} placeholder="email@exemplo.com" type="email" />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={selectedConv?.phone || ''} disabled />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeadModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateLead}>Criar Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
