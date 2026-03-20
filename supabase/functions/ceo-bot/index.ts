import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o CEO virtual da KHRÓNOS AI, uma empresa de automações e agentes de IA. Seu nome é KHRÓNOS CEO.

Você tem acesso completo aos dados do CRM da empresa. Você pode:
1. Criar leads novos
2. Criar tarefas/follow-ups
3. Mover leads no pipeline
4. Gerar relatórios e análises
5. Alertar sobre tarefas atrasadas e clientes que precisam de atenção

PIPELINE DA KHRÓNOS (9 etapas):
- cliente_novo: Cliente Novo
- diagnostico: Diagnóstico
- call_cliente: Call com Cliente
- mvp_sistema: MVP do Sistema
- aprovacao_cliente: Aprovação do Cliente
- contrato_fechado: Contrato Fechado
- desenvolvimento: Desenvolvimento Completo
- periodo_ajustes: Período de Ajustes
- finalizado: Cliente Finalizado

RESPONSÁVEIS: Bruno e Gustavo

ÁREAS: agentes_ia (Agentes de IA), automacoes (Automações), sistemas (Sistemas Sob Medida), consultoria (Consultoria), outro

ORIGENS: indicacao, google, instagram, site, linkedin, outro

TIPOS DE TAREFA: followup, reuniao, proposta, diagnostico, lembrete, mensagem

REGRAS IMPORTANTES:
- Responda SEMPRE em português do Brasil
- Seja direto, profissional mas amigável
- Use emojis com moderação
- Quando o usuário pedir para criar algo, retorne a ação no formato JSON
- Quando pedir relatórios, analise os dados fornecidos e dê insights

FORMATO DE AÇÕES:
Quando precisar executar ações, inclua um bloco JSON no final da resposta entre as tags <actions> e </actions>.

Formatos de ação:
1. Criar lead:
{"type":"create_lead","data":{"name":"Nome","phone":"telefone","email":"email","company":"empresa","area":"agentes_ia","source":"indicacao","responsible":"bruno","estimatedValue":5000,"status":"cliente_novo","notes":"observações"}}

2. Criar tarefa:
{"type":"create_task","data":{"leadName":"Nome do Lead","type":"followup","title":"Título","description":"Descrição","dueDate":"2024-01-15T10:00:00"}}

3. Mover lead:
{"type":"move_lead","data":{"leadName":"Nome do Lead","newStatus":"diagnostico","reason":"motivo opcional"}}

Se o usuário não especificar todos os campos, use valores padrão sensatos:
- Valor estimado: 0 se não mencionado
- Status: cliente_novo para leads novos
- Área: outro se não especificada
- Origem: outro se não especificada
- Responsável: inferir do contexto ou perguntar
- Para tarefas, dueDate padrão: próximo dia útil às 10:00

Quando o usuário perguntar sobre dados, analise o contexto fornecido e dê respostas completas com números.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, crmContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build context message with CRM data
    let contextMessage = "";
    if (crmContext) {
      contextMessage = `\n\nDADOS ATUAIS DO CRM:\n`;
      if (crmContext.leads) {
        contextMessage += `\nLEADS (${crmContext.leads.length} total):\n`;
        crmContext.leads.forEach((l: any) => {
          contextMessage += `- ${l.name} | Status: ${l.status} | Responsável: ${l.responsible} | Valor: R$${l.estimatedValue} | Área: ${l.area} | Tel: ${l.phone} | Empresa: ${l.company || 'N/A'}\n`;
        });
      }
      if (crmContext.tasks) {
        const pending = crmContext.tasks.filter((t: any) => !t.completed);
        const overdue = crmContext.tasks.filter((t: any) => !t.completed && new Date(t.dueDate) < new Date());
        contextMessage += `\nTAREFAS (${crmContext.tasks.length} total, ${pending.length} pendentes, ${overdue.length} atrasadas):\n`;
        crmContext.tasks.forEach((t: any) => {
          const status = t.completed ? '✅' : new Date(t.dueDate) < new Date() ? '🔴 ATRASADA' : '⏳';
          contextMessage += `- ${status} ${t.title} | Tipo: ${t.type} | Vencimento: ${t.dueDate} | Lead: ${t.leadName || t.leadId}\n`;
        });
      }
      if (crmContext.stats) {
        contextMessage += `\nESTATÍSTICAS:\n`;
        contextMessage += `- Total leads: ${crmContext.stats.total}\n`;
        contextMessage += `- Ativos: ${crmContext.stats.active}\n`;
        contextMessage += `- Finalizados: ${crmContext.stats.finished}\n`;
        contextMessage += `- Valor total em negociação: R$${crmContext.stats.totalValue}\n`;
        contextMessage += `- Taxa conversão: ${crmContext.stats.conversionRate}%\n`;
      }
    }

    const systemWithContext = SYSTEM_PROMPT + contextMessage;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemWithContext },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos em Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao conectar com IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ceo-bot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
