create table public.sites (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    domain text not null,
    created_at timestamptz not null default now(),
    constraint sites_user_domain_unique unique (user_id, domain),
    constraint sites_domain_hostname check (
        length(domain) <= 253
        and domain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
    )
);

alter table public.sites enable row level security;

revoke all on public.sites from anon, authenticated;
grant select, insert on public.sites to authenticated;

create policy "Users can read their own sites" on public.sites
    for select to authenticated
    using ((select auth.uid()) = user_id);

create policy "Users can add their own sites" on public.sites
    for insert to authenticated
    with check ((select auth.uid()) = user_id);

-- The unique constraint's index also supports queries filtered by user_id.
