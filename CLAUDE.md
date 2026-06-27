# LOTEAR LP — Protocolo de desenvolvimento

Repositório: `lotear-repositorio/lotear-lp-isca-webnario`
Deploy: Cloudflare Pages → `guia.soulotear.com.br` (~30s após commit no main)

---

## REGRA ABSOLUTA — Auditoria obrigatória

**ANTES de qualquer commit no `index.html`: rodar `lotear_audit.py`.**
**DEPOIS de qualquer commit: confirmar visualmente na página ao vivo.**

```bash
# Antes do commit — arquivo local
python3 lotear_audit.py /tmp/index_novo.html

# Depois do commit — página ao vivo
curl -s https://guia.soulotear.com.br | python3 lotear_audit.py -
```

Se a auditoria retornar qualquer ❌ → **NÃO COMMITAR**.
Corrigir o problema e rodar novamente.

---

## Protocolo de commit

1. Ler SHA atual do arquivo antes de qualquer PUT
   ```
   GET /repos/lotear-repositorio/lotear-lp-isca-webnario/contents/index.html
   ```
2. Rodar `lotear_audit.py` no arquivo modificado — 28/28 ✅
3. Confirmar SHA ainda é o mesmo (ninguém commitou no meio tempo)
4. Commitar com mensagem descritiva + rollback SHA
5. Atualizar CHANGELOG com status `⏳ Aguardando confirmação`
6. Aguardar confirmação visual de Carlos
7. Fechar CHANGELOG com `✅ Confirmado resolvido`

**SHA só muda para ✅ com confirmação explícita de Carlos.**
"ok", "resolvido", "funcionou" contam. Ausência de resposta não conta.

---

## Blocos protegidos — NUNCA remover

### SCROLL-FIX
Marcado com `/* ═══ SCROLL-FIX — NÃO REMOVER ESTE BLOCO ═══ */` no CSS.
Contém: `html{overflow-y:scroll}`, `html,body{height:100%}`, `overscroll-behavior-y:none` (3×),
`-webkit-overflow-scrolling:touch`, `touchmove preventDefault` no JS.
**Remover qualquer parte = scroll infinito no iOS Safari.**

### WA-FLOAT
Marcado com `/* ═══ WA-FLOAT — NÃO REMOVER ESTE BLOCO ═══ */` no CSS.
Contém: `.wa-float{position:fixed...opacity:0}` e `.wa-float.visible{opacity:1}`.
**Remover = botão WhatsApp some da página.**

---

## Restrições de vocabulário — Meta financial classifier

**NUNCA usar** (ativam classifier de serviços financeiros):
`investidor`, `rentabilidade`, `patrimônio`, `retorno`, `rendimento`, `valorização`, `renda passiva`

**Substituições aprovadas:**
- "investidor" → "pessoa", "comprador", "você"
- "retorno" → "como o imóvel trabalha"
- "investir" → "entender e comprar"

---

## Elementos críticos — estado correto

| Elemento | Valor correto |
|---|---|
| Meta Pixel ID | `2152403845552453` |
| Clint webhook | `c50afeec-6bce-4c35-81d4-c9741bd3678e` |
| webinarDate | `{date:'01/07/2026', time:'20:00'}` |
| webinar_accept | sempre `'Sim'` (nunca condicional) |
| tag_data | `'Funil de Webinar - Inscrito - 01-07-2026'` |
| eventIdLead | UUID separado para evento Lead |
| eventIdCR | UUID separado para CompleteRegistration |
| ln no fbq | `...(lastName ? { ln: lastName.toLowerCase() } : {})` |
| Campos do form | `fn` (nome), `fw` (whatsapp), `fe` (email) |

---

## Itens que NÃO devem existir no HTML

- `modal-overlay` — modal de webinário removido
- `wcChecked` — checkbox removido, webinar_accept automático
- `acceptWebinar` — função removida (era causa de duplo webhook)

---

## Rollback rápido

```bash
# Ver commits recentes
GET /repos/lotear-repositorio/lotear-lp-isca-webnario/commits

# Restaurar SHA anterior via API
PUT /repos/.../contents/index.html
  { sha: <sha_atual>, content: <base64_do_conteudo_anterior> }
```

---

## SHA de referência por marco

| Data | Evento | SHA index.html |
|---|---|---|
| 26/06/2026 | Original pré-sessão | `3a4eba1ced42ff196edc4cd008fd869d957975bf` |
| 27/06/2026 | Fix tracking + auditoria | `3f8cf495856c6a579733cc17acbc4f5d2b428153` |
