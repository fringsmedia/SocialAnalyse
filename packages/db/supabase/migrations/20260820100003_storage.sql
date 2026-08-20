-- ============================================================
-- Storage: privater Bucket für Thumbnails und Frames (WebP).
-- Pfad-Konvention: {organization_id}/{run_id}/{creative_id}/...
-- Es werden niemals Videos gespeichert – nur Bilder.
--
-- Schreiben: ausschließlich der Worker (Service Role, umgeht RLS).
-- Lesen: Org-Mitglieder über Signed URLs bzw. authentifizierte Requests.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('creatives', 'creatives', false)
on conflict (id) do nothing;

create policy creatives_bucket_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'creatives'
    and public.is_org_member(((storage.foldername(name))[1])::uuid)
  );
