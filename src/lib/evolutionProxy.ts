import { supabase } from "@/integrations/supabase/client";

type EvolutionErrorPayload = {
  error?: string;
  code?: string;
  upstream_status?: number;
};

type EvolutionApiOptions = {
  throwOnError?: boolean;
};

type EvolutionApiFailure = {
  error: string;
  code?: string;
  upstream_status?: number;
  __failed: true;
};

export async function evolutionApi(
  path: string,
  method = "GET",
  body?: object,
  options: EvolutionApiOptions = {},
) {
  const { data, error } = await supabase.functions.invoke("evolution-proxy", {
    body: { path, method, body },
  });

  const payload = (data ?? {}) as EvolutionErrorPayload;
  const throwOnError = options.throwOnError ?? true;

  const normalizedError =
    payload.error ||
    (error?.message === "Edge Function returned a non-2xx status code"
      ? "Evolution API is unreachable right now."
      : error?.message);

  if (normalizedError) {
    const failure: EvolutionApiFailure = {
      error: normalizedError,
      code: payload.code,
      upstream_status: payload.upstream_status,
      __failed: true,
    };

    if (throwOnError) {
      throw new Error(failure.error);
    }

    return failure;
  }

  return data;
}

export function isEvolutionApiFailure(value: unknown): value is EvolutionApiFailure {
  return !!value && typeof value === "object" && "__failed" in value;
}
