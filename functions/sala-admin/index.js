// Rota: /sala-admin
// Pagina simples e protegida por senha pra trocar o link da sala toda
// semana e ver os ultimos cliques (teste visual de que o redirect e o
// registro estao funcionando).

function paginaHtml({ currentLink, clicks, error, saved }) {
  const linhas = clicks
    .map(
      (c) =>
        `<tr><td>${escapeHtml(c.phone)}</td><td>${escapeHtml(c.timestamp)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sala do webinar - Lotear</title>
<style>
  body{font-family:Calibri,Arial,sans-serif;background:#0D1B2A;color:#FFFFFF;max-width:640px;margin:40px auto;padding:0 20px}
  h1{font-family:'Trebuchet MS',Arial,sans-serif;color:#fff;font-size:22px}
  h2{font-family:'Trebuchet MS',Arial,sans-serif;color:#fff;font-size:16px;margin-top:32px}
  label{display:block;font-size:12px;color:#7ABFAA;margin-bottom:4px;margin-top:12px}
  input{font-size:14px;padding:10px;border-radius:6px;border:1px solid #1B5E8E;width:100%;box-sizing:border-box;background:#1B3A52;color:#fff}
  button{margin-top:16px;font-size:14px;padding:10px;border-radius:6px;border:none;width:100%;background:#4CAF83;color:#0A3320;font-weight:bold;cursor:pointer}
  table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
  td,th{border-bottom:1px solid #1B3A52;padding:6px;text-align:left;color:#DCEEF8}
  th{color:#5A7A8A;font-size:11px;text-transform:uppercase}
  .msg{padding:10px;border-radius:6px;margin-bottom:10px;font-size:13px}
  .ok{background:#0A3320;color:#7ABFAA}
  .err{background:#5E2A0A;color:#E8872A}
  code{background:#1B3A52;padding:2px 6px;border-radius:4px;color:#DCEEF8;word-break:break-all}
</style>
</head>
<body>
  <h1>Sala do webinar</h1>
  ${saved ? '<div class="msg ok">Link atualizado.</div>' : ""}
  ${error ? `<div class="msg err">${escapeHtml(error)}</div>` : ""}
  <p>Link atual: ${
    currentLink ? `<code>${escapeHtml(currentLink)}</code>` : "<em>ainda nao configurado</em>"
  }</p>
  <form method="POST">
    <label for="password">Senha</label>
    <input type="password" id="password" name="password" required>
    <label for="room_link">Novo link da sala (Meet) para esta semana</label>
    <input type="url" id="room_link" name="room_link" required placeholder="https://meet.google.com/xxx-xxxx-xxx">
    <button type="submit">Salvar link da semana</button>
  </form>
  <h2>Ultimos cliques registrados</h2>
  <table>
    <tr><th>Telefone</th><th>Quando</th></tr>
    ${linhas || '<tr><td colspan="2">Nenhum clique ainda</td></tr>'}
  </table>
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
  const raw = await env.SALA_KV.get("recent_clicks");
  const clicks = raw ? JSON.parse(raw) : [];
  return { currentLink, clicks };
}

export async function onRequestGet(context) {
  const { env } = context;
  const { currentLink, clicks } = await lerEstado(env);
  return new Response(paginaHtml({ currentLink, clicks }), {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const form = await request.formData();
  const password = form.get("password");
  const roomLink = form.get("room_link");

  const { currentLink, clicks } = await lerEstado(env);

  if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
    return new Response(
      paginaHtml({ currentLink, clicks, error: "Senha incorreta." }),
      { status: 401, headers: { "Content-Type": "text/html; charset=UTF-8" } }
    );
  }

  if (!roomLink || typeof roomLink !== "string" || !roomLink.startsWith("http")) {
    return new Response(
      paginaHtml({ currentLink, clicks, error: "Link invalido -- precisa comecar com http(s)." }),
      { status: 400, headers: { "Content-Type": "text/html; charset=UTF-8" } }
    );
  }

  await env.SALA_KV.put("current_room_link", roomLink);

  return new Response(
    paginaHtml({ currentLink: roomLink, clicks, saved: true }),
    { headers: { "Content-Type": "text/html; charset=UTF-8" } }
  );
}
