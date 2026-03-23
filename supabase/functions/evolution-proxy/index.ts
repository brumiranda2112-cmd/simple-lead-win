const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL") || "http://191.252.182.221:8080";
    const API_KEY = Deno.env.get("EVOLUTION_API_KEY")!;

    const { path, method, body } = await req.json();

    const fetchOptions: RequestInit = {
      method: method || "GET",
      headers: { "Content-Type": "application/json", apikey: API_KEY },
    };

    if (body && method !== "GET") {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(`${EVOLUTION_URL}/${path}`, fetchOptions);
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
