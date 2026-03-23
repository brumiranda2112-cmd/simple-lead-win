import { useMemo } from 'react';
import * as storage from '@/lib/storage';
import { PIPELINE_COLUMNS, LEAD_PIPELINE_COLUMNS, LEAD_AREA_LABELS, LEAD_SOURCE_LABELS, LEAD_RESPONSIBLE_LABELS, LeadArea, LeadSource, LeadResponsible } from '@/types/crm';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts';
import { Users, UserCheck, TrendingUp, DollarSign, Target, Clock, Trophy, AlertTriangle, UserPlus, Briefcase } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CHART_COLORS = ['hsl(25,95%,53%)', 'hsl(142,76%,36%)', 'hsl(45,93%,47%)', 'hsl(217,91%,60%)', 'hsl(262,83%,58%)', 'hsl(0,84%,60%)', 'hsl(200,80%,50%)', 'hsl(170,70%,45%)', 'hsl(30,80%,55%)'];

export default function Dashboard() {
  const allLeads = storage.getLeads();
  const leads = storage.getLeadsByType('lead');
  const clients = storage.getLeadsByType('cliente');
  const tasks = storage.getTasks();

  const stats = useMemo(() => {
    const pendingTasks = tasks.filter(t => !t.completed).length;
    const overdue = storage.getOverdueTasks().length;
    const leadsInPipeline = leads.reduce((s, l) => s + (l.estimatedValue || 0), 0);
    const clientsValue = clients.reduce((s, l) => s + (l.estimatedValue || 0), 0);
    const finalized = clients.filter(c => c.status === 'finalizado').length;
    const convRate = leads.length > 0 ? (clients.length / (leads.length + clients.length) * 100) : 0;

    return [
      { label: 'Total Leads', value: leads.length, icon: UserPlus, color: 'text-primary' },
      { label: 'Total Clientes', value: clients.length, icon: Briefcase, color: 'text-accent-foreground' },
      { label: 'Taxa Conversão', value: `${convRate.toFixed(1)}%`, icon: Target, color: 'text-warning' },
      { label: 'Pipeline Leads', value: `R$ ${(leadsInPipeline / 1000).toFixed(0)}k`, icon: TrendingUp, color: 'text-primary' },
      { label: 'Pipeline Clientes', value: `R$ ${(clientsValue / 1000).toFixed(0)}k`, icon: Trophy, color: 'text-accent-foreground' },
      { label: 'Finalizados', value: finalized, icon: DollarSign, color: 'text-accent-foreground' },
      { label: 'Tarefas Pendentes', value: pendingTasks, icon: Clock, color: 'text-warning' },
      { label: 'Tarefas Atrasadas', value: overdue, icon: AlertTriangle, color: 'text-destructive' },
    ];
  }, [leads, clients, tasks]);

  const leadFunnelData = useMemo(() => {
    return LEAD_PIPELINE_COLUMNS.map(c => ({
      name: c.label,
      value: leads.filter(l => l.status === c.status).length,
      fill: c.color,
    })).filter(d => d.value > 0);
  }, [leads]);

  const clientFunnelData = useMemo(() => {
    return PIPELINE_COLUMNS.map(c => ({
      name: c.label,
      value: clients.filter(l => l.status === c.status).length,
      fill: c.color,
    }));
  }, [clients]);

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    allLeads.forEach(l => { counts[l.source] = (counts[l.source] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: LEAD_SOURCE_LABELS[k as LeadSource] || k, value: v }));
  }, [allLeads]);

  const areaData = useMemo(() => {
    const counts: Record<string, number> = {};
    allLeads.forEach(l => { counts[l.area] = (counts[l.area] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: LEAD_AREA_LABELS[k as LeadArea] || k, value: v }));
  }, [allLeads]);

  const responsibleData = useMemo(() => {
    const counts: Record<string, number> = {};
    allLeads.forEach(l => { if (l.responsible) counts[l.responsible] = (counts[l.responsible] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({ name: LEAD_RESPONSIBLE_LABELS[k as LeadResponsible] || k, value: v }));
  }, [allLeads]);

  const timelineData = useMemo(() => {
    const months: Record<string, { leads: number; clientes: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { leads: 0, clientes: 0 };
    }
    allLeads.forEach(l => {
      const key = l.createdAt.slice(0, 7);
      if (months[key]) {
        if (l.leadType === 'cliente') months[key].clientes++;
        else months[key].leads++;
      }
    });
    return Object.entries(months).map(([k, v]) => ({ month: k.slice(5) + '/' + k.slice(2, 4), ...v }));
  }, [allLeads]);

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
            <Tabs defaultValue="leads">
              <TabsList className="mb-3">
                <TabsTrigger value="leads">Leads</TabsTrigger>
                <TabsTrigger value="clientes">Clientes</TabsTrigger>
              </TabsList>
              <TabsContent value="leads">
                {leadFunnelData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <FunnelChart>
                      <Tooltip {...tooltipStyle} />
                      <Funnel dataKey="value" data={leadFunnelData} isAnimationActive>
                        <LabelList position="right" fill="hsl(210,40%,96%)" fontSize={11} dataKey="name" />
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-16">Adicione leads para ver o funil</p>}
              </TabsContent>
              <TabsContent value="clientes">
                {clientFunnelData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <FunnelChart>
                      <Tooltip {...tooltipStyle} />
                      <Funnel dataKey="value" data={clientFunnelData} isAnimationActive>
                        <LabelList position="right" fill="hsl(210,40%,96%)" fontSize={11} dataKey="name" />
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-16">Adicione clientes para ver o funil</p>}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-4">Por Origem</h3>
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
            <h3 className="text-sm font-semibold mb-4">Evolução no Tempo</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timelineData}>
                <XAxis dataKey="month" tick={{ fill: 'hsl(215,16%,57%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(215,16%,57%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="leads" name="Leads" stroke="hsl(25,95%,53%)" strokeWidth={2} dot={{ fill: 'hsl(25,95%,53%)' }} />
                <Line type="monotone" dataKey="clientes" name="Clientes" stroke="hsl(142,76%,36%)" strokeWidth={2} dot={{ fill: 'hsl(142,76%,36%)' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
