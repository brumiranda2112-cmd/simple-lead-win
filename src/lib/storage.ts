import { Lead, Task, Activity, CrmUser, LeadStatus, Transaction, LeadType, UserGoal, Contract, Installment } from '@/types/crm';

let _userId: string | null = null;

export function setStorageUserId(userId: string | null) {
  _userId = userId;
}

function prefixedKey(key: string): string {
  if (!_userId) return key;
  return `${_userId}:${key}`;
}

const BASE_KEYS = {
  USER: 'crm_user',
  AUTH_TOKEN: 'crm_auth_token',
  LEADS: 'crm_leads',
  TASKS: 'crm_tasks',
  ACTIVITIES: 'crm_activities',
  TRANSACTIONS: 'crm_transactions',
  GOALS: 'crm_goals',
  CONTRACTS: 'crm_contracts',
};

function uid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function get<T>(baseKey: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(prefixedKey(baseKey));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function set(baseKey: string, value: unknown) {
  localStorage.setItem(prefixedKey(baseKey), JSON.stringify(value));
}

// ===== AUTH =====
export function getUser(): CrmUser | null {
  return get<CrmUser | null>(BASE_KEYS.USER, null);
}

export function registerUser(email: string, name: string, password: string): CrmUser {
  const user: CrmUser = { email, name, passwordHash: btoa(password) };
  set(BASE_KEYS.USER, user);
  set(BASE_KEYS.AUTH_TOKEN, uid());
  return user;
}

export function loginUser(email: string, password: string): CrmUser | null {
  const user = getUser();
  if (!user) return null;
  if (user.email === email && atob(user.passwordHash) === password) {
    set(BASE_KEYS.AUTH_TOKEN, uid());
    return user;
  }
  return null;
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem(prefixedKey(BASE_KEYS.AUTH_TOKEN));
}

export function logout() {
  localStorage.removeItem(prefixedKey(BASE_KEYS.AUTH_TOKEN));
}

// ===== LEADS =====
function migrateLeads(leads: Lead[]): Lead[] {
  return leads.map(l => {
    if (!l.leadType) {
      const clientStatuses = ['cliente_novo', 'mvp', 'call_apresentacao', 'aprovacao', 'desenvolvimento_final', 'entrega_cliente', 'ajustes', 'finalizado', 'diagnostico', 'call_cliente', 'mvp_sistema', 'aprovacao_cliente', 'contrato_fechado', 'desenvolvimento', 'periodo_ajustes'];
      return { ...l, leadType: clientStatuses.includes(l.status) ? 'cliente' as LeadType : 'lead' as LeadType };
    }
    return l;
  });
}

export function getLeads(): Lead[] {
  return migrateLeads(get<Lead[]>(BASE_KEYS.LEADS, []));
}

export function getLeadsByType(type: LeadType): Lead[] {
  return getLeads().filter(l => l.leadType === type);
}

export function getLead(id: string): Lead | undefined {
  return getLeads().find(l => l.id === id);
}

export function createLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Lead {
  const leads = getLeads();
  const lead: Lead = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
  leads.push(lead);
  set(BASE_KEYS.LEADS, leads);
  addActivity(lead.id, 'lead_created', `Lead "${lead.name}" criado`);
  return lead;
}

export function updateLead(id: string, data: Partial<Lead>, skipTimestamp = false): Lead | null {
  const leads = getLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return null;
  leads[idx] = { ...leads[idx], ...data, ...(skipTimestamp ? {} : { updatedAt: now() }) };
  set(BASE_KEYS.LEADS, leads);
  if (!skipTimestamp) addActivity(id, 'lead_updated', `Lead "${leads[idx].name}" atualizado`);
  return leads[idx];
}

export function deleteLead(id: string) {
  const leads = getLeads().filter(l => l.id !== id);
  set(BASE_KEYS.LEADS, leads);
  set(BASE_KEYS.TASKS, getTasks().filter(t => t.leadId !== id));
  set(BASE_KEYS.ACTIVITIES, getActivities().filter(a => a.leadId !== id));
}

export function moveLeadStatus(id: string, newStatus: LeadStatus, reason?: string): Lead | null {
  const leads = getLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return null;
  const oldStatus = leads[idx].status;
  leads[idx] = {
    ...leads[idx],
    status: newStatus,
    updatedAt: now(),
    wonLostReason: reason || leads[idx].wonLostReason,
  };
  set(BASE_KEYS.LEADS, leads);
  addActivity(id, 'status_changed', `Status mudou de "${oldStatus}" para "${newStatus}"`, { oldStatus, newStatus, reason });
  return leads[idx];
}

export function convertLeadToClient(id: string): Lead | null {
  const leads = getLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return null;
  leads[idx] = { ...leads[idx], leadType: 'cliente', status: 'cliente_novo', updatedAt: now() };
  set(BASE_KEYS.LEADS, leads);
  addActivity(id, 'status_changed', `Lead convertido em Cliente`);
  return leads[idx];
}

// ===== TASKS =====
export function getTasks(): Task[] {
  return get<Task[]>(BASE_KEYS.TASKS, []).map(t => ({
    ...t,
    priority: t.priority || 'media',
    subtasks: t.subtasks || [],
    comments: t.comments || [],
  }));
}

export function getTask(id: string): Task | undefined {
  return getTasks().find(t => t.id === id);
}

export function createTask(data: Omit<Task, 'id' | 'completed' | 'completedAt' | 'createdAt'>): Task {
  const tasks = getTasks();
  const task: Task = { ...data, id: uid(), completed: false, completedAt: null, createdAt: now() };
  tasks.push(task);
  set(BASE_KEYS.TASKS, tasks);
  addActivity(data.leadId, 'task_created', `Tarefa "${task.title}" criada`);
  return task;
}

export function updateTask(id: string, data: Partial<Task>): Task | null {
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], ...data };
  set(BASE_KEYS.TASKS, tasks);
  return tasks[idx];
}

