# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adota [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

## [0.3.0] — 2026-07-02

### Added
- 5 novas MCP tools:
  - `consultar_cambio` — cotação de câmbio (USD, EUR, GBP, JPY, CHF, CAD, AUD, DKK, NOK, SEK) em BRL por data, boletins PTAX/BACEN
  - `listar_moedas` — moedas com cotação disponível
  - `listar_estados` — as 27 UFs com código IBGE, nome, região e capital
  - `consultar_municipios` — municípios de uma UF com código IBGE de 7 dígitos
  - `consultar_dominio_br` — disponibilidade/status de domínio .br no registro.br (DNS, expiração, sugestões)
- Domínio .br com `ttlMs: 0` — disponibilidade é time-sensitive, nunca é cacheada
- Testes do caminho de retry 5xx/429 do cliente HTTP (fake timers escopados, backoff virtual sem custo real na suíte)
- 26 testes novos (Vitest), totalizando 85 verdes; cobertura 97% lines / 93% branches

### Changed
- Versão single-source: `src/version.ts` lê o `package.json` em runtime; `index.ts` e o User-Agent do cliente HTTP importam de lá (bump de release agora é em UM lugar)
- Registry declarativo de tools em `src/index.ts`: array `TOOLS` + loop de registro no lugar de 10 blocos `registerTool` repetidos

### Notes
- A fonte de câmbio NÃO expõe o dia corrente (400 `NO_TODAY_DATE`, "política de cache"): com `data` omitida a tool consulta ontem (a cotação mais recente disponível) e rejeita `data` = hoje localmente com explicação. Em data sem pregão (fim de semana, feriado) a própria BrasilAPI devolve os boletins do último dia útil anterior — sem fallback no cliente.
- `consultar_dominio_br` exige sufixo `.br` na validação local: a API aceita `google.com` e responde silenciosamente sobre `google.com.br`; a validação garante que a resposta é sobre o domínio perguntado.
- FIPE continua fora — [issue #805](https://github.com/BrasilAPI/BrasilAPI/issues/805) da BrasilAPI segue aberta (403 do upstream).

## [0.2.0] — 2026-05-11

### Added
- 5 novas MCP tools:
  - `consultar_ddd` — cidades atendidas por código DDD
  - `consultar_isbn` — metadados de livro (CBL, Mercado Editorial, Open Library, Google Books)
  - `consultar_taxa` — valor atual de taxa econômica (SELIC, CDI, IPCA)
  - `listar_taxas` — todas as taxas econômicas disponíveis
  - `consultar_corretora` — dados cadastrais de corretora de valores CVM
- **MCP Prompts** (workflows guiados) — primeira aparição no projeto:
  - `analise-cnpj` — consulta CNPJ + análise interpretada (setor, idade, situação)
  - `panorama-economico` — combina taxas + feriados do ano corrente
- `src/utils/cnpj.ts` extraído pra reuso entre `consultar_cnpj` e `consultar_corretora`
- TTL diferenciado pra taxas (1h em vez de 24h, pra refletir atualizações intradia)
- 26 testes novos (Vitest), totalizando 59 verdes; cobertura 95% lines / 89% branches

### Changed
- Issue templates (bug, feature, nova tool) e PR template em `.github/` (já em [Unreleased] na v0.1)
- `SECURITY.md` com canal privado de disclosure (idem)
- `CHANGELOG.md` neste formato (idem)
- User-Agent do cliente HTTP atualizado pra `brasil-data-mcp/0.2.0`

### Notes
- FIPE NÃO está incluída — bug upstream confirmado na BrasilAPI ([issue #805](https://github.com/BrasilAPI/BrasilAPI/issues/805), 403 estável). Será adicionada quando o upstream estabilizar.
- `listar_corretoras` propositalmente fora do escopo: payload de ~600 itens polui contexto do LLM. Reabrir se aparecer filtro útil (UF, status).

## [0.1.0] — 2026-05-08

Primeiro release público no [npm](https://www.npmjs.com/package/brasil-data-mcp) e listagem oficial no [Glama](https://glama.ai/mcp/servers/alanpcf/brasil-data-mcp).

### Added
- 5 MCP tools sobre dados públicos brasileiros via BrasilAPI:
  - `consultar_cnpj` — dados cadastrais de empresa (Receita Federal)
  - `consultar_cep` — endereço completo a partir de CEP (BrasilAPI v2)
  - `consultar_banco` — banco brasileiro pelo código COMPE/Febraban (BACEN)
  - `listar_bancos` — lista completa de bancos cadastrados no BACEN
  - `consultar_feriados` — feriados nacionais por ano (1900-2199, inclui móveis)
- Cliente HTTP centralizado com cache TTL 24h, retry com backoff exponencial (200/400/800ms) em 5xx/429/rede, timeout 10s via `AbortController`
- Tradução de erros HTTP em PT-BR via `traduzirErroBrasilApi` (404, 400, 429, 5xx, falha de rede)
- Bootstrap MCP via `McpServer.registerTool` (SDK 1.x), schema Zod derivando JSON Schema automaticamente
- Helper `wrapHandler` no entry point pra try/catch defensivo padronizado
- Multi-stage Dockerfile (Node 22 alpine) pra self-hosting e Glama
- README bilíngue PT/EN com instruções pra Claude Desktop, Claude Code e Cursor
- `CONTRIBUTING.md` com guia de adicionar tool nova
- CI no GitHub Actions rodando lint + test + build em Node 18, 20 e 22
- 33 testes Vitest mockando `fetch` global, cobertura 94% lines / 85% branches

### Notes
- Distribuição via `npx -y brasil-data-mcp`. Pacote: 8.7 kB compactado, 24.6 kB descompactado.
- Idioma: código, comentários, descrições de tool e mensagens de erro em PT-BR. README bilíngue.

[Unreleased]: https://github.com/alanpcf/brasil-data-mcp/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/alanpcf/brasil-data-mcp/releases/tag/v0.3.0
[0.2.0]: https://github.com/alanpcf/brasil-data-mcp/releases/tag/v0.2.0
[0.1.0]: https://github.com/alanpcf/brasil-data-mcp/releases/tag/v0.1.0
