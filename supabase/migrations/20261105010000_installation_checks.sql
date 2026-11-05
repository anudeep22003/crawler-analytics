create table public.installation_checks (
    id uuid primary key default gen_random_uuid(),
    site_id uuid not null references public.sites(id) on delete cascade,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null default now() + interval '1 minute',
    received_at timestamptz
);

alter table public.installation_checks enable row level security;
revoke all on public.installation_checks from anon, authenticated;
grant select on public.installation_checks to authenticated;
-- Owners may request checks, but cannot choose IDs, extend expiry, or mark success.
grant insert (site_id) on public.installation_checks to authenticated;
grant select, update on public.installation_checks to service_role;

create policy "Owners can read installation checks" on public.installation_checks
    for select to authenticated
    using (site_id in (select id from public.sites where user_id = (select auth.uid())));

create policy "Owners can request installation checks" on public.installation_checks
    for insert to authenticated
    with check (site_id in (select id from public.sites where user_id = (select auth.uid())));

create index idx_installation_checks_site on public.installation_checks (site_id);
