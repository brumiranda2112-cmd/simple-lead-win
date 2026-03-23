import { supabase } from "@/integrations/supabase/client";

export async function evolutionApi(path: string, method = "GET", body?: object) {
  const { data, error } = await supabase.functions.invoke("evolution-proxy", {
    body: { path, method, body },
  });
  if (error) throw new Error(error.message);
  return data;
}
