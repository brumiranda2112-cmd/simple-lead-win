const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REQUEST_TIMEOUT_MS = 10000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EVOLUTION_URL = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/+$/, "");
    if (!EVOLUTION_URL) {
      return new Response(JSON.stringify({ error: "EVOLUTION_API_URL is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "EVOLUTION_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { path, method, body } = await req.json();

    if (!path || typeof path !== "string") {
      return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitizedPath = path.replace(/^\/+/, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const fetchOptions: RequestInit = {
        method: method || "GET",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        signal: controller.signal,
      };

      if (body && (method || "GET") !== "GET") {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(`${EVOLUTION_URL}/${sanitizedPath}`, fetchOptions);
      const raw = await response.text();
      let data: unknown = null;

      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch {
          data = { raw };
        }
      }

      if (!response.ok) {
        const upstreamError =
          (data as Record<string, unknown> | null)?.error ??
          (data as Record<string, unknown> | null)?.message ??
          `Evolution API error (${response.status})`;

        return new Response(
          JSON.stringify({
            error: upstreamError,
            upstream_status: response.status,
            upstream_body: data,
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isConnectError =
        message.includes("Connection refused") ||
        message.includes("tcp connect error") ||
        message.includes("client error (Connect)");
      const isTimeout = message.includes("aborted") || message.includes("timed out");

      return new Response(
        JSON.stringify({
          error: message,
          code: isConnectError ? "EVOLUTION_UNREACHABLE" : isTimeout ? "EVOLUTION_TIMEOUT" : "EVOLUTION_PROXY_ERROR",
        }),
        {
          status: isConnectError || isTimeout ? 503 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected evolution-proxy error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
