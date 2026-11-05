begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id) values
    ('00000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000002');
insert into public.sites (id, user_id, domain) values
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'example.com'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'example.com');

insert into public.crawler_events (site_id, timestamp, page_path, page_url, user_agent, bot_name, platform, bot_type)
select '10000000-0000-0000-0000-000000000001', '2030-01-31 12:00Z', '/docs', 'https://example.com/docs',
    'GPTBot', 'GPTBot', 'OpenAI', 'training' from generate_series(1, 55);
insert into public.crawler_events (site_id, timestamp, page_path, page_url, user_agent, bot_name, platform, bot_type) values
    ('10000000-0000-0000-0000-000000000001', '2030-01-31 23:00Z', '/pricing', 'https://example.com/pricing', 'ChatGPT-User', 'ChatGPT-User', 'OpenAI', 'assistant'),
    ('10000000-0000-0000-0000-000000000001', '2030-01-31 22:00Z', '/blog', 'https://example.com/blog', 'ClaudeBot', 'ClaudeBot', 'Anthropic', 'training'),
    ('10000000-0000-0000-0000-000000000001', '2030-01-31 21:00Z', '/blog', 'https://example.com/blog', 'Browser', null, null, null),
    ('10000000-0000-0000-0000-000000000002', '2030-01-31 23:30Z', '/private', 'https://example.com/private', 'CCBot', 'CCBot', 'Common Crawl', 'training');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
create temporary table result as select public.site_activity('10000000-0000-0000-0000-000000000001', '24h', '2030-02-01Z') as data;
select is((select (data->>'total')::int from result), 58, 'Total includes unmatched visits');
select is((select (data#>>'{overview,active_bots}')::int from result), 3, 'Distinct recognized bots exclude unknown');
select is((select data#>>'{overview,top_platform}' from result), 'OpenAI', 'Top platform');
select is((select data#>>'{overview,top_page}' from result), '/docs', 'Top page');
select is((select (data#>>'{platforms,0,visits}')::int from result), 56, 'Platform grouping combines bot identities');
select is((select (data#>>'{top_pages,0,visits}')::int from result), 55, 'Pages ranked by visits');
select is((select jsonb_array_length(data->'recent_events') from result), 50, 'Recent events are bounded');
select is((select data#>>'{recent_events,0,bot_name}' from result), 'ChatGPT-User', 'Recent events newest first');
select is((select sum((bucket->>'visits')::int)::int from result, jsonb_array_elements(data->'timeline') as bucket), 58, 'Timeline agrees with total');

update result set data = public.site_activity('10000000-0000-0000-0000-000000000001', '24h', '2030-02-01Z', 'OpenAI', 'assistant');
select is((select (data->>'total')::int from result), 1, 'Filters combine across sections');
select is((select data#>>'{top_pages,0,page_path}' from result), '/pricing', 'Pages honor combined filters');
select is((select jsonb_array_length(data->'available_platforms') from result), 3, 'Filter options retain full period choices');

update result set data = public.site_activity('10000000-0000-0000-0000-000000000002', '24h', '2030-02-01Z');
select is((select data->'recent_events' from result), '[]'::jsonb, 'Other owner events stay private');
select is((select data->'available_platforms' from result), '[]'::jsonb, 'Other owner filter options stay private');
select throws_ok($$select public.site_activity('10000000-0000-0000-0000-000000000001', '24h', now(), null, 'invalid')$$,
    '22023', null, 'Invalid bot type rejected');
reset role;
select * from finish();
rollback;
