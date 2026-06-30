// ─────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: groq-proxy
// Keeps the Groq API key SERVER-SIDE (never shipped in the app bundle).
// - Requires a valid Supabase user JWT (Authorization: Bearer <access_token>).
// - Rate-limits per user via the check_rate_limit() RPC (auth.uid()-bound).
// - Forwards the chat request to Groq using the secret GROQ_API_KEY.
//
// Deploy:
//   supabase functions deploy groq-proxy
//   supabase secrets set GROQ_API_KEY=gsk_xxx   (your NEW Groq key)
// SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    // 1. Require a logged-in user.
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: 'unauthorized' }, 401);

    // 2. Rate limit: 30 AI calls / 10 min / user (check_rate_limit uses auth.uid()).
    const { data: allowed, error: rlErr } = await supabase.rpc('check_rate_limit', {
      p_user_id: user.id, p_action: 'ai_chat', p_max_requests: 30, p_window_minutes: 10,
    });
    // Fail CLOSED: if the rate-limit check itself errors, do not call Groq (else
    // a misconfig would silently disable throttling and expose the paid key).
    if (rlErr) {
      console.error('[groq-proxy] rate-limit RPC error:', rlErr.message);
      return json({ error: 'rate_limit_unavailable' }, 503);
    }
    if (allowed === false) return json({ error: 'rate_limited' }, 429);

    // 3. Validate input.
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const maxTokens = typeof body?.max_tokens === 'number' ? Math.min(body.max_tokens, 1000) : 500;
    if (messages.length === 0) return json({ error: 'no_messages' }, 400);

    // 4. Call Groq with the server-side secret.
    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (!groqKey) return json({ error: 'server_misconfigured' }, 500);

    const groqResp = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.7, max_tokens: maxTokens, top_p: 1 }),
    });

    if (!groqResp.ok) {
      const detail = (await groqResp.text()).slice(0, 200);
      return json({ error: 'groq_error', detail }, 502);
    }

    const data = await groqResp.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    return json({ content });
  } catch (e) {
    return json({ error: 'internal', detail: String(e).slice(0, 200) }, 500);
  }
});
