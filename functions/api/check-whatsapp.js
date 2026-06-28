/**
 * Cloudflare Pages Function
 * Rota: GET /api/check-whatsapp?phone={11digits}
 *
 * Verifica se um número tem WhatsApp via Z-API.
 * Credenciais ficam como variáveis de ambiente no Cloudflare Pages:
 *   ZAPI_INSTANCE_ID  → ID da instância Z-API
 *   ZAPI_TOKEN        → Token da instância Z-API
 *   ZAPI_CLIENT_TOKEN → Client-Token de segurança da conta Z-API
 *
 * Resposta:
 *   { valid: true }   → número tem WhatsApp
 *   { valid: false }  → número não tem WhatsApp
 *   { valid: null }   → falha na verificação (graceful — frontend libera submit)
 *
 * GRACEFUL DEGRADATION:
 *   Se a Z-API falhar por qualquer motivo, retorna { valid: null }.
 *   O frontend interpreta null como "liberar submit" — a campanha nunca para
 *   por dependência de API de terceiro.
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url    = new URL(request.url);
  const phone  = (url.searchParams.get('phone') || '').replace(/\D/g, '');

  // Validação básica — evita chamadas desnecessárias à Z-API
  if (phone.length < 11) {
    return Response.json({ valid: null, reason: 'short' });
  }

  // Formata com DDI 55 se não tiver
  const formatted = phone.startsWith('55') ? phone : '55' + phone;

  const instanceId  = env.ZAPI_INSTANCE_ID;
  const token       = env.ZAPI_TOKEN;
  const clientToken = env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token || !clientToken) {
    // Variáveis de ambiente não configuradas → graceful
    return Response.json({ valid: null, reason: 'config' });
  }

  try {
    const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/phone-exists/${formatted}`;

    const res = await fetch(zapiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': clientToken,
      },
      signal: AbortSignal.timeout(3000), // timeout 3s — não trava o lead
    });

    if (!res.ok) {
      return Response.json({ valid: null, reason: 'zapi_error', status: res.status });
    }

    const data   = await res.json();
    const exists = Array.isArray(data) ? data[0]?.exists : data?.exists;

    if (exists === true)  return Response.json({ valid: true  });
    if (exists === false) return Response.json({ valid: false });

    // Resposta inesperada → graceful
    return Response.json({ valid: null, reason: 'unexpected' });

  } catch (err) {
    // Timeout, rede, Z-API fora → graceful
    return Response.json({ valid: null, reason: 'exception', msg: err.message });
  }
}
