import { Lead, Task, Transaction, Activity, UserGoal } from '@/types/crm';
import * as storage from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';

function uid() { return crypto.randomUUID(); }

function randomDate(daysAgo: number, daysAhead = 0): string {
  const now = Date.now();
  const from = now - daysAgo * 86400000;
  const to = now + daysAhead * 86400000;
  return new Date(from + Math.random() * (to - from)).toISOString();
}

function randomDatetime(daysAgo: number, daysAhead = 0): string {
  const d = new Date(randomDate(daysAgo, daysAhead));
  d.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 4) * 15);
  return d.toISOString().slice(0, 16);
}

function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const NAMES = ['TechFlow Solutions', 'Digital Prime', 'InovaFlex Ltda', 'Apex Marketing', 'CloudBase Systems', 'DataVision AI', 'NetScale Corp', 'SmartPath Labs', 'GreenEnergy SA', 'AutoPilot Sistemas', 'Vortex Digital', 'SkyBridge Tech', 'NovaMente AI', 'PulseTech', 'QuantumLeap', 'ByteForge', 'CodeCraft Pro', 'AgileSoft', 'BluePrint Digital', 'MaxAutomation'];
const RESPONSIBLES = ['Bruno', 'Rafael', 'Mariana', 'Lucas'];
const AREAS = ['agentes_ia', 'automacoes', 'sistemas', 'consultoria', 'outro'] as const;
const SOURCES = ['indicacao', 'google', 'instagram', 'site', 'linkedin'] as const;
const LEAD_STATUSES = ['lead_qualificado', 'call_diagnostico', 'proposta_implementacao', 'call_fechamento', 'proposta_honorarios', 'fechado'] as const;
const CLIENT_STATUSES = ['cliente_novo', 'mvp', 'call_apresentacao', 'aprovacao', 'desenvolvimento_final', 'entrega_cliente', 'ajustes', 'finalizado'] as const;
const TASK_TYPES = ['followup', 'reuniao', 'proposta', 'diagnostico', 'lembrete', 'mensagem'] as const;
const PRIORITIES = ['baixa', 'media', 'alta', 'urgente'] as const;

