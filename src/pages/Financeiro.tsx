import { useState, useMemo, useEffect } from 'react';
import * as storage from '@/lib/storage';
import { Transaction, TransactionType, EXPENSE_CATEGORY_LABELS, REVENUE_CATEGORY_LABELS, WITHDRAWAL_CATEGORY_LABELS, LEAD_RESPONSIBLE_LABELS, LeadResponsible, ExpenseCategory, RevenueCategory, WithdrawalCategory, PIPELINE_COLUMNS } from '@/types/crm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionForm } from '@/components/TransactionForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import { Plus, TrendingUp, TrendingDown, DollarSign, Target, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight, Trash2, Pencil } from 'lucide-react';

const COLORS = ['hsl(25, 95%, 53%)', 'hsl(45, 93%, 47%)', 'hsl(200, 80%, 50%)', 'hsl(262, 83%, 58%)', 'hsl(142, 71%, 45%)', 'hsl(170, 70%, 45%)', 'hsl(0, 72%, 51%)'];

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

// Pipeline stage conversion probabilities
const STAGE_PROBABILITY: Record<string, number> = {
  cliente_novo: 0.1,
  diagnostico: 0.2,
  call_cliente: 0.35,
  mvp_sistema: 0.5,
  aprovacao_cliente: 0.7,
  contrato_fechado: 1.0,
  desenvolvimento: 1.0,
  periodo_ajustes: 1.0,
  finalizado: 1.0,
};

