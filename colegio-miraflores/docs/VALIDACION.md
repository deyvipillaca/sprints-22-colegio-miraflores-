# Validación · Sprint 2 del Colegio Miraflores

La validación se ejecutó el 20 de noviembre de 2026 con Node.js 24.22.3, k6 1.5.0 y PostgreSQL embebido mediante PGlite. La guía indica que los atributos deben venir del Sprint 1. Como ese documento no venía en el ZIP, la tabla usa criterios propuestos que se pueden cotejar con lo aprobado por el equipo.

## Escenarios y resultados

| Atributo | Escenario y criterio | Resultado observado |
| --- | --- | --- |
| Integridad | Dos solicitudes válidas compiten por la última vacante. Se confirma una y la ocupación queda igual a la capacidad. | Cumple en la API local. También se rechazaron la solicitud duplicada y las confirmaciones sin documentos o pago. |
| Consistencia | Repetir un escaneo QR conserva una marca. Repetir el cierre de asistencia genera cero faltas nuevas. | Cumple en modo local. El apoderado recibió un rechazo al intentar marcar asistencia. |
| Confidencialidad | Una consulta sin sesión devuelve 401. Un apoderado solo recibe sus matrículas. | Cumple en la comparación de respuestas contra la cuenta de administración. La API envía `Cache-Control: no-store`. |
| Trazabilidad | Administración resuelve un reclamo, se genera el aviso y se rechaza un segundo cierre. | Cumple en la prueba con tres solicitudes HTTP de cambio de estado y lectura del aviso. |
| Persistencia | Un cambio guardado se conserva al cerrar y volver a abrir la base local. | Cumple con el monto de matrícula de un periodo de prueba. |
| Rendimiento | La consulta autenticada de matrículas atiende hasta 2.000 usuarios virtuales. p95 menor de 500 ms, menos de 1 % de errores y al menos 99 % de respuestas válidas. | Cumple el p95. Quedan pendientes los umbrales de errores y respuestas válidas. |

## Carga progresiva con k6

Se ejecutó contra Vite y la API real en la misma máquina con una base PGlite en memoria y ocho matrículas de demostración. El script compartió una sesión de administración, consultó matrículas activas y dejó un segundo de pausa por iteración. La prueba escaló por 100, 500, 1.000 y 2.000 usuarios virtuales, sostuvo 2.000 durante diez segundos y descendió a cero.

| Métrica | Medición | Umbral |
| --- | ---: | --- |
| Usuarios virtuales máximos | 2.000 | Alcanzado |
| Solicitudes HTTP, incluye autenticación inicial | 37.770 | — |
| p95 de tiempo de respuesta | 237,11 ms | Menor de 500 ms. Cumple. |
| p99 de tiempo de respuesta | 10.000,12 ms | Sin umbral definido. |
| Solicitudes HTTP fallidas | 1.719 (4,55 %) | Menor de 1 %. Incumple. |
| Respuestas de negocio válidas | 95,45 % | Al menos 99 %. Incumple. |

Durante la ejecución se observaron tiempos de espera de 10 segundos. El p95 cumple porque esos casos afectan principalmente la cola de la distribución. La corrida mide un endpoint de lectura sobre datos de ejemplo. La capacidad del despliegue Supabase y la carga mixta de lectura y escritura quedan fuera de esta medición.

Para repetir, inicia el portal de demostración y, desde otra terminal en la raíz del proyecto, ejecuta `k6 run tests/sprint2/carga.js`. Ajusta `BASE_URL` si se usa un puerto distinto. El resultado detallado está en [carga-k6.json](evidencias/carga-k6.json).

## Pruebas y cobertura

- Jest pasó 8 pruebas de integración contra la API HTTP y las migraciones reales sobre PGlite. Cobertura del backend local de 79,90 % de líneas y 61,84 % de ramas. [Salida de Jest](evidencias/jest.txt) · [Cobertura HTML](evidencias/cobertura-html/index.html) · [Resumen JSON](evidencias/cobertura-jest.json).
- Vitest pasó las 8 pruebas existentes de la interfaz y reglas auxiliares. La compilación de producción también terminó correctamente.
- Los planes SQL con RLS se incluyen en [planes-db.txt](evidencias/planes-db.txt). Se obtienen mediante `node tests/sprint2/planes.mjs`.
- GitHub Actions queda configurado para los siguientes push y pull request del repositorio. Las evidencias incluidas provienen de la ejecución local.

La portada y la documentación respondieron por HTTP en Vite. La ejecución interactiva en Chromium quedó pendiente porque el entorno de pruebas impidió que el navegador iniciara.
