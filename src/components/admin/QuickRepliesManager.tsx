import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Zap, Loader2 } from 'lucide-react';

interface QuickReply {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

export default function QuickRepliesManager() {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('quick_replies').select('*').order('created_at', { ascending: true });
    setReplies((data as QuickReply[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setTitle(''); setMessage(''); setModalOpen(true); };
  const openEdit = (r: QuickReply) => { setEditing(r); setTitle(r.title); setMessage(r.message); setModalOpen(true); };

  const handleSave = async () => {
    if (!title.trim() || !message.trim()) { toast.error('Preencha todos os campos'); return; }
    setSaving(true);
    try {
      if (editing) {
        await supabase.from('quick_replies').update({ title, message } as any).eq('id', editing.id);
        toast.success('Mensagem rápida atualizada');
      } else {
        await supabase.from('quick_replies').insert({ title, message } as any);
        toast.success('Mensagem rápida criada');
      }
      setModalOpen(false);
      load();
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta mensagem rápida?')) return;
    await supabase.from('quick_replies').delete().eq('id', id);
    toast.success('Excluída');
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Mensagens Rápidas
        </CardTitle>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : replies.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma mensagem rápida cadastrada</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead className="text-right w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {replies.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{r.message}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Mensagem Rápida' : 'Nova Mensagem Rápida'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título (atalho)</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Saudação" />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Texto da mensagem..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