export default function Financeiro() {
  const [transactions, setTransactions] = useState<Transaction[]>(storage.getTransactions());
  const [formOpen, setFormOpen] = useState(false);
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [defaultType, setDefaultType] = useState<TransactionType>('despesa');
  const [period, setPeriod] = useState('all');

  const leads = storage.getLeads();

  // Sync revenue from pipeline on mount
  useEffect(() => {
    storage.syncRevenueFromLeads();
    setTransactions(storage.getTransactions());
  }, []);

  const refresh = () => setTransactions(storage.getTransactions());

  // Filter by period
  const filteredTxns = useMemo(() => {
    if (period === 'all') return transactions;
    const now = new Date();
    const cutoff = new Date();
    if (period === '30') cutoff.setDate(now.getDate() - 30);
    if (period === '90') cutoff.setDate(now.getDate() - 90);
    if (period === '180') cutoff.setDate(now.getDate() - 180);
    if (period === '365') cutoff.setDate(now.getDate() - 365);
    return transactions.filter(t => new Date(t.date) >= cutoff);
  }, [transactions, period]);

  // Stats
  const stats = useMemo(() => {
    const receitas = filteredTxns.filter(t => t.type === 'receita');
    const despesas = filteredTxns.filter(t => t.type === 'despesa');
    const retiradas = filteredTxns.filter(t => t.type === 'retirada');
    const totalReceita = receitas.reduce((s, t) => s + t.value, 0);
    const totalDespesa = despesas.reduce((s, t) => s + t.value, 0);
    const totalRetirada = retiradas.reduce((s, t) => s + t.value, 0);
    const lucro = totalReceita - totalDespesa - totalRetirada;
    const margem = totalReceita > 0 ? ((lucro / totalReceita) * 100).toFixed(1) : '0';

    // Monthly recurring
    const recorrente = transactions.filter(t => t.recurring).reduce((s, t) => s + (t.type !== 'receita' ? -t.value : t.value), 0);

    // Forecast from pipeline
    const forecast = leads
      .filter(l => !['finalizado'].includes(l.status) && l.estimatedValue > 0)
      .reduce((s, l) => s + l.estimatedValue * (STAGE_PROBABILITY[l.status] || 0.1), 0);

    // By responsible
    const byResponsible: Record<string, { receita: number; despesa: number; retirada: number }> = {};
    filteredTxns.forEach(t => {
      const r = t.responsible || 'sem_responsavel';
      if (!byResponsible[r]) byResponsible[r] = { receita: 0, despesa: 0, retirada: 0 };
      if (t.type === 'receita') byResponsible[r].receita += t.value;
      else if (t.type === 'retirada') byResponsible[r].retirada += t.value;
      else byResponsible[r].despesa += t.value;
    });

    return { totalReceita, totalDespesa, totalRetirada, lucro, margem, recorrente, forecast, byResponsible };
  }, [filteredTxns, leads, transactions]);

  // Charts data
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; receita: number; despesa: number; lucro: number }> = {};
    const allTxns = period === 'all' ? transactions : filteredTxns;
    allTxns.forEach(t => {
      const m = t.date.substring(0, 7); // YYYY-MM
      if (!months[m]) months[m] = { month: m, receita: 0, despesa: 0, lucro: 0 };
      if (t.type === 'receita') months[m].receita += t.value;
      else months[m].despesa += t.value;
    });
    return Object.values(months)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(m => ({ ...m, lucro: m.receita - m.despesa, month: m.month.split('-').reverse().join('/') }));
  }, [transactions, filteredTxns, period]);

  const expenseByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredTxns.filter(t => t.type === 'despesa').forEach(t => {
      const label = EXPENSE_CATEGORY_LABELS[t.category as ExpenseCategory] || t.category;
      cats[label] = (cats[label] || 0) + t.value;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [filteredTxns]);

  const revenueByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredTxns.filter(t => t.type === 'receita').forEach(t => {
      const label = REVENUE_CATEGORY_LABELS[t.category as RevenueCategory] || t.category;
      cats[label] = (cats[label] || 0) + t.value;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [filteredTxns]);

  const forecastData = useMemo(() => {
    return PIPELINE_COLUMNS
      .filter(c => !['finalizado'].includes(c.status))
      .map(col => {
        const colLeads = leads.filter(l => l.status === col.status);
        const total = colLeads.reduce((s, l) => s + l.estimatedValue, 0);
        const weighted = total * (STAGE_PROBABILITY[col.status] || 0.1);
        return { name: col.label, total, weighted, prob: Math.round((STAGE_PROBABILITY[col.status] || 0.1) * 100) };
      })
      .filter(d => d.total > 0);
  }, [leads]);

  const responsibleData = useMemo(() => {
    return Object.entries(stats.byResponsible).map(([key, val]) => ({
      name: LEAD_RESPONSIBLE_LABELS[key as LeadResponsible] || 'Sem responsável',
      receita: val.receita,
      despesa: val.despesa,
      lucro: val.receita - val.despesa,
    }));
  }, [stats.byResponsible]);

  const handleDelete = () => {
    if (deleteId) { storage.deleteTransaction(deleteId); setDeleteId(null); refresh(); }
  };

  const getLeadName = (leadId?: string) => {
    if (!leadId) return '-';
    const lead = leads.find(l => l.id === leadId);
    return lead?.name || '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 3 meses</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { setDefaultType('receita'); setEditTxn(null); setFormOpen(true); }}>
            <ArrowUpRight className="w-4 h-4 mr-1 text-emerald-500" />Receita
          </Button>
          <Button variant="outline" onClick={() => { setDefaultType('retirada'); setEditTxn(null); setFormOpen(true); }}>
            <ArrowDownRight className="w-4 h-4 mr-1 text-orange-500" />Retirada
          </Button>
          <Button onClick={() => { setDefaultType('despesa'); setEditTxn(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" />Despesa
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Receita Total</p>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-emerald-500">{fmt(stats.totalReceita)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Despesas</p>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-red-500">{fmt(stats.totalDespesa)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Lucro Líquido</p>
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <p className={`text-2xl font-bold mt-1 ${stats.lucro >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{fmt(stats.lucro)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Margem: {stats.margem}%</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Forecast Pipeline</p>
            <Target className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-amber-500">{fmt(stats.forecast)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Ponderado por probabilidade</p>
        </Card>
      </div>

      {/* Second row cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Recorrente Mensal</p>
            <PiggyBank className="w-5 h-5 text-blue-400" />
          </div>
          <p className={`text-xl font-bold mt-1 ${stats.recorrente >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{fmt(stats.recorrente)}</p>
        </Card>
        {Object.entries(stats.byResponsible).map(([key, val]) => (
          <Card key={key} className="p-4">
            <p className="text-sm text-muted-foreground">{LEAD_RESPONSIBLE_LABELS[key as LeadResponsible] || 'Sem responsável'}</p>
            <p className="text-xl font-bold mt-1 text-emerald-500">{fmt(val.receita)}</p>
            <p className="text-xs text-muted-foreground">Despesas: {fmt(val.despesa)}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="visao">
        <TabsList>
          <TabsTrigger value="visao">Visão Geral</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="transacoes">Transações</TabsTrigger>
        </TabsList>

        <TabsContent value="visao" className="space-y-6 mt-4">
          {/* Revenue vs Expenses over time */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Receita vs Despesas por Mês</h3>
            {monthlyData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Area type="monotone" dataKey="receita" name="Receita" fill="hsl(142, 71%, 45%)" fillOpacity={0.15} stroke="hsl(142, 71%, 45%)" strokeWidth={2} />
                  <Area type="monotone" dataKey="despesa" name="Despesas" fill="hsl(0, 72%, 51%)" fillOpacity={0.15} stroke="hsl(0, 72%, 51%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="lucro" name="Lucro" stroke="hsl(25, 95%, 53%)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expenses by category */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-4">Despesas por Categoria</h3>
              {expenseByCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem despesas</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Revenue by category */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-4">Receita por Categoria</h3>
              {revenueByCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem receitas</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={revenueByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {revenueByCategory.map((_, i) => <Cell key={i} fill={COLORS[(i + 3) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* By responsible */}
            <Card className="p-5 md:col-span-2">
              <h3 className="text-sm font-semibold mb-4">Desempenho por Responsável</h3>
              {responsibleData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={responsibleData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Legend />
                    <Bar dataKey="receita" name="Receita" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesa" name="Despesas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="lucro" name="Lucro" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6 mt-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-2">Previsão de Receita por Etapa do Pipeline</h3>
            <p className="text-xs text-muted-foreground mb-4">Valor total × probabilidade de conversão da etapa</p>
            {forecastData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem leads no pipeline</p>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={forecastData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} width={120} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Bar dataKey="total" name="Valor Total" fill="hsl(var(--muted-foreground))" fillOpacity={0.3} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="weighted" name="Valor Ponderado" fill="hsl(25, 95%, 53%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>Etapa</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Probabilidade</TableHead>
                  <TableHead>Valor Ponderado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PIPELINE_COLUMNS.filter(c => c.status !== 'finalizado').map(col => {
                  const colLeads = leads.filter(l => l.status === col.status);
                  const total = colLeads.reduce((s, l) => s + l.estimatedValue, 0);
                  const prob = STAGE_PROBABILITY[col.status] || 0.1;
                  return (
                    <TableRow key={col.status}>
                      <TableCell><Badge style={{ backgroundColor: col.color, color: '#fff' }}>{col.label}</Badge></TableCell>
                      <TableCell>{colLeads.length}</TableCell>
                      <TableCell>{fmt(total)}</TableCell>
                      <TableCell>{Math.round(prob * 100)}%</TableCell>
                      <TableCell className="font-medium text-primary">{fmt(total * prob)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="transacoes" className="mt-4">
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTxns.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">Nenhuma transação</TableCell></TableRow>
                ) : [...filteredTxns].sort((a, b) => b.date.localeCompare(a.date)).map(txn => (
                  <TableRow key={txn.id}>
                    <TableCell className="text-sm">{new Date(txn.date + 'T12:00:00').toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <Badge variant={txn.type === 'receita' ? 'default' : 'destructive'} className={txn.type === 'receita' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : ''}>
                        {txn.type === 'receita' ? '↑ Receita' : '↓ Despesa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {txn.type === 'receita'
                        ? REVENUE_CATEGORY_LABELS[txn.category as RevenueCategory] || txn.category
                        : txn.type === 'retirada'
                        ? WITHDRAWAL_CATEGORY_LABELS[txn.category as WithdrawalCategory] || txn.category
                        : EXPENSE_CATEGORY_LABELS[txn.category as ExpenseCategory] || txn.category}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{txn.description}</TableCell>
                    <TableCell className="text-sm">{getLeadName(txn.leadId)}</TableCell>
                    <TableCell className="text-sm">{txn.responsible ? LEAD_RESPONSIBLE_LABELS[txn.responsible as LeadResponsible] : '-'}</TableCell>
                    <TableCell className={`font-medium ${txn.type === 'receita' ? 'text-emerald-500' : txn.type === 'retirada' ? 'text-orange-500' : 'text-red-500'}`}>
                      {txn.type === 'receita' ? '+' : '-'} {fmt(txn.value)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditTxn(txn); setDefaultType(txn.type); setFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(txn.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <TransactionForm
        open={formOpen}
        onOpenChange={o => { setFormOpen(o); if (!o) setEditTxn(null); }}
        transaction={editTxn}
        onSave={refresh}
        defaultType={defaultType}
      />

      <AlertDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar transação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Deletar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
