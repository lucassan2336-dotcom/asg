// @vitest-environment node
// Testes isolados em PostgreSQL (PGlite): nenhum dado fictício é gravado em produção.
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { computeModalityRanking, validateAvatarFile, type SkaterProfileRow } from "../lib/ranking";

const db = new PGlite();

const boardUser = "90000000-0000-0000-0000-000000000001";
const streetSkater1 = "90000000-0000-0000-0000-000000000011";
const streetSkater2 = "90000000-0000-0000-0000-000000000012";
const streetSkater3 = "90000000-0000-0000-0000-000000000013";
const streetSkater4 = "90000000-0000-0000-0000-000000000014";

const vertSkater1 = "90000000-0000-0000-0000-000000000021";
const vertSkater2 = "90000000-0000-0000-0000-000000000022";
const vertSkater3 = "90000000-0000-0000-0000-000000000023";

const associateUser1 = "90000000-0000-0000-0000-000000000031";
const associateUser2 = "90000000-0000-0000-0000-000000000032";

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
    CREATE TABLE auth.users(
      id uuid PRIMARY KEY,
      email text,
      email_confirmed_at timestamptz,
      raw_user_meta_data jsonb DEFAULT '{}'
    );
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
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
    "0009_skaters_associates_ranking_system",
  ]) {
    await db.exec(readFileSync(`drizzle/migrations/${file}.sql`, "utf8"));
  }

  // Criar conta administrativa da diretoria
  await db.exec(`
    RESET ROLE;
    INSERT INTO auth.users(id, email, email_confirmed_at, raw_user_meta_data)
    VALUES ('${boardUser}', 'diretoria@asg.invalid', now(), '{"full_name":"Diretoria ASG","account_type":"associado"}');
    INSERT INTO public.user_roles(user_id, role) VALUES ('${boardUser}', 'diretoria');
  `);
}, 30000);

afterAll(async () => {
  await db.close();
});

