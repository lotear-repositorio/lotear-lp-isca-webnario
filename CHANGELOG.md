# CHANGELOG — guia.soulotear.com.br

**Repositório:** `lotear-repositorio/lotear-lp-isca-webnario`  
**Arquivo principal:** `index.html`  
**Deploy:** Cloudflare Pages — automático via commit no branch `main`  
**Token GitHub:** `ghp_[TOKEN_NO_PROJECT_KNOWLEDGE]`

---

## ⚠️ PROTOCOLO OBRIGATÓRIO — LEIA ANTES DE QUALQUER AÇÃO

Este arquivo é a memória permanente da landing page. As regras abaixo **não são opcionais**.

### REGRA 1 — Ler antes de agir
Toda sessão que envolva qualquer alteração em `index.html` ou `functions/api/lead.js` **começa** com:
```
GET https://api.github.com/repos/lotear-repositorio/lotear-lp-isca-webnario/contents/CHANGELOG.md
```
Ler o conteúdo antes de propor qualquer mudança. Sem exceção.

### REGRA 2 — Atualizar após qualquer commit
Imediatamente após um commit bem-sucedido ao repositório, atualizar este arquivo com:
- Data e hora (horário de Brasília, formato `AAAA-MM-DD HH:MM BRT`)
- Problema reportado (palavras do usuário, não interpretação)
- Diagnóstico real (causa raiz no código, não sintoma)
- Tentativas anteriores que não resolveram (se houver)
- O que foi alterado: arquivo, linha exata, antes/depois
- SHA do commit
- Status: **⏳ Aguardando confirmação de Carlos**

### REGRA 3 — Nunca marcar como resolvido sem confirmação explícita
O status só muda para `✅ Confirmado resolvido` quando Carlos disser explicitamente que o problema sumiu (ex: "resolvido", "funcionou", "ok"). Frases como "vamos ver", "parece ok" ou ausência de resposta **não** contam. Se Carlos não confirmar na mesma sessão, o status permanece `⏳ Aguardando confirmação`.

### REGRA 4 — Problema reaberto
Se um problema marcado como `✅ Confirmado resolvido` voltar a ocorrer:
1. Alterar a entrada original para `❌ Reaberto em [data]`
2. Criar nova entrada no topo referenciando a anterior
3. Não apagar o histórico de tentativas anteriores — ele é o diagnóstico mais valioso

### REGRA 5 — Entradas no topo
Novas entradas sempre acima das anteriores (mais recente primeiro).

---

## Histórico de alterações
<!-- deploy trigger 2026-06-21 -->

---

### 2026-06-21 — webinarDate dinâmico + data_hora_webinar no webhook + remoção fetch WA

**Status:** ⏳ Aguardando confirmação de Carlos

**Problemas reportados / funcionalidades implementadas:**
1. Data do webinário estava hardcoded em 7 pontos do index.html — impossível atualizar sem commit manual em cada ponto
2. Campo data_hora_webinar não estava sendo enviado para Clint via webhook
3. Clique no botão WhatsApp flutuante disparava fetch para /api/lead com payload vazio, criando ruído na Clint sem valor

**Diagnóstico / decisão:**
- Criar CONFIG.webinarDate como única fonte de verdade; LP, popup e payload leem dessa variável
- Formato de exibição ("25 de junho de 2026 · 20h") mantido; formato Clint ("25/06/2026 20:00") gerado pelo helper _wDate()
- fetch do trackWAClick removido; evento Meta Pixel (fbq Contact) mantido — clique WA é engajamento, não captação

**O que foi alterado (index.html — commit 64ab306):**
- L713: CONFIG recebe webinarDate:{date:'25/06/2026',time:'20:00'}
- Antes do CONFIG: inseridos helpers MESES_PT[], _wDate(), _populateWebinarDates()
- DOMContentLoaded: adicionada chamada _populateWebinarDates()
- L675: webinar-date estático → <div id=webinar-date-display> populado por JS
- L551: urgência hero → <strong id=urg-date-short> populado por JS
- L701: parágrafo confirmação → <span id=confirm-date-short> populado por JS
- L702: confirm-detail → <div id=confirm-detail> populado por JS
- payload submitLead: adicionado data_hora_webinar: _wDate().clint
- payload acceptWebinar: adicionado data_hora_webinar: _wDate().clint
- trackWAClick: removido payload e fetch; mantido apenas fbq('Contact')

**admin.html criado (commit 1f90346):**
- Disponível em guia.soulotear.com.br/admin
- ATENÇÃO: token GitHub substituído por placeholder 'COLOQUE_SEU_TOKEN_GITHUB_AQUI'
- Carlos deve abrir o arquivo local (baixado nesta sessão) que contém o token real, ou editar o admin.html no GitHub inserindo o token antes de usar

**SHAs dos commits:**
- index.html: 64ab3061617cdefb74670fcd7f768d966a76920e
- admin.html: 1f90346d34b2630921699db1f5fbae591818ebb5

---


### 2026-06-20 — Badge sem slideUp no mobile + scroll infinito após conteúdo

**Problema reportado por Carlos:**
> "Nada resolvido. o badge nao esta com Slideup no mobile e ainda esta com scroll continuando depois do conteudo da pagina ter acabado."  
> (confirmado resolvido em sessão de 20/06/2026)

