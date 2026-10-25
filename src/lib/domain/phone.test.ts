import { describe, expect, it } from "vitest";
import { isValidPhone, normalizePhone, phoneVariants } from "./phone";
import { NO_PHONE } from "./constants";

describe("normalizePhone", () => {
  it("celular com máscara, +55, zero de operadora ou 55 vira o mesmo número", () => {
    expect(normalizePhone("(11) 98888-7777")).toBe("5511988887777");
    expect(normalizePhone("+55 11 98888-7777")).toBe("5511988887777");
    expect(normalizePhone("011988887777")).toBe("5511988887777");
    expect(normalizePhone("5511988887777")).toBe("5511988887777");
  });

  it("sentinela do cadastro sem WhatsApp continua sentinela", () => {
    expect(normalizePhone(NO_PHONE)).toBe(NO_PHONE);
  });

  it("número de outro país com + não ganha 55", () => {
    expect(normalizePhone("+1 555 123 4567")).toBe("15551234567");
    expect(normalizePhone("+34 612 345 678")).toBe("34612345678");
    expect(normalizePhone("+55 11 98888-7777")).toBe("5511988887777");
  });
});

describe("isValidPhone", () => {
  it("aceita brasileiro com 55, estrangeiro e o sentinela", () => {
    expect(isValidPhone("5511988887777")).toBe(true);
    expect(isValidPhone("551133334444")).toBe(true);
    expect(isValidPhone("15551234567")).toBe(true);
    expect(isValidPhone(NO_PHONE)).toBe(true);
  });
  it("recusa número curto ou vazio", () => {
    expect(isValidPhone(normalizePhone("(11) 9888-7"))).toBe(false);
    expect(isValidPhone(normalizePhone("(  )  -    "))).toBe(false);
    expect(isValidPhone("55123")).toBe(false);
  });

  it("fixo sem 55 ganha o 55", () => {
    expect(normalizePhone("1133334444")).toBe("551133334444");
  });
});

describe("phoneVariants", () => {
  it("devolve o normalizado e a forma sem o 55, sem repetir", () => {
    expect(phoneVariants("11988887777")).toEqual(["5511988887777", "11988887777"]);
    expect(phoneVariants("5511988887777")).toEqual(["5511988887777", "11988887777"]);
  });
  it("nunca inclui o sentinela", () => {
    expect(phoneVariants("5500000000000")).not.toContain(NO_PHONE);
    expect(phoneVariants(NO_PHONE)).toEqual([]);
  });
});
