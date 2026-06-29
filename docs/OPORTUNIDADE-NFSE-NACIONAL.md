# Oportunidade: camada agent-native pra burocracia fiscal BR

> Análise de 10/06/2026 (pesquisa de mercado + método de gates de morte).
> Pergunta: das integrações fiscais brasileiras, quais 3 têm a melhor razão
> dor/esforço pra um MVP com retorno financeiro — e qual atacar primeiro.

## Os 3 fatos novos que criam a janela (2026)

1. **NFS-e Nacional com deadline duro.** Desde 01/01/2026 todos os municípios
   são obrigados a aderir ao Ambiente de Dados Nacional (5.565 entes já
   aderiram). E em **01/09/2026, TODA ME/EPP do Simples prestadora de serviço
   fica obrigada a emitir exclusivamente pelo Emissor Nacional — web ou API**.
   Tradução: milhões de empresas migrando para UMA API padronizada nacional,
   com data marcada. Fragmentação municipal (o moat dos players antigos)
   derrete; a corrida recomeça do zero na API nova.

2. **Reforma tributária na NF-e com deadline duro.** NT 2025.002: campos
   IBS/CBS (CST-IBS/CBS + cClassTrib POR ITEM) aceitos desde jan/2026 sem
   rejeição, obrigatórios em homologação em 07/2026 e em produção em
   **08/2026 para o Regime Normal** (Simples/MEI só em 2027). Todo emissor de
   NF-e do país precisa CLASSIFICAR cada item no novo regime — um problema de
   mapeamento (NCM/CFOP/descrição → cClassTrib) que LLM + tabela de regras
   resolve bem.

3. **SERPRO Integra Contador: API oficial paga por chamada.** DAS por
   ~R$0,80/chamada, Integra-MEI, Integra-Sitfis (situação fiscal), com
   procuração eletrônica via e-CAC e auth por e-CNPJ. Ou seja: o acesso
   programático OFICIAL a obrigações fiscais já existe — sem scraping, sem
   risco jurídico. O que não existe é DX moderna + camada agente em cima.

## Matriz dor/esforço (0-5)

| Integração | Dor (quem paga) | Timing | Esforço MVP | Concorrência | Gap agent-native | Veredicto |
|---|---|---|---|---|---|---|
| **Emissão NFS-e Nacional (API)** | 5 — milhões de ME/EPP obrigadas | **set/2026 (hard)** | 3 — UMA API nacional, cert digital, sandbox | média (Tecnospeed/NotaGateway correndo; recomeço de corrida) | alto | **MVP #1** |
| **Classificador IBS/CBS (cClassTrib)** | 5 — todo emissor NF-e regime normal | **ago/2026 (hard)** | 3 — tabelas LC 214 + regras + LLM | baixa AINDA (janela curta) | alto | **#2** |
| **Read-only fiscal via Integra Contador** (DAS/Sitfis/MEI pra contadores) | 4 — recorrente, escritórios agregam milhares de CNPJs | sem deadline | 2 — API oficial paga | média | alto | **#3** |
| Monitor de CND | 4 | — | 3 (fontes fragmentadas) | **ALTA** (suaCND, Dootax R$150+/mês, Alterdata, IOB, Questor) | médio | não — mercado validado mas servido |
| PIX/boleto/conciliação | 3 | — | — | altíssima (PSPs) | baixo | não |
| Emissão NF-e completa (motor fiscal) | 5 | — | 5 | alta e entrincheirada | — | não |

## Recomendação de MVP: **Emissor NFS-e Nacional agent-native**

Uma camada fina sobre o Emissor Nacional: **emitir, consultar e cancelar
NFS-e com DX moderna + MCP server** — pro agente do dev (e do contador)
emitir nota por comando. O pitch num tweet: *"Seu SaaS (ou seu agente) emite
NFS-e em 10 linhas. Pronto para a obrigatoriedade de setembro."*

