/**
 * Cloudflare Pages Function
 * Rota: /api/update-webinar
 * Metodo: POST
 * Body: { date: 'DD/MM/YYYY', time: 'HH:MM' }
 * Env: GITHUB_TOKEN
 */

const REPO = 'lotear-repositorio/lotear-lp-isca-webnario';
const FILE = 'index.html';

export async function onRequestPost(context) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  const token = context.env.GITHUB_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: 'GITHUB_TOKEN nao configurado' }), { status: 500, headers: cors });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Payload invalido' }), { status: 400, headers: cors });
  }

  const { date, time } = body;
  if (!date || !time) {
    return new Response(JSON.stringify({ error: 'date e time sao obrigatorios' }), { status: 400, headers: cors });
  }

  const api = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
  const headers = {
    Authorization: `token ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'cloudflare-pages-function',
  };

  const getResp = await fetch(api, { headers });
  if (!getResp.ok) {
    return new Response(JSON.stringify({ error: 'Falha ao buscar arquivo do GitHub' }), { status: 502, headers: cors });
  }
  const fileData = await getResp.json();
  const sha = fileData.sha;
  const content = atob(fileData.content.replace(/
/g, ''));

  const updated = content.replace(
    /webinarDate:\{date:'[^']+',time:'[^']+'\}/,
    `webinarDate:{date:'${date}',time:'${time}'}`
  );

  if (updated === content) {
    return new Response(JSON.stringify({ error: 'webinarDate nao encontrado no arquivo' }), { status: 422, headers: cors });
  }

  const encoded = btoa(unescape(encodeURIComponent(updated)));
  const putResp = await fetch(api, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `admin: atualiza webinario para ${date} ${time}`,
      content: encoded,
      sha,
    }),
  });

  if (!putResp.ok) {
    const err = await putResp.json();
    return new Response(JSON.stringify({ error: err.message || 'Falha no commit' }), { status: 502, headers: cors });
  }

  const result = await putResp.json();
  return new Response(JSON.stringify({
    ok: true,
    sha: result.commit.sha.slice(0, 7),
    date,
    time,
  }), { status: 200, headers: cors });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
