# Contribuindo com brasil-data-mcp

Obrigado pelo interesse! Este guia mostra como propor mudanças e adicionar tools novas.

## Antes de começar

- Issues e ideias: abra primeiro uma [issue](https://github.com/alanpcf/brasil-data-mcp/issues) descrevendo o que você quer fazer. Pra mudanças pequenas (typo, bug óbvio) pode ir direto pro PR.
- Padrões e princípios estão no [README](./README.md) e nos comentários do código. Vale ler antes.

## Setup

```bash
git clone https://github.com/alanpcf/brasil-data-mcp.git
cd brasil-data-mcp
npm install
npm run lint        # tsc --noEmit
npm test            # vitest run
npm run test:coverage
npm run build       # tsup → dist/
npm run dev         # tsx watch
```

Node >= 18.

## Adicionando uma tool nova — passo a passo

Cada tool segue um padrão estável. Replique-o e a Code Review fica trivial.

### 1. Crie `src/tools/<nome>.ts`

Use `src/tools/cnpj.ts` como template. Exporte exatamente três coisas:

```ts
export const consultarXyzSchema = z.object({
  // campos com .describe() — viram parte do JSON Schema que o LLM lê.
});

export const consultarXyzTool = {
  name: "consultar_xyz",
  description: "...",   // ver "descrição é produto" abaixo
  inputSchema: consultarXyzSchema,
};

export async function consultarXyzHandler(
  input: z.infer<typeof consultarXyzSchema>,
): Promise<CallToolResult> {
  // 1. Validação local (limpar input, rejeitar formato óbvio).
  // 2. brasilApi.get<unknown>(`/<endpoint>/...`).
  // 3. Sucesso → JSON.stringify(dados, null, 2).
  // 4. Erro → traduzirErroBrasilApi(err, { notFound, contextoErro }).
}
```

### 2. Registre em `src/index.ts`

```ts
import {
  consultarXyzHandler,
  consultarXyzSchema,
  consultarXyzTool,
} from "./tools/xyz.js";

// dentro de createServer():
server.registerTool(
  consultarXyzTool.name,
  {
    description: consultarXyzTool.description,
    inputSchema: consultarXyzSchema.shape,
  },
  wrapHandler(consultarXyzTool.name, consultarXyzHandler),
);
```

### 3. Escreva o teste em `tests/tools/<nome>.test.ts`

Mocke `fetch` global via `vi.stubGlobal`. Cubra no mínimo:

- caso feliz (200 + JSON válido)
- 404 traduzido pra mensagem em PT
- validação local rejeita sem chamar fetch
- input com formato alternativo (com/sem máscara, string vs number) gera a mesma URL

Use `tests/tools/cnpj.test.ts` como referência. Lembre: **`mockImplementation`, nunca `mockResolvedValue`** com `Response` (body só pode ser lido uma vez).

### 4. Atualize o README

Adicione a tool na tabela de tools disponíveis.

### 5. Rode tudo localmente antes do PR

```bash
npm run lint && npm test && npm run build
```

O CI roda os mesmos comandos mais coverage em Node 18/20/22.

## Princípios não-negociáveis

Esses princípios protegem a qualidade da experiência de quem usa o servidor:

1. **Descrição da tool é produto.** É o que o LLM lê pra decidir quando chamar. Explicite o que faz, quando usar e quando NÃO usar (ex: "use pra X, não pra Y porque...").
2. **Erros traduzidos.** Nunca devolva `404`, `BrasilAPI retornou 500` ou stack trace cru. Use `traduzirErroBrasilApi` em `src/utils/errors.ts`.
3. **JSON estruturado, não texto livre.** `JSON.stringify(dados, null, 2)`. O LLM extrai campos com mais confiabilidade quando recebe JSON.
4. **`stdout` é sagrado.** Logs vão sempre em `console.error` (stderr). `console.log` corrompe o canal MCP e quebra o servidor inteiro.
5. **Validação dupla.** Schema Zod (runtime) + JSON Schema (auto-derivado pelo SDK a partir do Zod). Sem schema, sem PR.
6. **Cache + retry no cliente.** Use `brasilApi.get(...)`. Não chame `fetch` direto numa tool — você perde cache, retry e timeout.
7. **Idioma**: código, comentários, descrições e mensagens de erro em PT-BR. README bilíngue PT/EN.

## Estilo de commit

Seguimos formato Conventional-ish, em PT:

```
feat: adiciona tool consultar_xyz
fix: trata 429 da BrasilAPI sem vazar prefix interno
test: cobre cenário de cache miss
docs: atualiza README com nova tool
chore: bump dep X
```

Mensagem de commit sem emoji. Corpo do commit (linhas após a 1ª) explica **por que**, não o que.

## Code review

PRs são revisados pelo @alanpcf. Critérios:

- Atende aos 7 princípios acima.
- Testes incluídos cobrindo o caminho feliz + erro principal.
- `npm run lint && npm test && npm run build` passam local e no CI.
- Mudança documentada no README quando afeta UX/tools.

## Dúvidas

Abra uma issue ou comente no PR. Resposta usual em 1-3 dias úteis.
