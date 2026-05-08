# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adota [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added
- Issue templates (bug, feature, nova tool) e PR template em `.github/`
- `SECURITY.md` com canal privado de disclosure
- `CHANGELOG.md` neste formato

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

[Unreleased]: https://github.com/alanpcf/brasil-data-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/alanpcf/brasil-data-mcp/releases/tag/v0.1.0
