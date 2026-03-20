import { useMemo } from 'react';
import * as storage from '@/lib/storage';
import { PIPELINE_COLUMNS, LEAD_AREA_LABELS, LEAD_SOURCE_LABELS, LEAD_RESPONSIBLE_LABELS, LeadArea, LeadSource, LeadResponsible } from '@/types/crm';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts';
import { Users, UserCheck, TrendingUp, DollarSign, Target, Clock, Trophy, AlertTriangle } from 'lucide-react';

const CHART_COLORS = ['hsl(25,95%,53%)', 'hsl(142,76%,36%)', 'hsl(45,93%,47%)', 'hsl(217,91%,60%)', 'hsl(262,83%,58%)', 'hsl(0,84%,60%)', 'hsl(200,80%,50%)', 'hsl(170,70%,45%)', 'hsl(30,80%,55%)'];

export default function Dashboard() {
  const leads = storage.getLeads();
  const tasks = storage.getTasks();

  const stats = useMemo(() => {
    const active = leads.filter(l => l.status !== 'finalizado');
    const finished = leads.filter(l => l.status === 'finalizado');
    const contracted = leads.filter(l => ['contrato_fechado', 'desenvolvimento', 'periodo_ajustes', 'finalizado'].includes(l.status));
    const total = leads.length;
    const convRate = total > 0 ? (contracted.length / total * 100) : 0;
    const inPipeline = active.reduce((s, l) => s + (l.estimatedValue || 0), 0);
    const contractedValue = contracted.reduce((s, l) => s + (l.estimatedValue || 0), 0);
    const pendingTasks = tasks.filter(t => !t.completed).length;
    const overdue = storage.getOverdueTasks().length;

    return [
      { label: 'Total Leads', value: total, icon: Users, color: 'text-primary' },
      { label: 'Leads Ativos', value: active.length, icon: UserCheck, color: 'text-success' },
      { label: 'Taxa Conversão', value: `${convRate.toFixed(1)}%`, icon: Target, color: 'text-warning' },
      { label: 'Em Pipeline', value: `R$ ${(inPipeline / 1000).toFixed(0)}k`, icon: TrendingUp, color: 'text-primary' },
      { label: 'Contratados', value: `R$ ${(contractedValue / 1000).toFixed(0)}k`, icon: Trophy, color: 'text-success' },
      { label: 'Finalizados', value: finished.length, icon: DollarSign, color: 'text-success' },
      { label: 'Tarefas Pendentes', value: pendingTasks, icon: Clock, color: 'text-warning' },
      { label: 'Tarefas Atrasadas', value: overdue, icon: AlertTriangle, color: 'text-destructive' },
    ];
  }, [leads, tasks]);

  const funnelData = useMemo(() => {
    return PIPELINE_COLUMNS.map(c => ({
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

  const responsibleData = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach(l => { if (l.responsible) counts[l.responsible] = (counts[l.responsible] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: LEAD_RESPONSIBLE_LABELS[k as LeadResponsible] || k, value: v }));
  }, [leads]);

  const timelineData = useMemo(() => {
    const months: Record<string, { created: number; contracted: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { created: 0, contracted: 0 };
    }
    leads.forEach(l => {
      const key = l.createdAt.slice(0, 7);
      if (months[key]) months[key].created++;
      if (l.status === 'contrato_fechado' && months[l.updatedAt.slice(0, 7)]) months[l.updatedAt.slice(0, 7)].contracted++;
    });
    return Object.entries(months).map(([k, v]) => ({ month: k.slice(5) + '/' + k.slice(2, 4), ...v }));
  }, [leads]);

  const tooltipStyle = { contentStyle: { backgroundColor: 'hsl(228,12%,10%)', border: '1px solid hsl(228,12%,18%)', borderRadius: '8px', color: 'hsl(210,40%,96%)' } };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

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

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-4">Funil de Conversão</h3>
            {funnelData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <FunnelChart>
                  <Tooltip {...tooltipStyle} />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" fill="hsl(210,40%,96%)" fontSize={11} dataKey="name" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-16">Adicione leads para ver o funil</p>}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-4">Leads por Origem</h3>
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
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
            <h3 className="text-sm font-semibold mb-4">Leads por Responsável</h3>
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
            <h3 className="text-sm font-semibold mb-4">Evolução no Tempo</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timelineData}>
                <XAxis dataKey="month" tick={{ fill: 'hsl(215,16%,57%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(215,16%,57%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="created" name="Criados" stroke="hsl(25,95%,53%)" strokeWidth={2} dot={{ fill: 'hsl(25,95%,53%)' }} />
                <Line type="monotone" dataKey="contracted" name="Contratados" stroke="hsl(142,76%,36%)" strokeWidth={2} dot={{ fill: 'hsl(142,76%,36%)' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
