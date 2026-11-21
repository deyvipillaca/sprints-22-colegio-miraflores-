import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const passwordDemo = 'Miraflores2026!';
export function hash(password, salt = randomBytes(16).toString('hex')) {
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function matches(password, stored) {
  return timingSafeEqual(Buffer.from(hash(password, stored.split(':')[0])), Buffer.from(stored));
}

export async function openDatabase(location = process.env.MIRAFLORES_DATA_DIR || fileURLToPath(new URL('../datos-locales', import.meta.url))) {
  const db = new PGlite(location);
  await db.transaction(async tx => {
    if ((await tx.query("select to_regclass('auth.sessions') as initialized")).rows[0].initialized) return;
    await tx.exec(`
      create role authenticated;
      create role anon;
      create role service_role;
      create schema auth;
      create schema storage;
      create table auth.users (
        id uuid primary key default gen_random_uuid(),
        email text not null unique,
        password_hash text not null,
        raw_user_meta_data jsonb not null,
        created_at timestamptz not null default now()
      );
      create table auth.sessions (
        access_token text primary key, refresh_token text unique not null,
        user_id uuid not null references auth.users(id) on delete cascade,
        expires_at bigint not null, refresh_until bigint not null
      );
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table storage.objects (
        bucket_id text not null, name text not null, bytes bytea not null,
        primary key (bucket_id, name)
      );
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[] language sql immutable as
        $$ select string_to_array(name,'/') $$;
      grant usage on schema auth, storage to authenticated;
      grant select, insert, delete on storage.objects to authenticated;
    `);
    const migrations = new URL('../drizzle/migrations/', import.meta.url);
    for (const name of (await readdir(migrations)).filter(name => name.endsWith('.sql')).sort()) {
      await tx.exec(await readFile(new URL(name, migrations), 'utf8'));
    }
    const passwordHash = hash(passwordDemo);
    for (const [role, name] of Object.entries({
      admin:'Administración', secretaria:'Secretaría', docente:'Docente', auxiliar:'Auxiliar',
      tesoreria:'Tesorería', director:'Dirección', apoderado:'Rosa Quispe Huamán',
    })) {
      const { rows:[user] } = await tx.query(
        'insert into auth.users(email,password_hash,raw_user_meta_data) values ($1,$2,$3) returning id',
        [role+'@miraflores.test',passwordHash,JSON.stringify({nombre:name})]);
      if (!['admin','apoderado'].includes(role)) {
        await tx.query('update public.user_roles set role=$1 where user_id=$2',[role,user.id]);
      }
      if (role === 'apoderado') await tx.query("update public.apoderados set user_id=$1 where dni='40112233'",[user.id]);
      if (role === 'docente') await tx.query("update public.secciones set docente_id=$1 where ocupadas>0",[user.id]);
    }
    await tx.exec(`
      update public.periodos set inicio_matricula = least(current_date, inicio_matricula),
        fin_matricula = greatest(current_date + 90, fin_matricula)
      where anio = (select max(anio) from public.periodos);
    `);
  });
  return db;
}

export function asUser(db, id, action) {
  return db.transaction(async tx => {
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);
    await tx.exec('set local role authenticated');
    return action(tx);
  });
}
