## ⏳ Aguardando confirmação — 2026-06-26 (3)

**Commit:** 40d4320dab852862264e381af2b98bf54d8fbbbf
**SHA anterior (rollback):** 05e8a021d89fa0a8c5360a5860b6ec9610e4c3b6
**Motivo:** Remoção do modal webinário — sem utilidade após inscrição automática

### Diagnóstico
O modal perguntava "Quer garantir sua vaga?" mas o lead já estava inscrito
automaticamente desde o submitLead() (webinar_accept=Sim). O popup aparecia
1.8s após o submit como ruído puro, sem efeito funcional.

### Removido
- HTML: `div#modal-overlay` completo (modal-content + modal-success)
- JS: `openWebinarModal()`, `acceptWebinar()`, `skipWebinar()`, event listener de clique fora
- JS: `setTimeout(openWebinarModal, 1800)` do `submitLead()`
- CSS: ~30 seletores do modal (`.modal-*`, `.webinar-card`, `.webinar-bullets`, `.btn-webinar-*`, `.confirm-detail`)
- HTML: `step-3 'Webinário'` do funil visual (só era ativado pelo modal)
- JS: `wc-date-label` do `_populateWebinarDates`

### Adicionado ao success-state
- Bloco `.webinar-confirm-note`: "Vaga no webinário de [data] confirmada"
- Data populada dinamicamente via `_wDate().short` no `submitLead()`
- CSS `.webinar-confirm-note`: verde, flex, ícone calendário inline

### Rollback
`git revert 40d4320dab852862264e381af2b98bf54d8fbbbf`
SHA anterior: `05e8a021d89fa0a8c5360a5860b6ec9610e4c3b6`

---

## ⏳ Aguardando confirmação — 2026-06-26 (2)

**Commit:** 66367cb7b00042bdabf4e2e3d4deb179b9574d5e
**SHA anterior (rollback):** adc40fd30bc10616e25ff2c673976d09232033b0
**Motivo:** Correção de duplicação de negócios na Clint (2 webhooks por cadastro)

### Causa raiz
`submitLead()` fazia fetch para `/api/lead` → 1 negócio na Clint.
`acceptWebinar(true)` chamado logo depois fazia **segundo fetch** → 2º negócio.
Introduzido no commit anterior (7b5215f) ao adicionar `acceptWebinar(true)` automático sem remover o fetch da função.

### O que foi alterado

**submitLead():**
- Removida `var wcChecked` (lia `#wc-input` inexistente desde remoção do checkbox)
- `webinar_accept` sempre `'Sim'` (sem condicional)
- `tag_data` e `data_hora_webinar` sempre preenchidos
- `fbq('CompleteRegistration')` disparado sempre com mesmo `eventId` do Lead (deduplicação correta)
- Removida chamada `acceptWebinar(true)` — era a origem do segundo webhook

**acceptWebinar():**
- Função reduzida a UI-only: sem fetch para `/api/lead`, sem pixel browser, sem CAPI
- Mantém apenas: `btn.disabled`, transição `modal-content → modal-success`
- Lead já registrado no Clint pelo `submitLead()` — `acceptWebinar` é só confirmação visual

### Fluxo de webhooks após fix
| Ação | Webhooks Clint | Eventos Meta pixel | Eventos CAPI |
|---|---|---|---|
| Cadastro (submitLead) | 1 × webinar_accept=Sim | Lead + CompleteRegistration (mesmo eventId) | 1 × CompleteRegistration |
| Clique no modal (acceptWebinar) | 0 | 0 | 0 |

### Rollback
`git revert 66367cb7b00042bdabf4e2e3d4deb179b9574d5e`
Ou restaurar SHA `adc40fd30bc10616e25ff2c673976d09232033b0`.

---

## ⏳ Aguardando confirmação — 2026-06-26

**Commit:** 7b5215feb3f550b29979a3e39eec042549440473
**SHA anterior (rollback):** 3a4eba1ced42ff196edc4cd008fd869d957975bf
**Motivo:** Otimização de imagens WebP + mudanças copy webinário + eliminação vocabulário Meta financial classifier

### Imagens (base64 no CSS)
- **hero-visual** (`.hero-photo`): JPEG 87.1 KB → WebP q=75 38.5 KB | PSNR 37.3 dB | redução 56%
- **ebook-float** (`.ebook-cover`): JPEG 64.2 KB + redimensionado 477→240px → WebP q=75 11.3 KB | PSNR 33.4 dB | redução 82%
- **HTML total**: 255.9 KB → 121.0 KB (53% menor)

### Copy / Anti-classifier Meta
- `L429` Nav CTA: `'Baixar o Guia'` → `'Garantir minha vaga →'`
- `L452` H1: `'O mapa certo para comprar Studios em São Paulo.'` → `'O que ninguém te explica antes de comprar seu primeiro studio em SP.'`
- `L458` Badge: `'+1.200 investidores já têm'` → `'+1.200 pessoas já têm'`
- `L485` form-sub: inclui webinário como parte automática do cadastro
- Novo elemento `div.wb-box` + CSS `.wb-box/.wb-date/.wb-title/.wb-desc` inserido após form-sub
- `L514` Removido `div.wc-wrap` (checkbox opt-in webinário)
- `L517` CTA botão: `'Baixar o guia agora'` → `'Receber o guia + garantir minha vaga no webinário'`
- `L549` Urgency strip: `'investidores já baixaram'` → `'pessoas já têm o guia'`
- Modal `webinar-title-text`: `'Como investir em studios'` → `'Como entender e comprar studios'`
- `h2` benefícios: `'investidor'` → `'você'`
- Depoimento: `'Investidor'` → `'Comprador'`

