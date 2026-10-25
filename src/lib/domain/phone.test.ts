import { describe, expect, it } from "vitest";
import { normalizePhone, phoneVariants } from "./phone";

describe("normalizePhone", () => {
  it("celular com máscara, +55, zero de operadora ou 55 vira o mesmo número", () => {
    expect(normalizePhone("(11) 98888-7777")).toBe("5511988887777");
    expect(normalizePhone("+55 11 98888-7777")).toBe("5511988887777");
    expect(normalizePhone("011988887777")).toBe("5511988887777");
    expect(normalizePhone("5511988887777")).toBe("5511988887777");
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
});
