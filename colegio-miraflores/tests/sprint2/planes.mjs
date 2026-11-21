import { openDatabase, asUser } from '../../local/database.mjs';

const db = await openDatabase('memory://');
try {
  const { rows: [admin] } = await db.query("select id from auth.users where email='admin@miraflores.test'");
  const { rows: [section] } = await db.query('select id from secciones where ocupadas>0 order by id limit 1');
  const queries = [
    ['matriculas', "select id, estado from public.matriculas where estado='MATRICULADA' limit 20", []],
    ['asistencias', 'select id, estado from public.asistencias where seccion_id=$1 and fecha=current_date limit 20', [section.id]],
  ];
  for (const [name, query, params] of queries) {
    const { rows } = await asUser(db, admin.id, tx => tx.query('explain (analyze,buffers) ' + query, params));
    console.log(name + '\n' + rows.map(row => row['QUERY PLAN']).join('\n') + '\n');
  }
} finally {
  await db.close();
}
