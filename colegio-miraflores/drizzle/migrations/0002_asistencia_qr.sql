alter table public.estudiantes add column codigo_qr text unique default upper(substr(md5(random()::text || clock_timestamp()::text || gen_random_uuid()::text), 1, 10));
update public.estudiantes set codigo_qr = upper(substr(md5(random()::text || id::text || clock_timestamp()::text), 1, 10)) where codigo_qr is null;
alter table public.estudiantes alter column codigo_qr set not null;
alter table public.periodos add column hora_tardanza time not null default '08:00';

create or replace function public.puede_tomar_asistencia(_s public.secciones)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_any_role(auth.uid(), array['admin','auxiliar','secretaria']::public.app_role[])
      or (_s.docente_id = auth.uid() and public.has_role(auth.uid(),'docente'))
$$;
revoke execute on function public.puede_tomar_asistencia(public.secciones) from public, anon;

create or replace function public.marcar_asistencia_qr(_codigo text, _seccion_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _s public.secciones; _e public.estudiantes; _m public.matriculas; _prev public.asistencias;
  _hoy date := (now() at time zone 'America/Lima')::date;
  _hora time := (now() at time zone 'America/Lima')::time;
  _limite time; _estado public.estado_asistencia; _cod text;
begin
  select * into _s from public.secciones where id = _seccion_id;
  if not found then raise exception 'Sección no encontrada.'; end if;
  if not public.puede_tomar_asistencia(_s) then
    raise exception 'No tiene permiso para registrar asistencia en esta sección.';
  end if;
  _cod := upper(regexp_replace(trim(coalesce(_codigo,'')), '^CM:', '', 'i'));
  select * into _e from public.estudiantes where codigo_qr = _cod;
  if not found then raise exception 'Código QR no reconocido.'; end if;
  select * into _m from public.matriculas where estudiante_id = _e.id and seccion_id = _seccion_id and estado = 'MATRICULADA';
  if not found then
    raise exception '% % no está matriculado en esta sección.', _e.nombres, _e.apellidos;
  end if;
  select * into _prev from public.asistencias where matricula_id = _m.id and fecha = _hoy;
  if found then
    return jsonb_build_object('ya', true, 'estado', _prev.estado, 'nombre', _e.nombres || ' ' || _e.apellidos,
      'hora', to_char(_prev.created_at at time zone 'America/Lima', 'HH24:MI'));
  end if;
  select hora_tardanza into _limite from public.periodos where id = _s.periodo_id;
  _estado := case when _hora > coalesce(_limite, '08:00') then 'TARDANZA' else 'PRESENTE' end;
  insert into public.asistencias (matricula_id, seccion_id, fecha, estado, observacion, registrado_por)
  values (_m.id, _seccion_id, _hoy, _estado, 'QR ' || to_char(_hora, 'HH24:MI'), auth.uid());
  if _estado = 'TARDANZA' then
    perform public.notificar_apoderado(_e.id, 'Tardanza registrada',
      _e.nombres || ' ' || _e.apellidos || ' llegó tarde el ' || to_char(_hoy,'DD/MM/YYYY') || ' a las ' || to_char(_hora,'HH24:MI') ||
      '. Puede presentar una justificación desde la app.');
  end if;
  return jsonb_build_object('ya', false, 'estado', _estado, 'nombre', _e.nombres || ' ' || _e.apellidos, 'hora', to_char(_hora,'HH24:MI'));
end $$;
revoke execute on function public.marcar_asistencia_qr(text, uuid) from public, anon;
grant execute on function public.marcar_asistencia_qr(text, uuid) to authenticated;

create or replace function public.cerrar_asistencia_qr(_seccion_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare _s public.secciones; _hoy date := (now() at time zone 'America/Lima')::date; _r record; _n int := 0;
begin
  select * into _s from public.secciones where id = _seccion_id for update;
  if not found then raise exception 'Sección no encontrada.'; end if;
  if not public.puede_tomar_asistencia(_s) then
    raise exception 'No tiene permiso para registrar asistencia en esta sección.';
  end if;
  for _r in
    select m.id, m.estudiante_id, e.nombres, e.apellidos from public.matriculas m
    join public.estudiantes e on e.id = m.estudiante_id
    where m.seccion_id = _seccion_id and m.estado = 'MATRICULADA'
      and not exists (select 1 from public.asistencias a where a.matricula_id = m.id and a.fecha = _hoy)
  loop
    insert into public.asistencias (matricula_id, seccion_id, fecha, estado, observacion, registrado_por)
    values (_r.id, _seccion_id, _hoy, 'FALTA', 'Sin escaneo QR', auth.uid());
    perform public.notificar_apoderado(_r.estudiante_id, 'Inasistencia registrada',
      _r.nombres || ' ' || _r.apellidos || ' tiene una falta el ' || to_char(_hoy,'DD/MM/YYYY') ||
      '. Puede presentar una justificación desde la app.');
    _n := _n + 1;
  end loop;
  perform public.registrar_auditoria('asistencias', _seccion_id, 'CERRAR_QR', jsonb_build_object('fecha', _hoy, 'faltas', _n));
  return jsonb_build_object('faltas', _n);
end $$;
revoke execute on function public.cerrar_asistencia_qr(uuid) from public, anon;
grant execute on function public.cerrar_asistencia_qr(uuid) to authenticated;