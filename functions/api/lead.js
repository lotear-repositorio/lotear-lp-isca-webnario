/**
 * Cloudflare Pages Function
 * Rota: /api/lead
 * Método: POST
 *
 * Recebe payload do formulário (ebook ou webinário),
 * envia para webhook Clint e dispara evento Meta CAPI.
 *
 * Variáveis de ambiente obrigatórias no Cloudflare Pages:
 *   CLINT_WEBHOOK_URL  → URL do webhook Clint
 *   META_PIXEL_ID      → ID do Pixel Meta
 *   META_ACCESS_TOKEN  → Token de acesso Meta CAPI
 */

const CLINT_WEBHOOK_URL =
  'https://functions-api.clint.digital/endpoints/integration/webhook/c50afeec-6bce-4c35-81d4-c9741bd3678e';

const META_PIXEL_ID    = '2152403845552453';
const META_ACCESS_TOKEN =
  'EAAPDHk6enYsBRyCZCbOZAHDEZC48DPrwysSOjEZAJQJuntELoPjBnj3ZCTTZAVg9LmSPKQdpFWfvJlr9R8jlTJnt9kBcuXGhAPuAMSsy3vFBP8ll1KZCZAOdMXrmi7V3Wn7ZAUlXWPZAdS95XtOPaVUMKNxJvEBEMuKKzFl6SnaKzIvKxIDkgSuzVvGbUhgQwxH0AZB0AZDZD';

/**
 * Gera UUID v4 simples para event_id único
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Hash SHA-256 para PII (Meta CAPI exige dados hasheados)
 */
async function sha256(value) {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();
  const data = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Envia evento para Meta Conversions API
 */
async function sendMetaCAPI({ eventName, email, phone, firstName, lastName, city, state, country, zip, externalId, clientIP, userAgent, fbp, fbc, eventId, sourceUrl }) {
  const userData = {
    em:  email     ? [await sha256(email)]     : undefined,
    ph:  phone     ? [await sha256(phone)]      : undefined,
    fn:  firstName ? [await sha256(firstName)]  : undefined,
    ln:  lastName  ? [await sha256(lastName)]   : undefined,
    ct:  city      ? [await sha256(city)]       : undefined,
    st:  state     ? [await sha256(state)]      : undefined,
    country: country ? [await sha256(country)] : undefined,
    zp:  zip        ? [await sha256(zip)]        : undefined,
    external_id: externalId ? [await sha256(externalId)] : undefined,
    fbp: fbp || undefined,
    fbc: fbc || undefined,
  };

  // Remove campos undefined
  Object.keys(userData).forEach((k) => userData[k] === undefined && delete userData[k]);

  const payload = {
    data: [
      {
        event_name:       eventName,
        event_time:       Math.floor(Date.now() / 1000),
        event_id:         eventId,
        event_source_url: sourceUrl || 'https://guia.soulotear.com.br',
        action_source:    'website',
        user_data:        { ...userData, client_ip_address: clientIP || undefined, client_user_agent: userAgent || undefined },
      },
    ],
  };

  const url = `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`;

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  return res.json();
}

/**
 * Envia dados para webhook Clint
 */
async function sendToClint(fields) {
  const res = await fetch(CLINT_WEBHOOK_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(fields),
  });

  return res.ok ? { ok: true } : { ok: false, status: res.status };
}

/**
 * Handler principal do Cloudflare Pages Function
 */
export async function onRequestPost(context) {
  // CORS — permite chamada do próprio domínio e localhost (dev)
  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type':                 'application/json',
  };

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Payload inválido' }), {
      status: 200, // retorna 200 para não bloquear o frontend
      headers: corsHeaders,
    });
  }

  const {
    // Dados pessoais
    name        = '',
    email       = '',
    phone       = '',
    // Geolocalização (capturada pelo JS da LP via Nominatim)
    city        = '',
    state       = '',
    country     = 'br',
    // UTMs
    utm_source   = '',
    utm_medium   = '',
    utm_campaign = '',
    utm_content  = '',
    utm_term     = '',
    // Meta cookies
    fbp = '',
    fbc = '',
    // Controle de fluxo
    webinar_accept = 'Não', // "Sim" ou "Não"
    data_hora_webinar = '',
    tag_data       = '',
    zip            = '',
    region         = '',
    user_agent     = '',
    event_id       = generateUUID(),
    page_url       = '',
  } = body;

  // Fallback geo via headers Cloudflare (se front-end nao enviou city/state)
  const cfCity    = context.request.headers.get('CF-IPCity')    || '';
  const cfCountry = context.request.headers.get('CF-IPCountry') || '';
  const cfRegion  = context.request.headers.get('CF-IPRegion')  || '';
  const resolvedCity    = city    || decodeURIComponent(cfCity).replace(/\+/g, ' ');
  const resolvedState   = (region || state || cfRegion || '').toLowerCase();
  const resolvedCountry = country || cfCountry.toLowerCase() || 'br';
  const resolvedZip     = zip     || '';
  const clientIP        = context.request.headers.get('CF-Connecting-IP') || context.request.headers.get('X-Forwarded-For') || '';
  const resolvedUA      = user_agent || context.request.headers.get('User-Agent') || '';

  // Separar primeiro/último nome para CAPI
  const parts     = name.trim().split(/\s+/);
  const firstName = parts[0]          || '';
  const lastName  = parts.slice(1).join(' ') || '';

  // ── 1. Envio para Clint ──────────────────────────────────────────────
  const clintPayload = {
    name,
    email,
    phone,
    city:    resolvedCity,
    state:   resolvedState,
    country: resolvedCountry,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    cep: resolvedZip,
    webinar_accept, // "Sim" ou "Não"
    data_hora_webinar,
    tag_data,
  };

  const clintResult = await sendToClint(clintPayload);

  // ── 2. Envio Meta CAPI ───────────────────────────────────────────────
  // Ebook download → evento Lead
  // Aceite webinário → evento CompleteRegistration
  const metaEventName = webinar_accept === 'Sim' ? 'CompleteRegistration' : 'Lead';

  const metaResult = await sendMetaCAPI({
    eventName: metaEventName,
    email,
    phone,
    firstName,
    lastName,
    city:      resolvedCity,
    state:     resolvedState,
    country:   resolvedCountry,
    zip:       resolvedZip,
    externalId: event_id,
    clientIP:  clientIP,
    userAgent: resolvedUA,
    fbp,
    fbc,
    eventId: event_id,
    sourceUrl: page_url,
  });

  return new Response(
    JSON.stringify({
      ok:    true,
      clint: clintResult,
      meta:  metaResult,
      event: metaEventName,
    }),
    { status: 200, headers: corsHeaders }
  );
}

/**
 * Preflight CORS
 */
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
