
-- ============ ENUMS ============
create type public.app_role as enum ('admin','secretaria','tesoreria','director','docente','auxiliar','apoderado','estudiante');
create type public.estado_matricula as enum ('SOLICITADA','EN_REVISION','MATRICULADA','RECHAZADA','RETIRADA','ANULADA');
create type public.tipo_matricula as enum ('NUEVA','RATIFICACION','TRASLADO');
create type public.estado_asistencia as enum ('PRESENTE','TARDANZA','FALTA','JUSTIFICADA');
create type public.estado_revision as enum ('PENDIENTE','APROBADA','RECHAZADA');
create type public.estado_documento as enum ('PENDIENTE','VALIDADO','OBSERVADO');
create type public.estado_pago as enum ('CONFIRMADO','ANULADO');

-- ============ TABLES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default '',
  correo text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create table public.periodos (
  id uuid primary key default gen_random_uuid(),
  anio int not null unique,
  inicio_matricula date not null,
  fin_matricula date not null,
  monto_matricula numeric(10,2) not null default 300,
  activo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.periodos to authenticated;
grant all on public.periodos to service_role;
alter table public.periodos enable row level security;

create table public.grados (
  id uuid primary key default gen_random_uuid(),
  nivel text not null check (nivel in ('Inicial','Primaria','Secundaria')),
  numero int not null,
  orden int not null default 0,
  unique (nivel, numero)
);
grant select, insert, update, delete on public.grados to authenticated;
grant all on public.grados to service_role;
alter table public.grados enable row level security;

create table public.secciones (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid not null references public.periodos(id) on delete cascade,
  grado_id uuid not null references public.grados(id) on delete cascade,
  nombre text not null,
  capacidad int not null default 30 check (capacidad > 0),
  ocupadas int not null default 0 check (ocupadas >= 0),
  docente_id uuid,
  created_at timestamptz not null default now(),
  unique (periodo_id, grado_id, nombre),
  check (ocupadas <= capacidad)
);
grant select, insert, update, delete on public.secciones to authenticated;
grant all on public.secciones to service_role;
alter table public.secciones enable row level security;

create table public.apoderados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  nombre text not null,
  dni text not null unique,
  telefono text not null default '',
  correo text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.apoderados to authenticated;
grant all on public.apoderados to service_role;
alter table public.apoderados enable row level security;

create table public.estudiantes (
  id uuid primary key default gen_random_uuid(),
  apoderado_id uuid not null references public.apoderados(id) on delete restrict,
  user_id uuid unique,
  nombres text not null,
  apellidos text not null,
  dni text not null unique,
  fecha_nacimiento date,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.estudiantes to authenticated;
grant all on public.estudiantes to service_role;
alter table public.estudiantes enable row level security;

create table public.matriculas (
  id uuid primary key default gen_random_uuid(),
  codigo serial unique,
  estudiante_id uuid not null references public.estudiantes(id) on delete restrict,
  periodo_id uuid not null references public.periodos(id) on delete restrict,
  grado_id uuid not null references public.grados(id) on delete restrict,
  seccion_id uuid references public.secciones(id) on delete restrict,
  tipo public.tipo_matricula not null default 'NUEVA',
  estado public.estado_matricula not null default 'SOLICITADA',
  observacion text not null default '',
  created_by uuid,
  confirmada_por uuid,
  confirmada_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index matricula_unica_activa on public.matriculas (estudiante_id, periodo_id)
  where estado in ('SOLICITADA','EN_REVISION','MATRICULADA');
grant select, insert, update on public.matriculas to authenticated;
grant usage on sequence public.matriculas_codigo_seq to authenticated;
grant all on public.matriculas to service_role;
alter table public.matriculas enable row level security;

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null references public.matriculas(id) on delete cascade,
  tipo text not null,
  archivo_path text not null,
  nombre_archivo text not null default '',
  estado public.estado_documento not null default 'PENDIENTE',
  observacion text not null default '',
  subido_por uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.documentos to authenticated;
grant all on public.documentos to service_role;
alter table public.documentos enable row level security;

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null references public.matriculas(id) on delete restrict,
  concepto text not null default 'Matrícula',
  monto numeric(10,2) not null check (monto > 0),
  fecha date not null default current_date,
  comprobante text not null default '',
  estado public.estado_pago not null default 'CONFIRMADO',
  registrado_por uuid,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.pagos to authenticated;
grant all on public.pagos to service_role;
alter table public.pagos enable row level security;

create table public.asistencias (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null references public.matriculas(id) on delete cascade,
  seccion_id uuid not null references public.secciones(id) on delete cascade,
  fecha date not null,
  estado public.estado_asistencia not null default 'PRESENTE',
  observacion text not null default '',
  registrado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (matricula_id, fecha)
);
create index asistencias_seccion_fecha on public.asistencias (seccion_id, fecha);
grant select on public.asistencias to authenticated;
grant all on public.asistencias to service_role;
alter table public.asistencias enable row level security;

create table public.justificaciones (
  id uuid primary key default gen_random_uuid(),
  asistencia_id uuid not null unique references public.asistencias(id) on delete cascade,
  motivo text not null,
  sustento_path text,
  estado_revision public.estado_revision not null default 'PENDIENTE',
  observacion text not null default '',
  presentado_por uuid,
  revisado_por uuid,
  revisado_en timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert on public.justificaciones to authenticated;
grant all on public.justificaciones to service_role;
alter table public.justificaciones enable row level security;

create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  apoderado_id uuid not null references public.apoderados(id) on delete cascade,
  estudiante_id uuid references public.estudiantes(id) on delete cascade,
  canal text not null default 'app',
  asunto text not null,
  mensaje text not null,
  estado_envio text not null default 'ENVIADA',
  leida boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notificaciones to authenticated;
grant all on public.notificaciones to service_role;
alter table public.notificaciones enable row level security;

create table public.auditoria (
  id bigserial primary key,
  tabla text not null,
  registro_id uuid,
  accion text not null,
  usuario_id uuid,
  datos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.auditoria to authenticated;
grant all on public.auditoria to service_role;
alter table public.auditoria enable row level security;

-- ============ HELPER FUNCTIONS ============
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.has_any_role(_user_id uuid, _roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = any(_roles))
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_any_role(_user_id, array['admin','secretaria','tesoreria','director','docente','auxiliar']::public.app_role[])
$$;

create or replace function public.puede_ver_estudiante(_user_id uuid, _estudiante_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff(_user_id) or exists (
    select 1 from public.estudiantes e
    left join public.apoderados a on a.id = e.apoderado_id
    where e.id = _estudiante_id and (a.user_id = _user_id or e.user_id = _user_id)
  )
$$;

create or replace function public.es_apoderado_de_estudiante(_user_id uuid, _estudiante_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.estudiantes e join public.apoderados a on a.id = e.apoderado_id
    where e.id = _estudiante_id and a.user_id = _user_id
  )
$$;

create or replace function public.puede_ver_matricula(_user_id uuid, _matricula_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.matriculas m where m.id = _matricula_id
    and public.puede_ver_estudiante(_user_id, m.estudiante_id))
$$;

create or replace function public.es_apoderado_de_matricula(_user_id uuid, _matricula_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.matriculas m where m.id = _matricula_id
    and public.es_apoderado_de_estudiante(_user_id, m.estudiante_id))
$$;

create or replace function public.registrar_auditoria(_tabla text, _registro uuid, _accion text, _datos jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.auditoria (tabla, registro_id, accion, usuario_id, datos)
  values (_tabla, _registro, _accion, auth.uid(), coalesce(_datos, '{}'::jsonb));
$$;

create or replace function public.notificar_apoderado(_estudiante_id uuid, _asunto text, _mensaje text)
returns void language plpgsql security definer set search_path = public as $$
declare _apo uuid;
begin
  select apoderado_id into _apo from public.estudiantes where id = _estudiante_id;
  if _apo is not null then
    insert into public.notificaciones (apoderado_id, estudiante_id, asunto, mensaje)
    values (_apo, _estudiante_id, _asunto, _mensaje);
  end if;
end $$;

revoke execute on function public.registrar_auditoria(text, uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.notificar_apoderado(uuid, text, text) from public, anon, authenticated;

-- ============ NEW USER TRIGGER ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nombre, correo)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), coalesce(new.email, ''));
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'apoderado');
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ============ POLICIES ============
-- profiles
create policy "Ver perfil propio o personal" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid()));
create policy "Editar perfil propio" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "Admin edita perfiles" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- user_roles
create policy "Ver roles propios o admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "Admin asigna roles" on public.user_roles for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin quita roles" on public.user_roles for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- académico
create policy "Todos ven periodos" on public.periodos for select to authenticated using (true);
create policy "Admin gestiona periodos" on public.periodos for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Todos ven grados" on public.grados for select to authenticated using (true);
create policy "Admin gestiona grados" on public.grados for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Todos ven secciones" on public.secciones for select to authenticated using (true);
create policy "Admin gestiona secciones" on public.secciones for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- apoderados
create policy "Ver apoderados" on public.apoderados for select to authenticated
  using (public.is_staff(auth.uid()) or user_id = auth.uid());
create policy "Registrar apoderados" on public.apoderados for insert to authenticated
  with check (public.has_any_role(auth.uid(), array['admin','secretaria']::public.app_role[]) or user_id = auth.uid());
create policy "Editar apoderados" on public.apoderados for update to authenticated
  using (public.has_any_role(auth.uid(), array['admin','secretaria']::public.app_role[]) or user_id = auth.uid());

-- estudiantes
create policy "Ver estudiantes" on public.estudiantes for select to authenticated
  using (public.puede_ver_estudiante(auth.uid(), id));
create policy "Registrar estudiantes" on public.estudiantes for insert to authenticated
  with check (public.has_any_role(auth.uid(), array['admin','secretaria']::public.app_role[])
    or exists (select 1 from public.apoderados a where a.id = apoderado_id and a.user_id = auth.uid()));
create policy "Editar estudiantes" on public.estudiantes for update to authenticated
  using (public.has_any_role(auth.uid(), array['admin','secretaria']::public.app_role[])
    or public.es_apoderado_de_estudiante(auth.uid(), id));

-- matriculas
create policy "Ver matriculas" on public.matriculas for select to authenticated
  using (public.puede_ver_estudiante(auth.uid(), estudiante_id));
create policy "Solicitar matricula" on public.matriculas for insert to authenticated
  with check (public.has_any_role(auth.uid(), array['admin','secretaria']::public.app_role[])
    or public.es_apoderado_de_estudiante(auth.uid(), estudiante_id));
create policy "Secretaria actualiza matricula" on public.matriculas for update to authenticated
  using (public.has_any_role(auth.uid(), array['admin','secretaria']::public.app_role[]));

-- documentos
create policy "Ver documentos" on public.documentos for select to authenticated
  using (public.puede_ver_matricula(auth.uid(), matricula_id));
create policy "Subir documentos" on public.documentos for insert to authenticated
  with check (public.has_any_role(auth.uid(), array['admin','secretaria']::public.app_role[])
    or public.es_apoderado_de_matricula(auth.uid(), matricula_id));
create policy "Validar documentos" on public.documentos for update to authenticated
  using (public.has_any_role(auth.uid(), array['admin','secretaria']::public.app_role[]));
create policy "Borrar documento pendiente" on public.documentos for delete to authenticated
  using (public.has_any_role(auth.uid(), array['admin','secretaria']::public.app_role[])
    or (estado <> 'VALIDADO' and public.es_apoderado_de_matricula(auth.uid(), matricula_id)));

-- pagos
create policy "Ver pagos" on public.pagos for select to authenticated
  using (public.has_any_role(auth.uid(), array['admin','secretaria','tesoreria','director']::public.app_role[])
    or public.es_apoderado_de_matricula(auth.uid(), matricula_id));
create policy "Tesoreria registra pagos" on public.pagos for insert to authenticated
  with check (public.has_any_role(auth.uid(), array['admin','tesoreria']::public.app_role[]));
create policy "Tesoreria actualiza pagos" on public.pagos for update to authenticated
  using (public.has_any_role(auth.uid(), array['admin','tesoreria']::public.app_role[]));

-- asistencias (writes only through functions)
create policy "Ver asistencias" on public.asistencias for select to authenticated
  using (public.puede_ver_matricula(auth.uid(), matricula_id));

-- justificaciones
create policy "Ver justificaciones" on public.justificaciones for select to authenticated
  using (exists (select 1 from public.asistencias s where s.id = asistencia_id
    and public.puede_ver_matricula(auth.uid(), s.matricula_id)));
create policy "Apoderado presenta justificacion" on public.justificaciones for insert to authenticated
  with check (presentado_por = auth.uid() and estado_revision = 'PENDIENTE' and exists (
    select 1 from public.asistencias s where s.id = asistencia_id
      and s.estado in ('FALTA','TARDANZA')
      and (public.es_apoderado_de_matricula(auth.uid(), s.matricula_id)
        or public.has_any_role(auth.uid(), array['admin','secretaria','auxiliar']::public.app_role[]))));

-- notificaciones
create policy "Ver notificaciones" on public.notificaciones for select to authenticated
  using (public.has_any_role(auth.uid(), array['admin','secretaria','director']::public.app_role[])
    or exists (select 1 from public.apoderados a where a.id = apoderado_id and a.user_id = auth.uid()));
create policy "Marcar notificacion leida" on public.notificaciones for update to authenticated
  using (exists (select 1 from public.apoderados a where a.id = apoderado_id and a.user_id = auth.uid()));

-- auditoria
create policy "Admin y director ven bitacora" on public.auditoria for select to authenticated
  using (public.has_any_role(auth.uid(), array['admin','director']::public.app_role[]));

-- ============ TRIGGERS: matrícula ============
create or replace function public.antes_insertar_matricula()
returns trigger language plpgsql security definer set search_path = public as $$
declare _p record;
begin
  select * into _p from public.periodos where id = new.periodo_id;
  if current_date < _p.inicio_matricula or current_date > _p.fin_matricula then
    raise exception 'La matrícula del año % no está habilitada en esta fecha (del % al %).', _p.anio, to_char(_p.inicio_matricula,'DD/MM/YYYY'), to_char(_p.fin_matricula,'DD/MM/YYYY');
  end if;
  if exists (select 1 from public.matriculas where estudiante_id = new.estudiante_id and periodo_id = new.periodo_id
             and estado in ('SOLICITADA','EN_REVISION','MATRICULADA')) then
    raise exception 'El estudiante ya tiene una matrícula activa en el año %.', _p.anio;
  end if;
  new.created_by := auth.uid();
  if not public.has_any_role(auth.uid(), array['admin','secretaria']::public.app_role[]) then
    new.estado := 'SOLICITADA';
    new.seccion_id := null;
  end if;
  if new.estado = 'MATRICULADA' then
    raise exception 'Use la opción Confirmar matrícula para matricular.';
  end if;
  return new;
end $$;
create trigger matricula_antes_insertar before insert on public.matriculas
for each row execute function public.antes_insertar_matricula();

create or replace function public.despues_insertar_matricula()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.registrar_auditoria('matriculas', new.id, 'CREAR', to_jsonb(new));
  perform public.notificar_apoderado(new.estudiante_id, 'Solicitud de matrícula registrada',
    'Recibimos la solicitud de matrícula N.° ' || new.codigo || '. Adjunte los documentos requeridos para continuar.');
  return new;
end $$;
create trigger matricula_despues_insertar after insert on public.matriculas
for each row execute function public.despues_insertar_matricula();

-- Block direct estado changes to MATRICULADA outside the confirm function
create or replace function public.antes_actualizar_matricula()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.estado is distinct from old.estado and new.estado = 'MATRICULADA'
     and coalesce(current_setting('app.confirmando', true), '') <> 'si' then
    raise exception 'Use la opción Confirmar matrícula para matricular.';
  end if;
  if new.seccion_id is distinct from old.seccion_id and coalesce(current_setting('app.confirmando', true), '') <> 'si' then
    raise exception 'La sección solo se asigna al confirmar la matrícula.';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger matricula_antes_actualizar before update on public.matriculas
for each row execute function public.antes_actualizar_matricula();

-- ============ USE CASE: confirmar matrícula ============
create or replace function public.confirmar_matricula(_matricula_id uuid, _seccion_id uuid)
returns public.matriculas language plpgsql security definer set search_path = public as $$
declare _m public.matriculas; _s public.secciones; _p public.periodos; _faltan text[]; _pagado numeric;
begin
  if not public.has_any_role(auth.uid(), array['admin','secretaria']::public.app_role[]) then
    raise exception 'Solo Secretaría puede confirmar matrículas.';
  end if;
  select * into _m from public.matriculas where id = _matricula_id for update;
  if not found then raise exception 'Matrícula no encontrada.'; end if;
  if _m.estado not in ('SOLICITADA','EN_REVISION') then
    raise exception 'La matrícula está en estado % y no se puede confirmar.', _m.estado;
  end if;
  select * into _p from public.periodos where id = _m.periodo_id;
  if current_date < _p.inicio_matricula or current_date > _p.fin_matricula then
    raise exception 'El periodo de matrícula % está cerrado.', _p.anio;
  end if;
  select array_agg(t) into _faltan from unnest(public.documentos_requeridos(_m.tipo)) t
   where not exists (select 1 from public.documentos d where d.matricula_id = _m.id and d.tipo = t and d.estado = 'VALIDADO');
  if _faltan is not null then
    raise exception 'Faltan documentos validados: %.', array_to_string(_faltan, ', ');
  end if;
  select coalesce(sum(monto),0) into _pagado from public.pagos where matricula_id = _m.id and estado = 'CONFIRMADO';
  if _pagado < _p.monto_matricula then
    raise exception 'El pago de matrícula no está completo (pagado S/ % de S/ %).', _pagado, _p.monto_matricula;
  end if;
  select * into _s from public.secciones where id = _seccion_id for update;
  if not found or _s.periodo_id <> _m.periodo_id or _s.grado_id <> _m.grado_id then
    raise exception 'La sección elegida no corresponde al grado y año de la matrícula.';
  end if;
  if _s.ocupadas >= _s.capacidad then
    raise exception 'La sección % ya no tiene vacantes.', _s.nombre;
  end if;
  update public.secciones set ocupadas = ocupadas + 1 where id = _s.id;
  perform set_config('app.confirmando', 'si', true);
  update public.matriculas set estado = 'MATRICULADA', seccion_id = _s.id,
    confirmada_por = auth.uid(), confirmada_en = now()
  where id = _m.id returning * into _m;
  perform set_config('app.confirmando', '', true);
  perform public.registrar_auditoria('matriculas', _m.id, 'CONFIRMAR', jsonb_build_object('seccion_id', _s.id));
  perform public.notificar_apoderado(_m.estudiante_id, 'Matrícula confirmada',
    'La matrícula N.° ' || _m.codigo || ' fue confirmada en la sección ' || _s.nombre || '. Ya puede descargar la constancia.');
  return _m;
end $$;

create or replace function public.documentos_requeridos(_tipo public.tipo_matricula)
returns text[] language sql immutable set search_path = public as $$
  select case when _tipo = 'TRASLADO'
    then array['DNI del estudiante','Partida de nacimiento','DNI del apoderado','Certificado de estudios']
    else array['DNI del estudiante','Partida de nacimiento','DNI del apoderado'] end
$$;

create or replace function public.cambiar_estado_matricula(_matricula_id uuid, _estado public.estado_matricula, _motivo text)
returns public.matriculas language plpgsql security definer set search_path = public as $$
declare _m public.matriculas; _anterior public.estado_matricula;
begin
  if not public.has_any_role(auth.uid(), array['admin','secretaria']::public.app_role[]) then
    raise exception 'Solo Secretaría puede cambiar el estado de una matrícula.';
  end if;
  if _estado not in ('EN_REVISION','RECHAZADA','RETIRADA','ANULADA') then
    raise exception 'Estado no permitido.';
  end if;
  select * into _m from public.matriculas where id = _matricula_id for update;
  if not found then raise exception 'Matrícula no encontrada.'; end if;
  _anterior := _m.estado;
  if _anterior in ('RECHAZADA','RETIRADA','ANULADA') then
    raise exception 'La matrícula ya está cerrada (%).', _anterior;
  end if;
  if _estado in ('RECHAZADA','EN_REVISION') and _anterior = 'MATRICULADA' then
    raise exception 'Una matrícula confirmada solo puede retirarse o anularse.';
  end if;
  if _estado = 'RETIRADA' and _anterior <> 'MATRICULADA' then
    raise exception 'Solo se retira a un estudiante ya matriculado.';
  end if;
  if _anterior = 'MATRICULADA' and _m.seccion_id is not null then
    update public.secciones set ocupadas = greatest(ocupadas - 1, 0) where id = _m.seccion_id;
  end if;
  update public.matriculas set estado = _estado, observacion = coalesce(_motivo, '') where id = _m.id returning * into _m;
  perform public.registrar_auditoria('matriculas', _m.id, 'ESTADO_' || _estado::text,
    jsonb_build_object('anterior', _anterior, 'motivo', _motivo));
  perform public.notificar_apoderado(_m.estudiante_id, 'Actualización de matrícula',
    'La matrícula N.° ' || _m.codigo || ' cambió a ' || replace(_estado::text,'_',' ') ||
    case when coalesce(_motivo,'') <> '' then '. Motivo: ' || _motivo else '' end || '.');
  return _m;
end $$;

-- ============ USE CASE: registrar asistencia ============
create or replace function public.registrar_asistencia(_seccion_id uuid, _fecha date, _marcas jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _s public.secciones; _ya boolean; _autorizado boolean; _r jsonb; _m public.matriculas;
  _prev public.asistencias; _nuevo public.estado_asistencia; _est record;
  _p int := 0; _t int := 0; _f int := 0; _j int := 0;
begin
  select * into _s from public.secciones where id = _seccion_id;
  if not found then raise exception 'Sección no encontrada.'; end if;
  _autorizado := public.has_any_role(auth.uid(), array['admin','auxiliar','secretaria']::public.app_role[]);
  if not _autorizado and not (_s.docente_id = auth.uid() and public.has_role(auth.uid(),'docente')) then
    raise exception 'No tiene permiso para registrar asistencia en esta sección.';
  end if;
  if _fecha > current_date then raise exception 'No se puede registrar asistencia de una fecha futura.'; end if;
  select exists (select 1 from public.asistencias where seccion_id = _seccion_id and fecha = _fecha) into _ya;
  if _ya and not _autorizado then
    raise exception 'La asistencia de este día ya fue registrada. Solo Auxiliar o Secretaría pueden corregirla.';
  end if;
  for _r in select * from jsonb_array_elements(_marcas) loop
    select * into _m from public.matriculas where id = (_r->>'matricula_id')::uuid;
    if not found or _m.seccion_id <> _seccion_id or _m.estado <> 'MATRICULADA' then
      raise exception 'Un estudiante de la lista no pertenece a la sección.';
    end if;
    _nuevo := (_r->>'estado')::public.estado_asistencia;
    select * into _prev from public.asistencias where matricula_id = _m.id and fecha = _fecha;
    if found then
      if _prev.estado is distinct from _nuevo then
        update public.asistencias set estado = _nuevo, observacion = coalesce(_r->>'observacion',''),
          registrado_por = auth.uid(), updated_at = now() where id = _prev.id;
        perform public.registrar_auditoria('asistencias', _prev.id, 'CORREGIR',
          jsonb_build_object('anterior', _prev.estado, 'nuevo', _nuevo, 'fecha', _fecha));
      end if;
    else
      insert into public.asistencias (matricula_id, seccion_id, fecha, estado, observacion, registrado_por)
      values (_m.id, _seccion_id, _fecha, _nuevo, coalesce(_r->>'observacion',''), auth.uid());
    end if;
    if _nuevo in ('FALTA','TARDANZA') and (_prev.id is null or _prev.estado is distinct from _nuevo) then
      select nombres, apellidos into _est from public.estudiantes where id = _m.estudiante_id;
      perform public.notificar_apoderado(_m.estudiante_id,
        case when _nuevo = 'FALTA' then 'Inasistencia registrada' else 'Tardanza registrada' end,
        _est.nombres || ' ' || _est.apellidos || ' tiene ' || case when _nuevo = 'FALTA' then 'una falta' else 'una tardanza' end ||
        ' el ' || to_char(_fecha,'DD/MM/YYYY') || '. Puede presentar una justificación desde la app.');
    end if;
    if _nuevo = 'PRESENTE' then _p := _p + 1; elsif _nuevo = 'TARDANZA' then _t := _t + 1;
    elsif _nuevo = 'FALTA' then _f := _f + 1; else _j := _j + 1; end if;
  end loop;
  if not _ya then
    perform public.registrar_auditoria('asistencias', _seccion_id, 'REGISTRAR_SECCION',
      jsonb_build_object('fecha', _fecha, 'total', jsonb_array_length(_marcas)));
  end if;
  return jsonb_build_object('presentes', _p, 'tardanzas', _t, 'faltas', _f, 'justificadas', _j, 'correccion', _ya);
end $$;

-- ============ USE CASE: resolver justificación ============
create or replace function public.resolver_justificacion(_justificacion_id uuid, _aprobar boolean, _observacion text)
returns public.justificaciones language plpgsql security definer set search_path = public as $$
declare _j public.justificaciones; _a public.asistencias; _m public.matriculas;
begin
  if not public.has_any_role(auth.uid(), array['admin','auxiliar','secretaria']::public.app_role[]) then
    raise exception 'Solo Auxiliar o Secretaría pueden resolver justificaciones.';
  end if;
  select * into _j from public.justificaciones where id = _justificacion_id for update;
  if not found then raise exception 'Justificación no encontrada.'; end if;
  if _j.estado_revision <> 'PENDIENTE' then raise exception 'La justificación ya fue resuelta.'; end if;
  update public.justificaciones set estado_revision = case when _aprobar then 'APROBADA'::public.estado_revision else 'RECHAZADA'::public.estado_revision end,
    observacion = coalesce(_observacion,''), revisado_por = auth.uid(), revisado_en = now()
  where id = _j.id returning * into _j;
  select * into _a from public.asistencias where id = _j.asistencia_id;
  select * into _m from public.matriculas where id = _a.matricula_id;
  if _aprobar then
    update public.asistencias set estado = 'JUSTIFICADA', updated_at = now() where id = _a.id;
  end if;
  perform public.registrar_auditoria('justificaciones', _j.id, case when _aprobar then 'APROBAR' else 'RECHAZAR' end,
    jsonb_build_object('asistencia_id', _a.id, 'anterior', _a.estado));
  perform public.notificar_apoderado(_m.estudiante_id,
    case when _aprobar then 'Justificación aprobada' else 'Justificación rechazada' end,
    'La justificación del ' || to_char(_a.fecha,'DD/MM/YYYY') || ' fue ' || case when _aprobar then 'aprobada' else 'rechazada' end ||
    case when coalesce(_observacion,'') <> '' then '. Observación: ' || _observacion else '' end || '.');
  return _j;
end $$;

-- ============ USE CASE: vincular apoderado a la cuenta ============
create or replace function public.vincular_apoderado(_nombre text, _dni text, _telefono text)
returns public.apoderados language plpgsql security definer set search_path = public as $$
declare _a public.apoderados; _correo text;
begin
  if auth.uid() is null then raise exception 'Inicie sesión.'; end if;
  select * into _a from public.apoderados where user_id = auth.uid();
  if found then
    update public.apoderados set nombre = _nombre, telefono = _telefono where id = _a.id returning * into _a;
    return _a;
  end if;
  select email into _correo from auth.users where id = auth.uid();
  select * into _a from public.apoderados where dni = _dni;
  if found then
    if _a.user_id is null and lower(_a.correo) = lower(_correo) and _correo <> '' then
      update public.apoderados set user_id = auth.uid(), nombre = _nombre, telefono = _telefono where id = _a.id returning * into _a;
      return _a;
    end if;
    raise exception 'Ese DNI ya está registrado. Acérquese a Secretaría para vincular su cuenta.';
  end if;
  insert into public.apoderados (user_id, nombre, dni, telefono, correo)
  values (auth.uid(), _nombre, _dni, _telefono, coalesce(_correo,'')) returning * into _a;
  return _a;
end $$;

-- ============ AUDIT TRIGGERS ============
create or replace function public.auditar_cambio()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.registrar_auditoria(tg_table_name, new.id, 'CREAR', to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    perform public.registrar_auditoria(tg_table_name, new.id, 'ACTUALIZAR', jsonb_build_object('antes', to_jsonb(old), 'despues', to_jsonb(new)));
  end if;
  return new;
end $$;
create trigger pagos_auditoria after insert or update on public.pagos for each row execute function public.auditar_cambio();
create trigger documentos_auditoria after update on public.documentos for each row execute function public.auditar_cambio();

create or replace function public.notificar_pago()
returns trigger language plpgsql security definer set search_path = public as $$
declare _m public.matriculas;
begin
  select * into _m from public.matriculas where id = new.matricula_id;
  perform public.notificar_apoderado(_m.estudiante_id, 'Pago registrado',
    'Tesorería registró un pago de S/ ' || new.monto || ' (' || new.concepto || ') para la matrícula N.° ' || _m.codigo || '.');
  return new;
end $$;
create trigger pagos_notificar after insert on public.pagos for each row execute function public.notificar_pago();

revoke execute on function public.auditar_cambio() from public, anon, authenticated;

-- ============ STORAGE POLICIES (bucket documentos) ============
create policy "Ver archivos de matricula" on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.puede_ver_matricula(auth.uid(), ((storage.foldername(name))[1])::uuid));
create policy "Subir archivos de matricula" on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos' and (
    public.has_any_role(auth.uid(), array['admin','secretaria','auxiliar']::public.app_role[])
    or public.es_apoderado_de_matricula(auth.uid(), ((storage.foldername(name))[1])::uuid)));
create policy "Borrar archivos de matricula" on storage.objects for delete to authenticated
  using (bucket_id = 'documentos' and (
    public.has_any_role(auth.uid(), array['admin','secretaria']::public.app_role[])
    or public.es_apoderado_de_matricula(auth.uid(), ((storage.foldername(name))[1])::uuid)));

-- ============ SEED DATA ============
insert into public.periodos (anio, inicio_matricula, fin_matricula, monto_matricula, activo) values
  (2026, '2025-12-01', '2026-03-31', 300, true),
  (2027, '2026-11-01', '2027-03-31', 300, false);

insert into public.grados (nivel, numero, orden) values
  ('Inicial',3,1),('Inicial',4,2),('Inicial',5,3),
  ('Primaria',1,11),('Primaria',2,12),('Primaria',3,13),('Primaria',4,14),('Primaria',5,15),('Primaria',6,16),
  ('Secundaria',1,21),('Secundaria',2,22),('Secundaria',3,23),('Secundaria',4,24),('Secundaria',5,25);

insert into public.secciones (periodo_id, grado_id, nombre, capacidad)
select p.id, g.id, s.nombre, case when g.nivel = 'Inicial' then 20 else 30 end
from public.periodos p cross join public.grados g cross join (values ('A'),('B')) s(nombre);

-- Demo students already enrolled in 2026 (5.° Primaria A and 3.° Secundaria A)
alter table public.matriculas disable trigger matricula_antes_insertar;
alter table public.matriculas disable trigger matricula_despues_insertar;

with apo as (
  insert into public.apoderados (nombre, dni, telefono, correo) values
    ('Rosa Quispe Huamán','40112233','987654321','rosa.quispe@ejemplo.pe'),
    ('Carlos Mendoza Ríos','41223344','986543210','carlos.mendoza@ejemplo.pe'),
    ('Lucía Torres Vega','42334455','985432109','lucia.torres@ejemplo.pe'),
    ('Jorge Salazar Paredes','43445566','984321098','jorge.salazar@ejemplo.pe'),
    ('Ana Flores Castillo','44556677','983210987','ana.flores@ejemplo.pe'),
    ('Miguel Ramos Chávez','45667788','982109876','miguel.ramos@ejemplo.pe')
  returning id, dni
), est as (
  insert into public.estudiantes (apoderado_id, nombres, apellidos, dni, fecha_nacimiento)
  select a.id, e.nombres, e.apellidos, e.dni, e.nac::date from (values
    ('40112233','Mateo','Quispe Rojas','78123401','2015-04-12','Primaria'),
    ('40112233','Valeria','Quispe Rojas','78123402','2012-09-03','Secundaria'),
    ('41223344','Sebastián','Mendoza Lara','78123403','2015-01-22','Primaria'),
    ('42334455','Camila','Torres Núñez','78123404','2015-07-30','Primaria'),
    ('43445566','Diego','Salazar Ponce','78123405','2012-11-15','Secundaria'),
    ('44556677','Isabella','Flores Medina','78123406','2015-03-08','Primaria'),
    ('44556677','Thiago','Flores Medina','78123407','2012-05-19','Secundaria'),
    ('45667788','Luciana','Ramos Silva','78123408','2015-12-01','Primaria')
  ) e(apo_dni, nombres, apellidos, dni, nac, nivel)
  join apo a on a.dni = e.apo_dni
  returning id, dni
)
insert into public.matriculas (estudiante_id, periodo_id, grado_id, seccion_id, tipo, estado, confirmada_en)
select est.id, p.id, g.id, s.id, 'RATIFICACION', 'MATRICULADA', now()
from est
join (values ('78123401','Primaria',5),('78123402','Secundaria',3),('78123403','Primaria',5),('78123404','Primaria',5),
             ('78123405','Secundaria',3),('78123406','Primaria',5),('78123407','Secundaria',3),('78123408','Primaria',5)) x(dni, nivel, numero)
  on x.dni = est.dni
join public.periodos p on p.anio = 2026
join public.grados g on g.nivel = x.nivel and g.numero = x.numero
join public.secciones s on s.periodo_id = p.id and s.grado_id = g.id and s.nombre = 'A';

alter table public.matriculas enable trigger matricula_antes_insertar;
alter table public.matriculas enable trigger matricula_despues_insertar;

update public.secciones s set ocupadas = (select count(*) from public.matriculas m where m.seccion_id = s.id and m.estado = 'MATRICULADA');
