begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id) values
    ('00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000002');
insert into public.sites (id, user_id, domain) values
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'example.com'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'example.com');
insert into public.crawler_events (site_id, user_agent, page_url, page_path) values
    ('10000000-0000-0000-0000-000000000001', 'GPTBot', 'https://example.com/', '/');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.crawler_events), 1::bigint, 'Owner can read event');
select throws_ok($$insert into public.crawler_events (site_id, user_agent, page_url, page_path)
    values ('10000000-0000-0000-0000-000000000001', 'GPTBot', 'https://example.com/', '/')$$,
    '42501', null, 'Dashboard clients cannot insert events directly');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.crawler_events), 0::bigint, 'Same-domain owner cannot read another sites events');
set local role anon;
select throws_ok($$select * from public.crawler_events$$, '42501', null, 'Anonymous reads are denied');
reset role;
select throws_ok($$insert into public.crawler_events (site_id, user_agent, page_url, page_path)
    values ('10000000-0000-0000-0000-000000000003', 'GPTBot', 'https://example.com/', '/')$$,
    '23503', null, 'Unknown site cannot receive events');
select * from finish();
rollback;
