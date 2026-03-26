import { createLead, createTask, createTransaction } from '@/lib/storage';
import type { LeadArea, LeadSource, LeadPipelineStatus, ClientPipelineStatus, TaskType, TransactionType } from '@/types/crm';

function randomDate(daysBack: number, daysForward = 0): string {
  const now = Date.now();
  const from = now - daysBack * 86400000;
  const to = now + daysForward * 86400000;
  return new Date(from + Math.random() * (to - from)).toISOString();
}

function dateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

const DEMO_LEADS: Array<{
  name: string; email: string; phone: string; company: string;
  area: LeadArea; source: LeadSource; responsible: string;
  estimatedValue: number; leadType: 'lead' | 'cliente';
  status: LeadPipelineStatus | ClientPipelineStatus; notes: string;
}> = [
  // === LEADS (pipeline de vendas) ===
  { name: 'Carlos Mendes', email: 'carlos@techsol.com', phone: '(11) 99876-5432', company: 'TechSol Ltda', area: 'agentes_ia', source: 'indicacao', responsible: 'Equipe Comercial', estimatedValue: 15000, leadType: 'lead', status: 'lead_qualificado', notes: 'Interessado em chatbot para atendimento ao cliente' },
  { name: 'Ana Paula Ferreira', email: 'ana@innovare.com.br', phone: '(21) 98765-4321', company: 'Innovare Digital', area: 'automacoes', source: 'instagram', responsible: 'Equipe Comercial', estimatedValue: 8500, leadType: 'lead', status: 'call_diagnostico', notes: 'Quer automatizar processo de onboarding' },
  { name: 'Roberto Silva', email: 'roberto@construtora.com', phone: '(31) 97654-3210', company: 'Construtora Horizonte', area: 'sistemas', source: 'google', responsible: 'Equipe Comercial', estimatedValue: 32000, leadType: 'lead', status: 'proposta_implementacao', notes: 'Sistema de gestão de obras personalizado' },
  { name: 'Fernanda Costa', email: 'fernanda@logistica.com', phone: '(41) 96543-2109', company: 'LogiExpress', area: 'automacoes', source: 'linkedin', responsible: 'Equipe Comercial', estimatedValue: 12000, leadType: 'lead', status: 'call_fechamento', notes: 'Automação de rastreamento e notificações' },
  { name: 'Marcos Oliveira', email: 'marcos@educatech.com', phone: '(51) 95432-1098', company: 'EducaTech', area: 'agentes_ia', source: 'site', responsible: 'Equipe Comercial', estimatedValue: 18000, leadType: 'lead', status: 'proposta_honorarios', notes: 'Agente IA para tutoria personalizada' },
  { name: 'Juliana Almeida', email: 'juliana@farmaplus.com', phone: '(61) 94321-0987', company: 'FarmaPlus', area: 'sistemas', source: 'indicacao', responsible: 'Equipe Comercial', estimatedValue: 25000, leadType: 'lead', status: 'fechado', notes: 'Sistema de controle de estoque com IA' },
  { name: 'Pedro Henrique', email: 'pedro@startup.io', phone: '(11) 93210-9876', company: 'StartApp', area: 'consultoria', source: 'linkedin', responsible: 'Equipe Comercial', estimatedValue: 5000, leadType: 'lead', status: 'followup_d1', notes: 'Consultoria para MVP de produto SaaS' },
  { name: 'Camila Rocha', email: 'camila@agencia.com', phone: '(21) 92109-8765', company: 'Agência Criativa', area: 'automacoes', source: 'instagram', responsible: 'Equipe Comercial', estimatedValue: 7500, leadType: 'lead', status: 'followup_d3', notes: 'Automação de relatórios para clientes' },
  { name: 'Thiago Santos', email: 'thiago@imobiliaria.com', phone: '(31) 91098-7654', company: 'Imóveis Premium', area: 'agentes_ia', source: 'google', responsible: 'Equipe Comercial', estimatedValue: 20000, leadType: 'lead', status: 'followup_d5', notes: 'Chatbot para qualificação de leads imobiliários' },
  { name: 'Larissa Nunes', email: 'larissa@clinic.com', phone: '(41) 90987-6543', company: 'Clínica Bem Estar', area: 'sistemas', source: 'indicacao', responsible: 'Equipe Comercial', estimatedValue: 14000, leadType: 'lead', status: 'lead_qualificado', notes: 'Sistema de agendamento inteligente' },

  // === CLIENTES (pipeline de entrega) ===
  { name: 'Ricardo Gomes', email: 'ricardo@metalurgica.com', phone: '(11) 98877-6655', company: 'MetalForte Ind.', area: 'sistemas', source: 'indicacao', responsible: 'Equipe Técnica', estimatedValue: 45000, leadType: 'cliente', status: 'cliente_novo', notes: 'ERP customizado para controle de produção' },
  { name: 'Beatriz Lima', email: 'beatriz@ecommerce.com', phone: '(21) 97766-5544', company: 'ShopMais', area: 'automacoes', source: 'site', responsible: 'Equipe Técnica', estimatedValue: 18000, leadType: 'cliente', status: 'mvp', notes: 'Automação de fulfillment e notificações' },
  { name: 'Diego Martins', email: 'diego@advocacia.com', phone: '(31) 96655-4433', company: 'Martins Advocacia', area: 'agentes_ia', source: 'linkedin', responsible: 'Equipe Técnica', estimatedValue: 22000, leadType: 'cliente', status: 'call_apresentacao', notes: 'Agente IA para triagem de processos jurídicos' },
  { name: 'Patrícia Souza', email: 'patricia@contabil.com', phone: '(41) 95544-3322', company: 'ContábilPro', area: 'sistemas', source: 'google', responsible: 'Equipe Técnica', estimatedValue: 35000, leadType: 'cliente', status: 'aprovacao', notes: 'Sistema de gestão fiscal automatizado' },
  { name: 'Alexandre Pereira', email: 'alexandre@transportes.com', phone: '(51) 94433-2211', company: 'TransLog', area: 'automacoes', source: 'indicacao', responsible: 'Equipe Técnica', estimatedValue: 28000, leadType: 'cliente', status: 'desenvolvimento_final', notes: 'Dashboard de monitoramento de frota em tempo real' },
  { name: 'Marina Vieira', email: 'marina@restaurante.com', phone: '(61) 93322-1100', company: 'Sabor & Arte', area: 'agentes_ia', source: 'instagram', responsible: 'Equipe Técnica', estimatedValue: 12000, leadType: 'cliente', status: 'entrega_cliente', notes: 'Chatbot para pedidos e reservas' },
  { name: 'Lucas Barbosa', email: 'lucas@academia.com', phone: '(11) 92211-0099', company: 'FitPro Gym', area: 'sistemas', source: 'site', responsible: 'Equipe Técnica', estimatedValue: 16000, leadType: 'cliente', status: 'ajustes', notes: 'App de gestão de alunos e treinos' },
  { name: 'Isabela Cardoso', email: 'isabela@escola.com', phone: '(21) 91100-9988', company: 'Colégio Futuro', area: 'automacoes', source: 'indicacao', responsible: 'Equipe Técnica', estimatedValue: 20000, leadType: 'cliente', status: 'finalizado', notes: 'Automação de comunicação escola-pais' },
];

