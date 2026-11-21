# Colegio Miraflores

Portal escolar para gestionar matrículas, asistencia y reclamos.

## Abrir en Windows

1. Descomprime el ZIP y abre la carpeta `colegio-miraflores`, donde están `package.json` y `package-lock.json`.
2. Con Node.js 24 instalado, abre CMD en esa carpeta y ejecuta:

   ```cmd
   npm.cmd ci
   npm.cmd run dev
   ```

3. Abre la dirección que aparece junto a **Local:**, normalmente [http://127.0.0.1:8080/](http://127.0.0.1:8080/). Mantén CMD abierta.
4. Pulsa **Ingresar → Cuentas de demostración → Administración → Ingresar**.

Si vas a actualizar una carpeta que ya contiene el proyecto, detén Vite con Ctrl+C antes de copiar los archivos corregidos. Ejecuta de nuevo `npm.cmd ci` para instalar la dependencia de la base local.

## Cuentas de demostración

En el formulario de ingreso, elige un perfil para rellenar el correo y la contraseña. Todas las cuentas iniciales usan la contraseña `Miraflores2026!`.

| Perfil | Correo |
| --- | --- |
| Administración | admin@miraflores.test |
| Secretaría | secretaria@miraflores.test |
| Docente | docente@miraflores.test |
| Auxiliar | auxiliar@miraflores.test |
| Tesorería | tesoreria@miraflores.test |
| Dirección | director@miraflores.test |
| Apoderado | apoderado@miraflores.test |

## Modo local

El servidor inicia un PostgreSQL embebido (PGlite), aplica las migraciones del proyecto y crea los datos de demostración en el primer arranque. Los registros y los archivos adjuntos se guardan en `datos-locales/`. Conserva esa carpeta para conservar los datos al actualizar.

Las cuentas son locales. El acceso con Google o Lovable y la recuperación de contraseña por correo requieren la configuración externa. La portada muestra el escudo en local porque el ZIP de la exportación solo contiene la referencia a la foto alojada en Lovable. El servidor local es para demostraciones y se abre desde la propia computadora. Usa datos ficticios.

## Conexión externa existente

Si quieres usar el proyecto Supabase de la exportación, configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en `.env.local` y reinicia Vite. Se usarán las cuentas y datos de ese proyecto. La base local y la base externa guardan sus registros por separado.

## Pruebas del proyecto

```cmd
npm.cmd test
```

## Entrega del Sprint 2

Con el portal iniciado en modo local, abre [Swagger UI](http://127.0.0.1:8080/api-local/docs). Usa `POST /auth/v1/token` con `grant_type=password` y una cuenta de demostración. Copia el valor `access_token` en **Authorize** para probar los recursos protegidos. Si Vite usa otro puerto, cambia el puerto en la dirección.

| Entregable | Ubicación |
| --- | --- |
| Arquitectura, criterios de aceptación y tareas técnicas | [docs/SDD.md](docs/SDD.md) |
| Contrato OpenAPI 3.1 | [docs/openapi.json](docs/openapi.json) |
| Resultados, cobertura y planes de base de datos | [docs/VALIDACION.md](docs/VALIDACION.md) |
| Automatización de pruebas y compilación | [.github/workflows/sprint2.yml](.github/workflows/sprint2.yml) |

```cmd
npm.cmd run test:sprint2
npm.cmd test
npm.cmd run build
```

Jest genera el informe navegable en `coverage/sprint2/index.html`. En el ZIP se incluye una copia del informe generado en `docs/evidencias/cobertura-html/index.html`. El modo local se ejecuta con `npm.cmd run dev`. El build de producción corresponde al despliegue con el backend Supabase configurado.