- **Compradores**: (a) devs de SaaS BR que cobram serviço e precisam emitir;
  (b) plataformas (freelancer/agências) que emitem em volume; (c) escritórios
  de contabilidade automatizando a emissão dos clientes do Simples.
- **Por que dá pra ganhar dos incumbentes**: a obrigatoriedade zera a vantagem
  deles (integrações municipais legadas viram custo afundado); todo mundo
  integra a MESMA API nova ao mesmo tempo — vence DX, preço e o canal novo
  (agentes/MCP, que nenhum deles tem).
- **Preço de referência do mercado**: R$0,10-0,40 por documento com mínimo
  mensal (modelo Focus/PlugNotas). Ex.: R$49/mês com 200 notas + R$0,15/nota
  excedente. 200 clientes pequenos ≈ R$10k MRR — alcançável de canal direto.
- **Reuso**: o brasil-data-mcp já tem marca, infra MCP e distribuição inicial;
  o emissor entra como o primeiro produto PAGO do mesmo guarda-chuva.

**#2 (classificador cClassTrib)** é produto-irmão com deadline um mês antes
(ago/2026), vendável como endpoint avulso (`classifique este item`) pra quem
já tem emissor — não compete com incumbentes, COMPLEMENTA todos. Atacar
depois do Gate 1 do MVP, ou antes se o Gate 1 emperrar.

**#3 (read-only Integra Contador)** é o de menor risco (só leitura, API
oficial) e o melhor encaixe com contadores — mas sem deadline, é o que menos
se vende sozinho. Vira módulo do mesmo produto depois.

## Gates de morte (no método)

1. **Gate técnico (1 semana):** emitir 1 NFS-e REAL em homologação do
   Emissor Nacional com e-CNPJ/certificado próprio, via API, de ponta a
   ponta (emitir → consultar → cancelar). Se a API nacional for instável,
   subdocumentada a ponto de inviabilizar, ou fechada pra integradores →
   pivota pro #2 (classificador) ou #3 (Integra Contador).
2. **Gate de demanda (30 dias):** 10 conversas (5 contadores, 5 devs de SaaS
   BR) + landing com preço. Critério: **3 pré-vendas ou cartas de intenção**.
   Sem 3 → reavaliar posicionamento ou morrer.
3. **Gate regulatório (contínuo):** governo adia prazos com frequência.
   Se a obrigatoriedade de set/2026 adiar ≥1 ano, a urgência de compra cai —
   recalibrar (o produto continua válido; o gatilho de venda muda).

## Plano de fatias

- **F1 — POC do emissor**: auth por certificado + emitir/consultar/cancelar
  em homologação (Gate 1). Documentar cada pegadinha da API — isso vira o
  conteúdo de marketing depois.
- **F2 — MCP server `nfse`**: `emitir_nfse`, `consultar_nfse`,
  `cancelar_nfse`, `status_adesao_municipio` + modo sandbox. Demo em vídeo:
  um agente emitindo nota por comando de voz/chat.
- **F3 — API REST + billing**: chave de API, contagem por nota, cobrança
  (Asaas/Stripe BR), termos. Mínimo viável de produto pago.
- **F4 — lançamento dirigido**: landing PT, post técnico ("integrei o Emissor
  Nacional — tudo que descobri"), demo MCP, e as 10 conversas do Gate 2.

## Riscos honestos

- **Execução solo + prazo**: a janela forte é fev-ago/2026 (corrida pré-
  obrigatoriedade) — já estamos em junho. Entrar exige F1-F4 em ~6-8 semanas.
- **Incumbentes têm carteira**: Tecnospeed/eNotas vão migrar as bases deles.
  O espaço real é o LONG TAIL (SaaS pequeno, dev indie, contador local) e o
  canal agente — não brigar por enterprise.
- **Responsabilidade fiscal**: emissão errada gera dor no cliente. Mitigação:
  homologação como default, validações duras, e o classificador (#2) como
  guarda. Termos de uso claros desde o dia 1.
