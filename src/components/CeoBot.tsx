import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import * as storage from '@/lib/storage';
import { Lead, LEAD_STATUS_LABELS, LEAD_AREA_LABELS, LEAD_RESPONSIBLE_LABELS } from '@/types/crm';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface CrmAction {
  type: 'create_lead' | 'create_task' | 'move_lead';
  data: Record<string, any>;
}

function buildCrmContext() {
  const leads = storage.getLeads();
  const tasks = storage.getTasks();
  const leadsWithNames = tasks.map(t => {
    const lead = leads.find(l => l.id === t.leadId);
    return { ...t, leadName: lead?.name || 'Desconhecido' };
  });

  const finished = leads.filter(l => l.status === 'finalizado').length;
  const active = leads.filter(l => l.status !== 'finalizado').length;
  const totalValue = leads.reduce((s, l) => s + l.estimatedValue, 0);
  const conversionRate = leads.length > 0 ? ((finished / leads.length) * 100).toFixed(1) : '0';

  return {
    leads: leads.map(l => ({
      name: l.name, status: l.status, responsible: l.responsible,
      estimatedValue: l.estimatedValue, area: l.area, phone: l.phone,
      company: l.company, email: l.email, source: l.source,
    })),
    tasks: leadsWithNames.map(t => ({
      title: t.title, type: t.type, dueDate: t.dueDate,
      completed: t.completed, leadName: t.leadName, leadId: t.leadId,
    })),
    stats: { total: leads.length, active, finished, totalValue, conversionRate },
  };
}

function executeActions(actions: CrmAction[]): string[] {
  const results: string[] = [];

  for (const action of actions) {
    try {
      if (action.type === 'create_lead') {
        const d = action.data;
        storage.createLead({
          name: d.name || 'Novo Lead',
          phone: d.phone || '',
          email: d.email || '',
          company: d.company || '',
          area: d.area || 'outro',
          source: d.source || 'outro',
          responsible: d.responsible || 'bruno',
          estimatedValue: d.estimatedValue || 0,
          status: d.status || 'cliente_novo',
          notes: d.notes || '',
          nextFollowup: d.nextFollowup || null,
          wonLostReason: '',
        });
        results.push(`✅ Lead "${d.name}" criado com sucesso!`);
      } else if (action.type === 'create_task') {
        const d = action.data;
        const leads = storage.getLeads();
        const lead = leads.find(l =>
          l.name.toLowerCase().includes((d.leadName || '').toLowerCase())
        );
        if (lead) {
          storage.createTask({
            leadId: lead.id,
            type: d.type || 'followup',
            title: d.title || 'Nova tarefa',
            description: d.description || '',
            dueDate: d.dueDate || new Date(Date.now() + 86400000).toISOString(),
          });
          results.push(`✅ Tarefa "${d.title}" criada para ${lead.name}!`);
        } else {
          results.push(`⚠️ Lead "${d.leadName}" não encontrado para criar tarefa.`);
        }
      } else if (action.type === 'move_lead') {
        const d = action.data;
        const leads = storage.getLeads();
        const lead = leads.find(l =>
          l.name.toLowerCase().includes((d.leadName || '').toLowerCase())
        );
        if (lead) {
          storage.moveLeadStatus(lead.id, d.newStatus, d.reason);
          results.push(`✅ Lead "${lead.name}" movido para ${LEAD_STATUS_LABELS[d.newStatus as keyof typeof LEAD_STATUS_LABELS] || d.newStatus}!`);
        } else {
          results.push(`⚠️ Lead "${d.leadName}" não encontrado.`);
        }
      }
    } catch (e) {
      results.push(`❌ Erro ao executar ação: ${e}`);
    }
  }
  return results;
}

function parseActions(text: string): CrmAction[] {
  const actions: CrmAction[] = [];
  const match = text.match(/<actions>([\s\S]*?)<\/actions>/);
  if (!match) return actions;

  const content = match[1].trim();
  // Could be a single action or array
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      actions.push(...parsed);
    } else {
      actions.push(parsed);
    }
  } catch {
    // Try to find multiple JSON objects
    const jsonMatches = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
    if (jsonMatches) {
      for (const m of jsonMatches) {
        try { actions.push(JSON.parse(m)); } catch { /* skip */ }
      }
    }
  }
  return actions;
}

