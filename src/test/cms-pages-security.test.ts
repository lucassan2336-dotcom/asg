// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

const db = new PGlite();

const directorId = "40000000-0000-0000-0000-000000000001";
const memberId = "40000000-0000-0000-0000-000000000002";

async function asUser(id: string | null) {
  await db.exec(
    `RESET ROLE; SET ROLE ${id ? "authenticated" : "anon"}; SELECT set_config('request.jwt.claim.sub', '${id ?? ""}', false);`,
  );
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
    "0011_gallery_storage_bucket",
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
  `);
}, 30000);

afterAll(async () => {
  await db.close();
});

describe.sequential("Segurança e Edição de Páginas (Exclusivo da Diretoria)", () => {
  it("Público anônimo pode ler conteúdo e projetos publicados, mas não pode alterar", async () => {
    // 1. Diretoria cria conteúdo inicial e projeto
    await asUser(directorId);
    await db.query(`
      INSERT INTO public.site_content(page_slug, section_key, content)
      VALUES ('home', 'hero', '{"title": "Skate é vida"}')
    `);
    await db.query(`
      INSERT INTO public.site_projects(title, description, published)
      VALUES ('Escolinha de Skate', 'Aulas gratuitas de skate para iniciantes', true)
    `);
    await db.query(`
      INSERT INTO public.site_projects(title, description, published)
      VALUES ('Projeto Rascunho', 'Projeto ainda não lançado', false)
    `);

    // 2. Anônimo consulta conteúdo
    await asUser(null);
    const content = await db.query("SELECT * FROM public.site_content WHERE page_slug = 'home'");
    expect(content.rows.length).toBe(1);

    // 3. Anônimo vê apenas projetos publicados
    const projects = await db.query("SELECT * FROM public.site_projects");
    expect(projects.rows.length).toBe(1);
    expect((projects.rows[0] as any).title).toBe("Escolinha de Skate");

    // 4. Anônimo tenta modificar conteúdo -> Deve falhar por violação de RLS
    await expect(
      db.query(
        `UPDATE public.site_content SET content = '{"title": "Hacked"}' WHERE page_slug = 'home'`,
      ),
    ).rejects.toThrow();

    await expect(
      db.query(
        `INSERT INTO public.site_content(page_slug, section_key, content) VALUES ('sobre', 'hero', '{}')`,
      ),
    ).rejects.toThrow();

    await expect(
      db.query(`INSERT INTO public.site_projects(title, description) VALUES ('Fake', 'Desc')`),
    ).rejects.toThrow();
  });

  it("Associado comum NÃO pode alterar ou criar conteúdo de páginas", async () => {
    await asUser(memberId);

    // Associado tenta alterar conteúdo do site: RLS impede, 0 linhas afetadas
    const updateRes = await db.query(
      `UPDATE public.site_content SET content = '{"title": "Associado tentou mudar"}' WHERE page_slug = 'home'`,
    );
    expect(updateRes.rowCount).toBe(0);

    // Associado tenta inserir conteúdo: viola WITH CHECK do RLS
    await expect(
      db.query(
        `INSERT INTO public.site_content(page_slug, section_key, content) VALUES ('contato', 'hero', '{"x": 1}')`,
      ),
    ).rejects.toThrow();

    // Associado tenta criar projeto: viola WITH CHECK do RLS
    await expect(
      db.query(
        `INSERT INTO public.site_projects(title, description) VALUES ('Projeto Invasor', 'Descricao sem permissao')`,
      ),
    ).rejects.toThrow();

    // Associado tenta deletar projeto: RLS impede, 0 linhas deletadas
    const deleteRes = await db.query(`DELETE FROM public.site_projects`);
    expect(deleteRes.rowCount).toBe(0);
  });

  it("Somente a Diretoria pode criar, atualizar e excluir conteúdo e coleções", async () => {
    await asUser(directorId);

    // 1. Atualizar conteúdo da página
    const updateRes = await db.query(`
      UPDATE public.site_content
      SET content = '{"title": "Skate é comunidade e cultura"}'
      WHERE page_slug = 'home' AND section_key = 'hero'
      RETURNING *
    `);
    expect(updateRes.rows.length).toBe(1);

    // 2. Criar e gerenciar resultados de campeonatos
    const resultInsert = await db.query(`
      INSERT INTO public.competition_results(championship_name, category, position, athlete_name, score)
      VALUES ('1º Campeonato ASG', 'Amador', 1, 'Pedro Barros de Guararema', '85.4')
      RETURNING *
    `);
    expect(resultInsert.rows.length).toBe(1);

    // 3. Criar foto na galeria
    const photoInsert = await db.query(`
      INSERT INTO public.gallery_photos(title, image_url, caption)
      VALUES ('Sessão de Sábado', 'https://exemplo.com/foto.jpg', 'Manobras na pista pública')
      RETURNING *
    `);
    expect(photoInsert.rows.length).toBe(1);

    // 4. Excluir item
    const deleteRes = await db.query(`
      DELETE FROM public.gallery_photos WHERE title = 'Sessão de Sábado' RETURNING *
    `);
    expect(deleteRes.rows.length).toBe(1);

    // 5. Verificar que auditoria foi gerada
    const audits = await db.query(`
      SELECT * FROM public.audit_logs WHERE table_name IN ('site_content', 'competition_results', 'gallery_photos')
    `);
    expect(audits.rows.length).toBeGreaterThanOrEqual(3);

    // 6. Banco bloqueia URLs com protocolo inseguro (javascript: / data:)
    await expect(
      db.query(`
        INSERT INTO public.gallery_photos(title, image_url)
        VALUES ('Foto Maliciosa', 'javascript:alert(1)')
      `),
    ).rejects.toThrow();

    await expect(
      db.query(`
        INSERT INTO public.sponsors(name, website)
        VALUES ('Sponsor Malicioso', 'javascript:evil()')
      `),
    ).rejects.toThrow();
  });

  it("Diretoria pode gerenciar e salvar o conteúdo da página de criação de conta (auth)", async () => {
    await asUser(directorId);
    const insertRes = await db.query(`
      INSERT INTO public.site_content(page_slug, section_key, content)
      VALUES (
        'auth',
        'main',
        '{"hero":{"eyebrow":"Cadastre-se","title":"Crie sua conta","description":"Entre para a comunidade"},"skaterCardTitle":"Skatista ASG","associateCardTitle":"Associado ASG"}'::jsonb
      )
      ON CONFLICT (page_slug, section_key) DO UPDATE
      SET content = EXCLUDED.content
      RETURNING *
    `);
    expect(insertRes.rows.length).toBe(1);

    // Público anônimo lê o conteúdo salvo de auth
    await asUser(null);
    const { rows } = await db.query<{ content: any }>(
      `SELECT content FROM public.site_content WHERE page_slug = 'auth' AND section_key = 'main'`,
    );
    expect(rows.length).toBe(1);
    expect(rows[0]?.content.skaterCardTitle).toBe("Skatista ASG");

    // Anônimo não pode alterar o conteúdo de auth
    await expect(
      db.query(
        `UPDATE public.site_content SET content = '{"hacked": true}'::jsonb WHERE page_slug = 'auth'`,
      ),
    ).rejects.toThrow();
  });

  it("Diretoria pode cadastrar fotos de álbum da galeria (com URL ou upload) e público visualiza", async () => {
    await asUser(directorId);
    const insertRes = await db.query(`
      INSERT INTO public.gallery_photos(title, image_url, event_name, caption, published)
      VALUES (
        'Sessão Noturna Praça',
        'https://asg.com.br/fotos/sessao1.jpg',
        'Sessão Noturna',
        'Manobras na iluminação da pista pública',
        true
      )
      RETURNING *
    `);
    expect(insertRes.rows.length).toBe(1);

    // Também aceita uploads em base64 (data:image/...)
    const insertDataUrl = await db.query(`
      INSERT INTO public.gallery_photos(title, image_url, event_name, caption, published)
      VALUES (
        'Foto Upload Celular',
        'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAgA0JaQAA3AA/vuUAAA=',
        'Campeonato Local',
        'Foto enviada do smartphone',
        true
      )
      RETURNING *
    `);
    expect(insertDataUrl.rows.length).toBe(1);

    // Público anônimo pode consultar as fotos publicadas do álbum
    await asUser(null);
    const { rows: publicPhotos } = await db.query(
      `SELECT title, event_name FROM public.gallery_photos WHERE published = true`,
    );
    expect(publicPhotos.length).toBeGreaterThanOrEqual(2);

    // Anônimo é bloqueado ao tentar enviar foto
    await expect(
      db.query(`
        INSERT INTO public.gallery_photos(title, image_url)
        VALUES ('Hacker Foto', 'https://asg.com.br/fake.jpg')
      `),
    ).rejects.toThrow();
  });
});
