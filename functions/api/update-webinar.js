/**
 * Cloudflare Pages Function
 * Rota: /api/update-webinar
 * GET  -> retorna data atual do webinario
 * POST -> atualiza data (body: { date: 'DD/MM/YYYY', time: 'HH:MM' })
 * Env: GITHUB_TOKEN
 */

const REPO = 'lotear-repositorio/lotear-lp-isca-webnario';
const FILE = 'index.html';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

async function getFileFromGitHub(token) {
  const api = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
  const resp = await fetch(api, {
    headers: { Authorization: `token ${token}`, 'User-Agent': 'cloudflare-pages-function' },
  });
  if (!resp.ok) throw new Error('Falha ao buscar arquivo do GitHub');
  return resp.json();
}

export async function onRequestGet(context) {
  const token = context.env.GITHUB_TOKEN;
  if (!token) return new Response(JSON.stringify({ error: 'GITHUB_TOKEN nao configurado' }), { status: 500, headers: CORS });

  try {
    const fileData = await getFileFromGitHub(token);
    const content = atob(fileData.content.replace(/\n/g, ''));
    const m = content.match(/webinarDate:\{date:'([^']+)',time:'([^']+)'\}/);
    if (!m) return new Response(JSON.stringify({ error: 'webinarDate nao encontrado' }), { status: 422, headers: CORS });
    return new Response(JSON.stringify({ ok: true, date: m[1], time: m[2] }), { status: 200, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 502, headers: CORS });
  }
}

export async function onRequestPost(context) {
  const token = context.env.GITHUB_TOKEN;
  if (!token) return new Response(JSON.stringify({ error: 'GITHUB_TOKEN nao configurado' }), { status: 500, headers: CORS });

  let body;
  try { body = await context.request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Payload invalido' }), { status: 400, headers: CORS });
  }

  const { date, time } = body;
  if (!date || !time) return new Response(JSON.stringify({ error: 'date e time sao obrigatorios' }), { status: 400, headers: CORS });

  try {
    const fileData = await getFileFromGitHub(token);
    const sha = fileData.sha;
    const content = atob(fileData.content.replace(/\n/g, ''));

    const updated = content.replace(
      /webinarDate:\{date:'[^']+',time:'[^']+'\}/,
      `webinarDate:{date:'${date}',time:'${time}'}`
    );

    if (updated === content) return new Response(JSON.stringify({ error: 'webinarDate nao encontrado no arquivo' }), { status: 422, headers: CORS });

    const encoded = btoa(unescape(encodeURIComponent(updated)));
    const putResp = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE}`, {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'cloudflare-pages-function' },
      body: JSON.stringify({ message: `admin: atualiza webinario para ${date} ${time}`, content: encoded, sha }),
    });

    if (!putResp.ok) { const err = await putResp.json(); throw new Error(err.message || 'Falha no commit'); }
    const result = await putResp.json();
    return new Response(JSON.stringify({ ok: true, sha: result.commit.sha.slice(0, 7), date, time }), { status: 200, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 502, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}
