import { supabase } from "@/integrations/supabase/client";

type EvolutionErrorPayload = {
  error?: string;
  code?: string;
  upstream_status?: number;
};

export async function evolutionApi(path: string, method = "GET", body?: object) {
  const { data, error } = await supabase.functions.invoke("evolution-proxy", {
    body: { path, method, body },
  });

  const payload = (data ?? {}) as EvolutionErrorPayload;

  if (error) {
    const details = payload.error ? ` - ${payload.error}` : "";
    throw new Error(`${error.message}${details}`);
  }

  if (payload.error) {
    throw new Error(payload.error);
  }

  return data;
}
