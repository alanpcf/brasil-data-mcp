import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { brasilApi } from "../../src/clients/brasilapi.js";
import {
  consultarMunicipiosHandler,
  listarEstadosHandler,
} from "../../src/tools/ibge.js";

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

describe("listarEstadosHandler", () => {
  it("retorna a lista de UFs", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        fakeResponse([
          {
            id: 11,
            sigla: "RO",
            nome: "Rondônia",
            regiao: { id: 1, sigla: "N", nome: "Norte" },
            capital: "Porto Velho",
          },
          {
            id: 35,
            sigla: "SP",
            nome: "São Paulo",
            regiao: { id: 3, sigla: "SE", nome: "Sudeste" },
            capital: "São Paulo",
          },
        ]),
      ),
    );

    const r = await listarEstadosHandler({});

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload).toHaveLength(2);
    expect(payload[1].sigla).toBe("SP");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/ibge/uf/v1");
  });

  it("traduz 404 em mensagem útil", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeResponse({ msg: "not found" }, 404)),
    );

    const r = await listarEstadosHandler({});

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain(
      "não disponível",
    );
  });
});

describe("consultarMunicipiosHandler", () => {
  it("retorna municípios da UF", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        fakeResponse([
          { nome: "ACRELÂNDIA", codigo_ibge: "1200013" },
          { nome: "RIO BRANCO", codigo_ibge: "1200401" },
        ]),
      ),
    );

    const r = await consultarMunicipiosHandler({ uf: "AC" });

    expect(r.isError).toBeUndefined();
    const payload = JSON.parse((r.content[0] as { text: string }).text);
    expect(payload[1].codigo_ibge).toBe("1200401");

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/ibge/municipios/v1/AC");
  });

  it("normaliza sigla minúscula pra mesma URL", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(fakeResponse([])));

    const r = await consultarMunicipiosHandler({ uf: " sp " });

    expect(r.isError).toBeUndefined();
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/ibge/municipios/v1/SP");
  });

  it("rejeita UF inexistente sem chamar a rede", async () => {
    const r = await consultarMunicipiosHandler({ uf: "XX" });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain("UF inválida");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("traduz 404 em mensagem útil", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(fakeResponse({ msg: "not found" }, 404)),
    );

    const r = await consultarMunicipiosHandler({ uf: "RJ" });

    expect(r.isError).toBe(true);
    expect((r.content[0] as { text: string }).text).toContain(
      "não encontrados",
    );
  });
});
