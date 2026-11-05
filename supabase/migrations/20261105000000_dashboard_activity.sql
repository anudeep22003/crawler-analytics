drop function public.site_activity(uuid, text, timestamptz);

create function public.site_activity(
    p_site_id uuid,
    p_period text,
    p_end timestamptz default now(),
    p_platform text default null,
    p_bot_type text default null
) returns jsonb
language plpgsql stable security invoker
set search_path = ''
set timezone = 'UTC'
as $$
declare
    window_size interval;
    bucket_size interval;
    window_start timestamptz;
    result jsonb;
begin
    if p_period is null or p_period not in ('24h', '7d', '30d') or p_end is null then
        raise exception 'Expected 24h, 7d, or 30d and a non-null end time'
            using errcode = '22023';
    end if;

    if p_bot_type is not null and p_bot_type not in ('training', 'search', 'assistant', 'unknown') then
        raise exception 'Unsupported bot type' using errcode = '22023';
    end if;

    window_size := case p_period
        when '24h' then interval '24 hours'
        when '7d' then interval '7 days'
        else interval '30 days' end;
    bucket_size := case p_period
        when '24h' then interval '1 hour' else interval '1 day' end;
    window_start := p_end - window_size;

    -- Bound the scan by site/time and apply caller RLS before any aggregation.
    with base_events as materialized (
        select id, timestamp, page_path, page_url, user_agent,
            coalesce(bot_name, 'Unknown') as bot_name,
            coalesce(platform, 'Unknown') as platform,
            coalesce(bot_type, 'unknown') as bot_type
        from public.crawler_events
        where site_id = p_site_id and timestamp >= window_start and timestamp < p_end
    ), filtered_events as materialized (
        select * from base_events
        where (p_platform is null or platform = p_platform)
            and (p_bot_type is null or bot_type = p_bot_type)
    ), counts as (
        select date_bin(bucket_size, timestamp, window_start) as bucket_start, count(*) as visits
        from filtered_events group by 1
    ), timeline as (
        select buckets.bucket_start, coalesce(counts.visits, 0) as visits
        from generate_series(window_start, p_end - bucket_size, bucket_size) as buckets(bucket_start)
        left join counts using (bucket_start)
    ), platforms as (
        select platform, count(*) as visits from filtered_events group by platform
    ), pages as (
        select page_path, count(*) as visits from filtered_events group by page_path
    ), top_pages as (
        select * from pages order by visits desc, page_path limit 10
    ), recent_events as (
        select * from filtered_events order by timestamp desc, id desc limit 50
    )
    select jsonb_build_object(
        'start', window_start, 'end', p_end,
        'total', (select count(*) from filtered_events),
        'overview', jsonb_build_object(
            'active_bots', (select count(distinct bot_name) from filtered_events
                where bot_type <> 'unknown' and bot_name <> 'Unknown'),
            'top_platform', (select platform from platforms order by visits desc, platform limit 1),
            'top_page', (select page_path from top_pages order by visits desc, page_path limit 1)
        ),
        'timeline', (select jsonb_agg(to_jsonb(timeline) order by bucket_start) from timeline),
        'platforms', coalesce((select jsonb_agg(to_jsonb(platforms) order by visits desc, platform) from platforms), '[]'::jsonb),
        'top_pages', coalesce((select jsonb_agg(to_jsonb(top_pages) order by visits desc, page_path) from top_pages), '[]'::jsonb),
        'recent_events', coalesce((select jsonb_agg(to_jsonb(recent_events) order by timestamp desc, id desc) from recent_events), '[]'::jsonb),
        -- Options use the period's full dataset so applying a filter does not hide other choices.
        'available_platforms', coalesce((select jsonb_agg(platform order by platform)
            from (select distinct platform from base_events) as options), '[]'::jsonb)
    ) into result;

    return result;
end;
$$;

revoke all on function public.site_activity(uuid, text, timestamptz, text, text) from public, anon;
grant execute on function public.site_activity(uuid, text, timestamptz, text, text) to authenticated;