**Contexto:** Dois bugs independentes na mesma sessão de trabalho. Múltiplas tentativas anteriores sem sucesso.

---

#### BUG 1 — Badge `.ebook-float` sem animação slideUp no mobile

**Status:** ✅ Confirmado resolvido por Carlos — 20/06/2026

**Problema reportado originalmente:**
Badge com foto da capa do ebook e texto dentro da seção hero piscava ao carregar no mobile e depois parou de animar.

**Causa raiz:**
No desktop, `.ebook-float` tem `animation: slideUp .7s .4s both` (L87 do CSS). O `fill-mode: both` mantém o elemento em `opacity: 0` durante os 400ms de delay. Quando o breakpoint `@media(max-width:960px)` redeclarava `animation`, o browser **resetava o timer** — causando um flash de `opacity:0` antes de resolver. Tentativas anteriores pararam a animação com `animation:none;opacity:1` para eliminar o piscar, sacrificando o efeito.

**Tentativas anteriores que não resolveram:**
1. Adição de `overflow-x:hidden` ao `html` (não relacionado ao badge)
2. `animation:none;opacity:1` no breakpoint 960px — eliminou o piscar mas também eliminou a animação

**Solução definitiva (commit `992bf9c`):**
```css
/* ADICIONADO — novo keyframe independente do desktop */
@keyframes slideBadge {
  from { opacity: 0; transform: translateY(10px) }
  to   { opacity: 1; transform: translateY(0) }
}

/* ANTES (L298 no breakpoint 960px): */
.ebook-float { ...animation:none;opacity:1 }

/* DEPOIS (L299 no breakpoint 960px): */
.ebook-float { ...animation:slideBadge .5s .2s both }
```

**Por que funciona:** `slideBadge` é um keyframe completamente separado do `slideUp` do desktop. O browser não tem nada para "resetar" — aplica uma animação nova, sem conflito com o timer de 400ms do desktop. O delay de 200ms garante que o badge aparece depois da foto carregar, sem piscar.

**SHA do commit:** `992bf9c6467caa261d88aa2b562f0137a0c9bc7f`  
**Arquivo alterado:** `index.html`  
**Linhas:** L279 (keyframe novo inserido), L299 (regra do breakpoint 960px)

---

#### BUG 2 — Scroll infinito após o conteúdo da página no mobile

**Status:** ✅ Confirmado resolvido por Carlos — 20/06/2026

**Problema reportado originalmente:**
Em dispositivos mobile (iOS Safari e Android Chrome), a página continuava scrollando além do footer — "scroll infinito" após o conteúdo acabar.

**Causa raiz:**
iOS Safari e Android Chrome implementam **momentum/bounce scroll**: quando o usuário chega ao fim da página, o browser continua a inercia do movimento e "quica" de volta, dando a impressão de scroll infinito. O comportamento é controlado pela propriedade `overscroll-behavior-y`.

O `overscroll-behavior-y: none` havia sido adicionado apenas ao `body` em commit anterior. **Insuficiente**: iOS Safari aplica o bounce scroll no elemento `html`, não no `body`. Ambos precisam ter a propriedade.

**Tentativas anteriores que não resolveram:**
1. `overflow-x:hidden` no `html` — não relacionado ao eixo Y
2. `overscroll-behavior-y:none` apenas no `body` (L44) — insuficiente para iOS Safari

**Solução definitiva (commit `992bf9c`):**
```css
/* ANTES (L26): */
html { scroll-behavior:smooth; overflow-x:hidden }

/* DEPOIS (L26): */
html { scroll-behavior:smooth; overflow-x:hidden; overscroll-behavior-y:none }
```

O `body` já tinha `overscroll-behavior-y:none` de commit anterior (L44). A adição ao `html` fecha o comportamento em todos os browsers mobile.

**SHA do commit:** `992bf9c6467caa261d88aa2b562f0137a0c9bc7f`  
**Arquivo alterado:** `index.html`  
**Linha:** L26

---

### 2026-06-19 — Commits intermediários (histórico da sessão)

**Status:** ✅ Absorvidos pela solução definitiva de 2026-06-20

**SHA `11fbf090`** — Tentativa de fix do scroll (overscroll no html). Não confirmado resolvido.  
**SHA `0656efa2`** — Tentativa anterior do badge (animation:none;opacity:1). Badge parou de piscar mas perdeu animação.  
**Commits anteriores desta série** — Diversas tentativas de diagnóstico e fix incremental, nenhuma confirmada por Carlos como solução.

---

## Referência rápida

| Elemento | Localização no código |
|---|---|
| Badge `.ebook-float` — desktop | `index.html` L87, `@keyframes slideUp` L279 |
| Badge `.ebook-float` — mobile 960px | `index.html` L299 (breakpoint `@media(max-width:960px)`) |
| Badge `.ebook-float` — mobile 480px | Herda do 960px — sem regra própria |
| `overscroll-behavior-y` | `html` L26, `body` L44 |
| Meta Pixel | L16 — ID `2152403845552453` — **não alterar** |
| Webhook Clint | Cloudflare Function `/api/lead` — fora do `index.html` |
| `.hero-veil-base` | L71 — **não alterar visual** |
| Data do webinário | `index.html` L674 — `25 de junho de 2026 · 20h` — **não alterar** |
| Badge textos | L455: `+1.200 investidores já têm` / L456: `Tudo que você precisa antes de decidir` — **não alterar** |

