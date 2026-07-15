// Rota: /sala-admin
// Pagina protegida por senha pra trocar, toda semana:
// - o link da sala (Meet) do webinar
// - a data do evento (usada pra montar a tag "Funil de Webinar - Compareceu - DD-MM-YYYY")
//
// So le e grava 2 valores no KV (link e data), uma vez por semana -- uso
// de escrita irrisorio, bem longe do limite gratuito de 1.000/dia.
//
// Rota escolhida como /sala-admin de proposito, pra nao colidir com o
// /admin que ja existe em producao (pagina de data do evento na LP).

function paginaHtml({ currentLink, currentDate, error, saved }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sala do webinar - Lotear</title>
<style>
  body{font-family:Calibri,Arial,sans-serif;background:#0D1B2A;color:#FFFFFF;max-width:640px;margin:40px auto;padding:0 20px}
  h1{font-family:'Trebuchet MS',Arial,sans-serif;color:#fff;font-size:22px}
  label{display:block;font-size:12px;color:#7ABFAA;margin-bottom:4px;margin-top:12px}
  input{font-size:14px;padding:10px;border-radius:6px;border:1px solid #1B5E8E;width:100%;box-sizing:border-box;background:#1B3A52;color:#fff}
  button{margin-top:16px;font-size:14px;padding:10px;border-radius:6px;border:none;width:100%;background:#4CAF83;color:#0A3320;font-weight:bold;cursor:pointer}
  .msg{padding:10px;border-radius:6px;margin-bottom:10px;font-size:13px}
  .ok{background:#0A3320;color:#7ABFAA}
  .err{background:#5E2A0A;color:#E8872A}
  code{background:#1B3A52;padding:2px 6px;border-radius:4px;color:#DCEEF8;word-break:break-all}
  .hint{font-size:11px;color:#5A7A8A;margin-top:4px}
</style>
</head>
<body>
  <h1>Sala do webinar</h1>
  ${saved ? '<div class="msg ok">Atualizado.</div>' : ""}
  ${error ? `<div class="msg err">${escapeHtml(error)}</div>` : ""}
  <p>Link atual: ${
    currentLink ? `<code>${escapeHtml(currentLink)}</code>` : "<em>ainda nao configurado</em>"
  }</p>
  <p>Data do evento atual: ${
    currentDate ? `<code>${escapeHtml(currentDate)}</code>` : "<em>ainda nao configurada</em>"
  }</p>
  <form method="POST">
    <label for="password">Senha</label>
    <input type="password" id="password" name="password" required>

    <label for="room_link">Novo link da sala (Meet) para esta semana</label>
    <input type="url" id="room_link" name="room_link" required placeholder="https://meet.google.com/xxx-xxxx-xxx">

    <label for="event_date">Data do evento (formato DD-MM-AAAA)</label>
    <input type="text" id="event_date" name="event_date" required placeholder="12-07-2026" pattern="\\d{2}-\\d{2}-\\d{4}">
    <div class="hint">Usada pra montar a tag no Clint: "Funil de Webinar - Compareceu - 12-07-2026"</div>

    <button type="submit">Salvar</button>
  </form>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function lerEstado(env) {
  const currentLink = await env.SALA_KV.get("current_room_link");
  const currentDate = await env.SALA_KV.get("current_event_date");
  return { currentLink, currentDate };
}

export async function onRequestGet(context) {
  const { env } = context;
  const estado = await lerEstado(env);
  return new Response(paginaHtml(estado), {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const form = await request.formData();
  const password = form.get("password");
  const roomLink = form.get("room_link");
  const eventDate = form.get("event_date");

  const estado = await lerEstado(env);

  if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
    return new Response(
      paginaHtml({ ...estado, error: "Senha incorreta." }),
      { status: 401, headers: { "Content-Type": "text/html; charset=UTF-8" } }
    );
  }

  if (!roomLink || typeof roomLink !== "string" || !roomLink.startsWith("http")) {
    return new Response(
      paginaHtml({ ...estado, error: "Link invalido -- precisa comecar com http(s)." }),
      { status: 400, headers: { "Content-Type": "text/html; charset=UTF-8" } }
    );
  }

  if (!eventDate || !/^\d{2}-\d{2}-\d{4}$/.test(eventDate)) {
    return new Response(
      paginaHtml({ ...estado, error: "Data invalida -- use o formato DD-MM-AAAA, ex: 12-07-2026." }),
      { status: 400, headers: { "Content-Type": "text/html; charset=UTF-8" } }
    );
  }

  await env.SALA_KV.put("current_room_link", roomLink);
  await env.SALA_KV.put("current_event_date", eventDate);

  return new Response(
    paginaHtml({ currentLink: roomLink, currentDate: eventDate, saved: true }),
    { headers: { "Content-Type": "text/html; charset=UTF-8" } }
  );
}
