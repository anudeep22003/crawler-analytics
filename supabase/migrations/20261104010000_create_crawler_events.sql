create table public.crawler_events (
    id uuid primary key default gen_random_uuid(),
    site_id uuid not null references public.sites(id) on delete cascade,
    timestamp timestamptz not null default now(),
    user_agent text not null,
    bot_name varchar(100),
    platform varchar(50),
    bot_type varchar(20),
    page_url text not null,
    page_path text not null,
    ip_hash varchar(64)
);

create index idx_events_site_time on public.crawler_events (site_id, timestamp desc);
create index idx_events_platform on public.crawler_events (platform);

alter table public.crawler_events enable row level security;
revoke all on public.crawler_events from anon, authenticated;
grant select on public.crawler_events to authenticated;
grant select, insert on public.crawler_events to service_role;

create policy "Users can read events for their own sites" on public.crawler_events
    for select to authenticated
    using (site_id in (select id from public.sites where user_id = (select auth.uid())));
