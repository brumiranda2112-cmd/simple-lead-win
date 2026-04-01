import { useMemo, useState } from 'react';
import * as storage from '@/lib/storage';
import { PIPELINE_COLUMNS, LEAD_PIPELINE_COLUMNS, LEAD_AREA_LABELS, LEAD_SOURCE_LABELS, LEAD_RESPONSIBLE_LABELS, LeadArea, LeadSource, LeadResponsible, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from '@/types/crm';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts';
import { Users, UserCheck, TrendingUp, DollarSign, Target, Clock, Trophy, AlertTriangle, UserPlus, Briefcase, Inbox, Percent, Timer, Award, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Lead, Task, UserGoal } from '@/types/crm';

const CHART_COLORS = ['hsl(25,95%,53%)', 'hsl(142,76%,36%)', 'hsl(45,93%,47%)', 'hsl(217,91%,60%)', 'hsl(262,83%,58%)', 'hsl(0,84%,60%)', 'hsl(200,80%,50%)', 'hsl(170,70%,45%)', 'hsl(30,80%,55%)'];
const tooltipStyle = { contentStyle: { backgroundColor: 'hsl(228,12%,10%)', border: '1px solid hsl(228,12%,18%)', borderRadius: '8px', color: 'hsl(210,40%,96%)' } };

function StatsCards({ items, label, icon: Icon, color, tasks }: { items: Lead[]; label: string; icon: any; color: string; tasks?: Task[] }) {
  const totalValue = items.reduce((s, l) => s + (l.estimatedValue || 0), 0);
  const allTasks = tasks || [];
  const pendingTasks = allTasks.filter(t => !t.completed && items.some(l => l.id === t.leadId)).length;
  const overdueTasks = allTasks.filter(t => !t.completed && new Date(t.dueDate) < new Date() && items.some(l => l.id === t.leadId)).length;

  const stats = [
    { label: `Total ${label}`, value: items.length, icon: Icon, color },
    { label: 'Valor Pipeline', value: `R$ ${(totalValue / 1000).toFixed(0)}k`, icon: TrendingUp, color },
    { label: 'Tarefas Pendentes', value: pendingTasks, icon: Clock, color: 'text-amber-400' },
    { label: 'Tarefas Atrasadas', value: overdueTasks, icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(s => (
        <Card key={s.label} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <s.icon className={`w-8 h-8 ${s.color} opacity-70`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function WinRateCard({ leads }: { leads: Lead[] }) {
  const { winRate, avgCycleDays, totalWon, totalLost } = useMemo(() => {
    const won = leads.filter(l => l.status === 'fechado' || l.leadType === 'cliente');
    const lost = leads.filter(l => l.wonLostReason?.toLowerCase().includes('perd'));
    const total = won.length + lost.length;
    const rate = total > 0 ? Math.round((won.length / total) * 100) : 0;

    // Avg cycle: time from creation to becoming client
    const cycles = won.filter(l => l.createdAt && l.updatedAt).map(l => {
      const start = new Date(l.createdAt).getTime();
      const end = new Date(l.updatedAt).getTime();
      return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    });
    const avg = cycles.length > 0 ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : 0;

    return { winRate: rate, avgCycleDays: avg, totalWon: won.length, totalLost: lost.length };
  }, [leads]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold mt-1 text-emerald-400">{winRate}%</p>
            </div>
            <Percent className="w-8 h-8 text-emerald-400 opacity-70" />
          </div>
          <Progress value={winRate} className="h-1.5 mt-2" />
        </CardContent>
      </Card>
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Ciclo Médio</p>
              <p className="text-2xl font-bold mt-1">{avgCycleDays} <span className="text-sm font-normal text-muted-foreground">dias</span></p>
            </div>
            <Timer className="w-8 h-8 text-blue-400 opacity-70" />
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Deals Ganhos</p>
              <p className="text-2xl font-bold mt-1 text-emerald-400">{totalWon}</p>
            </div>
            <Trophy className="w-8 h-8 text-emerald-400 opacity-70" />
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Deals Perdidos</p>
              <p className="text-2xl font-bold mt-1 text-destructive">{totalLost}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-destructive opacity-70" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TopSellers({ leads }: { leads: Lead[] }) {
  const ranking = useMemo(() => {
    const byResp: Record<string, { count: number; value: number }> = {};
    leads.filter(l => l.status === 'fechado' || l.leadType === 'cliente').forEach(l => {
      const r = l.responsible || 'Sem responsável';
      if (!byResp[r]) byResp[r] = { count: 0, value: 0 };
      byResp[r].count++;
      byResp[r].value += l.estimatedValue || 0;
    });
    return Object.entries(byResp)
      .map(([name, data]) => ({ name: LEAD_RESPONSIBLE_LABELS[name] || name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [leads]);

  if (ranking.length === 0) return null;

  const maxValue = ranking[0]?.value || 1;

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-amber-400" /> Top Vendedores</h3>
        <div className="space-y-3">
          {ranking.map((r, i) => (
            <div key={r.name} className="flex items-center gap-3">
              <span className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                i === 0 ? 'bg-amber-400/20 text-amber-400' :
                i === 1 ? 'bg-slate-400/20 text-slate-400' :
                i === 2 ? 'bg-orange-400/20 text-orange-400' :
                'bg-muted text-muted-foreground'
              )}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">{r.name}</span>
                  <span className="text-emerald-400 font-semibold shrink-0">R$ {(r.value / 1000).toFixed(0)}k</span>
                </div>
                <Progress value={(r.value / maxValue) * 100} className="h-1 mt-1" />
                <span className="text-[10px] text-muted-foreground">{r.count} deal{r.count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StalledDeals({ leads, staleDays = 7 }: { leads: Lead[]; staleDays?: number }) {
  const stalled = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - staleDays);
    return leads
      .filter(l => !['fechado', 'finalizado'].includes(l.status) && new Date(l.updatedAt) < cutoff)
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
      .slice(0, 10);
  }, [leads, staleDays]);

  if (stalled.length === 0) return null;

  return (
    <Card className="border-border/50 border-amber-500/20">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> Deals Parados ({stalled.length})
          <Badge variant="outline" className="text-[10px] ml-auto">+{staleDays} dias sem movimentação</Badge>
        </h3>
        <div className="space-y-2">
          {stalled.map(l => {
            const daysSince = Math.round((Date.now() - new Date(l.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
            return (
              <div key={l.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{l.name}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{l.responsible || 'Sem resp.'}</Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">R$ {(l.estimatedValue / 1000).toFixed(0)}k</span>
                  <Badge variant="destructive" className="text-[10px]">{daysSince}d parado</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function InboxWidget({ tasks, leads }: { tasks: Task[]; leads: Lead[] }) {
  const today = new Date().toISOString().split('T')[0];
  const overdue = tasks.filter(t => !t.completed && t.dueDate.split('T')[0] < today);
  const todayTasks = tasks.filter(t => !t.completed && t.dueDate.split('T')[0] === today);
  const urgent = tasks.filter(t => !t.completed && t.priority === 'urgente');
  const getLeadName = (id: string) => leads.find(l => l.id === id)?.name || 'Lead removido';

  const items = [...overdue, ...todayTasks, ...urgent.filter(t => !overdue.includes(t) && !todayTasks.includes(t))].slice(0, 8);

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Inbox className="w-4 h-4 text-primary" /> Mesa de Trabalho</h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Tudo em dia! 🎉</p>
        ) : (
          <div className="space-y-1.5">
            {items.map(t => (
              <div key={t.id} className={cn(
                'flex items-center gap-2 p-2 rounded-lg text-sm border',
                overdue.includes(t) ? 'border-destructive/30 bg-destructive/5' :
                t.priority === 'urgente' ? 'border-red-400/30 bg-red-400/5' :
                'border-border/50 bg-muted/20'
              )}>
                <Badge variant="outline" className={cn('text-[9px] shrink-0 px-1', TASK_PRIORITY_COLORS[t.priority])}>{TASK_PRIORITY_LABELS[t.priority]}</Badge>
                <span className="truncate font-medium">{t.title}</span>
                <span className="text-xs text-muted-foreground shrink-0 ml-auto">{getLeadName(t.leadId)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GoalsWidget({ goals }: { goals: UserGoal[] }) {
  if (goals.length === 0) return null;

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Metas</h3>
        <div className="space-y-3">
          {goals.map(g => {
            const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
            return (
              <div key={g.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{g.userName}</span>
                  <span className="text-xs text-muted-foreground">
                    {g.type === 'revenue' ? `R$ ${(g.current / 1000).toFixed(0)}k / R$ ${(g.target / 1000).toFixed(0)}k` : `${g.current} / ${g.target} deals`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={pct} className="h-2 flex-1" />
                  <span className={cn('text-xs font-bold', pct >= 100 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : 'text-muted-foreground')}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelCard({ title, data }: { title: string; data: { name: string; value: number; fill: string }[] }) {
  const hasData = data.some(d => d.value > 0);
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-4">{title}</h3>
        {hasData ? (
          <ResponsiveContainer width="100%" height={280}>
            <FunnelChart>
              <Tooltip {...tooltipStyle} />
              <Funnel dataKey="value" data={data.filter(d => d.value > 0)} isAnimationActive>
                <LabelList position="right" fill="hsl(210,40%,96%)" fontSize={11} dataKey="name" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        ) : <p className="text-center text-muted-foreground py-16">Sem dados</p>}
      </CardContent>
    </Card>
  );
}

function DistributionCharts({ items }: { items: Lead[] }) {
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(l => { counts[l.source] = (counts[l.source] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: LEAD_SOURCE_LABELS[k as LeadSource] || k, value: v }));
  }, [items]);

  const areaData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(l => { counts[l.area] = (counts[l.area] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: LEAD_AREA_LABELS[k as LeadArea] || k, value: v }));
  }, [items]);

  const responsibleData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(l => { if (l.responsible) counts[l.responsible] = (counts[l.responsible] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: LEAD_RESPONSIBLE_LABELS[k as LeadResponsible] || k, value: v }));
  }, [items]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="border-border/50">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-4">Por Origem</h3>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Tooltip {...tooltipStyle} />
                <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {sourceData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground py-16">Sem dados</p>}
        </CardContent>
      </Card>
      <Card className="border-border/50">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-4">Por Responsável</h3>
          {responsibleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={responsibleData}>
                <XAxis dataKey="name" tick={{ fill: 'hsl(215,16%,57%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(215,16%,57%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="value" fill="hsl(25,95%,53%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground py-16">Sem dados</p>}
        </CardContent>
      </Card>
      <Card className="border-border/50">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-4">Por Área</h3>
          {areaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Tooltip {...tooltipStyle} />
                <Pie data={areaData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {areaData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground py-16">Sem dados</p>}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const leads = storage.getLeadsByType('lead');
  const clients = storage.getLeadsByType('cliente');
  const allLeads = storage.getLeads();
  const tasks = storage.getTasks();
  const goals = storage.getGoals();

  const leadFunnelData = useMemo(() => {
    return LEAD_PIPELINE_COLUMNS.map(c => ({
      name: c.label, value: leads.filter(l => l.status === c.status).length, fill: c.color,
    }));
  }, [leads]);

  const clientFunnelData = useMemo(() => {
    return PIPELINE_COLUMNS.map(c => ({
      name: c.label, value: clients.filter(l => l.status === c.status).length, fill: c.color,
    }));
  }, [clients]);

  const timelineData = useMemo(() => {
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      months[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
    }
    return (items: Lead[]) => {
      const data = { ...months };
      items.forEach(l => { const k = l.createdAt.slice(0, 7); if (data[k] !== undefined) data[k]++; });
      return Object.entries(data).map(([k, v]) => ({ month: k.slice(5) + '/' + k.slice(2, 4), count: v }));
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Inbox + Win Rate (always visible) */}
      <div className="grid md:grid-cols-2 gap-6">
        <InboxWidget tasks={tasks} leads={allLeads} />
        <div className="space-y-4">
          <TopSellers leads={allLeads} />
          <GoalsWidget goals={goals} />
        </div>
      </div>

      <WinRateCard leads={allLeads} />
      <StalledDeals leads={allLeads} />

      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads" className="gap-2">
            <UserPlus className="h-4 w-4" /> Leads
          </TabsTrigger>
          <TabsTrigger value="clientes" className="gap-2">
            <Briefcase className="h-4 w-4" /> Clientes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-6 mt-4">
          <StatsCards items={leads} label="Leads" icon={UserPlus} color="text-primary" tasks={tasks} />
          <FunnelCard title="Funil de Leads" data={leadFunnelData} />
          <Card className="border-border/50">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-4">Evolução de Leads</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={timelineData(leads)}>
                  <XAxis dataKey="month" tick={{ fill: 'hsl(215,16%,57%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(215,16%,57%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Line type="monotone" dataKey="count" name="Leads" stroke="hsl(25,95%,53%)" strokeWidth={2} dot={{ fill: 'hsl(25,95%,53%)' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <DistributionCharts items={leads} />
        </TabsContent>

        <TabsContent value="clientes" className="space-y-6 mt-4">
          <StatsCards items={clients} label="Clientes" icon={Briefcase} color="text-accent-foreground" tasks={tasks} />
          <FunnelCard title="Funil de Clientes" data={clientFunnelData} />
          <Card className="border-border/50">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-4">Evolução de Clientes</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={timelineData(clients)}>
                  <XAxis dataKey="month" tick={{ fill: 'hsl(215,16%,57%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(215,16%,57%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Line type="monotone" dataKey="count" name="Clientes" stroke="hsl(142,76%,36%)" strokeWidth={2} dot={{ fill: 'hsl(142,76%,36%)' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <DistributionCharts items={clients} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
