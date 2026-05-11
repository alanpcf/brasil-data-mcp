# brasil-data-mcp

[![npm version](https://img.shields.io/npm/v/brasil-data-mcp.svg)](https://www.npmjs.com/package/brasil-data-mcp)
[![npm downloads](https://img.shields.io/npm/dm/brasil-data-mcp.svg)](https://www.npmjs.com/package/brasil-data-mcp)
[![CI](https://github.com/alanpcf/brasil-data-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/alanpcf/brasil-data-mcp/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/brasil-data-mcp.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/brasil-data-mcp.svg)](https://nodejs.org)
[![Glama MCP server](https://glama.ai/mcp/servers/alanpcf/brasil-data-mcp/badges/score.svg)](https://glama.ai/mcp/servers/alanpcf/brasil-data-mcp)

> MCP server que expõe dados públicos brasileiros (CNPJ, CEP, bancos, feriados, DDD, ISBN, taxas econômicas, corretoras CVM) como tools pra Claude Desktop, Claude Code, Cursor, Windsurf e qualquer cliente compatível com [Model Context Protocol](https://modelcontextprotocol.io). Inclui também **prompts MCP** (workflows guiados).
>
> _MCP server exposing Brazilian public data (CNPJ, CEP, banks, holidays, area codes, ISBN, economic rates, CVM brokers) as tools for Claude Desktop, Claude Code, Cursor, Windsurf and any MCP-compatible client. Ships with MCP prompts for guided workflows._

Powered by [BrasilAPI](https://brasilapi.com.br) — sem chave, sem auth, dados oficiais.

---

## 🇧🇷 PT — O que é?

Conecte seu cliente de IA aos dados públicos brasileiros sem escrever uma linha de código. Pergunte em linguagem natural:

- _"Qual a razão social do CNPJ 33.000.167/0001-01?"_
- _"Esse CEP 01310-100 é em qual cidade?"_
- _"Quem é o banco com código 341?"_
- _"Quais os feriados nacionais de 2026?"_
- _"Quais cidades têm DDD 41?"_
- _"Me dá o livro do ISBN 9788532530802."_
- _"Qual a SELIC hoje?"_
- _"A corretora de CNPJ 02.332.886/0011-78 ainda tá ativa?"_

O Claude (ou outro cliente MCP) chama a tool, retorna o JSON estruturado, e você lê a resposta em português direto na conversa.

### Tools disponíveis (10)

| Tool                   | O que faz                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `consultar_cnpj`       | Dados cadastrais de empresa: razão social, situação, endereço, sócios, CNAE        |
| `consultar_cep`        | Endereço completo a partir de CEP (logradouro, bairro, cidade, UF, coordenadas)    |
| `consultar_banco`      | Nome e ISPB de banco brasileiro pelo código COMPE (ex: 341 = Itaú, 260 = Nubank)   |
| `listar_bancos`        | Lista completa de bancos brasileiros cadastrados no BACEN (~250 instituições)      |
| `consultar_feriados`   | Feriados nacionais de um ano (datas, nome, tipo) — inclui Carnaval e Páscoa        |
| `consultar_ddd`        | Estado e cidades atendidas por um código DDD (ex: 11 = SP capital + região metro)  |
| `consultar_isbn`       | Metadados de livro pelo ISBN-10/13 (título, autor, editora, ano, idioma, páginas)  |
| `consultar_taxa`       | Valor atual de taxa econômica (SELIC, CDI, IPCA) em % ao ano                       |
| `listar_taxas`         | Panorama com todas as taxas econômicas vigentes                                    |
| `consultar_corretora`  | Dados cadastrais de corretora de valores autorizada pela CVM (status, endereço)    |

### Prompts disponíveis (2)

Prompts MCP são **workflows guiados** que aparecem como atalho no Claude Desktop. Você seleciona, preenche o argumento e o LLM segue o roteiro pré-definido (chama tools, interpreta, responde).

| Prompt               | O que faz                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `analise-cnpj`       | Recebe um CNPJ, consulta na Receita e produz análise estruturada (setor, idade, porte)   |
| `panorama-economico` | Combina taxas vigentes + próximos feriados nacionais em um snapshot conciso              |

---

## 🇺🇸 EN — What is it?

Plug your AI client into Brazilian public data with zero code. Ask in natural language and the LLM picks the right tool, calls it, and answers you with structured data from official sources (Receita Federal, ViaCEP, BACEN, CVM, BrasilAPI).

10 tools covering CNPJ, CEP, banks, holidays, area codes (DDD), ISBN, economic rates (SELIC/CDI/IPCA) and CVM brokers — plus 2 MCP prompts (`analise-cnpj`, `panorama-economico`) for guided workflows.

---

## 🚀 Instalação / Installation

Todas as instruções abaixo usam `npx -y brasil-data-mcp`, o que baixa e roda a última versão sem instalação global.

### Claude Desktop

Edite o arquivo de configuração:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "brasil-data": {
      "command": "npx",
      "args": ["-y", "brasil-data-mcp"]
    }
  }
}
```

Reinicie o Claude Desktop. Pronto.

### Claude Code

```bash
claude mcp add brasil-data -- npx -y brasil-data-mcp
```

### Cursor

Crie ou edite `.cursor/mcp.json` na raiz do projeto:

```json
{
  "mcpServers": {
    "brasil-data": {
      "command": "npx",
      "args": ["-y", "brasil-data-mcp"]
    }
  }
}
```

---

## 🛠️ Desenvolvimento / Development

```bash
git clone https://github.com/alanpcf/brasil-data-mcp.git
cd brasil-data-mcp
npm install

npm run dev      # tsx watch — hot reload em desenvolvimento
npm run lint     # tsc --noEmit
npm run build    # tsup → dist/index.js
npm test         # vitest
```

Pra apontar seu cliente MCP pro build local em vez do pacote do npm:

```json
{
  "mcpServers": {
    "brasil-data-local": {
      "command": "node",
      "args": ["/caminho/absoluto/para/brasil-data-mcp/dist/index.js"]
    }
  }
}
```

---

## 🗺️ Roadmap

- [x] **Fase 1** — Esqueleto + cliente HTTP + `consultar_cnpj`
- [x] **Fase 2** — `consultar_cep`, `consultar_banco`, `listar_bancos`, `consultar_feriados` + testes Vitest
- [x] **Fase 3** — CI (GitHub Actions), `CONTRIBUTING.md`, cobertura 94%/85%, publicação no [npm](https://www.npmjs.com/package/brasil-data-mcp), listagem no [Glama](https://glama.ai/mcp/servers/alanpcf/brasil-data-mcp)
- [x] **Fase 4 (v0.2.0)** — `consultar_ddd`, `consultar_isbn`, `consultar_taxa` + `listar_taxas`, `consultar_corretora` (CVM) + MCP prompts (`analise-cnpj`, `panorama-economico`)
- [ ] **Próximo** — FIPE (aguardando upstream estabilizar, [BrasilAPI#805](https://github.com/BrasilAPI/BrasilAPI/issues/805)); Trusted Publishing (npm OIDC); mais prompts conforme demanda

---

## 💡 Por que esse projeto existe

A maior parte das ferramentas de IA é treinada e demonstrada com dados americanos: ZIP code, EIN, FedEx tracking. Quando um dev brasileiro quer perguntar pra um LLM "me dá o cadastro do CNPJ X", ou cai em scraping, ou monta uma integração HTTP no braço, ou desiste.

`brasil-data-mcp` é o caminho mais curto: um único `npx` e o seu Claude (ou Cursor, ou Windsurf) já fala "português de dado público brasileiro". Tudo open source, MIT, sem chave, sem rate limit hostil — porque a [BrasilAPI](https://brasilapi.com.br) já fez o trabalho pesado de unificar e cachear dados oficiais.

Se você é dev brasileiro e usa LLM no dia a dia, esse server é pra você.

---

## 🤝 Contribuindo / Contributing

Issues e PRs muito bem-vindos. Pra adicionar uma tool nova, siga o padrão de `src/tools/cnpj.ts` (schema Zod + descrição + handler) e registre em `src/index.ts`.

Guia detalhado em `CONTRIBUTING.md` _(em breve)_.

---

Built with ❤️ in Brazil. Powered by [BrasilAPI](https://brasilapi.com.br).
