# Post de lançamento — LinkedIn

> Tom: storytelling de problema. ~1750 chars (dentro do limite confortável do LinkedIn).
> Imagem sugerida: screenshot do Claude Desktop perguntando algo tipo "qual a razão social do CNPJ 33.000.167/0001-01?" e mostrando a resposta da tool.

---

🇧🇷 Toda ferramenta de IA é treinada e demonstrada com dados americanos.

ZIP code. EIN. FedEx tracking. Quando você quer perguntar pro seu assistente "me dá o cadastro desse CNPJ" ou "esse CEP é em qual cidade?", cai em scraping, monta integração HTTP no braço, ou desiste.

Saco.

Acabei de publicar o **brasil-data-mcp** — um servidor MCP (Model Context Protocol) que conecta qualquer assistente de IA compatível (Claude Desktop, Claude Code, Cursor, Windsurf) aos dados públicos brasileiros, sem chave de API, sem auth, sem scraping.

**10 tools cobrindo:**
→ CNPJ (Receita Federal — razão social, situação, sócios, CNAE)
→ CEP (endereço completo)
→ Bancos brasileiros (BACEN — código COMPE, ISPB)
→ Feriados nacionais (inclui Carnaval e Páscoa)
→ DDD (estado + cidades)
→ ISBN (metadados de livro)
→ Taxas econômicas (SELIC, CDI, IPCA)
→ Corretoras de valores (CVM)

**+ 2 prompts MCP** (workflows guiados que aparecem como atalho no cliente):
→ `analise-cnpj` — recebe CNPJ, retorna análise interpretada (setor, idade, situação)
→ `panorama-economico` — combina taxas vigentes + próximos feriados num snapshot

Como instalar (1 minuto):

→ Claude Desktop: cola 4 linhas no claude_desktop_config.json
→ Claude Code: `claude mcp add brasil-data -- npx -y brasil-data-mcp`
→ Cursor / Windsurf: idem Claude Desktop, no .cursor/mcp.json

Passo a passo por cliente: https://github.com/alanpcf/brasil-data-mcp#-instalação--installation

Reinicia o cliente. Pronto. Pergunta em português natural e ele chama a tool certa.

Por baixo dos panos é a [BrasilAPI](https://brasilapi.com.br) — projeto open source que unifica dados oficiais brasileiros com cache e baixa latência. Meu papel foi traduzir isso pro protocolo MCP e empacotar as descrições em PT pra que o LLM saiba quando chamar cada tool.

**Stack:** TypeScript, Zod, Vitest. 59 testes, cobertura 95%. MIT. Sem chave, sem rate limit hostil, sem você precisar criar conta em nada.

Se você é dev BR e usa LLM no dia a dia, esse é o caminho mais curto pra deixar seu assistente falando "português de dado público brasileiro".

📦 npm: https://www.npmjs.com/package/brasil-data-mcp
💻 GitHub: https://github.com/alanpcf/brasil-data-mcp
📚 Glama: https://glama.ai/mcp/servers/alanpcf/brasil-data-mcp

Issues, sugestões e PRs muito bem-vindos. Próxima leva inclui FIPE (assim que a API upstream estabilizar), CVM fundos, e mais prompts conforme a demanda.

#DevBR #MCP #IA #Claude #BrasilAPI #OpenSource #TypeScript
