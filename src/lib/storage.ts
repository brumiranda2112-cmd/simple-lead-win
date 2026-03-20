import { Lead, Task, Activity, CrmUser, LeadStatus, Transaction } from '@/types/crm';

const KEYS = {
  USER: 'crm_user',
  AUTH_TOKEN: 'crm_auth_token',
  LEADS: 'crm_leads',
  TASKS: 'crm_tasks',
  ACTIVITIES: 'crm_activities',
};

function uid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function set(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ===== AUTH =====
export function getUser(): CrmUser | null {
  return get<CrmUser | null>(KEYS.USER, null);
}

export function registerUser(email: string, name: string, password: string): CrmUser {
  const user: CrmUser = { email, name, passwordHash: btoa(password) };
  set(KEYS.USER, user);
  set(KEYS.AUTH_TOKEN, uid());
  return user;
}

export function loginUser(email: string, password: string): CrmUser | null {
  const user = getUser();
  if (!user) return null;
  if (user.email === email && atob(user.passwordHash) === password) {
    set(KEYS.AUTH_TOKEN, uid());
    return user;
  }
  return null;
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem(KEYS.AUTH_TOKEN);
}

export function logout() {
  localStorage.removeItem(KEYS.AUTH_TOKEN);
}

// ===== LEADS =====
export function getLeads(): Lead[] {
  return get<Lead[]>(KEYS.LEADS, []);
}

export function getLead(id: string): Lead | undefined {
  return getLeads().find(l => l.id === id);
}

export function createLead(data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Lead {
  const leads = getLeads();
  const lead: Lead = { ...data, id: uid(), createdAt: now(), updatedAt: now() };
  leads.push(lead);
  set(KEYS.LEADS, leads);
  addActivity(lead.id, 'lead_created', `Lead "${lead.name}" criado`);
  return lead;
}

export function updateLead(id: string, data: Partial<Lead>): Lead | null {
  const leads = getLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return null;
  leads[idx] = { ...leads[idx], ...data, updatedAt: now() };
  set(KEYS.LEADS, leads);
  addActivity(id, 'lead_updated', `Lead "${leads[idx].name}" atualizado`);
  return leads[idx];
}

export function deleteLead(id: string) {
  const leads = getLeads().filter(l => l.id !== id);
  set(KEYS.LEADS, leads);
  // Also delete related tasks and activities
  set(KEYS.TASKS, getTasks().filter(t => t.leadId !== id));
  set(KEYS.ACTIVITIES, getActivities().filter(a => a.leadId !== id));
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
  set(KEYS.LEADS, leads);
  addActivity(id, 'status_changed', `Status mudou de "${oldStatus}" para "${newStatus}"`, { oldStatus, newStatus, reason });
  return leads[idx];
}

// ===== TASKS =====
export function getTasks(): Task[] {
  return get<Task[]>(KEYS.TASKS, []);
}

export function getTask(id: string): Task | undefined {
  return getTasks().find(t => t.id === id);
}

export function createTask(data: Omit<Task, 'id' | 'completed' | 'completedAt' | 'createdAt'>): Task {
  const tasks = getTasks();
  const task: Task = { ...data, id: uid(), completed: false, completedAt: null, createdAt: now() };
  tasks.push(task);
  set(KEYS.TASKS, tasks);
  addActivity(data.leadId, 'task_created', `Tarefa "${task.title}" criada`);
  return task;
}

export function updateTask(id: string, data: Partial<Task>): Task | null {
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], ...data };
  set(KEYS.TASKS, tasks);
  return tasks[idx];
}

export function completeTask(id: string): Task | null {
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], completed: true, completedAt: now() };
  set(KEYS.TASKS, tasks);
  addActivity(tasks[idx].leadId, 'task_completed', `Tarefa "${tasks[idx].title}" concluída`);
  return tasks[idx];
}

export function deleteTask(id: string) {
  set(KEYS.TASKS, getTasks().filter(t => t.id !== id));
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
  return get<Activity[]>(KEYS.ACTIVITIES, []);
}

export function getLeadActivities(leadId: string): Activity[] {
  return getActivities().filter(a => a.leadId === leadId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function addActivity(leadId: string, type: Activity['type'], description: string, metadata?: Record<string, unknown>) {
  const activities = getActivities();
  activities.push({ id: uid(), leadId, type, description, metadata, createdAt: now() });
  set(KEYS.ACTIVITIES, activities);
}
