import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cpfcnpj } from "../../src/clients/cpfcnpj.js";
import { consultarInscricaoEstadualHandler } from "../../src/tools/inscricao-estadual.js";

function fakeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const TOKEN = "TOKEN_DE_TESTE_1234567890";

const respostaPacote16 = {
  status: 1,
  cnpj: "11.222.333/0001-81",
  razao: "TOKEN TEST LTDA",
  inscricoesEstaduais: [
    {
      inscricao_estadual: "0010101010101",
      ativo: true,
      atualizado_em: "2023-10-03T03:00:00.000Z",
      estado: { id: 11, nome: "Minas Gerais", sigla: "MG", ibge_id: 31 },
    },
  ],
};

describe("consultar_inscricao_estadual", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cpfcnpj.clearCache();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("CPFCNPJ_TOKEN", TOKEN);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("retorna cnpj, razão e lista de inscrições no pacote 16", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeResponse(respostaPacote16)),
    );

    const r = await consultarInscricaoEstadualHandler({ cnpj: "11222333000181" });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.razao).toBe("TOKEN TEST LTDA");
    expect(payload.inscricoesEstaduais).toHaveLength(1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`/${TOKEN}/16/11222333000181`);
  });

  it("filtra por UF quando a UF existe", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeResponse(respostaPacote16)),
    );

    const r = await consultarInscricaoEstadualHandler({
      cnpj: "11222333000181",
      uf: "mg",
    });

    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.inscricoesEstaduais).toHaveLength(1);
    expect(payload.mensagem).toBeUndefined();
  });

  it("UF sem inscrição: lista vazia com mensagem, não é erro", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeResponse(respostaPacote16)),
    );

    const r = await consultarInscricaoEstadualHandler({
      cnpj: "11222333000181",
      uf: "SP",
    });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.inscricoesEstaduais).toHaveLength(0);
    expect(payload.mensagem).toContain("Nenhuma inscrição estadual");
  });

  it("rejeita CNPJ inválido sem chamar a rede", async () => {
    const r = await consultarInscricaoEstadualHandler({ cnpj: "11111111111111" });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain("CNPJ inválido");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejeita UF malformada sem chamar a rede", async () => {
    const r = await consultarInscricaoEstadualHandler({
      cnpj: "11222333000181",
      uf: "MGG",
    });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain("UF inválida");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
