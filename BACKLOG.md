# Backlog — guia.soulotear.com.br

> Última atualização: 12/08/2026. Itens em ordem de prioridade, cada um com o que precisa acontecer antes de começar.

---

## ✅ Feito

**LP (guia.soulotear.com.br)**
- Passo de confirmação de presença no webinário (`webinar_presenca`: Confirmado/Talvez/Não respondeu)
- Correção de compliance no depoimento: "impacto no retorno" → "impacto no valor"
- Seção FAQ com 4 perguntas
- Sigla NR adicionada ao glossário (pill + card 03)
- Decisão registrada: palavra "investidor" fica de fora de toda a página — risco de Special Ad Category "Financial Products and Services" empilhar sobre "Housing"
- Clique em "Confirmado"/"Talvez" vai direto pro WhatsApp (`wa.link/wwr04p`); timeout de 5s revela tela de sucesso pra quem não clica — garante que 100% dos leads chegam no WhatsApp

**Campanha de teste (30-54)**
- Campanha `[TESTE 30-54]` criada, separada da produção, R$80/dia
- Idade travada em 30-54 de verdade (não só sugestão) — resolvido o bug do Advantage+ que limitava a 25+
- Criativos André, Larissa e Ricardo (C2) prontos e publicados
- 2 variações extras prontas, não publicadas ainda: C1 (curiosidade/topo de funil) e C3 (retargeting/urgência)
- Template de composição Python (`template_criativo.py`) travado — fonte, tamanho, espaçamento fixos, não variar mais

---

## 1. Verificar status do carrossel na campanha de teste

**Status:** pendente verificação — travado em "Em processamento" por vários dias.
**O que fazer:** abrir o anúncio, editar qualquer campo pequeno (ex: descrição) e resubmeter pra forçar nova revisão. Se travar de novo, é bloqueio de política, não fila normal.
**Por quê:** não é comportamento normal da Meta — revisão não deveria demorar dias. Enquanto isso, a hipótese de Carlos ("carrossel ajuda a conversão do conjunto") continua impossível de testar, porque ele nunca chegou a rodar de verdade.

---

## 2. Larissa ficou sem verba um dia (11/08)

**Status:** monitorar, não agir ainda.
**O que fazer:** se persistir por mais 2-3 dias, isolar em conjunto próprio pra garantir entrega.
**Por quê:** o algoritmo concentrou tudo no André num dia — pode ser variação normal de leilão ou início de concentração precoce. Cedo demais pra agir.

---

## 3. Decidir sobre as 2 variações C1/C3 prontas

**Status:** aguardando decisão de Carlos.
**O que fazer:** publicar ou não os criativos C1 (curiosidade, topo de funil) e C3 (retargeting, urgência) na campanha de teste.
**Por quê:** ainda não foi decidido se entram agora ou ficam pra uma próxima rodada — evitar adicionar variável nova enquanto a campanha atual (André/Larissa/Ricardo, idade corrigida) ainda está gerando os primeiros dias de dado limpo.

---

## 4. Ler relatório da campanha de teste com idade corrigida

**Status:** bloqueado até acumular volume (idade 30-54 só ficou 100% correta a partir de ~11-12/08).
**O que fazer:** esperar uns 4-5 dias de dado limpo (sem contaminação de idade) antes de comparar CPL/CVR contra a produção.
**Por quê:** os relatórios até agora estavam parcialmente contaminados por tráfego de 55-64/65+ que não deveria estar ali.

---

## 5. Trocar CTA "Baixar o guia agora" → "Garantir minha vaga"

**Status:** ainda bloqueado — depende de dado de comparecimento consolidado.
**O que fazer:** reescrever o botão principal do formulário pra enquadrar o webinário como o produto, não o guia.
**Por quê:** ainda não há dado suficiente de comparecimento acumulado pra saber se vale a troca.

---

## 6. Segmentar conjunto de anúncio da faixa 35-44 (produção)

**Status:** pronto pra começar, sem bloqueio.
**O que fazer:** separar 35-44 em conjunto próprio por 7 dias — CPL historicamente mais caro (R$17,93) que as demais faixas.

---

## 7. Depoimentos novos com identificação real

**Status:** bloqueado — depende do time comercial trazer nomes/autorização.

---

## 8. Verificar threshold de otimização por evento qualificado (CAPI)

**Status:** pronto pra verificar, sem bloqueio — conferir no Events Manager se `LeadQualificado` já atinge ~50 eventos/7 dias.

---

## Referência rápida

| Item | Bloqueado por | Esforço |
|---|---|---|
| 1. Carrossel travado em revisão | Nada — resubmeter | Baixo |
| 2. Larissa sem verba (11/08) | Monitorar | — |
| 3. Decidir C1/C3 | Decisão de Carlos | Baixo |
| 4. Ler relatório idade corrigida | Volume/tempo | — |
| 5. Trocar CTA botão | Dado de comparecimento | Baixo |
| 6. Segmentar 35-44 (produção) | Nada | Baixo |
| 7. Depoimentos novos | Time comercial | Baixo (não é seu) |
| 8. Threshold CAPI | Nada | Baixo (só verificar) |
