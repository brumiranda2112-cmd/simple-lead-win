import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Tag, Loader2 } from 'lucide-react';

interface LabelItem {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

const COLOR_OPTIONS = [
  '#3b82f6', '#2563eb', '#ef4444', '#eab308', '#22c55e',
  '#8b5cf6', '#ec4899', '#f97316', '#6b7280', '#14b8a6',
];

export default function LabelsManager() {
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LabelItem | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('labels').select('*').order('created_at', { ascending: true });
    setLabels((data as LabelItem[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setName(''); setColor('#3b82f6'); setModalOpen(true); };
  const openEdit = (l: LabelItem) => { setEditing(l); setName(l.name); setColor(l.color); setModalOpen(true); };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Preencha o nome'); return; }
    setSaving(true);
    try {
      if (editing) {
        await supabase.from('labels').update({ name, color } as any).eq('id', editing.id);
        toast.success('Etiqueta atualizada');
      } else {
        await supabase.from('labels').insert({ name, color } as any);
        toast.success('Etiqueta criada');
      }
      setModalOpen(false);
      load();
    } catch (err: any) { toast.error(err.message); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta etiqueta?')) return;
    await supabase.from('labels').delete().eq('id', id);
    toast.success('Excluída');
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary" />
          Etiquetas
        </CardTitle>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova</Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : labels.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma etiqueta cadastrada</p>
        ) : (
          <div className="space-y-2">
            {labels.map(l => (
              <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                  <span className="font-medium text-sm">{l.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(l.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Etiqueta' : 'Nova Etiqueta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Urgente" />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
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
