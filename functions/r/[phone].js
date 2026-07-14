// Rota: /r/:phone
// Exemplo de link a colocar no campo "Link" de cada lead no Clint:
//   https://guia.soulotear.com.br/r/{{telefone}}
//
// O que faz:
// 1. Le o link da sala atual (gravado via /admin) no KV.
// 2. Redireciona a pessoa pra sala IMEDIATAMENTE (sem atraso perceptivel).
// 3. Em paralelo (nao trava o redirect), grava o clique no KV e dispara
//    o webhook pro Clint marcando a tag de comparecimento.

export async function onRequestGet(context) {
  const { params, env } = context;
  const rawPhone = params.phone || "";
  const phone = rawPhone.replace(/\D/g, "");

  if (!phone) {
    return new Response("Link invalido.", { status: 400 });
  }

  const roomLink = await env.SALA_KV.get("current_room_link");

  if (!roomLink) {
    return new Response(
      "A sala ainda nao foi configurada para esta semana. Avise o suporte da Lotear.",
      { status: 503 }
    );
  }

  const timestamp = new Date().toISOString();

  // Nao usar "await" aqui na frente do redirect -- context.waitUntil deixa
  // isso rodar depois da resposta ja ter saido, sem atrasar o clique.
  context.waitUntil(registrarCliqueEDispararWebhook(env, phone, timestamp));

  return Response.redirect(roomLink, 302);
}

async function registrarCliqueEDispararWebhook(env, phone, timestamp) {
  // 1. Grava o clique numa lista curta pra aparecer no /admin
  try {
    const raw = await env.SALA_KV.get("recent_clicks");
    const clicks = raw ? JSON.parse(raw) : [];
    clicks.unshift({ phone, timestamp });
    await env.SALA_KV.put("recent_clicks", JSON.stringify(clicks.slice(0, 50)));
  } catch (err) {
    // nao deixa erro de log derrubar o webhook abaixo
  }

  // 2. Dispara o webhook direto pro Clint marcando a tag de comparecimento.
  //    AJUSTAR: env.CLINT_WEBHOOK_URL e o formato do body abaixo precisam
  //    bater com o que o Clint espera de verdade -- isto e um placeholder
  //    ate confirmar o contrato exato do webhook do Clint.
  if (env.CLINT_WEBHOOK_URL) {
    try {
      await fetch(env.CLINT_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(env.CLINT_WEBHOOK_TOKEN
            ? { Authorization: `Bearer ${env.CLINT_WEBHOOK_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          telefone: phone,
          tag: "compareceu_webinar",
          evento: "clicou_link_sala",
          timestamp,
        }),
      });
    } catch (err) {
      // silencioso -- o clique ja foi registrado no KV mesmo se o Clint falhar
    }
  }
}
