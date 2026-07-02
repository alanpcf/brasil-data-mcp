import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { brasilApi } from "../../src/clients/brasilapi.js";
import { consultarDominioBrHandler } from "../../src/tools/dominio.js";

function fakeResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  brasilApi.clearCache();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const REGISTRADO = {
  status_code: 2,
  status: "REGISTERED",
  fqdn: "exemplo.com.br",
  hosts: ["ns1.exemplo.com.br"],
  "publication-status": "published",
  "expires-at": "2027-05-18T00:00:00-03:00",
};

describe("consultarDominioBrHandler", () => {
  it("consulta domínio .br registrado", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeResponse(REGISTRADO)),
    );

    const r = await consultarDominioBrHandler({ dominio: "exemplo.com.br" });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload.status).toBe("REGISTERED");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/registrobr/v1/exemplo.com.br");
  });

  it("normaliza URL completa pra domínio puro na mesma URL", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeResponse(REGISTRADO)),
    );

    const r = await consultarDominioBrHandler({
      dominio: "https://www.Exemplo.com.br/pagina?x=1",
    });

    expect(r.isError).toBeUndefined();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/registrobr/v1/exemplo.com.br");
  });

  it("rejeita domínio não-.br sem chamar a rede", async () => {
    // A API aceitaria 'google.com' e responderia sobre 'google.com.br' —
    // a validação local existe justamente pra não responder sobre outro
    // domínio.
    const r = await consultarDominioBrHandler({ dominio: "google.com" });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain(
      "só consulta domínios .br",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejeita entrada vazia ou malformada sem chamar a rede", async () => {
    for (const ruim of ["  ", "..br", "-invalido-.com.br", ".br"]) {
      const r = await consultarDominioBrHandler({ dominio: ruim });
      expect(r.isError).toBe(true);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("não cacheia: duas chamadas seguidas batem na rede duas vezes", async () => {
    // mockImplementation: Response fresco por chamada (body só lê 1x).
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeResponse(REGISTRADO)),
    );

    await consultarDominioBrHandler({ dominio: "exemplo.com.br" });
    await consultarDominioBrHandler({ dominio: "exemplo.com.br" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("traduz 404 em mensagem útil", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeResponse({ msg: "not found" }, 404)),
    );

    const r = await consultarDominioBrHandler({ dominio: "exemplo.com.br" });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain(
      "não encontrado",
    );
  });
});
