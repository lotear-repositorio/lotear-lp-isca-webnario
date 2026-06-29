/**
 * Cloudflare Pages Function
 * Rota: POST /api/pixel
 *
 * Recebe eventos de topo de funil (ScrollDepth, ViewContent, AddToWishlist,
 * InitiateCheckout) antes do lead converter e os armazena no Cloudflare KV
 * para enriquecimento posterior via CAPI quando o lead fizer submit.
 *
 * Chave KV: fbp:{_fbp_value}
 * TTL: 7200s (2 horas — suficiente para qualquer sessão)
 *
 * Fire-and-forget no frontend — responde imediatamente sem bloquear nada.
 * Se falhar: evento já foi para o Pixel normalmente, nenhum dado é perdido.
 *
 * Variável de ambiente necessária: PIXEL_BUFFER_KV (KV namespace binding)
 */
export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type':                 'application/json',
  };

  // Responde imediatamente — o frontend não espera por esta resposta
  const responsePromise = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: corsHeaders,
  });

  try {
    const body = await context.request.json();
    const { fbp, event } = body;

    // Sem fbp = sem chave para buscar depois no submit — ignora
    if (!fbp || !event || !event.n) {
      return responsePromise;
    }

    const kv = context.env.PIXEL_BUFFER_KV;
    if (!kv) return responsePromise; // KV não configurado — graceful

    const key = `fbp:${fbp}`;

    // Lê buffer existente para este fbp
    let buf = [];
    try {
      const existing = await kv.get(key, { type: 'json' });
      if (Array.isArray(existing)) buf = existing;
    } catch (e) { /* sem buffer anterior — começa vazio */ }

    // Limita a 20 eventos por sessão (evita payload gigante)
    if (buf.length < 20) {
      buf.push(event);
      // Salva com TTL de 2h
      context.waitUntil(kv.put(key, JSON.stringify(buf), { expirationTtl: 7200 }));
    }

  } catch (e) {
    // Falha silenciosa — o Pixel já disparou, nenhum dado é perdido
  }

  return responsePromise;
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
