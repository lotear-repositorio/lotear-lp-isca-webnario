// Rota: /r/:phone
// Exemplo de link a colocar no campo "Link" de cada lead no Clint:
//   https://guia.soulotear.com.br/r/{{telefone}}
//
// O que faz:
// 1. Le o link da sala atual (gravado via /sala-admin) no KV -- leitura, nao grava nada.
// 2. Redireciona a pessoa pra sala IMEDIATAMENTE.
// 3. Em paralelo (nao trava o redirect), chama o webhook do Clint marcando
//    a tag "Funil de Webinar - Compareceu - DD-MM-YYYY".
//
// Sem log de depuracao em KV aqui de proposito -- rodando em escala (varios
// leads clicando ao mesmo tempo), cada gravacao consome a cota diaria de
// escrita do KV gratuito (1.000/dia). Como essa rota so PRECISA ler, ela
// fica praticamente sem limite de uso (leitura e' 100.000/dia).

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

  context.waitUntil(dispararWebhookDeComparecimento(env, phone));

  return Response.redirect(roomLink, 302);
}

async function dispararWebhookDeComparecimento(env, phone) {
  const eventDate = await env.SALA_KV.get("current_event_date");
  if (!eventDate || !env.CLINT_WEBHOOK_URL) {
    return;
  }
  const tag = `Funil de Webinar - Compareceu - ${eventDate}`;
  try {
    await fetch(env.CLINT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Telefone: phone, Tag: tag }),
    });
  } catch (err) {
    // silencioso -- o redirect ja aconteceu, isso e' so o efeito colateral
  }
}
