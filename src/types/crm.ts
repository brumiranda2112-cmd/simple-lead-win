export type LeadArea = 'agentes_ia' | 'automacoes' | 'sistemas' | 'consultoria' | 'outro';
export type LeadSource = 'indicacao' | 'google' | 'instagram' | 'site' | 'linkedin' | 'outro';
export type LeadResponsible = 'bruno' | 'gustavo' | 'ana_luiza';
export type TaskType = 'followup' | 'reuniao' | 'proposta' | 'diagnostico' | 'lembrete' | 'mensagem';

// Lead pipeline statuses (prospecting)
export type LeadPipelineStatus = 'lead_qualificado' | 'call_diagnostico' | 'proposta_implementacao' | 'call_fechamento' | 'proposta_honorarios' | 'fechado' | 'followup_d1' | 'followup_d2' | 'followup_d3' | 'followup_d4' | 'followup_d5' | 'followup_d6' | 'followup_d7' | 'followup_d8' | 'followup_d9' | 'followup_d10';

// Client pipeline statuses (delivery)
export type ClientPipelineStatus = 'cliente_novo' | 'mvp' | 'call_apresentacao' | 'aprovacao' | 'desenvolvimento_final' | 'entrega_cliente' | 'ajustes' | 'finalizado';

// Combined status
export type LeadStatus = LeadPipelineStatus | ClientPipelineStatus;

// Entity type
export type LeadType = 'lead' | 'cliente';

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
  leadType: LeadType;
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

export type TransactionType = 'receita' | 'despesa' | 'retirada';
export type ExpenseCategory = 'salarios' | 'ferramentas' | 'infraestrutura' | 'marketing' | 'impostos' | 'servicos' | 'outros';
export type RevenueCategory = 'contrato' | 'consultoria' | 'recorrente' | 'avulso' | 'outros';
export type WithdrawalCategory = 'pro_labore' | 'distribuicao_lucros' | 'adiantamento' | 'outros';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: ExpenseCategory | RevenueCategory | WithdrawalCategory;
  description: string;
  value: number;
  date: string;
  leadId?: string;
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

export const WITHDRAWAL_CATEGORY_LABELS: Record<WithdrawalCategory, string> = {
  pro_labore: 'Pró-labore',
  distribuicao_lucros: 'Distribuição de Lucros',
  adiantamento: 'Adiantamento',
  outros: 'Outros',
};

export interface CrmUser {
  email: string;
  name: string;
  passwordHash: string;
}

// Labels for lead pipeline
export const LEAD_PIPELINE_STATUS_LABELS: Record<LeadPipelineStatus, string> = {
  lead_qualificado: 'Lead Qualificado',
  call_diagnostico: 'Call de Diagnóstico',
  proposta_implementacao: 'Proposta de Implementação',
  call_fechamento: 'Call de Fechamento',
  proposta_honorarios: 'Proposta de Honorários',
  fechado: 'Fechado',
  followup_d1: 'Follow Up D+1',
  followup_d2: 'Follow Up D+2',
  followup_d3: 'Follow Up D+3',
  followup_d4: 'Follow Up D+4',
  followup_d5: 'Follow Up D+5',
  followup_d6: 'Follow Up D+6',
  followup_d7: 'Follow Up D+7',
  followup_d8: 'Follow Up D+8',
  followup_d9: 'Follow Up D+9',
  followup_d10: 'Follow Up D+10',
};

// Labels for client pipeline
export const CLIENT_PIPELINE_STATUS_LABELS: Record<ClientPipelineStatus, string> = {
  cliente_novo: 'Cliente Novo',
  mvp: 'MVP',
  call_apresentacao: 'Call de Apresentação',
  aprovacao: 'Aprovação',
  desenvolvimento_final: 'Desenvolvimento Final',
  entrega_cliente: 'Entrega ao Cliente',
  ajustes: 'Ajustes',
  finalizado: 'Finalizado',
};

// Combined labels
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  ...LEAD_PIPELINE_STATUS_LABELS,
  ...CLIENT_PIPELINE_STATUS_LABELS,
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
  ana_luiza: 'Ana Luiza',
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  followup: 'Follow-up',
  reuniao: 'Reunião',
  proposta: 'Enviar Proposta',
  diagnostico: 'Diagnóstico',
  lembrete: 'Lembrete',
  mensagem: 'Mensagem',
};

// Lead pipeline columns
export const LEAD_PIPELINE_COLUMNS: { status: LeadPipelineStatus; label: string; color: string }[] = [
  { status: 'lead_qualificado', label: 'Lead Qualificado', color: 'hsl(25, 95%, 53%)' },
  { status: 'call_diagnostico', label: 'Call de Diagnóstico', color: 'hsl(45, 93%, 47%)' },
  { status: 'proposta_implementacao', label: 'Proposta de Implementação', color: 'hsl(200, 80%, 50%)' },
  { status: 'call_fechamento', label: 'Call de Fechamento', color: 'hsl(262, 83%, 58%)' },
  { status: 'proposta_honorarios', label: 'Proposta de Honorários', color: 'hsl(170, 70%, 45%)' },
  { status: 'fechado', label: 'Fechado', color: 'hsl(142, 71%, 45%)' },
  { status: 'followup_d1', label: 'Follow Up D+1', color: 'hsl(210, 70%, 55%)' },
  { status: 'followup_d2', label: 'Follow Up D+2', color: 'hsl(215, 70%, 55%)' },
  { status: 'followup_d3', label: 'Follow Up D+3', color: 'hsl(220, 70%, 55%)' },
  { status: 'followup_d4', label: 'Follow Up D+4', color: 'hsl(225, 70%, 55%)' },
  { status: 'followup_d5', label: 'Follow Up D+5', color: 'hsl(230, 70%, 55%)' },
  { status: 'followup_d6', label: 'Follow Up D+6', color: 'hsl(235, 70%, 55%)' },
  { status: 'followup_d7', label: 'Follow Up D+7', color: 'hsl(240, 70%, 55%)' },
  { status: 'followup_d8', label: 'Follow Up D+8', color: 'hsl(245, 70%, 55%)' },
  { status: 'followup_d9', label: 'Follow Up D+9', color: 'hsl(250, 70%, 55%)' },
  { status: 'followup_d10', label: 'Follow Up D+10', color: 'hsl(255, 70%, 55%)' },
];

// Client pipeline columns (existing)
export const PIPELINE_COLUMNS: { status: ClientPipelineStatus; label: string; color: string }[] = [
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
