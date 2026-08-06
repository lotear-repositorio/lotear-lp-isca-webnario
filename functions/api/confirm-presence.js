const CLINT_WEBHOOK_URL =
  'https://functions-api.clint.digital/endpoints/integration/webhook/c50afeec-6bce-4c35-81d4-c9741bd3678e';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const ALLOWED = ['Confirmado', 'Talvez', 'Não respondeu'];

export async function onRequestPost(context) {
  let body;
  try { body = await context.request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Payload invalido' }), { status: 400, headers: CORS });
  }

  const { phone, webinar_presenca } = body;
  if (!phone || !ALLOWED.includes(webinar_presenca)) {
    return new Response(JSON.stringify({ error: 'phone e webinar_presenca (valor valido) sao obrigatorios' }), { status: 400, headers: CORS });
  }

  try {
    const resp = await fetch(CLINT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, webinar_presenca }),
    });
    const result = await resp.json().catch(() => ({}));
    return new Response(JSON.stringify({ ok: true, clint: result }), { status: 200, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 502, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}
