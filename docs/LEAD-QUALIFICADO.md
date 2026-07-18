# CAPI de Qualificação — lead-qualificado.js

**Criado em:** 18/07/2026
**Arquivo:** `functions/api/lead-qualificado.js`
**Status:** Ativo em produção · testado via curl + test_event_code · aguardando validação via fluxo real do Clint

---

## 1. Problema que resolve

A campanha do Webinar otimiza hoje pelo evento **Lead** (confirmado via MCP: `Optimized Event: leadgen`). A Meta sabe quem se cadastrou na LP, mas não sabe quem, depois disso, avançou no funil comercial dentro do Clint (Negócio, Agendamento, Proposta, Venda).

Sem esse sinal de volta, o algoritmo otimiza para volume de cadastro — não para qualidade de lead. A recomendação oficial da Meta para esta conta (`capi_crm_setup`, vista via Opportunity Score) estima **-24% no CPL de leads qualificados** ao conectar o CRM via API de Conversões.

**Importante — correção de entendimento registrada aqui:** enviar o evento à Meta, por si só, **não melhora o CPL automaticamente**. O CPL só melhora quando o conjunto de anúncios é reconfigurado para otimizar pelo evento novo (`LeadQualificado` ou outro do mapeamento abaixo) em vez de `Lead`. Isso normalmente exige volume mínimo (~50 eventos em 7 dias) antes de trocar a otimização do conjunto. Ver seção 6 — Próximos passos.

---

## 2. Arquitetura

```
Clint (Deal muda de estágio)
   │
   │  Automação "Enviar Webhook" configurada na UI do Clint
   │  Gatilho: mudança de estágio (Negócio / Agendamento / Proposta / Venda)
   ▼
POST https://guia.soulotear.com.br/api/lead-qualificado
   │  Body: { name, email, phone, stage }
   ▼
functions/api/lead-qualificado.js (Cloudflare Pages Function)
   │  1. Resolve event_name a partir do stage (ver mapeamento seção 3)
   │  2. Faz split de nome → firstName/lastName
   │  3. Hasheia PII em SHA-256 (em, ph, fn, ln)
   │  4. Monta payload CAPI (sem event_id reaproveitado da LP)
   ▼
POST https://graph.facebook.com/v19.0/{PIXEL_ID}/events
   │  Meta reconhece a mesma pessoa via em/ph hasheados
   ▼
Pixel "Lotear - Webinario" (ID 2152403845552453)
```

**Por que não reutiliza o `eventIdLead` da LP:** confirmado no código real de `lead.js` que o `event_id`/`external_id` gerado no cadastro **não é enviado ao Clint** — só existe no momento do POST à Meta CAPI original. Portanto não está disponível quando o Deal muda de estágio depois. Decisão tomada: gerar um `event_id` novo a cada evento de qualificação. A Meta identifica a mesma pessoa via `em`/`ph` hasheados — `event_id` só serve para deduplicação, não para matching de identidade, então essa escolha não compromete a associação com a jornada original.

---

## 3. Mapeamento estágio → evento Meta

| Estágio no Clint (`stage`) | `event_name` enviado à Meta | Observação |
|---|---|---|
| `Negócio` / `Negocio` | `LeadQualificado` | Aceita com e sem acento |
| `Agendamento` | `LeadAgendou` | |
| `Proposta` | `LeadProposta` | |
| `Venda` | `Purchase` | Evento padrão Meta. **Hoje sem `value`/`currency`** — Clint não envia valor do negócio no payload atual. Perda de sinal de ROAS até isso ser resolvido (ver seção 6). |
| Qualquer outro valor não mapeado | `LeadQualificado` (fallback) | Nunca falha por estágio desconhecido — sempre envia algo. |

**Por que estágios diferentes viram eventos diferentes:** testado e decidido em 18/07/2026 — a automação original do Clint disparava o mesmo webhook para os 4 estágios (Negócio, Agendamento, Proposta, Venda), o que geraria o mesmo `event_name` genérico 4 vezes por lead. Isso dilui o sinal: o algoritmo não consegue diferenciar "avançou um pouco" de "comprou de fato". Corrigido para eventos distintos por estágio.

---

## 4. Payload esperado do webhook Clint

Configurado na tela "Enviar Webhook" da automação, mapeamento de campos:

```json
{
  "name": "{{contact.name}}",
  "email": "{{contact.email}}",
  "phone": "{{contact.phone}}",
  "stage": "{{deal.stage}}"
}
```

