// Rota: /set-link
// Recebe a chamada de webhook DE SAIDA do Clint (configurada na automacao
// do funil do webinar, disparada quando o lead entra no funil).
// Monta o link personalizado e devolve pro Clint via um SEGUNDO webhook
// (de entrada, criado igual ao de "comparecimento", so que mapeando o
// campo "Link" em vez de "Tag").
//
// Isso e' isolado do resto do site -- nao mexe em nenhuma automacao ou
// funcao que ja existe em producao.

export async function onRequestPost(context) {
  const { env, request } = context;

  let body = {};
  try {
    body = await request.json();
  } catch (err) {
    try {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    } catch (err2) {
      body = {};
    }
  }

  // tenta achar o telefone em variacoes comuns de nome de campo, porque
  // ainda nao sabemos o formato exato que o Clint manda nesse webhook de saida
  const phoneRaw =
    body.Telefone || body.telefone || body.phone || body.Phone || body.numero || body.Numero || "";
  const phone = String(phoneRaw).replace(/\D/g, "");
  const timestamp = new Date().toISOString();

  // grava um log de depuracao -- serve pra confirmar no /sala-admin o que
  // o Clint realmente esta enviando, ate confirmarmos o formato certo
  context.waitUntil(logarChamada(env, body, phone, timestamp));

  if (!phone) {
    return new Response(
      JSON.stringify({ ok: false, error: "telefone nao encontrado no payload recebido" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const link = `https://guia.soulotear.com.br/r/${phone}`;

  if (!env.CLINT_LINK_WEBHOOK_URL) {
    return new Response(
      JSON.stringify({ ok: false, error: "CLINT_LINK_WEBHOOK_URL nao configurada" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    await fetch(env.CLINT_LINK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Telefone: phone, Link: link }),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "falha ao chamar o webhook de Link do Clint" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ ok: true, telefone: phone, link }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function logarChamada(env, body, phone, timestamp) {
  try {
    const raw = await env.SALA_KV.get("recent_setlink_calls");
    const calls = raw ? JSON.parse(raw) : [];
    calls.unshift({ phone, timestamp, body });
    await env.SALA_KV.put("recent_setlink_calls", JSON.stringify(calls.slice(0, 30)));
  } catch (err) {
    // silencioso
  }
}
