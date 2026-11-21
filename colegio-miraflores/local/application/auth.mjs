import { randomBytes } from 'node:crypto';
import { hash, matches } from '../database.mjs';
import { invalid } from './error.mjs';

export const now = () => Math.floor(Date.now()/1000);
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
export const random = () => randomBytes(32).toString('base64url');
const emailFormat = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function publicUser(user) {
  return {id:user.id,email:user.email,role:'authenticated',aud:'authenticated',
    user_metadata:user.raw_user_meta_data,app_metadata:{provider:'email',providers:['email']},created_at:user.created_at};
}
async function session(tx,user) {
  const expires_at = now()+3600;
  const access_token = b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:user.id,exp:expires_at,role:'authenticated'})+'.'+random();
  const refresh_token = random();
  await tx.query('insert into auth.sessions values ($1,$2,$3,$4,$5)',
    [access_token,refresh_token,user.id,expires_at,now()+30*86400]);
  return {access_token,refresh_token,expires_at,expires_in:3600,token_type:'bearer',user:publicUser(user)};
}
export async function authRequest(db,resource,method,query,body,user,access) {
  if (method === 'POST' && resource === 'token' && query.get('grant_type') === 'refresh_token') {
    return db.transaction(async tx => {
      const { rows:[owner] } = await tx.query(`select u.* from auth.users u join auth.sessions s on s.user_id=u.id
        where s.refresh_token=$1 and s.refresh_until>$2`,[body.refresh_token ?? '',now()]);
      if (!owner) invalid('La sesión expiró. Inicia sesión nuevamente.',401);
      await tx.query('delete from auth.sessions where refresh_token=$1',[body.refresh_token]);
      return session(tx,owner);
    });
  }
  if (method === 'POST' && ['signup','token'].includes(resource)) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const pass = typeof body.password === 'string' ? body.password : '';
    if (email.length>254 || pass.length>128 || !emailFormat.test(email) || pass.length<8)
      invalid('Ingresa un correo válido y una contraseña de al menos 8 caracteres.');
    return db.transaction(async tx => {
      if (resource === 'signup') {
        const name = typeof body.data?.nombre === 'string' ? body.data.nombre.trim().slice(0,200) : '';
        const {rows:[newUser]} = await tx.query('insert into auth.users(email,password_hash,raw_user_meta_data) values ($1,$2,$3) returning *',
          [email,hash(pass),JSON.stringify({nombre:name})]);
        return session(tx,newUser);
      }
      const {rows:[existing]} = await tx.query('select * from auth.users where email=$1',[email]);
      if (!existing || !matches(pass,existing.password_hash)) invalid('Invalid login credentials');
      return session(tx,existing);
    });
  }
  if (!user) invalid('Inicia sesión para continuar.',401);
  if (method === 'POST' && resource === 'logout') {
    await db.query('delete from auth.sessions where access_token=$1',[access]);
    return undefined;
  }
  if (method === 'GET' && resource === 'user') return publicUser(user);
  invalid('Operación de cuenta no disponible en la versión local.',404);
}

