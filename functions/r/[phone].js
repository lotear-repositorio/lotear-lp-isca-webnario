// Rota: /r/:phone
// Exemplo de link a colocar no campo "Link" de cada lead no Clint:
//   https://guia.soulotear.com.br/r/{{telefone}}
//
// O que faz:
// 1. Le o link da sala atual (gravado via /sala-admin) no KV.
// 2. Redireciona a pessoa pra sala IMEDIATAMENTE (sem atraso perceptivel).
// 3. Em paralelo (nao trava o redirect), registra o clique no KV e chama
//    o webhook do Clint marcando a tag "Funil de Webinar - Compareceu - DD-MM-YYYY",
//    usando a data do evento tambem configurada em /sala-admin.

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
  // 1. Grava o clique numa lista curta pra aparecer no /sala-admin
  try {
    const raw = await env.SALA_KV.get("recent_clicks");
    const clicks = raw ? JSON.parse(raw) : [];
    clicks.unshift({ phone, timestamp });
    await env.SALA_KV.put("recent_clicks", JSON.stringify(clicks.slice(0, 50)));
  } catch (err) {
    // nao deixa erro de log derrubar o webhook abaixo
  }

  // 2. Monta a tag no formato exigido pelo Clint:
  //    "Funil de Webinar - Compareceu - 12-07-2026"
  const eventDate = await env.SALA_KV.get("current_event_date");
  if (!eventDate) {
    // sem data configurada em /sala-admin, nao da pra montar a tag certa --
    // melhor nao mandar nada errado pro Clint do que mandar tag sem data.
    return;
  }
  const tag = `Funil de Webinar - Compareceu - ${eventDate}`;

  // 3. Dispara o webhook direto pro Clint.
  //    Campos exigidos pelo mapeamento do Clint: "Telefone" e "Tag" (exatos).
  if (env.CLINT_WEBHOOK_URL) {
    try {
      await fetch(env.CLINT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Telefone: phone,
          Tag: tag,
        }),
      });
    } catch (err) {
      // silencioso -- o clique ja foi registrado no KV mesmo se o Clint falhar
    }
  }
}
