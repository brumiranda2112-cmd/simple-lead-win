import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PERMISSION_MODULES, ALL_PERMISSION_KEYS, useUserPermissions } from '@/hooks/usePermissions';

interface Props {
  userId: string;
  userName: string;
  userRole: string | null;
  onClose: () => void;
}

export default function UserPermissionsManager({ userId, userName, userRole, onClose }: Props) {
  const { permissions, loading, savePermissions } = useUserPermissions(userId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(new Set(permissions));
  }, [permissions]);

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleModule = (moduleActions: string[]) => {
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = moduleActions.every(a => next.has(a));
      moduleActions.forEach(a => allSelected ? next.delete(a) : next.add(a));
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(ALL_PERMISSION_KEYS));
  const clearAll = () => setSelected(new Set());

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePermissions(Array.from(selected));
      toast.success(`Permissões de ${userName} atualizadas`);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Defina o que <strong>{userName}</strong> pode ver e fazer no CRM.
          {userRole === 'admin' && (
            <span className="ml-2 text-xs text-amber-600">(Admins têm acesso total automaticamente)</span>
          )}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={selectAll}>Marcar Tudo</Button>
          <Button size="sm" variant="outline" onClick={clearAll}>Desmarcar Tudo</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left py-2 px-3 font-medium">Módulo</th>
              <th className="text-center py-2 px-3 font-medium w-20">Ver</th>
              <th className="text-center py-2 px-3 font-medium w-20">Criar</th>
              <th className="text-center py-2 px-3 font-medium w-20">Editar</th>
              <th className="text-center py-2 px-3 font-medium w-20">Apagar</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MODULES.map((mod) => {
              const actionMap = new Map(mod.actions.map(a => [a.key.split('.')[1], a]));
              const allKeys = mod.actions.map(a => a.key);
              const allChecked = allKeys.every(k => selected.has(k));

              return (
                <tr key={mod.module} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allChecked}
                        onCheckedChange={() => toggleModule(allKeys)}
                      />
                      <Label className="font-medium cursor-pointer" onClick={() => toggleModule(allKeys)}>
                        {mod.label}
                      </Label>
                    </div>
                  </td>
                  {['view', 'create', 'edit', 'delete'].map(action => {
                    const perm = actionMap.get(action) || actionMap.get('manage_users');
                    // Special mapping for admin and whatsapp
                    const actualPerm = mod.actions.find(a => {
                      const parts = a.key.split('.');
                      return parts[1] === action;
                    });

                    if (!actualPerm) {
                      return <td key={action} className="text-center py-2.5 px-3 text-muted-foreground">—</td>;
                    }

                    return (
                      <td key={action} className="text-center py-2.5 px-3">
                        <Checkbox
                          checked={selected.has(actualPerm.key)}
                          onCheckedChange={() => toggle(actualPerm.key)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShieldCheck className="h-4 w-4 mr-2" /> Salvar Permissões</>}
        </Button>
      </div>
    </div>
  );
}
