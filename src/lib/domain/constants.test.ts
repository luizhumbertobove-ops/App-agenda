import { describe, expect, it } from "vitest";
import { hasWhatsapp, isOpenPayment, NO_PHONE } from "./constants";

describe("hasWhatsapp", () => {
  it("sentinela, vazio e nulo não têm WhatsApp", () => {
    expect(hasWhatsapp(NO_PHONE)).toBe(false);
    expect(hasWhatsapp("")).toBe(false);
    expect(hasWhatsapp("   ")).toBe(false);
    expect(hasWhatsapp(null)).toBe(false);
    expect(hasWhatsapp(undefined)).toBe(false);
  });
  it("número real tem", () => expect(hasWhatsapp("5511988887777")).toBe(true));
});

describe("isOpenPayment", () => {
  it("em aberto inclui vencida; paga e cancelada não", () => {
    expect(isOpenPayment("OVERDUE")).toBe(true);
    expect(isOpenPayment("PENDING")).toBe(true);
    expect(isOpenPayment("PAID")).toBe(false);
    expect(isOpenPayment("CANCELLED")).toBe(false);
  });
});
