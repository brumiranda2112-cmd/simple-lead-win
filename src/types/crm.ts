export type LeadArea = 'agentes_ia' | 'automacoes' | 'sistemas' | 'consultoria' | 'outro';
export type LeadSource = 'indicacao' | 'google' | 'instagram' | 'site' | 'linkedin' | 'outro';
export type LeadStatus = 'novo' | 'contato_inicial' | 'qualificado' | 'proposta' | 'negociacao' | 'ganho' | 'perdido';
export type TaskType = 'followup' | 'reuniao' | 'proposta' | 'diagnostico' | 'lembrete' | 'mensagem';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  area: LeadArea;
  source: LeadSource;
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

export interface CrmUser {
  email: string;
  name: string;
  passwordHash: string;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: 'Novo',
  contato_inicial: 'Contato Inicial',
  qualificado: 'Qualificado',
  proposta: 'Proposta Enviada',
  negociacao: 'Negociação',
  ganho: 'Ganho',
  perdido: 'Perdido',
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

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  followup: 'Follow-up',
  reuniao: 'Reunião',
  proposta: 'Enviar Proposta',
  diagnostico: 'Diagnóstico',
  lembrete: 'Lembrete',
  mensagem: 'Mensagem',
};

export const PIPELINE_COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: 'novo', label: 'Novo', color: 'hsl(25, 95%, 53%)' },
  { status: 'contato_inicial', label: 'Contato Inicial', color: 'hsl(45, 93%, 47%)' },
  { status: 'qualificado', label: 'Qualificado', color: 'hsl(142, 71%, 45%)' },
  { status: 'proposta', label: 'Proposta Enviada', color: 'hsl(217, 91%, 60%)' },
  { status: 'negociacao', label: 'Negociação', color: 'hsl(262, 83%, 58%)' },
  { status: 'ganho', label: 'Ganho', color: 'hsl(142, 76%, 36%)' },
  { status: 'perdido', label: 'Perdido', color: 'hsl(0, 84%, 60%)' },
];
