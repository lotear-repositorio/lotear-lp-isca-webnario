# Backlog — guia.soulotear.com.br

> Última atualização: 05/08/2026. Itens em ordem de prioridade, cada um com o que precisa acontecer antes de começar.

---

## 1. Medir comparecimento da sessão de 12/08

**Status:** bloqueado até a data passar.
**O que fazer:** segmentar `webinar_presenca` (Confirmado / Talvez / Não respondeu) contra quem realmente compareceu na sessão de 12/08 às 20h. Comparar taxa de comparecimento de cada grupo.
**Por quê:** valida se o passo de confirmação de presença (commit `4821aad`, 05/08) teve efeito real. Sem esse dado, nenhuma decisão abaixo pode ser tomada com segurança.

---

## 2. Trocar CTA "Baixar o guia agora" → "Garantir minha vaga"

**Status:** bloqueado pelo item 1.
**O que fazer:** reescrever o botão principal do formulário e o `form-sub` para enquadrar o webinário como o produto, não o guia.
**Por quê:** hoje o funil inteiro vende "baixar PDF" — o webinário é bônus. Mudar isso deve reduzir fricção de cadastro, mas só compensa se subir comparecimento mais do que derruba conversão do formulário. Testar isolado do item 1 para não misturar variável.

---

## 3. Segmentar conjunto de anúncio da faixa 35-44

**Status:** pronto para começar, sem bloqueio.
**O que fazer:** separar a faixa etária 35-44 em conjunto próprio por 7 dias antes de decidir cortar. Hoje ela consome 17% do gasto com CPL R$ 17,93 — bem acima das demais faixas (R$ 11-12).
**Por quê:** é a única ineficiência clara nos dados sem precisar de novo criativo. Não cortar direto — pode subir CPM do resto se estreitar o público.

---

## 4. Correções de conversão de topo da LP (auditoria de junho)

**Status:** pronto para começar, sem bloqueio.
**O que fazer:**
- Adicionar 2-3 depoimentos com identificação real (hoje só 1)
- Implementar seção FAQ (4 objeções do lead frio) — nunca foi implementada
- Corrigir o depoimento existente: remove "impacto no retorno" → palavra proibida por compliance, está ao vivo desde antes desta sessão
- Avaliar reduzir as 2 imagens base64 ainda embutidas no HTML (67KB — já foi 192KB, mas ainda pesa no LCP mobile)
**Por quê:** proposta já documentada em `lotear-lp-auditoria-proposta-v1.html` desde 23/06, nunca aplicada. "impacto no retorno" é risco de compliance ativo, prioridade alta apesar de baixo esforço.

---

## 5. Campanha-laboratório para teste de criativos

**Status:** bloqueado pelo item 1 — sem sentido testar criativo enquanto o gargalo é comparecimento, não atração.
**O que fazer:** campanha separada, ABO, ~R$ 80/dia, mesmo público da campanha de produção. Levar o anúncio "02 - Estático" pra lá (hoje subfinanciado dentro do CBO) + 2 criativos novos por rodada.
**Por quê:** anúncio 01 e 02 têm qualificação estatisticamente empatada (10,4% vs 10,5%) — criativo não é o problema atual, mas a infraestrutura de teste falta para quando voltar a ser relevante.

---

## 6. Corrigir promessa do criativo 6 ("lista personalizada")

**Status:** pronto para começar, sem bloqueio.
**O que fazer:** o criativo promete "lista personalizada com os studios mais rentáveis" — a página entrega um guia genérico igual pra todo mundo. Ou remove a promessa do criativo, ou cria segmentação real na entrega.
**Por quê:** promessa quebrada queima confiança antes da nutrição começar. Baixo esforço, resolve sozinho (trocar o anúncio é mais rápido que personalizar a entrega).

---

## 7. Verificar threshold de otimização por evento qualificado (CAPI)

**Status:** pronto para verificar, sem bloqueio.
**O que fazer:** conferir no Events Manager se o volume de `LeadQualificado` já atinge o mínimo (~50 eventos/7 dias) pra trocar o evento de otimização do conjunto.
**Por quê:** com ~27 negócios/10 dias (~19/semana), pode já estar perto do threshold. Se estiver, é ganho de eficiência sem trabalho de criativo ou copy.

---

## Referência rápida

| Item | Bloqueado por | Esforço |
|---|---|---|
| 1. Medir comparecimento 12/08 | Data | — |
| 2. Trocar CTA do botão | Item 1 | Baixo |
| 3. Segmentar 35-44 | Nada | Baixo |
| 4. Depoimentos + FAQ + compliance | Nada | Médio |
| 5. Campanha-laboratório criativos | Item 1 | Médio |
| 6. Corrigir criativo 6 | Nada | Baixo |
| 7. Threshold CAPI | Nada | Baixo (só verificar) |
