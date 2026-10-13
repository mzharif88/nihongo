import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const MIGRATIONS_DIR = join(__dirname, "..", "..", "supabase", "migrations");

// Minimal stand-in for what Supabase provides before our migrations run:
// the auth schema, auth.uid(), the anon/authenticated roles and their default grants.
const SUPABASE_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key, email text not null unique);
  create role anon nologin;
  create role authenticated nologin;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`;

export async function createDb() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_STUB);
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql") && !f.includes("storage")) // storage schema is Supabase-only
    .sort();
  for (const f of files) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, f), "utf8"));
  }
  return db;
}

export type Db = Awaited<ReturnType<typeof createDb>>;

/** Run `fn` as an API caller: role `authenticated` with the given user id, or `anon`. */
export async function as<T>(db: Db, userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${userId ? "authenticated" : "anon"}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? ""]);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role`);
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

export async function createUser(db: Db, id: string, email: string, admin = false) {
  await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, email]);
  if (admin) await db.query(`update public.profiles set role = 'admin' where id = $1`, [id]);
}
