import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cpfcnpj } from "../../src/clients/cpfcnpj.js";
import { consultarCpfHandler } from "../../src/tools/cpf.js";

function fakeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const TOKEN = "TOKEN_DE_TESTE_1234567890";

describe("consultar_cpf", () => {
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

  it("completo=false consulta o pacote 1 e devolve JSON", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        fakeResponse({ status: 1, cpf: "000.000.000-00", nome: "Test Token" }),
      ),
    );

    const r = await consultarCpfHandler({ cpf: "111.444.777-35", completo: false });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.nome).toBe("Test Token");
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`/${TOKEN}/1/11144477735`);
  });

  it("completo=true consulta o pacote 3", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        fakeResponse({ status: 1, nome: "Test Token", nascimento: "31/12/1900" }),
      ),
    );

    await consultarCpfHandler({ cpf: "11144477735", completo: true });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`/${TOKEN}/3/11144477735`);
  });

  it("máscara e sem máscara geram a mesma URL", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeResponse({ status: 1, nome: "Test Token" })),
    );

    await consultarCpfHandler({ cpf: "111.444.777-35", completo: false });
    cpfcnpj.clearCache();
    await consultarCpfHandler({ cpf: "11144477735", completo: false });

    expect(fetchMock.mock.calls[0][0]).toBe(fetchMock.mock.calls[1][0]);
  });

  it("CPF válido mas inexistente (102) traduz para não localizado", async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse({ status: 0, erro: "não existe", erroCodigo: 102 }),
    );

    const r = await consultarCpfHandler({ cpf: "11144477735", completo: false });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain(
      "não localizado nas bases da Receita Federal",
    );
  });

  it("rejeita CPF inválido sem chamar a rede", async () => {
    const r = await consultarCpfHandler({ cpf: "11111111111", completo: false });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain("CPF inválido");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
