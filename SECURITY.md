# Política de Segurança

## Versões suportadas

A versão atual do `brasil-data-mcp` recebe correções de segurança. Versões antigas (0.0.x ou anteriores ao último minor) não recebem patches retroativos enquanto o projeto estiver em 0.x.

| Versão | Suporte |
| ------ | ------- |
| 0.1.x  | ✅      |
| < 0.1  | ❌      |

Após o release 1.0, manteremos suporte ao último major + minor anterior por 90 dias.

## Reportando uma vulnerabilidade

**Não abra issue pública pra vulnerabilidade.** Em vez disso:

1. Use o canal privado de [GitHub Security Advisories](https://github.com/alanpcf/brasil-data-mcp/security/advisories/new)
2. Ou envie e-mail pra **alanpcf87@gmail.com** com o assunto começando em `[security]`

Inclua:

- Descrição do vetor de ataque
- Versão afetada
- Passo a passo de reprodução
- Impacto potencial (RCE, vazamento de dados, DoS, etc)
- Sugestão de mitigação se você tiver

## O que esperar

- **Confirmação de recebimento**: até 72h.
- **Avaliação inicial**: até 7 dias.
- **Patch + disclosure**: depende da severidade. Críticos (RCE, vazamento de credencial) priorizamos pra dias; severidade média pode levar 2-3 semanas.
- **Crédito**: te citamos no advisory público quando publicar (a menos que prefira anonimato).

## Escopo

Vulnerabilidades de interesse:

- Injeção / RCE no servidor MCP
- Vazamento de dados de outros usuários (não aplicável hoje — o servidor é stateless e não retém PII)
- Manipulação de respostas pra induzir o LLM a tomar ação errada (prompt injection via dados retornados pela BrasilAPI)
- Bypass do canal MCP (escrita em `stdout` corrompendo protocolo)

Fora de escopo:

- Vulnerabilidades nas APIs upstream (Receita Federal, BACEN, ViaCEP, BrasilAPI) — reporte diretamente à fonte.
- Disponibilidade de dados públicos brasileiros (cabeu à BrasilAPI/upstream).
- Ataques que exigem acesso físico à máquina do usuário.