describe.sequential("Sistema de Skatistas, Associados, Resultados e Ranking — 15 Cenários", () => {
  it("1. Cadastro de skatista na modalidade Street vincula automaticamente ao ranking Street", async () => {
    await db.exec(`
      RESET ROLE;
      INSERT INTO auth.users(id, email, email_confirmed_at, raw_user_meta_data) VALUES
      ('${streetSkater1}', 's1@asg.invalid', now(), '{"full_name":"Lucas Street","account_type":"skatista","modality":"street","age":20,"years_practicing":"6 anos","favorite_trick":"Kickflip"}'),
      ('${streetSkater2}', 's2@asg.invalid', now(), '{"full_name":"Rafa Street","account_type":"skatista","modality":"street","age":22,"years_practicing":"8 anos","favorite_trick":"Heelflip"}'),
      ('${streetSkater3}', 's3@asg.invalid', now(), '{"full_name":"Gui Street","account_type":"skatista","modality":"street","age":17,"years_practicing":"3 anos","favorite_trick":"Pop Shuvit"}'),
      ('${streetSkater4}', 's4@asg.invalid', now(), '{"full_name":"Dani Street","account_type":"skatista","modality":"street","age":19,"years_practicing":"4 anos","favorite_trick":"Crooked Grind"}');
    `);

    await asUser(null);
    const { rows } = await db.query<{ full_name: string; modality: string }>(
      `SELECT full_name, modality FROM public.get_modality_ranking('street'::public.skate_modality)`,
    );
    expect(rows.length).toBe(4);
    expect(rows.every((r) => r.modality === "street")).toBe(true);
  });

  it("2. Cadastro de skatista na modalidade Vert vincula exclusivamente ao ranking Vert", async () => {
    await db.exec(`
      RESET ROLE;
      INSERT INTO auth.users(id, email, email_confirmed_at, raw_user_meta_data) VALUES
      ('${vertSkater1}', 'v1@asg.invalid', now(), '{"full_name":"Pedro Vert","account_type":"skatista","modality":"vert","age":25,"years_practicing":"10 anos","favorite_trick":"McTwist"}'),
      ('${vertSkater2}', 'v2@asg.invalid', now(), '{"full_name":"Bia Vert","account_type":"skatista","modality":"vert","age":21,"years_practicing":"7 anos","favorite_trick":"Backside Air"}'),
      ('${vertSkater3}', 'v3@asg.invalid', now(), '{"full_name":"Caio Vert","account_type":"skatista","modality":"vert","age":23,"years_practicing":"9 anos","favorite_trick":"Indy 540"}');
    `);

    await asUser(null);
    const { rows: vertRows } = await db.query<{ full_name: string; modality: string }>(
      `SELECT full_name, modality FROM public.get_modality_ranking('vert'::public.skate_modality)`,
    );
    expect(vertRows.length).toBe(3);
    expect(vertRows.every((r) => r.modality === "vert")).toBe(true);

    // Garantir que skatistas Vert não aparecem no Street
    const { rows: streetRows } = await db.query<{ full_name: string }>(
      `SELECT full_name FROM public.get_modality_ranking('street'::public.skate_modality)`,
    );
    expect(streetRows.some((r) => r.full_name.includes("Vert"))).toBe(false);
  });

  it("3. Cadastro de associado cria perfil exclusivo e NÃO inclui automaticamente no ranking", async () => {
    await db.exec(`
      RESET ROLE;
      INSERT INTO auth.users(id, email, email_confirmed_at, raw_user_meta_data) VALUES
      ('${associateUser1}', 'assoc1@asg.invalid', now(), '{"full_name":"Marcos Associado","account_type":"associado","age":34}'),
      ('${associateUser2}', 'assoc2@asg.invalid', now(), '{"full_name":"Carla Associada","account_type":"associado","age":29}');
    `);

    await asUser(associateUser1);
    const { rows: assocRows } = await db.query<{ full_name: string; age: number }>(
      `SELECT full_name, age FROM public.associate_profiles WHERE user_id = '${associateUser1}'`,
    );
    expect(assocRows.length).toBe(1);
    expect(assocRows[0]?.full_name).toBe("Marcos Associado");

    // Associado não possui perfil em skater_profiles nem aparece em Street ou Vert
    await asUser(null);
    const { rows: street } = await db.query<{ user_id: string }>(
      `SELECT user_id FROM public.get_modality_ranking('street'::public.skate_modality)`,
    );
    const { rows: vert } = await db.query<{ user_id: string }>(
      `SELECT user_id FROM public.get_modality_ranking('vert'::public.skate_modality)`,
    );
    expect(street.some((r) => r.user_id === associateUser1)).toBe(false);
    expect(vert.some((r) => r.user_id === associateUser1)).toBe(false);
  });

  it("4. Edição do perfil do skatista permite atualizar dados pessoais permitidos", async () => {
    await asUser(streetSkater1);
    await db.exec(`
      UPDATE public.skater_profiles
      SET full_name = 'Lucas Street Pro',
          age = 21,
          years_practicing = '7 anos',
          favorite_trick = '360 Flip Noseblunt',
          stance = 'goofy',
          avatar_url = 'https://example.invalid/avatars/lucas.webp'
      WHERE user_id = '${streetSkater1}';
    `);

    const { rows } = await db.query<{
      full_name: string;
      age: number;
      years_practicing: string;
      favorite_trick: string;
      stance: string;
      avatar_url: string;
    }>(
      `SELECT full_name, age, years_practicing, favorite_trick, stance, avatar_url FROM public.skater_profiles WHERE user_id = '${streetSkater1}'`,
    );

    expect(rows[0]?.full_name).toBe("Lucas Street Pro");
    expect(rows[0]?.age).toBe(21);
    expect(rows[0]?.years_practicing).toBe("7 anos");
    expect(rows[0]?.favorite_trick).toBe("360 Flip Noseblunt");
    expect(rows[0]?.stance).toBe("goofy");
    expect(rows[0]?.avatar_url).toBe("https://example.invalid/avatars/lucas.webp");
  });

  it("5. Edição do perfil do associado funciona e bloqueia leitura de outro associado", async () => {
    await asUser(associateUser1);
    await db.exec(`
      UPDATE public.associate_profiles
      SET full_name = 'Marcos Associado Silva',
          age = 35,
          avatar_url = 'https://example.invalid/avatars/marcos.jpg'
      WHERE user_id = '${associateUser1}';
    `);

    const { rows: ownRows } = await db.query<{ full_name: string; age: number }>(
      `SELECT full_name, age FROM public.associate_profiles WHERE user_id = '${associateUser1}'`,
    );
    expect(ownRows[0]?.full_name).toBe("Marcos Associado Silva");
    expect(ownRows[0]?.age).toBe(35);

    // Associado 1 não consegue ler nem editar o perfil do Associado 2
    const { rows: otherRows } = await db.query(
      `SELECT * FROM public.associate_profiles WHERE user_id = '${associateUser2}'`,
    );
    expect(otherRows.length).toBe(0);
  });

  it("6. Upload de foto de perfil valida formato (JPG/PNG/WEBP) e tamanho máximo (3 MB)", () => {
    const validFile = new File([new Uint8Array(1024)], "avatar.webp", { type: "image/webp" });
    expect(validateAvatarFile(validFile)).toBeNull();

    const invalidType = new File([new Uint8Array(1024)], "script.svg", { type: "image/svg+xml" });
    expect(validateAvatarFile(invalidType)).toMatch(/Formato de imagem inválido/);

    const oversized = new File([new Uint8Array(3 * 1024 * 1024 + 10)], "huge.png", {
      type: "image/png",
    });
    expect(validateAvatarFile(oversized)).toMatch(/máximo 3 MB/);
  });

  it("7 & 8. Ranking público e Perfil público respeitam privacidade de idade e não expõem dados privados", async () => {
    // Skatista 3 (menor de idade, 17 anos) decide ocultar sua idade publicamente
    await asUser(streetSkater3);
    await db.exec(`
      UPDATE public.skater_profiles SET show_age_publicly = false WHERE user_id = '${streetSkater3}';
    `);

    await asUser(null);
    const { rows } = await db.query<{ user_id: string; age: number | null }>(
      `SELECT user_id, age FROM public.get_modality_ranking('street'::public.skate_modality)`,
    );
    const s3 = rows.find((r) => r.user_id === streetSkater3);
    const s1 = rows.find((r) => r.user_id === streetSkater1);
    expect(s3?.age).toBeNull();
    expect(s1?.age).toBe(21);

    // Público anônimo não tem acesso à tabela privada profiles (e-mail, telefone, birth_date)
    await expect(db.query(`SELECT * FROM public.profiles`)).rejects.toThrow(/permission denied/);
  });

  it("9, 10 & 11. Registro de campeonatos Street e Vert soma pontos exclusivamente na modalidade correspondente", async () => {
    await asUser(boardUser);
    const { rows: skaters } = await db.query<{ id: string; user_id: string; modality: string }>(
      `SELECT id, user_id, modality FROM public.skater_profiles`,
    );
    const idOf = (uid: string) => skaters.find((s) => s.user_id === uid)!.id;

    // 9. Registrar 1ª Etapa Street (100 / 70 / 50 pts)
    await db.exec(`
      INSERT INTO public.championship_podiums(
        championship_name, event_date, modality,
        first_place_skater_id, second_place_skater_id, third_place_skater_id,
        first_points, second_points, third_points,
        notes, status, created_by
      ) VALUES (
        '1ª Etapa Circuito Street Guararema', '2026-05-10', 'street',
        '${idOf(streetSkater1)}', '${idOf(streetSkater2)}', '${idOf(streetSkater3)}',
        100, 70, 50,
        'Pista Municipal', 'publicado', '${boardUser}'
      );
    `);

    // 10. Registrar 1ª Etapa Vert (100 / 70 / 50 pts)
    await db.exec(`
      INSERT INTO public.championship_podiums(
        championship_name, event_date, modality,
        first_place_skater_id, second_place_skater_id, third_place_skater_id,
        first_points, second_points, third_points,
        notes, status, created_by
      ) VALUES (
        'Copa Guararema de Vert', '2026-05-17', 'vert',
        '${idOf(vertSkater1)}', '${idOf(vertSkater2)}', '${idOf(vertSkater3)}',
        100, 70, 50,
        'Halfpipe Principal', 'publicado', '${boardUser}'
      );
    `);

    // Impedir duplicidade do mesmo campeonato ativo
    await expect(
      db.exec(`
        INSERT INTO public.championship_podiums(
          championship_name, event_date, modality,
          first_place_skater_id, second_place_skater_id, third_place_skater_id,
          first_points, second_points, third_points
        ) VALUES (
          '1ª Etapa Circuito Street Guararema', '2026-05-10', 'street',
          '${idOf(streetSkater2)}', '${idOf(streetSkater1)}', '${idOf(streetSkater3)}',
          100, 70, 50
        );
      `),
    ).rejects.toThrow();

    // Impedir cadastro de skatista Vert em campeonato Street
    await expect(
      db.exec(`
        INSERT INTO public.championship_podiums(
          championship_name, event_date, modality,
          first_place_skater_id, second_place_skater_id, third_place_skater_id,
          first_points, second_points, third_points
        ) VALUES (
          'Campeonato Misto Inválido', '2026-06-01', 'street',
          '${idOf(vertSkater1)}', '${idOf(streetSkater1)}', '${idOf(streetSkater2)}',
          100, 70, 50
        );
      `),
    ).rejects.toThrow(/modalidade/);
  });

  it("12. Exibição correta dos troféus de ouro, prata e bronze apenas para os 3 primeiros colocados", async () => {
    await asUser(null);
    const { rows: streetRank } = await db.query<{
      user_id: string;
      total_points: number;
      rank_position: number;
      trophy_tier: string | null;
    }>(
      `SELECT user_id, total_points, rank_position, trophy_tier FROM public.get_modality_ranking('street'::public.skate_modality)`,
    );

    expect(streetRank[0]).toMatchObject({
      user_id: streetSkater1,
      total_points: 100,
      rank_position: 1,
      trophy_tier: "ouro",
    });
    expect(streetRank[1]).toMatchObject({
      user_id: streetSkater2,
      total_points: 70,
      rank_position: 2,
      trophy_tier: "prata",
    });
    expect(streetRank[2]).toMatchObject({
      user_id: streetSkater3,
      total_points: 50,
      rank_position: 3,
      trophy_tier: "bronze",
    });
    // 4º lugar não recebe troféu de pódio
    expect(streetRank[3]).toMatchObject({
      user_id: streetSkater4,
      total_points: 0,
      rank_position: 4,
      trophy_tier: null,
    });
  });

  it("13. Atualização automática de posições, troféus e desempate quando a classificação muda", async () => {
    await asUser(boardUser);
    const { rows: skaters } = await db.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM public.skater_profiles WHERE modality = 'street'`,
    );
    const idOf = (uid: string) => skaters.find((s) => s.user_id === uid)!.id;

    // 2ª Etapa Street: Dani (4º antes) vence (100 pts), Rafa fica em 2º (+70 = 140 pts), Gui fica em 3º (+50 = 100 pts)
    await db.exec(`
      INSERT INTO public.championship_podiums(
        championship_name, event_date, modality,
        first_place_skater_id, second_place_skater_id, third_place_skater_id,
        first_points, second_points, third_points,
        status, created_by
      ) VALUES (
        '2ª Etapa Circuito Street Guararema', '2026-07-12', 'street',
        '${idOf(streetSkater4)}', '${idOf(streetSkater2)}', '${idOf(streetSkater3)}',
        100, 70, 50,
        'publicado', '${boardUser}'
      );
    `);

    await asUser(null);
    const { rows: updatedRank } = await db.query<{
      user_id: string;
      total_points: number;
      first_places: number;
      rank_position: number;
      trophy_tier: string | null;
    }>(
      `SELECT user_id, total_points, first_places, rank_position, trophy_tier FROM public.get_modality_ranking('street'::public.skate_modality)`,
    );

    // Rafa assumiu o 1º lugar (Troféu de Ouro)
    expect(updatedRank[0]).toMatchObject({
      user_id: streetSkater2,
      total_points: 140,
      rank_position: 1,
      trophy_tier: "ouro",
    });

    // Dani e Lucas empatam em 100 pts com 1 vitória cada -> compartilham posição 2 e Troféu de Prata
    const tiedSeconds = updatedRank.filter((r) => r.rank_position === 2);
    expect(tiedSeconds.length).toBe(2);
    expect(tiedSeconds.every((r) => r.trophy_tier === "prata")).toBe(true);

    // Gui tem 100 pts mas 0 vitórias -> fica na 4ª posição e deixa de exibir troféu de bronze
    const guiEntry = updatedRank.find((r) => r.user_id === streetSkater3);
    expect(guiEntry).toMatchObject({
      total_points: 100,
      first_places: 0,
      rank_position: 4,
      trophy_tier: null,
    });

    // Histórico do skatista retorna os campeonatos disputados
    const { rows: history } = await db.query<{ championship_name: string; placement: number }>(
      `SELECT championship_name, placement FROM public.get_skater_championship_history('${idOf(streetSkater3)}')`,
    );
    expect(history.length).toBe(2);
  });

  it("14. Bloqueio de edição de resultados, pontos, modalidade ou tipo de conta por usuário comum", async () => {
    await asUser(streetSkater1);

    // Skatista não pode alterar sua própria pontuação
    await expect(
      db.exec(
        `UPDATE public.skater_profiles SET total_points = 9999 WHERE user_id = '${streetSkater1}'`,
      ),
    ).rejects.toThrow(
      /Operação negada: a pontuação e os pódios oficiais são calculados automaticamente/,
    );

    // Skatista não pode alterar sua própria modalidade sem autorização da diretoria
    await expect(
      db.exec(
        `UPDATE public.skater_profiles SET modality = 'vert' WHERE user_id = '${streetSkater1}'`,
      ),
    ).rejects.toThrow(/Operação negada: a modalidade competitiva/);

    // Skatista não pode alterar seu tipo de conta em profiles
    await expect(
      db.exec(
        `UPDATE public.profiles SET account_type = 'associado' WHERE id = '${streetSkater1}'`,
      ),
    ).rejects.toThrow(/Não é permitido alterar o tipo de conta/);

    // Skatista ou associado não pode publicar nem editar resultados de campeonatos
    const { rows: anyPodium } = await db.query<{ id: string }>(
      `SELECT id FROM public.championship_podiums LIMIT 1`,
    );
    await expect(
      db.exec(`
        INSERT INTO public.championship_podiums(
          championship_name, event_date, modality,
          first_place_skater_id, second_place_skater_id, third_place_skater_id,
          first_points, second_points, third_points
        )
        SELECT 'Tentativa Ilegal', '2026-08-01', modality,
          first_place_skater_id, second_place_skater_id, third_place_skater_id,
          100, 70, 50
        FROM public.championship_podiums WHERE id = '${anyPodium[0]!.id}'
      `),
    ).rejects.toThrow(/row-level security/);

    // Auditoria registrada para os campeonatos publicados
    await asUser(boardUser);
    const { rows: logs } = await db.query<{ action: string }>(
      `SELECT action FROM public.audit_logs WHERE table_name = 'championship_podiums'`,
    );
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it("15. Consistência da função client-side computeModalityRanking com o banco de dados", () => {
    const sample: SkaterProfileRow[] = [
      {
        id: "1",
        user_id: "u1",
        full_name: "Atleta A",
        avatar_url: null,
        age: 20,
        show_age_publicly: true,
        years_practicing: "5 anos",
        favorite_trick: "Kickflip",
        stance: "regular",
        modality: "street",
        total_points: 100,
        first_places: 1,
        second_places: 0,
        third_places: 0,
        is_active: true,
        created_at: "",
        updated_at: "",
      },
      {
        id: "2",
        user_id: "u2",
        full_name: "Atleta B",
        avatar_url: null,
        age: 16,
        show_age_publicly: false,
        years_practicing: "2 anos",
        favorite_trick: "Ollie",
        stance: "goofy",
        modality: "street",
        total_points: 100,
        first_places: 0,
        second_places: 2,
        third_places: 0,
        is_active: true,
        created_at: "",
        updated_at: "",
      },
    ];

    const ranked = computeModalityRanking(sample, "podium_counts");
    expect(ranked[0]?.skater_id).toBe("1");
    expect(ranked[0]?.rank_position).toBe(1);
    expect(ranked[0]?.trophy_tier).toBe("ouro");
    expect(ranked[1]?.skater_id).toBe("2");
    expect(ranked[1]?.rank_position).toBe(2);
    expect(ranked[1]?.trophy_tier).toBe("prata");
    expect(ranked[1]?.age).toBeNull(); // show_age_publicly = false respeitado
  });
});
