drop policy "Ver estudiantes" on public.estudiantes;
create policy "Ver estudiantes" on public.estudiantes for select to authenticated
  using (
    public.is_staff(auth.uid())
    or user_id = auth.uid()
    or exists (select 1 from public.apoderados a where a.id = apoderado_id and a.user_id = auth.uid())
  );