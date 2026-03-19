

# CRM Advocacia Simples - Plano de Implementação

## Limitação Importante

Lovable é uma plataforma frontend (React + Vite + Tailwind). **Não é possível** criar backend Node.js/Express, PostgreSQL via Docker, ou rodar servidores backend aqui. 

Conforme acordado anteriormente, vou implementar o CRM completo como **SPA React com localStorage** para persistência e autenticação local simples. Toda a lógica de negócio roda no frontend.

Se no futuro você quiser persistência real em banco de dados, podemos migrar para **Lovable Cloud (Supabase)** sem reescrever o frontend.

---

## O que será construído

### Arquivos principais (~15 arquivos novos)

**Dados e tipos:**
- `src/types/crm.ts` - Interfaces: Lead, Task, Activity, User, PipelineColumn
- `src/lib/storage.ts` - Camada localStorage (CRUD leads, tasks, activities, auth)
- `src/contexts/AuthContext.tsx` - Contexto de autenticação com senha local

**Páginas (5):**
- `src/pages/Login.tsx` - Tela de login/registro (senha local, JWT simulado)
- `src/pages/Dashboard.tsx` - Cards de métricas + 4 gráficos (Recharts)
- `src/pages/Pipeline.tsx` - Kanban 7 colunas com drag & drop
- `src/pages/Leads.tsx` - Tabela com busca, filtros, CRUD completo
- `src/pages/Tasks.tsx` - Lista de tarefas com filtros (hoje/atrasadas/concluídas)

**Componentes (6):**
- `src/components/AppSidebar.tsx` - Menu lateral escuro com ícones e contador de tarefas
- `src/components/AppLayout.tsx` - Layout com sidebar + header + trigger
- `src/components/LeadForm.tsx` - Modal formulário criar/editar lead
- `src/components/LeadDetails.tsx` - Página/modal detalhes com timeline e ações
- `src/components/TaskForm.tsx` - Modal formulário criar/editar tarefa
- `src/components/TaskAlertModal.tsx` - Modal de alerta ao abrir (tarefas atrasadas/hoje)

### Funcionalidades completas

1. **Autenticação local** - Primeiro acesso cria senha, depois login com email+senha via localStorage
2. **CRUD de leads** - Todos os campos especificados, validação, busca e filtros
3. **Pipeline Kanban** - 7 colunas coloridas, drag & drop (@hello-pangea/dnd), contadores, modal motivo ao mover para Ganho/Perdido
4. **Tarefas** - 5 tipos, vinculadas a leads, filtros por status, badges coloridos, checkbox para concluir
5. **Dashboard** - 8 cards de métricas + funil + pizza + barras + linha (Recharts)
6. **Histórico** - Registro automático de todas as ações, timeline visual no detalhe do lead
7. **Modal de alerta** - Ao abrir o sistema, mostra tarefas atrasadas e de hoje

### Design

- Tema escuro (#0f1117 fundo, cards com bordas sutis)
- Cores por coluna do pipeline conforme especificado
- Sidebar escura com destaque na rota ativa
- Responsivo para desktop (otimizado para 1336px+)

### Dependências a instalar
- `@hello-pangea/dnd` (drag & drop)
- `recharts` (gráficos)

---

## Ordem de implementação

1. Tipos, storage e contexto de auth
2. Layout (sidebar + rotas protegidas) + Login
3. CRUD de Leads (lista + formulário)
4. Pipeline Kanban com drag & drop
5. Tarefas e follow-ups
6. Dashboard com gráficos
7. Detalhes do lead com histórico
8. Modal de alerta de tarefas

