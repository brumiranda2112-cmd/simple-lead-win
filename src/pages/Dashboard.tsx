import { useMemo } from 'react';
import * as storage from '@/lib/storage';
import { PIPELINE_COLUMNS, LEAD_PIPELINE_COLUMNS, LEAD_AREA_LABELS, LEAD_SOURCE_LABELS, LEAD_RESPONSIBLE_LABELS, LeadArea, LeadSource, LeadResponsible } from '@/types/crm';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts';
import { Users, UserCheck, TrendingUp, DollarSign, Target, Clock, Trophy, AlertTriangle, UserPlus, Briefcase } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Lead } from '@/types/crm';

const CHART_COLORS = ['hsl(25,95%,53%)', 'hsl(142,76%,36%)', 'hsl(45,93%,47%)', 'hsl(217,91%,60%)', 'hsl(262,83%,58%)', 'hsl(0,84%,60%)', 'hsl(200,80%,50%)', 'hsl(170,70%,45%)', 'hsl(30,80%,55%)'];
const tooltipStyle = { contentStyle: { backgroundColor: 'hsl(228,12%,10%)', border: '1px solid hsl(228,12%,18%)', borderRadius: '8px', color: 'hsl(210,40%,96%)' } };

function StatsCards({ items, label, icon: Icon, color, tasks }: { items: Lead[]; label: string; icon: any; color: string; tasks?: ReturnType<typeof storage.getTasks> }) {
  const totalValue = items.reduce((s, l) => s + (l.estimatedValue || 0), 0);
  const allTasks = tasks || [];
  const pendingTasks = allTasks.filter(t => !t.completed && items.some(l => l.id === t.leadId)).length;
  const overdueTasks = allTasks.filter(t => !t.completed && new Date(t.dueDate) < new Date() && items.some(l => l.id === t.leadId)).length;

  const stats = [
    { label: `Total ${label}`, value: items.length, icon: Icon, color },
    { label: 'Valor Pipeline', value: `R$ ${(totalValue / 1000).toFixed(0)}k`, icon: TrendingUp, color },
    { label: 'Tarefas Pendentes', value: pendingTasks, icon: Clock, color: 'text-warning' },
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

function DistributionCharts({ items, label }: { items: Lead[]; label: string }) {
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
  const tasks = storage.getTasks();

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
          <DistributionCharts items={leads} label="Leads" />
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
          <DistributionCharts items={clients} label="Clientes" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
