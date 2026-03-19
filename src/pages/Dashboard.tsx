import { useMemo } from 'react';
import * as storage from '@/lib/storage';
import { PIPELINE_COLUMNS, LEAD_AREA_LABELS, LEAD_SOURCE_LABELS, LeadArea, LeadSource, LeadStatus } from '@/types/crm';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts';
import { Users, UserCheck, TrendingUp, DollarSign, Target, Clock, Trophy, AlertTriangle } from 'lucide-react';

const CHART_COLORS = ['hsl(217,91%,60%)', 'hsl(142,76%,36%)', 'hsl(45,93%,47%)', 'hsl(25,95%,53%)', 'hsl(262,83%,58%)', 'hsl(0,84%,60%)'];

export default function Dashboard() {
  const leads = storage.getLeads();
  const tasks = storage.getTasks();

  const stats = useMemo(() => {
    const active = leads.filter(l => l.status !== 'ganho' && l.status !== 'perdido');
    const won = leads.filter(l => l.status === 'ganho');
    const total = leads.length;
    const convRate = total > 0 ? (won.length / total * 100) : 0;
    const inNegotiation = active.reduce((s, l) => s + (l.estimatedValue || 0), 0);
    const wonValue = won.reduce((s, l) => s + (l.estimatedValue || 0), 0);
    const pendingTasks = tasks.filter(t => !t.completed).length;
    const overdue = storage.getOverdueTasks().length;

    return [
      { label: 'Total Leads', value: total, icon: Users, color: 'text-primary' },
      { label: 'Leads Ativos', value: active.length, icon: UserCheck, color: 'text-success' },
      { label: 'Taxa Conversão', value: `${convRate.toFixed(1)}%`, icon: Target, color: 'text-warning' },
      { label: 'Em Negociação', value: `R$ ${(inNegotiation / 1000).toFixed(0)}k`, icon: TrendingUp, color: 'text-primary' },
      { label: 'Valor Ganho', value: `R$ ${(wonValue / 1000).toFixed(0)}k`, icon: Trophy, color: 'text-success' },
      { label: 'Leads Ganhos', value: won.length, icon: DollarSign, color: 'text-success' },
      { label: 'Tarefas Pendentes', value: pendingTasks, icon: Clock, color: 'text-warning' },
      { label: 'Tarefas Atrasadas', value: overdue, icon: AlertTriangle, color: 'text-destructive' },
    ];
  }, [leads, tasks]);

  const funnelData = useMemo(() => {
    return PIPELINE_COLUMNS.filter(c => c.status !== 'perdido').map(c => ({
      name: c.label,
      value: leads.filter(l => l.status === c.status).length,
      fill: c.color,
    }));
  }, [leads]);

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { counts[l.source] = (counts[l.source] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: LEAD_SOURCE_LABELS[k as LeadSource] || k, value: v }));
  }, [leads]);

  const areaData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { counts[l.area] = (counts[l.area] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: LEAD_AREA_LABELS[k as LeadArea] || k, value: v }));
  }, [leads]);

  const timelineData = useMemo(() => {
    const months: Record<string, { created: number; won: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { created: 0, won: 0 };
    }
    leads.forEach(l => {
      const key = l.createdAt.slice(0, 7);
      if (months[key]) months[key].created++;
      if (l.status === 'ganho' && months[l.updatedAt.slice(0, 7)]) months[l.updatedAt.slice(0, 7)].won++;
    });
    return Object.entries(months).map(([k, v]) => ({ month: k.slice(5) + '/' + k.slice(2, 4), ...v }));
  }, [leads]);

  const tooltipStyle = { contentStyle: { backgroundColor: 'hsl(228,12%,10%)', border: '1px solid hsl(228,12%,18%)', borderRadius: '8px', color: 'hsl(210,40%,96%)' } };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats cards */}
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

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Funnel */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-4">Funil de Conversão</h3>
            {funnelData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <FunnelChart>
                  <Tooltip {...tooltipStyle} />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" fill="hsl(210,40%,96%)" fontSize={12} dataKey="name" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-16">Adicione leads para ver o funil</p>}
          </CardContent>
        </Card>

        {/* Pie - by source */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-4">Leads por Origem</h3>
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

        {/* Bar - by area */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-4">Leads por Área</h3>
            {areaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={areaData}>
                  <XAxis dataKey="name" tick={{ fill: 'hsl(215,16%,57%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(215,16%,57%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" fill="hsl(217,91%,60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-16">Sem dados</p>}
          </CardContent>
        </Card>

        {/* Line - timeline */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-4">Evolução no Tempo</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timelineData}>
                <XAxis dataKey="month" tick={{ fill: 'hsl(215,16%,57%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(215,16%,57%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="created" name="Criados" stroke="hsl(217,91%,60%)" strokeWidth={2} dot={{ fill: 'hsl(217,91%,60%)' }} />
                <Line type="monotone" dataKey="won" name="Ganhos" stroke="hsl(142,76%,36%)" strokeWidth={2} dot={{ fill: 'hsl(142,76%,36%)' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