const DEMO_TASKS: Array<{
  leadIndex: number; type: TaskType; title: string; description: string; dueDaysFromNow: number;
}> = [
  { leadIndex: 0, type: 'followup', title: 'Enviar material sobre chatbots', description: 'Preparar e enviar case studies de chatbots para Carlos', dueDaysFromNow: 1 },
  { leadIndex: 1, type: 'reuniao', title: 'Call de diagnóstico com Ana', description: 'Reunião para entender o fluxo de onboarding atual', dueDaysFromNow: 2 },
  { leadIndex: 2, type: 'proposta', title: 'Finalizar proposta Construtora', description: 'Incluir cronograma e orçamento detalhado', dueDaysFromNow: -1 },
  { leadIndex: 3, type: 'reuniao', title: 'Call de fechamento LogiExpress', description: 'Apresentar termos finais do contrato', dueDaysFromNow: 0 },
  { leadIndex: 4, type: 'proposta', title: 'Enviar honorários EducaTech', description: 'Proposta de honorários para projeto de tutoria IA', dueDaysFromNow: 3 },
  { leadIndex: 7, type: 'followup', title: 'Follow-up Agência Criativa', description: 'Verificar interesse após apresentação', dueDaysFromNow: -2 },
  { leadIndex: 8, type: 'mensagem', title: 'WhatsApp Imóveis Premium', description: 'Enviar demo do chatbot imobiliário', dueDaysFromNow: 1 },
  { leadIndex: 10, type: 'diagnostico', title: 'Levantamento MetalForte', description: 'Mapear processos atuais da produção', dueDaysFromNow: 4 },
  { leadIndex: 11, type: 'lembrete', title: 'Review MVP ShopMais', description: 'Validar entregáveis do MVP com o cliente', dueDaysFromNow: 0 },
  { leadIndex: 12, type: 'reuniao', title: 'Apresentação Martins Advocacia', description: 'Demonstrar protótipo do agente IA jurídico', dueDaysFromNow: 5 },
  { leadIndex: 14, type: 'lembrete', title: 'Deploy dashboard TransLog', description: 'Realizar deploy do dashboard em produção', dueDaysFromNow: -3 },
  { leadIndex: 15, type: 'followup', title: 'Feedback Sabor & Arte', description: 'Coletar feedback pós-entrega do chatbot', dueDaysFromNow: 2 },
];

