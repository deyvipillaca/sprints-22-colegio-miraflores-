import http from 'k6/http';
import { check, sleep } from 'k6';

const base = __ENV.BASE_URL || 'http://127.0.0.1:8080/api-local';

export const options = {
  stages: [
    { duration: '10s', target: 100 },
    { duration: '10s', target: 500 },
    { duration: '10s', target: 1000 },
    { duration: '10s', target: 2000 },
    { duration: '10s', target: 2000 },
    { duration: '10s', target: 0 },
  ],
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<500'], checks: ['rate>=0.99'] },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  const login = http.post(base + '/auth/v1/token?grant_type=password', JSON.stringify({
    email: 'admin@miraflores.test', password: 'Miraflores2026!',
  }), { headers: { 'Content-Type': 'application/json' } });
  if (login.status !== 200) throw new Error('No se pudo iniciar la sesión de demostración.');
  return { token: login.json('access_token') };
}

export default function ({ token }) {
  const result = http.get(base + '/rest/v1/matriculas?select=id,estado&estado=eq.MATRICULADA&limit=20', {
    headers: { Authorization: 'Bearer ' + token }, timeout: '10s',
  });
  check(result, {
    'respuesta 200 con matrículas': response =>
      response.status === 200 && Array.isArray(response.json()) && response.json().length > 0,
  });
  sleep(1);
}

export function handleSummary(data) {
  return { stdout: JSON.stringify(data.metrics, null, 2) + '\n', 'docs/evidencias/carga-k6.json': JSON.stringify(data, null, 2) };
}
