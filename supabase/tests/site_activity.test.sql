begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id) values
    ('00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000002');
insert into public.sites (id, user_id, domain) values
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'example.com');

-- Fixed clock: 2030-02-01 midnight UTC. Include both window boundaries.
insert into public.crawler_events (site_id, timestamp, user_agent, page_url, page_path)
select '10000000-0000-0000-0000-000000000001', instant, 'TestBot', 'https://example.com/', '/'
from unnest(array[
    '2030-02-01 00:00Z'::timestamptz, '2030-01-31 23:00Z',
    '2030-01-31 00:00Z', '2030-01-30 23:59Z',
    '2030-01-25 00:00Z', '2030-01-02 00:00Z', '2030-01-01 23:59Z'
]) as instant;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select is((public.site_activity('10000000-0000-0000-0000-000000000001', '24h', '2030-02-01Z')->>'total')::int,
    2, '24h includes start and excludes end');
select is((public.site_activity('10000000-0000-0000-0000-000000000001', '7d', '2030-02-01Z')->>'total')::int,
    4, '7d count');
select is((public.site_activity('10000000-0000-0000-0000-000000000001', '30d', '2030-02-01Z')->>'total')::int,
    5, '30d count');
select is(jsonb_array_length(public.site_activity('10000000-0000-0000-0000-000000000001', '24h', '2030-02-01Z')->'timeline'),
    24, '24 hourly buckets');
select is(jsonb_array_length(public.site_activity('10000000-0000-0000-0000-000000000001', '7d', '2030-02-01Z')->'timeline'),
    7, '7 daily buckets');
select is(jsonb_array_length(public.site_activity('10000000-0000-0000-0000-000000000001', '30d', '2030-02-01Z')->'timeline'),
    30, '30 daily buckets');
select is((public.site_activity('10000000-0000-0000-0000-000000000001', '24h', '2030-02-01Z') #>> '{timeline,1,visits}')::int,
    0, 'Empty hours are zero-filled');
select throws_ok($$select public.site_activity('10000000-0000-0000-0000-000000000001', 'all')$$,
    '22023', null, 'Unsupported periods rejected');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select is((public.site_activity('10000000-0000-0000-0000-000000000001', '30d', '2030-02-01Z')->>'total')::int,
    0, 'Aggregation does not expose another owners events');
set local role anon;
select throws_ok($$select public.site_activity('10000000-0000-0000-0000-000000000001', '24h')$$,
    '42501', null, 'Anonymous callers denied');
reset role;
select * from finish();
rollback;