export function completeTask(id: string): Task | null {
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], completed: true, completedAt: now() };
  set(BASE_KEYS.TASKS, tasks);
  addActivity(tasks[idx].leadId, 'task_completed', `Tarefa "${tasks[idx].title}" concluída`);
  return tasks[idx];
}

export function deleteTask(id: string) {
  set(BASE_KEYS.TASKS, getTasks().filter(t => t.id !== id));
}

export function getOverdueTasks(): Task[] {
  const today = new Date().toISOString().split('T')[0];
  return getTasks().filter(t => !t.completed && t.dueDate.split('T')[0] < today);
}

export function getTodayTasks(): Task[] {
  const today = new Date().toISOString().split('T')[0];
  return getTasks().filter(t => !t.completed && t.dueDate.split('T')[0] === today);
}

// ===== ACTIVITIES =====
export function getActivities(): Activity[] {
  return get<Activity[]>(BASE_KEYS.ACTIVITIES, []);
}

export function getLeadActivities(leadId: string): Activity[] {
  return getActivities().filter(a => a.leadId === leadId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function addActivity(leadId: string, type: Activity['type'], description: string, metadata?: Record<string, unknown>) {
  const activities = getActivities();
  activities.push({ id: uid(), leadId, type, description, metadata, createdAt: now() });
  set(BASE_KEYS.ACTIVITIES, activities);
}

// ===== TRANSACTIONS =====
export function getTransactions(): Transaction[] {
  return get<Transaction[]>(BASE_KEYS.TRANSACTIONS, []);
}

export function createTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
  const txns = getTransactions();
  const txn: Transaction = { ...data, id: uid(), createdAt: now() };
  txns.push(txn);
  set(BASE_KEYS.TRANSACTIONS, txns);
  return txn;
}

export function updateTransaction(id: string, data: Partial<Transaction>): Transaction | null {
  const txns = getTransactions();
  const idx = txns.findIndex(t => t.id === id);
  if (idx === -1) return null;
  txns[idx] = { ...txns[idx], ...data };
  set(BASE_KEYS.TRANSACTIONS, txns);
  return txns[idx];
}

export function deleteTransaction(id: string) {
  set(BASE_KEYS.TRANSACTIONS, getTransactions().filter(t => t.id !== id));
}

export function syncRevenueFromLeads() {
  const leads = getLeads();
  const txns = getTransactions();
  const closedLeads = leads.filter(l => 
    ['desenvolvimento_final', 'entrega_cliente', 'ajustes', 'finalizado', 'contrato_fechado', 'desenvolvimento', 'periodo_ajustes'].includes(l.status) && l.estimatedValue > 0
  );
  
  closedLeads.forEach(lead => {
    const exists = txns.some(t => t.leadId === lead.id && t.type === 'receita');
    if (!exists) {
      createTransaction({
        type: 'receita',
        category: 'contrato',
        description: `Contrato: ${lead.name}`,
        value: lead.estimatedValue,
        date: lead.updatedAt.split('T')[0],
        leadId: lead.id,
        responsible: lead.responsible as any,
        recurring: false,
        notes: '',
      });
    }
  });
}

// ===== GOALS =====
export function getGoals(): UserGoal[] {
  return get<UserGoal[]>(BASE_KEYS.GOALS, []);
}

export function saveGoals(goals: UserGoal[]) {
  set(BASE_KEYS.GOALS, goals);
}

export function createGoal(data: Omit<UserGoal, 'id'>): UserGoal {
  const goals = getGoals();
  const goal: UserGoal = { ...data, id: uid() };
  goals.push(goal);
  set(BASE_KEYS.GOALS, goals);
  return goal;
}

export function updateGoal(id: string, data: Partial<UserGoal>): UserGoal | null {
  const goals = getGoals();
  const idx = goals.findIndex(g => g.id === id);
  if (idx === -1) return null;
  goals[idx] = { ...goals[idx], ...data };
  set(BASE_KEYS.GOALS, goals);
  return goals[idx];
}

export function deleteGoal(id: string) {
  set(BASE_KEYS.GOALS, getGoals().filter(g => g.id !== id));
}

export function clearAllData() {
  Object.values(BASE_KEYS).forEach(key => {
    localStorage.removeItem(prefixedKey(key));
  });
}

// ===== CONTRACTS =====
export function getContracts(): Contract[] {
  return get<Contract[]>(BASE_KEYS.CONTRACTS, []);
}

export function getContractsByLead(leadId: string): Contract[] {
  return getContracts().filter(c => c.leadId === leadId);
}

export function getContract(id: string): Contract | null {
  return getContracts().find(c => c.id === id) || null;
}

export function createContract(data: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Contract {
  const contracts = getContracts();
  const contract: Contract = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
  contracts.push(contract);
  set(BASE_KEYS.CONTRACTS, contracts);
  const lead = getLead(data.leadId);
  if (lead) addActivity(data.leadId, 'lead_updated', `Contrato "${data.title}" criado - R$ ${data.totalValue.toLocaleString('pt-BR')}`);
  return contract;
}

export function updateContract(id: string, data: Partial<Contract>): Contract | null {
  const contracts = getContracts();
  const idx = contracts.findIndex(c => c.id === id);
  if (idx === -1) return null;
  contracts[idx] = { ...contracts[idx], ...data, updatedAt: now() };
  set(BASE_KEYS.CONTRACTS, contracts);
  return contracts[idx];
}

export function deleteContract(id: string) {
  set(BASE_KEYS.CONTRACTS, getContracts().filter(c => c.id !== id));
}

export function markInstallmentPaid(contractId: string, installmentId: string): { contract: Contract; transaction: Transaction } | null {
  const contract = getContract(contractId);
  if (!contract) return null;
  const inst = contract.installments.find(i => i.id === installmentId);
  if (!inst || inst.status === 'pago') return null;

  const lead = getLead(contract.leadId);
  const txn = createTransaction({
    type: 'receita',
    category: 'contrato',
    description: `Parcela: ${contract.title} - ${inst.description}`,
    value: inst.value,
    date: now().split('T')[0],
    leadId: contract.leadId,
    responsible: lead?.responsible || '',
    recurring: false,
    notes: `Contrato: ${contract.title}`,
  });

  inst.status = 'pago';
  inst.paidAt = now();
  inst.transactionId = txn.id;

  updateContract(contractId, { installments: contract.installments });
  addActivity(contract.leadId, 'lead_updated', `Parcela "${inst.description}" paga - R$ ${inst.value.toLocaleString('pt-BR')}`);

  return { contract, transaction: txn };
}

export function markInstallmentUnpaid(contractId: string, installmentId: string): Contract | null {
  const contract = getContract(contractId);
  if (!contract) return null;
  const inst = contract.installments.find(i => i.id === installmentId);
  if (!inst || inst.status !== 'pago') return null;

  // Remove associated transaction
  if (inst.transactionId) deleteTransaction(inst.transactionId);

  inst.status = 'pendente';
  inst.paidAt = null;
  inst.transactionId = null;

  updateContract(contractId, { installments: contract.installments });
  return contract;
}
