// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { computeFinancialSummary, toCents, fromCents, formatBRL } from "../lib/finance";

const db = new PGlite();

const directorId = "30000000-0000-0000-0000-000000000001";
const memberId = "30000000-0000-0000-0000-000000000002";
const categoryId = "40000000-0000-0000-0000-000000000001";

async function asUser(id: string | null) {
  await db.exec(
    `RESET ROLE; SET ROLE ${id ? "authenticated" : "anon"}; SELECT set_config('request.jwt.claim.sub', '${id ?? ""}', false);`,
  );
}

async function queryValue<T = any>(sql: string): Promise<T> {
  const res = await db.query<{ val: T }>(sql);
  return res.rows[0]?.val as T;
}

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
  `);

  for (const file of [
    "0000_asg_core_schema",
    "0001_restrict_security_definer_execute",
    "0002_revoke_public_execute_on_functions",
    "0004_membership_private_review_and_validation",
    "0005_financial_management_expansion",
    "0006_site_pages_editable_by_diretoria",
    "0007_security_and_integrity_hardening",
  ]) {
    await db.exec(readFileSync(`drizzle/migrations/${file}.sql`, "utf8"));
  }

  // Create users
  await db.exec(`
    INSERT INTO auth.users(id, email, email_confirmed_at) VALUES
      ('${directorId}', 'diretoria@asg.invalid', now()),
      ('${memberId}', 'associado@asg.invalid', now());

    INSERT INTO public.user_roles(user_id, role) VALUES
      ('${directorId}', 'diretoria'),
      ('${memberId}', 'associado');

    INSERT INTO public.financial_categories(id, name, kind) VALUES
      ('${categoryId}', 'Geral', 'receita');
  `);
}, 30000);

afterAll(async () => {
  await db.close();
});

describe.sequential("Módulo de Gestão Financeira da A.S.G.", () => {
  it("Segurança: anônimo e associado comum não acessam finanças", async () => {
    // 1. Usuário anônimo sem login
    await asUser(null);
    await expect(db.query("SELECT * FROM public.financial_transactions")).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      db.query(`SELECT public.cancel_financial_transaction('${crypto.randomUUID()}', 'teste')`),
    ).rejects.toThrow(/permission denied/);

    // 2. Associado comum (não diretoria)
    await asUser(memberId);
    expect(
      await queryValue<number>("SELECT count(*)::int AS val FROM public.financial_transactions"),
    ).toBe(0);
    await expect(
      db.exec(`
        INSERT INTO public.financial_transactions(entry_type, description, amount, occurred_on, status)
        VALUES ('receita', 'Tentativa não autorizada', 100.00, current_date, 'recebido')
      `),
    ).rejects.toThrow();
    await expect(
      db.query(`SELECT public.cancel_financial_transaction('${crypto.randomUUID()}', 'teste')`),
    ).rejects.toThrow(/Acesso negado/);
  });

  it("Criação dos 7 casos de lançamentos pela diretoria", async () => {
    await asUser(directorId);

    // 1. Receita recebida (R$ 150,00)
    await db.exec(`
      INSERT INTO public.financial_transactions(id, entry_type, description, amount, occurred_on, settlement_date, status, payment_method)
      VALUES ('50000000-0000-0000-0000-000000000001', 'receita', 'Mensalidade Associado', 150.00, '2026-10-01', '2026-10-01', 'recebido', 'PIX');
    `);

    // 2. Doação recebida (R$ 200,00)
    await db.exec(`
      INSERT INTO public.financial_transactions(id, entry_type, description, amount, occurred_on, settlement_date, status, payment_method, donor_name)
      VALUES ('50000000-0000-0000-0000-000000000002', 'doacao', 'Doação Apoio Skatepark', 200.00, '2026-10-05', '2026-10-05', 'recebido', 'Transferência Bancária (TED/DOC)', 'Apoiador Benfeitor');
    `);

    // 3. Despesa paga (R$ 80,00)
    await db.exec(`
      INSERT INTO public.financial_transactions(id, entry_type, description, amount, occurred_on, settlement_date, status, payment_method)
      VALUES ('50000000-0000-0000-0000-000000000003', 'despesa', 'Compra de Parafusos e Lixas', 80.00, '2026-10-10', '2026-10-10', 'pago', 'PIX');
    `);

    // 4. Receita pendente (R$ 100,00)
    await db.exec(`
      INSERT INTO public.financial_transactions(id, entry_type, description, amount, occurred_on, status, payment_method)
      VALUES ('50000000-0000-0000-0000-000000000004', 'receita', 'Inscrição Campeonato Pendente', 100.00, '2026-10-15', 'pendente', 'Boleto Bancário');
    `);

    // 5. Despesa pendente (R$ 50,00)
    await db.exec(`
      INSERT INTO public.financial_transactions(id, entry_type, description, amount, occurred_on, status, payment_method)
      VALUES ('50000000-0000-0000-0000-000000000005', 'despesa', 'Troféus a Pagar', 50.00, '2026-10-20', 'pendente', 'Boleto Bancário');
    `);

    // 6. Lançamento cancelado com justificativa (R$ 70,00)
    await db.exec(`
      INSERT INTO public.financial_transactions(id, entry_type, description, amount, occurred_on, status, cancellation_reason)
      VALUES ('50000000-0000-0000-0000-000000000006', 'receita', 'Lançamento Errado Cancelado', 70.00, '2026-10-12', 'cancelado', 'Cancelamento por duplicidade');
    `);

    // 7. Lançamento inicial de R$ 30,00 seguido de estorno formal
    await db.exec(`
      INSERT INTO public.financial_transactions(id, entry_type, description, amount, occurred_on, settlement_date, status, payment_method)
      VALUES ('50000000-0000-0000-0000-000000000007', 'receita', 'Pagamento Duplicado a Estornar', 30.00, '2026-10-18', '2026-10-18', 'recebido', 'PIX');
    `);

    // Executa estorno formal via RPC
    const reversalId = (
      await db.query<{ reverse_financial_transaction: string }>(
        `SELECT public.reverse_financial_transaction('50000000-0000-0000-0000-000000000007', 'Devolução de cobrança duplicada ao associado')`,
      )
    ).rows[0]?.reverse_financial_transaction;

    expect(reversalId).toBeTruthy();

    // Verifica que o estorno foi gerado como despesa paga de R$ 30,00
    const revRow = (
      await db.query<{
        entry_type: string;
        amount: number;
        status: string;
        is_reversal: boolean;
        original_transaction_id: string;
      }>(
        `SELECT entry_type, amount, status, is_reversal, original_transaction_id FROM public.financial_transactions WHERE id = '${reversalId}'`,
      )
    ).rows[0];

    expect(revRow?.entry_type).toBe("despesa");
    expect(Number(revRow?.amount)).toBe(30.0);
    expect(revRow?.status).toBe("pago");
    expect(revRow?.is_reversal).toBe(true);
    expect(revRow?.original_transaction_id).toBe("50000000-0000-0000-0000-000000000007");
  });

  it("Cálculo exato de saldo, distinção de doações e isolamento de pendências e cancelamentos", async () => {
    await asUser(directorId);

    const summary = (
      await db.query<{
        opening_balance: string;
        received_revenues: string;
        received_donations: string;
        paid_expenses: string;
        net_cash_flow: string;
        calculated_balance: string;
        pending_receivables: string;
        pending_payables: string;
      }>(`SELECT * FROM public.get_financial_summary('2026-10-01'::date, '2026-10-31'::date)`)
    ).rows[0];

    expect(summary).toBeTruthy();

    const openBal = Number(summary?.opening_balance);
    const recRev = Number(summary?.received_revenues);
    const recDon = Number(summary?.received_donations);
    const paidExp = Number(summary?.paid_expenses);
    const netCash = Number(summary?.net_cash_flow);
    const calcBal = Number(summary?.calculated_balance);
    const pendRec = Number(summary?.pending_receivables);
    const pendPay = Number(summary?.pending_payables);

    // 1. Saldo inicial (antes de 01/10/2026): R$ 0,00
    expect(openBal).toBe(0.0);

    // 2. Receitas recebidas: R$ 150,00 (Mensalidade) + R$ 30,00 (Pagamento duplicado) = R$ 180,00
    expect(recRev).toBe(180.0);

    // 3. Doações recebidas: R$ 200,00 (DISTINTA de receitas, não somada duas vezes)
    expect(recDon).toBe(200.0);

    // 4. Despesas pagas: R$ 80,00 (Parafusos) + R$ 30,00 (Estorno da duplicata) = R$ 110,00
    expect(paidExp).toBe(110.0);

    // 5. Fluxo líquido do período: (180 + 200) - 110 = 270,00
    expect(netCash).toBe(270.0);

    // 6. Saldo calculado final: 0 + 270 = R$ 270,00
    expect(calcBal).toBe(270.0);

    // 7. Pendências a receber: R$ 100,00 (não contabilizadas no saldo efetivo)
    expect(pendRec).toBe(100.0);

    // 8. Pendências a pagar: R$ 50,00 (não contabilizadas no saldo efetivo)
    expect(pendPay).toBe(50.0);

    // 9. Cancelados: R$ 70,00 foi totalmente ignorado do saldo e das pendências!
    expect(calcBal).not.toBe(340.0); // 270 + 70
    expect(pendRec).not.toBe(170.0); // 100 + 70
  });

  it("Paridade exata com o cálculo em centavos do frontend", async () => {
    await asUser(directorId);

    const { rows } = await db.query<any>(`
      SELECT
        id,
        entry_type,
        description,
        amount,
        amount_cents,
        occurred_on::text AS occurred_on,
        settlement_date::text AS settlement_date,
        payment_method,
        status,
        donor_name,
        notes,
        cancellation_reason,
        is_reversal
      FROM public.financial_transactions
    `);

    const clientSummary = computeFinancialSummary(
      rows.map((r: any) => ({
        ...r,
        amount: Number(r.amount),
        amount_cents: Number(r.amount_cents),
      })),
      "2026-10-01",
      "2026-10-31",
    );

    expect(clientSummary.openingBalance).toBe(0.0);
    expect(clientSummary.receivedRevenues).toBe(180.0);
    expect(clientSummary.receivedDonations).toBe(200.0);
    expect(clientSummary.paidExpenses).toBe(110.0);
    expect(clientSummary.netCashFlow).toBe(270.0);
    expect(clientSummary.calculatedBalance).toBe(270.0);
    expect(clientSummary.pendingReceivables).toBe(100.0);
    expect(clientSummary.pendingPayables).toBe(50.0);
  });

  it("Auditoria e Imutabilidade: registros de cancelamento/estorno gravados e deleção física bloqueada", async () => {
    await asUser(directorId);

    const audits = (
      await db.query<{ action: string; table_name: string }>(
        `SELECT action, table_name FROM public.audit_logs WHERE table_name = 'financial_transactions'`,
      )
    ).rows;

    expect(audits.some((a) => a.action === "estornar_lancamento_financeiro")).toBe(true);

    // Tentativa de exclusão física via sessão autenticada (mesmo diretoria) é bloqueada
    await expect(
      db.exec(
        `DELETE FROM public.financial_transactions WHERE id = '50000000-0000-0000-0000-000000000001'`,
      ),
    ).rejects.toThrow();

    // Tentativa de adulterar lançamento já cancelado é bloqueada
    await expect(
      db.exec(
        `UPDATE public.financial_transactions SET amount = 999.00 WHERE id = '50000000-0000-0000-0000-000000000006'`,
      ),
    ).rejects.toThrow(/cancelados são imutáveis/);

    // Tentativa de adulterar lançamento que já possui estorno ativo é bloqueada
    await expect(
      db.exec(
        `UPDATE public.financial_transactions SET amount = 500.00 WHERE id = '50000000-0000-0000-0000-000000000007'`,
      ),
    ).rejects.toThrow(/estorno ativo/);

    // Validação de anexos contra path traversal
    await expect(
      db.exec(`
        INSERT INTO public.financial_attachments(transaction_id, storage_path, file_name, mime_type, size_bytes)
        VALUES ('50000000-0000-0000-0000-000000000001', '../secret/file.pdf', 'file.pdf', 'application/pdf', 1024)
      `),
    ).rejects.toThrow();
  });

  it("Limpeza administrativa (ambiente de teste): apagar os dados de teste antes da entrada em produção", async () => {
    await db.exec("RESET ROLE;");
    await db.exec(`
      ALTER TABLE public.financial_transactions DISABLE TRIGGER trg_prevent_financial_tx_delete;
      DELETE FROM public.financial_transactions WHERE id::text LIKE '50000000-%' OR is_reversal = true;
      ALTER TABLE public.financial_transactions ENABLE TRIGGER trg_prevent_financial_tx_delete;
    `);

    const count = await queryValue<number>(
      "SELECT count(*)::int AS val FROM public.financial_transactions",
    );
    expect(count).toBe(0);
  });
});
