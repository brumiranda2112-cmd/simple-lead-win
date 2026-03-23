import type { Tables } from '@/integrations/supabase/types';

export type Conversation = Tables<'whatsapp_conversations'> & {
  priority?: string | null;
  assigned_to?: string | null;
};
export type Message = Tables<'whatsapp_messages'>;

export type TabType = 'active' | 'finished' | 'groups';

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

export const QUICK_REPLIES = [
  { label: 'Saudação', text: 'Olá! Tudo bem? Como posso te ajudar hoje?' },
  { label: 'Obrigado', text: 'Muito obrigado pelo contato! Qualquer dúvida estou à disposição.' },
  { label: 'Horário', text: 'Nosso horário de atendimento é de segunda a sexta, das 9h às 18h.' },
  { label: 'Aguarde', text: 'Um momento, por favor. Já estou verificando para você.' },
  { label: 'Retorno', text: 'Vou verificar e retorno em breve com mais informações.' },
  { label: 'Encerrar', text: 'Foi um prazer atendê-lo! Caso precise de algo mais, é só chamar. Até logo!' },
];

export const EMOJI_LIST = ['😀','😂','😍','👍','🙏','🔥','✅','❤️','🎉','💪','👏','😊','🤝','💡','⭐','📌','🚀','💬','📎','🕐'];
