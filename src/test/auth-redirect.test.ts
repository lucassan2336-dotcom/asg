import { describe, expect, it } from "vitest";
import { checkPasswordRequirements, getPasswordValidationError, safeRedirect } from "@/lib/auth";

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

describe("checkPasswordRequirements", () => {
  it("valida todos os 4 requisitos de senha", () => {
    expect(checkPasswordRequirements("Skate@1")).toEqual({
      minLength: true,
      hasUppercase: true,
      hasSpecialChar: true,
      hasNumber: true,
      isValid: true,
    });
    expect(getPasswordValidationError("Skate@1")).toBeNull();
  });

  it("identifica requisitos ausentes na criação de senha", () => {
    expect(checkPasswordRequirements("skate1").hasUppercase).toBe(false);
    expect(checkPasswordRequirements("Skate1").hasSpecialChar).toBe(false);
    expect(checkPasswordRequirements("Skate@").hasNumber).toBe(false);
    expect(checkPasswordRequirements("Sk@1").minLength).toBe(false);
    expect(getPasswordValidationError("abc")).toContain("mínimo de 6 dígitos");
    expect(getPasswordValidationError("abc")).toContain("pelo menos 1 letra maiúscula");
    expect(getPasswordValidationError("abc")).toContain("caracteres especiais");
    expect(getPasswordValidationError("abc")).toContain("pelo menos 1 número");
  });
});
