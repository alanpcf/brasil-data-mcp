# brasil-data-mcp

[![npm version](https://img.shields.io/npm/v/brasil-data-mcp.svg)](https://www.npmjs.com/package/brasil-data-mcp)
[![npm downloads](https://img.shields.io/npm/dm/brasil-data-mcp.svg)](https://www.npmjs.com/package/brasil-data-mcp)
[![CI](https://github.com/alanpcf/brasil-data-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/alanpcf/brasil-data-mcp/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/brasil-data-mcp.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/brasil-data-mcp.svg)](https://nodejs.org)
[![Glama MCP server](https://glama.ai/mcp/servers/alanpcf/brasil-data-mcp/badges/score.svg)](https://glama.ai/mcp/servers/alanpcf/brasil-data-mcp)

> MCP server que expõe dados públicos brasileiros (CNPJ, CEP, bancos, feriados, DDD, ISBN, taxas econômicas, câmbio, corretoras CVM, estados e municípios IBGE, domínios .br) como tools pra Claude Desktop, Claude Code, Cursor, Windsurf e qualquer cliente compatível com [Model Context Protocol](https://modelcontextprotocol.io). Inclui também **prompts MCP** (workflows guiados).
>
> _MCP server exposing Brazilian public data (CNPJ, CEP, banks, holidays, area codes, ISBN, economic rates, exchange rates, CVM brokers, IBGE states/municipalities, .br domains) as tools for Claude Desktop, Claude Code, Cursor, Windsurf and any MCP-compatible client. Ships with MCP prompts for guided workflows._

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
- _"Quanto fechou o dólar sexta-feira?"_
- _"Quais os municípios do Acre?"_
- _"meuprojeto.com.br tá disponível?"_

O Claude (ou outro cliente MCP) chama a tool, retorna o JSON estruturado, e você lê a resposta em português direto na conversa.

### Tools disponíveis (15, + 2 com provedor premium)

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
| `consultar_cambio`     | Cotação de câmbio (USD, EUR, +8 moedas) em BRL por data — boletins PTAX/BACEN      |
| `listar_moedas`        | Moedas estrangeiras com cotação disponível (símbolo, nome, tipo)                   |
| `listar_estados`       | As 27 UFs com código IBGE, nome, região e capital                                  |
| `consultar_municipios` | Municípios de uma UF com nome e código IBGE de 7 dígitos                           |
| `consultar_dominio_br` | Disponibilidade/status de domínio .br no registro.br (DNS, expiração, sugestões)   |

Com o provedor premium opcional habilitado (variável `CPFCNPJ_TOKEN`, veja a seção abaixo):

| Tool                           | O que faz                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `consultar_cpf`                | Dados cadastrais de pessoa física por CPF na Receita Federal. Requer `CPFCNPJ_TOKEN`     |
| `consultar_inscricao_estadual` | Inscrições estaduais (IE) de um CNPJ, com filtro opcional por UF. Requer `CPFCNPJ_TOKEN` |

### Prompts disponíveis (2)

Prompts MCP são **workflows guiados** que aparecem como atalho no Claude Desktop. Você seleciona, preenche o argumento e o LLM segue o roteiro pré-definido (chama tools, interpreta, responde).

| Prompt               | O que faz                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `analise-cnpj`       | Recebe um CNPJ, consulta na Receita e produz análise estruturada (setor, idade, porte)   |
| `panorama-economico` | Combina taxas vigentes + próximos feriados nacionais em um snapshot conciso              |

---

## 🇺🇸 EN — What is it?

Plug your AI client into Brazilian public data with zero code. Ask in natural language and the LLM picks the right tool, calls it, and answers you with structured data from official sources (Receita Federal, ViaCEP, BACEN, CVM, BrasilAPI).

15 tools covering CNPJ, CEP, banks, holidays, area codes (DDD), ISBN, economic rates (SELIC/CDI/IPCA), exchange rates (PTAX/BACEN), CVM brokers, IBGE states and municipalities, and .br domain availability — plus 2 MCP prompts (`analise-cnpj`, `panorama-economico`) for guided workflows.

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

## 🔑 Provedor premium opcional: cpfcnpj.com.br

Por padrão, tudo roda pela BrasilAPI, sem chave. Se você definir a variável de ambiente `CPFCNPJ_TOKEN`, o servidor liga um provedor premium opcional (a API da [CPF.CNPJ](https://www.cpfcnpj.com.br/dev/)) e ganha três coisas:

- `consultar_cnpj` passa a consultar os dados oficiais em tempo real (D+0). Se o provedor falhar, cai automaticamente de volta para a BrasilAPI; o campo `fonte` na resposta indica a origem. CNPJ alfanumérico (IN RFB 2.229/2024) já funciona sem token, via BrasilAPI.
- Nova tool `consultar_cpf`: dados cadastrais de pessoa física (situação e nome, ou completo com nascimento, gênero e endereço).
- Nova tool `consultar_inscricao_estadual`: inscrições estaduais (IE) de um CNPJ, com filtro opcional por UF.

**Sem `CPFCNPJ_TOKEN`, nada muda:** as 15 tools continuam iguais, sem chave, sem auth.

### Variáveis de ambiente

| Variável              | Obrigatória              | Padrão                        | Uso                                                                                   |
| --------------------- | ------------------------ | ----------------------------- | ------------------------------------------------------------------------------------- |
| `CPFCNPJ_TOKEN`       | para ligar o provedor    | (vazio, desligado)            | token da conta em cpfcnpj.com.br                                                      |
| `CPFCNPJ_BASE_URL`    | não                      | `https://api.cpfcnpj.com.br`  | aceita somente `https://` (o token vai no path)                                       |
| `CPFCNPJ_CNPJ_PACOTE` | não                      | `6`                           | `5` (razão, fantasia, endereço) ou `6` (completo: QSA, situação, CNAE, porte, Simples) |

### Claude Desktop com o provedor ligado

```json
{
  "mcpServers": {
    "brasil-data": {
      "command": "npx",
      "args": ["-y", "brasil-data-mcp"],
      "env": { "CPFCNPJ_TOKEN": "seu-token" }
    }
  }
}
```

No Claude Code: `claude mcp add brasil-data -e CPFCNPJ_TOKEN=seu-token -- npx -y brasil-data-mcp`.

O token é obtido no painel em [cpfcnpj.com.br/dev](https://www.cpfcnpj.com.br/dev/). Cada consulta consome crédito da sua conta (o custo por consulta está na tabela de pacotes do painel). Os dados vêm das fontes oficiais em tempo real, sem bases raspadas, e o provedor mantém certificações ISO/IEC 27001, ISO/IEC 27701 e ISO 37301.

### EN, optional premium provider

By default everything runs through BrasilAPI, no key required (including alphanumeric CNPJ). Set the `CPFCNPJ_TOKEN` environment variable to enable an optional premium provider ([CPF.CNPJ](https://www.cpfcnpj.com.br/dev/)): `consultar_cnpj` then queries official data in real time, with automatic fallback to BrasilAPI, and two new tools show up, `consultar_cpf` and `consultar_inscricao_estadual`. Without the token the existing JSON contract is unchanged. Configure it through the `env` block above and get a token at [cpfcnpj.com.br/dev](https://www.cpfcnpj.com.br/dev/). Each lookup consumes account credit; data comes from official sources in real time and the provider holds ISO/IEC 27001, ISO/IEC 27701 and ISO 37301 certifications.

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
- [x] **Fase 5 (v0.3.0)** — `consultar_cambio` + `listar_moedas` (PTAX/BACEN), `listar_estados` + `consultar_municipios` (IBGE), `consultar_dominio_br` (registro.br); versão single-source; registry declarativo de tools; testes do caminho de retry
- [x] **v0.4.0** — provedor premium opcional cpfcnpj.com.br via `CPFCNPJ_TOKEN`: `consultar_cpf`, `consultar_inscricao_estadual`; `consultar_cnpj` em D+0 com token (fallback BrasilAPI); CNPJ alfanumérico na BrasilAPI sem token
- [ ] **Próximo** — FIPE (aguardando upstream estabilizar, [BrasilAPI#805](https://github.com/BrasilAPI/BrasilAPI/issues/805)); Trusted Publishing (npm OIDC); mais prompts conforme demanda

---

## 💡 Por que esse projeto existe

A maior parte das ferramentas de IA é treinada e demonstrada com dados americanos: ZIP code, EIN, FedEx tracking. Quando um dev brasileiro quer perguntar pra um LLM "me dá o cadastro do CNPJ X", ou cai em scraping, ou monta uma integração HTTP no braço, ou desiste.

`brasil-data-mcp` é o caminho mais curto: um único `npx` e o seu Claude (ou Cursor, ou Windsurf) já fala "português de dado público brasileiro". Tudo open source, MIT, sem chave, sem rate limit hostil — porque a [BrasilAPI](https://brasilapi.com.br) já fez o trabalho pesado de unificar e cachear dados oficiais.

Se você é dev brasileiro e usa LLM no dia a dia, esse server é pra você.

---

## 🤝 Contribuindo / Contributing

Issues e PRs muito bem-vindos. Pra adicionar uma tool nova, siga o padrão de `src/tools/cnpj.ts` (schema Zod + descrição + handler) e registre em `src/index.ts`.

Guia detalhado em [CONTRIBUTING.md](./CONTRIBUTING.md).

---

Built with ❤️ in Brazil. Powered by [BrasilAPI](https://brasilapi.com.br).