**Nota:** o Clint não expõe um campo `deal_id`/`id` para envio via webhook (confirmado na tela de mapeamento em 18/07/2026) — não incluído no payload. Rastreabilidade de eventos individuais depende do `email` (suficiente, já que o Clint deduplica 1 negócio por e-mail).

---

## 5. Como testar

### 5.1 Teste direto via curl (bypassa o Clint, testa só a Function)

**PowerShell (Windows) — usar arquivo, não linha de comando direta:**

```powershell
'{"name":"Teste","email":"teste@teste.com","phone":"5521999999999","stage":"Agendamento"}' | Out-File -Encoding utf8 teste.json
curl.exe -X POST "https://guia.soulotear.com.br/api/lead-qualificado" -H "Content-Type: application/json" --data "@teste.json"
```

**Por que via arquivo:** o `curl` nativo do PowerShell é um alias para `Invoke-WebRequest`, que não aceita a sintaxe padrão de headers/data. `curl.exe` (força o curl real) resolve parte do problema, mas o escape de aspas duplas dentro de JSON inline ainda quebra no PowerShell. Salvar em arquivo e usar `--data "@arquivo.json"` evita o problema por completo.

**Resposta esperada:**
```json
{"ok":true,"stage":"Agendamento","event":"LeadAgendou","meta":{"events_received":1,"messages":[],"fbtrace_id":"..."}}
```

`events_received: 1` e ausência de erro em `messages` confirma que a Meta recebeu e processou — isso já é validação suficiente, independente do que a UI mostrar.

### 5.2 Teste com test_event_code (aparece na aba "Eventos de teste" do Events Manager)

Adicionar `"test_event_code":"TESTXXXXX"` ao JSON, usando o código mostrado em Events Manager → Pixel "Lotear - Webinario" → Eventos de teste → canal "Site".

**Problema conhecido (18/07/2026):** a aba "Eventos de teste" do Events Manager mostrou instabilidade — resetou sozinha para o estado inicial ("Selecione o canal") múltiplas vezes durante testes, mesmo com eventos confirmados como recebidos (`fbtrace_id` presente). **Não considerar essa tela como única fonte de verdade.** Validação mais confiável: aba "Visão geral" do Pixel, que mostra contagem de eventos recebidos nas últimas 24h (delay de ~15-20 min, mas mais estável).

### 5.3 Teste end-to-end real

Mover um Deal real (ou de teste) no Clint para o estágio configurado → conferir no log de automações do Clint que o webhook saiu com status 200 → conferir na Visão Geral do Pixel (delay de 15-20 min) que o evento correspondente apareceu.

---

## 6. Próximos passos — pendências conhecidas

1. **Configurar otimização do conjunto de anúncios para `LeadQualificado`** (ou o evento relevante) — sem isso, o CPL não melhora, mesmo com o evento sendo enviado corretamente. Aguardar volume mínimo (~50 eventos/7 dias) antes de trocar o conjunto principal. Recomendado: criar conjunto de teste separado primeiro, comparar CPL/CPN, só então migrar o principal.
2. **Adicionar valor do negócio no payload do Clint** para o evento `Purchase` (estágio Venda) incluir `value`/`currency` no `custom_data` — hoje enviado sem valor, perdendo sinal de ROAS. Depende de o Clint expor esse campo na tela de mapeamento do webhook.
3. **Confirmar comportamento da aba "Eventos de teste"** do Events Manager — se o reset for um bug conhecido da Meta ou específico desta conta, vale abrir chamado de suporte se for atrapalhar validações futuras.

---

## 7. Garantias de não regressão

Este arquivo é **novo e isolado** — não modifica `lead.js`, `check-whatsapp.js`, `pixel.js` nem `index.html`. Nenhuma rota existente foi alterada. O `test_event_code` no payload é opcional e nunca é enviado pelo Clint em produção (só usado manualmente em testes via curl) — não há risco de eventos reais aparecerem marcados como teste.

---

## 8. SHAs de referência (histórico de commits deste arquivo)

| Data | SHA | Mudança |
|---|---|---|
| 18/07/2026 | `64f57931ba27bcc42dd1990751f8ac6f9b67132a` | Criação inicial — evento único `LeadQualificado` |
| 18/07/2026 | `24ca3d7c67ae48887d2b659ffefd6591eb758ac5` | Suporte a `test_event_code` opcional |
| 18/07/2026 | `27b713fb542fe7ad6b2834cb8a1e34e33ce0a09b` | Mapeamento de `event_name` por estágio (atual) |
