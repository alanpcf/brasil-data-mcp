# brasil-data-mcp

[![npm version](https://img.shields.io/npm/v/brasil-data-mcp.svg)](https://www.npmjs.com/package/brasil-data-mcp)
[![license](https://img.shields.io/npm/l/brasil-data-mcp.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/brasil-data-mcp.svg)](https://nodejs.org)

> MCP server que expõe dados públicos brasileiros (CNPJ, CEP, bancos, feriados) como tools pra Claude Desktop, Claude Code, Cursor, Windsurf e qualquer cliente compatível com [Model Context Protocol](https://modelcontextprotocol.io).
>
> _MCP server exposing Brazilian public data (CNPJ, CEP, banks, holidays) as tools for Claude Desktop, Claude Code, Cursor, Windsurf and any MCP-compatible client._

Powered by [BrasilAPI](https://brasilapi.com.br) — sem chave, sem auth, dados oficiais.

---

## 🇧🇷 PT — O que é?

Conecte seu cliente de IA aos dados públicos brasileiros sem escrever uma linha de código. Pergunte em linguagem natural:

- _"Qual a razão social do CNPJ 33.000.167/0001-01?"_
- _"Esse CEP 01310-100 é em qual cidade?"_
- _"Quem é o banco com código 341?"_
- _"Quais os feriados nacionais de 2026?"_

O Claude (ou outro cliente MCP) chama a tool, retorna o JSON estruturado, e você lê a resposta em português direto na conversa.

### Tools disponíveis

| Tool                  | O que faz                                                                       |
| --------------------- | ------------------------------------------------------------------------------- |
| `consultar_cnpj`      | Dados cadastrais de empresa: razão social, situação, endereço, sócios, CNAE     |
| `consultar_cep`       | Endereço completo a partir de CEP (logradouro, bairro, cidade, UF, coordenadas) |
| `consultar_banco`     | Nome e ISPB de banco brasileiro pelo código COMPE (ex: 341 = Itaú, 260 = Nubank) |
| `listar_bancos`       | Lista completa de bancos brasileiros cadastrados no BACEN (~250 instituições)   |
| `consultar_feriados`  | Feriados nacionais de um ano (datas, nome, tipo) — inclui Carnaval e Páscoa     |

---

## 🇺🇸 EN — What is it?

Plug your AI client into Brazilian public data with zero code. Ask in natural language and the LLM picks the right tool, calls it, and answers you with structured data from official sources (Receita Federal, ViaCEP, BACEN).

Currently ships with `consultar_cnpj`. CEP, banks and holidays are landing next.

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
- [ ] **Fase 3** — CI (GitHub Actions), CONTRIBUTING.md, cobertura > 80%, publicação no npm
- [ ] **Fase 4** — FIPE, DDD, ISBN, taxas (SELIC/CDI/IPCA), CVM, MCP prompts pra workflows

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
