import { describe, expect, it } from "vitest";
import { safeRedirect } from "@/lib/auth";

describe("safeRedirect", () => {
  it("aceita caminhos internos", () => {
    expect(safeRedirect("/associe-se")).toBe("/associe-se");
    expect(safeRedirect("/area?aba=avisos")).toBe("/area?aba=avisos");
  });

  it("usa o destino padrão quando não há alvo", () => {
    expect(safeRedirect(undefined)).toBe("/area");
    expect(safeRedirect("")).toBe("/area");
  });

  it("bloqueia endereços externos e protocol-relative", () => {
    expect(safeRedirect("https://site-malicioso.com")).toBe("/area");
    expect(safeRedirect("//site-malicioso.com")).toBe("/area");
    expect(safeRedirect("javascript:alert(1)")).toBe("/area");
  });
});
