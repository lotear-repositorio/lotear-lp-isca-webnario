/**
 * Cloudflare Pages Function
 * Rota: /api/lead-qualificado
 * Método: POST
 *
 * Recebe webhook de automação do Clint (disparado quando um Deal muda
 * para o estágio de qualificação — ex: "Negócio" ou "Agendamento") e
 * envia um evento customizado "LeadQualificado" para a Meta Conversions API.
 *
 * Objetivo: ensinar o algoritmo Meta a reconhecer o padrão de quem
 * qualifica no CRM, não apenas quem preenche o formulário.
 *
 * Payload esperado (configurado no webhook do Clint):
 *   { "name": "...", "email": "...", "phone": "...", "stage": "..." }
 *
 * Variáveis já existentes no projeto (reaproveitadas):
 *   META_PIXEL_ID, META_ACCESS_TOKEN — mesmas do lead.js
 */

const META_PIXEL_ID     = '2152403845552453';
const META_ACCESS_TOKEN =
  'EAAPDHk6enYsBRyCZCbOZAHDEZC48DPrwysSOjEZAJQJuntELoPjBnj3ZCTTZAVg9LmSPKQdpFWfvJlr9R8jlTJnt9kBcuXGhAPuAMSsy3vFBP8ll1KZCZAOdMXrmi7V3Wn7ZAUlXWPZAdS95XtOPaVUMKNxJvEBEMuKKzFl6SnaKzIvKxIDkgSuzVvGbUhgQwxH0AZB0AZDZD';

/**
 * Gera UUID v4 simples para event_id único
 * (mesmo gerador usado em lead.js — mantém consistência no projeto)
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Hash SHA-256 para PII (Meta CAPI exige dados hasheados)
 * Idêntico ao sha256() de lead.js
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
 * Envia evento "LeadQualificado" para Meta Conversions API.
 * Sem event_id reaproveitado da jornada original — usa um novo UUID.
 * A Meta reconhece a mesma pessoa via em/ph hasheados, não via event_id
 * (event_id só serve para deduplicação, não para matching de identidade).
 */
async function sendLeadQualificadoCAPI({ email, phone, firstName, lastName, clientIP, userAgent, testEventCode }) {
  const userData = {
    em: email ? [await sha256(email)] : undefined,
    ph: phone ? [await sha256(phone)] : undefined,
    fn: firstName ? [await sha256(firstName)] : undefined,
    ln: lastName ? [await sha256(lastName)] : undefined,
    client_ip_address: clientIP || undefined,
    client_user_agent: userAgent || undefined,
  };

  // Remove campos undefined
  Object.keys(userData).forEach((k) => userData[k] === undefined && delete userData[k]);

  const payload = {
    data: [
      {
        event_name:       'LeadQualificado',
        event_time:       Math.floor(Date.now() / 1000),
        event_id:         generateUUID(),
        action_source:    'system_generated', // evento originado no CRM, não no site
        custom_data:      {}, // sem value/currency — segue regra do projeto
        user_data:        userData,
      },
    ],
  };

  // Opcional: só presente durante testes no Events Manager (aba "Eventos de teste")
  // Nunca enviar em produção — testEventCode fica undefined em chamadas reais do Clint
  if (testEventCode) {
    payload.test_event_code = testEventCode;
  }

  const url = `https://graph.facebook.com/v19.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`;

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  return res.json();
}

export async function onRequestPost(context) {
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
    // Retorna 200 para não gerar retry desnecessário do Clint em payload malformado
    return new Response(JSON.stringify({ error: 'Payload inválido' }), {
      status: 200,
      headers: corsHeaders,
    });
  }

  const { name = '', email = '', phone = '', stage = '', test_event_code = '' } = body;

  // Segurança básica: sem email nem telefone não há como fazer matching na Meta
  if (!email && !phone) {
    return new Response(
      JSON.stringify({ ok: false, error: 'email ou phone obrigatório' }),
      { status: 200, headers: corsHeaders }
    );
  }

  // Split nome — mesma lógica de lead.js
  const parts     = name.trim().split(/\s+/);
  const firstName = parts[0]              || '';
  const lastName  = parts.slice(1).join(' ') || '';

  const clientIP = context.request.headers.get('CF-Connecting-IP') || '';
  const userAgent = context.request.headers.get('User-Agent') || '';

  const metaResult = await sendLeadQualificadoCAPI({
    email,
    phone,
    firstName,
    lastName,
    clientIP,
    userAgent,
    testEventCode: test_event_code,
  });

  return new Response(
    JSON.stringify({
      ok:    true,
      stage, // eco do estágio recebido — útil para conferir no log
      meta:  metaResult,
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
