import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, passwordDemo } from '../../local/database.mjs';
import { createLocalApi } from '../../local/server.mjs';

let server;
let db;
let base;
let admin;
let guardian;
let student;

async function request(path, { token, body, prefer } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (prefer) headers.Prefer = 'return=representation';
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = response.headers.get('Content-Type')?.includes('application/json')
    ? await response.json() : await response.text();
  return { status: response.status, cache: response.headers.get('Cache-Control'), data };
}

async function login(role) {
  const response = await request('/auth/v1/token?grant_type=password', {
    body: { email: role + '@miraflores.test', password: passwordDemo },
  });
  expect(response.status).toBe(200);
  return response.data.access_token;
}

function rpc(name, token, body) {
  return request('/rest/v1/rpc/' + name, { token, body });
}

beforeAll(async () => {
  db = await openDatabase('memory://');
  const api = createLocalApi(Promise.resolve(db));
  server = createServer(api);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = 'http://127.0.0.1:' + server.address().port;
  admin = await login('admin');
  guardian = await login('apoderado');
  const result = await db.query(
    "select e.id, e.codigo_qr, e.apoderado_id, m.periodo_id, m.grado_id, m.seccion_id, m.id as matricula_id from estudiantes e join matriculas m on m.estudiante_id=e.id where e.dni='78123401'",
  );
  [student] = result.rows;
  await db.query("update periodos set inicio_matricula=current_date-1, fin_matricula=current_date+1 where id=$1", [student.periodo_id]);
});

afterAll(async () => {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  if (db) await db.close();
});

describe('Contrato HTTP y privacidad', () => {
  test('publica Swagger local, OpenAPI y salud de base de datos', async () => {
    const spec = await request('/openapi.json');
    expect(spec.status).toBe(200);
    expect(spec.data.paths['/rest/v1/rpc/confirmar_matricula'].post).toBeDefined();
    expect((await request('/docs')).data).toContain('SwaggerUIBundle');
    expect((await request('/swagger-ui-bundle.js')).status).toBe(200);
    expect((await request('/swagger-ui.css')).status).toBe(200);
    expect(await request('/salud')).toMatchObject({ status: 200, data: { estado: 'disponible' } });
  });

  test('rechaza lecturas sin sesión y deja los datos escolares fuera de caché HTTP', async () => {
    const path = '/rest/v1/matriculas?select=id&limit=20';
    expect((await request(path)).status).toBe(401);
    const guardianResult = await request(path, { token: guardian });
    const adminResult = await request(path, { token: admin });
    expect(guardianResult).toMatchObject({ status: 200, cache: 'no-store' });
    expect(guardianResult.data).toHaveLength(2);
    expect(adminResult.data.length).toBeGreaterThan(guardianResult.data.length);
  });
});

describe('Matrícula', () => {
  test('rechaza una segunda matrícula activa para el mismo estudiante y periodo', async () => {
    const response = await request('/rest/v1/matriculas', {
      token: admin,
      body: { estudiante_id: student.id, periodo_id: student.periodo_id, grado_id: student.grado_id, tipo: 'NUEVA' },
    });
    expect(response.status).toBe(400);
    expect(response.data.message).toMatch(/matrícula activa/i);
  });

  test('valida documentos, pago y vacantes, y asigna la última vacante una sola vez', async () => {
    const applicants = [];
    for (const dni of ['79000001', '79000002']) {
      const fixture = await db.query(
        "insert into estudiantes (apoderado_id,nombres,apellidos,dni) values ($1,'Alumno','Prueba',$2) returning id",
        [student.apoderado_id, dni],
      );
      const response = await request('/rest/v1/matriculas', {
        token: admin, prefer: true,
        body: { estudiante_id: fixture.rows[0].id, periodo_id: student.periodo_id, grado_id: student.grado_id, tipo: 'NUEVA' },
      });
      expect(response.status).toBe(200);
      applicants.push(response.data[0].id);
    }
    const confirm = id => rpc('confirmar_matricula', admin, { _matricula_id: id, _seccion_id: student.seccion_id });
    expect((await confirm(applicants[0])).data.message).toMatch(/faltan documentos/i);
    for (const id of applicants) {
      await db.query(
        "insert into documentos (matricula_id,tipo,archivo_path,estado) select $1,tipo,'prueba.pdf','VALIDADO' from unnest(public.documentos_requeridos('NUEVA')) as tipo",
        [id],
      );
    }
    expect((await confirm(applicants[0])).data.message).toMatch(/pago.*no está completo/i);
    for (const id of applicants) {
      await db.query('insert into pagos (matricula_id,monto) select $1,monto_matricula from periodos where id=$2', [id, student.periodo_id]);
    }
    await db.query('update secciones set capacidad=ocupadas+1 where id=$1', [student.seccion_id]);
    const results = await Promise.all(applicants.map(confirm));
    expect(results.map(result => result.status).sort()).toEqual([200, 400]);
    expect(results.find(result => result.status === 400).data.message).toMatch(/no tiene vacantes/i);
    const section = (await db.query('select ocupadas,capacidad from secciones where id=$1', [student.seccion_id])).rows[0];
    expect(section.ocupadas).toBe(section.capacidad);
  });
});

