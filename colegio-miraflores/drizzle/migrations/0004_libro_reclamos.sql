create table public.reclamos (
  id uuid primary key default gen_random_uuid(),
  codigo serial unique,
  usuario_id uuid not null default auth.uid(),
  apoderado_id uuid references public.apoderados(id) on delete set null,
  estudiante_id uuid references public.estudiantes(id) on delete set null,
  tipo text not null check (tipo in ('RECLAMO','QUEJA','SUGERENCIA')),
  asunto text not null check (length(trim(asunto)) between 3 and 150),
  detalle text not null check (length(trim(detalle)) between 10 and 3000),
  pedido text not null default '',
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE','EN_PROCESO','RESUELTO')),
  respuesta text not null default '',
  respondido_por uuid,
  respondido_en timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert on public.reclamos to authenticated;
grant usage on sequence public.reclamos_codigo_seq to authenticated;
grant all on public.reclamos to service_role;
alter table public.reclamos enable row level security;

create policy "Ver reclamos" on public.reclamos for select to authenticated
  using (usuario_id = auth.uid()
    or public.has_any_role(auth.uid(), array['admin','secretaria','director']::public.app_role[]));
create policy "Presentar reclamo" on public.reclamos for insert to authenticated
  with check (usuario_id = auth.uid() and estado = 'PENDIENTE' and respuesta = '' and respondido_por is null
    and (estudiante_id is null or public.es_apoderado_de_estudiante(auth.uid(), estudiante_id)
      or public.has_any_role(auth.uid(), array['admin','secretaria','director']::public.app_role[])));

create or replace function public.reclamo_set_apoderado()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select id into new.apoderado_id from public.apoderados where user_id = new.usuario_id;
  return new;
end $$;
create trigger reclamos_set_apoderado before insert on public.reclamos
  for each row execute function public.reclamo_set_apoderado();

create or replace function public.responder_reclamo(_reclamo_id uuid, _estado text, _respuesta text)
returns public.reclamos language plpgsql security definer set search_path = public as $$
declare _r public.reclamos;
begin
  if not public.has_any_role(auth.uid(), array['admin','secretaria','director']::public.app_role[]) then
    raise exception 'Solo Administración, Secretaría o Dirección pueden responder reclamos.';
  end if;
  if _estado not in ('EN_PROCESO','RESUELTO') then raise exception 'Estado no válido.'; end if;
  if _estado = 'RESUELTO' and length(trim(coalesce(_respuesta,''))) < 5 then
    raise exception 'Escriba la respuesta para cerrar el reclamo.';
  end if;
  select * into _r from public.reclamos where id = _reclamo_id for update;
  if not found then raise exception 'Reclamo no encontrado.'; end if;
  if _r.estado = 'RESUELTO' then raise exception 'Este reclamo ya fue resuelto.'; end if;
  update public.reclamos set estado = _estado, respuesta = coalesce(trim(_respuesta), ''),
    respondido_por = auth.uid(), respondido_en = now() where id = _reclamo_id returning * into _r;
  if _r.apoderado_id is not null then
    insert into public.notificaciones (apoderado_id, estudiante_id, asunto, mensaje)
    values (_r.apoderado_id, _r.estudiante_id,
      case when _estado = 'RESUELTO' then 'Reclamo N.° ' || _r.codigo || ' resuelto' else 'Reclamo N.° ' || _r.codigo || ' en proceso' end,
      case when _estado = 'RESUELTO' then 'Respuesta del colegio: ' || _r.respuesta
        else 'Estamos atendiendo su ' || lower(_r.tipo) || ' "' || _r.asunto || '".' end);
  end if;
  perform public.registrar_auditoria('reclamos', _r.id, 'RESPONDER', jsonb_build_object('estado', _estado));
  return _r;
end $$;
revoke execute on function public.responder_reclamo(uuid, text, text) from public, anon;
grant execute on function public.responder_reclamo(uuid, text, text) to authenticated;
revoke execute on function public.reclamo_set_apoderado() from public, anon, authenticated;