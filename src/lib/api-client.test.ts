import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, DEFAULT_API_ERROR, OFFLINE_API_ERROR } from "./api-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(response: Response | (() => Promise<Response>)) {
  const fn = vi.fn(
    typeof response === "function" ? response : async () => response,
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("apiRequest", () => {
  it("ok com JSON devolve data", async () => {
    mockFetch(new Response(JSON.stringify({ id: "1" }), { status: 200 }));

    const result = await apiRequest<{ id: string }>("/api/x");

    expect(result).toEqual({ ok: true, data: { id: "1" } });
  });

  it("ok sem corpo devolve data null", async () => {
    mockFetch(new Response(null, { status: 204 }));

    const result = await apiRequest("/api/x", { method: "DELETE" });

    expect(result).toEqual({ ok: true, data: null });
  });

  it("409 com error string usa a mensagem da API", async () => {
    mockFetch(
      new Response(JSON.stringify({ error: "Horário já ocupado" }), {
        status: 409,
      }),
    );

    const result = await apiRequest("/api/x", { method: "PATCH", body: {} });

    expect(result).toEqual({
      ok: false,
      error: "Horário já ocupado",
      status: 409,
    });
  });

  it("400 com objeto do zod usa a mensagem padrão", async () => {
    mockFetch(
      new Response(
        JSON.stringify({
          error: { formErrors: [], fieldErrors: { nome: ["obrigatório"] } },
        }),
        { status: 400 },
      ),
    );

    const result = await apiRequest("/api/x", { method: "POST", body: {} });

    expect(result).toEqual({
      ok: false,
      error: DEFAULT_API_ERROR,
      status: 400,
    });
  });

  it("500 com HTML usa a mensagem padrão (ou a fallbackError passada)", async () => {
    mockFetch(new Response("<html>Erro</html>", { status: 500 }));
    const padrao = await apiRequest("/api/x", { method: "POST", body: {} });
    expect(padrao).toEqual({
      ok: false,
      error: DEFAULT_API_ERROR,
      status: 500,
    });

    mockFetch(new Response("<html>Erro</html>", { status: 500 }));
    const customizada = await apiRequest(
      "/api/x",
      { method: "POST", body: {} },
      "Não foi possível salvar.",
    );
    expect(customizada).toEqual({
      ok: false,
      error: "Não foi possível salvar.",
      status: 500,
    });
  });

  it("sem conexão: status 0 e mensagem de conexão", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    const result = await apiRequest("/api/x", { method: "DELETE" });

    expect(result).toEqual({ ok: false, status: 0, error: OFFLINE_API_ERROR });
  });

  it("body vira JSON com Content-Type", async () => {
    const fetchMock = mockFetch(new Response(null, { status: 200 }));
    const body = { nome: "Ana", tags: ["a"] };

    await apiRequest("/api/clientes", { method: "PATCH", body });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/clientes");
    expect(init.method).toBe("PATCH");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(init.body).toBe(JSON.stringify(body));
  });
});
