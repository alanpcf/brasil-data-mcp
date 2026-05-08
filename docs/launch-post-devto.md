---
title: brasil-data-mcp — dados públicos brasileiros como tools no Claude
published: false
description: Servidor MCP open source que conecta Claude Desktop, Claude Code, Cursor e Windsurf a CNPJ, CEP, bancos e feriados oficiais via BrasilAPI. Sem chave, sem auth, sem fricção.
tags: claude, ai, opensource, brasil
canonical_url:
cover_image:
---

Lancei agora um servidor MCP (Model Context Protocol) open source que expõe **dados públicos brasileiros** como tools pra qualquer cliente compatível: Claude Desktop, Claude Code, Cursor, Windsurf.

🔗 **GitHub**: [alanpcf/brasil-data-mcp](https://github.com/alanpcf/brasil-data-mcp)
📦 **NPM**: `npx -y brasil-data-mcp`
📚 **BrasilAPI** (backend): [brasilapi.com.br](https://brasilapi.com.br)

## O problema

A maior parte das ferramentas MCP do mercado nasce em torno de dados americanos: ZIP code, EIN, FedEx tracking. Quando um dev brasileiro quer "perguntar um CNPJ" pro LLM, cai em scraping da Receita ou monta integração HTTP manual pra cada projeto.

Eu vivi isso em 3 projetos pessoais. Cansei. Resolvi consolidar.

## A solução

Um servidor único, instalável via `npx`, que expõe 5 tools logo na v0.1:

| Tool | O que faz |
|------|-----------|
| `consultar_cnpj` | Receita Federal: razão social, situação, sócios, CNAE |
| `consultar_cep` | ViaCEP/Postmon agregado, com fallback automático |
| `consultar_banco` | BACEN, lookup pelo código COMPE/Febraban |
| `listar_bancos` | Lista completa (~250 instituições) |
| `consultar_feriados` | Feriados nacionais por ano (inclui móveis: Carnaval, Páscoa, Corpus Christi) |

Tudo construído em cima da [BrasilAPI](https://brasilapi.com.br), que já agrega e cacheia dados oficiais. Eles fizeram o trabalho pesado — eu só embalei pra MCP.

## Como instalar

### Claude Desktop (macOS)

Edita `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

Reinicia o app (Cmd+Q e abre de novo). Pronto.

Pergunta normal:

> _"Qual a razão social do CNPJ 33.000.167/0001-01?"_

E o Claude chama a tool sozinho. Sem precisar dizer "use a ferramenta X" — a descrição da tool já é caprichada o suficiente pra ele decidir.

### Claude Code

```bash
claude mcp add brasil-data -- npx -y brasil-data-mcp
```

### Cursor

`.cursor/mcp.json` na raiz do projeto:

```json
{
  "mcpServers": {
    "brasil-data": { "command": "npx", "args": ["-y", "brasil-data-mcp"] }
  }
}
```

## Decisões técnicas que vale comentar

### 1. Cache TTL de 24h no cliente HTTP

Dados públicos mudam pouco e o LLM tende a chamar várias tools no mesmo turno. Cache reduz latência percebida — e em prod isso vira segundos a menos por interação.

```ts
// src/clients/brasilapi.ts
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
```

### 2. Retry com backoff só em 5xx/429/rede

4xx é input ruim do user. Retentar só piora a UX (mais latência, mesmo erro). Já vi código que retentava cegamente em qualquer erro — péssimo.

```ts
function deveRetentar(status: number | null): boolean {
  if (status === null) return true; // erro de rede
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false; // 4xx não retenta
}
```

### 3. `stdout` é sagrado

MCP usa stdio (stdin/stdout) pra protocolo JSON-RPC. **Qualquer `console.log` corrompe o canal e quebra o servidor inteiro.**

Logs vão sempre em `console.error` (stderr). Documentei isso em comentário no `index.ts` porque é o tipo de bug invisível que destrói uma tarde.

### 4. Validação dupla: Zod + JSON Schema

O SDK do MCP 1.x deriva o JSON Schema automaticamente do schema Zod via `registerTool`. Uma declaração entrega validação runtime + schema pro LLM ler.

```ts
server.registerTool(
  consultarCnpjTool.name,
  {
    description: consultarCnpjTool.description,
    inputSchema: consultarCnpjSchema.shape,  // Zod → JSON Schema
  },
  wrapHandler(consultarCnpjTool.name, consultarCnpjHandler),
);
```

### 5. Erros traduzidos

`404` da BrasilAPI nunca chega cru pro modelo. Vira **"CNPJ X não encontrado na base da Receita Federal."**

Centralizei isso em `src/utils/errors.ts` com `traduzirErroBrasilApi(err, mapa)` — cada handler passa a mensagem específica de "não encontrado" e um prefixo, e o helper resolve 400/429/5xx/rede pra mensagens em PT.

Princípio: o LLM não deve precisar interpretar status code HTTP. Ele lê PT, não RFC 7231.

### 6. Descrição de tool é PRODUTO

É o que o LLM lê pra decidir quando chamar. Capricho:

```ts
description: [
  "Consulta dados cadastrais de uma empresa brasileira pelo CNPJ na Receita Federal (via BrasilAPI).",
  "",
  "Retorna em JSON: razão social, nome fantasia, situação cadastral, ...",
  "",
  "Use quando o usuário pedir informações sobre uma empresa identificada por CNPJ.",
  "",
  "NÃO use para: CPF (pessoa física), empresas estrangeiras, ...",
].join(" "),
```

A parte "NÃO use para" reduz alucinação — o modelo sabe quando recusar.

## Stack

- **TypeScript** estrito + ESM, Node ≥18
- **`@modelcontextprotocol/sdk`** 1.x (high-level `McpServer.registerTool`)
- **Zod** 3.x pra schemas
- **tsup** pra build (gera `dist/index.js` com shebang preservado)
- **Vitest** com 33 testes (94% lines, 85% branches)
- **GitHub Actions** rodando lint + test + build em Node 18/20/22

## O que vem na v0.2

- `consultar_fipe` — preços de veículos
- `consultar_ddd` — qual estado/região é o DDD
- `consultar_isbn` — dados bibliográficos
- Taxas: SELIC, CDI, IPCA, com séries históricas
- CVM: fundos de investimento

E na v1.0 talvez **MCP prompts** (não só tools): workflows pré-configurados tipo "analise esse CNPJ" como prompt salvo, não tool.

## Contribuir

PRs MUITO bem-vindos. Tem [CONTRIBUTING.md](https://github.com/alanpcf/brasil-data-mcp/blob/main/CONTRIBUTING.md) detalhando como adicionar tool nova — basicamente: replica o padrão de `src/tools/cnpj.ts`, registra em `src/index.ts`, escreve teste mockando `fetch`. Reviso em 1-3 dias.

Issues e ideias: https://github.com/alanpcf/brasil-data-mcp/issues

---

**Built with ❤️ in Brazil. Powered by [BrasilAPI](https://brasilapi.com.br).**

Se você é dev brasileiro e usa LLM no dia a dia, dá uma estrela no repo e me conta no LinkedIn o que achou: [alanpcf](https://linkedin.com/in/alanpcf).