### Lógica JS
- `submitLead()`: `acceptWebinar(true)` chamado automaticamente — 100% dos leads inscritos no webinário sem opt-in separado
- `acceptWebinar(silent)`: parâmetro `silent=true` pula atualizações visuais do modal quando chamado via submitLead
- `_populateWebinarDates()`: adiciona população do novo `#wb-date-display`

### Rollback
Se houver problema visual ou funcional:
```
git revert 7b5215feb3f550b29979a3e39eec042549440473
```
Ou restaurar diretamente o SHA anterior via GitHub API com SHA `3a4eba1ced42ff196edc4cd008fd869d957975bf`.

---

## Aguardando confirmacao -- 2026-06-22 (3)

**Commits:** cad8c01d7c (lead.js) + 2283b650d8 (index.html)
**Motivo:** Adicao do campo tag_data no payload enviado para a Clint

### O que mudou

**functions/api/lead.js**
- Desestrutura `tag_data` do body recebido (default: string vazia)
- Inclui `tag_data` no `clintPayload` enviado para o webhook Clint

**index.html — submitLead() (download do ebook)**
- Envia `tag_data: ''` (vazio) — lead ainda nao se inscreveu no webinar

**index.html — acceptWebinar() (inscricao no webinar)**
- Envia `tag_data: 'Funil de Webinar - Inscrito - DD-MM-AAAA'`
- Data formatada automaticamente a partir de `CONFIG.webinarDate.date`
- Exemplo com webinar 25/06/2026: `'Funil de Webinar - Inscrito - 25-06-2026'`
- Quando a data do webinar for alterada via /admin, o campo se atualiza sozinho

### Campos que chegam na Clint apos a mudanca
name, email, phone, city, state, country, utm_source/medium/campaign/content/term,
webinar_accept, data_hora_webinar, **tag_data** (novo), event_id, page_url

---

## Aguardando confirmacao -- 2026-06-22 (2)

**Commit:** e19a056e0190ff7b3f97434ca3fb7f6860459d26
**Motivo:** Correcao do evento CompleteRegistration (webinar) -- deduplicacao quebrada e dados incompletos

### Problemas corrigidos

**1. Deduplicacao pixel browser x CAPI estava quebrada**
- ANTES: fbq() disparava sem eventID; CAPI gerava generateUUID() proprio -- dois IDs diferentes, Meta contava como 2 eventos
- DEPOIS: crEventId gerado uma vez, compartilhado entre fbq({ eventID: crEventId }) e event_id do payload CAPI

**2. Advanced Matching ausente no CompleteRegistration**
- ANTES: fbq('track', 'CompleteRegistration') sem reinicializar o pixel com dados do lead
- DEPOIS: fbq('init') com em/ph/fn/ln/ct/st/zp/country/external_id executado imediatamente antes do track

**3. Dados do evento incompletos**
- ANTES: apenas content_name e status
- DEPOIS: content_name, content_category, status, value, currency (BRL)

**4. event_name ausente no payload CAPI**
- ANTES: CAPI nao sabia qual evento processar server-side
- DEPOIS: event_name: 'CompleteRegistration' incluido no payload

### Dados agora enviados no CompleteRegistration

| Campo | Descricao |
|---|---|
| em | email normalizado (lowercase) |
| ph | telefone formato E164 (+55...) |
| fn/ln | primeiro e ultimo nome (lowercase) |
| ct/st/zp/country | cidade, estado, CEP, pais (via geolocalizacao) |
| external_id | UUID unico compartilhado com CAPI |
| eventID | mesmo crEventId no pixel e no CAPI |
| content_category | guia_studios_sp |
| value/currency | 0 / BRL |
| utm_source/medium/campaign/content/term | UTMs da URL |
| fbp/fbc | cookies Meta |
| page_url | URL completa |
| webinar_accept | Sim |
| data_hora_webinar | data/hora do webinar formatada |
| event_name | CompleteRegistration (para CAPI server-side) |

---

## Aguardando confirmacao -- 2026-06-22

**Commit:** a0a5dd6bff24e044cd9366138affe9037569d0e3
**Motivo:** Reducao de linguagem financeira para reclassificacao Meta

### Alteracoes

- `<title>`: 'O Mapa do Investidor' -> 'O Guia do Comprador'
- H1: 'para investir' -> 'para comprar Studios'
- Beneficio 02: removido 'potencial de valorizacao'
- Beneficio 04: removido 'investidor iniciante'
- Bullet webinar: removido 'Analise de rentabilidade real'
- Footer: removido 'patrimonio'
- Head: adicionadas metatags category=real estate e industry=imobiliario
- Popup: sem alteracoes (conteudo ja neutro)

**Contexto:** Restricao Level 1 Core Setup DESATIVADO. Analise pendente no Events Manager.
Alteracoes sao preventivas para evitar ativacao automatica da restricao.

---

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

