export type LeadArea = 'agentes_ia' | 'automacoes' | 'sistemas' | 'consultoria' | 'outro';
export type LeadSource = 'indicacao' | 'google' | 'instagram' | 'site' | 'linkedin' | 'outro';
export type LeadStatus = 'cliente_novo' | 'diagnostico' | 'call_cliente' | 'mvp_sistema' | 'aprovacao_cliente' | 'contrato_fechado' | 'desenvolvimento' | 'periodo_ajustes' | 'finalizado';
export type LeadResponsible = 'bruno' | 'gustavo' | 'ana_luiza';
export type TaskType = 'followup' | 'reuniao' | 'proposta' | 'diagnostico' | 'lembrete' | 'mensagem';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  area: LeadArea;
  source: LeadSource;
  responsible: LeadResponsible;
  estimatedValue: number;
  status: LeadStatus;
  notes: string;
  nextFollowup: string | null;
  wonLostReason: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  leadId: string;
  type: TaskType;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface Activity {
  id: string;
  leadId: string;
  type: 'lead_created' | 'lead_updated' | 'status_changed' | 'task_created' | 'task_completed';
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type TransactionType = 'receita' | 'despesa';
export type ExpenseCategory = 'salarios' | 'ferramentas' | 'infraestrutura' | 'marketing' | 'impostos' | 'servicos' | 'outros';
export type RevenueCategory = 'contrato' | 'consultoria' | 'recorrente' | 'avulso' | 'outros';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: ExpenseCategory | RevenueCategory;
  description: string;
  value: number;
  date: string;
  leadId?: string;  // linked to a lead (auto or manual)
  responsible?: LeadResponsible;
  recurring: boolean;
  notes: string;
  createdAt: string;
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  salarios: 'Salários',
  ferramentas: 'Ferramentas & Software',
  infraestrutura: 'Infraestrutura',
  marketing: 'Marketing',
  impostos: 'Impostos',
  servicos: 'Serviços Terceiros',
  outros: 'Outros',
};

export const REVENUE_CATEGORY_LABELS: Record<RevenueCategory, string> = {
  contrato: 'Contrato Fechado',
  consultoria: 'Consultoria',
  recorrente: 'Receita Recorrente',
  avulso: 'Serviço Avulso',
  outros: 'Outros',
};

export interface CrmUser {
  email: string;
  name: string;
  passwordHash: string;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  cliente_novo: 'Cliente Novo',
  diagnostico: 'Diagnóstico',
  call_cliente: 'Call com Cliente',
  mvp_sistema: 'MVP do Sistema',
  aprovacao_cliente: 'Aprovação do Cliente',
  contrato_fechado: 'Contrato Fechado',
  desenvolvimento: 'Desenvolvimento Completo',
  periodo_ajustes: 'Período de Ajustes',
  finalizado: 'Cliente Finalizado',
};

export const LEAD_AREA_LABELS: Record<LeadArea, string> = {
  agentes_ia: 'Agentes de IA',
  automacoes: 'Automações',
  sistemas: 'Sistemas Sob Medida',
  consultoria: 'Consultoria',
  outro: 'Outro',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  indicacao: 'Indicação',
  google: 'Google',
  instagram: 'Instagram',
  site: 'Site',
  linkedin: 'LinkedIn',
  outro: 'Outro',
};

export const LEAD_RESPONSIBLE_LABELS: Record<LeadResponsible, string> = {
  bruno: 'Bruno',
  gustavo: 'Gustavo',
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  followup: 'Follow-up',
  reuniao: 'Reunião',
  proposta: 'Enviar Proposta',
  diagnostico: 'Diagnóstico',
  lembrete: 'Lembrete',
  mensagem: 'Mensagem',
};

export const PIPELINE_COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: 'cliente_novo', label: 'Cliente Novo', color: 'hsl(25, 95%, 53%)' },
  { status: 'diagnostico', label: 'Diagnóstico', color: 'hsl(45, 93%, 47%)' },
  { status: 'call_cliente', label: 'Call com Cliente', color: 'hsl(200, 80%, 50%)' },
  { status: 'mvp_sistema', label: 'MVP do Sistema', color: 'hsl(262, 83%, 58%)' },
  { status: 'aprovacao_cliente', label: 'Aprovação', color: 'hsl(170, 70%, 45%)' },
  { status: 'contrato_fechado', label: 'Contrato Fechado', color: 'hsl(142, 71%, 45%)' },
  { status: 'desenvolvimento', label: 'Desenvolvimento', color: 'hsl(217, 91%, 60%)' },
  { status: 'periodo_ajustes', label: 'Ajustes', color: 'hsl(30, 80%, 55%)' },
  { status: 'finalizado', label: 'Finalizado', color: 'hsl(142, 76%, 36%)' },
];
