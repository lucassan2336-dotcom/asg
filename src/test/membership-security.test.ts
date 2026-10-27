// @vitest-environment node
// Isolated PostgreSQL tests: no live account, approval or email is created.
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { membershipSchema } from "../lib/membership";

const db = new PGlite();
const applicant = "10000000-0000-0000-0000-000000000001";
const other = "10000000-0000-0000-0000-000000000002";
const board = "10000000-0000-0000-0000-000000000003";
const request = "20000000-0000-0000-0000-000000000001";
async function asUser(id: string | null) {
  await db.exec(
    `RESET ROLE; SET ROLE ${id ? "authenticated" : "anon"}; SELECT set_config('request.jwt.claim.sub', '${id ?? ""}', false);`,
  );
}
async function value(sql: string) {
  return (await db.query<{ value: number }>(sql)).rows[0]?.value;
}
beforeAll(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
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
    "0008_member_and_role_management",
  ]) {
    await db.exec(readFileSync(`drizzle/migrations/${file}.sql`, "utf8"));
  }
  await db.exec(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
    ('${applicant}','applicant@example.invalid',now()),('${other}','other@example.invalid',now()),('${board}','board@example.invalid',now());
    INSERT INTO public.user_roles(user_id,role) VALUES('${board}','diretoria');`);
}, 30000);
afterAll(async () => {
  await db.close();
});

describe.sequential("Associação: três perfis em banco isolado", () => {
  it("público não lê solicitantes nem decide", async () => {
    await asUser(null);
    await expect(db.query("SELECT * FROM public.membership_applications")).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      db.query(`SELECT public.review_application('${request}',true,NULL)`),
    ).rejects.toThrow(/permission denied/);
  });
  it("solicitante registra Pendente, sem associação nem papel", async () => {
    await asUser(applicant);
    await db.exec(
      `INSERT INTO public.membership_applications(id,user_id,full_name,birth_date) VALUES('${request}','${applicant}','Exemplo Solicitante','2000-01-01');`,
    );
    const { rows } = await db.query<{ status: string; email: string }>(
      `SELECT status,email FROM public.membership_applications WHERE id='${request}'`,
    );
    expect(rows[0]?.status).toBe("pendente");
    expect(rows[0]?.email).toBe("applicant@example.invalid");
    expect(await value("SELECT count(*)::int AS value FROM public.association_memberships")).toBe(
      0,
    );
    expect(await value("SELECT count(*)::int AS value FROM public.user_roles")).toBe(0);
  });
  it("solicitante não decide nem altera diretamente o status", async () => {
    await asUser(applicant);
    await expect(
      db.query(`SELECT public.review_application('${request}',true,NULL)`),
    ).rejects.toThrow(/Acesso negado/);
    await expect(
      db.exec(`UPDATE public.membership_applications SET status='aprovada' WHERE id='${request}'`),
    ).rejects.toThrow(/permission denied/);
  });
  it("outro solicitante não lê a situação alheia", async () => {
    await asUser(other);
    expect(
      await value(
        `SELECT count(*)::int AS value FROM public.membership_applications WHERE id='${request}'`,
      ),
    ).toBe(0);
  });
  it("banco rejeita duplicidade e telefone inválido", async () => {
    await asUser(applicant);
    await expect(
      db.exec(
        `INSERT INTO public.membership_applications(user_id,full_name,birth_date) VALUES('${applicant}','Exemplo Duplicado','2000-01-01')`,
      ),
    ).rejects.toThrow(/Já existe/);
    await asUser(other);
    await expect(
      db.exec(
        `INSERT INTO public.membership_applications(user_id,full_name,birth_date,phone) VALUES('${other}','Exemplo Inválido','2000-01-01','abc')`,
      ),
    ).rejects.toThrow(/Telefone inválido/);
  });
  it("diretoria rejeita com responsável, data, nota privada e auditoria", async () => {
    await asUser(board);
    expect(
      await value(
        `SELECT count(*)::int AS value FROM public.membership_applications WHERE id='${request}'`,
      ),
    ).toBe(1);
    await db.query(
      `SELECT public.review_application('${request}',false,'Exemplo de observação interna')`,
    );
    const { rows } = await db.query<{ status: string; reviewed_by: string; reviewed_at: string }>(
      `SELECT status,reviewed_by,reviewed_at FROM public.membership_applications WHERE id='${request}'`,
    );
    expect(rows[0]?.status).toBe("rejeitada");
    expect(rows[0]?.reviewed_by).toBe(board);
    expect(rows[0]?.reviewed_at).toBeTruthy();
    expect(
      await value(
        `SELECT count(*)::int AS value FROM public.audit_logs WHERE record_id='${request}' AND actor_id='${board}' AND action='rejeitar_solicitacao'`,
      ),
    ).toBe(1);
    await asUser(applicant);
    expect(await value("SELECT count(*)::int AS value FROM public.membership_review_notes")).toBe(
      0,
    );
    expect(
      (
        await db.query<{ status: string; review_notes: string | null }>(
          `SELECT status,review_notes FROM public.membership_applications WHERE id='${request}'`,
        )
      ).rows[0],
    ).toEqual({ status: "rejeitada", review_notes: null });
  });
  it("reanálise exige diretoria e justificativa, preserva histórico", async () => {
    await asUser(applicant);
    await expect(
      db.query(`SELECT public.reopen_application('${request}','Exemplo')`),
    ).rejects.toThrow(/Acesso negado/);
    await asUser(board);
    await expect(db.query(`SELECT public.reopen_application('${request}','')`)).rejects.toThrow(
      /justificativa/,
    );
    await db.query(`SELECT public.reopen_application('${request}','Exemplo de caso excepcional')`);
    expect(
      await value(
        `SELECT count(*)::int AS value FROM public.membership_review_notes WHERE application_id='${request}'`,
      ),
    ).toBe(2);
    expect(
      await value(
        `SELECT count(*)::int AS value FROM public.audit_logs WHERE record_id='${request}' AND action='reabrir_solicitacao'`,
      ),
    ).toBe(1);
  });
  it("aprovação isolada concede apenas associado e não permite decisão repetida", async () => {
    await asUser(board);
    await db.query(`SELECT public.review_application('${request}',true,NULL)`);
    await expect(
      db.query(`SELECT public.review_application('${request}',false,NULL)`),
    ).rejects.toThrow(/já analisada/);
    expect(
      await value(
        `SELECT count(*)::int AS value FROM public.user_roles WHERE user_id='${applicant}' AND role='diretoria'`,
      ),
    ).toBe(0);
    expect(
      await value(
        `SELECT count(*)::int AS value FROM public.user_roles WHERE user_id='${applicant}' AND role='associado'`,
      ),
    ).toBe(1);
    await asUser(applicant);
    expect(
      (await db.query<{ status: string }>("SELECT status FROM public.association_memberships"))
        .rows[0]?.status,
    ).toBe("ativa");
  });

  it("todas as tabelas expostas em public possuem RLS habilitada e políticas ativas", async () => {
    await db.exec("RESET ROLE;");
    const { rows: unprotected } = await db.query<{ tablename: string }>(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public' AND rowsecurity = false
    `);
    expect(unprotected).toEqual([]);

    const { rows: withoutPolicies } = await db.query<{ tablename: string }>(`
      SELECT t.tablename
      FROM pg_tables t
      LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
      WHERE t.schemaname = 'public'
      GROUP BY t.tablename
      HAVING count(p.policyname) = 0
    `);
    expect(withoutPolicies).toEqual([]);
  });

  it("associado não consulta dados privados de outro associado nem enumera papéis de terceiros", async () => {
    // Cria perfil para applicant e other
    await asUser(applicant);
    await db.exec(
      `INSERT INTO public.profiles(id, full_name, phone) VALUES ('${applicant}', 'Associado Um', '(11) 99999-1111') ON CONFLICT (id) DO UPDATE SET phone = '(11) 99999-1111'`,
    );

    // Outro usuário autenticado tenta ler perfil, associação e papel do applicant ou da diretoria
    await asUser(other);
    expect(
      await value(`SELECT count(*)::int AS value FROM public.profiles WHERE id = '${applicant}'`),
    ).toBe(0);
    expect(
      await value(
        `SELECT count(*)::int AS value FROM public.association_memberships WHERE user_id = '${applicant}'`,
      ),
    ).toBe(0);

    // has_role não permite enumerar se outro usuário é da diretoria
    const { rows: enumRows } = await db.query<{ is_dir: boolean }>(
      `SELECT public.has_role('${board}', 'diretoria') AS is_dir`,
    );
    expect(enumRows[0]?.is_dir).toBe(false);

    // Público (anon) também não consegue enumerar papéis via has_role
    await asUser(null);
    const { rows: anonEnum } = await db.query<{ is_dir: boolean }>(
      `SELECT public.has_role('${board}', 'diretoria') AS is_dir`,
    );
    expect(anonEnum[0]?.is_dir).toBe(false);
  });

  it("associado não consegue atribuir a si mesmo a função de diretoria", async () => {
    await asUser(applicant);
    await expect(
      db.exec(`INSERT INTO public.user_roles(user_id, role) VALUES ('${applicant}', 'diretoria')`),
    ).rejects.toThrow();
    await expect(
      db.query(`SELECT public.set_user_role_by_diretoria('${applicant}', 'diretoria', true, NULL)`),
    ).rejects.toThrow(/Acesso negado/);
    expect(
      await value(
        `SELECT count(*)::int AS value FROM public.user_roles WHERE user_id = '${applicant}' AND role = 'diretoria'`,
      ),
    ).toBe(0);
  });

  it("diretoria seleciona outros cadastros como diretoria ou associado com auditoria e bloqueio de auto-remoção", async () => {
    await asUser(board);

    // 1. Diretoria lista todos os cadastros
    const { rows: allUsers } = await db.query<{
      user_id: string;
      is_associado: boolean;
      is_diretoria: boolean;
    }>(
      `SELECT user_id, is_associado, is_diretoria FROM public.list_registered_users_for_diretoria()`,
    );
    expect(allUsers.length).toBe(3);

    // 2. Diretoria promove o cadastro 'other' para associado e depois para diretoria
    await db.query(
      `SELECT public.set_user_role_by_diretoria('${other}', 'associado', true, 'Associado homologado pela diretoria')`,
    );
    await db.query(
      `SELECT public.set_user_role_by_diretoria('${other}', 'diretoria', true, 'Eleito para a diretoria')`,
    );

    expect(
      await value(
        `SELECT count(*)::int AS value FROM public.user_roles WHERE user_id = '${other}' AND role = 'associado'`,
      ),
    ).toBe(1);
    expect(
      await value(
        `SELECT count(*)::int AS value FROM public.user_roles WHERE user_id = '${other}' AND role = 'diretoria'`,
      ),
    ).toBe(1);

    // 3. Diretoria revoga a função de diretoria de 'other'
    await db.query(
      `SELECT public.set_user_role_by_diretoria('${other}', 'diretoria', false, 'Fim do mandato')`,
    );
    expect(
      await value(
        `SELECT count(*)::int AS value FROM public.user_roles WHERE user_id = '${other}' AND role = 'diretoria'`,
      ),
    ).toBe(0);

    // 4. Membro da diretoria é impedido de remover sua própria função de diretoria
    await expect(
      db.query(`SELECT public.set_user_role_by_diretoria('${board}', 'diretoria', false, NULL)`),
    ).rejects.toThrow(/própria função de diretoria/);

    await expect(
      db.exec(`DELETE FROM public.user_roles WHERE user_id = '${board}' AND role = 'diretoria'`),
    ).rejects.toThrow(/própria função de diretoria/);

    // 5. Registro de auditoria gerado
    expect(
      await value(
        `SELECT count(*)::int AS value FROM public.audit_logs WHERE record_id = '${other}' AND action = 'conceder_funcao_diretoria'`,
      ),
    ).toBe(1);
  });
});

it("validação rejeita nome vazio, nascimento futuro e telefone inválido", () => {
  const valid = {
    full_name: "Exemplo Pessoa",
    email: "test@example.invalid",
    phone: "",
    birth_date: "2000-01-01",
    motivation: "",
  };
  expect(membershipSchema.safeParse(valid).success).toBe(true);
  for (const change of [{ full_name: "  " }, { birth_date: "2999-01-01" }, { phone: "abc" }])
    expect(membershipSchema.safeParse({ ...valid, ...change }).success).toBe(false);
});
