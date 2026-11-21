import { openApiResponse } from './http/docs.mjs';
import { authRequest, now, random } from './application/auth.mjs';
import { invalid } from './application/error.mjs';
import { openDatabase, asUser } from './database.mjs';
import { rest } from './rest.mjs';

async function readBody(req, raw=false) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 12*1024*1024) invalid('El archivo supera 12 MB.',413);
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  if (raw) return buffer;
  try { return size ? JSON.parse(buffer.toString('utf8')) : {}; }
  catch { invalid('El contenido JSON es inválido.'); }
}
function send(res,status,data,headers={}) {
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});
  res.end(data === undefined ? undefined : JSON.stringify(data));
}

export function createLocalApi(ready, logger = console) {
  ready.catch(error=>logger.error('No se pudo iniciar la base local: '+error.message));
  const signed = new Map();
  const accessAttempts = new Map();
  return async (req,res) => {
    try {
      const url = new URL(req.url,'http://localhost');
      const method = req.method;
      if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress) ||
          !/^(localhost|127[.]0[.]0[.]1)(:[0-9]+)?$/.test(req.headers.host || ''))
        invalid('El modo de demostración solo está disponible en esta computadora.',403);
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) invalid('Origen no autorizado.',403);
      if (method === 'GET' && await openApiResponse(url.pathname, res)) return;
      const db = await ready;
      if (method === 'GET' && url.pathname === '/salud') {
        await db.query('select 1');
        return send(res, 200, { estado: 'disponible', baseDatos: 'PostgreSQL/PGlite' });
      }
      const fileRoute = /^\/storage\/v1\/object\/(sign\/)?documentos(?:\/(.+))?$/.exec(url.pathname);
      if (method === 'GET' && fileRoute?.[1]) {
        const ticket = signed.get(url.searchParams.get('token'));
        if (!ticket || ticket.expires < now() || ticket.name !== decodeURIComponent(fileRoute[2] || '')) invalid('El enlace está vencido.',403);
        const bytes = await object(db,ticket.user,ticket.name);
        res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':'attachment',
          'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});
        return res.end(Buffer.from(bytes));
      }
      const access = req.headers.authorization?.replace(/^Bearer /i,'') || '';
      const {rows:[user]} = access && access.length<1024 ? await db.query(
        'select u.* from auth.users u join auth.sessions s on s.user_id=u.id where s.access_token=$1 and s.expires_at>$2',
        [access,now()]) : {rows:[]};
      if (url.pathname.startsWith('/auth/v1/')) {
        const action = url.pathname.slice('/auth/v1/'.length);
        const passwordAttempt = method==='POST' && (action==='signup' || action==='token' && url.searchParams.get('grant_type')==='password');
        const location = req.socket.remoteAddress || 'local';
        if (passwordAttempt) {
          let recent = accessAttempts.get(location);
          if (!recent || recent.expires < now()) recent = {count:0,expires:now()+300};
          if (++recent.count>30) invalid('Demasiados intentos. Intenta de nuevo en cinco minutos.',429);
          accessAttempts.set(location,recent);
        }
        const body = ['POST','PUT'].includes(method) ? await readBody(req) : {};
        const result = await authRequest(db,action,method,url.searchParams,body,user,access);
        return send(res,result===undefined?204:200,result);
      }
      if (!user) invalid('Inicia sesión para continuar.',401);

      if (fileRoute) {
        const name = decodeURIComponent(fileRoute[2] || '');
        if (method === 'POST' && fileRoute[1]) {
          await object(db,user.id,name);
          for (const [key,ticket] of signed) if (ticket.expires<now()) signed.delete(key);
          const token = random();
          signed.set(token,{expires:now()+120,name,user:user.id});
          return send(res,200,{signedURL:'/object/sign/documentos/'+name.split('/').map(encodeURIComponent).join('/')+'?token='+token});
        }
        if (method === 'POST' && name) {
          // The browser uploads File objects as multipart/form-data through the Supabase SDK.
          let bytes = await readBody(req,true);
          if (req.headers['content-type']?.startsWith('multipart/form-data')) {
            const request = new Request('http://localhost',{method:'POST',headers:{'content-type':req.headers['content-type']},body:bytes});
            const form = await request.formData();
            const file = [...form.values()].find(value=>typeof value !== 'string');
            if (!file) invalid('Adjunta un archivo.');
            bytes = Buffer.from(await file.arrayBuffer());
          }
          if (!bytes.length) invalid('El archivo está vacío.');
          await asUser(db,user.id,tx=>tx.query("insert into storage.objects values ('documentos',$1,$2)",[name,bytes]));
          return send(res,200,{Key:'documentos/'+name,Id:random()});
        }
        if (method === 'DELETE') {
          const {prefixes} = await readBody(req);
          if (!Array.isArray(prefixes) || prefixes.length>100) invalid('Lista de archivos inválida.');
          const {rows} = await asUser(db,user.id,tx=>tx.query(
            "delete from storage.objects where bucket_id='documentos' and name=any($1::text[]) returning name",[prefixes]));
          return send(res,200,rows);
        }
      }

      if (url.pathname.startsWith('/rest/v1/')) {
        const body = ['POST','PATCH'].includes(method) ? await readBody(req) : null;
        const result = await asUser(db,user.id,tx=>rest(tx,url.pathname.slice('/rest/v1/'.length),url.searchParams,method,body,req.headers));
        const headers = result.count === undefined ? {} : {'Content-Range':result.count ? '0-'+(result.data.length-1)+'/'+result.count : '*/0'};
        return send(res,200,method==='HEAD'?undefined:result.data,headers);
      }
      invalid('Ruta local desconocida.',404);
    } catch (error) {
      const status = error.status || (error.code==='23505'?409:error.code==='42501'?403:error.code?400:500);
      if (status===500) logger.error(error.stack || error.message);
      const message = status===500 ? 'No se pudo completar la operación local. Revisa la terminal.' : error.message;
      send(res,status,{code:error.code || 'local_error',message,msg:message,error_code:error.code || 'local_error'});
    }
  };
}

export function installLocalApi(server) {
  server.middlewares.use('/api-local', createLocalApi(openDatabase(), server.config.logger));
}

async function object(db,uid,name) {
  const {rows:[row]} = await asUser(db,uid,tx=>tx.query("select bytes from storage.objects where bucket_id='documentos' and name=$1",[name]));
  if (!row) invalid('Archivo no encontrado.',404);
  return row.bytes;
}
