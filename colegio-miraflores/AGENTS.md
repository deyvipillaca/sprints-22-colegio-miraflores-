<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (Colegio Miraflores)

- Enrollment and attendance rules (vacancy control, one active enrollment per student/year, confirmation checks, attendance corrections, justification review) live in SECURITY DEFINER SQL functions (`confirmar_matricula`, `cambiar_estado_matricula`, `registrar_asistencia`, `resolver_justificacion`, `vincular_apoderado`) called via `supabase.rpc`; why: they run atomically with row locks and cannot be bypassed from the browser.
- Pages read and write through the browser Supabase client under RLS; role checks in the UI are only for showing controls, RLS and the SQL functions are the security boundary.
- Roles live in `user_roles`; the signed-in user's roles and apoderado record load once in `src/routes/_authenticated/route.tsx` `beforeLoad` and are read with `useSesion()`; why: one source for nav and per-role screens.
- `src/lib/escolar.ts` mirrors database rules for UI guidance (`documentosRequeridos` = `public.documentos_requeridos`); change both together and keep `src/lib/escolar.test.ts` passing.
- Notices to guardians are rows in `notificaciones` written by SQL functions/triggers; external channels (email/SMS/WhatsApp) must be added as a sender that reads this table, not inline in UI code.
- Uploaded files go to the private `documentos` bucket under `<matricula_id>/...`; storage policies authorize by that first folder.
- Attendance is taken by scanning each student's QR card (`estudiantes.codigo_qr`, encoded as `CM:<code>`) through `marcar_asistencia_qr`; `cerrar_asistencia_qr` marks unscanned students absent; why: the server stamps Lima time and decides present/late against `periodos.hora_tardanza`, so the browser cannot fake the hour.
- Complaints (`reclamos`) are inserted by any signed-in user under RLS and answered only through `responder_reclamo`, which notifies the guardian; why: staff responses and status changes must be role-checked and audited server-side.
