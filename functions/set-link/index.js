// Rota: /set-link
// Recebe a chamada de webhook DE SAIDA do Clint (automacao do funil do
// webinar, disparada quando o lead entra no funil). Monta o link
// personalizado e devolve pro Clint via o webhook de "Registro de Link".
//
// Sem log de depuracao em KV aqui de proposito -- essa rota nao precisa
// gravar nada pra funcionar, so ler o telefone recebido e chamar o Clint.
// Isso mantem o uso de escrita do KV gratuito (1.000/dia) livre pra outras
// coisas, mesmo com centenas de leads passando ao mesmo tempo.

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

  const phoneRaw =
    body.Telefone || body.telefone || body.phone || body.Phone || body.numero || body.Numero || "";
  const phone = String(phoneRaw).replace(/\D/g, "");

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
    const resp = await fetch(env.CLINT_LINK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Telefone: phone, Link: link }),
    });
    if (!resp.ok) {
      const texto = await resp.text().catch(() => "");
      return new Response(
        JSON.stringify({ ok: false, telefone: phone, link, status: resp.status, resposta: texto.slice(0, 400) }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, telefone: phone, link, erro: String(err) }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify({ ok: true, telefone: phone, link }), {
    headers: { "Content-Type": "application/json" },
  });
}
