import { describe, expect, it } from "vitest";
import { dateKeyBR, formatTimeBR, TZ_BR } from "./date";

describe("datas em Brasília", () => {
  it("fuso", () => expect(TZ_BR).toBe("America/Sao_Paulo"));
  it("perto da meia-noite cai no dia anterior", () => {
    const d = new Date("2030-03-05T02:30:00Z");
    expect(dateKeyBR(d)).toBe("2030-03-04");
    expect(formatTimeBR(d)).toBe("23:30");
  });
});