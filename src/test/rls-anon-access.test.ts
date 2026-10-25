import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Cliente anônimo, sem sessão: simula chamadas diretas à API por alguém
// sem login tentando ler ou alterar dados privados.
const url = import.meta.env["VITE_SUPABASE_URL"] as string;
const anonKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

describe("RLS: acesso anônimo direto à API", () => {
  it("não lê lançamentos financeiros", async () => {
    const { data, error } = await anon.from("financial_transactions").select("*");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("não lê solicitações de associação", async () => {
    const { data, error } = await anon.from("membership_applications").select("*");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("não lê perfis de usuários", async () => {
    const { data, error } = await anon.from("profiles").select("*");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("não lê registros de auditoria", async () => {
    const { data, error } = await anon.from("audit_logs").select("*");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("não lê papéis de usuários", async () => {
    const { data, error } = await anon.from("user_roles").select("*");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("não insere avisos", async () => {
    const { error } = await anon.from("announcements").insert({ title: "x", body: "x" });
    expect(error).not.toBeNull();
  });

  it("não insere eventos", async () => {
    const { error } = await anon.from("events").insert({ title: "x" });
    expect(error).not.toBeNull();
  });

  it("não lista arquivos do bucket privado de comprovantes", async () => {
    const { data, error } = await anon.storage.from("comprovantes").list();
    // Sem sessão: ou erro de permissão, ou lista vazia — nunca arquivos.
    if (error) {
      expect(error).toBeTruthy();
    } else {
      expect(data).toEqual([]);
    }
  });
});