export function generateDemoData() {
  const leads: Lead[] = [];
  const tasks: Task[] = [];
  const activities: Activity[] = [];
  const transactions: Transaction[] = [];
  const goals: UserGoal[] = [];

  // Generate 12 leads
  for (let i = 0; i < 12; i++) {
    const name = NAMES[i];
    const createdAt = randomDate(90);
    const status = pick(LEAD_STATUSES);
    const lead: Lead = {
      id: uid(),
      name,
      email: `contato@${name.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: `(11) 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      company: name,
      area: pick([...AREAS]),
      source: pick([...SOURCES]),
      responsible: pick(RESPONSIBLES),
      estimatedValue: Math.floor(Math.random() * 80 + 10) * 1000,
      leadType: 'lead',
      status,
      notes: '',
      nextFollowup: null,
      wonLostReason: '',
      createdAt,
      updatedAt: status === 'lead_qualificado' ? randomDate(30) : randomDate(15),
    };
    leads.push(lead);
    activities.push({ id: uid(), leadId: lead.id, type: 'lead_created', description: `Lead "${name}" criado`, createdAt });
  }

  // Generate 8 clients
  for (let i = 12; i < 20; i++) {
    const name = NAMES[i];
    const createdAt = randomDate(120);
    const status = pick(CLIENT_STATUSES);
    const lead: Lead = {
      id: uid(),
      name,
      email: `contato@${name.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: `(11) 9${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
      company: name,
      area: pick([...AREAS]),
      source: pick([...SOURCES]),
      responsible: pick(RESPONSIBLES),
      estimatedValue: Math.floor(Math.random() * 100 + 20) * 1000,
      leadType: 'cliente',
      status,
      notes: '',
      nextFollowup: null,
      wonLostReason: '',
      createdAt,
      updatedAt: randomDate(10),
    };
    leads.push(lead);
    activities.push({ id: uid(), leadId: lead.id, type: 'lead_created', description: `Cliente "${name}" criado`, createdAt });
  }

  // Make some leads stalled (old updatedAt)
  leads[0].updatedAt = randomDate(20, -10);
  leads[1].updatedAt = randomDate(25, -15);
  leads[2].updatedAt = randomDate(30, -20);

  // Generate tasks (30 tasks across leads)
  const allLeadIds = leads.map(l => l.id);
  const taskTitles = [
    'Ligar para agendar reunião', 'Enviar proposta comercial', 'Follow-up pós-reunião',
    'Preparar diagnóstico', 'Enviar contrato', 'Agendar call de apresentação',
    'Revisar escopo do projeto', 'Atualizar status no pipeline', 'Enviar mensagem no WhatsApp',
    'Lembrar de cobrar retorno', 'Preparar slides da reunião', 'Enviar case de sucesso',
    'Agendar demo do produto', 'Enviar orçamento detalhado', 'Follow-up proposta enviada',
  ];

  for (let i = 0; i < 30; i++) {
    const leadId = pick(allLeadIds);
    const type = pick([...TASK_TYPES]);
    const priority = pick([...PRIORITIES]);
    const daysAhead = Math.floor(Math.random() * 14) - 3; // -3 to +10 days
    const completed = Math.random() < 0.3;
    const task: Task = {
      id: uid(),
      leadId,
      type,
      priority,
      title: pick(taskTitles),
      description: Math.random() > 0.5 ? 'Detalhes adicionais sobre esta tarefa' : '',
      dueDate: randomDatetime(-3, 14),
      completed,
      completedAt: completed ? randomDate(5) : null,
      createdAt: randomDate(30),
      subtasks: Math.random() > 0.5 ? [
        { id: uid(), title: 'Preparar documentação', completed: Math.random() > 0.5 },
        { id: uid(), title: 'Validar com o time', completed: Math.random() > 0.7 },
        { id: uid(), title: 'Enviar para o cliente', completed: false },
      ] : [],
      comments: Math.random() > 0.6 ? [
        { id: uid(), text: 'Cliente pediu urgência', author: pick(RESPONSIBLES), createdAt: randomDate(5) },
      ] : [],
    };
    tasks.push(task);
  }

  // Generate transactions
  const expenseCategories = ['salarios', 'ferramentas', 'infraestrutura', 'marketing', 'impostos', 'servicos'] as const;
  const revenueCategories = ['contrato', 'consultoria', 'recorrente', 'avulso'] as const;

  for (let i = 0; i < 15; i++) {
    transactions.push({
      id: uid(),
      type: 'receita',
      category: pick([...revenueCategories]),
      description: `Receita: ${pick(NAMES)}`,
      value: Math.floor(Math.random() * 50 + 5) * 1000,
      date: randomDate(90).split('T')[0],
      leadId: pick(allLeadIds),
      responsible: pick(RESPONSIBLES),
      recurring: Math.random() > 0.7,
      notes: '',
      createdAt: randomDate(90),
    });
  }

  for (let i = 0; i < 12; i++) {
    transactions.push({
      id: uid(),
      type: 'despesa',
      category: pick([...expenseCategories]),
      description: `Despesa: ${pick(['ChatGPT', 'Servidor AWS', 'Salário', 'Google Ads', 'Figma', 'Notion'])}`,
      value: Math.floor(Math.random() * 10 + 1) * 1000,
      date: randomDate(90).split('T')[0],
      responsible: pick(RESPONSIBLES),
      recurring: Math.random() > 0.5,
      notes: '',
      createdAt: randomDate(90),
    });
  }

  // Generate goals
  const currentMonth = new Date().toISOString().slice(0, 7);
  RESPONSIBLES.forEach(name => {
    const target = Math.floor(Math.random() * 100 + 50) * 1000;
    const revenueForUser = transactions.filter(t => t.type === 'receita' && t.responsible === name).reduce((s, t) => s + t.value, 0);
    goals.push({
      id: uid(),
      userId: name.toLowerCase(),
      userName: name,
      target,
      current: revenueForUser,
      period: currentMonth,
      type: 'revenue',
    });
  });

  return { leads, tasks, activities, transactions, goals };
}

export function loadDemoData() {
  const { leads, tasks, activities, transactions, goals } = generateDemoData();

  // Build ID mapping: old generated ID -> new storage ID
  const idMap = new Map<string, string>();

  leads.forEach(l => {
    const created = storage.createLead({
      name: l.name, email: l.email, phone: l.phone, company: l.company,
      area: l.area, source: l.source, responsible: l.responsible,
      estimatedValue: l.estimatedValue, leadType: l.leadType, status: l.status,
      notes: l.notes, nextFollowup: l.nextFollowup, wonLostReason: l.wonLostReason,
    });
    idMap.set(l.id, created.id);
    // Manually update timestamps for realism
    storage.updateLead(created.id, { createdAt: l.createdAt, updatedAt: l.updatedAt }, true);
  });

  tasks.forEach(t => {
    const mappedLeadId = idMap.get(t.leadId) || t.leadId;
    storage.createTask({
      leadId: mappedLeadId, type: t.type, priority: t.priority,
      title: t.title, description: t.description, dueDate: t.dueDate,
      subtasks: t.subtasks, comments: t.comments,
    });
  });

  transactions.forEach(t => {
    const mappedLeadId = t.leadId ? (idMap.get(t.leadId) || t.leadId) : undefined;
    storage.createTransaction({
      type: t.type, category: t.category, description: t.description,
      value: t.value, date: t.date, leadId: mappedLeadId,
      responsible: t.responsible, recurring: t.recurring, notes: t.notes,
    });
  });

  storage.saveGoals(goals);
}

// ===== WhatsApp Demo Data =====
const WHATSAPP_CONTACTS = [
  { name: 'Carlos Mendes', phone: '5511987654321' },
  { name: 'Ana Paula Silva', phone: '5511976543210' },
  { name: 'Roberto Almeida', phone: '5511965432109' },
  { name: 'Juliana Costa', phone: '5511954321098' },
  { name: 'Fernando Oliveira', phone: '5511943210987' },
  { name: 'Patrícia Santos', phone: '5511932109876' },
  { name: 'Marcos Ribeiro', phone: '5511921098765' },
  { name: 'Luciana Ferreira', phone: '5511910987654' },
];

const DEMO_CONVERSATIONS: { messages: { body: string; from_me: boolean }[] }[] = [
  {
    messages: [
      { body: 'Olá, boa tarde! Vi o anúncio de vocês no Instagram', from_me: false },
      { body: 'Boa tarde, Carlos! Tudo bem? Obrigado pelo interesse! 😊', from_me: true },
      { body: 'Queria saber mais sobre o serviço de automação', from_me: false },
      { body: 'Claro! Nós oferecemos automações personalizadas para empresas. Posso agendar uma demonstração?', from_me: true },
      { body: 'Pode sim, qual horário tem disponível?', from_me: false },
    ],
  },
  {
    messages: [
      { body: 'Oi, recebi a proposta por email', from_me: false },
      { body: 'Oi Ana! Que bom! Teve alguma dúvida?', from_me: true },
      { body: 'Sim, sobre o prazo de implementação', from_me: false },
      { body: 'Normalmente levamos de 2 a 4 semanas dependendo da complexidade', from_me: true },
      { body: 'Entendi, vou analisar e retorno até sexta', from_me: false },
      { body: 'Perfeito! Fico no aguardo 🙏', from_me: true },
    ],
  },
  {
    messages: [
      { body: 'Bom dia! O sistema está apresentando um erro', from_me: false },
      { body: 'Bom dia Roberto! Pode me descrever o erro?', from_me: true },
      { body: 'Quando tento gerar o relatório aparece tela branca', from_me: false },
      { body: 'Vou verificar agora mesmo. Um momento por favor', from_me: true },
      { body: 'Ok, aguardo', from_me: false },
      { body: 'Pronto! O problema era no cache do navegador. Tente limpar e acessar novamente', from_me: true },
      { body: 'Funcionou! Obrigado pelo suporte rápido 👍', from_me: false },
    ],
  },
  {
    messages: [
      { body: 'Boa tarde, gostaria de contratar o plano empresarial', from_me: false },
      { body: 'Boa tarde Juliana! Excelente escolha! Vou preparar a proposta', from_me: true },
      { body: 'Quanto tempo leva?', from_me: false },
      { body: 'Envio ainda hoje! 🚀', from_me: true },
    ],
  },
  {
    messages: [
      { body: 'Ei, tudo certo com o projeto?', from_me: false },
      { body: 'Tudo sim Fernando! Estamos na fase de testes', from_me: true },
      { body: 'Ótimo, quando posso ver uma prévia?', from_me: false },
    ],
  },
  {
    messages: [
      { body: 'Olá! Indicação do Carlos Mendes', from_me: false },
      { body: 'Olá Patrícia! O Carlos é um ótimo cliente nosso 😊 Como posso ajudar?', from_me: true },
    ],
  },
  {
    messages: [
      { body: 'Preciso renovar meu contrato', from_me: false },
      { body: 'Claro Marcos! Vou verificar as condições de renovação', from_me: true },
      { body: 'Tem desconto pra renovação?', from_me: false },
      { body: 'Sim! Oferecemos 15% de desconto na renovação anual', from_me: true },
      { body: 'Fechado! Pode mandar o contrato', from_me: false },
    ],
  },
  {
    messages: [
      { body: 'Boa noite! Vi que vocês trabalham com IA', from_me: false },
      { body: 'Boa noite Luciana! Sim, temos soluções com agentes de IA. Quer saber mais?', from_me: true },
    ],
  },
];

export async function loadWhatsAppDemoData() {
  const now = new Date();

  for (let i = 0; i < WHATSAPP_CONTACTS.length; i++) {
    const contact = WHATSAPP_CONTACTS[i];
    const conv = DEMO_CONVERSATIONS[i];
    const lastMsg = conv.messages[conv.messages.length - 1];
    const minutesAgo = (WHATSAPP_CONTACTS.length - i) * 45; // stagger conversations
    const lastMessageAt = new Date(now.getTime() - minutesAgo * 60000).toISOString();

    // Insert conversation
    const { data: convData, error: convError } = await supabase
      .from('whatsapp_conversations')
      .upsert({
        phone: contact.phone,
        contact_name: contact.name,
        last_message: lastMsg.body,
        last_message_at: lastMessageAt,
        unread_count: lastMsg.from_me ? 0 : Math.floor(Math.random() * 3) + 1,
        status: i < 6 ? 'active' : 'finished',
        priority: i === 0 ? 'high' : i === 2 ? 'urgent' : null,
      }, { onConflict: 'phone' })
      .select()
      .single();

    if (convError || !convData) {
      console.error('Error creating demo conversation:', convError);
      continue;
    }

    // Insert messages
    const messageRows = conv.messages.map((msg, idx) => {
      const msgTime = new Date(now.getTime() - minutesAgo * 60000 + (idx - conv.messages.length) * 120000);
      return {
        conversation_id: convData.id,
        phone: contact.phone,
        body: msg.body,
        from_me: msg.from_me,
        type: 'text',
        status: msg.from_me ? 'sent' : 'received',
        timestamp: msgTime.toISOString(),
        message_id: `demo_${contact.phone}_${idx}`,
      };
    });

    await supabase.from('whatsapp_messages').upsert(messageRows, { onConflict: 'message_id' });
  }
}
