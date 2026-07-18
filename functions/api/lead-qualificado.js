/**
 * Cloudflare Pages Function
 * Rota: /api/lead-qualificado
 * Método: POST
 *
 * Recebe webhook de automação do Clint (disparado quando um Deal muda
 * de estágio — Negócio, Agendamento, Proposta, Venda) e envia o evento
 * Meta correspondente via Conversions API.
 *
 * Objetivo: ensinar o algoritmo Meta a reconhecer o padrão de quem
 * qualifica no CRM, não apenas quem preenche o formulário.
 *
 * Payload esperado (configurado no webhook do Clint):
 *   {
 *     "name": "...", "email": "...", "phone": "...", "stage": "...",
 *     "cep": "...", "estado": "...", "cidade": "...", "pais": "...",
 *     "external_id": "...", "fbp": "...", "fbc": "..."
 *   }
 *
 * NOVO (Ponto 2): cep/estado/cidade/pais elevam o EMQ com sinal
 * geográfico; external_id/fbp/fbc — gravados no contato do Clint pelo
 * lead.js (Ponto 1) — são os campos de maior peso na correspondência
 * de eventos e antes não existiam neste fluxo.
 *
 * Variáveis já existentes no projeto (reaproveitadas):
 *   META_PIXEL_ID, META_ACCESS_TOKEN — mesmas do lead.js
 */

const META_PIXEL_ID     = '2152403845552453';
const META_ACCESS_TOKEN =
  'EAAPDHk6enYsBRyCZCbOZAHDEZC48DPrwysSOjEZAJQJuntELoPjBnj3ZCTTZAVg9LmSPKQdpFWfvJlr9R8jlTJnt9kBcuXGhAPuAMSsy3vFBP8ll1KZCZAOdMXrmi7V3Wn7ZAUlXWPZAdS95XtOPaVUMKNxJvEBEMuKKzFl6SnaKzIvKxIDkgSuzVvGbUhgQwxH0AZB0AZDZD';

/**
 * Mapeia o estágio do Deal (Clint) para o nome de evento correto na Meta.
 * Cada estágio tem um event_name próprio para o algoritmo aprender pesos
 * diferentes — não diluir tudo em um único "LeadQualificado" genérico.
 *
 * Ajustar as chaves à esquerda se o Clint enviar o stage com grafia
 * diferente (ex: sem acento, em outro idioma, ou com sufixo de etapa).
 */
const STAGE_TO_EVENT = {
  'Negócio':     'LeadQualificado',
  'Negocio':     'LeadQualificado', // fallback sem acento
  'Agendamento': 'LeadAgendou',
  'Proposta':    'LeadProposta',
  'Venda':       'Purchase', // evento padrão Meta — permite otimizar como conversão de valor
};

/**
 * Resolve o event_name a partir do stage recebido.
 * Stage desconhecido cai em "LeadQualificado" (comportamento anterior
 * preservado) em vez de falhar — nunca perde o evento por mapeamento ausente.
 */
function resolveEventName(stage) {
  return STAGE_TO_EVENT[stage] || 'LeadQualificado';
}

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
 * Envia evento de qualificação para Meta Conversions API.
 * Sem event_id reaproveitado da jornada original — usa um novo UUID.
 * A Meta reconhece a mesma pessoa via em/ph (e agora external_id/fbp/fbc)
 * — event_id só serve para deduplicação, não para matching de identidade.
 */
async function sendLeadQualificadoCAPI({
  email, phone, firstName, lastName,
  city, state, country, zip, externalId, fbp, fbc,
  clientIP, userAgent, testEventCode, eventName,
}) {
  const userData = {
    em: email ? [await sha256(email)] : undefined,
    ph: phone ? [await sha256(phone)] : undefined,
    fn: firstName ? [await sha256(firstName)] : undefined,
    ln: lastName ? [await sha256(lastName)] : undefined,
    // NOVO (Ponto 2) — mesma normalização/hash usada em lead.js
    ct: city    ? [await sha256(city)]    : undefined,
    st: state   ? [await sha256(state)]   : undefined,
    country: country ? [await sha256(country)] : undefined,
    // CEP: remove tudo que não for dígito antes de hashear (Clint pode enviar com hífen/espaço)
    zp: zip ? [await sha256(zip.replace(/\D/g, ''))] : undefined,
    // external_id hasheado — segue o MESMO padrão já usado em lead.js
    // (nota: o blueprint de tracking registra external_id como "não hashear";
    // o código em produção de lead.js hasheia. Mantido consistente com o
    // código real — ver observação de risco na entrega desta mudança)
    external_id: externalId ? [await sha256(externalId)] : undefined,
    fbp: fbp || undefined,
    fbc: fbc || undefined,
    client_ip_address: clientIP || undefined,
    client_user_agent: userAgent || undefined,
  };

  // Remove campos undefined
  Object.keys(userData).forEach((k) => userData[k] === undefined && delete userData[k]);

  const payload = {
    data: [
      {
        event_name:       eventName,
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

  const {
    name = '',
    email = '',
    phone = '',
    stage = '',
    // NOVO (Ponto 2) — campos já mapeados na automação do Clint
    cep = '',
    estado = '',
    cidade = '',
    pais = '',
    external_id = '',
    fbp = '',
    fbc = '',
    test_event_code = '',
  } = body;

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
  const eventName = resolveEventName(stage);

  const metaResult = await sendLeadQualificadoCAPI({
    email,
    phone,
    firstName,
    lastName,
    city:       cidade,
    state:      estado,
    country:    pais,
    zip:        cep,
    externalId: external_id,
    fbp,
    fbc,
    clientIP,
    userAgent,
    testEventCode: test_event_code,
    eventName,
  });

  return new Response(
    JSON.stringify({
      ok:    true,
      stage,       // eco do estágio recebido — útil para conferir no log
      event: eventName, // qual evento foi de fato enviado à Meta
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