const DEMO_TRANSACTIONS: Array<{
  type: TransactionType; category: string; description: string;
  value: number; daysAgo: number; responsible: string; recurring: boolean;
}> = [
  { type: 'receita', category: 'contrato', description: 'Contrato: Colégio Futuro - Automação', value: 20000, daysAgo: 5, responsible: 'Equipe Técnica', recurring: false },
  { type: 'receita', category: 'contrato', description: 'Contrato: FitPro Gym - App de Gestão', value: 16000, daysAgo: 15, responsible: 'Equipe Técnica', recurring: false },
  { type: 'receita', category: 'consultoria', description: 'Consultoria: Análise de processos MetalForte', value: 5000, daysAgo: 8, responsible: 'Equipe Comercial', recurring: false },
  { type: 'receita', category: 'recorrente', description: 'Manutenção mensal - Sabor & Arte', value: 1500, daysAgo: 2, responsible: 'Equipe Técnica', recurring: true },
  { type: 'despesa', category: 'ferramentas', description: 'Assinatura OpenAI API', value: 850, daysAgo: 1, responsible: 'Equipe Técnica', recurring: true },
  { type: 'despesa', category: 'ferramentas', description: 'Servidor Cloud (AWS)', value: 1200, daysAgo: 3, responsible: 'Equipe Técnica', recurring: true },
  { type: 'despesa', category: 'marketing', description: 'Campanha Instagram Ads', value: 2000, daysAgo: 10, responsible: 'Equipe Comercial', recurring: false },
  { type: 'despesa', category: 'servicos', description: 'Freelancer - Design UI/UX', value: 3500, daysAgo: 12, responsible: 'Equipe Técnica', recurring: false },
  { type: 'despesa', category: 'impostos', description: 'DAS Simples Nacional', value: 4200, daysAgo: 20, responsible: 'Equipe Comercial', recurring: true },
  { type: 'retirada', category: 'pro_labore', description: 'Pró-labore - Março', value: 8000, daysAgo: 7, responsible: 'Equipe Comercial', recurring: true },
];

export function seedDemoData() {
  // Create leads and store their IDs
  const leadIds: string[] = [];
  
  for (const lead of DEMO_LEADS) {
    const created = createLead({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      area: lead.area,
      source: lead.source,
      responsible: lead.responsible,
      estimatedValue: lead.estimatedValue,
      leadType: lead.leadType,
      status: lead.status,
      notes: lead.notes,
      nextFollowup: null,
      wonLostReason: '',
    });
    leadIds.push(created.id);
  }

  // Create tasks linked to leads
  for (const task of DEMO_TASKS) {
    const leadId = leadIds[task.leadIndex];
    if (leadId) {
      createTask({
        leadId,
        type: task.type,
        title: task.title,
        description: task.description,
        dueDate: new Date(Date.now() + task.dueDaysFromNow * 86400000).toISOString(),
      });
    }
  }

  // Create transactions
  for (const txn of DEMO_TRANSACTIONS) {
    createTransaction({
      type: txn.type,
      category: txn.category as any,
      description: txn.description,
      value: txn.value,
      date: dateStr(-txn.daysAgo),
      responsible: txn.responsible,
      recurring: txn.recurring,
      notes: '',
      leadId: undefined,
    });
  }

  return { leads: leadIds.length, tasks: DEMO_TASKS.length, transactions: DEMO_TRANSACTIONS.length };
}

export { getLeads } from '@/lib/storage';
