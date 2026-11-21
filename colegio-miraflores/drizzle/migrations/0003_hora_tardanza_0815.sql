alter table public.periodos alter column hora_tardanza set default '08:15';
update public.periodos set hora_tardanza = '08:15' where hora_tardanza = '08:00';
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
  _estado := case when _hora > coalesce(_limite, '08:15') then 'TARDANZA' else 'PRESENTE' end;
  insert into public.asistencias (matricula_id, seccion_id, fecha, estado, observacion, registrado_por)
  values (_m.id, _seccion_id, _hoy, _estado, 'QR ' || to_char(_hora, 'HH24:MI'), auth.uid());
  if _estado = 'TARDANZA' then
    perform public.notificar_apoderado(_e.id, 'Tardanza registrada',
      _e.nombres || ' ' || _e.apellidos || ' llegó tarde el ' || to_char(_hoy,'DD/MM/YYYY') || ' a las ' || to_char(_hora,'HH24:MI') ||
      '. Puede presentar una justificación desde la app.');
  end if;
  return jsonb_build_object('ya', false, 'estado', _estado, 'nombre', _e.nombres || ' ' || _e.apellidos, 'hora', to_char(_hora,'HH24:MI'));
end $$;