function cleanResponseText(text: string): string {
  return text.replace(/<actions>[\s\S]*?<\/actions>/g, '').trim();
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ceo-bot`;

export function CeoBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionResults, setActionResults] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, actionResults]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Auto-check overdue on open
  useEffect(() => {
    if (open && messages.length === 0) {
      const overdue = storage.getOverdueTasks();
      const today = storage.getTodayTasks();
      if (overdue.length > 0 || today.length > 0) {
        const leads = storage.getLeads();
        let greeting = '👋 Olá! Sou o CEO da KHRÓNOS. ';
        if (overdue.length > 0) {
          greeting += `\n\n🔴 **${overdue.length} tarefa(s) atrasada(s):**\n`;
          overdue.forEach(t => {
            const lead = leads.find(l => l.id === t.leadId);
            greeting += `- ${t.title} (${lead?.name || '?'}) — venceu em ${new Date(t.dueDate).toLocaleDateString('pt-BR')}\n`;
          });
        }
        if (today.length > 0) {
          greeting += `\n\n🟡 **${today.length} tarefa(s) para hoje:**\n`;
          today.forEach(t => {
            const lead = leads.find(l => l.id === t.leadId);
            greeting += `- ${t.title} (${lead?.name || '?'}) — ${new Date(t.dueDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;
          });
        }
        greeting += '\nMe pergunte qualquer coisa sobre o CRM! 🚀';
        setMessages([{ role: 'assistant', content: greeting }]);
      } else {
        setMessages([{
          role: 'assistant',
          content: '👋 Olá! Sou o **CEO da KHRÓNOS**. Posso criar leads, tarefas, mover clientes no pipeline, gerar relatórios e muito mais. É só me dizer o que precisa! 🚀'
        }]);
      }
    }
  }, [open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setActionResults([]);

    let assistantSoFar = '';

    try {
      const crmContext = buildCrmContext();
      const allMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages, crmContext }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error('No stream body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const updateAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && prev.length > 1 && prev[prev.length - 2]?.role === 'user') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: 'assistant', content: assistantSoFar }];
        });
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) updateAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Process actions from final text
      if (assistantSoFar) {
        const actions = parseActions(assistantSoFar);
        if (actions.length > 0) {
          const results = executeActions(actions);
          setActionResults(results);
          // Clean the display text
          const cleanText = cleanResponseText(assistantSoFar);
          setMessages(prev =>
            prev.map((m, i) => i === prev.length - 1 ? { ...m, content: cleanText } : m)
          );
        }
      }
    } catch (e: any) {
      console.error('CEO Bot error:', e);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Erro: ${e.message || 'Não foi possível conectar com a IA. Tente novamente.'}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center',
          'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25',
          'hover:shadow-xl hover:shadow-orange-500/40 hover:scale-105',
          'active:scale-95 transition-all duration-200',
          open && 'scale-0 opacity-0 pointer-events-none'
        )}
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Chat panel */}
      <div className={cn(
        'fixed bottom-6 right-6 z-50 w-[420px] h-[600px] max-h-[80vh]',
        'bg-card border border-border rounded-2xl shadow-2xl shadow-black/40',
        'flex flex-col overflow-hidden',
        'transition-all duration-300 origin-bottom-right',
        open ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">KHRÓNOS CEO</h3>
              <p className="text-[11px] text-muted-foreground">Assistente inteligente do CRM</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={cn(
                'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-secondary/70 text-foreground rounded-bl-md'
              )}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_ul]:my-1 [&_li]:my-0.5 [&_strong]:text-amber-400">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {actionResults.length > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-2.5 text-sm space-y-1">
              {actionResults.map((r, i) => (
                <p key={i} className="text-emerald-400">{r}</p>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-secondary/70 rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border">
          <div className="flex items-end gap-2 bg-secondary/50 rounded-xl px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte ao CEO..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[24px] max-h-[100px]"
              style={{ height: 'auto', overflow: 'hidden' }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = Math.min(el.scrollHeight, 100) + 'px';
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all',
                input.trim() && !isLoading
                  ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-95'
                  : 'text-muted-foreground opacity-40'
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
