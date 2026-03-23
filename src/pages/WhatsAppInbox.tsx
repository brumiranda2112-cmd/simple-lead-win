import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, X } from 'lucide-react';
import { sendMessage, sendMedia, uploadMedia, getConversations, getMessages, markAsRead, getMediaType } from '@/lib/whatsappService';
import { toast } from 'sonner';
import ConversationList from '@/components/whatsapp/ConversationList';
import ChatHeader from '@/components/whatsapp/ChatHeader';
import MessageBubble from '@/components/whatsapp/MessageBubble';
import MessageInput from '@/components/whatsapp/MessageInput';
import TransferModal from '@/components/whatsapp/TransferModal';
import NewConversationModal from '@/components/whatsapp/NewConversationModal';
import type { Conversation, Message, Profile } from '@/components/whatsapp/types';

export default function WhatsAppInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Modals
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations((data as Conversation[]) || []);
    } catch (e) { console.error(e); }
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const data = await getMessages(convId);
      setMessages(data || []);
    } catch (e) { console.error(e); }
  }, []);

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, name, email, avatar_url').eq('is_active', true);
    if (data) setProfiles(data);
  }, []);

  useEffect(() => { loadConversations(); loadProfiles(); }, [loadConversations, loadProfiles]);

  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, () => loadConversations())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        const newMessage = payload.new as Message;
        if (selectedConv && newMessage.conversation_id === selectedConv.id) {
          setMessages(prev => [...prev, newMessage]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadConversations, selectedConv]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const selectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    setMobileShowChat(true);
    await loadMessages(conv.id);
    if ((conv.unread_count || 0) > 0) {
      await markAsRead(conv.id);
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    }
  };

  const handleSend = async (text: string) => {
    if (!selectedConv) return;
    setSending(true);
    try {
      await sendMessage(selectedConv.phone, text);
    } catch (e: any) {
      toast.error('Erro ao enviar: ' + e.message);
    } finally { setSending(false); }
  };

  const handleFileSelect = async (file: File) => {
    if (!selectedConv) return;
    setSending(true);
    try {
      const mediaType = getMediaType(file);
      const url = await uploadMedia(file);
      await sendMedia(selectedConv.phone, url, mediaType, '', file.type, file.name);
      toast.success('Mídia enviada!');
    } catch (err: any) {
      toast.error('Erro ao enviar mídia: ' + err.message);
    } finally { setSending(false); }
  };

  const handleFinish = async () => {
    if (!selectedConv) return;
    await supabase.from('whatsapp_conversations').update({ status: 'finished' } as any).eq('id', selectedConv.id);
    toast.success('Conversa finalizada');
    setSelectedConv(null);
    setMobileShowChat(false);
    loadConversations();
  };

  const handlePriorityChange = async (priority: string) => {
    if (!selectedConv) return;
    await supabase.from('whatsapp_conversations').update({ priority } as any).eq('id', selectedConv.id);
    setSelectedConv({ ...selectedConv, priority } as any);
    loadConversations();
  };

  const handleTransfer = async (userId: string) => {
    if (!selectedConv) return;
    await supabase.from('whatsapp_conversations').update({ assigned_to: userId } as any).eq('id', selectedConv.id);
    const profile = profiles.find(p => p.id === userId);
    toast.success(`Conversa transferida para ${profile?.name || 'usuário'}`);
    setSelectedConv({ ...selectedConv, assigned_to: userId } as any);
    loadConversations();
  };

  const handleMarkUnread = async () => {
    if (!selectedConv) return;
    await supabase.from('whatsapp_conversations').update({ unread_count: 1 }).eq('id', selectedConv.id);
    toast.success('Marcada como não lida');
    loadConversations();
  };

  const handleNewConversation = async (phone: string, message: string) => {
    setSending(true);
    try {
      await sendMessage(phone, message);
      toast.success('Mensagem enviada!');
      setShowNewConvModal(false);
      loadConversations();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally { setSending(false); }
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
    supabase.from('whatsapp_conversations').update({ lead_id: newLead.id }).eq('id', selectedConv.id);
    toast.success('Lead criado com sucesso!');
    setShowLeadModal(false);
    setLeadName('');
    setLeadEmail('');
  };

  const chatView = selectedConv ? (
    <div className="flex flex-col h-full">
      <ChatHeader
        conversation={selectedConv}
        profiles={profiles}
        onBack={() => setMobileShowChat(false)}
        onCreateLead={() => { setLeadName(selectedConv.contact_name || ''); setShowLeadModal(true); }}
        onFinish={handleFinish}
        onTransfer={() => setShowTransferModal(true)}
        onPriorityChange={handlePriorityChange}
        onMarkUnread={handleMarkUnread}
      />
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2 max-w-2xl mx-auto">
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} onImageClick={setImagePreview} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <MessageInput onSend={handleSend} onFileSelect={handleFileSelect} sending={sending} />
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
        <div className={`w-full md:w-80 lg:w-96 shrink-0 ${mobileShowChat ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
          <ConversationList
            conversations={conversations}
            selectedConv={selectedConv}
            profiles={profiles}
            onSelect={selectConversation}
            onNewConversation={() => setShowNewConvModal(true)}
          />
        </div>
        <div className={`flex-1 ${!mobileShowChat ? 'hidden md:flex md:flex-col' : 'flex flex-col'}`}>
          {chatView}
        </div>
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
          <DialogContent className="max-w-3xl p-1">
            <Button variant="ghost" size="icon" className="absolute right-2 top-2 z-10" onClick={() => setImagePreview(null)}>
              <X className="h-4 w-4" />
            </Button>
            <img src={imagePreview} alt="preview" className="w-full h-auto rounded-lg" />
          </DialogContent>
        </Dialog>
      )}

      {/* Create Lead Modal */}
      <Dialog open={showLeadModal} onOpenChange={setShowLeadModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Criar Lead a partir do contato</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={leadName} onChange={e => setLeadName(e.target.value)} placeholder="Nome do lead" /></div>
            <div><Label>Email</Label><Input value={leadEmail} onChange={e => setLeadEmail(e.target.value)} placeholder="email@exemplo.com" type="email" /></div>
            <div><Label>WhatsApp</Label><Input value={selectedConv?.phone || ''} disabled /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeadModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateLead}>Criar Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Modal */}
      <TransferModal open={showTransferModal} onClose={() => setShowTransferModal(false)} profiles={profiles} onTransfer={handleTransfer} />

      {/* New Conversation Modal */}
      <NewConversationModal open={showNewConvModal} onClose={() => setShowNewConvModal(false)} onSend={handleNewConversation} sending={sending} />
    </div>
  );
}
