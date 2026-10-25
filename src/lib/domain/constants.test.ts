import { describe, expect, it } from "vitest";
import { hasWhatsapp, NO_PHONE } from "./constants";

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