describe('Asistencia QR', () => {
  test('solo personal autorizado registra y repetir un QR conserva una sola marca', async () => {
    const body = { _codigo: 'CM:' + student.codigo_qr, _seccion_id: student.seccion_id };
    const denied = await rpc('marcar_asistencia_qr', guardian, body);
    expect(denied.status).toBe(400);
    expect(denied.data.message).toMatch(/no tiene permiso/i);
    const marks = await Promise.all([rpc('marcar_asistencia_qr', admin, body), rpc('marcar_asistencia_qr', admin, body)]);
    expect(marks.map(mark => mark.status)).toEqual([200, 200]);
    expect(marks.map(mark => mark.data.ya).sort()).toEqual([false, true]);
    expect(marks[0].data.estado).toMatch(/PRESENTE|TARDANZA/);
    const result = await request('/rest/v1/asistencias?matricula_id=eq.' + student.matricula_id, { token: admin });
    expect(result.data).toHaveLength(1);
  });

  test('el cierre marca faltas de una sección y repetirlo no duplica registros', async () => {
    const result = await db.query('select distinct seccion_id from matriculas where seccion_id<>$1 order by seccion_id limit 1', [student.seccion_id]);
    const section = result.rows[0].seccion_id;
    const close = () => rpc('cerrar_asistencia_qr', admin, { _seccion_id: section });
    const first = await close();
    expect(first.status).toBe(200);
    expect(first.data.faltas).toBeGreaterThan(0);
    expect(await close()).toMatchObject({ status: 200, data: { faltas: 0 } });
    const attendance = await request('/rest/v1/asistencias?seccion_id=eq.' + section, { token: admin });
    expect(attendance.data).toHaveLength(first.data.faltas);
    expect(attendance.data.every(mark => mark.estado === 'FALTA')).toBe(true);
  });
});

describe('Reclamos', () => {
  test('el apoderado presenta, administración resuelve y se genera un aviso', async () => {
    const response = await request('/rest/v1/reclamos', {
      token: guardian, prefer: true, body: { tipo: 'RECLAMO', asunto: 'Horario', detalle: 'Solicito revisar el horario publicado.', estudiante_id: student.id },
    });
    expect(response.status).toBe(200);
    const [complaint] = response.data;
    expect(complaint.estado).toBe('PENDIENTE');
    const body = { _reclamo_id: complaint.id, _estado: 'RESUELTO', _respuesta: 'Se actualizó el horario.' };
    const denied = await rpc('responder_reclamo', guardian, body);
    expect(denied.status).toBe(400);
    expect(denied.data.message).toMatch(/solo administración/i);
    const resolved = await rpc('responder_reclamo', admin, body);
    expect(resolved).toMatchObject({ status: 200, data: { estado: 'RESUELTO', respuesta: body._respuesta } });
    const notices = await request('/rest/v1/notificaciones?select=asunto', { token: guardian });
    expect(notices.data).toContainEqual({ asunto: 'Reclamo N.° ' + complaint.codigo + ' resuelto' });
    expect((await rpc('responder_reclamo', admin, body)).data.message).toMatch(/ya fue resuelto/i);
  });
});


test('los cambios se conservan al volver a abrir la base local', async () => {
  const location = await mkdtemp(join(tmpdir(), 'miraflores-sprint2-'));
  let disk;
  try {
    disk = await openDatabase(location);
    await disk.query("update periodos set monto_matricula=325 where anio=(select max(anio) from periodos)");
    await disk.close();
    disk = undefined;
    disk = await openDatabase(location);
    const { rows: [period] } = await disk.query('select monto_matricula from periodos order by anio desc limit 1');
    expect(Number(period.monto_matricula)).toBe(325);
  } finally {
    if (disk) await disk.close();
    await rm(location, { recursive: true, force: true });
  }
});
