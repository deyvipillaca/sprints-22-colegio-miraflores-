import { invalid } from './application/error.mjs';

const relations = {
  secciones: { grados:'grado_id' },
  estudiantes: { apoderados:'apoderado_id', matriculas:['estudiante_id'] },
  matriculas: { estudiantes:'estudiante_id', grados:'grado_id', secciones:'seccion_id', periodos:'periodo_id', pagos:['matricula_id'] },
  asistencias: { matriculas:'matricula_id', justificaciones:['asistencia_id',true] },
  justificaciones: { asistencias:'asistencia_id' },
  notificaciones: { estudiantes:'estudiante_id', apoderados:'apoderado_id' },
  reclamos: { estudiantes:'estudiante_id', apoderados:'apoderado_id' },
};
const tables = new Set([
  'profiles','user_roles','periodos','grados','secciones','apoderados','estudiantes','matriculas',
  'documentos','pagos','asistencias','justificaciones','notificaciones','auditoria','reclamos',
]);
const procedures = new Set([
  'marcar_asistencia_qr','cerrar_asistencia_qr','registrar_asistencia','vincular_apoderado',
  'cambiar_estado_matricula','confirmar_matricula','resolver_justificacion','responder_reclamo',
]);
function identifier(name) {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) invalid('Identificador inválido.');
  return '"'+name+'"';
}

function fields(select) {
  const items = [];
  let level = 0;
  let start = 0;
  for (let i = 0; i < select.length; i++) {
    if (select[i] === '(') level++;
    if (select[i] === ')') level--;
    if (select[i] === ',' && level === 0) {
      items.push(select.slice(start,i).trim());
      start = i+1;
    }
  }
  if (level !== 0) invalid('Selección inválida.');
  return [...items,select.slice(start).trim()];
}

function projection(table, alias, select, depth = 0) {
  if (depth > 6) invalid('Selección demasiado extensa.');
  return fields(select).map(field => {
    if (field === '*') return alias+'.*';
    const match = /^([a-z_]+)(?:!inner)?\((.*)\)$/.exec(field);
    if (!match) return alias+'.'+identifier(field);
    const [,target,columns] = match;
    const relation = relations[table]?.[target];
    if (!relation) invalid('Relación desconocida.');
    const nested = 'j'+depth;
    const reverse = Array.isArray(relation);
    const join = reverse ? nested+'.'+identifier(relation[0])+'='+alias+'.id'
      : nested+'.id='+alias+'.'+identifier(relation);
    const expr = 'select '+projection(target,nested,columns,depth+1)+' from public.'+identifier(target)+' '+nested+' where '+join;
    const value = reverse && !relation[1] ? "coalesce(jsonb_agg(to_jsonb(related)), '[]'::jsonb)" : 'to_jsonb(related)';
    return '(select '+value+' from ('+expr+') related) as '+identifier(target);
  }).join(', ');
}

function filters(table, params, bind) {
  const operators = {eq:'=',neq:'<>',gte:'>=',lte:'<=',gt:'>',lt:'<'};
  const conditions = [];
  for (const [key,value] of params) {
    if (['select','limit','offset','order'].includes(key)) continue;
    const dot = value.indexOf('.');
    const operator = value.slice(0,dot);
    const operand = value.slice(dot+1);
    const [first,second,...rest] = key.split('.');
    if (rest.length) invalid('Filtro inválido.');
    let column = 'b.'+identifier(first);
    if (second) {
      const relation = relations[table]?.[first];
      if (typeof relation !== 'string') invalid('Relación de filtro inválida.');
      column = '(select f.'+identifier(second)+' from public.'+identifier(first)+' f where f.id=b.'+identifier(relation)+')';
    }
    if (operator === 'in' && /^\(.*\)$/.test(operand)) {
      const values = operand.slice(1,-1).split(',').filter(Boolean);
      conditions.push(values.length ? column+' in ('+values.map(bind).join(',')+')' : 'false');
    } else if (Object.hasOwn(operators,operator)) conditions.push(column+' '+operators[operator]+' '+bind(operand));
    else invalid('Operador de filtro inválido.');
  }
  return conditions.length ? ' where '+conditions.join(' and ') : '';
}

export async function rest(tx, resource, params, method, body, headers) {
  const values = [];
  const bind = value => {
    values.push(Array.isArray(value) || value && typeof value === 'object' ? JSON.stringify(value) : value);
    return '$'+values.length;
  };
  if (resource.startsWith('rpc/')) {
    const name = resource.slice(4);
    if (method !== 'POST' || !procedures.has(name)) invalid('Operación desconocida.',404);
    const args = Object.entries(body).map(([key,value])=>identifier(key)+' => '+bind(value));
    const { rows:[row] } = await tx.query('select to_jsonb(public.'+identifier(name)+'('+args.join(',')+')) as value',values);
    return { data:row.value };
  }
  if (!tables.has(resource)) invalid('Recurso desconocido.',404);
  const table = 'public.'+identifier(resource);
  const select = params.get('select') || '*';
  const columns = projection(resource,'b',select);
  const where = filters(resource,params,bind);
  let result;
  if (method === 'HEAD' || method === 'GET') {
    const order = params.get('order')?.split(',').map(part => {
      const [column,direction] = part.split('.');
      return 'b.'+identifier(column)+(direction==='desc'?' desc':' asc');
    });
    const limit = Math.min(10000,Math.max(0,Number.parseInt(params.get('limit') || '10000',10) || 0));
    const offset = Math.max(0,Number.parseInt(params.get('offset') || '0',10) || 0);
    result = await tx.query('select '+columns+' from '+table+' b'+where+
      (order?.length?' order by '+order.join(', '):'')+' limit '+limit+' offset '+offset,values);
    if (method === 'HEAD' || headers.prefer?.includes('count=exact')) {
      const { rows:[count] } = await tx.query('select count(*)::int as total from '+table+' b'+where,values);
      return { data:result.rows, count:count.total };
    }
  } else {
    const returning = headers.prefer?.includes('return=representation');
    let statement;
    if (method === 'POST') {
      const rows = Array.isArray(body) ? body : [body];
      if (!rows.length || rows.length>1000) invalid('Cantidad de registros inválida.');
      const keys = Object.keys(rows[0]);
      statement = 'insert into '+table+' as b ('+keys.map(identifier).join(',')+') values '+
        rows.map(row=>'('+keys.map(key=>bind(row[key] ?? null)).join(',')+')').join(',');
    } else if (method === 'PATCH') {
      const set = Object.entries(body).map(([column,value])=>identifier(column)+'='+bind(value));
      statement = 'update '+table+' as b set '+set.join(',')+where;
    } else if (method === 'DELETE') statement = 'delete from '+table+' as b'+where;
    else invalid('Método no permitido.',405);
    result = await tx.query(statement+(returning ? ' returning '+columns : ''),values);
    if (!returning) return { data:null };
  }
  if (headers.accept?.includes('vnd.pgrst.object+json')) {
    if (result.rows.length!==1) invalid('Se esperaba un registro.',406);
    return { data:result.rows[0] };
  }
  return { data:result.rows };
}
